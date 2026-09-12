import { IN_ELECTRON } from "@follow/shared/constants"
import { atom, useAtomValue, useSetAtom } from "jotai"
import { useCallback } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { ipcServices } from "~/lib/client"

const minimizeToTrayAtom = atom<boolean>(true)

minimizeToTrayAtom.onMount = (setAtom) => {
  const result = ipcServices?.setting.getMinimizeToTray()
  Promise.resolve(result).then((proxy) => {
    if (typeof proxy === "boolean") {
      setAtom(proxy)
    }
  })
}

export const useMinimizeToTrayValue = () => useAtomValue(minimizeToTrayAtom)

export const useSetMinimizeToTray = () => {
  const setMinimizeToTray = useSetAtom(minimizeToTrayAtom)
  const { t } = useTranslation("settings")
  return useCallback(
    (value: boolean) => {
      if (!IN_ELECTRON) return
      setMinimizeToTray(value)
      void (async () => {
        // On Linux, disabling the tray can't remove the icon from the running
        // process (Electron limitation). The main process tells us so; offer a
        // restart.
        const needsRestart = await ipcServices?.setting.setMinimizeToTray(value)
        if (!needsRestart) return
        toast(t("general.minimize_to_tray.restart_to_remove"), {
          // The default 4s is too short for a toast whose only point is its action.
          duration: 30_000,
          closeButton: true,
          action: {
            label: t("general.minimize_to_tray.restart_now"),
            onClick: () => ipcServices?.app.relaunch(),
          },
        })
      })()
    },
    [setMinimizeToTray, t],
  )
}
