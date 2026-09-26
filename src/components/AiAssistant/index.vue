<template>
  <div class="ai-desktop agent-chat-theme" :class="{ 'ai-desktop--sidebar-open': sidebarOpen }">
    <aside class="sidebar">
      <div class="sidebar__header">
        <div class="sidebar__brand">
          <span class="sidebar__brand-text">{{ brandText }}</span>
          <span class="sidebar__brand-cursor" aria-hidden="true" />
        </div>
      </div>
      <div class="sidebar__nav">
        <div class="sidebar__section">
          <button class="sidebar__new-btn" @click="handleCreateConversation">
            <el-icon :size="15"><Plus /></el-icon>
            <span>新建对话</span>
          </button>
          <div class="sidebar__section-label">历史</div>
          <div v-for="conv in store.conversations" :key="conv.id" class="sidebar__item"
            :class="{ active: store.currentConversationId === conv.id }" @click="handleSelectConversation(conv.id)"
            @mouseenter="showConversationDetail(conv, $event)" @mouseleave="hideConversationDetail">
            <div class="sidebar__item-main">
              <span class="sidebar__item-text">{{ conv.title || "未命名会话" }}</span>
            </div>
            <button class="sidebar__item-del" @click.stop="store.deleteConversation(conv.id)">
              ×
            </button>
          </div>
          <div v-if="!store.conversations.length" class="sidebar__empty">暂无会话</div>
        </div>
      </div>

      <div class="sidebar__bottom">
        <el-tooltip effect="dark" content="工具目录" placement="top">
          <button class="sidebar__item--icon" @click="handleOpenToolDialog">
            <el-icon :size="15"><Tools /></el-icon>
          </button>
        </el-tooltip>
        <el-tooltip effect="dark" content="清空所有会话" placement="top">
          <button class="sidebar__item--icon sidebar__item--danger" @click="store.clearAllConversations()">
            <el-icon :size="15"><Delete /></el-icon>
          </button>
        </el-tooltip>
      </div>
    </aside>

    <!-- 对话详情浮层（放在侧边栏外避免层级问题） -->
    <div v-if="hoveredConversation" class="conversation-detail-popup" :style="popupStyle">
      <div class="conversation-detail-header">
        <span class="conversation-detail-title">{{
          hoveredConversation.title || "未命名会话"
          }}</span>
      </div>
      <div class="conversation-detail-body">
        <div class="detail-row">
          <span class="detail-label">创建时间</span>
          <span class="detail-value">{{ formatTime(hoveredConversation.createdAt) }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">消息数</span>
          <span class="detail-value">{{ hoveredConversation.messageCount || 0 }} 条</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">运行次数</span>
          <span class="detail-value">
            {{ hoveredConversation.successfulRunCount || 0 }} 成功 /
            {{ hoveredConversation.failedRunCount || 0 }} 失败
          </span>
        </div>
        <div class="detail-row" v-if="hoveredConversation.totalDurationMs">
          <span class="detail-label">总耗时</span>
          <span class="detail-value">{{
            formatDuration(hoveredConversation.totalDurationMs)
            }}</span>
        </div>
        <div class="detail-row" v-if="hoveredConversation.avgAiResponseMs">
          <span class="detail-label">平均AI响应</span>
          <span class="detail-value">{{
            formatDuration(hoveredConversation.avgAiResponseMs)
            }}</span>
        </div>
      </div>
    </div>

    <div class="workspace">
      <header class="topbar">
        <div class="topbar__left">
          <button class="topbar__menu" @click="sidebarOpen = !sidebarOpen">☰</button>
          <span class="topbar__title">{{ store.activeConversationTitle }}</span>
        </div>
        <div class="topbar__right">
          <el-tooltip effect="dark" content="刷新" placement="bottom">
            <button class="topbar__btn topbar__btn--icon" @click="handleRefresh">
              <el-icon><Refresh /></el-icon>
            </button>
          </el-tooltip>
          <el-tooltip v-if="store.messages.length" effect="dark" content="清空当前消息" placement="bottom">
            <button class="topbar__btn topbar__btn--icon" @click="store.clearMessages()">
              <el-icon><Delete /></el-icon>
            </button>
          </el-tooltip>
          <el-tooltip v-if="store.conversations.length" effect="dark" content="清空所有会话与对话记录" placement="bottom">
            <button class="topbar__btn topbar__btn--icon topbar__btn--danger" @click="store.clearAllConversations()">
              <el-icon><Delete /></el-icon>
            </button>
          </el-tooltip>
        </div>
      </header>

      <div class="chat">
        <div class="chat__scroll" ref="chatScrollRef">
          <div class="chat__list">
            <template v-if="!visibleMessages.length && !store.loading">
              <div class="chat__empty">
                <p class="chat__empty-text">有什么可以帮你的？</p>
              </div>
            </template>
            <template v-for="msg in visibleMessages" :key="msg.id">
              <div class="msg" :class="[`msg--${msg.role}`]">
                <div v-if="msg.role === 'assistant'" class="msg__avatar">
                  <span class="mdi mdi-robot-outline msg__avatar-icon" />
                </div>
                <div class="msg__body">
                  <div class="msg__content">
                    <template v-if="msg.role === 'user'">
                      <span class="msg__text">{{ msg.content }}</span>
                    </template>
                    <template v-else>
                      <div v-if="msg.toolCalls?.length" class="agent-tools">
                        <div v-for="tc in msg.toolCalls" :key="tc.id" class="agent-tool"
                          :class="[`agent-tool--${tc.status || 'done'}`]">
                          <div class="agent-tool__header" @click="toggleTool(tc.id)">
                            <el-icon class="agent-tool__icon"><Tools /></el-icon>
                            <span class="agent-tool__name">{{ tc.name }}</span>
                            <span class="agent-tool__status" :class="`is-${tc.status || 'done'}`">
                              <span class="agent-tool__status-dot" />
                              {{ tc.status === 'running' ? '执行中' : tc.status === 'error' ? '失败' : '完成' }}
                            </span>
                            <span class="agent-tool__chevron" :class="{ expanded: expandedTools.has(tc.id) }">
                              ▾
                            </span>
                          </div>
                          <Transition name="collapse">
                            <div v-if="expandedTools.has(tc.id)" class="collapse-inner">
                              <div class="agent-tool__body">
                                <div v-if="tc.args && Object.keys(tc.args).length" class="agent-tool__section">
                                  <div class="agent-tool__section-label">参数</div>
                                  <pre class="agent-tool__pre">{{ formatJson(tc.args) }}</pre>
                                </div>
                                <div v-if="tc.result || tc.error" class="agent-tool__section">
                                  <div class="agent-tool__section-label">{{ tc.error ? '错误' : '结果' }}</div>
                                  <pre class="agent-tool__pre" :class="{ 'is-error': tc.error }">{{ tc.error || formatJson(tc.result) }}</pre>
                                </div>
                              </div>
                            </div>
                          </Transition>
                        </div>
                      </div>
                      <!-- Agent Run Stage 进度 -->
                      <div
                        v-if="getRunStages(msg.runTrace?.runId).length"
                        class="agent-run-stages"
                      >
                        <div class="agent-run-stages__header">
                          <el-icon class="agent-run-stages__icon"><Promotion /></el-icon>
                          <span class="agent-run-stages__title">执行管线</span>
                        </div>
                        <div class="agent-run-stages__list">
                          <div
                            v-for="stage in getRunStages(msg.runTrace?.runId)"
                            :key="stage.stageIndex"
                            class="agent-run-stage"
                            :class="`is-${stage.status}`"
                          >
                            <span class="agent-run-stage__dot" />
                            <span class="agent-run-stage__name">{{ stage.name }}</span>
                            <span class="agent-run-stage__status">
                              {{ stageStatusText(stage.status) }}
                            </span>
                          </div>
                        </div>
                      </div>
                      <!-- Reasoning 可折叠思考块 -->
                      <div
                        v-if="store.thinkingText && msg === visibleMessages[visibleMessages.length - 1]"
                        class="agent-reasoning"
                      >
                        <button
                          class="agent-reasoning__trigger"
                          :aria-expanded="store.expandedReasoning.has(msg.id)"
                          @click="store.toggleReasoning(msg.id)"
                        >
                          <span class="agent-reasoning__icon mdi mdi-brain" />
                          <span class="agent-reasoning__label">
                            {{ store.loading ? '正在思考' : '思考过程' }}
                          </span>
                          <span
                            v-if="store.reasoningDurations.has(msg.id)"
                            class="agent-reasoning__duration"
                          >
                            {{ store.reasoningDurations.get(msg.id) }}s
                          </span>
                          <span
                            class="agent-reasoning__chevron"
                            :class="{ 'is-expanded': store.expandedReasoning.has(msg.id) }"
                          >
                            <el-icon><ArrowDown /></el-icon>
                          </span>
                        </button>
                        <Transition name="collapse">
                          <div v-if="store.expandedReasoning.has(msg.id)" class="collapse-inner">
                            <div class="agent-reasoning__body">
                              <span
                                v-if="store.loading"
                                class="agent-thinking-spinner"
                                aria-hidden="true"
                              />
                              <span class="agent-reasoning__text">
                                {{ store.thinkingText || '分析中...' }}
                              </span>
                            </div>
                          </div>
                        </Transition>
                      </div>
                      <div v-if="msg.content" class="md-body">
                        <MarkdownView :content="msg.content" />
                      </div>
                      <p v-if="msg.errorText" class="agent-message-error">
                        {{ msg.errorText }}
                      </p>
                    </template>
                  </div>
                  <template v-if="
                    msg.role === 'assistant' &&
                    msg === visibleMessages[visibleMessages.length - 1] &&
                    store.pendingInteraction
                  ">
                    <InteractionRenderer :payload="store.pendingInteraction" @submit="handleInteractionSubmit"
                      @reject="handleInteractionReject" />
                  </template>
                  <!-- 消息工具栏：复制 + 详情 水平排列 -->
                  <div v-if="msg.content || hasMessageDetails(msg)" class="msg__toolbar">
                    <button v-if="msg.content" class="msg__action-btn" title="复制" @click="copyText(msg.content, msg.id)">
                      <el-icon :size="14">
                        <Check v-if="copiedMessageId === msg.id" />
                        <CopyDocument v-else />
                      </el-icon>
                    </button>
                    <div v-if="hasMessageDetails(msg)" class="msg__meta">
                      <el-popover trigger="click" placement="bottom-start" :width="360"
                        popper-class="ai-message-detail-popover">
                        <template #reference>
                          <span>
                            <el-tooltip effect="dark" placement="top" :content="getMessageDetailsTooltip(msg)">
                              <button class="msg__action-btn" aria-label="消息详情">
                                <el-icon :size="14">
                                  <InfoFilled />
                                </el-icon>
                              </button>
                            </el-tooltip>
                          </span>
                        </template>
                        <div class="msg__meta-panel">
                          <div class="msg__meta-row">
                            <span>创建时间</span>
                            <strong>{{ formatTime(msg.createdAt) }}</strong>
                          </div>
                          <div v-if="msg.startedAt" class="msg__meta-row">
                            <span>开始处理</span>
                            <strong>{{ formatTime(msg.startedAt) }}</strong>
                          </div>
                          <div v-if="msg.completedAt" class="msg__meta-row">
                            <span>完成时间</span>
                            <strong>{{ formatTime(msg.completedAt) }}</strong>
                          </div>
                          <div v-if="hasMetric(msg.durationMs)" class="msg__meta-row">
                            <span>总耗时</span>
                            <strong>{{ formatDuration(msg.durationMs) }}</strong>
                          </div>
                          <div v-if="hasMetric(msg.aiResponseMs)" class="msg__meta-row">
                            <span>AI 响应</span>
                            <strong>{{ formatDuration(msg.aiResponseMs) }}</strong>
                          </div>
                          <div v-if="hasMetric(msg.toolExecutionMs)" class="msg__meta-row">
                            <span>工具耗时</span>
                            <strong>{{ formatDuration(msg.toolExecutionMs) }}</strong>
                          </div>
                          <div v-if="msg.toolKey" class="msg__meta-row">
                            <span>工具</span>
                            <strong>{{ msg.toolLabel || msg.toolKey }}</strong>
                          </div>
                          <div v-if="getMessageToolDetails(msg).length" class="msg__meta-tools">
                            <div class="msg__meta-tools-title">工具调用</div>
                            <div v-for="tool in getMessageToolDetails(msg)"
                              :key="`${tool.tool}-${tool.startedAt || tool.summary}`" class="msg__meta-tool">
                              <div class="msg__meta-tool-main">
                                <span class="msg__meta-tool-status" :class="{ failed: tool.success === false }"></span>
                                <strong>{{ tool.label || tool.tool }}</strong>
                              </div>
                              <span>{{ formatDuration(tool.durationMs) }}</span>
                              <small v-if="tool.summary">{{ tool.summary }}</small>
                            </div>
                          </div>
                          <div v-if="getMessageRunId(msg)" class="msg__meta-row">
                            <span>Run ID</span>
                            <strong>{{ getMessageRunId(msg) }}</strong>
                          </div>
                        </div>
                      </el-popover>
                    </div>
                  </div>
                </div>
              </div>
            </template>
            <div v-if="store.loading && !store.pendingInteraction" class="msg msg--assistant">
              <div class="msg__avatar">
                <span class="mdi mdi-robot-outline msg__avatar-icon" />
              </div>
              <div class="msg__body">
                <div v-if="!lastAssistantHasContent" class="agent-streaming-loader">
                  <span class="agent-thinking-spinner" aria-hidden="true" />
                  <span>正在思考</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <!-- 滚动到底部按钮 -->
        <Transition name="fade">
          <button
            v-if="!stickToBottom"
            class="agent-scroll-bottom"
            title="滚动到底部"
            @click="scrollToBottom"
          >
            <el-icon><ArrowDown /></el-icon>
          </button>
        </Transition>
        <div class="composer">
          <div class="composer__wrap">
            <textarea ref="textareaRef" v-model="inputMessage" class="composer__input"
              :placeholder="store.senderPlaceholder" rows="1"
              @compositionstart="isComposing = true"
              @compositionend="isComposing = false"
              @keydown="handleKeyDown"
              @input="autoResize"></textarea>
            <div class="composer__actions">
              <button class="composer__send" :disabled="!canSend || store.loading" @click="handleSend">
                <el-icon :size="16"><ArrowUp v-if="!store.loading" /><Loading v-else class="is-loading" /></el-icon>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <el-dialog v-model="showToolDialog" title="Agent 工具目录" fullscreen :close-on-click-modal="true" class="tools-dialog">
      <div class="tools-dialog__body">
        <div class="tools-dialog__search">
          <el-input v-model="toolSearchQuery" placeholder="搜索..." clearable @input="handleToolSearch"
            :prefix-icon="Search" />
          <span class="tools-dialog__count">{{ filteredTools.length }}</span>
        </div>
        <div class="tools-dialog__summary" v-if="toolCatalogUpdatedAt">
          <span class="tools-dialog__updated">更新于 {{ toolCatalogUpdatedAt }}</span>
        </div>
        <div class="tools-dialog__filters">
          <button v-for="filter in toolSourceFilters" :key="filter.key" type="button" class="tools-filter"
            :class="{ active: toolSourceFilter === filter.key }" @click="setToolSourceFilter(filter.key)">
            {{ filter.label }}
          </button>
        </div>
        <el-scrollbar class="tools-dialog__list">
          <div v-if="toolsLoading" class="tools-dialog__loading">
            <el-icon class="is-loading">
              <Loading />
            </el-icon>
          </div>
          <template v-else>
            <div v-for="source in filteredToolTree" :key="source.key" class="tools-tree__source">
              <button type="button" class="tools-tree__source-head" @click="toggleToolSource(source.key)">
                <span class="tools-tree__arrow" :class="{ expanded: expandedToolSources.has(source.key) }">›</span>
                <strong>{{ source.label }}</strong>
                <em>{{ source.total }}</em>
              </button>
              <div v-if="expandedToolSources.has(source.key)" class="tools-tree__domains">
                <div v-for="domain in source.domains" :key="domain.key" class="tools-tree__domain">
                  <button type="button" class="tools-tree__domain-head" @click="toggleToolGroup(domain.key)">
                    <span class="tools-tree__arrow" :class="{ expanded: expandedToolGroups.has(domain.key) }">›</span>
                    <span>{{ domain.label }}</span>
                    <em>{{ domain.tools.length }}</em>
                  </button>
                  <div v-if="expandedToolGroups.has(domain.key)" class="tools-tree__tools">
                    <div v-for="tool in domain.tools" :key="tool.name" class="tools-row"
                      :class="{ expanded: expandedTool === tool.name }" @click="toggleToolExpand(tool)">
                      <div class="tools-row__head">
                        <code class="tools-row__name">{{ tool.name }}</code>
                        <span class="tools-row__label">{{ tool.label }}</span>
                        <span class="tools-row__runtime"
                          :class="tool.runtime === 'client' ? 'is-client' : 'is-server'">{{
                            tool.sourceLabel ||
                            (tool.runtime === "client" ? "客户端 MCP" : "服务端")
                          }}</span>
                      </div>
                      <div class="tools-row__desc">{{ tool.summary || tool.description }}</div>
                      <div class="tools-row__chips">
                        <span v-if="tool.hierarchy?.capability?.label">{{
                          tool.hierarchy.capability.label
                          }}</span>
                        <span v-if="tool.hierarchy?.action?.label">{{
                          tool.hierarchy.action.label
                          }}</span>
                        <span v-if="getToolParameters(tool).length">{{ getToolParameters(tool).length }} 个参数</span>
                        <span v-if="tool.children?.length">{{ tool.children.length }} 个操作</span>
                        <span v-if="tool.workflow?.requiresConfirmation" class="is-warning">需确认</span>
                      </div>
                      <div v-if="expandedTool === tool.name" class="tools-row__detail" @click.stop>
                        <div class="tools-row__meta">
                          <span>层级：{{ tool.groupLabel || getCategoryLabel(tool.category) }}</span>
                          <span v-if="tool.hierarchy?.action?.label">动作：{{ tool.hierarchy.action.label }}</span>
                          <span>执行位置：{{ tool.runtime === "client" ? "客户端" : "服务端" }}</span>
                          <span v-if="tool.riskLevel">风险：{{ tool.riskLevel }}</span>
                          <span v-if="tool.confirmRequired">需要确认</span>
                        </div>
                        <div v-for="p in getToolParameters(tool)" :key="p.name" class="tools-row__param">
                          <div>
                            <code>{{ p.name }}</code>
                            <span v-if="p.required" class="req">必填</span>
                            <span class="type">{{ p.type }}</span>
                          </div>
                          <small v-if="p.description">{{ p.description }}</small>
                        </div>
                        <div v-if="tool.children?.length" class="tools-row__children">
                          <div class="tools-row__children-title">
                            支持的{{ tool.children[0]?.kind === "action" ? "动作" : "操作" }}
                          </div>
                          <div v-for="child in tool.children" :key="child.key" class="tools-row__child">
                            <code>{{ child.key }}</code>
                            <span>{{ child.label }}</span>
                            <small v-if="child.description">{{ child.description }}</small>
                          </div>
                        </div>
                        <div v-if="tool.runtime === 'client'" class="tools-row__clients">
                          <span>可用客户端：</span>
                          <code v-for="client in tool.clients || []" :key="client.connectionId">{{
                            client.clientId || client.connectionId
                          }}</code>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </el-scrollbar>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { ElMessage } from "element-plus";
import { ArrowDown, ArrowUp, Check, CopyDocument, Delete, InfoFilled, Loading, Plus, Promotion, Refresh, Search, Tools } from "@element-plus/icons-vue";
import { AiAssistantApi } from "@/api/aiAssistant";
import { useAiAssistantStore } from "@/store/modules/aiAssistant";
import { websocketClient } from "@/services/websocketClient";
import type { InteractionSubmitResult } from "./interactions/types";
import MarkdownView from "@/components/MarkdownView/index.vue";
import InteractionRenderer from "./interactions/InteractionRenderer.vue";

defineOptions({ name: "AiAssistant" });

const route = useRoute();
const store = useAiAssistantStore();
const chatScrollRef = ref<HTMLElement>();
const textareaRef = ref<HTMLTextAreaElement>();
const inputMessage = ref("");

const showToolDialog = ref(false);
const toolSearchQuery = ref("");
const allTools = ref<any[]>([]);
const filteredTools = ref<any[]>([]);
const toolsLoading = ref(false);
const expandedTool = ref<string | null>(null);
const expandedToolSources = ref<Set<string>>(new Set(["server", "client"]));
const expandedToolGroups = ref<Set<string>>(new Set());
const toolSourceFilter = ref("all");
const toolCatalogUpdatedAt = ref("");
const hoveredConversation = ref<any>(null);
const popupStyle = ref<Record<string, string>>({});
const sidebarOpen = ref(false);
const expandedTools = ref<Set<string>>(new Set());
const isComposing = ref(false);
const copiedMessageId = ref<string | number | null>(null);

// Brand text typewriter effect
const BRAND_PHRASES = ["衣设助手", "让设计快 1 秒", "设计灵感即刻呈现", "你的贴身设计搭档"];
const brandText = ref("");
let brandIndex = 0;
let phraseIndex = 0;
let brandTimer: ReturnType<typeof setTimeout> | null = null;

function streamBrand() {
  brandText.value = "";
  brandIndex = 0;
  const phrase = BRAND_PHRASES[phraseIndex % BRAND_PHRASES.length];
  const tick = () => {
    if (brandIndex >= phrase.length) {
      brandTimer = setTimeout(() => {
        phraseIndex = (phraseIndex + 1) % BRAND_PHRASES.length;
        streamBrand();
      }, 2000);
      return;
    }
    const size = Math.floor(Math.random() * 2) + 1;
    brandText.value += phrase.slice(brandIndex, brandIndex + size);
    brandIndex += size;
    brandTimer = setTimeout(tick, Math.random() * 120 + 120);
  };
  tick();
}

function handleResizeOpen() {
  if (window.innerWidth > 768) sidebarOpen.value = true
}

const canSend = computed(() => inputMessage.value.trim().length > 0 && store.canSend);

const lastAssistantHasContent = computed(() => {
  const last = [...visibleMessages.value].reverse().find((m) => m.role === "assistant");
  return !!(last && last.content);
});

const visibleMessages = computed(() => {
  const list = store.messages.filter((m) => {
    if ((m.role as string) === "system") return false;
    if (m.role === "tool") return false;
    return true;
  });

  const result: typeof list = [];

  function isPollingLog(content: string): boolean {
    if (!content) return false;
    const text = String(content);
    return (
      text.includes("查询图片处理记录详情") ||
      text.includes("查询视频渲染任务") ||
      text.includes("image_processing_record.detail") ||
      text.includes("video_render_execute") ||
      (text.includes("查询") && text.includes("状态")) ||
      (text.includes("查询") && text.includes("详情"))
    );
  }

  for (let i = 0; i < list.length; i++) {
    const msg = list[i];

    // 如果是轮询状态等过程日志，只显示最后一条结果，过滤掉中间的重复过程
    if (msg.role === "assistant" && isPollingLog(msg.content)) {
      const hasLater = list.slice(i + 1).some((m) => m.role === "assistant" && isPollingLog(m.content));
      if (hasLater) {
        continue;
      }
    }

    // 过滤完全相同且相邻的重复消息
    if (result.length > 0) {
      const last = result[result.length - 1];
      if (last.role === msg.role && last.content.trim() === msg.content.trim()) {
        continue;
      }
    }

    result.push(msg);
  }

  return result;
});

const filteredToolTree = computed(() => {
  const sourceMap = new Map<
    string,
    {
      key: string;
      label: string;
      total: number;
      domains: Array<{ key: string; label: string; tools: any[] }>;
    }
  >();
  for (const tool of filteredTools.value) {
    const sourceKey = tool.runtime === "client" ? "client" : "server";
    const sourceLabel = tool.sourceLabel || (sourceKey === "client" ? "客户端 MCP" : "服务端");
    const source = sourceMap.get(sourceKey) || {
      key: sourceKey,
      label: sourceLabel,
      total: 0,
      domains: [],
    };
    source.total += 1;
    const domainKey = tool.groupKey || `${sourceKey}.${tool.category || "other"}`;
    let domain = source.domains.find((item) => item.key === domainKey);
    if (!domain) {
      domain = {
        key: domainKey,
        label: tool.groupLabel || getCategoryLabel(tool.category),
        tools: [],
      };
      source.domains.push(domain);
    }
    domain.tools.push(tool);
    sourceMap.set(sourceKey, source);
  }
  return Array.from(sourceMap.values());
});

const toolSourceFilters = computed(() => [
  { key: "all", label: "全部" },
  { key: "server", label: "服务端" },
  { key: "client", label: "客户端 MCP" },
]);

function getCategoryLabel(key: string) {
  const m: Record<string, string> = {
    system: "系统",
    temu: "Temu",
    browser: "浏览器",
    material: "素材",
    product: "商品",
    shop: "店铺",
    publish: "发布",
    statistics: "统计",
    "ps-automation": "PS",
    ai: "AI",
    other: "其他",
  };
  return m[key] || key;
}

function toggleToolExpand(tool: any) {
  expandedTool.value = expandedTool.value === tool.name ? null : tool.name;
}

function toggleToolSource(key: string) {
  const next = new Set(expandedToolSources.value);
  next.has(key) ? next.delete(key) : next.add(key);
  expandedToolSources.value = next;
}

function toggleToolGroup(key: string) {
  const next = new Set(expandedToolGroups.value);
  next.has(key) ? next.delete(key) : next.add(key);
  expandedToolGroups.value = next;
}

function formatToolResult(result: any) {
  if (!result) return "";
  if (typeof result === 'string') return result;
  if (result?.content?.[0]?.text) {
    const text = result.content[0].text;
    try {
      return JSON.stringify(JSON.parse(text), null, 2);
    } catch {
      return text.length > 500 ? text.slice(0, 500) + "..." : text;
    }
  }
  try {
    return JSON.stringify(result, null, 2);
  } catch {
    return String(result);
  }
}

function autoResize() {
  const el = textareaRef.value;
  if (!el) return;
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 200) + "px";
}

