import { getPlayerAtomValue, Player } from "@renderer/atoms/player"
import {
  getReadabilityStatus,
  isInReadability,
  ReadabilityStatus,
  setReadabilityContent,
  setReadabilityStatus,
  useEntryInReadabilityStatus,
} from "@renderer/atoms/readability"
import { whoami } from "@renderer/atoms/user"
import { SimpleIconsEagle } from "@renderer/components/ui/platform-icon/icons"
import { COPY_MAP, views } from "@renderer/constants"
import { shortcuts } from "@renderer/constants/shortcuts"
import { tipcClient } from "@renderer/lib/client"
import { nextFrame } from "@renderer/lib/dom"
import { parseHtml } from "@renderer/lib/parse-html"
import { cn, getOS } from "@renderer/lib/utils"
import type { CombinedEntryModel } from "@renderer/models"
import { useTipModal } from "@renderer/modules/wallet/hooks"
import type { FlatEntryModel } from "@renderer/store/entry"
import { entryActions } from "@renderer/store/entry"
import { useFeedById } from "@renderer/store/feed"
import { useMutation, useQuery } from "@tanstack/react-query"
import type { FetchError } from "ofetch"
import { ofetch } from "ofetch"
import type { ReactNode } from "react"
import { useCallback, useMemo, useState } from "react"
import { toast } from "sonner"

export const useEntryReadabilityToggle = ({
  id,
  url,
}: {
  id: string
  url: string
}) =>
  useCallback(async () => {
    const status = getReadabilityStatus()[id]
    const isTurnOn = status !== ReadabilityStatus.INITIAL && !!status

    if (!isTurnOn && url) {
      setReadabilityStatus({
        [id]: ReadabilityStatus.WAITING,
      })
      const result = await tipcClient?.readability({
        url,
      })

      if (result) {
        const status = getReadabilityStatus()[id]
        if (status !== ReadabilityStatus.WAITING) return
        setReadabilityStatus({
          [id]: ReadabilityStatus.SUCCESS,
        })
        setReadabilityContent({
          [id]: result,
        })
      }
    } else {
      setReadabilityStatus({
        [id]: ReadabilityStatus.INITIAL,
      })
    }
  }, [id, url])
export const useCollect = (entry: Nullable<CombinedEntryModel>) =>
  useMutation({
    mutationFn: async () =>
      entry && entryActions.markStar(entry.entries.id, true),

    onSuccess: () => {
      toast.success("Starred.", {
        duration: 1000,
      })
    },
  })

export const useUnCollect = (entry: Nullable<CombinedEntryModel>) =>
  useMutation({
    mutationFn: async () =>
      entry && entryActions.markStar(entry.entries.id, false),

    onSuccess: () => {
      toast.success("Unstarred.", {
        duration: 1000,
      })
    },
  })

export const useRead = () =>
  useMutation({
    mutationFn: async (entry: Nullable<CombinedEntryModel>) =>
      entry && entryActions.markRead(entry.feeds.id, entry.entries.id, true),
  })
export const useUnread = () =>
  useMutation({
    mutationFn: async (entry: Nullable<CombinedEntryModel>) =>
      entry && entryActions.markRead(entry.feeds.id, entry.entries.id, false),
  })

