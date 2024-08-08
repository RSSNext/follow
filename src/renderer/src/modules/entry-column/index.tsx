import { useUISettingKey } from "@renderer/atoms/settings/ui"
import { m } from "@renderer/components/common/Motion"
import { FeedFoundCanBeFollowError } from "@renderer/components/errors/FeedFoundCanBeFollowErrorFallback"
import { FeedNotFound } from "@renderer/components/errors/FeedNotFound"
import { AutoResizeHeight } from "@renderer/components/ui/auto-resize-height"
import { LoadingCircle } from "@renderer/components/ui/loading"
import { ScrollArea } from "@renderer/components/ui/scroll-area"
import {
  FEED_COLLECTION_LIST,
  ROUTE_FEED_PENDING,
  views,
} from "@renderer/constants"
import { useNavigateEntry } from "@renderer/hooks/biz/useNavigateEntry"
import {
  useRouteParamsSelector,
  useRouteParms,
} from "@renderer/hooks/biz/useRouteParams"
import { FeedViewType } from "@renderer/lib/enum"
import { cn, isBizId } from "@renderer/lib/utils"
import { useFeed } from "@renderer/queries/feed"
import { entryActions, useEntry } from "@renderer/store/entry"
import { useCallback, useEffect, useRef } from "react"
import type {
  ScrollSeekConfiguration,
  VirtuosoGridProps,
  VirtuosoHandle,
  VirtuosoProps,
} from "react-virtuoso"
import { VirtuosoGrid } from "react-virtuoso"

import { useEntriesByView, useEntryMarkReadHandler } from "./hooks"
import {
  EntryItem,
  EntryItemSkeleton,
} from "./item"
import { PictureMasonry } from "./Items/picture-masonry"
import { EntryListHeader } from "./layouts/EntryListHeader"
import { EntryEmptyList, EntryList, EntryListContent } from "./lists"
import { girdClassNames } from "./styles"