/** 智能滚动：底部跟随 + 用户上滚暂停 */
let scrollObserver: MutationObserver | null = null;
let resizeObs: ResizeObserver | null = null;
let stickToBottom = true;
let rafScheduled = false;

function isNearBottom(el: HTMLElement) {
  return el.scrollHeight - el.scrollTop - el.clientHeight <= 72;
}

function scheduleScrollToBottom() {
  if (rafScheduled || !stickToBottom) return;
  rafScheduled = true;
  requestAnimationFrame(() => {
    rafScheduled = false;
    if (stickToBottom && chatScrollRef.value) {
      chatScrollRef.value.scrollTo({
        top: chatScrollRef.value.scrollHeight,
        behavior: 'smooth',
      });
    }
  });
}

function scrollToBottom() {
  stickToBottom = true;
  scheduleScrollToBottom();
}

function initSmartScroll() {
  const el = chatScrollRef.value;
  if (!el) return;

  el.addEventListener('scroll', () => {
    stickToBottom = isNearBottom(el);
  });

  scrollObserver = new MutationObserver(scheduleScrollToBottom);
  scrollObserver.observe(el, {
    childList: true,
    characterData: true,
    subtree: true,
  });

  resizeObs = new ResizeObserver(scheduleScrollToBottom);
  resizeObs.observe(el);
}

