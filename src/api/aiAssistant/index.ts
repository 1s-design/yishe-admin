import request from "@/config/axios";
import { config } from "@/config/axios/config";
import { getAccessToken } from "@/utils/auth";

export interface AiAssistantPageContext {
  routePath?: string;
  fullPath?: string;
  routeName?: string;
  routeTitle?: string;
  query?: Record<string, any>;
  params?: Record<string, any>;
  /** 当前工作流编辑器上下文 */
  workflowContext?: {
    workflowId: string;
    workflowName?: string;
    canvas: {
      nodes: any[];
      edges: any[];
    };
  } | null;
}

export interface AiAssistantPersona {
  key: string;
  name: string;
  description: string;
  isDefault?: boolean;
}

export interface AiAssistantConversation {
  id: number;
  title: string;
  messageCount?: number;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
  persona: AiAssistantPersona;
  // 状态字段
  status?: string;
  currentRunId?: string | null;
  statusMessage?: string | null;
  lastStatusChangeAt?: string | null;
  lastRunningAt?: string | null;
  lastErrorAt?: string | null;
  lastErrorMessage?: string | null;
  // 统计字段
  userMessageCount?: number;
  assistantMessageCount?: number;
  toolCallCount?: number;
  totalAiTokens?: number;
  avgAiResponseMs?: number;
  avgToolExecutionMs?: number;
  totalDurationMs?: number;
  firstMessageAt?: string | null;
  lastAiResponseAt?: string | null;
  runCount?: number;
  successfulRunCount?: number;
  failedRunCount?: number;
}

export interface AiAssistantToolSchemaProperty {
  type?: string | string[];
  label?: string;
  description?: string;
  enum?: any[];
  default?: any;
  example?: any;
  aliases?: string[];
  items?: Record<string, any>;
}

export interface AiAssistantToolInputSchema {
  type?: string;
  required?: string[];
  properties?: Record<string, AiAssistantToolSchemaProperty>;
}

export interface AiAssistantToolExampleCase {
  title: string;
  prompt: string;
  description?: string;
  input?: Record<string, any>;
}

export interface AiAssistantToolDefinition {
  name: string;
  label: string;
  description: string;
  category: string;
  readOnly: boolean;
  runtime: string;
  plannerEnabled?: boolean;
  executionMode?: "read_only" | "safe_write" | "confirm_required";
  riskLevel?: "low" | "medium" | "high";
  requiresBrowser?: boolean;
  confirmRequired?: boolean;
  idempotent?: boolean;
  tags?: string[];
  inputSchema: AiAssistantToolInputSchema;
  examples?: string[];
  exampleCases?: AiAssistantToolExampleCase[];
}

export interface AiAssistantCapabilityGroup {
  key: string;
  label: string;
  description: string;
  tools: AiAssistantToolDefinition[];
}

export interface AiAssistantCapabilityCatalog {
  total: number;
  summary: string;
  groups: AiAssistantCapabilityGroup[];
}

export interface AiAssistantToolCatalog {
  total: number;
  serverTotal: number;
  clientTotal: number;
  generatedAt: string;
  summary: string;
  groups: Array<{
    key: string;
    label: string;
    total: number;
    domains: Array<{ key: string; label: string; total: number; tools: string[] }>;
  }>;
  tools: Array<
    AiAssistantToolDefinition & {
      id?: string;
      summary?: string;
      source?: string;
      sourceLabel?: string;
      available?: boolean;
      groupKey?: string;
      groupLabel?: string;
      clients?: Array<{
        connectionId: string;
        clientId?: string;
        isOnline?: boolean;
        appVersion?: string | null;
      }>;
      hierarchy?: {
        source: { key: string; label: string };
        domain: { key: string; label: string };
        capability: { key: string; label: string };
        action: { key: string; label: string };
        path: string[];
      };
      workflow?: {
        selectable: boolean;
        nodeType: string;
        value: string;
        requiresClient: boolean;
        requiresConfirmation: boolean;
      };
      children?: Array<{
        key: string;
        label: string;
        description?: string;
        kind: "operation" | "action";
        inputSchema?: Record<string, any>;
        aliases?: string[];
      }>;
    }
  >;
  clients: Array<{
    connectionId: string;
    clientId?: string;
    isOnline?: boolean;
    appVersion?: string | null;
    toolDiscovery?: { success?: boolean; error?: string; tools?: any[] } | null;
  }>;
}

