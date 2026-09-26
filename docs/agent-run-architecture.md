# Agent Run Engine — 架构与实现总结

## 1. 概览

Agent Run Engine 是一个**多阶段任务执行管线引擎**，用于执行需要多个步骤串联的内容生产任务（如：热榜采集 → 文案生成 → TTS 配音）。

### 与 AI Assistant 的关系

| 系统 | 表 | 触发方式 | 用途 |
|------|-----|---------|------|
| **Agent Run Engine** | `agent_run` / `agent_run_stage` / `agent_run_artifact` | API 直接调用 或 AI 助手关键词委派 | 多阶段内容生产管线 |
| **AI Assistant** | `ai_assistant_run` / `ai_assistant_message` | 用户对话 | LangGraph 对话、工具调用 |

两个系统独立运行，但 AI Assistant 可以通过关键词匹配将消息委派给 Agent Run Engine。

---

## 2. 数据库设计

### 2.1 agent_run（主表）

```
agent_run
├── id (PK)
├── run_id (业务ID, 格式 arun_xxx)
├── user_id
├── title
├── status (pending|queued|running|waiting|success|failed|cancelled)
├── current_stage (当前执行阶段索引)
├── total_stages
├── plan (JSON: 完整执行计划)
├── input (JSON: 用户原始输入)
├── output (JSON: 最终结果)
├── pending_question (等待审批时的问题)
├── error_message
├── claimed_by / claimed_at / lease_expires_at (调度租约)
├── created_at / updated_at / started_at / finished_at / cancelled_at
```

### 2.2 agent_run_stage（阶段表）

```
agent_run_stage
├── id (PK)
├── run_id (FK → agent_run.run_id)
├── stage_index
├── capability_id (能力ID, 如 hotsearch.weibo, tts.generate)
├── name
├── status (pending|queued|running|waiting|success|failed|timeout|skipped|cancelled)
├── input / output (JSON)
├── artifact_id (关联产物)
├── params (JSON: 用户参数)
├── logs (执行日志)
├── error_message / error_detail / error_code
├── retryable / idempotency_key (重试与幂等)
├── retry_count / duration_ms
├── claimed_by / lease_expires_at (Stage级租约)
├── created_at / updated_at / started_at / finished_at
```

### 2.3 agent_run_artifact（产物表）

```
agent_run_artifact
├── id (PK)
├── artifact_id (业务ID, 格式 art_xxx)
├── type (topic|script|audio|video|image|post|data)
├── run_id (来源Run)
├── stage_index (来源阶段)
├── name
├── storage_type (cos|local|url|db)
├── url (访问地址)
├── content_text (文本内容)
├── metadata (JSON: 时长/尺寸/格式等)
├── created_at
```

### 2.4 worker（Worker注册表）

```
agent_worker
├── worker_id
├── capabilities (JSON: 支持的能力列表)
├── status (online|offline)
├── last_heartbeat
```

---

## 3. 后端架构（design-server/src/agent-run/）

### 3.1 核心模块

| 文件 | 职责 |
|------|------|
| `agent-run.module.ts` | NestJS 模块定义 |
| `agent-run.controller.ts` | REST API 端点 |
| `agent-run.service.ts` | 业务逻辑（创建/查询/取消/审批/重试） |
| `planner.service.ts` | 根据用户输入生成执行计划（模板匹配） |
| `scheduler.service.ts` | 调度器：从队列取任务、执行 Stage、推进状态 |
| `executor.service.ts` | 实际调用 Capability 执行 |
| `capability.registry.ts` | Capability 注册表 |
| `run-queue.service.ts` | 任务队列（基于数据库的 claim/lease 模式） |
| `event-bus.service.ts` | 事件总线（内存） |
| `run-event.listener.ts` | 监听事件并通过 WebSocket 推送到前端 |
| `plan-validator.service.ts` | 执行计划校验（4层校验） |
| `worker-registry.service.ts` | Worker 注册与发现 |
| `worker-transport.service.ts` | Worker 通信传输 |
| `worker.controller.ts` / `worker.service.ts` | Worker 管理 API |

### 3.2 执行流程

```
用户消息 → AI Assistant
           ↓
    shouldDelegateToAgentRun() 关键词匹配
           ↓ (匹配)
    delegateToAgentRunEngine()
           ↓
    PlannerService.generatePlan()  ← 根据关键词选模板
           ↓
    PlanValidatorService.validatePlan()
           ↓
    AgentRunService.createRun()   ← 持久化 + 入队
           ↓
    SSE: agent-run.created → 前端展示 Stage 进度
    SSE: run.completed (delegated: true) → SSE 结束
           ↓ (后台异步)
    SchedulerService 从队列 claim → 逐 Stage 执行
           ↓
    ExecutorService → Capability.execute()
           ↓
    每个 Stage 完成: WebSocket run.stage.completed
    全部完成: WebSocket run.success
```

### 3.3 Planner 模板（planner.service.ts）

