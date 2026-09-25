<script lang="ts" setup>
import { ref, computed, nextTick, watch, onMounted } from "vue";
import type { ScrollbarInstance } from "element-plus";
import type { AiAssistantMessage } from "@/api/aiAssistant";
import { AiAssistantApi } from "@/api/aiAssistant";
import { ArrowUp, Loading } from "@element-plus/icons-vue";
import MarkdownView from "@/components/MarkdownView/index.vue";
import InteractionRenderer from "./interactions/InteractionRenderer.vue";
import CommandPopup from "./CommandPopup.vue";
import type { CommandItem } from "./CommandPopup.vue";
import type { InteractionPayload, InteractionSubmitResult } from "./interactions/types";

defineOptions({ name: "AssistantChat" });

const props = withDefaults(
  defineProps<{
    messages: AiAssistantMessage[];
    loading: boolean;
    pendingInteraction: InteractionPayload | null;
    thinkingText?: string;
    inputPlaceholder?: string;
    canSend?: boolean;
    promptItems?: Array<{ key: string; label: string }>;
    hasPendingAssistantMessage?: boolean;
    compact?: boolean;
  }>(),
  {
    inputPlaceholder: "输入你的问题",
    canSend: false,
    thinkingText: "",
    promptItems: () => [],
    hasPendingAssistantMessage: false,
    compact: false,
  },
);

const emit = defineEmits<{
  send: [message: string];
  "interaction-submit": [result: InteractionSubmitResult];
  "interaction-reject": [result: InteractionSubmitResult];
  "prompt-click": [key: string];
}>();

const inputMessage = ref("");
const messageListRef = ref<HTMLElement>();
const messageScrollbarRef = ref<ScrollbarInstance>();
const commandPopupRef = ref<InstanceType<typeof CommandPopup>>();
const textareaRef = ref<HTMLTextAreaElement>();

const visibleMessages = computed(() =>
  props.messages.filter((message) => {
    const content = String(message.content || "");
    return !(
      message.role === "assistant" &&
      content.includes("你好！我是你的全能型业务助手") &&
      content.includes("我可以帮你处理很多后台管理工作")
    );
  }),
);

const slashCommands = ref<CommandItem[]>([]);
const cmdPopupVisible = ref(false);
const cmdFilter = ref("");
const cmdTrigger = ref<"/" | "@" | null>(null);
const cmdTriggerIndex = ref(-1);
const cmdAnchorRect = ref<{ left: number; top: number; width: number } | null>(null);

onMounted(async () => {
  try {
    const res = await AiAssistantApi.getCommands();
    slashCommands.value = (res.commands || []).map((c) => ({
      name: c.name,
      aliases: c.aliases,
      category: c.category,
      description: c.description,
    }));
  } catch {
    slashCommands.value = [];
  }
});

function detectCommandTrigger(text: string, cursorPos: number) {
  for (let i = cursorPos - 1; i >= 0; i--) {
    const ch = text[i];
    if (ch === " " || ch === "\n") break;
    if (ch === "/" || ch === "@") {
      if (i === 0 || /[\s\n]/.test(text[i - 1])) {
        cmdTrigger.value = ch;
        cmdTriggerIndex.value = i;
        cmdFilter.value = text.slice(i + 1, cursorPos);
        cmdPopupVisible.value = true;
        return;
      }
    }
  }
  cmdPopupVisible.value = false;
  cmdTrigger.value = null;
}

function handleInputChange() {
  const el = textareaRef.value;
  const cursorPos = el?.selectionStart ?? inputMessage.value.length;
  if (el) {
    const rect = el.getBoundingClientRect();
    cmdAnchorRect.value = { left: rect.left, top: rect.top, width: rect.width };
  }
  detectCommandTrigger(inputMessage.value, cursorPos);
  autoResize();
}

function autoResize() {
  const el = textareaRef.value;
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
}

function handleCommandSelect(cmd: CommandItem) {
  const alias = cmd.aliases[0] || `/${cmd.name}`;
  const before = inputMessage.value.slice(0, cmdTriggerIndex.value);
  const after = inputMessage.value.slice(cmdTriggerIndex.value + 1 + cmdFilter.value.length);
  inputMessage.value = `${before}${alias} ${after}`.trimEnd() + " ";
  cmdPopupVisible.value = false;
  cmdTrigger.value = null;
  nextTick(() => textareaRef.value?.focus());
}

