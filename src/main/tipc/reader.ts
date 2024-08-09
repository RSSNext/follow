import fs from "node:fs"
import path from "node:path"

import { app } from "electron"
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts"

import { readability } from "../lib/readability"
import { t } from "./_instance"

const tts = new MsEdgeTTS()

export const readerRoute = {
  readability: t.procedure
    .input<{ url: string }>()
    .action(async ({ input }) => {
      const { url } = input

      if (!url) {
        return null
      }
      const result = await readability(url)

      return result
    }),

  tts: t.procedure
    .input<{
      id: string
      text: string
    }>()
    .action(async ({ input }) => {
      const { id, text } = input

      if (!text) {
        return null
      }

      const filePath = path.join(app.getPath("userData"), `${id}.webm`)
      if (fs.existsSync(filePath)) {
        return filePath
      } else {
        await tts.toFile(filePath, text)
        return filePath
      }
    }),

  getVoices: t.procedure
    .action(async () => {
      const voices = await tts.getVoices()
      return voices
    }),

  setVoice: t.procedure
    .input<string>()
    .action(async ({ input }) => {
      await tts.setMetadata(input, OUTPUT_FORMAT.WEBM_24KHZ_16BIT_MONO_OPUS)
    }),
}
