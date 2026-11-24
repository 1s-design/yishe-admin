<template>
  <div ref="contentRef" v-dompurify-html="renderedMarkdown" class="markdown-view"></div>
</template>

<script setup lang="ts">
import { useClipboard } from "@vueuse/core";
import { Marked } from "marked";
import hljs from "highlight.js/lib/core";
import jsonLang from "highlight.js/lib/languages/json";
import jsLang from "highlight.js/lib/languages/javascript";
import tsLang from "highlight.js/lib/languages/typescript";
import xmlLang from "highlight.js/lib/languages/xml";
import cssLang from "highlight.js/lib/languages/css";
import scssLang from "highlight.js/lib/languages/scss";
import bashLang from "highlight.js/lib/languages/bash";
import sqlLang from "highlight.js/lib/languages/sql";
import pythonLang from "highlight.js/lib/languages/python";
import yamlLang from "highlight.js/lib/languages/yaml";
import markdownLang from "highlight.js/lib/languages/markdown";
import plaintextLang from "highlight.js/lib/languages/plaintext";
import "highlight.js/styles/vs2015.min.css";

hljs.registerLanguage("json", jsonLang);
hljs.registerLanguage("javascript", jsLang);
hljs.registerLanguage("js", jsLang);
hljs.registerLanguage("typescript", tsLang);
hljs.registerLanguage("ts", tsLang);
hljs.registerLanguage("xml", xmlLang);
hljs.registerLanguage("html", xmlLang);
hljs.registerLanguage("vue", xmlLang);
hljs.registerLanguage("css", cssLang);
hljs.registerLanguage("scss", scssLang);
hljs.registerLanguage("bash", bashLang);
hljs.registerLanguage("sh", bashLang);
hljs.registerLanguage("shell", bashLang);
hljs.registerLanguage("sql", sqlLang);
hljs.registerLanguage("python", pythonLang);
hljs.registerLanguage("py", pythonLang);
hljs.registerLanguage("yaml", yamlLang);
hljs.registerLanguage("yml", yamlLang);
hljs.registerLanguage("markdown", markdownLang);
hljs.registerLanguage("md", markdownLang);
hljs.registerLanguage("plaintext", plaintextLang);
hljs.registerLanguage("text", plaintextLang);

const props = defineProps({
  content: {
    type: String,
    required: true,
  },
  /** 流式输出中开启 60ms 节流，避免每个 SSE delta 分片都全量重算 marked + hljs + DOMPurify */
  streaming: {
    type: Boolean,
    default: false,
  },
});

const message = useMessage();
const { copy } = useClipboard();
const contentRef = ref<HTMLElement | null>(null);

