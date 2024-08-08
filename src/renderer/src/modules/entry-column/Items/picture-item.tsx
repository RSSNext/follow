import { SwipeMedia } from "@renderer/components/ui/media/swipe-media"
import { ReactVirtuosoItemPlaceholder } from "@renderer/components/ui/placeholder"
import { Skeleton } from "@renderer/components/ui/skeleton"
import { useRouteParamsSelector } from "@renderer/hooks/biz/useRouteParams"
import { FeedViewType } from "@renderer/lib/enum"
import { fetchImageDimensions } from "@renderer/lib/img-proxy"
import { cn } from "@renderer/lib/utils"
import { useEntry } from "@renderer/store/entry/hooks"
import {
  useImageDimensions,
  useImagesHasDimensions,
} from "@renderer/store/image"
import type { PropsWithChildren } from "react"
import { memo, useEffect } from "react"

import { usePreviewMedia } from "../../../components/ui/media/hooks"
import { EntryItemWrapper } from "../layouts/EntryItemWrapper"
import { GridItem } from "../templates/grid-item-template"
import type { UniversalItemProps } from "../types"
import { useMasonryItemWidth } from "./ctx"

export function PictureItem({
  entryId,
  entryPreview,
  translation,
}: UniversalItemProps) {
  const entry = useEntry(entryId) || entryPreview

  const isActive = useRouteParamsSelector(
    ({ entryId }) => entryId === entry?.entries.id,
  )

  const previewMedia = usePreviewMedia()
  if (!entry) return <ReactVirtuosoItemPlaceholder />
  return (
    <GridItem
      entryId={entryId}
      entryPreview={entryPreview}
      translation={translation}
    >
      <div className="relative flex gap-2 overflow-x-auto">
        {entry.entries.media ? (
          <SwipeMedia
            media={entry.entries.media}
            className={cn(
              "aspect-square",
              "w-full shrink-0 rounded-md",
              isActive && "rounded-b-none",
            )}
            imgClassName="object-cover"
            uniqueKey={entryId}
            onPreview={(media, i) => {
              previewMedia(media, i)
            }}
          />
        ) : (
          <div className="center aspect-square w-full flex-col gap-1 bg-muted text-xs text-muted-foreground">
            <i className="i-mgc-sad-cute-re size-6" />
            No media available
          </div>
        )}
      </div>
    </GridItem>
  )
}

const proxySize = {
  width: 600,
  height: 0,
}
export const PictureWaterFallItem = memo(function PictureWaterFallItem({
  entryId,
  entryPreview,
  translation,
}: UniversalItemProps) {
  const entry = useEntry(entryId) || entryPreview

  const isActive = useRouteParamsSelector(
    ({ entryId }) => entryId === entry?.entries.id,
  )

  const previewMedia = usePreviewMedia()
  useEffect(() => {
    const media = entry?.entries.media
    if (!media) return
    for (const med of media) {
      fetchImageDimensions(med.url)
    }
  }, [entry?.entries.media])

  const hasAllDim = useImagesHasDimensions(
    entry?.entries.media?.map((m) => m.url) || [],
  )
  if (!hasAllDim) return null
  if (!entry) return null

  return (
    <EntryItemWrapper
      view={FeedViewType.Pictures}
      entry={entry}
      itemClassName="group hover:bg-theme-item-hover"
    >
      <GridItem
        wrapperClassName="p-0"
        entryId={entryId}
        entryPreview={entryPreview}
        translation={translation}
      >
        {entry.entries.media ? (
          <MasonryItemFixedDimensionWrapper url={entry.entries.media[0].url}>
            <SwipeMedia
              forceSwiper
              media={entry.entries.media}
              className={cn(
                "w-full shrink-0 rounded-md",
                isActive && "rounded-b-none",
              )}
              proxySize={proxySize}
              imgClassName="object-cover"
              uniqueKey={entryId}
              onPreview={(media, i) => {
                previewMedia(media, i)
              }}
            />
          </MasonryItemFixedDimensionWrapper>
        ) : null}
      </GridItem>
    </EntryItemWrapper>
  )
})

const MasonryItemFixedDimensionWrapper = (
  props: PropsWithChildren<{
    url: string
  }>,
) => {
  const { url, children } = props
  const dim = useImageDimensions(url)
  const itemWidth = useMasonryItemWidth()

  const itemHeight = dim ? itemWidth / dim.ratio : 0

  if (!dim) return null
  return (
    <div
      className="relative flex gap-2 overflow-x-auto"
      style={{ width: itemWidth, height: itemHeight }}
    >
      {children}
    </div>
  )
}

export const PictureItemSkeleton = (
  <div className="relative max-w-md rounded-md bg-theme-background text-zinc-700 transition-colors dark:text-neutral-400">
    <div className="relative">
      <div className="p-1.5">
        <div className="relative flex gap-2 overflow-x-auto">
          <div className="relative flex aspect-square w-full shrink-0 items-center overflow-hidden rounded-md">
            <Skeleton className="size-full overflow-hidden" />
          </div>
        </div>
        <div className="relative flex-1 px-2 pb-3 pt-1 text-sm">
          <div className="relative mb-1 mt-1.5 truncate font-medium leading-none">
            <Skeleton className="h-4 w-3/4 " />
          </div>
          <div className="mt-1 flex items-center gap-1 truncate text-[13px]">
            <Skeleton className="mr-0.5 size-4" />
            <Skeleton className="h-3 w-1/2 " />
            <span className="text-zinc-500">·</span>
            <Skeleton className="h-3 w-12 " />
          </div>
        </div>
      </div>
    </div>
  </div>
)