function destroySmartScroll() {
  const el = chatScrollRef.value;
  if (el) el.removeEventListener('scroll', () => {});
  scrollObserver?.disconnect();
  resizeObs?.disconnect();
  scrollObserver = null;
  resizeObs = null;
}

function buildPageContext() {
  return {
    routePath: route.path,
    fullPath: route.fullPath,
    routeName: String(route.name || ""),
    routeTitle: String(route.meta?.title || ""),
    query: route.query,
    params: route.params,
  };
}

function handleSend() {
  if (!canSend.value || store.loading) return;
  const text = inputMessage.value.trim();
  if (!text) return;
  inputMessage.value = "";
  if (textareaRef.value) textareaRef.value.style.height = "auto";
  store.sendMessage(text, buildPageContext());
  scrollToBottom();
}

/** IME 感知：中文输入时不发送 */
function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey && !isComposing.value && !e.isComposing) {
    e.preventDefault();
    handleSend();
  }
}

async function handleRefresh() {
  store.resetLoadingState();
  try {
    await store.loadConversations();
    if (store.currentConversationId) {
      await store.loadMessages();
    }
    ElMessage.success("刷新成功");
  } catch (error) {
    console.error("刷新会话失败:", error);
  }
}

async function handleCreateConversation() {
  await store.createConversation();
  nextTick(() => textareaRef.value?.focus());
}
async function handleSelectConversation(id: number) {
  await store.selectConversation(id);
  nextTick(() => textareaRef.value?.focus());
}