| 关键词 | 模板 | Stages |
|--------|------|--------|
| 视频/热搜视频/短视频 | 自媒体视频生产管线 | 微博采集 → 抖音采集 → 数据筛选 → AI文案(需审批) → TTS配音 |
| 热榜/热搜/采集热榜 | 热榜采集 | 微博 → 抖音 → 知乎 → B站 → 数据整理 |
| 文案/写文案/生成文案 | AI 文案生成 | AI文案(需审批) |
| 配音/tts/语音 | TTS 配音生成 | TTS配音 |
| (无匹配) | AI 智能处理 | AI处理 |

### 3.4 REST API

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/agent-run` | 创建执行任务 |
| GET | `/api/agent-run` | 列表（分页+状态筛选） |
| GET | `/api/agent-run/:runId` | 详情（含 stages + artifacts） |
| POST | `/api/agent-run/:runId/start` | 手动启动/重新入队 |
| POST | `/api/agent-run/:runId/cancel` | 取消 |
| POST | `/api/agent-run/:runId/approve/:stageIndex` | 审批阶段 |
| POST | `/api/agent-run/:runId/retry/:stageIndex` | 重试失败阶段 |
| GET | `/api/agent-run/:runId/stages/:stageIndex` | Stage 详情（含 logs） |
| GET | `/api/agent-run/capabilities` | 能力列表 |
| GET | `/api/agent-run/queue/stats` | 队列统计 |

### 3.5 WebSocket 事件

通过 `AgentRunEventBus` → `run-event.listener.ts` → WebSocket `agent-run-event`：

| 事件类型 | 触发时机 | Payload |
|----------|----------|---------|
| `run.started` | 开始执行 | `{ userId }` |
| `run.stage.started` | 阶段开始 | `{ stageIndex, capabilityId, name }` |
| `run.stage.completed` | 阶段完成 | `{ stageIndex, output }` |
| `run.stage.failed` | 阶段失败 | `{ stageIndex, error }` |
| `run.stage.timeout` | 阶段超时 | `{ stageIndex }` |
| `run.waiting` | 等待审批 | `{ stageIndex, question }` |
| `run.success` | 全部完成 | `{ completedStages, message }` |
| `run.failed` | 执行失败 | `{ error }` |

---

## 3.6 已注册 Capability 列表

| ID | 文件 | 说明 |
|----|------|------|
| `hotsearch.weibo` / `.douyin` / `.zhihu` / `.bilibili` / `.kuaishou` / `.toutiao` / `.douban` | hotsearch.capability.ts + hotsearch-platforms.capability.ts | 热搜采集（7个平台） |
| `ai.chat.text` | ai-text.capability.ts | AI 文案生成 |
| `tts.generate` | tts.capability.ts | TTS 配音 |
| `data.transform` | data-transform.capability.ts | 数据筛选/整理 |
| `http-request` | http-request.capability.ts | HTTP 请求 |
| `delay` | delay.capability.ts | 延迟等待 |

---

## 4. 前端架构

### 4.1 API 层（src/api/agentRun/index.ts）

```typescript
AgentRunApi.list({ status, page, pageSize })     // 列表
AgentRunApi.detail(runId)                         // 详情（含 stages + artifacts）
AgentRunApi.cancel(runId)                         // 取消
AgentRunApi.retryStage(runId, stageIndex)         // 重试
AgentRunApi.approveStage(runId, stageIndex, data) // 审批
AgentRunApi.stageDetail(runId, stageIndex)        // Stage 详情
AgentRunApi.statusCounts()                        // 各状态数量
```

### 4.2 任务管理页面

**路由**: `/ai/agent-runs` → `src/views/ai/agent-runs/index.vue` → `src/components/AgentRunTasks/index.vue`

**功能**:
- 状态 Tab 筛选（全部/运行中/排队中/等待审批/成功/失败/已取消）
- 各状态实时数量显示
- 卡片式 Run 列表（含 Stage 进度点）
- 分页
- 点击卡片 → 全屏 Dialog 详情

**详情页** (`RunDetail.vue`):
- 状态头部 + 元数据
- Stage 时间线（带连接线和状态圆点）
- 审批/重试按钮
- 产物列表（可下载）
- 最终输出

### 4.3 对话集成（src/store/modules/aiAssistant.ts）

#### SSE 事件处理（handleStreamEvent）

| 事件 | 处理 |
|------|------|
| `agent-run.created` | 关联 runId 到 assistant 消息，初始化 Stage 进度追踪 |
| `run.completed` (delegated) | 设置消息内容，结束 loading |

#### WebSocket 事件处理（subscribeAgentRunEvents）

| 事件 | 处理 |
|------|------|
| `run.started` | 初始化 stages map |
| `run.stage.started/completed/failed` | 更新 stage 状态 |
| `run.waiting` | 显示审批交互 |
| `run.success` | 拉取 run 详情，更新消息内容（含产物），清理 stages |
| `run.failed` | 更新消息为失败，清理 stages |

#### 关键数据结构

```typescript
// assistant 消息的 runTrace
msg.runTrace = {
  runId: "airun_xxx",       // AI Assistant 的 runId (SSE 用)
  agentRunId: "arun_xxx",   // Agent Run 的 runId (WebSocket 用)
  agentRunEngine: true,
  totalStages: 5,
  stages: [...]
}

