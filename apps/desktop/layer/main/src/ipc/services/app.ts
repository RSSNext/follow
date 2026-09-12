import fsp from "node:fs/promises"
import { fileURLToPath } from "node:url"

import { callWindowExpose } from "@follow/shared/bridge"
import { DEV } from "@follow/shared/constants"
import { app, BrowserWindow, clipboard, dialog, shell } from "electron"
import { getIpcContext, IpcMethod, IpcService } from "electron-ipc-decorator"
import path from "pathe"

import { START_IN_TRAY_ARGS } from "~/constants/app"
import { getCacheSize } from "~/lib/cleaner"
import { i18n } from "~/lib/i18n"
import { store, StoreKey } from "~/lib/store"
import { registerAppTray } from "~/lib/tray"
import { logger, revealLogFile } from "~/logger"
import { AppManager } from "~/manager/app"
import { WindowManager } from "~/manager/window"
import { cleanupOldRender, loadDynamicRenderEntry } from "~/updater/hot-updater"

import { downloadFile } from "../../lib/download"
import { checkForAppUpdates, quitAndInstall } from "../../updater"

interface WindowActionInput {
  action: "close" | "minimize" | "maximum"
}

interface SearchInput {
  text: string
  options: Electron.FindInPageOptions
}

interface ExportCurrentPageAsPdfInput {
  defaultPath?: string
}

interface Sender extends Electron.WebContents {
  getOwnerBrowserWindow: () => Electron.BrowserWindow | null
}

const ensurePdfExtension = (filePath: string) => {
  return path.extname(filePath).toLowerCase() === ".pdf" ? filePath : `${filePath}.pdf`
}

export class AppService extends IpcService {
  static override readonly groupName = "app"

  @IpcMethod()
  getAppVersion(): string {
    return app.getVersion()
  }

  @IpcMethod()
  async checkForUpdates(): Promise<{ hasUpdate: boolean; error?: string }> {
    return checkForAppUpdates()
  }

  @IpcMethod()
  switchAppLocale(input: string): void {
    i18n.changeLanguage(input)
    AppManager.registerMenuAndContextMenu()
    registerAppTray()

    app.commandLine.appendSwitch("lang", input)
  }

  @IpcMethod()
  rendererUpdateReload(): void {
    const __dirname = fileURLToPath(new URL(".", import.meta.url))
    const allWindows = BrowserWindow.getAllWindows()
    const dynamicRenderEntry = loadDynamicRenderEntry()

    const appLoadEntry = dynamicRenderEntry || path.resolve(__dirname, "../renderer/index.html")
    logger.info("appLoadEntry", appLoadEntry)
    const mainWindow = WindowManager.getMainWindow()

    for (const window of allWindows) {
      if (window === mainWindow) {
        if (DEV) {
          logger.verbose("[rendererUpdateReload]: skip reload in dev")
          break
        }
        window.loadFile(appLoadEntry)
      } else window.destroy()
    }

    setTimeout(() => {
      cleanupOldRender()
    }, 1000)
  }

  @IpcMethod()
  async openExternal(url: string): Promise<void> {
    if (!url) return

    await shell.openExternal(url)
  }

  @IpcMethod()
  windowAction(input: WindowActionInput): void {
    const { sender } = getIpcContext()
    if (sender.getType() === "window") {
      const window: BrowserWindow | null = (sender as Sender).getOwnerBrowserWindow()

      if (!window) return
      switch (input.action) {
        case "close": {
          window.close()
          break
        }
        case "minimize": {
          window.minimize()
          break
        }
        case "maximum": {
          if (window.isMaximized()) {
            window.unmaximize()
          } else {
            window.maximize()
          }
          break
        }
      }
    }
  }

  @IpcMethod()
  quitAndInstall(): void {
    quitAndInstall()
  }

  @IpcMethod()
  relaunch(): void {
    app.relaunch({
      // Inside an AppImage, `process.execPath` points into the FUSE mount, which
      // is unmounted once this process exits — the relauncher would then fail to
      // exec it and the app would simply quit. `$APPIMAGE` is the outer bundle.
      // It is undefined elsewhere, which keeps Electron's default behaviour.
      execPath: process.env.APPIMAGE,
      // Drop the autostart flag so a relaunch never resurrects the app hidden.
      args: process.argv.slice(1).filter((arg) => arg !== START_IN_TRAY_ARGS),
    })
    // `app.quit()` rather than `app.exit()`: the `before-quit` handlers persist
    // the window bounds and flush the cookie store.
    app.quit()
  }

  @IpcMethod()
  readClipboard(): string {
    return clipboard.readText()
  }