function showConversationDetail(conv: any, event: MouseEvent) {
  hoveredConversation.value = conv;
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  const popupHeight = 200;
  const viewportHeight = window.innerHeight;
  let top = rect.top;
  if (top + popupHeight > viewportHeight) {
    top = viewportHeight - popupHeight - 16;
  }
  popupStyle.value = {
    position: "fixed",
    left: `${rect.right + 8}px`,
    top: `${top}px`,
  };
}

function hideConversationDetail() {
  hoveredConversation.value = null;
}

function formatTime(dateStr: string | null | undefined) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function hasMetric(value: number | string | null | undefined) {
  return value !== null && value !== undefined && Number.isFinite(Number(value));
}

function formatDuration(ms: number | string | null | undefined) {
  if (!hasMetric(ms)) return "-";
  const num = Math.max(0, Number(ms));
  if (num < 1000) return `${num}ms`;
  if (num < 60000) return `${(num / 1000).toFixed(1)}s`;
  return `${(num / 60000).toFixed(1)}min`;
}

function getMessageRunId(message: any) {
  return String(message.runId || message.runTrace?.runId || "").trim();
}

function getMessageToolDetails(message: any) {
  const tools = Array.isArray(message.runTrace?.tools) ? message.runTrace.tools : [];
  if (tools.length) return tools;
  if (!message.toolKey) return [];
  return [
    {
      tool: message.toolKey,
      label: message.toolLabel,
      success: message.toolResult?.success,
      summary: message.toolResult?.summary,
      durationMs: message.toolResult?.durationMs ?? message.toolExecutionMs,
      startedAt: message.toolResult?.startedAt || message.startedAt,
      completedAt: message.toolResult?.completedAt || message.completedAt,
    },
  ];
}