export interface AiAssistantAttachment {
  kind: "image" | "file";
  name: string;
  url: string;
  mimeType?: string | null;
  size?: number | null;
}

export interface AiAssistantUploadTarget {
  key: string;
  bucket: string;
  region: string;
  url: string;
}

export interface AiAssistantMessage {
  id: number;
  conversationId: number | null;
  role: "user" | "assistant" | "tool";
  content: string;
  attachments: AiAssistantAttachment[];
  routePath?: string | null;
  routeTitle?: string | null;
  pageContext?: AiAssistantPageContext | null;
  toolKey: string | null;
  toolLabel: string | null;
  toolInput?: Record<string, any> | null;
  toolResult: Record<string, any> | null;
  runTrace?: Record<string, any> | null;
  createdAt: string;
  runId?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  durationMs?: number | null;
  aiResponseMs?: number | null;
  toolExecutionMs?: number | null;
  tokensUsed?: number | null;
  modelName?: string | null;
  errorText?: string | null;
  toolCalls?: any[] | null;
}

export interface AiAssistantChatResult {
  conversation: AiAssistantConversation;
  reply: string;
  toolCalls: Array<{
    tool: string;
    reason: string;
    input: Record<string, any>;
  }>;
  messages: AiAssistantMessage[];
}

export interface AiAssistantChatStreamEvent {
  event: string;
  data: any;
}

export interface AiAssistantRunEventItem {
  id?: number;
  runId?: string;
  event: string;
  label: string;
  time: string;
  summary: string;
  payload?: Record<string, any> | null;
  messageId?: number | null;
  conversationId?: number | null;
}

export interface AiAssistantRunEventsResult {
  runId: string;
  total: number;
  events: AiAssistantRunEventItem[];
}