function handleCommandClose() {
  cmdPopupVisible.value = false;
  cmdTrigger.value = null;
}

const canSendComputed = computed(
  () => Boolean(inputMessage.value.trim()) && !props.loading && !props.pendingInteraction && props.canSend !== false,
);

function handleSend() {
  const message = inputMessage.value.trim();
  if (!message || !canSendComputed.value) return;
  inputMessage.value = "";
  cmdPopupVisible.value = false;
  nextTick(() => autoResize());
  emit("send", message);
}

function handleKeydown(e: KeyboardEvent) {
  if (cmdPopupVisible.value && commandPopupRef.value?.handleKeydown(e)) return;
  if (e.key === "Enter" && !e.shiftKey) {
    if (!canSendComputed.value) return;
    e.preventDefault();
    handleSend();
  }
}

function handleInteractionSubmit(result: InteractionSubmitResult) {
  emit("interaction-submit", result);
}

function handleInteractionReject(result: InteractionSubmitResult) {
  emit("interaction-reject", result);
}

function handlePromptClick(key: string) {
  emit("prompt-click", key);
}

function formatToolContent(message: AiAssistantMessage) {
  const content = message.content;
  if (!content) return "执行完成";
  if (typeof content === "object") {
    const obj = content as Record<string, any>;
    if (obj._note) return String(obj._note);
    if (obj.message) return String(obj.message);
    if (obj.now) return `系统时间: ${obj.now}`;
    if (obj.total !== undefined) return `共 ${obj.total} 条`;
    try { return JSON.stringify(obj); } catch { return "执行完成"; }
  }
  const str = String(content);
  if (str === "[object Object]") {
    const res = (message.toolResult?.data || message.toolResult || {}) as Record<string, any>;
    if (res._note) return String(res._note);
    if (res.message) return String(res.message);
    if (res.now) return `系统时间: ${res.now}`;
    if (res.total !== undefined) return `共 ${res.total} 条`;
    return "执行完成";
  }
  return str;
}

function toolMessageClass(message: AiAssistantMessage) {
  if (message.toolResult?.success === false) return "is-error";
  const str = String(message.content || "");
  if (str === "执行中..." || str.startsWith("准备调用")) return "is-running";
  return "is-done";
}

function scrollToBottom() {
  nextTick(() => {
    if (messageScrollbarRef.value) {
      messageScrollbarRef.value.setScrollTop(messageListRef.value?.scrollHeight || 0);
    }
  });
}

watch(() => props.messages.length, () => nextTick(() => scrollToBottom()));
watch(() => props.messages[props.messages.length - 1]?.content, () => nextTick(() => scrollToBottom()));
watch(() => props.pendingInteraction, () => nextTick(() => scrollToBottom()));

defineExpose({ scrollToBottom, focusInput: () => textareaRef.value?.focus() });
</script>