function getMessageDetailsTooltip(message: any) {
  const parts = [];
  if (hasMetric(message.durationMs)) parts.push(`总耗时 ${formatDuration(message.durationMs)}`);
  if (hasMetric(message.aiResponseMs)) parts.push(`AI ${formatDuration(message.aiResponseMs)}`);
  if (hasMetric(message.toolExecutionMs))
    parts.push(`工具 ${formatDuration(message.toolExecutionMs)}`);
  const tools = getMessageToolDetails(message);
  if (tools.length) parts.push(`${tools.length} 个工具`);
  return parts.length ? parts.join(" / ") : "查看消息详情";
}

function hasMessageDetails(message: any) {
  return Boolean(
    message.startedAt ||
    message.completedAt ||
    hasMetric(message.durationMs) ||
    hasMetric(message.aiResponseMs) ||
    hasMetric(message.toolExecutionMs) ||
    getMessageToolDetails(message).length ||
    getMessageRunId(message) ||
    message.toolKey,
  );
}

function handleInteractionSubmit(r: InteractionSubmitResult) {
  if (!store.pendingInteraction?.runId || store.loading) return;
  store.resumeInteraction(r.confirmed, r.input, r.reason || "");
}
function handleInteractionReject(r: InteractionSubmitResult) {
  const p = store.pendingInteraction;
  if (!p?.runId || store.loading) return;
  store.resumeInteraction(false, { ...(p.input || {}), action: "reject" }, r.reason || "跳过");
}

async function handleOpenToolDialog() {
  showToolDialog.value = true;
  toolsLoading.value = true;
  try {
    const data = await AiAssistantApi.getToolCatalog();
    allTools.value = (data.tools || []).map((t: any) => ({
      ...t,
      parameters: extractParams(t.inputSchema),
    }));
    toolCatalogUpdatedAt.value = data.generatedAt
      ? new Date(data.generatedAt).toLocaleTimeString()
      : "";
    handleToolSearch();
  } catch (e: any) {
    ElMessage.error(e?.message || "加载失败");
  } finally {
    toolsLoading.value = false;
  }
}

function extractParams(schema: any): any[] {
  if (!schema?.properties) return [];
  const req = schema.required || [];
  return Object.entries(schema.properties).map(([k, v]: [string, any]) => ({
    name: k,
    label: v.label || k,
    description: v.description || "",
    type: Array.isArray(v.type) ? v.type.join(" | ") : v.type || "any",
    required: req.includes(k),
  }));
}

function getToolParameters(tool: any) {
  return tool.parameters || [];
}

function handleToolSearch() {
  const q = toolSearchQuery.value.toLowerCase().trim();
  filteredTools.value = allTools.value.filter((t) => {
    const matchesSource =
      toolSourceFilter.value === "all" ||
      (toolSourceFilter.value === "client" ? t.runtime === "client" : t.runtime !== "client");
    const matchesQuery =
      !q ||
      t.name.toLowerCase().includes(q) ||
      String(t.label || "")
        .toLowerCase()
        .includes(q) ||
      String(t.description || "")
        .toLowerCase()
        .includes(q);
    return matchesSource && matchesQuery;
  });
}

