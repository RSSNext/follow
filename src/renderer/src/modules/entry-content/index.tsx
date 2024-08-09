import {
  ReadabilityStatus,
  useEntryInReadabilityStatus,
  useEntryIsInReadability,
  useEntryReadabilityContent,
} from "@renderer/atoms/readability"
import { useUISettingKey } from "@renderer/atoms/settings/ui"
import { useWhoami } from "@renderer/atoms/user"
import { m } from "@renderer/components/common/Motion"
import { AutoResizeHeight } from "@renderer/components/ui/auto-resize-height"
import { StyledButton } from "@renderer/components/ui/button"
import { ScrollArea } from "@renderer/components/ui/scroll-area"
import { ROUTE_FEED_PENDING } from "@renderer/constants"
import { useEntryReadabilityToggle } from "@renderer/hooks/biz/useEntryActions"
import {
  useRouteParamsSelector,
  useRouteParms,
} from "@renderer/hooks/biz/useRouteParams"
import { useAuthQuery, useTitle } from "@renderer/hooks/common"
import { stopPropagation } from "@renderer/lib/dom"
import { FeedViewType } from "@renderer/lib/enum"
import { parseHtml } from "@renderer/lib/parse-html"
import type { ActiveEntryId } from "@renderer/models"
import {
  useIsSoFWrappedElement,
  WrappedElementProvider,
} from "@renderer/providers/wrapped-element-provider"
import { Queries } from "@renderer/queries"
import { useEntry, useEntryReadHistory } from "@renderer/store/entry"
import { useFeedById, useFeedHeaderTitle } from "@renderer/store/feed"
import type { FC, ReactNode } from "react"
import { useEffect, useLayoutEffect, useRef, useState } from "react"

import { LoadingCircle } from "../../components/ui/loading"
import { EntryPlaceholderDaily } from "../ai/ai-daily/EntryPlaceholderDaily"
import { EntryTranslation } from "../entry-column/translation"
import { setEntryContentScrollToTop, setEntryTitleMeta } from "./atoms"
import { EntryPlaceholderLogo } from "./entry-placeholder"
import { EntryHeader } from "./header"
import { EntryContentProvider } from "./provider"

export const EntryContent = ({ entryId }: { entryId: ActiveEntryId }) => {
  const title = useFeedHeaderTitle()
  const { feedId, view } = useRouteParms()

  useTitle(title)
  if (!entryId) {
    return (
      <m.div
        className="center size-full flex-col"
        initial={{ opacity: 0.01, y: 300 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <EntryPlaceholderLogo />
        {feedId === ROUTE_FEED_PENDING && view === FeedViewType.Articles && (
          <EntryPlaceholderDaily view={view} />
        )}
      </m.div>
    )
  }

  return <EntryContentRender entryId={entryId} />
}

function EntryContentRender({ entryId }: { entryId: string }) {
  const user = useWhoami()

  const { error, data, isPending } = useAuthQuery(
    Queries.entries.byId(entryId),
    {
      staleTime: 300_000,
    },
  )

  const entry = useEntry(entryId)
  useTitle(entry?.entries.title)

  const feed = useFeedById(entry?.feedId)

  const entryHistory = useEntryReadHistory(entryId)

  const [content, setContent] = useState<JSX.Element>()
  const readerRenderInlineStyle = useUISettingKey("readerRenderInlineStyle")
  useEffect(() => {
    // Fallback data, if local data is broken should fallback to cached query data.
    const processContent = entry?.entries.content ?? data?.entries.content
    if (processContent) {
      parseHtml(processContent, {
        renderInlineStyle: readerRenderInlineStyle,
      }).then((parsed) => {
        setContent(parsed.toContent())
      })
    } else {
      setContent(undefined)
    }
  }, [
    data?.entries.content,
    entry?.entries.content,
    readerRenderInlineStyle,
    // Only for dx, hmr
    parseHtml,
  ])

  const translation = useAuthQuery(
    Queries.ai.translation({
      entry: entry!,
      language: entry?.settings?.translation,
      extraFields: ["title"],
    }),
    {
      enabled: !!entry?.settings?.translation,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      meta: {
        persist: true,
      },
    },
  )

  const summary = useAuthQuery(
    Queries.ai.summary({
      entryId,
      language: entry?.settings?.translation,
    }),
    {
      enabled: !!entry?.settings?.summary,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      meta: {
        persist: true,
      },
    },
  )

  const readerFontFamily = useUISettingKey("readerFontFamily")
  const view = useRouteParamsSelector((route) => route.view)

  const isInReadabilityMode = useEntryIsInReadability(entryId)
  const scrollerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollerRef.current?.scrollTo(0, 0)
  }, [entryId])
  if (!entry) return null

  return (
    <EntryContentProvider
      entryId={entry.entries.id}
      feedId={entry.feedId}
      audioSrc={entry.entries?.attachments?.[0].url}
      view={view}
    >
      <EntryHeader
        entryId={entry.entries.id}
        view={0}
        className="h-[55px] shrink-0 px-3"
      />

      <ScrollArea.ScrollArea
        mask={false}
        rootClassName="h-0 grow min-w-0 overflow-y-auto @container"
        viewportClassName="p-5"
        ref={scrollerRef}
      >
        <m.div
          style={
            readerFontFamily ?
                {
                  fontFamily: readerFontFamily,
                } :
              undefined
          }
          initial={{ opacity: 0.01, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0.01, y: -100 }}
          key={entry.entries.id}
        >
          <article
            onContextMenu={stopPropagation}
            className="relative m-auto min-w-0 max-w-[550px] @3xl:max-w-[70ch]"
          >
            <a
              href={entry.entries.url || void 0}
              target="_blank"
              className="-mx-6 block cursor-default rounded-lg p-6 transition-colors hover:bg-theme-item-hover focus-visible:bg-theme-item-hover focus-visible:!outline-none @sm:-mx-3 @sm:p-3"
              rel="noreferrer"
            >
              <div className="select-text break-words text-3xl font-bold">
                <EntryTranslation
                  source={entry.entries.title}
                  target={translation.data?.title}
                />
              </div>
              <div className="mt-2 text-[13px] font-medium text-zinc-500">
                {feed?.title}
              </div>
              <div className="flex items-center gap-2 text-[13px] text-zinc-500">
                {entry.entries.publishedAt &&
                  new Date(entry.entries.publishedAt).toLocaleString()}

                <div className="flex items-center gap-1">
                  <i className="i-mgc-eye-2-cute-re" />
                  <span>
                    {(
                      (entryHistory?.readCount ?? 0) +
                      (entryHistory?.userIds?.every((id) => id !== user?.id) ?
                        1 :
                        0)
                    ) // if no me, +1
                      .toLocaleString()}
                  </span>
                </div>
              </div>
            </a>

            <WrappedElementProvider boundingDetection>
              <TitleMetaHandler entryId={entry.entries.id} />
              <div className="prose mx-auto mb-32 mt-8 max-w-full cursor-auto select-text break-all text-[0.94rem] dark:prose-invert">
                {(summary.isLoading || summary.data) && (
                  <div className="my-8 space-y-1 rounded-lg border px-4 py-3">
                    <div className="flex items-center gap-2 font-medium text-zinc-800 dark:text-neutral-400">
                      <i className="i-mgc-magic-2-cute-re align-middle" />
                      <span>AI summary</span>
                    </div>
                    <AutoResizeHeight
                      spring
                      className="text-sm leading-relaxed"
                    >
                      {summary.isLoading ?
                        SummaryLoadingSkeleton :
                        summary.data}
                    </AutoResizeHeight>
                  </div>
                )}
                {!isInReadabilityMode ? (
                  content
                ) : (
                  <ReadabilityContent entryId={entryId} />
                )}
              </div>
            </WrappedElementProvider>
            {!content && (
              <div className="center mt-16">
                {isPending ? (
                  <LoadingCircle size="large" />
                ) : error ?
                    (
                      <div className="center flex flex-col gap-2">
                        <i className="i-mgc-close-cute-re text-3xl text-red-500" />
                        <span className="font-sans text-sm">Network Error</span>
                      </div>
                    ) :
                    (
                      <NoContent
                        id={entry.entries.id}
                        url={entry.entries.url ?? ""}
                      />
                    )}
              </div>
            )}
          </article>
        </m.div>
      </ScrollArea.ScrollArea>
    </EntryContentProvider>
  )
}

