export interface GeneralSettings {
  appLaunchOnStartup: boolean
  dataPersist: boolean
  sendAnonymousData: boolean
  unreadOnly: boolean
  scrollMarkUnread: boolean
  hoverMarkUnread: boolean
  renderMarkUnread: boolean
  groupByDate: boolean
}

export interface UISettings {
  entryColWidth: number
  feedColWidth: number
  opaqueSidebar: boolean
  sidebarShowUnreadCount: boolean
  uiTextSize: number
  showDockBadge: boolean
  modalOverlay: boolean
  modalDraggable: boolean
  modalOpaque: boolean
  reduceMotion: boolean
  uiFontFamily: string
  readerFontFamily: string
  readerRenderInlineStyle: boolean
  codeHighlightTheme: string

  // view
  pictureViewMasonry: boolean

  // tts
  voice: string
}
