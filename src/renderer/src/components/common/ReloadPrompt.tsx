import { useCallback, useEffect } from "react"
import { toast } from "sonner"
import { useRegisterSW } from "virtual:pwa-register/react"

export function ReloadPrompt() {
  const {
    offlineReady: [, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      // eslint-disable-next-line prefer-template
      console.info("SW Registered: " + r)
    },
    onRegisterError(error) {
      console.error("SW registration error", error)
    },
  })

  const close = useCallback(() => {
    setOfflineReady(false)
    setNeedRefresh(false)
  }, [setNeedRefresh, setOfflineReady])

  useEffect(() => {
    if (needRefresh) {
      toast.info("New version available", {
        action: {
          label: "Refresh",
          onClick: () => {
            updateServiceWorker(true)
            close()
          },
        },
      })
    }
  }, [close, needRefresh, updateServiceWorker])

  return null
}
