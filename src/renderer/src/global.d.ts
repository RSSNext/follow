import type { FC, PropsWithChildren } from "react"

declare global {
  export type Component<P = object> = FC<ComponentType & P>

  export type ComponentType<P = object> = {
    className?: string
  } & PropsWithChildren &
  P
  export type Nullable<T> = T | null | undefined

  // BIZ ID
  export type Id = string
  export type FeedId = Id
  export type EntryId = Id

  export const SENTRY_RELEASE: { id: string }
  export const APP_DEV_CWD: string
  export const GIT_COMMIT_SHA: string
  export const DEBUG: boolean
  export const ELECTRON: boolean
  export interface Window {
    SENTRY_RELEASE: typeof SENTRY_RELEASE
  }

  export function tw(strings: TemplateStringsArray, ...values: any[]): string
}

declare module "virtual:pwa-register/react" {
  import type { Dispatch, SetStateAction } from "react"
  import type { RegisterSWOptions } from "vite-plugin-pwa/types"

  export function useRegisterSW(options?: RegisterSWOptions): {
    needRefresh: [boolean, Dispatch<SetStateAction<boolean>>]
    offlineReady: [boolean, Dispatch<SetStateAction<boolean>>]
    updateServiceWorker: (reloadPage?: boolean) => Promise<void>
  }
}

export {}

export { type RegisterSWOptions } from "vite-plugin-pwa/types"
