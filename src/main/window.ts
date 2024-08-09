import path from "node:path"
import { fileURLToPath } from "node:url"

import { is } from "@electron-toolkit/utils"
import { callGlobalContextMethod } from "@shared/bridge"
import { imageRefererMatches } from "@shared/image"
import type { BrowserWindowConstructorOptions } from "electron"
import { BrowserWindow, Menu, shell } from "electron"

import { isDev, isMacOS } from "./env"
import { getIconPath } from "./helper"
import { store } from "./lib/store"
import { logger } from "./logger"
import {
  cancelPollingUpdateUnreadCount,
  pollingUpdateUnreadCount,
} from "./tipc/dock"

const windows = {
  settingWindow: null as BrowserWindow | null,
  mainWindow: null as BrowserWindow | null,
}
globalThis["windows"] = windows
const { platform } = process
const __dirname = fileURLToPath(new URL(".", import.meta.url))
export function createWindow(
  options: {
    extraPath?: string
    height: number
    width: number
  } & BrowserWindowConstructorOptions,
) {
  const { extraPath, height, width, ...configs } = options
  // Create the browser window.
  const window = new BrowserWindow({
    width,
    height,
    show: false,
    resizable: configs?.resizable ?? true,
    autoHideMenuBar: true,
    ...(platform !== "darwin" ? { icon: getIconPath() } : {}),
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.mjs"),
      sandbox: false,
      webviewTag: true,
      webSecurity: !isDev,
    },

    // @windows
    backgroundMaterial: "mica",
    titleBarStyle: platform === "win32" ? "hidden" : "hiddenInset",
    trafficLightPosition: {
      x: 18,
      y: 18,
    },

    transparent: true,
    backgroundColor: "#00000000", // transparent hexadecimal or anything with transparency,
    vibrancy: "sidebar",
    visualEffectState: "active",
    ...configs,
  })

  function refreshBound(timeout = 0) {
    setTimeout(() => {
      const mainWindow = getMainWindow()
      if (!mainWindow) return
      // FIXME: workaround for theme bug in full screen mode
      const size = mainWindow.getSize()
      mainWindow.setSize(size[0] + 1, size[1] + 1)
      mainWindow.setSize(size[0], size[1])
    }, timeout)
  }

  window.on("leave-html-full-screen", () => {
    // To solve the vibrancy losing issue when leaving full screen mode
    // @see https://github.com/toeverything/AFFiNE/blob/280e24934a27557529479a70ab38c4f5fc65cb00/packages/frontend/electron/src/main/windows-manager/main-window.ts:L157
    refreshBound()
    refreshBound(1000)
  })

  window.on("ready-to-show", () => {
    window?.show()
  })

  window.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: "deny" }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    window.loadURL(
      process.env["ELECTRON_RENDERER_URL"] + (options?.extraPath || ""),
    )

    logger.log(
      process.env["ELECTRON_RENDERER_URL"] + (options?.extraPath || ""),
    )
  } else {
    const openPath = path.resolve(__dirname, "../renderer/index.html")
    window.loadFile(openPath, {
      hash: options?.extraPath,
    })
    logger.log(openPath, {
      hash: options?.extraPath,
    })
  }

  window.webContents.session.webRequest.onBeforeSendHeaders(
    (details, callback) => {
      const trueUrl =
        process.env["VITE_IMGPROXY_URL"] &&
        details.url.startsWith(process.env["VITE_IMGPROXY_URL"]) ?
          decodeURIComponent(
            details.url.replace(
              new RegExp(
                  `^${process.env["VITE_IMGPROXY_URL"]}/unsafe/\\d+x\\d+/`,
              ),
              "",
            ),
          ) :
          details.url
      const refererMatch = imageRefererMatches.find((item) =>
        item.url.test(trueUrl),
      )
      callback({
        requestHeaders: {
          ...details.requestHeaders,
          Referer: refererMatch?.referer || trueUrl,
        },
      })
    },
  )

  const selectionMenu = Menu.buildFromTemplate([
    { role: "copy", accelerator: "CmdOrCtrl+C" },
    { type: "separator" },
    { role: "selectAll", accelerator: "CmdOrCtrl+A" },
  ])

  const inputMenu = Menu.buildFromTemplate([
    { role: "undo", accelerator: "CmdOrCtrl+Z" },
    {
      role: "redo",
      accelerator: "CmdOrCtrl+Shift+Z",
    },
    { type: "separator" },
    {
      role: "cut",
      accelerator: "CmdOrCtrl+X",
    },
    {
      role: "copy",
      accelerator: "CmdOrCtrl+C",
    },
    {
      role: "paste",
      accelerator: "CmdOrCtrl+V",
    },
    {
      type: "separator",
    },
    { role: "selectAll", accelerator: "CmdOrCtrl+A" },
  ])

  window.webContents.on("context-menu", (_e, props) => {
    const { selectionText, isEditable } = props
    if (isEditable) {
      inputMenu.popup({
        window,
      })
    } else if (selectionText && selectionText.trim() !== "") {
      selectionMenu.popup({ window })
    }
  })

  return window
}

export const createMainWindow = () => {
  const storeKey = "windowState"
  const windowState = store.get(storeKey) as {
    height: number
    width: number
    x: number
    y: number
  } | null

  const window = createWindow({
    width: windowState?.width || 1200,
    height: windowState?.height || 900,
    x: windowState?.x,
    y: windowState?.y,
    minWidth: 1024,
    minHeight: 500,
  })

  window.on("close", () => {
    const bounds = window.getBounds()
    store.set(storeKey, {
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
    })
  })

  windows.mainWindow = window

  window.on("close", (event) => {
    if (isMacOS) {
      event.preventDefault()
      window.hide()
    } else {
      windows.mainWindow = null
    }
  })

  window.on("show", () => {
    cancelPollingUpdateUnreadCount()

    callGlobalContextMethod(window, "invalidateQueries")
  })

  window.on("hide", async () => {
    const settings = await callGlobalContextMethod(window, "getUISettings")

    if (settings.showDockBadge) {
      pollingUpdateUnreadCount()
    }
  })

  return window
}

export const createSettingWindow = (path?: string) => {
  // We need to open the setting modal in the main window when the main window exists,
  // if we open a new window then the state between the two windows will be out of sync.
  if (windows.mainWindow && windows.mainWindow.isVisible()) {
    windows.mainWindow.show()
    callGlobalContextMethod(windows.mainWindow, "showSetting", [path])
    return
  }
  if (windows.settingWindow) {
    windows.settingWindow.show()
    return
  }
  const window = createWindow({
    extraPath: `#settings/${path || ""}`,
    width: 700,
    height: 600,
    resizable: false,
  })

  windows.settingWindow = window
  window.on("closed", () => {
    windows.settingWindow = null
  })
}

export const getMainWindow = () => windows.mainWindow

export const getMainWindowOrCreate = () => {
  if (!windows.mainWindow) {
    createMainWindow()
  }
  return windows.mainWindow
}

export const destroyMainWindow = () => {
  windows.mainWindow?.destroy()
  windows.mainWindow = null
}