<template>
  <div class="chat">
    <el-scrollbar ref="messageScrollbarRef" class="chat__scroll">
      <div ref="messageListRef" class="chat__messages">
        <!-- Empty -->
        <div v-if="!visibleMessages.length && !loading" class="chat__empty">
          <div class="chat__empty-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
              stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <h2 class="chat__empty-title">有什么可以帮你的？</h2>
          <div v-if="promptItems.length" class="chat__prompts">
            <button v-for="p in promptItems" :key="p.key" class="chat__prompt" @click="handlePromptClick(p.key)">
              {{ p.label }}
            </button>
          </div>
        </div>

        <!-- Messages -->
        <template v-else>
          <div v-for="msg in visibleMessages" :key="msg.id" class="msg" :class="`msg--${msg.role}`">
            <!-- User -->
            <div v-if="msg.role === 'user'" class="msg__row msg__row--right">
              <div class="msg__bubble msg__bubble--user">{{ msg.content }}</div>
            </div>

            <!-- Assistant -->
            <div v-else-if="msg.role === 'assistant'" class="msg__row msg__row--left">
              <div class="msg__icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                  stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <div class="msg__content">
                <MarkdownView v-if="msg.content" :content="msg.content" />
                <span v-else class="msg__pending">正在回复...</span>
              </div>
            </div>

            <!-- Tool -->
            <div v-else class="msg__row msg__row--left">
              <div class="msg__icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                  stroke-linecap="round" stroke-linejoin="round">
                  <path
                    d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                </svg>
              </div>
              <div class="msg__tool" :class="toolMessageClass(msg)">
                <span class="msg__tool-dot" />
                <span class="msg__tool-name">{{ msg.toolLabel || msg.toolKey }}</span>
                <span class="msg__tool-sep">·</span>
                <span class="msg__tool-result">{{ formatToolContent(msg) }}</span>
              </div>
            </div>
          </div>

          <!-- Typing -->
          <div v-if="loading && !hasPendingAssistantMessage" class="msg__row msg__row--left">
            <div class="msg__icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <div class="msg__typing">
              <span class="dot" /><span class="dot" /><span class="dot" />
              <span class="msg__typing-text">{{ thinkingText || "思考中" }}</span>
            </div>
          </div>

          <!-- Interaction -->
          <div v-if="pendingInteraction" class="chat__interaction">
            <InteractionRenderer :payload="pendingInteraction" :loading="loading" @submit="handleInteractionSubmit"
              @reject="handleInteractionReject" />
          </div>
        </template>
      </div>
    </el-scrollbar>

    <!-- Input -->
    <div class="chat__input">
      <div class="chat__input-box">
        <CommandPopup ref="commandPopupRef" :visible="cmdPopupVisible" :commands="slashCommands" :filter="cmdFilter"
          :trigger="cmdTrigger" :anchor-rect="cmdAnchorRect" @select="handleCommandSelect"
          @close="handleCommandClose" />
        <textarea ref="textareaRef" v-model="inputMessage" class="chat__textarea" :placeholder="inputPlaceholder"
          rows="1" @keydown="handleKeydown" @input="handleInputChange" />
        <button class="chat__send" :disabled="!canSendComputed" @click="handleSend">
          <el-icon :size="16"><ArrowUp v-if="!props.loading" /><Loading v-else class="is-loading" /></el-icon>
        </button>
      </div>
      <!-- hint removed -->
    </div>
  </div>
</template>

<style scoped>

@keyframes msgFadeIn {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulse {

  0%,
  100% {
    opacity: .4;
  }

  50% {
    opacity: 1;
  }
}

@keyframes bounce {

  0%,
  60%,
  100% {
    opacity: .4;
    transform: translateY(0);
  }

  30% {
    opacity: 1;
    transform: translateY(-3px);
  }
}

@keyframes l7 {
  0%   { transform: translate(0, 0); }
  25%  { transform: translate(100%, 0); }
  50%  { transform: translate(100%, 100%); }
  75%  { transform: translate(0, 100%); }
  100% { transform: translate(0, 0); }
}

/* Agent theme variables */
.chat {
  --agent-text: var(--el-text-color-primary);
  --agent-muted: var(--el-text-color-secondary);
  --agent-surface: var(--el-bg-color);
  --agent-border: var(--el-border-color-lighter);
  --agent-border-soft: color-mix(in srgb, var(--el-border-color-lighter) 60%, transparent);
  --agent-user-bubble: color-mix(in srgb, var(--el-bg-color) 88%, var(--el-fill-color-light));
}

/* ── Responsive ── */
@media (width <= 767px) {
  .msg__row {
    padding: 4px 12px;
  }

  .chat__input {
    padding: 6px 12px 10px;
  }

  .msg__bubble--user {
    max-width: 85%;
  }
}

.chat {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.chat__scroll {
  flex: 1;
  min-height: 0;
}

.chat__messages {
  display: flex;
  min-height: 100%;
  padding-top: 24px;
  flex-direction: column;
}

/* ── Empty ── */
.chat__empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 22px;
  justify-content: center;
  gap: 8px;
  padding: 24px 16px;
}

.chat__empty-icon {
  color: var(--el-text-color-placeholder);
}

.chat__empty-title {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.chat__prompts {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
  margin-top: 4px;
}

.chat__prompt {
  height: 30px;
  padding: 0 12px;
  font-size: 12px;
  color: var(--el-text-color-regular);
  cursor: pointer;
  background: transparent;
  border: 1px solid var(--el-border-color);
  border-radius: 15px;
  transition: all .12s;
}

.chat__prompt:hover {
  color: var(--el-color-primary);
  border-color: var(--el-color-primary);
}

/* ── Message ── */
.msg {
  padding: 2px 0;
}

.msg__row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 4px 20px;
  animation: msgFadeIn 0.25s ease;
}

.msg__row--right {
  justify-content: flex-end;
}

.msg__row--left {
  justify-content: flex-start;
}

/* ── Icon ── */
.msg__icon {
  display: flex;
  width: 32px;
  height: 32px;
  color: var(--el-text-color-regular);
  background: var(--agent-surface);
  border: 1px solid var(--agent-border-soft);
  border-radius: 8px;
  flex-shrink: 0;
  margin-top: auto;
  margin-bottom: auto;
  align-items: center;
  justify-content: center;
}

/* ── Content ── */
.msg__content {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  line-height: 1.6;
  color: var(--el-text-color-primary);
  word-break: break-word;
}

.msg__pending {
  font-size: 13px;
  color: var(--el-text-color-placeholder);
}

/* ── User Bubble ── */
.msg__bubble--user {
  display: inline-block;
  max-width: min(82%, 620px);
  padding: 11px 16px;
  font-size: 14px;
  line-height: 1.55;
  color: var(--agent-text);
  word-break: break-word;
  background: var(--agent-user-bubble);
  border-radius: 22px;
  animation: msgFadeIn 0.25s ease;
}

/* ── Tool (Card style) ── */
.msg__tool {
  display: inline-flex;
  padding: 6px 10px;
  font-size: 12px;
  line-height: 1.4;
  background: var(--agent-surface);
  border: 1px solid var(--agent-border-soft);
  border-radius: 11px;
  align-items: center;
  gap: 6px;
}

.msg__tool.is-running {
  border-color: rgba(245, 158, 11, 0.3);
}

.msg__tool.is-running .msg__tool-dot {
  background: #f59e0b;
  animation: pulse 1.2s infinite;
}

.msg__tool.is-done .msg__tool-dot {
  background: #10b981;
}

.msg__tool.is-error {
  border-color: rgba(239, 68, 68, 0.3);
}

.msg__tool.is-error .msg__tool-dot {
  background: #ef4444;
}

.msg__tool-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  flex-shrink: 0;
}

