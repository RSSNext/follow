import * as Slider from "@radix-ui/react-slider"
import {
  getPlayerAtomValue,
  Player,
  usePlayerAtomSelector,
  usePlayerAtomValue,
} from "@renderer/atoms/player"
import { FeedIcon } from "@renderer/components/feed-icon"
import { microReboundPreset } from "@renderer/components/ui/constants/spring"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@renderer/components/ui/tooltip"
import { HotKeyScopeMap } from "@renderer/constants"
import { useNavigateEntry } from "@renderer/hooks/biz/useNavigateEntry"
import { FeedViewType } from "@renderer/lib/enum"
import { cn } from "@renderer/lib/utils"
import { useEntry } from "@renderer/store/entry"
import { useFeedById } from "@renderer/store/feed"
import dayjs from "dayjs"
import { AnimatePresence, m } from "framer-motion"
import { useEffect, useState } from "react"
import Marquee from "react-fast-marquee"
import { useHotkeys } from "react-hotkeys-hook"

const handleClickPlay = () => {
  Player.togglePlayAndPause()
}

export const CornerPlayer = () => {
  const show = usePlayerAtomSelector((v) => v.show)
  const entryId = usePlayerAtomSelector((v) => v.entryId)
  const entry = useEntry(entryId)
  const feed = useFeedById(entry?.feedId)

  return (
    <AnimatePresence>
      {show && entry && feed && (
        <m.div
          key="corner-player"
          className="group relative z-10 !mb-0 w-full pr-px"
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          transition={{ ...microReboundPreset, duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
        >
          <CornerPlayerImpl />
        </m.div>
      )}
    </AnimatePresence>
  )
}

const usePlayerTracker = () => {
  const playerOpenAt = useState(Date.now)[0]
  const show = usePlayerAtomSelector((v) => v.show)

  useEffect(() => {
    const handler = () => {
      const playerState = getPlayerAtomValue()
      window.posthog?.capture(
        "player_open_duration",
        {
          duration: Date.now() - playerOpenAt,
          status: playerState.status,
          trigger: "beforeunload",
        },
        { transport: "sendBeacon" },
      )
    }

    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [])

  useEffect(() => {
    if (!show) {
      const playerState = getPlayerAtomValue()
      window.posthog?.capture("player_open_duration", {
        duration: Date.now() - playerOpenAt,
        status: playerState.status,
        trigger: "manual",
      })
    }
  }, [show])
}
const CornerPlayerImpl = () => {
  const entryId = usePlayerAtomSelector((v) => v.entryId)
  const status = usePlayerAtomSelector((v) => v.status)
  const isMute = usePlayerAtomSelector((v) => v.isMute)

  const playerValue = { entryId, status, isMute }

  const entry = useEntry(playerValue.entryId)
  const feed = useFeedById(entry?.feedId)

  useHotkeys("space", handleClickPlay, {
    preventDefault: true,
    scopes: HotKeyScopeMap.Home,
  })

  const navigateToEntry = useNavigateEntry()
  usePlayerTracker()

  if (!entry || !feed) return null

  return (
    <>
      <div className="relative flex border-y bg-white transition-all duration-200 ease-in-out dark:bg-neutral-800">
        {/* play cover */}
        <div className="relative h-full shrink-0">
          <FeedIcon
            feed={feed}
            entry={entry.entries}
            size={58}
            className="m-0 size-[3.625rem] rounded-none"
          />
          <div className="center absolute inset-0 w-full opacity-0 transition-all duration-200 ease-in-out group-hover:opacity-100">
            <button
              type="button"
              className="center size-10 rounded-full bg-theme-background opacity-95 hover:bg-theme-accent hover:text-white hover:opacity-100"
              onClick={handleClickPlay}
            >
              <i
                className={cn("size-6", {
                  "i-mgc-pause-cute-fi": playerValue.status === "playing",
                  "i-mgc-loading-3-cute-re animate-spin":
                    playerValue.status === "loading",
                  "i-mgc-play-cute-fi": playerValue.status === "paused",
                })}
              />
            </button>
          </div>
        </div>

        <div className="relative truncate px-2 py-1 text-center text-sm">
          <Marquee
            play={playerValue.status === "playing"}
            className="mask-horizontal font-medium"
            speed={30}
          >
            {entry.entries.title}
          </Marquee>
          <div className="mt-0.5 overflow-hidden truncate text-xs text-muted-foreground group-hover:mx-8">
            {feed.title}
          </div>

          {/* progress control */}
          <PlayerProgress />
        </div>
      </div>

      {/* advanced controls */}
      <div className="absolute inset-x-0 top-0 z-[-1] flex justify-between border-t bg-theme-modal-background-opaque p-1 opacity-0 transition-all duration-200 ease-in-out group-hover:-translate-y-full group-hover:opacity-100">
        <div className="flex items-center">
          <ActionIcon
            className="i-mgc-close-cute-re"
            onClick={() => Player.close()}
            label="Close"
          />
          <ActionIcon
            className="i-mgc-external-link-cute-re"
            onClick={() =>
              navigateToEntry({
                entryId: entry.entries.id,
                feedId: feed.id,
                view: FeedViewType.Audios,
              })}
            label="Open Entry"
          />
        </div>
        <div className="flex items-center">
          <ActionIcon
            label="Download"
            onClick={() => {
              window.open(Player.get().src, "_blank")
            }}
          >
            <i className="i-mgc-download-2-cute-re" />
          </ActionIcon>
          <ActionIcon label={<PlaybackRateSelector />} labelDelayDuration={0}>
            <PlaybackRateButton />
          </ActionIcon>
          <ActionIcon
            className={cn(
              playerValue.isMute ?
                "i-mgc-volume-off-cute-re text-red-500" :
                "i-mgc-volume-cute-re",
            )}
            onClick={() => Player.toggleMute()}
            label={<VolumeSlider />}
            labelDelayDuration={0}
          />
          <ActionIcon
            className="i-mgc-back-2-cute-re"
            onClick={() => Player.back(10)}
            label="Back 10s"
          />
          <ActionIcon
            className="i-mgc-forward-2-cute-re"
            onClick={() => Player.forward(10)}
            label="Forward 10s"
          />
        </div>
      </div>
    </>
  )
}

const ONE_HOUR_IN_SECONDS = 60 * 60
const PlayerProgress = () => {
  const playerValue = usePlayerAtomValue()

  const { currentTime = 0, duration = 0 } = playerValue
  const [controlledCurrentTime, setControlledCurrentTime] =
    useState(currentTime)
  const [isDraggingProgress, setIsDraggingProgress] = useState(false)
  useEffect(() => {
    if (isDraggingProgress) return
    setControlledCurrentTime(currentTime)
  }, [currentTime, isDraggingProgress])

  const currentTimeIndicator = dayjs()
    .startOf("y")
    .second(controlledCurrentTime)
    .format(controlledCurrentTime > ONE_HOUR_IN_SECONDS ? "H:mm:ss" : "m:ss")
  const remainingTimeIndicator = dayjs()
    .startOf("y")
    .second(duration - controlledCurrentTime)
    .format(
      duration - controlledCurrentTime > ONE_HOUR_IN_SECONDS ?
        "H:mm:ss" :
        "m:ss",
    )

  return (
    <div className="relative mt-2">
      <div className="absolute bottom-1 flex w-full items-center justify-between text-theme-disabled opacity-0 duration-200 ease-in-out group-hover:opacity-100">
        <div className="text-xs">{currentTimeIndicator}</div>
        <div className="text-xs">
          -
          {remainingTimeIndicator}
        </div>
      </div>

      {/* slider */}
      <Slider.Root
        className="relative flex h-1 w-full items-center transition-all duration-200 ease-in-out"
        min={0}
        max={duration}
        step={1}
        value={[controlledCurrentTime]}
        onPointerDown={() => setIsDraggingProgress(true)}
        onPointerUp={() => setIsDraggingProgress(false)}
        onValueChange={(value) => setControlledCurrentTime(value[0])}
        onValueCommit={(value) => Player.seek(value[0])}
      >
        <Slider.Track className="relative h-1 w-full grow rounded bg-gray-200 duration-200 group-hover:bg-gray-300 dark:bg-neutral-700 group-hover:dark:bg-neutral-600">
          <Slider.Range className="absolute h-1 rounded bg-theme-accent-400 dark:bg-theme-accent-700" />
        </Slider.Track>

        {/* indicator */}
        <Slider.Thumb
          className="block h-2 w-[3px] rounded-[1px] bg-theme-accent"
          aria-label="Progress"
        />
      </Slider.Root>
    </div>
  )
}

const ActionIcon = ({
  className,
  onClick,
  label,
  labelDelayDuration = 700,
  children,
}: {
  className?: string
  onClick?: () => void
  label: React.ReactNode
  labelDelayDuration?: number
  children?: React.ReactNode
}) => (
  <Tooltip delayDuration={labelDelayDuration}>
    <TooltipTrigger>
      <button
        type="button"
        className="center size-6 rounded-md text-zinc-500 hover:bg-theme-button-hover"
        onClick={onClick}
      >
        {children || <i className={className} />}
      </button>
    </TooltipTrigger>
    <TooltipContent className="bg-theme-modal-background">
      {label}
    </TooltipContent>
  </Tooltip>
)

const VolumeSlider = () => {
  const volume = usePlayerAtomSelector((v) => v.volume)

  return (
    <Slider.Root
      className="relative flex h-16 w-1 flex-col items-center overflow-hidden rounded p-1"
      max={1}
      step={0.01}
      orientation="vertical"
      value={[volume ?? 0.8]}
      onValueChange={(value) => Player.setVolume(value[0])}
    >
      <Slider.Track className="relative w-1 grow rounded bg-zinc-500">
        <Slider.Range className="absolute w-full rounded bg-black dark:bg-white" />
      </Slider.Track>
      <Slider.Thumb
        className="block rounded bg-black dark:bg-white"
        aria-label="Volume"
      />
    </Slider.Root>
  )
}

const PlaybackRateSelector = () => {
  const playbackRate = usePlayerAtomSelector((v) => v.playbackRate)

  return (
    <div className="flex flex-col items-center gap-0.5">
      {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
        <button
          key={rate}
          type="button"
          className={cn(
            "center rounded-md p-1 font-mono hover:bg-theme-item-hover",
            playbackRate === rate &&
            "bg-theme-item-hover text-black dark:text-white",
            playbackRate !== rate && "text-zinc-500",
          )}
          onClick={() => Player.setPlaybackRate(rate)}
        >
          {rate.toFixed(2)}
          x
        </button>
      ))}
    </div>
  )
}

const PlaybackRateButton = () => {
  const playbackRate = usePlayerAtomSelector((v) => v.playbackRate)

  const char = `${playbackRate || 1}`
  return (
    <span
      className={cn(
        char.length > 1 ? "text-[9px]" : "text-xs",
        "block font-mono",
      )}
    >
      {char}
      x
    </span>
  )
}