function setToolSourceFilter(filter: string) {
  toolSourceFilter.value = filter;
  handleToolSearch();
}

function toggleTool(toolId: string) {
  const next = new Set(expandedTools.value);
  next.has(toolId) ? next.delete(toolId) : next.add(toolId);
  expandedTools.value = next;
}

function formatJson(value: any): string {
  try {
    return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  } catch {
    return String(value || '');
  }
}

async function copyText(text: string, msgId: string | number) {
  try {
    await navigator.clipboard.writeText(text);
    copiedMessageId.value = msgId;
    setTimeout(() => {
      copiedMessageId.value = null;
    }, 1500);
  } catch {
    ElMessage.error('复制失败');
  }
}


function handleMcpAsyncResult(data: { requestId: string; toolName: string; result: any }) {
  const { toolName, result } = data || {};
  if (!result) return;
  const text = result?.content?.[0]?.text || JSON.stringify(result);
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text;
  }
  const display = typeof parsed === "object" ? JSON.stringify(parsed, null, 2) : String(parsed);
  store.addSystemMessage(`[客户端工具 ${toolName}] 执行完成:\n${display}`);
}

/** 获取消息关联的 Agent Run Stage 进度 */
function getRunStages(runId: string | undefined) {
  if (!runId) return [];
  return store.agentRunStages.get(runId) || [];
}

/** Stage 状态文本 */
function stageStatusText(status: string): string {
  const map: Record<string, string> = {
    pending: "等待中",
    running: "执行中",
    success: "完成",
    failed: "失败",
    timeout: "超时",
    waiting: "待审批",
  };
  return map[status] || status;
}

// 保留 watch 作为兜底（MutationObserver 已处理主要场景）
watch(() => store.messages.length, scrollToBottom);
watch(() => store.loading, scrollToBottom);

// Auto-expand running tools
watch(
  () => store.messages.map(m => m.toolCalls?.map(tc => `${tc.id}:${tc.status}`).join(',')).join('|'),
  () => {
    store.messages.forEach(m => {
      m.toolCalls?.forEach(tc => {
        if (tc.status === 'running') {
          expandedTools.value.add(tc.id);
        }
      });
    });
  }
);

onMounted(() => {
  store.initialize();
  websocketClient.events.on("mcp-async-result", handleMcpAsyncResult);
  handleResizeOpen();
  streamBrand();
  window.addEventListener("resize", handleResizeOpen);
  // 初始化智能滚动（等 DOM 渲染后）
  nextTick(() => initSmartScroll());
});

onUnmounted(() => {
  websocketClient.events.off("mcp-async-result", handleMcpAsyncResult);
  window.removeEventListener("resize", handleResizeOpen);
  destroySmartScroll();
  if (brandTimer) clearTimeout(brandTimer);
});
</script>

<style>
@import "./agent-chat.css";
</style>

<style scoped>
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}