// Stage 进度追踪
agentRunStages: Map<runId, AgentRunStageProgress[]>
```

#### 页面加载同步（refreshDelegatedMessages）

`loadMessages()` 完成后，检查内容含"已创建执行管线"的 assistant 消息，主动调用 `AgentRunApi.detail()` 拉取最终结果更新内容。解决 WebSocket 事件丢失问题。

---

## 5. ID 格式说明

| 前缀 | 系统 | 示例 |
|------|------|------|
| `airun_` | AI Assistant Run | `airun_1790418940994_wj9ve9` |
| `arun_` | Agent Run Engine | `arun_1790418941875_9su2ue` |
| `art_` | Agent Run Artifact | `art_xxx` |

**重要**: SSE `agent-run.created` 事件中同时包含 `aiRunId` (airun_) 和 `runId` (arun_)。前端 `runTrace.runId` 存 `airun_xxx`，`runTrace.agentRunId` 存 `arun_xxx`。WebSocket 事件使用 `arun_xxx`。

---

## 6. 已知问题与待完善

### 6.1 已修复
- ✅ agent-run 完成后对话消息不更新（ID 不匹配 + WebSocket 事件丢失）
- ✅ Tab 切换分页未重置
- ✅ 详情弹窗切换 run 内容复用（缺少 key）

### 6.2 待实现
- `GET /api/agent-run/status-counts` — 后端需实现各状态数量统计接口
- 文案生成的审批流程测试（当前为 `waiting` 状态）
- 视频管线的完整端到端验证
- 产物预览（音频播放、图片展示等）

### 6.3 架构注意事项
- Planner 是**关键词模板匹配**，不是 LLM 规划。关键词有优先级顺序（视频 > 热榜 > 文案 > 配音）
- 文案和文案生成 Stage 设置了 `requireApproval: true`，会暂停等待用户审批
- Scheduler 使用数据库 claim/lease 模式，支持多实例部署
- WebSocket 事件是**一次性**的，如果浏览器未打开则丢失。前端通过 `refreshDelegatedMessages` 在页面加载时补偿

---

## 7. 文件清单

### 后端（design-server/src/agent-run/）
```
agent-run/
├── agent-run.module.ts
├── agent-run.controller.ts
├── agent-run.service.ts
├── agent-run-table-migration.service.ts
├── planner.service.ts
├── plan-validator.service.ts
├── scheduler.service.ts
├── executor.service.ts
├── capability.registry.ts
├── run-queue.service.ts
├── event-bus.service.ts
├── run-event.listener.ts
├── worker-registry.service.ts
├── worker-transport.service.ts
├── worker.controller.ts
├── worker.service.ts
├── types.ts
├── capabilities/
│   ├── ai-text.capability.ts
│   ├── data-transform.capability.ts
│   ├── delay.capability.ts
│   ├── hotsearch.capability.ts
│   ├── hotsearch-platforms.capability.ts
│   ├── http-request.capability.ts
│   └── tts.capability.ts
├── dto/
│   └── agent-run.dto.ts
└── entities/
    ├── agent-run.entity.ts        → agent_run 表
    ├── agent-run-stage.entity.ts  → agent_run_stage 表
    ├── agent-run-artifact.entity.ts → agent_run_artifact 表
    └── worker.entity.ts           → agent_worker 表
```

### 前端（yishe-admin/src/）
```
api/agentRun/index.ts              — AgentRunApi 客户端
components/AgentRunTasks/
├── index.vue                      — 任务列表页
└── RunDetail.vue                  — 任务详情（全屏弹窗）
views/ai/agent-runs/index.vue      — 路由入口
store/modules/aiAssistant.ts       — 对话 store（SSE + WebSocket 事件处理）
components/AiAssistant/
├── index.vue                      — 主对话组件
├── AssistantChat.vue              — 右下角小对话
└── agent-chat.css                 — 共享对话样式
router/modules/remaining.ts        — 路由配置
locales/zh-CN.ts / en.ts           — 国际化
```

---

## 8. 快速测试

```bash
# 1. 创建对话
curl -X POST localhost:1520/api/ai-assistant/conversations \
  -H "Authorization: Bearer $TOKEN" -d '{"title":"测试"}'

# 2. 发送触发消息（流式）
curl -N -X POST localhost:1520/api/ai-assistant/runs/stream \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"message":"帮我根据今天热搜做搞笑视频","conversationId":123}'

# 3. 查看 agent-run 列表
curl localhost:1520/api/agent-run?page=1&pageSize=20 \
  -H "Authorization: Bearer $TOKEN"

# 4. 查看 run 详情
curl localhost:1520/api/agent-run/arun_xxx \
  -H "Authorization: Bearer $TOKEN"
```