const SummaryLoadingSkeleton = (
  <div className="space-y-2">
    <span className="block h-3 w-full animate-pulse rounded-xl bg-zinc-200 dark:bg-neutral-800" />
    <span className="block h-3 w-full animate-pulse rounded-xl bg-zinc-200 dark:bg-neutral-800" />
    <span className="block h-3 w-full animate-pulse rounded-xl bg-zinc-200 dark:bg-neutral-800" />
  </div>
)

const TitleMetaHandler: Component<{
  entryId: string
}> = ({ entryId }) => {
  const {
    entries: { title: entryTitle },
    feedId,
  } = useEntry(entryId)!

  const { title: feedTitle } = useFeedById(feedId)!

  const atTop = useIsSoFWrappedElement()
  useEffect(() => {
    setEntryContentScrollToTop(false)
  }, [entryId])
  useLayoutEffect(() => {
    setEntryContentScrollToTop(atTop)
  }, [atTop])

  useEffect(() => {
    if (entryTitle && feedTitle) {
      setEntryTitleMeta({ title: entryTitle, description: feedTitle })
    }
    return () => {
      setEntryTitleMeta(null)
    }
  }, [entryId, entryTitle, feedTitle])
  return null
}

const ReadabilityContent = ({ entryId }: { entryId: string }) => {
  const result = useEntryReadabilityContent(entryId)

  const [renderer, setRenderer] = useState<ReactNode | null>(null)
  useEffect(() => {
    if (!result) return
    const { content: processContent } = result

    if (processContent) {
      parseHtml(processContent, {
        renderInlineStyle: true,
      }).then((parsed) => {
        setRenderer(parsed.toContent())
      })
    } else {
      setRenderer(null)
    }
  }, [result, parseHtml])

  return (
    <div>
      {result ? (
        <p className="rounded-xl border p-3 text-sm opacity-80">
          <i className="i-mgc-information-cute-re mr-1 translate-y-[2px]" />
          This content is provided by Readability. If you find typographical
          anomalies, please go to the source site to view the original content.
        </p>
      ) : (
        <div className="center mt-12">
          <LoadingCircle size="large" />
        </div>
      )}
      {renderer}
    </div>
  )
}

const NoContent: FC<{
  id: string
  url: string
}> = ({ id, url }) => {
  const toggle = useEntryReadabilityToggle({
    id,
    url,
  })

  const status = useEntryInReadabilityStatus(id)
  if (status !== ReadabilityStatus.INITIAL) {
    return null
  }
  return (
    <div className="center">
      <div className="space-y-2 text-balance text-center text-sm text-zinc-400">
        <span>No content</span>
        {url && window.electron && (
          <div className="flex flex-col items-center justify-center gap-4">
            But you can try to get the source site's content and parse and
            render it by using the button below.
            <StyledButton onClick={toggle}>Readability</StyledButton>
          </div>
        )}
      </div>
    </div>
  )
}
