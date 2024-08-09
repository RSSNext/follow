import {
  setGeneralSetting,
  useGeneralSettingValue,
} from "@renderer/atoms/settings/general"
import {
  createSetting,
} from "@renderer/atoms/settings/helper"
import {
  createDefaultSettings,
  setUISetting,
  useUISettingSelector,
} from "@renderer/atoms/settings/ui"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@renderer/components/ui/select"
import { initPostHog } from "@renderer/initialize/posthog"
import { tipcClient } from "@renderer/lib/client"
import { clearLocalPersistStoreData } from "@renderer/store/utils/clear"
import { useQuery } from "@tanstack/react-query"
import { useCallback, useEffect } from "react"

import { SettingsTitle } from "../title"

const { defineSettingItem, SettingBuilder } = createSetting(
  useGeneralSettingValue,
  setGeneralSetting,
)
export const SettingGeneral = () => {
  useEffect(() => {
    tipcClient?.getLoginItemSettings().then((settings) => {
      setGeneralSetting("appLaunchOnStartup", settings.openAtLogin)
    })
  }, [])

  const saveLoginSetting = useCallback((checked: boolean) => {
    tipcClient?.setLoginItemSettings(checked)

    setGeneralSetting("appLaunchOnStartup", checked)
  }, [])

  return (
    <>
      <SettingsTitle />
      <div className="mt-4">
        <SettingBuilder
          settings={[
            {
              type: "title",
              value: "App",
              disabled: !window.electron,
            },
            {
              disabled: !window.electron,
              label: "Launch Follow at Login",
              key: "appLaunchOnStartup",
              onChange(value) {
                saveLoginSetting(value)
              },
            },
            {
              type: "title",
              value: "timeline",
            },
            defineSettingItem("unreadOnly", {
              label: "Show unread content on launch",
              description:
                "Display only unread content when the app is launched.",
            }),
            defineSettingItem("groupByDate", {
              label: "Group by date",
              description: "Group entries by date.",
            }),

            { type: "title", value: "unread" },

            defineSettingItem("scrollMarkUnread", {
              label: "Mark as read when scrolling",
              description:
                "Automatically mark entries as read when scrolled out of the view.",
            }),
            defineSettingItem("hoverMarkUnread", {
              label: "Mark as read when hovering",
              description: "Automatically mark entries as read when hovered.",
            }),
            defineSettingItem("renderMarkUnread", {
              label: "Mark as read when in the view",
              description:
                "Automatically mark single-level entries (e.g., social media posts, pictures, video views) as read when they enter the view.",
            }),

            { type: "title", value: "TTS" },

            VoiceSelector,

            {
              type: "title",
              value: "Privacy & Data",
            },

            defineSettingItem("dataPersist", {
              label: "Persist data for offline usage",
              description:
                "Persist data locally to enable offline access and local search.",
            }),

            defineSettingItem("sendAnonymousData", {
              label: "Send anonymous data",
              description:
                "By opting to send anonymized telemetry data, you contribute to improving the overall user experience of Follow.",
              onChange(value) {
                setGeneralSetting("sendAnonymousData", value)
                if (value) {
                  initPostHog()
                } else {
                  window.posthog?.reset()
                  delete window.posthog
                }
              },
            }),

            {
              label: "Rebuild Database",
              action: async () => {
                await clearLocalPersistStoreData()
                window.location.reload()
              },
              description:
                "If you are experiencing rendering issues, rebuilding the database may solve them.",
              buttonText: "Rebuild",
            },
          ]}
        />
      </div>
    </>
  )
}

export const VoiceSelector = () => {
  const { data } = useQuery({
    queryFn: () => tipcClient?.getVoices(),
    queryKey: ["voices"],
  })
  const voice = useUISettingSelector((state) => state.voice)

  return (
    <div className="-mt-1 mb-3 flex items-center justify-between">
      <span className="shrink-0 text-sm font-medium">Voices</span>
      <Select
        defaultValue={createDefaultSettings().voice}
        value={voice}
        onValueChange={(value) => {
          setUISetting("voice", value)
        }}
      >
        <SelectTrigger size="sm" className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="h-64">
          {data?.map((item) => (
            <SelectItem key={item.ShortName} value={item.ShortName}>
              {item.FriendlyName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
