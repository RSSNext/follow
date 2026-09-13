export interface GeneralSettings {
  appLaunchOnStartup: boolean
  language: string
  translation: boolean
  translationMode: "bilingual" | "translation-only"
  summary: boolean
  actionLanguage: string
  sendAnonymousData: boolean
  unreadOnly: boolean
  timelineSortOrder: "asc" | "desc"
  scrollMarkUnread: boolean
  hoverMarkUnread: boolean
  renderMarkUnread: boolean
  groupByDate: boolean
  jumpOutLinkWarn: boolean
  dimRead: boolean
  // TTS
  voice: string

  // subscription
  autoGroup: boolean
  hideAllReadSubscriptions: boolean
  hidePrivateSubscriptionsInTimeline: boolean

  /**
   * Top timeline for mobile
   */
  showQuickTimeline: boolean
  /**
   * Auto expand long social media
   */
  autoExpandLongSocialMedia: boolean

  // Pro feature
  enhancedSettings: boolean

  // @mobile
  openLinksInExternalApp: boolean
}

export type AccentColor =
  "orange" | "blue" | "green" | "purple" | "pink" | "red" | "yellow" | "gray" | string // Allow custom hex colors
export interface UISettings {
  accentColor: AccentColor
  customAccentColor?: string // Store custom color value
  entryColWidth: number
  aiColWidth: number
  /**
   * Dedicated AI panel width for `FeedViewType.All`.
   * If not set, the runtime default falls back to half of the window width.
   */
  feedColWidth: number
  opaqueSidebar: boolean
  sidebarShowUnreadCount: boolean
  hideExtraBadge: boolean
  thumbnailRatio: "square" | "original"
  uiTextSize: number
  showDockBadge: boolean
  modalOverlay: boolean
  modalDraggable: boolean
  reduceMotion: boolean
  usePointerCursor: boolean | null
  uiFontFamily: string
  readerFontFamily: string
  // Content
  readerRenderInlineStyle: boolean
  codeHighlightThemeLight: string
  codeHighlightThemeDark: string
  guessCodeLanguage: boolean
  hideRecentReader: boolean
  customCSS: string

  // view
  pictureViewMasonry: boolean
  pictureViewImageOnly: boolean
  wideMode: boolean
  contentFontSize: number
  dateFormat: string
  contentLineHeight: number

  // Action Order
  toolbarOrder: {
    main: (string | number)[]
    more: (string | number)[]
  }

  // @mobile
  showUnreadCountViewAndSubscriptionMobile: boolean
  showUnreadCountBadgeMobile: boolean

  // Discover
  discoverLanguage: "all" | "eng" | "cmn" | "fra"

  // Desktop: Timeline tabs preset (excluding the first fixed tab)
  timelineTabs: {
    visible: string[]
    hidden: string[]
  }
}

export interface IntegrationSettings {
  // eagle
  enableEagle: boolean

  // readwise
  enableReadwise: boolean
  readwiseToken: string

  // instapaper
  enableInstapaper: boolean
  instapaperUsername: string
  instapaperPassword: string

  // obsidian
  enableObsidian: boolean
  obsidianVaultPath: string

  // outline
  enableOutline: boolean
  outlineEndpoint: string
  outlineToken: string
  outlineCollection: string

  // readeck
  enableReadeck: boolean
  readeckEndpoint: string
  readeckToken: string

  // cubox
  enableCubox: boolean
  cuboxToken: string
  enableCuboxAutoMemo: boolean

  //zotero
  enableZotero: boolean
  zoteroUserID: string
  zoteroToken: string

  // qbittorrent
  enableQBittorrent: boolean
  qbittorrentHost: string
  qbittorrentUsername: string
  qbittorrentPassword: string

  saveSummaryAsDescription: boolean

  // custom actions
  enableCustomIntegration: boolean
  customIntegration: CustomIntegration[]

  // fetch preferences (Electron only)
  useBrowserFetch: boolean
}

export interface FetchTemplate {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  url: string
  headers: Record<string, string>
  body?: string
}

export interface URLSchemeTemplate {
  scheme: string // e.g., "obsidian://", "bear://", "drafts://action"
  // URL schemes use query parameters or path segments for data
}

export interface CustomIntegration {
  id: string
  name: string
  icon: string
  type?: "http" | "url-scheme" // Optional for backward compatibility
  fetchTemplate?: FetchTemplate // Keep optional for url-scheme integrations
  urlSchemeTemplate?: URLSchemeTemplate
  enabled: boolean
}

export type AIShortcutTarget = "list" | "entry"

export const DEFAULT_SHORTCUT_TARGETS: readonly AIShortcutTarget[] = ["list", "entry"]

export interface AIShortcut {
  id: string
  name: string
  prompt: string
  defaultPrompt?: string
  enabled: boolean
  icon?: string
  hotkey?: string
  displayTargets?: AIShortcutTarget[]
}

export type MCPTransportType = "streamable-http" | "sse"

export interface MCPService {
  id: string
  name: string
  transportType: MCPTransportType
  url?: string
  headers?: Record<string, string>
  isConnected: boolean
  enabled: boolean
  lastError?: string
  toolCount: number
  resourceCount: number
  promptCount: number
  createdAt: string
  lastUsed: string | null
}

export interface AISettings {
  personalizePrompt: string
  aiTimelinePrompt: string
  shortcuts: AIShortcut[]

  // MCP Services (stored locally, actual connections managed via server API)
  mcpEnabled: boolean
  mcpServices: MCPService[]

  // Features
  autoScrollWhenStreaming: boolean

  byok: UserByokSettings
}

export type ByokProviderName = "openai" | "google" | "vercel-ai-gateway" | "openrouter" | "ollama"

export type UserByokProviderConfig = {
  provider: ByokProviderName
  baseURL?: string | null
  apiKey?: string | null
  model?: string | null
  headers?: Record<string, string>
}

export type UserByokSettings = {
  enabled: boolean
  providers: UserByokProviderConfig[]
}
