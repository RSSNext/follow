import { useFeedColumnShow } from "@renderer/atoms/app"
import { setMainContainerElement } from "@renderer/atoms/dom"
import { getUISettings, setUISetting } from "@renderer/atoms/settings/ui"
import { useLoginModalShow, useMe } from "@renderer/atoms/user"
import { PanelSplitter } from "@renderer/components/ui/divider"
import { DeclarativeModal } from "@renderer/components/ui/modal/stacked/declarative-modal"
import { NoopChildren } from "@renderer/components/ui/modal/stacked/utils"
import { RootPortal } from "@renderer/components/ui/portal"
import { preventDefault } from "@renderer/lib/dom"
import { cn } from "@renderer/lib/utils"
import { EnvironmentIndicator } from "@renderer/modules/app/EnvironmentIndicator"
import { NetworkStatusIndicator } from "@renderer/modules/app/NetworkStatusIndicator"
import { LoginModalContent } from "@renderer/modules/auth/LoginModalContent"
import { FeedColumn } from "@renderer/modules/feed-column"
import { AutoUpdater } from "@renderer/modules/feed-column/auto-updater"
import { CornerPlayer } from "@renderer/modules/feed-column/corner-player"
import { SearchCmdK } from "@renderer/modules/search/cmdk"
import type { PropsWithChildren } from "react"
import { lazy, useRef } from "react"
import { useResizable } from "react-resizable-layout"
import { Outlet } from "react-router-dom"

const ReloadPrompt = ELECTRON ?
    () => null :
  lazy(() =>
    import("@renderer/components/common/ReloadPrompt").then((module) => ({
      default: module.ReloadPrompt,
    })),
  )

export function Component() {
  const isAuthFail = useLoginModalShow()
  const user = useMe()

  const containerRef = useRef<HTMLDivElement>(null)

  return (
    <div
      className="flex h-full"
      ref={containerRef}
      onContextMenu={preventDefault}
    >
      <FeedResponsiveResizerContainer containerRef={containerRef}>
        <FeedColumn>

          <CornerPlayer />

          {APP_VERSION?.[0] === "0" && (
            <div className="pointer-events-none absolute bottom-3 w-full text-center text-xs opacity-20">
              Early Access
              {" "}
              {GIT_COMMIT_SHA ?
                `(${GIT_COMMIT_SHA.slice(0, 7).toUpperCase()})` :
                ""}
            </div>
          )}

          {ELECTRON && <AutoUpdater />}

          <NetworkStatusIndicator />
          {!import.meta.env.PROD && <EnvironmentIndicator />}
        </FeedColumn>
      </FeedResponsiveResizerContainer>
      <main
        ref={setMainContainerElement}
        className="flex min-w-0 flex-1 bg-theme-background !outline-none"
        // NOTE: tabIndex for main element can get by `document.activeElement`
        tabIndex={-1}
      >
        <Outlet />
      </main>

      <ReloadPrompt />
      <SearchCmdK />
      {isAuthFail && !user && (
        <RootPortal>
          <DeclarativeModal
            id="login"
            CustomModalComponent={NoopChildren}
            open
            title="Login"
            canClose={false}
            clickOutsideToDismiss={false}
          >
            <LoginModalContent
              canClose={false}
              runtime={window.electron ? "app" : "browser"}
            />
          </DeclarativeModal>
        </RootPortal>
      )}
    </div>
  )
}

const FeedResponsiveResizerContainer = ({
  containerRef,
  children,
}: {
  containerRef: React.RefObject<HTMLDivElement>
} & PropsWithChildren) => {
  const { isDragging, position, separatorProps } = useResizable({
    axis: "x",
    min: 256,
    max: 300,
    initial: getUISettings().feedColWidth,
    containerRef,

    onResizeEnd({ position }) {
      setUISetting("feedColWidth", position)
    },
  })

  const feedColumnShow = useFeedColumnShow()

  return (
    <>
      <div
        className={cn(
          "shrink-0",
          "absolute inset-y-0 z-10",
          !feedColumnShow ? "-translate-x-full" : "",
        )}
        style={{
          "width": `${position}px`,
          // @ts-expect-error
          "--fo-feed-col-w": `${position}px`,
        }}
      >
        {children}
      </div>

      <div
        className={!isDragging ? "duration-200" : ""}
        style={{
          width: feedColumnShow ? `${position}px` : 0,
        }}
      />

      {feedColumnShow && <PanelSplitter {...separatorProps} />}
    </>
  )
}