const escapeAsHtml = (content: string) => {
  return String(content || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br />");
};

const renderMarkdownText = (raw: string) => {
  try {
    return getSharedMarkdown().parse(String(raw || "")) as string;
  } catch (error) {
    console.error("[MarkdownView] render failed:", error);
    return escapeAsHtml(String(raw || ""));
  }
};

// 流式节流缓冲：非流式时直接同步更新，流式时每 60ms 批量刷新一次
const throttledContent = ref(String(props.content || ""));
let flushTimer: ReturnType<typeof setTimeout> | null = null;

watch(
  () => [props.content, props.streaming] as const,
  ([nextContent, isStreaming]) => {
    const text = String(nextContent || "");
    if (!isStreaming) {
      if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
      throttledContent.value = text;
      return;
    }
    if (!flushTimer) {
      flushTimer = setTimeout(() => {
        flushTimer = null;
        throttledContent.value = String(props.content || "");
      }, 60);
    }
  },
  { immediate: true },
);

const renderedMarkdown = computed(() => renderMarkdownText(throttledContent.value));

const handleContentClick = async (event: Event) => {
  const target = event.target as HTMLElement | null;
  const button = target?.closest(".markdown-view__copy-button") as HTMLElement | null;
  if (!button) {
    return;
  }

  const encodedText = String(button.dataset.copy || "");
  if (!encodedText) {
    return;
  }

  try {
    await copy(decodeURIComponent(encodedText));
    message.success("复制成功!");
  } catch (error) {
    console.error("[MarkdownView] copy failed:", error);
    message.error("复制失败");
  }
};

onMounted(() => {
  contentRef.value?.addEventListener("click", handleContentClick);
});

onBeforeUnmount(() => {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  contentRef.value?.removeEventListener("click", handleContentClick);
});
</script>

<script lang="ts">
// 模块级单例 Marked，避免长会话里每个消息气泡重复构造解析器
let _sharedMarkdown: Marked | null = null;
function getSharedMarkdown(): Marked {
  if (_sharedMarkdown) return _sharedMarkdown;
  const md = new Marked({ gfm: true, breaks: true });
  md.use({
    renderer: {
      image(token) {
        const rawHref = String(token.href || "").trim();
        const rawText = String(token.text || "").trim();
        const rawTitle = String(token.title || "").trim();
        if (!rawHref) return rawText || "";
        const alt = rawText || rawTitle || "image";
        const caption = rawTitle || rawText;
        return [
          '<figure class="markdown-view__image-block">',
          `<img class="markdown-view__image" src="${rawHref}" alt="${alt}" loading="lazy" />`,
          caption ? `<figcaption class="markdown-view__image-caption">${caption}</figcaption>` : "",
          "</figure>",
        ].join("");
      },
      link(token) {
        const rawHref = String(token.href || "").trim();
        const rawTitle = String(token.title || "").trim();
        const text = token.text || rawHref;
        if (!rawHref) return text;
        const titleAttr = rawTitle ? ` title="${rawTitle}"` : "";
        return `<a href="${rawHref}" target="_blank" rel="noopener noreferrer nofollow"${titleAttr}>${text}</a>`;
      },
      code(token) {
        const rawCode = String(token.text || "");
        const language = String(token.lang || "").trim().toLowerCase();
        const highlighted =
          language && hljs.getLanguage(language)
            ? hljs.highlight(rawCode, { language }).value
            : hljs.highlightAuto(rawCode).value;
        const encoded = encodeURIComponent(rawCode);
        const languageClass = language ? ` language-${language}` : "";
        return [
          '<pre class="markdown-view__code-block">',
          `<button class="markdown-view__copy-button" data-copy="${encoded}" type="button">复制</button>`,
          `<code class="hljs${languageClass}">${highlighted}</code>`,
          "</pre>",
        ].join("");
      },
    },
  });
  _sharedMarkdown = md;
  return md;
}
</script>

<style lang="scss">
.markdown-view {
  --markdown-font-size: 13px;
  --markdown-line-height: 1.62;
  --markdown-letter-spacing: -0.006em;
  --markdown-paragraph-gap: 6px;
  --markdown-block-gap: 10px;
  --markdown-heading-gap-top: 18px;
  --markdown-heading-gap-bottom: 8px;
  --markdown-list-indent: 18px;
  --markdown-inline-code-font-size: 0.92em;
  --markdown-code-font-size: 12px;
  --markdown-code-line-height: 1.65;
  --markdown-image-max-width: min(240px, 100%);
  --markdown-image-max-height: 200px;
  --markdown-code-border-color: color-mix(
    in srgb,
    var(--ai-border-color, var(--el-border-color-light)) 84%,
    transparent 16%
  );
  --markdown-code-bg: color-mix(
    in srgb,
    var(--ai-panel-bg, var(--el-bg-color-overlay)) 76%,
    var(--ai-panel-soft-bg, var(--el-fill-color-light)) 24%
  );
  --markdown-inline-code-bg: color-mix(
    in srgb,
    var(--ai-primary, var(--el-color-primary)) 8%,
    var(--ai-panel-bg, #fff) 92%
  );
  --markdown-inline-code-color: color-mix(
    in srgb,
    var(--ai-text, var(--el-text-color-primary)) 88%,
    var(--ai-primary, var(--el-color-primary)) 12%
  );
  --markdown-quote-border: color-mix(
    in srgb,
    var(--ai-primary, var(--el-color-primary)) 24%,
    transparent 76%
  );
  --markdown-divider-color: color-mix(
    in srgb,
    var(--ai-border-color, var(--el-border-color-light)) 78%,
    transparent 22%
  );

  max-width: 100%;
  font-family: "PingFang SC", "SF Pro Display", "Helvetica Neue", sans-serif;
  font-size: var(--markdown-font-size);
  font-weight: 400;
  line-height: var(--markdown-line-height);
  letter-spacing: var(--markdown-letter-spacing);
  color: var(--markdown-text-color, var(--ai-text, var(--el-text-color-primary)));
  text-align: left;
  word-break: break-word;

  // ── Dark Mode Overrides ──────────────────────────────
  :global(html.dark) & {
    color: var(--el-text-color-primary, #e5eaf3) !important;

    strong, b, h1, h2, h3, h4, h5, h6 { color: #fff !important; }
    ul, ol, li, p { color: var(--el-text-color-primary, #e5eaf3) !important; }

    code:not(.hljs) {
      color: var(--el-color-primary-light-3, #58a6ff) !important;
      background: color-mix(in srgb, var(--el-color-primary) 12%, transparent) !important;
      border-color: color-mix(in srgb, var(--el-border-color) 60%, transparent) !important;
    }

    blockquote {
      color: var(--el-text-color-secondary, #a8abb2) !important;
      background: rgb(255 255 255 / 3%);
      border-left-color: var(--el-color-primary) !important;
    }

    th {
      color: #fff !important;
      background: rgb(255 255 255 / 8%) !important;
    }

    td, th { border-color: rgb(255 255 255 / 12%) !important; }
  }

  > :first-child { margin-top: 0 !important; }
  > :last-child { margin-bottom: 0 !important; }

  :deep(pre) { margin: 0; }

  :deep(code.hljs) {
    display: block;
    width: auto;
    max-width: 100%;
    padding: 30px 12px 12px;
    margin: 0;
    overflow-x: auto;
    font-size: var(--markdown-code-font-size);
    line-height: var(--markdown-code-line-height);
    background: transparent;
    border-radius: inherit;
  }

  a {
    color: var(--ai-primary, var(--el-color-primary));
    text-decoration: none;
    border-bottom: 1px solid color-mix(in srgb, var(--ai-primary, var(--el-color-primary)) 18%, transparent 82%);
    transition: color 0.18s ease, border-color 0.18s ease;
  }

  a:hover {
    color: color-mix(in srgb, var(--ai-primary, var(--el-color-primary)) 86%, #000 14%);
    border-bottom-color: color-mix(in srgb, var(--ai-primary, var(--el-color-primary)) 32%, transparent 68%);
  }

  :deep(.markdown-view__image-block) {
    display: block;
    max-width: var(--markdown-image-max-width);
    margin: var(--markdown-block-gap) 0;
  }

  :deep(.markdown-view__image) {
    display: block;
    width: auto !important;
    height: auto !important;
    max-width: var(--markdown-image-max-width) !important;
    max-height: var(--markdown-image-max-height) !important;
    overflow: hidden;
    background: var(--ai-surface-soft, var(--el-fill-color-light));
    border: 1px solid var(--ai-line, var(--el-border-color-light));
    border-radius: 10px;
    object-fit: contain;
  }

  :deep(img) {
    height: auto !important;
    max-width: var(--markdown-image-max-width) !important;
    max-height: var(--markdown-image-max-height) !important;
  }

  :deep(.markdown-view__image-caption) {
    margin-top: 6px;
    font-size: 11px;
    line-height: 1.5;
    color: var(--ai-text-secondary, var(--el-text-color-secondary));
  }

  strong, b {
    color: var(--markdown-heading-color, var(--ai-text, var(--el-text-color-primary, #1f2329)));
  }

  p { margin: 0 0 var(--markdown-paragraph-gap); }
  p + p { margin-top: 2px; }

  h1, h2, h3, h4, h5, h6 {
    margin: var(--markdown-heading-gap-top) 0 var(--markdown-heading-gap-bottom);
    font-weight: 600;
    line-height: 1.35;
    letter-spacing: -0.02em;
    color: var(--markdown-heading-color, var(--ai-text, var(--el-text-color-primary, #1f2329)));
  }

  h1 { font-size: 20px; }
  h2 { font-size: 18px; }
  h3 { font-size: 16px; }
  h4 { font-size: 15px; }
  h5, h6 { font-size: 14px; }

  ul, ol {
    padding-left: calc(var(--markdown-list-indent) + 4px);
    margin: 0 0 var(--markdown-paragraph-gap);
    font-size: inherit;
    line-height: inherit;
    color: var(--markdown-text-color, var(--ai-text, var(--el-text-color-primary, #1f2329)));
  }

  li {
    padding-left: 2px;
    margin: 0;
  }

  li + li { margin-top: 4px; }
  li > p { margin: 0; }
  ol > li { list-style-type: decimal; }
  ul > li { list-style-type: disc; }

  ul ul, ul ol, ol ul, ol ol {
    margin-top: 4px;
    margin-bottom: 0;
  }

  blockquote {
    padding-left: 12px;
    margin: var(--markdown-block-gap) 0;
    color: var(--ai-text-secondary, var(--el-text-color-secondary));
    border-left: 3px solid var(--markdown-quote-border);
  }

  blockquote > :last-child { margin-bottom: 0; }

  hr {
    margin: 14px 0;
    border: 0;
    border-top: 1px solid var(--markdown-divider-color);
  }

  table {
    width: 100%;
    margin: var(--markdown-block-gap) 0;
    font-size: 12px;
    line-height: 1.6;
    border-collapse: collapse;
    table-layout: fixed;
  }

  @media (max-width: 768px) {
    --markdown-font-size: 14.5px;
    --markdown-line-height: 1.68;

    table {
      display: block;
      width: 100%;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      table-layout: auto;
      white-space: nowrap;
    }

    th, td {
      padding: 8px 10px;
    }

    :deep(.markdown-view__copy-button) {
      min-height: 28px;
      padding: 4px 10px;
      font-size: 12px;
    }
  }

  th, td {
    padding: 7px 8px;
    text-align: left;
    vertical-align: top;
    border: 1px solid var(--markdown-divider-color);
  }

  th {
    font-weight: 600;
    background: color-mix(in srgb, var(--ai-panel-soft-bg, var(--el-fill-color-light)) 78%, transparent 22%);
  }

  code:not(.hljs) {
    display: inline;
    padding: 2px 6px;
    margin: 0 2px;
    font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
    font-size: 0.88em;
    font-weight: 500;
    line-height: 1.45;
    color: var(--el-color-primary, #0969da);
    background: rgb(175 184 193 / 18%);
    border: 1px solid rgb(175 184 193 / 28%);
    border-radius: 4px;
  }

  // ── Code Block (Light Mode) ──────────────────────────
  :deep(.markdown-view__code-block) {
    position: relative;
    margin: var(--markdown-block-gap) 0;
    overflow: hidden;
    background: var(--el-fill-color-blank, #f6f8fa);
    border: 1px solid var(--el-border-color-light, #d0d7de);
    border-radius: 10px;
    box-shadow: 0 1px 3px rgb(0 0 0 / 2%);

    code.hljs {
      color: #24292f;
      background: transparent;

      .hljs-keyword, .hljs-selector-tag, .hljs-subst {
        font-weight: 600;
        color: #cf222e;
      }

      .hljs-string, .hljs-title, .hljs-section, .hljs-attribute,
      .hljs-literal, .hljs-template-tag, .hljs-template-variable,
      .hljs-type, .hljs-addition {
        color: #0a3069;
      }

      .hljs-comment, .hljs-quote, .hljs-deletion, .hljs-meta {
        font-style: italic;
        color: #6e7781;
      }

      .hljs-number, .hljs-regexp, .hljs-link {
        color: #0550ae;
      }
    }

    // ── Dark Mode Code Block ──────────────────────────
    :global(html.dark) & {
      background: color-mix(in srgb, var(--el-bg-color) 92%, #000) !important;
      border-color: var(--el-border-color-darker, #30363d) !important;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);

      code.hljs {
        color: var(--el-text-color-primary, #c9d1d9) !important;

        .hljs-keyword, .hljs-selector-tag, .hljs-subst {
          color: var(--el-color-danger, #ff7b72) !important;
        }

        .hljs-string, .hljs-title, .hljs-section, .hljs-attribute,
        .hljs-literal, .hljs-template-tag, .hljs-template-variable,
        .hljs-type, .hljs-addition {
          color: var(--el-color-primary-light-3, #a5d6ff) !important;
        }

        .hljs-comment, .hljs-quote, .hljs-deletion, .hljs-meta {
          color: var(--el-text-color-placeholder, #8b949e) !important;
        }

        .hljs-number, .hljs-regexp, .hljs-link {
          color: var(--el-color-primary-light-5, #79c0ff) !important;
        }
      }
    }
  }

  :deep(.markdown-view__copy-button) {
    position: absolute;
    top: 8px;
    right: 8px;
    padding: 3px 9px;
    font-size: 11px;
    font-weight: 500;
    line-height: 1.3;
    color: var(--el-text-color-regular, #57606a);
    cursor: pointer;
    background: var(--el-bg-color-overlay, #fff);
    border: 1px solid var(--el-border-color, #d0d7de);
    border-radius: 6px;
    box-shadow: 0 1px 2px rgb(0 0 0 / 4%);
    transition: all 0.16s ease;

    &:hover {
      color: var(--el-color-primary, #0969da);
      background: var(--el-fill-color-light, #f3f4f6);
      border-color: var(--el-color-primary-light-5, #85b8ff);
    }

    // ── Dark Mode Copy Button ─────────────────────────
    :global(html.dark) & {
      color: var(--el-text-color-regular, #c9d1d9) !important;
      background: color-mix(in srgb, var(--el-bg-color-overlay) 80%, #000) !important;
      border-color: var(--el-border-color-darker, #363b42) !important;

      &:hover {
        color: var(--el-color-primary, #58a6ff) !important;
        background: color-mix(in srgb, var(--el-fill-color) 80%, #000) !important;
        border-color: var(--el-color-primary, #58a6ff) !important;
      }
    }
  }
}
</style>