import { COPY_MAP } from "@renderer/constants"

export const shortcuts = {
  feeds: {
    // previous: {
    //   name: "Previous Subscription",
    //   key: "P",
    // },
    // next: {
    //   name: "Next Subscription",
    //   key: "N",
    // },
    // toggleFolder: {
    //   name: "Toggle Folder",
    //   key: "X",
    // },
    add: {
      name: "Add Subscription",
      key: "Meta+T",
    },
    switchToView: {
      name: "Switch to View",
      key: "1, 2, 3, 4, 5, 6",
    },
    switchBetweenViews: {
      name: "Switch Between Views",
      key: "Tab, Left, Right",
    },
  },
  layout: {
    toggleSidebar: {
      name: "Toggle Feed Sidebar",
      key: "Meta+B",
    },
  },
  entries: {
    refetch: {
      name: "Refetch",
      key: "R",
    },
    previous: {
      name: "Previous Entry",
      key: "K, Up",
    },
    next: {
      name: "Next Entry",
      key: "J, Down",
    },
    markAllAsRead: {
      name: "Mark All as Read",
      key: "Shift+Meta+A",
    },
    toggleUnreadOnly: {
      name: "Toggle Unread Only",
      key: "U",
    },
  },
  entry: {
    toggleRead: {
      name: "Toggle Read",
      key: "M",
    },
    toggleStarred: {
      name: "Toggle Starred",
      key: "S",
    },
    openInBrowser: {
      name: COPY_MAP.OpenInBrowser(),
      key: "B",
      extra: "Double Click",
    },
    tts: {
      name: "Play TTS",
      key: "Shift+Meta+V",
    },
    copyLink: {
      name: "Copy Link",
      key: "Shift+Meta+C",
    },
    tip: {
      name: "Tip Power",
      key: "Shift+Meta+T",
    },
    share: {
      name: "Share",
      key: "Meta+Alt+S",
    },
  },

  audio: {
    "play/pause": {
      name: "Play/Pause (When the audio player is open)",
      key: "Space",
    },
  },
} as const