export const useEntryActions = ({
  view,
  entry,
}: {
  view?: number
  entry?: FlatEntryModel | null
}) => {
  const checkEagle = useQuery({
    queryKey: ["check-eagle"],
    enabled: !!entry?.entries.url && view !== undefined,
    queryFn: async () => {
      try {
        await ofetch("http://localhost:41595")
        return true
      } catch (error: unknown) {
        return (error as FetchError).data?.code === 401
      }
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  })
  const entryReadabilityStatus = useEntryInReadabilityStatus(entry?.entries.id)

  const feed = useFeedById(entry?.feedId)

  const populatedEntry = useMemo(() => {
    if (!entry) return null
    if (!feed) return null
    return {
      ...entry,
      feeds: feed!,
    } as CombinedEntryModel
  }, [entry, feed])

  const openTipModal = useTipModal({
    userId: populatedEntry?.feeds.ownerUserId ?? undefined,
    feedId: populatedEntry?.feeds.id ?? undefined,
  })

  const collect = useCollect(populatedEntry)
  const uncollect = useUnCollect(populatedEntry)
  const read = useRead()
  const unread = useUnread()

  const readabilityToggle = useEntryReadabilityToggle({
    id: populatedEntry?.entries.id ?? "",
    url: populatedEntry?.entries.url ?? "",
  })

  const [ttsLoading, setTtsLoading] = useState(false)

  const items = useMemo(() => {
    if (!populatedEntry || view === undefined) return []
    const items: {
      key: string
      className?: string
      shortcut?: string
      name: string
      icon?: ReactNode
      hide?: boolean
      active?: boolean
      onClick: () => void
    }[] = [
      {
        key: "tip",
        shortcut: shortcuts.entry.tip.key,
        name: `Tip`,
        className: "i-mgc-power-outline",
        hide: feed?.ownerUserId === whoami()?.id,
        onClick: () => {
          nextFrame(openTipModal)
        },
      },
      {
        key: "star",
        shortcut: shortcuts.entry.toggleStarred.key,
        name: `Star`,
        className: "i-mgc-star-cute-re",
        hide: !!populatedEntry.collections,
        onClick: () => {
          collect.mutate()
        },
      },
      {
        key: "unstar",
        name: `Unstar`,
        shortcut: shortcuts.entry.toggleStarred.key,
        className: "i-mgc-star-cute-fi text-orange-500",
        hide: !populatedEntry.collections,
        onClick: () => {
          uncollect.mutate()
        },
      },
      {
        key: "copyLink",
        name: "Copy Link",
        className: "i-mgc-link-cute-re",
        hide: !populatedEntry.entries.url,
        shortcut: shortcuts.entry.copyLink.key,
        onClick: () => {
          if (!populatedEntry.entries.url) return
          navigator.clipboard.writeText(populatedEntry.entries.url)
          toast("Link copied to clipboard.", {
            duration: 1000,
          })
        },
      },
      {
        key: "openInBrowser",
        name: COPY_MAP.OpenInBrowser(),
        shortcut: shortcuts.entry.openInBrowser.key,
        className: "i-mgc-world-2-cute-re",
        hide: !populatedEntry.entries.url,
        onClick: () => {
          if (!populatedEntry.entries.url) return
          window.open(populatedEntry.entries.url, "_blank")
        },
      },
      {
        key: "tts",
        name: "Play TTS",
        shortcut: shortcuts.entry.tts.key,
        className: ttsLoading ? "i-mgc-loading-3-cute-re animate-spin" : "i-mgc-voice-cute-re",
        hide: !populatedEntry.entries.content,
        onClick: async () => {
          if (ttsLoading) return
          if (!populatedEntry.entries.content) return
          setTtsLoading(true)
          if (getPlayerAtomValue().entryId === populatedEntry.entries.id) {
            Player.togglePlayAndPause()
          } else {
            const filePath = await tipcClient?.tts({
              id: populatedEntry.entries.id,
              text: (await parseHtml(populatedEntry.entries.content)).toText(),
            })
            if (filePath) {
              Player.mount({
                type: "audio",
                entryId: populatedEntry.entries.id,
                src: `file://${filePath}`,
                currentTime: 0,
              })
            }
          }
          setTtsLoading(false)
        },
      },
      {
        name: "Readability",
        className: cn(
          isInReadability(entryReadabilityStatus) ?
            `i-mgc-sparkles-2-filled` :
            `i-mgc-sparkles-2-cute-re`,
          entryReadabilityStatus === ReadabilityStatus.WAITING ?
            `animate-pulse` :
            "",
        ),
        key: "readability",
        hide:
          views[view].wideMode ||
          !populatedEntry.entries.url ||
          !window.electron,
        active: isInReadability(entryReadabilityStatus),
        onClick: readabilityToggle,
      },
      {
        name: "Save Media to Eagle",
        icon: <SimpleIconsEagle />,
        key: "saveToEagle",
        hide:
          (checkEagle.isLoading ? true : !checkEagle.data) ||
          !populatedEntry.entries.media?.length,
        onClick: async () => {
          if (
            !populatedEntry.entries.url ||
            !populatedEntry.entries.media?.length
          ) {
            return
          }
          const response = await tipcClient?.saveToEagle({
            url: populatedEntry.entries.url,
            mediaUrls: populatedEntry.entries.media.map((m) => m.url),
          })
          if (response?.status === "success") {
            toast("Saved to Eagle.", {
              duration: 3000,
            })
          } else {
            toast("Failed to save to Eagle.", {
              duration: 3000,
            })
          }
        },
      },
      {
        name: "Share",
        key: "share",
        className:
          getOS() === "macOS" ?
            `i-mgc-share-3-cute-re` :
            "i-mgc-share-forward-cute-re",
        shortcut: shortcuts.entry.share.key,
        hide: !window.electron && !navigator.share,

        onClick: () => {
          if (!populatedEntry.entries.url) return

          if (window.electron) {
            return tipcClient?.showShareMenu(populatedEntry.entries.url)
          } else {
            navigator.share({
              url: populatedEntry.entries.url,
            })
          }
          return
        },
      },
      {
        key: "read",
        name: `Mark as Read`,
        shortcut: shortcuts.entry.toggleRead.key,
        className: "i-mgc-round-cute-fi",
        hide: !!(!!populatedEntry.read || populatedEntry.collections),
        onClick: () => {
          read.mutate(populatedEntry)
        },
      },
      {
        key: "unread",
        name: `Mark as Unread`,
        shortcut: shortcuts.entry.toggleRead.key,
        className: "i-mgc-round-cute-re",
        hide: !!(!populatedEntry.read || populatedEntry.collections),
        onClick: () => {
          unread.mutate(populatedEntry)
        },
      },
    ]

    return items
  }, [
    populatedEntry,
    view,
    checkEagle.isLoading,
    checkEagle.data,
    openTipModal,
    collect,
    uncollect,
    readabilityToggle,
    read,
    unread,
    entryReadabilityStatus,
  ])

  return {
    items,
  }
}
