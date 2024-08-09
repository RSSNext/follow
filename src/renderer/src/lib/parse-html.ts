import { Checkbox } from "@renderer/components/ui/checkbox"
import { ShikiHighLighter } from "@renderer/components/ui/code-highlighter"
import {
  MarkdownBlockImage,
  MarkdownLink,
  MarkdownP,
} from "@renderer/components/ui/markdown/renderers"
import { Media } from "@renderer/components/ui/media"
import type { Components } from "hast-util-to-jsx-runtime"
import { toJsxRuntime } from "hast-util-to-jsx-runtime"
import { toText } from "hast-util-to-text"
import { createElement } from "react"
import { Fragment, jsx, jsxs } from "react/jsx-runtime"
import { renderToString } from "react-dom/server"
import rehypeInferDescriptionMeta from "rehype-infer-description-meta"
import rehypeParse from "rehype-parse"
import rehypeSanitize, { defaultSchema } from "rehype-sanitize"
import rehypeStringify from "rehype-stringify"
import { unified } from "unified"
import { VFile } from "vfile"

export const parseHtml = async (
  content: string,
  options?: {
    renderInlineStyle: boolean
  },
) => {
  const file = new VFile(content)
  const { renderInlineStyle = false } = options || {}

  const pipeline = unified()
    .use(rehypeParse, { fragment: true })
    .use(rehypeSanitize, {
      ...defaultSchema,
      tagNames: renderInlineStyle ?
        defaultSchema.tagNames :
          [...defaultSchema.tagNames!, "video"],
      attributes: {
        ...defaultSchema.attributes,

        "*": renderInlineStyle ?
            [...defaultSchema.attributes!["*"], "style"] :
          defaultSchema.attributes!["*"],

        "video": ["src", "poster"],
      },
    })
    .use(rehypeInferDescriptionMeta)
    .use(rehypeStringify)

  const tree = pipeline.parse(content)

  const hastTree = pipeline.runSync(tree, file)

  return {
    toContent: () => toJsxRuntime(hastTree, {
      Fragment,
      ignoreInvalidStyle: true,
      jsx: (type, props, key) => jsx(type as any, props, key),
      jsxs: (type, props, key) => jsxs(type as any, props, key),
      passNode: true,
      components: {
        a: ({ node, ...props }) =>
          createElement(MarkdownLink, { ...props } as any),
        img: Img,
        video: ({ node, ...props }) =>
          createElement(Media, { ...props, popper: true, type: "video" }),
        p: ({ node, ...props }) => {
          if (node?.children && node.children.length !== 1) {
            for (const item of node.children) {
              item.type === "element" &&
              item.tagName === "img" &&
              ((item.properties as any).inline = true)
            }
          }
          return createElement(MarkdownP, props, props.children)
        },
        hr: ({ node, ...props }) =>
          createElement("hr", {
            ...props,
            className: tw`scale-x-50`,
          }),
        input: ({ node, ...props }) => {
          if (props.type === "checkbox") {
            return createElement(Checkbox, {
              ...props,
              disabled: false,
              className: tw`pointer-events-none mr-2`,
            })
          }
          return createElement("input", props)
        },
        pre: ({ node, ...props }) => {
          if (!props.children) return null

          let language = "plaintext"
          let codeString = null as string | null
          if (props.className?.includes("language-")) {
            language = props.className.replace("language-", "")
          }

          if (typeof props.children !== "object") {
            language = "plaintext"
            codeString = props.children.toString()
          } else {
            if (
              "type" in props.children &&
              props.children.type === "code" &&
              props.children.props.className?.includes("language-")
            ) {
              language = props.children.props.className.replace(
                "language-",
                "",
              )
            }
            const code =
              "props" in props.children && props.children.props.children
            if (!code) return null
            const $text = document.createElement("div")
            $text.innerHTML = renderToString(code)
            codeString = $text.textContent
          }

          if (!codeString) return null

          return createElement(ShikiHighLighter, {
            code: codeString.trimEnd(),
            language: language.toLowerCase(),
          })
        },
      },
    }),
    toText: () => toText(hastTree),
  }
}

const Img: Components["img"] = ({ node, ...props }) => {
  const nextProps = {
    ...props,
    proxy: { height: 0, width: 700 },
  }
  if (node?.properties.inline) {
    return createElement(Media, {
      type: "photo",
      ...nextProps,

      mediaContainerClassName: tw`max-w-full inline size-auto`,
      popper: true,
      className: tw`inline`,
    })
  }

  return createElement(MarkdownBlockImage, nextProps)
}