  @IpcMethod()
  async search(input: SearchInput): Promise<Electron.Result | null> {
    const { sender: webContents } = getIpcContext()

    const { promise, resolve } = Promise.withResolvers<Electron.Result | null>()

    let requestId = -1
    webContents.once("found-in-page", (_, result) => {
      resolve(result.requestId === requestId ? result : null)
    })
    requestId = webContents.findInPage(input.text, input.options)
    return promise
  }

  @IpcMethod()
  clearSearch(): void {
    getIpcContext().sender.stopFindInPage("keepSelection")
  }

  @IpcMethod()
  async download(input: string): Promise<void> {
    const { sender } = getIpcContext()
    const result = await dialog.showSaveDialog({
      defaultPath: input.split("/").pop(),
    })
    if (result.canceled) return

    try {
      await downloadFile(input, result.filePath)

      const senderWindow = (sender as Sender).getOwnerBrowserWindow()
      if (senderWindow) {
        callWindowExpose(senderWindow).toast.success("Download success!", {
          duration: 1000,
        })
      }
    } catch (err) {
      const senderWindow = (sender as Sender).getOwnerBrowserWindow()
      if (senderWindow) {
        callWindowExpose(senderWindow).toast.error("Download failed!", {
          duration: 1000,
        })
      }
      throw err
    }
  }

  @IpcMethod()
  async exportCurrentPageAsPdf(input: ExportCurrentPageAsPdfInput = {}): Promise<string | null> {
    const { sender } = getIpcContext()
    const senderWindow = (sender as Sender).getOwnerBrowserWindow()
    const dialogOptions: Electron.SaveDialogOptions = {
      defaultPath: ensurePdfExtension(input.defaultPath || "Untitled.pdf"),
      filters: [{ name: "PDF", extensions: ["pdf"] }],
      properties: ["createDirectory", "showOverwriteConfirmation"],
    }
    const result = senderWindow
      ? await dialog.showSaveDialog(senderWindow, dialogOptions)
      : await dialog.showSaveDialog(dialogOptions)

    if (result.canceled || !result.filePath) return null

    const pdfData = await sender.printToPDF({
      printBackground: true,
      preferCSSPageSize: true,
    })

    const filePath = ensurePdfExtension(result.filePath)
    await fsp.writeFile(filePath, pdfData)

    return filePath
  }

  @IpcMethod()
  getAppPath(): string {
    return app.getAppPath()
  }

  @IpcMethod()
  resolveAppAsarPath(input: string): string {
    const resolvedInput = input.startsWith("file://") ? fileURLToPath(input) : input

    if (path.isAbsolute(resolvedInput)) {
      return resolvedInput
    }

    return path.join(app.getAppPath(), resolvedInput)
  }

  @IpcMethod()
  readyToShowMainWindow() {
    const shouldShowWindow =
      !app.getLoginItemSettings().wasOpenedAsHidden && !process.argv.includes(START_IN_TRAY_ARGS)
    if (shouldShowWindow) {
      const window = WindowManager.getMainWindow()
      if (window) window.show()
    }
  }

  @IpcMethod()
  openCacheFolder(): void {
    const dir = path.join(app.getPath("userData"), "cache")
    shell.openPath(dir)
  }

  @IpcMethod()
  getCacheLimit(): number {
    return store.get(StoreKey.CacheSizeLimit) || 0
  }

  @IpcMethod()
  async clearCache(): Promise<void> {
    const cachePath = path.join(app.getPath("userData"), "cache", "Cache_Data")
    if (process.platform === "win32") {
      // Request elevation on Windows

      try {
        // Create a bat file to delete cache with elevated privileges
        const batPath = path.join(app.getPath("temp"), "clear_cache.bat")
        await fsp.writeFile(batPath, `@echo off\nrd /s /q "${cachePath}"\ndel "%~f0"`, "utf-8")

        // Execute the bat file with admin privileges
        await shell.openPath(batPath)
        return
      } catch (err) {
        logger.error("Failed to clear cache with elevation", { error: err })
      }
    }
    await fsp.rm(cachePath, { recursive: true, force: true }).catch(() => {
      logger.error("Failed to clear cache")
    })
  }

  @IpcMethod()
  limitCacheSize(input: number): void {
    if (input === 0) {
      store.delete(StoreKey.CacheSizeLimit)
    } else {
      store.set(StoreKey.CacheSizeLimit, input)
    }
  }

  @IpcMethod()
  revealLogFile() {
    return revealLogFile()
  }

  @IpcMethod()
  getCacheSize() {
    return getCacheSize()
  }

  @IpcMethod()
  async selectDirectory(): Promise<string | null> {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory"],
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]!
  }

  @IpcMethod()
  async checkPathExists(input: string): Promise<boolean> {
    try {
      await fsp.access(input)
      return true
    } catch {
      return false
    }
  }
}
