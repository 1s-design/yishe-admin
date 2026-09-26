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
  <div class="chat agent-chat-theme">
    <el-scrollbar ref="messageScrollbarRef" class="chat__scroll">
      <div ref="messageListRef" class="chat__messages">
        <!-- Empty -->
        <div v-if="!visibleMessages.length && !loading" class="chat__empty">
          <p class="chat__empty-text">有什么可以帮你的？</p>
        </div>

        <!-- Messages -->
        <template v-else>
          <div v-for="msg in visibleMessages" :key="msg.id" class="agent-msg msg" :class="`msg--${msg.role}`">
            <!-- User -->
            <div v-if="msg.role === 'user'" class="msg__body">
              <span class="msg__text">{{ msg.content }}</span>
            </div>

            <!-- Assistant -->
            <template v-else-if="msg.role === 'assistant'">
              <div class="msg__avatar">
                <span class="mdi mdi-robot-outline msg__avatar-icon" />
              </div>
              <div class="msg__body">
                <div class="msg__content">
                  <div v-if="msg.content" class="md-body">
                    <MarkdownView :content="msg.content" />
                  </div>
                  <span v-else class="agent-streaming-loader">
                    <span class="agent-thinking-spinner" aria-hidden="true" />
                    <span>正在思考</span>
                  </span>
                </div>
              </div>
            </template>

            <!-- Tool -->
            <template v-else>
              <div class="msg__body">
                <div class="msg__tool" :class="toolMessageClass(msg)">
                  <span class="msg__tool-dot" />
                  <span class="msg__tool-name">{{ msg.toolLabel || msg.toolKey }}</span>
                  <span class="msg__tool-sep">·</span>
                  <span class="msg__tool-result">{{ formatToolContent(msg) }}</span>
                </div>
              </div>
            </template>
          </div>

          <!-- Typing -->
          <div v-if="loading && !hasPendingAssistantMessage" class="agent-msg msg msg--assistant">
            <div class="msg__avatar">
              <span class="mdi mdi-robot-outline msg__avatar-icon" />
            </div>
            <div class="msg__body">
              <div class="agent-streaming-loader">
                <span class="agent-thinking-spinner" aria-hidden="true" />
                <span>{{ thinkingText || "正在思考" }}</span>
              </div>
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
      <div class="composer__wrap">
        <CommandPopup ref="commandPopupRef" :visible="cmdPopupVisible" :commands="slashCommands" :filter="cmdFilter"
          :trigger="cmdTrigger" :anchor-rect="cmdAnchorRect" @select="handleCommandSelect"
          @close="handleCommandClose" />
        <textarea ref="textareaRef" v-model="inputMessage" class="composer__input" :placeholder="inputPlaceholder"
          rows="1" @keydown="handleKeydown" @input="handleInputChange" />
        <div class="composer__actions">
          <button class="composer__send" :disabled="!canSendComputed" @click="handleSend">
            <el-icon :size="16"><ArrowUp v-if="!props.loading" /><Loading v-else class="is-loading" /></el-icon>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
@import "./agent-chat.css";
</style>

<style scoped>
/* ── Layout (仅小面板特有) ── */
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
  padding: 16px 20px;
  flex-direction: column;
}

/* ── Empty ── */
.chat__empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px 0;
}

.chat__empty-text {
  font-size: 16px;
  font-weight: 500;
  color: var(--agent-muted);
  margin: 0;
}

/* ── Tool (小面板简化版) ── */
.msg__tool {
  display: inline-flex;
  padding: 6px 10px;
  font-size: 12px;
  line-height: 1.4;
  background: var(--agent-surface);
  border: 1px solid var(--agent-border-soft);
  border-radius: 10px;
  align-items: center;
  gap: 6px;
}

.msg__tool.is-running { border-color: rgba(245, 158, 11, 0.3); }
.msg__tool.is-running .msg__tool-dot {
  background: #f59e0b;
  animation: agent-thinking-pulse 1.2s infinite;
}
.msg__tool.is-done .msg__tool-dot { background: #10b981; }
.msg__tool.is-error { border-color: rgba(239, 68, 68, 0.3); }
.msg__tool.is-error .msg__tool-dot { background: #ef4444; }

.msg__tool-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  flex-shrink: 0;
}

.msg__tool-name {
  font-weight: 500;
  font-family: "JetBrains Mono", "SF Mono", monospace;
  color: var(--agent-text);
}

.msg__tool-sep { color: var(--agent-muted); }

.msg__tool-result {
  color: var(--agent-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 200px;
}

/* ── Interaction ── */
.chat__interaction {
  padding: 8px 0;
}

/* ── Input ── */
.chat__input {
  flex-shrink: 0;
  padding: 0 28px 12px;
}
</style>