.msg__tool-name {
  font-weight: 500;
  font-family: "JetBrains Mono", "SF Mono", monospace;
  color: var(--el-text-color-primary);
}

.msg__tool-sep {
  color: var(--agent-muted);
}

.msg__tool-result {
  color: var(--el-text-color-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── Typing ── */
.msg__typing {
  display: flex;
  align-items: center;
  line-height: 22px;
  gap: 4px;
  padding: 4px 0;
}

.dot {
  width: 5px;
  height: 5px;
  background: var(--el-text-color-placeholder);
  border-radius: 50%;
  animation: bounce 1.4s infinite;
}

.dot:nth-child(2) {
  animation-delay: .2s;
}

.dot:nth-child(3) {
  animation-delay: .4s;
}

.msg__typing-text {
  margin-left: 2px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

/* ── Interaction ── */
.chat__interaction {
  padding: 8px 16px;
}

/* ── Input ── */
.chat__input {
  flex-shrink: 0;
  padding: 6px 12px 8px;
}

.chat__input-box {
  position: relative;
  display: flex;
  padding: 5px;
  background: var(--agent-surface);
  border: 1px solid var(--agent-border-soft);
  border-radius: 24px;
  transition: border-color .2s, box-shadow .2s;
  align-items: center;
  gap: 6px;
}

.chat__input-box:focus-within {
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--el-color-primary) 15%, transparent);
}

.chat__textarea {
  max-height: 120px;
  min-height: 36px;
  padding: 8px 8px 8px 12px;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.5;
  color: var(--el-text-color-primary);
  background: transparent;
  border: none;
  outline: none;
  resize: none;
  flex: 1;
}

.chat__textarea::placeholder {
  color: var(--el-text-color-placeholder);
}

.chat__send {
  display: flex;
  width: 32px;
  height: 32px;
  color: #fff;
  cursor: pointer;
  background: var(--el-color-primary);
  border: none;
  border-radius: 50%;
  align-items: center;
  justify-content: center;
  transition: opacity .15s, transform .15s;
  flex-shrink: 0;
}

.chat__send:hover:not(:disabled) {
  opacity: .85;
  transform: scale(1.08);
}
.chat__send:active:not(:disabled) {
  transform: scale(0.92);
}

.chat__send:disabled {
  cursor: not-allowed;
  opacity: .3;
}
</style>