const scrollSeekConfiguration: ScrollSeekConfiguration = {
  enter: (velocity) => Math.abs(velocity) > 1000,
  exit: (velocity) => Math.abs(velocity) < 1000,
}
export function EntryColumn() {
  const virtuosoRef = useRef<VirtuosoHandle>(null)
  const entries = useEntriesByView({
    onReset: useCallback(() => {
      virtuosoRef.current?.scrollTo({
        top: 0,
      })
    }, []),
  })
  const { entriesIds, isFetchingNextPage, groupedCounts } = entries

  const {
    entryId: activeEntryId,
    view,
    feedId: routeFeedId,
    isPendingEntry,
    isCollection,
  } = useRouteParms()
  const activeEntry = useEntry(activeEntryId)

  useEffect(() => {
    if (!activeEntryId) return

    if (isCollection || isPendingEntry) return

    const feedId = activeEntry?.feedId
    if (!feedId) return

    entryActions.markRead(feedId, activeEntryId, true)
  }, [activeEntry?.feedId, activeEntryId, isCollection, isPendingEntry])

  const isInteracted = useRef(false)

  const handleMarkReadInRange = useEntryMarkReadHandler(entriesIds)

  const scrollRef = useRef<HTMLDivElement>(null)
  const virtuosoOptions = {
    components: {
      List: EntryListContent,
      Footer: useCallback(() => {
        if (!isFetchingNextPage) return null
        return <EntryItemSkeleton view={view} />
      }, [isFetchingNextPage, view]),
      ScrollSeekPlaceholder: useCallback(
        () => <EntryItemSkeleton view={view} single />,
        [view],
      ),
    },
    scrollSeekConfiguration,
    rangeChanged: (...args: any[]) => {
      handleMarkReadInRange &&
      // @ts-expect-error
      handleMarkReadInRange(...args, isInteracted.current)
    },
    customScrollParent: scrollRef.current!,

    totalCount: entries.totalCount,
    endReached: useCallback(async () => {
      if (!entries.isFetchingNextPage && entries.hasNextPage) {
        await entries.fetchNextPage()
      }
    }, [entries]),
    data: entriesIds,
    onScroll: () => {
      if (!isInteracted.current) {
        isInteracted.current = true
      }
    },
    itemContent: useCallback(
      (_, entryId) => {
        if (!entryId) return null

        return <EntryItem key={entryId} entryId={entryId} view={view} />
      },
      [view],
    ),
  } satisfies VirtuosoProps<string, unknown>

  const navigate = useNavigateEntry()
  const isRefreshing = entries.isFetching && !entries.isFetchingNextPage

  return (
    <div
      className="relative flex h-full flex-1 flex-col @container"
      onClick={() =>
        navigate({
          entryId: null,
        })}
      data-total-count={virtuosoOptions.totalCount}
    >
      {virtuosoOptions.totalCount === 0 &&
        !entries.isLoading &&
        !entries.error && <AddFeedHelper />}

      <EntryListHeader
        refetch={entries.refetch}
        isRefreshing={isRefreshing}
        totalCount={virtuosoOptions.totalCount}
        hasUpdate={entries.hasUpdate}
      />
      <AutoResizeHeight spring>
        {isRefreshing && (
          <div className="center box-content h-7 gap-2 py-3 text-xs">
            <LoadingCircle size="small" />
            Refreshing new entries...
          </div>
        )}
      </AutoResizeHeight>
      <m.div
        key={`${routeFeedId}-${view}`}
        className="relative h-0 grow"
        initial={{ opacity: 0.01, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0.01, y: -100 }}
      >
        <ScrollArea.ScrollArea
          scrollbarClassName={cn(
            "mt-3",
            !views[view].wideMode ? "w-[5px] p-0" : "",
          )}
          mask={false}
          ref={scrollRef}
          rootClassName="h-full"
          viewportClassName="[&>div]:grow flex"
        >
          {virtuosoOptions.totalCount === 0 ? (
            entries.isLoading ?
              null :
                (
                  <EntryEmptyList />
                )
          ) : view && views[view].gridMode ?
              (
                <ListGird
                  virtuosoOptions={virtuosoOptions}
                  virtuosoRef={virtuosoRef}
                />
              ) :
              (
                <EntryList
                  {...virtuosoOptions}
                  virtuosoRef={virtuosoRef}
                  refetch={entries.refetch}
                  groupCounts={groupedCounts}
                />
              )}
        </ScrollArea.ScrollArea>
      </m.div>
    </div>
  )
}

const ListGird = ({
  virtuosoOptions,
  virtuosoRef,
}: {
  virtuosoOptions: Omit<
    VirtuosoGridProps<string, unknown>,
    "data" | "endReached"
  > & {
    data: string[]
    endReached: () => Promise<any>
  }
  virtuosoRef: React.RefObject<VirtuosoHandle>
}) => {
  const masonry = useUISettingKey("pictureViewMasonry")
  const view = useRouteParamsSelector((s) => s.view)
  const feedId = useRouteParamsSelector((s) => s.feedId)
  if (masonry && view === FeedViewType.Pictures) {
    return (
      <PictureMasonry
        key={feedId}
        hasNextPage={virtuosoOptions.totalCount! > virtuosoOptions.data.length}
        endReached={virtuosoOptions.endReached}
        data={virtuosoOptions.data}
      />
    )
  }
  return (
    <VirtuosoGrid
      listClassName={girdClassNames}
      {...virtuosoOptions}
      ref={virtuosoRef}
    />
  )
}

const AddFeedHelper = () => {
  const feedId = useRouteParamsSelector((s) => s.feedId)
  const feedQuery = useFeed({ id: feedId })

  if (!feedId) {
    return
  }
  if (feedId === FEED_COLLECTION_LIST || feedId === ROUTE_FEED_PENDING) {
    return null
  }
  if (!isBizId(feedId)) {
    return null
  }

  if (feedQuery.error && feedQuery.error.statusCode === 404) {
    throw new FeedNotFound()
  }

  if (!feedQuery.data) {
    return null
  }

  throw new FeedFoundCanBeFollowError(feedQuery.data.feed)
}
