import { ref, computed } from "vue";
import { defineStore } from "pinia";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  AiAssistantApi,
  type AiAssistantConversation,
  type AiAssistantMessage,
  type AiAssistantPageContext,
} from "@/api/aiAssistant";
import type {
  InteractionPayload,
} from "@/components/AiAssistant/interactions/types";
import { AgentRunApi } from "@/api/agentRun";
import {
  markAiAssistantRuntimeIdle,
  markAiAssistantRuntimeRunning,
} from "@/services/aiAssistantRuntimeState";
import { useWorkflowAiContext } from "@/composables/useWorkflowAiContext";
import { websocketClient } from "@/services/websocketClient";

// ========== Internal Types ==========

interface StreamContext {
  fullReply: string;
  assistantMsg: AiAssistantMessage | null;
}

/** Agent Run Stage 进度追踪 */
export interface AgentRunStageProgress {
  stageIndex: number;
  capabilityId: string;
  name: string;
  status: "pending" | "running" | "success" | "failed" | "timeout" | "waiting";
  output?: Record<string, any>;
  error?: string;
  durationMs?: number;
}

/** 模块级 WebSocket 订阅清理函数 */
let agentRunUnsubscribe: (() => void) | null = null;

// ========== Store ==========

export const useAiAssistantStore = defineStore("ai-assistant", () => {
  // ========== Workflow Context (singleton) ==========
  const { workflowContext } = useWorkflowAiContext();

  // ========== State ==========

  const conversations = ref<AiAssistantConversation[]>([]);
  const messages = ref<AiAssistantMessage[]>([]);
  const currentConversationId = ref<number | null>(null);
  const loading = ref(false);
  const historyLoading = ref(false);
  const runtimeStatus = ref("idle");
  const thinkingText = ref("");
  const currentRunId = ref("");
  const pendingInteraction = ref<InteractionPayload | null>(null);

  // ========== Agent Run Stage 进度 ==========

  const agentRunStages = ref<Map<string, AgentRunStageProgress[]>>(new Map());

  // ========== Reasoning 思考块 ==========

  const expandedReasoning = ref<Set<string | number>>(new Set());
  const reasoningStartTimes = ref<Map<string | number, number>>(new Map());
  const reasoningDurations = ref<Map<string | number, number>>(new Map());

  // ========== Computed ==========

  const activeConversation = computed(() =>
    conversations.value.find((item) => item.id === currentConversationId.value),
  );

  const activeConversationTitle = computed(() => activeConversation.value?.title || "新会话");

  const statusText = computed(() => {
    if (pendingInteraction.value) return "等待用户参与";
    if (loading.value) {
      return runtimeStatus.value === "tool_calling" ? "工具执行中" : "流式响应中";
    }
    if (activeConversation.value?.lastMessageAt) {
      const d = activeConversation.value.lastMessageAt;
      return `最近更新 ${formatRelativeTime(d)}`;
    }
    return "";
  });

  const senderPlaceholder = computed(() => {
    if (pendingInteraction.value) return "可以先输入下一条消息，完成上方交互后再发送";
    if (loading.value) return "智能助手正在处理";
    return "输入你的目标或问题";
  });

  const canSend = computed(() => !loading.value && !pendingInteraction.value);

  const hasPendingAssistantMessage = computed(() =>
    messages.value.some(
      (msg) =>
        msg.role === "assistant" && !msg.content && msg.runTrace?.runId === currentRunId.value,
    ),
  );

  const promptItems = [
    { key: "page", label: "分析当前页" },
    { key: "plan", label: "拆解任务" },
    { key: "confirm", label: "确认需求" },
  ];

  // ========== Internal Helpers ==========

  function formatRelativeTime(value?: string | null) {
    if (!value) return "";
    try {
      const d = new Date(value);
      if (isNaN(d.getTime())) return "";
      const now = new Date();
      const sameDay =
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate();
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      if (sameDay) return `${hh}:${mm}`;
      const MM = String(d.getMonth() + 1).padStart(2, "0");
      const DD = String(d.getDate()).padStart(2, "0");
      return `${MM}-${DD} ${hh}:${mm}`;
    } catch {
      return "";
    }
  }



  function createLocalMessage(partial: Partial<AiAssistantMessage>): AiAssistantMessage {
    return {
      id: Date.now() + Math.random(),
      conversationId: currentConversationId.value,
      role: partial.role || "assistant",
      content: partial.content || "",
      attachments: partial.attachments || [],
      pageContext: partial.pageContext || null,
      toolKey: partial.toolKey || null,
      toolLabel: partial.toolLabel || null,
      toolInput: partial.toolInput || null,
      toolResult: partial.toolResult || null,
      runTrace: partial.runTrace || null,
      createdAt: new Date().toISOString(),
    };
  }

  function normalizeInteractionType(type: string): string {
    const normalized = String(type || "").trim();
    const valid = [
      "confirm",
      "input",
      "choice",
      "form",
      "feedback",
      "clarify",
      "impact_preview",
      "plan_edit",
      "compare",
      "step_form",
    ];
    if (valid.includes(normalized)) return normalized;
    return "input";
  }

  // ========== Conversation Actions ==========

  async function loadConversations() {
    try {
      conversations.value = await AiAssistantApi.getConversations();
    } catch (error) {
      console.error("加载会话列表失败:", error);
      ElMessage.error("加载会话失败");
    }
  }

  async function loadMessages() {
    historyLoading.value = true;
    try {
      messages.value = dedupeRunMessages(
        await AiAssistantApi.getMessages({
          conversationId: currentConversationId.value || undefined,
        }),
      );
    } catch (error) {
      console.error("加载消息失败:", error);
      ElMessage.error("加载消息失败");
    } finally {
      historyLoading.value = false;
    }
  }

  async function selectConversation(id: number) {
    if (currentConversationId.value === id) return;
    currentConversationId.value = id;
    pendingInteraction.value = null;
    await loadMessages();
  }

  async function createConversation() {
    try {
      const result = await AiAssistantApi.createConversation({
        title: "新会话",
      });
      conversations.value.unshift(result);
      currentConversationId.value = result.id;
      messages.value = [];
      pendingInteraction.value = null;
    } catch (error) {
      ElMessage.error("创建会话失败");
    }
  }

  async function deleteConversation(id: number) {
    try {
      await ElMessageBox.confirm("确认删除此会话？", "提示", {
        type: "warning",
      });
      await AiAssistantApi.deleteConversation(id);
      conversations.value = conversations.value.filter((c) => c.id !== id);
      if (currentConversationId.value === id) {
        currentConversationId.value = conversations.value[0]?.id || null;
        messages.value = [];
        if (currentConversationId.value) {
          await loadMessages();
        }
      }
      ElMessage.success("已删除");
    } catch (error) {
      if (error !== "cancel") ElMessage.error("删除失败");
    }
  }

  async function clearAllConversations() {
    try {
      await ElMessageBox.confirm("确认要清空所有会话及其全部历史对话记录吗？此操作不可撤销！", "清空所有对话", {
        type: "warning",
        confirmButtonText: "确定清空",
        cancelButtonText: "取消",
      });
      await AiAssistantApi.clearAllConversations();
      conversations.value = [];
      currentConversationId.value = null;
      messages.value = [];
      pendingInteraction.value = null;
      ElMessage.success("已清空所有会话与对话记录");
    } catch (error) {
      if (error !== "cancel") ElMessage.error("清空失败");
    }
  }

  // ========== Stream Handling ==========

  function ensureAssistantMessage(context: StreamContext) {
    if (context.assistantMsg) return context.assistantMsg;
    context.assistantMsg = createLocalMessage({
      role: "assistant",
      content: "",
      runTrace: { runId: currentRunId.value },
    });
    messages.value.push(context.assistantMsg);
    return context.assistantMsg;
  }

  function appendAssistantDelta(content: string, context: StreamContext) {
    if (!content) return;
    const assistantMessage = ensureAssistantMessage(context);
    context.fullReply += content;
    assistantMessage.content = context.fullReply;
  }

  function buildToolResultSummary(data: any): string {
    const result = data?.data;
    if (!result) return data?.summary || "执行完成";

    const total = result.total;
    const count = result.count;
    const label = result.label || data?.label || "";

    if (typeof total === "number") {
      const prefix = label ? `${label}：` : "";
      if (typeof count === "number" && count !== total) {
        return `${prefix}共 ${total} 条，当前页 ${count} 条`;
      }
      return `${prefix}共 ${total} 条`;
    }

    if (Array.isArray(result.items)) {
      return `${label || "结果"}：返回 ${result.items.length} 条`;
    }

    if (result.success === true && result.message) {
      return result.message;
    }

    return data?.summary || "执行完成";
  }

  function upsertToolMessage(
    toolKey: string,
    label: string,
    content: string,
    payload: Record<string, any>,
  ) {
    const runId = payload?.runId || currentRunId.value;
    const existing = [...messages.value]
      .reverse()
      .find(
        (msg) => msg.role === "tool" && msg.toolKey === toolKey && msg.runTrace?.runId === runId,
      );

    if (existing) {
      existing.content = content;
      existing.toolResult = payload.toolResult || existing.toolResult;
      return;
    }

    messages.value.push(
      createLocalMessage({
        role: "tool",
        content,
        toolKey,
        toolLabel: label || toolKey,
        toolInput: payload.input || null,
        toolResult: payload.toolResult || null,
        runTrace: { runId },
      }),
    );
  }

  function applyInterrupt(payload: any) {
    const interrupt = payload || {};
    const runId = interrupt.runId || currentRunId.value;
    const question = interrupt.question || "需要你确认后继续。";

    if (
      pendingInteraction.value &&
      pendingInteraction.value.runId === runId &&
      pendingInteraction.value.question === question
    ) {
      return;
    }

    pendingInteraction.value = {
      type: normalizeInteractionType(interrupt.type),
      runId,
      question,
      tool: interrupt.tool,
      toolName: interrupt.toolName,
      label: interrupt.label,
      input: interrupt.input || {},
      options: interrupt.options || [],
      multiple: interrupt.multiple === true,
      fields: interrupt.fields || [],
      placeholder: interrupt.placeholder || "",
      defaultValue: interrupt.defaultValue,
      riskLevel: interrupt.riskLevel,
      preview: interrupt.preview,
      plan: interrupt.plan,
      compare: interrupt.compare,
      steps: interrupt.steps,
    } as InteractionPayload;

    const alreadyInserted = [...messages.value].reverse().some((msg) => {
      const traceInterrupt = msg.runTrace?.interrupt;
      return (
        msg.role === "assistant" &&
        msg.content === question &&
        (traceInterrupt?.runId || msg.runTrace?.runId) === runId
      );
    });
    if (alreadyInserted) return;

    messages.value.push(
      createLocalMessage({
        role: "assistant",
        content: question,
        runTrace: { interrupt, runId },
      }),
    );
  }

  function handleStreamEvent(event: string, data: any, context: StreamContext) {
    if (data?.runId) currentRunId.value = data.runId;
    if (data?.conversationId) {
      currentConversationId.value = Number(data.conversationId);
    }

    switch (event) {
      case "run.started":
      case "run.resumed":
        runtimeStatus.value = "thinking";
        thinkingText.value = "正在分析你的需求...";
        ensureAssistantMessage(context);
        // 记录思考开始
        if (context.assistantMsg?.id) {
          markReasoningStart(context.assistantMsg.id);
        }
        break;
      case "assistant.status":
        runtimeStatus.value = data?.status || "thinking";
        if (data?.message) {
          thinkingText.value = data.message;
        } else {
          if (data?.status === "thinking") thinkingText.value = "正在思考...";
          if (data?.status === "tool_calling") thinkingText.value = "正在准备调用工具...";
        }
        break;
      case "assistant.plan":
        runtimeStatus.value = "tool_calling";
        (data?.toolCalls || []).forEach((toolCall: any) => {
          thinkingText.value = `正在调用：${toolCall.label || toolCall.tool}`;
          upsertToolMessage(
            toolCall.tool,
            toolCall.label,
            `准备调用：${toolCall.label || toolCall.tool}`,
            data,
          );
        });
        break;
      case "tool.pending":
        runtimeStatus.value = "tool_calling";
        thinkingText.value = `正在执行：${data.label || data.tool}`;
        upsertToolMessage(data.tool, data.label, "执行中...", data);
        break;
      case "tool.completed": {
        thinkingText.value = `${data.label || data.tool} 执行完成，正在整理结果...`;
        const resultSummary = buildToolResultSummary(data);
        upsertToolMessage(data.tool, data.label, resultSummary, {
          ...data,
          toolResult: {
            success: true,
            summary: resultSummary,
            data: data.data,
            durationMs: data.durationMs ?? null,
            startedAt: data.startedAt ?? null,
            completedAt: data.completedAt ?? null,
          },
        });
        break;
      }
      case "tool.error":
        thinkingText.value = `${data.label || data.tool} 执行出错，正在处理...`;
        upsertToolMessage(data.tool, data.label, data.error || "执行失败", {
          ...data,
          toolResult: {
            success: false,
            error: data.error,
            durationMs: data.durationMs ?? null,
            startedAt: data.startedAt ?? null,
            completedAt: data.completedAt ?? null,
          },
        });
        break;
      case "assistant.answer.delta":
        thinkingText.value = "正在回复...";
        appendAssistantDelta(data?.content || data?.delta || "", context);
        // 首次收到内容 → 思考结束
        if (context.assistantMsg?.id && !reasoningDurations.value.has(context.assistantMsg.id)) {
          markReasoningEnd(context.assistantMsg.id);
        }
        break;
      case "interrupt":
      case "run.waiting":
        applyInterrupt(data?.interrupt || data);
        loading.value = false;
        runtimeStatus.value = "waiting_user";
        break;
      case "agent-run.created":
        // AI 助手委托给 Agent Run Engine — 关联 runId 到当前 assistant 消息
        if (context.assistantMsg) {
          context.assistantMsg.runId = data?.runId || context.assistantMsg.runId;
          context.assistantMsg.runTrace = {
            ...(context.assistantMsg.runTrace || {}),
            runId: data?.runId || context.assistantMsg.runTrace?.runId,
            agentRunId: data?.agentRunId,  // arun_xxx — WebSocket 事件用的 ID
            agentRunEngine: true,
            totalStages: data?.totalStages,
            stages: data?.stages,
          };
        }
        // 初始化 Stage 进度追踪（同时追踪 airun 和 arun ID）
        if (data?.runId && Array.isArray(data?.stages)) {
          const stages: AgentRunStageProgress[] = data.stages.map((s: any) => ({
            stageIndex: s.index,
            capabilityId: s.capabilityId,
            name: s.name,
            status: s.status,
          }));
          agentRunStages.value.set(data.runId, stages);
          // 如果有 agentRunId（arun_xxx），也映射到同一 stages
          if (data?.agentRunId && data.agentRunId !== data.runId) {
            agentRunStages.value.set(data.agentRunId, stages);
          }
        }
        break;
      case "run.completed":
        if (data?.reply) {
          if (context.assistantMsg) {
            context.assistantMsg.content = data.reply;
          } else {
            context.assistantMsg = createLocalMessage({
              role: "assistant",
              content: data.reply,
              runTrace: { runId: data?.runId || currentRunId.value },
            });
            messages.value.push(context.assistantMsg);
          }
        } else if (context.assistantMsg && !context.assistantMsg.content) {
          context.assistantMsg.content = "已为您处理完成。";
        }
        if (context.assistantMsg) {
          context.assistantMsg.runId = data?.runId || context.assistantMsg.runId || currentRunId.value;
          context.assistantMsg.startedAt = data?.startedAt ?? context.assistantMsg.startedAt;
          context.assistantMsg.completedAt = data?.completedAt ?? context.assistantMsg.completedAt;
          context.assistantMsg.durationMs = data?.durationMs ?? context.assistantMsg.durationMs;
          context.assistantMsg.aiResponseMs = data?.aiResponseMs ?? context.assistantMsg.aiResponseMs;
          context.assistantMsg.toolExecutionMs = data?.toolExecutionMs ?? context.assistantMsg.toolExecutionMs;
          context.assistantMsg.runTrace = data?.runTrace || {
            ...(context.assistantMsg.runTrace || {}),
            runId: data?.runId || currentRunId.value,
            tools: data?.toolResults || [],
          };
        }
        loading.value = false;
        runtimeStatus.value = "idle";
        thinkingText.value = "";
        break;
      case "run.error":
      case "error":
        ElMessage.error(data?.error || "智能助手执行失败");
        loading.value = false;
        runtimeStatus.value = "idle";
        thinkingText.value = "";
        if (context.assistantMsg && !context.assistantMsg.content) {
          context.assistantMsg.content = "执行出现异常，请重试。";
        }
        break;
    }
  }

  async function consumeStream(
    start: (handlers: {
      onEvent: (event: { event: string; data: any }) => void;
      onError: (error: Error) => void;
      onDone: () => void;
    }) => Promise<void>,
  ) {
    const context: StreamContext = { fullReply: "", assistantMsg: null };
    try {
      await start({
        onEvent(event) {
          handleStreamEvent(event.event, event.data, context);
        },
        onError(error) {
          console.error("流式请求失败:", error);
          ElMessage.error("请求失败，请重试");
        },
        onDone() {
          loading.value = false;
        },
      });
    } catch (error) {
      console.error("发送失败:", error);
      ElMessage.error("发送失败");
    } finally {
      loading.value = false;
      if (!pendingInteraction.value) {
        runtimeStatus.value = "idle";
        thinkingText.value = "";
      }
      markAiAssistantRuntimeIdle();
      await loadConversations();
      if (currentConversationId.value) await loadMessages();
    }
  }

  // ========== Public Actions ==========

  async function sendMessage(message: string, pageContext?: AiAssistantPageContext) {
    if (!message || loading.value || pendingInteraction.value) return;

    loading.value = true;
    runtimeStatus.value = "thinking";
    thinkingText.value = "正在连接...";
    currentRunId.value = "";
    pendingInteraction.value = null;
    markAiAssistantRuntimeRunning();

    messages.value.push(createLocalMessage({ role: "user", content: message }));

    // 自动合并工作流上下文
    const finalPageContext: AiAssistantPageContext = {
      ...pageContext,
      workflowContext: workflowContext.value,
    }

    await consumeStream((handlers) =>
      AiAssistantApi.chatStream(
        {
          message,
          conversationId: currentConversationId.value || undefined,
          pageContext: finalPageContext,
        },
        handlers,
      ),
    );
  }

  async function resumeInteraction(
    confirmed: boolean,
    resumeInput: Record<string, any>,
    reason: string,
  ) {
    const runId = currentRunId.value;
    if (!runId || loading.value) return;

    loading.value = true;
    runtimeStatus.value = "thinking";
    markAiAssistantRuntimeRunning();

    await consumeStream((handlers) =>
      AiAssistantApi.resumeRunStream(
        runId,
        {
          conversationId: currentConversationId.value || undefined,
          confirmed,
          input: resumeInput,
          reason,
        },
        handlers,
      ),
    );
  }

  async function clearMessages() {
    try {
      await ElMessageBox.confirm("确认清空当前会话的所有消息？", "提示", {
        type: "warning",
      });
      await AiAssistantApi.clearMessages({
        conversationId: currentConversationId.value || undefined,
      });
      messages.value = [];
      pendingInteraction.value = null;
      ElMessage.success("已清空");
    } catch (error) {
      if (error !== "cancel") ElMessage.error("清空失败");
    }
  }

  /** Initialize store — load conversations & select first one if needed */
  async function initialize() {
    historyLoading.value = true;
    try {
      await loadConversations();
      if (conversations.value.length && !currentConversationId.value) {
        currentConversationId.value = conversations.value[0].id;
        await loadMessages();
      }
    } finally {
      historyLoading.value = false;
    }
    subscribeAgentRunEvents();
  }

  /** 订阅 Agent Run Engine WebSocket 事件 */
  function subscribeAgentRunEvents() {
    if (agentRunUnsubscribe) return; // 已订阅

    agentRunUnsubscribe = websocketClient.events.on("agent-run-event", (event) => {
      const { type, runId, data } = event || {};
      if (!runId) return;

      switch (type) {
        case "run.started": {
          currentRunId.value = runId;
          agentRunStages.value.set(runId, []);
          break;
        }
        case "run.stage.started": {
          const stages = agentRunStages.value.get(runId) || [];
          stages.push({
            stageIndex: data?.stageIndex ?? stages.length,
            capabilityId: data?.capabilityId || "",
            name: data?.name || data?.capabilityId || `Stage ${stages.length}`,
            status: "running",
          });
          agentRunStages.value.set(runId, stages);
          break;
        }
        case "run.stage.completed": {
          const stages = agentRunStages.value.get(runId) || [];
          const stage = stages.find((s) => s.stageIndex === data?.stageIndex);
          if (stage) {
            stage.status = "success";
            stage.output = data?.output;
          }
          break;
        }
        case "run.stage.failed":
        case "run.stage.timeout": {
          const stages = agentRunStages.value.get(runId) || [];
          const stage = stages.find((s) => s.stageIndex === data?.stageIndex);
          if (stage) {
            stage.status = type === "run.stage.timeout" ? "timeout" : "failed";
            stage.error = data?.error;
          }
          break;
        }
        case "run.waiting": {
          // 显示等待审批交互
          applyInterrupt({
            runId,
            type: "confirm",
            question: data?.question || "请确认是否继续",
            toolName: data?.name,
          });
          const stages = agentRunStages.value.get(runId) || [];
          const stage = stages.find((s) => s.stageIndex === data?.stageIndex);
          if (stage) stage.status = "waiting";
          break;
        }
        case "run.success":
        case "run.failed": {
          agentRunStages.value.delete(runId);
          // 查找关联的 assistant 消息（WebSocket runId 是 arun_xxx，匹配 agentRunId 或 runId）
          const linkedMsg = messages.value.find(
            (m) => m.role === "assistant" && (m.runTrace?.agentRunId === runId || m.runTrace?.runId === runId),
          );
          if (linkedMsg) {
            // 拉取 run 详情（含 artifacts / output）
            AgentRunApi.detail(runId).then((detail) => {
              if (type === "run.success") {
                // 拼接产物信息到消息内容
                const parts: string[] = ["✅ 任务执行完成"];
                if (detail.artifacts?.length) {
                  const artifactDescs = detail.artifacts
                    .map((a: any) => {
                      if (a.url) return `  - [${a.name || a.type}](${a.url})`;
                      if (a.contentText) return `  - ${a.name || a.type}: ${a.contentText.slice(0, 100)}`;
                      return `  - ${a.name || a.type}`;
                    })
                    .join("\n");
                  parts.push(`\n**产出物：**\n${artifactDescs}`);
                }
                if (detail.output && typeof detail.output === "object") {
                  const textOutput = detail.output.text || detail.output.content || detail.output.result;
                  if (textOutput) parts.push(`\n**输出：**\n${textOutput}`);
                }
                linkedMsg.content = linkedMsg.content
                  ? `${linkedMsg.content}\n\n${parts.join("\n")}`
                  : parts.join("\n");
              } else {
                linkedMsg.content = linkedMsg.content
                  ? `${linkedMsg.content}\n\n❌ 任务执行失败：${data?.error || detail?.errorMessage || "未知错误"}`
                  : `❌ 任务执行失败：${data?.error || detail?.errorMessage || "未知错误"}`;
              }
              linkedMsg.completedAt = detail.finishedAt || new Date().toISOString();
            }).catch(() => {
              linkedMsg.content = linkedMsg.content
                ? `${linkedMsg.content}\n\n${type === "run.success" ? "✅ 任务已完成" : "❌ 任务执行失败"}`
                : (type === "run.success" ? "✅ 任务已完成" : "❌ 任务执行失败");
            });
          }
          break;
        }
      }
    });
  }

  /** 切换 Reasoning 展开/收起 */
  function toggleReasoning(msgId: string | number) {
    const next = new Set(expandedReasoning.value);
    if (next.has(msgId)) {
      next.delete(msgId);
    } else {
      next.add(msgId);
    }
    expandedReasoning.value = next;
  }

  /** 记录思考开始时间 */
  function markReasoningStart(msgId: string | number) {
    if (!reasoningStartTimes.value.has(msgId)) {
      reasoningStartTimes.value.set(msgId, Date.now());
    }
    // 自动展开
    const next = new Set(expandedReasoning.value);
    next.add(msgId);
    expandedReasoning.value = next;
  }

  /** 记录思考结束时间 → 计算耗时 → 1秒后自动收起 */
  function markReasoningEnd(msgId: string | number) {
    const start = reasoningStartTimes.value.get(msgId);
    if (start) {
      const duration = Math.ceil((Date.now() - start) / 1000);
      reasoningDurations.value.set(msgId, duration);
    }
    // 1秒后自动收起
    setTimeout(() => {
      const next = new Set(expandedReasoning.value);
      next.delete(msgId);
      expandedReasoning.value = next;
    }, 1000);
  }

  function resetLoadingState() {
    loading.value = false;
    runtimeStatus.value = "idle";
    thinkingText.value = "";
    pendingInteraction.value = null;
    markAiAssistantRuntimeIdle();
  }

  function addSystemMessage(content: string) {
    messages.value.push(createLocalMessage({ role: "assistant", content }));
  }

  function dedupeRunMessages(items: AiAssistantMessage[]) {
    const seenIds = new Set<number>();
    const seenRunRoles = new Set<string>();
    return [...items]
      .reverse()
      .filter((message) => {
        if (message.id > 0) {
          if (seenIds.has(message.id)) return false;
          seenIds.add(message.id);
        }

        const runId = String(message.runId || message.runTrace?.runId || "").trim();
        if (!runId || message.role === "tool") return true;
        const key = `${runId}|${message.role}`;
        if (seenRunRoles.has(key)) return false;
        seenRunRoles.add(key);
        return true;
      })
      .reverse();
  }

  return {
    // State
    conversations,
    messages,
    currentConversationId,
    loading,
    historyLoading,
    runtimeStatus,
    thinkingText,
    currentRunId,
    pendingInteraction,
    agentRunStages,
    expandedReasoning,
    reasoningDurations,
    // Computed
    activeConversation,
    activeConversationTitle,
    statusText,
    senderPlaceholder,
    canSend,
    hasPendingAssistantMessage,
    promptItems,
    // Actions
    initialize,
    loadConversations,
    loadMessages,
    selectConversation,
    createConversation,
    deleteConversation,
    clearAllConversations,
    sendMessage,
    resumeInteraction,
    clearMessages,
    resetLoadingState,
    addSystemMessage,
    toggleReasoning,
    markReasoningStart,
    markReasoningEnd,
  };
});
