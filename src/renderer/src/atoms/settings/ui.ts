import type { UISettings } from "@shared/interface/settings"

import { createSettingAtom } from "./helper"

export const createDefaultSettings = (): UISettings => ({
  // Sidebar
  entryColWidth: 356,
  feedColWidth: 256,

  opaqueSidebar: false,
  sidebarShowUnreadCount: true,

  // Global UI
  uiTextSize: 16,
  // System
  showDockBadge: true,
  // Misc
  modalOverlay: true,
  modalDraggable: true,
  modalOpaque: true,
  reduceMotion: false,

  // Font
  uiFontFamily: "SN Pro",
  readerFontFamily: "inherit",
  // Content
  readerRenderInlineStyle: false,
  codeHighlightTheme: "github-dark",

  // View
  pictureViewMasonry: true,

  // TTS
  voice: "en-US-AndrewMultilingualNeural",
})

export const {
  useSettingKey: useUISettingKey,
  useSettingSelector: useUISettingSelector,
  setSetting: setUISetting,
  clearSettings: clearUISettings,
  initializeDefaultSettings: initializeDefaultUISettings,
  getSettings: getUISettings,
  useSettingValue: useUISettingValue,
} = createSettingAtom("ui", createDefaultSettings)