export interface AiAssistantRun {
  id: number;
  runId: string;
  conversationId: number | null;
  status: string;
  goalText: string;
  pendingQuestion: string | null;
  pendingPayload?: Record<string, any> | null;
  startedAt: string | null;
  finishedAt: string | null;
  cancelledAt: string | null;
  lastEventAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AiAssistantRunListResult {
  total: number;
  items: AiAssistantRun[];
}

export interface AiAssistantRuntimeStatus {
  available: boolean;
  configured: boolean;
  runningCount: number;
  message: string;
  timestamp: string;
}

type StreamHandlers = {
  signal?: AbortSignal;
  onEvent: (event: AiAssistantChatStreamEvent) => void;
  onError?: (error: any) => void;
  onDone?: () => void;
  onClose?: () => void;
};

function authHeaders() {
  const token = getAccessToken();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token || ""}`,
  };
}

async function postSse(url: string, body: Record<string, any>, handlers: StreamHandlers) {
  const { fetchEventSource } = await import("@microsoft/fetch-event-source");
  await fetchEventSource(`${config.base_url}${url}`, {
    method: "POST",
    headers: authHeaders(),
    openWhenHidden: true,
    signal: handlers.signal,
    body: JSON.stringify(body),
    onmessage(event) {
      let parsed: any = {};
      try {
        parsed = event.data ? JSON.parse(event.data) : {};
      } catch {
        parsed = {};
      }
      handlers.onEvent({
        event: event.event || "message",
        data: parsed,
      });
    },
    onerror(error) {
      handlers.onError?.(error);
      throw error;
    },
    onclose() {
      handlers.onDone?.();
      handlers.onClose?.();
    },
  });
}

function normalizeMessageParams(
  arg?: number | { limit?: number; conversationId?: number },
  conversationId?: number | null,
) {
  if (typeof arg === "object" && arg !== null) {
    return {
      limit: arg.limit,
      conversationId: arg.conversationId,
    };
  }
  return {
    limit: typeof arg === "number" ? arg : undefined,
    conversationId: conversationId || undefined,
  };
}

export const AiAssistantApi = {
  getStatus: async () => {
    return request.get<AiAssistantRuntimeStatus>({
      url: "/ai-assistant/status",
    });
  },

  getConversations: async () => {
    return request.get<AiAssistantConversation[]>({
      url: "/ai-assistant/conversations",
    });
  },

  getPersonas: async () => {
    return request.get<AiAssistantPersona[]>({
      url: "/ai-assistant/personas",
    });
  },

  createConversation: async (
    arg?: string | { title?: string; personaKey?: string },
    personaKey?: string,
  ) => {
    const data = typeof arg === "object" && arg !== null ? arg : { title: arg, personaKey };
    return request.post<AiAssistantConversation>({
      url: "/ai-assistant/conversations",
      data,
    });
  },

  updateConversationPersona: async (conversationId: number, personaKey: string) => {
    return request.patch<AiAssistantConversation>({
      url: `/ai-assistant/conversations/${conversationId}/persona`,
      data: { personaKey },
    });
  },

  deleteConversation: async (id: number | string) => {
    return request.delete({
      url: `/ai-assistant/conversations/${id}`,
    });
  },

  clearAllConversations: async () => {
    return request.delete({
      url: "/ai-assistant/conversations",
    });
  },

  getMessages: async (
    arg?: number | { limit?: number; conversationId?: number },
    conversationId?: number | null,
  ) => {
    return request.get<AiAssistantMessage[]>({
      url: "/ai-assistant/messages",
      params: normalizeMessageParams(arg, conversationId),
    });
  },

  clearMessages: async (arg?: number | null | { conversationId?: number | null }) => {
    const conversationId = typeof arg === "object" && arg !== null ? arg.conversationId : arg;
    return request.delete({
      url: "/ai-assistant/messages",
      params: { conversationId: conversationId || undefined },
    });
  },

  getCommands: async () => {
    return request.get<{
      commands: Array<{
        name: string;
        aliases: string[];
        category: string;
        description: string;
        arguments: Array<{
          name: string;
          type: string;
          required: boolean;
          description: string;
        }>;
      }>;
    }>({
      url: "/ai-assistant/commands",
    });
  },

  getTools: async () => {
    return request.get<{ tools: AiAssistantToolDefinition[] }>({
      url: "/ai-assistant/tools",
    });
  },

  getCapabilityCatalog: async () => {
    return request.get<AiAssistantCapabilityCatalog>({
      url: "/ai-assistant/capabilities",
    });
  },

  getToolCatalog: async () => {
    return request.get<AiAssistantToolCatalog>({
      url: "/ai-assistant/tool-catalog",
    });
  },

  createAttachmentUploadTarget: async (filename: string) => {
    return request.post<AiAssistantUploadTarget>({
      url: "/ai-assistant/attachments/upload-target",
      data: { filename },
    });
  },

  chat: async (
    arg:
      | string
      | {
          message: string;
          conversationId?: number;
          attachments?: AiAssistantAttachment[];
          pageContext?: AiAssistantPageContext;
        },
    attachments?: AiAssistantAttachment[],
    pageContext?: AiAssistantPageContext,
    conversationId?: number | null,
  ) => {
    const data =
      typeof arg === "object"
        ? arg
        : {
            message: arg,
            attachments,
            pageContext,
            conversationId: conversationId || undefined,
          };
    return request.post<AiAssistantChatResult>({
      url: "/ai-assistant/chat",
      data,
    });
  },

  getToolPalettes: async () => {
    return request.get({
      url: "/ai-assistant/tool-palettes",
    }) as unknown as Promise<{ palettes: Array<{ key: string; label: string; icon: string; description: string }> }>;
  },

  chatStream: async (...args: any[]) => {
    const first = args[0];
    const isObjectCall = first && typeof first === "object" && !Array.isArray(first);
    const body = isObjectCall
      ? first
      : {
          message: args[0],
          attachments: args[1],
          pageContext: args[2],
          conversationId: args[3] || undefined,
          toolScope: args[4]?.toolScope,
          enableThinking: args[4]?.enableThinking,
          thinkingBudget: args[4]?.thinkingBudget,
          includeUsage: args[4]?.includeUsage !== false,
        };
    const handlers: StreamHandlers = isObjectCall ? args[1] : args[4];
    return postSse("/ai-assistant/runs/stream", body, handlers);
  },

  continueRunStream: async (
    runId: string,
    message: string,
    attachments: AiAssistantAttachment[] | undefined,
    pageContext: AiAssistantPageContext | undefined,
    conversationId: number | null | undefined,
    handlers: StreamHandlers & {
      enableThinking?: boolean;
      thinkingBudget?: number;
      includeUsage?: boolean;
    },
  ) => {
    return postSse(
      `/ai-assistant/runs/${runId}/input-stream`,
      {
        runId,
        message,
        attachments,
        pageContext,
        conversationId: conversationId || undefined,
        enableThinking: handlers.enableThinking,
        thinkingBudget: handlers.thinkingBudget,
        includeUsage: handlers.includeUsage !== false,
      },
      handlers,
    );
  },

  resumeRunStream: async (
    runId: string,
    data: {
      conversationId?: number;
      confirmed?: boolean;
      input?: Record<string, any>;
      reason?: string;
    },
    handlers: StreamHandlers,
  ) => {
    return postSse(`/ai-assistant/runs/${runId}/resume-stream`, data, handlers);
  },

  executeTool: async (
    tool: string,
    input?: Record<string, any>,
    pageContext?: AiAssistantPageContext,
    conversationId?: number | null,
    reason?: string,
    confirmed?: boolean,
  ) => {
    return request.post<AiAssistantChatResult>({
      url: "/ai-assistant/tools/execute",
      data: {
        tool,
        input,
        pageContext,
        conversationId: conversationId || undefined,
        reason,
        confirmed,
      },
    });
  },

  confirmRunTool: async (
    runId: string,
    tool?: string,
    input?: Record<string, any>,
    pageContext?: AiAssistantPageContext,
    conversationId?: number | null,
    reason?: string,
  ) => {
    return request.post<AiAssistantChatResult>({
      url: `/ai-assistant/runs/${runId}/confirm`,
      data: {
        runId,
        tool,
        input,
        pageContext,
        conversationId: conversationId || undefined,
        reason,
        confirmed: true,
      },
    });
  },

  getRunEvents: async (runId: string, conversationId?: number | null, limit = 100) => {
    return request.get<AiAssistantRunEventsResult>({
      url: `/ai-assistant/runs/${runId}/events`,
      params: {
        conversationId: conversationId || undefined,
        limit,
      },
    });
  },

  getRuns: async (params?: { conversationId?: number | null; status?: string; limit?: number }) => {
    return request.get<AiAssistantRunListResult>({
      url: "/ai-assistant/runs",
      params: {
        conversationId: params?.conversationId || undefined,
        status: params?.status || undefined,
        limit: params?.limit,
      },
    });
  },

  getRun: async (runId: string) => {
    return request.get<AiAssistantRun>({
      url: `/ai-assistant/runs/${runId}`,
    });
  },

  cancelRun: async (runId: string) => {
    return request.post({
      url: `/ai-assistant/runs/${runId}/cancel`,
    });
  },
};
