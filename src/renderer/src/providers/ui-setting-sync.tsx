import { useUISettingValue } from "@renderer/atoms/settings/ui"
import { useSyncDark } from "@renderer/hooks/common"
import { tipcClient } from "@renderer/lib/client"
import { feedUnreadActions } from "@renderer/store/unread"
import { useEffect, useInsertionEffect } from "react"

const useUISettingSync = () => {
  const setting = useUISettingValue()
  useSyncDark()
  useInsertionEffect(() => {
    const root = document.documentElement
    root.style.fontSize = `${setting.uiTextSize}px`
  }, [setting.uiTextSize])

  useInsertionEffect(() => {
    const root = document.documentElement

    const fontCss = `${setting.uiFontFamily},"SN Pro", system-ui, sans-serif`
    Object.assign(root.style, {
      fontFamily: fontCss,
    })
    root.style.cssText += `\n--fo-font-family: ${fontCss}`
    Object.assign(document.body.style, {
      fontFamily: fontCss,
    })
  }, [setting.uiFontFamily])

  useEffect(() => {
    if (setting.showDockBadge) {
      return feedUnreadActions.subscribeUnreadCount(
        (count) => tipcClient?.setDockBadge(count),
        true,
      )
    } else {
      tipcClient?.setDockBadge(0)
    }
    return
  }, [setting.showDockBadge])

  useEffect(() => {
    if (setting.voice) {
      tipcClient?.setVoice(setting.voice)
    }
  }, [setting.voice])
}
export const SettingSync = () => {
  useUISettingSync()
  return null
}
