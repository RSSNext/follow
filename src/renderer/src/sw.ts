/// <reference lib="webworker" />
import type { ManifestEntry } from "workbox-build"

// Give TypeScript the correct global.
declare let self: ServiceWorkerGlobalScope
// @ts-expect-error
// eslint-disable-next-line unused-imports/no-unused-vars
const manifest = self.__WB_MANIFEST as Array<ManifestEntry>