/* ── Mobile ── */
@media (width <=768px) {
  .sidebar {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    z-index: 100;
    width: 260px;
    transform: translateX(-100%);
    box-shadow: 4px 0 20px rgb(0 0 0 / 15%);
    transition: transform 0.2s ease;
  }

  .ai-desktop--sidebar-open .sidebar {
    transform: translateX(0);
  }

  .ai-desktop--sidebar-open::after {
    position: fixed;
    z-index: 99;
    background: var(--el-overlay-color);
    content: "";
    inset: 0;
  }

  .topbar__menu {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .topbar {
    padding: 0 12px;
    gap: 8px;
  }

  .topbar__title {
    overflow: hidden;
    font-size: 13px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .topbar__btn {
    height: 28px;
    padding: 0 8px;
    font-size: 12px;
  }

  .chat__list {
    padding: 0 12px;
  }

  .chat__scroll {
    padding-bottom: 70px;
  }

  .msg {
    gap: 8px;
  }

  .msg--user .msg__body {
    max-width: 90%;
  }

  .msg__content {
    font-size: 13px;
  }
}

@media (width <=480px) {
  .sidebar {
    width: 240px;
  }

  .chat__list {
    padding: 0 8px;
  }

  .msg--user .msg__text {
    padding: 8px 12px;
    font-size: 13px;
  }

  .msg--user .msg__body {
    max-width: 92%;
  }

  .tools-dialog__body {
    height: calc(100vh - 48px);
  }

  .tools-dialog__search {
    padding: 10px 12px;
  }
}

.ai-desktop {
  --bg: var(--app-content-bg-color);
  --surface: var(--app-content-surface-color);
  --surface-hover: var(--el-fill-color-light);
  --border: var(--app-content-border-color);
  --ai-sidebar-bg: #f4f6f8;
  --ai-border: rgba(148, 163, 184, 0.18);
  --ai-item-hover: rgba(148, 163, 184, 0.08);
  --ai-item-active: rgba(148, 163, 184, 0.12);
  --text: var(--el-text-color-primary);
  --text-2: var(--el-text-color-regular);
  --text-3: var(--el-text-color-secondary);
  --primary: var(--el-color-primary);
  --success: var(--el-color-success);
  --danger: var(--el-color-danger);

  display: flex;
  height: 100%;
  min-height: 0;
  font-family:
    Inter,
    "SF Pro Display",
    system-ui,
    -apple-system,
    sans-serif;
  color: var(--text);
  background: var(--bg);
}

/* ── Sidebar ── */
.sidebar {
  display: flex;
  width: 260px;
  background: var(--ai-sidebar-bg);
  border-right: 1px solid var(--ai-border);
  flex-shrink: 0;
  flex-direction: column;
  position: relative;
}

/* ── Sidebar Header ── */
.sidebar__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 60px;
  padding: 20px 14px 10px;
  flex-shrink: 0;
}

.sidebar__brand {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.sidebar__brand-text {
  font-size: 15px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: 0.01em;
  white-space: nowrap;
}

.sidebar__brand-cursor {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--el-color-primary);
  animation: brandBreathe 1.8s ease-in-out infinite;
}

@keyframes brandBreathe {
  0%, 100% { opacity: 0.55; }
  50% { opacity: 1; }
}

.is-loading {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}


/* ── New Button ── */
.sidebar__new-btn {
  display: flex;
  width: 100%;
  min-height: 36px;
  align-items: center;
  gap: 10px;
  padding: 0 12px;
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 8px;
  text-align: left;
  transition: background 150ms ease;
}

.sidebar__new-btn:hover {
  background: var(--ai-item-hover);
}

.sidebar__new-btn .el-icon {
  font-size: 14px;
  color: var(--text-2);
}


.topbar__btn--danger {
  color: #f56c6c !important;
}

.topbar__btn--danger:hover {
  background: rgba(245, 108, 108, 0.1) !important;
}

.sidebar__nav {
  min-height: 0;
  padding: 6px 10px;
  overflow: hidden auto;
  flex: 1;
}

.sidebar__section {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sidebar__section-label {
  padding: 8px 12px 4px;
  font-size: 10px;
  font-weight: 600;
  color: var(--text-3);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.sidebar__item {
  display: flex;
  width: 100%;
  min-height: 34px;
  padding: 0 12px;
  font-size: 12.5px;
  color: var(--text-2);
  text-align: left;
  cursor: pointer;
  background: none;
  border: none;
  border-radius: 8px;
  transition: background 150ms ease;
  align-items: center;
  gap: 10px;
}

.sidebar__item:hover {
  color: var(--text);
  background: var(--ai-item-hover);
}

.sidebar__item.active {
  color: var(--text);
  background: var(--ai-item-active);
  font-weight: 550;
}

.sidebar__item-text {
  display: block;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.sidebar__item-main {
  flex: 1;
  min-width: 0;
}

.sidebar__item-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
  font-size: 11px;
  color: var(--text-3);
}

.sidebar__item-count {
  color: var(--text-3);
}

.sidebar__item-status {
  padding: 1px 6px;
  font-size: 10px;
  border-radius: 4px;
}

.sidebar__item-status--running {
  color: var(--el-color-primary);
  background: color-mix(in srgb, var(--el-color-primary) 15%, transparent);
}

.sidebar__item-status--error {
  color: #ef4444;
  background: rgb(239 68 68 / 15%);
}

.conversation-detail-popup {
  z-index: 2000;
  width: 280px;
  padding: 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: 0 12px 40px rgb(0 0 0 / 0.18), 0 2px 8px rgb(0 0 0 / 0.06);
  animation: fadeIn 0.15s ease;
  position: fixed;
}

html.dark .ai-desktop .conversation-detail-popup {
  background: #1a1a1a;
  border-color: rgba(255, 255, 255, 0.08);
  box-shadow: 0 12px 40px rgb(0 0 0 / 0.5), 0 2px 8px rgb(0 0 0 / 0.3);
}

.conversation-detail-header {
  padding-bottom: 8px;
  margin-bottom: 12px;
  border-bottom: 1px solid var(--agent-border-soft);
}

.conversation-detail-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}

.conversation-detail-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
}

.detail-label {
  color: var(--text-3);
}

.detail-value {
  font-weight: 500;
  color: var(--text);
}

.sidebar__item-del {
  display: flex;
  width: 20px;
  height: 20px;
  font-size: 14px;
  line-height: 1;
  color: var(--text-3);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 4px;
  opacity: 0;
  transition: opacity 0.1s;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.sidebar__item-del:hover {
  color: var(--text);
}

.sidebar__item:hover .sidebar__item-del {
  opacity: 1;
}

.sidebar__empty {
  padding: 20px 10px;
  font-size: 12px;
  color: var(--text-3);
  text-align: center;
  line-height: 1.5;
}

.sidebar__bottom {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  padding: 8px 12px 12px;
}

.sidebar__item--icon {
  display: flex;
  width: 32px;
  height: 32px;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: background 150ms ease;
  color: var(--text-3);
  cursor: pointer;
  background: transparent;
  border: none;
}

.sidebar__item--icon:hover {
  color: var(--text);
  background: var(--ai-item-hover);
}

.sidebar__item--danger:hover {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.08);
}

/* ── Workspace ── */
.workspace {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex: 1;
  flex-direction: column;
}

/* ── Topbar ── */
.topbar {
  display: flex;
  height: 44px;
  padding: 0 16px;
  background: var(--bg);
  border-bottom: 1px solid var(--border);
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.topbar__left {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  gap: 8px;
}

.topbar__title {
  overflow: hidden;
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.topbar__right {
  display: flex;
  align-items: center;
  gap: 4px;
}

.topbar__menu {
  display: none;
  width: 32px;
  height: 32px;
  font-size: 16px;
  color: var(--text-2);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 6px;
  transition: background 0.12s;
  flex-shrink: 0;
}

.topbar__menu:hover {
  color: var(--text);
  background: var(--surface-hover);
}

.topbar__btn {
  height: 28px;
  padding: 0 10px;
  font-size: 12px;
  color: var(--text-2);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 6px;
  transition: all 0.15s;
}

.topbar__btn:hover {
  color: var(--text);
  background: var(--surface-hover);
}

.topbar__btn--icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.topbar__btn--icon:hover {
  color: var(--primary);
  background: color-mix(in srgb, var(--el-color-primary) 10%, transparent);
  transform: scale(1.1);
}

.topbar__btn--icon:active {
  transform: scale(0.95);
}

.topbar__btn--icon .el-icon {
  font-size: 14px;
  transition: transform 0.2s ease;
}

.topbar__btn--icon:hover .el-icon {
  transform: scale(1.15);
}

/* ── Chat ── */
.chat {
  position: relative;
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
}

.chat__scroll {
  min-height: 0;
  padding: 24px 8px 100px;
  overflow-y: auto;
  flex: 1;
}

.chat__list {
  width: 100%;
  padding: 0 40px;
}

.chat__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 0;
}

.chat__empty-text {
  font-size: 16px;
  font-weight: 500;
  color: var(--agent-muted);
  margin: 0;
}

/* ── Composer 容器 ── */
.composer {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  padding: 0 40px 16px;
  pointer-events: none;
  background: var(--bg);
}

/* ── Popover (global) ── */
:global(.ai-message-detail-popover) {
  padding: 10px 12px;
  border-radius: 6px;
}

/* ── Tools Dialog (dark) ── */
.tools-dialog :deep(.el-dialog) {
  background: var(--surface) !important;
}

.tools-dialog :deep(.el-dialog__header) {
  padding: 12px 16px;
  margin: 0;
  border-bottom: 1px solid var(--border);
}

.tools-dialog :deep(.el-dialog__title) {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}

.tools-dialog :deep(.el-dialog__body) {
  padding: 0;
  color: var(--text);
}

.tools-dialog :deep(.el-dialog__headerbtn .el-dialog__close) {
  color: var(--text-2);
}

.tools-dialog__body {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 48px);
}

.tools-dialog__search {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}

.tools-dialog__search :deep(.el-input__wrapper) {
  background: var(--surface);
  box-shadow: 0 0 0 1px var(--border);
}

.tools-dialog__search :deep(.el-input__inner) {
  color: var(--text);
}

.tools-dialog__search :deep(.el-input__prefix .el-icon) {
  color: var(--text-3);
}

.tools-dialog__count {
  font-size: 12px;
  color: var(--text-3);
}

.tools-dialog__summary {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 8px 16px 0;
  font-size: 12px;
  color: var(--text-2);
}

.tools-dialog__updated {
  color: var(--text-3);
}

.tools-dialog__filters {
  display: flex;
  gap: 6px;
  padding: 8px 16px;
}

.tools-filter {
  padding: 4px 10px;
  font-size: 12px;
  color: var(--text-2);
  cursor: pointer;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 999px;
}

.tools-filter.active {
  color: var(--primary);
  border-color: var(--primary);
}

.tools-dialog__list {
  flex: 1;
  min-height: 0;
}

.tools-dialog__loading {
  display: flex;
  justify-content: center;
  padding: 40px;
  color: var(--text-3);
}

.tools-tree__source {
  border-bottom: 1px solid var(--border);
}

.tools-tree__source-head,
.tools-tree__domain-head {
  display: flex;
  width: 100%;
  color: var(--text);
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
  align-items: center;
  gap: 8px;
}

.tools-tree__source-head {
  padding: 12px 16px;
  background: var(--bg);
}

.tools-tree__source-head strong {
  font-size: 13px;
}

.tools-tree__source-head em,
.tools-tree__domain-head em {
  margin-left: auto;
  font-size: 10px;
  font-style: normal;
  color: var(--text-3);
}

.tools-tree__domain-head {
  padding: 9px 16px 9px 28px;
  color: var(--text-2);
  border-top: 1px solid var(--border);
}

.tools-tree__domain-head:hover,
.tools-tree__source-head:hover {
  background: var(--surface-hover);
}

.tools-tree__arrow {
  display: inline-flex;
  width: 14px;
  font-size: 18px;
  line-height: 1;
  color: var(--text-3);
  transition: transform 0.15s ease;
  justify-content: center;
}

.tools-tree__arrow.expanded {
  transform: rotate(90deg);
}

.tools-tree__tools {
  padding-left: 28px;
}

.tools-tree__children {
  padding: 5px 0;
  margin: 0 12px 8px 42px;
  border-left: 1px solid var(--border);
}

.tools-tree__child {
  display: grid;
  min-height: 28px;
  padding: 4px 10px;
  font-size: 11px;
  color: var(--text-2);
  grid-template-columns: 18px 150px 110px minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
}

.tools-tree__child:hover {
  background: var(--surface-hover);
}

.tools-tree__child-marker {
  color: var(--text-3);
}

.tools-tree__child code {
  font-family: monospace;
  color: var(--text);
}

.tools-tree__child strong {
  font-weight: 600;
  color: var(--text-2);
}

.tools-tree__child-description,
.tools-tree__child-count {
  overflow: hidden;
  color: var(--text-3);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tools-tree__child-count {
  color: var(--text-2);
}

.tools-group__title {
  display: flex;
  padding: 10px 16px 4px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.4px;
  color: var(--text-3);
  text-transform: uppercase;
  align-items: center;
  justify-content: space-between;
}

.tools-group__title em {
  min-width: 18px;
  padding: 2px 5px;
  font-size: 10px;
  font-style: normal;
  color: var(--text-3);
  text-align: center;
  background: var(--bg);
  border-radius: 999px;
}

.tools-row {
  padding: 8px 16px;
  cursor: pointer;
  border-left: 2px solid transparent;
  transition: background 0.1s;
}

.tools-row:hover {
  background: var(--surface-hover);
}

.tools-row.expanded {
  background: var(--surface);
  border-left-color: var(--primary);
}

.tools-row__head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tools-row__name {
  font-family: monospace;
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
}

.tools-row__label {
  font-size: 12px;
  color: var(--text-2);
}

.tools-row__runtime {
  padding: 2px 6px;
  margin-left: auto;
  font-size: 10px;
  white-space: nowrap;
  border-radius: 4px;
}

.tools-row__runtime.is-server {
  color: var(--primary);
  background: color-mix(in srgb, var(--el-color-primary) 10%, transparent);
}

.tools-row__runtime.is-client {
  color: #67c23a;
  background: rgb(103 194 58 / 12%);
}

.tools-row__desc {
  margin-top: 2px;
  overflow: hidden;
  font-size: 11px;
  color: var(--text-3);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tools-row__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 6px;
}

.tools-row__chips span {
  padding: 2px 6px;
  font-size: 10px;
  color: var(--text-3);
  background: var(--bg);
  border-radius: 4px;
}

.tools-row__chips span.is-warning {
  color: #e6a23c;
  background: rgb(230 162 60 / 12%);
}

.tools-row__detail {
  padding: 8px;
  margin-top: 6px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
}

.tools-row__meta {
  display: flex;
  margin-bottom: 8px;
  font-size: 11px;
  color: var(--text-3);
  flex-wrap: wrap;
  gap: 6px 14px;
}

.tools-row__param {
  display: flex;
  padding: 4px 0;
  font-size: 11px;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}

.tools-row__param code {
  min-width: 80px;
  font-family: monospace;
  font-weight: 600;
  color: var(--text);
}

.tools-row__param .req {
  font-size: 10px;
  color: var(--danger);
}

.tools-row__param .type {
  font-size: 10px;
  color: var(--text-3);
}

.tools-row__param small {
  line-height: 1.4;
  color: var(--text-3);
}

.tools-row__clients {
  display: flex;
  margin-top: 8px;
  font-size: 11px;
  color: var(--text-3);
  flex-wrap: wrap;
  gap: 6px;
}

.tools-row__children {
  padding-top: 8px;
  margin-top: 10px;
  border-top: 1px solid var(--border);
}

.tools-row__children-title {
  margin-bottom: 5px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-2);
}

.tools-row__child {
  display: grid;
  padding: 3px 0;
  font-size: 11px;
  color: var(--text-2);
  grid-template-columns: 18px 150px 110px minmax(0, 1fr);
  gap: 8px;
  align-items: baseline;
}

.tools-row__child::before {
  color: var(--text-3);
  content: "↳";
}

.tools-row__child code {
  font-family: monospace;
  color: var(--text);
}

.tools-row__child small {
  color: var(--text-3);
}

/* ════════════════════════════════════════
   AI Assistant — Dark Mode Overrides
   ════════════════════════════════════════ */
html.dark .ai-desktop {
  --bg: #000000;
  --surface: #000000;
  --ai-sidebar-bg: #000000;
  --ai-border: rgba(255, 255, 255, 0.06);
  --ai-item-hover: rgba(255, 255, 255, 0.04);
  --ai-item-active: rgba(255, 255, 255, 0.07);
  --border: rgba(255, 255, 255, 0.06);
  --surface-hover: rgba(255, 255, 255, 0.04);
  --agent-reasoning-bg: color-mix(in srgb, var(--surface) 94%, transparent);
  --agent-stage-connector: rgba(255, 255, 255, 0.08);
}

html.dark .agent-scroll-bottom {
  box-shadow: 0 2px 8px rgb(0 0 0 / 30%);
}
</style>
