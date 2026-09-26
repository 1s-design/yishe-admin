# Admin AI Assistant UI 优化计划

> 目标：在保留 Element Plus 架构和现有功能的前提下，对齐 yishe-client 的视觉体验。
> 策略：不重写组件结构，通过 CSS 动画、模板优化和少量工具函数提升视觉品质。

---

## 已完成的改动 ✅

以下文件已修改（可直接提交）：

### 1. 新建 `src/utils/cn.ts`
类名合并工具，对齐 client 的 `cn()` 函数。约 20 行。

### 2. `src/store/modules/aiAssistant.ts`
新增状态：
```typescript
const expandedReasoning = ref<Set<string | number>>(new Set());
const reasoningStartTimes = ref<Map<string | number, number>>(new Map());
const reasoningDurations = ref<Map<string | number, number>>(new Map());
```

新增方法：
- `toggleReasoning(msgId)` — 切换展开/收起
- `markReasoningStart(msgId)` — 记录开始时间 + 自动展开
- `markReasoningEnd(msgId)` — 计算耗时 + 1秒后自动收起

在 `handleStreamEvent` 中：
- `run.started` → 调用 `markReasoningStart()`
- `assistant.answer.delta`（首次）→ 调用 `markReasoningEnd()`

在 `return` 中暴露新状态和方法。

### 3. `src/components/AiAssistant/index.vue`

**Template 改动：**
- 替换 thinking loader 为 Reasoning 可折叠块（含 trigger + chevron + duration + collapse 动画）
- Agent Run Stage 列表外层添加 `.agent-run-stages__list` 容器（用于连接线）
- Tool body 包裹 `<Transition name="collapse">` + `.collapse-inner`
- textarea 添加 `@compositionstart/@compositionend/@keydown` 事件
- 添加滚动到底部按钮

**Script 改动：**
- 新增 `isComposing` ref
- 新增 `handleKeyDown()` — IME 感知，中文输入时不发送
- 新增智能滚动：`isNearBottom`, `scheduleScrollToBottom`, `initSmartScroll`, `destroySmartScroll`
- `onMounted` 中添加 `nextTick(() => initSmartScroll())`
- `onUnmounted` 中添加 `destroySmartScroll()`
- `scrollToBottom` 改为设置 `stickToBottom = true` + `scheduleScrollToBottom()`

**Style 改动：**
- 新增 CSS 变量：`--agent-reasoning-bg`, `--agent-reasoning-border`, `--agent-tool-running/success/error`, `--agent-stage-connector`
- 新增 keyframes：`.collapse-enter/active/from/to` (grid-rows 动画), `thinking-pulse`, `fade-in-up`
- 新增 `.agent-reasoning` 完整样式块（trigger, icon, label, duration, chevron, body, text）
- 替换 `.agent-thinking-spinner` 为双圆点脉冲动画
- 新增 `.agent-scroll-bottom` 样式
- 增强 `.agent-tool__status-dot` 颜色变量
- Stage 列表添加连接线（`.agent-run-stages__list::before`）

---

## 需要他人完成的剩余工作 📋

### A. 验证构建（5 分钟）

```bash
cd yishe-admin
npx vite build
```

如果有 TS 错误，修复类型问题（主要是新 ref 的泛型）。

### B. 空状态优化（30 分钟）

**文件**: `src/components/AiAssistant/index.vue`

当前空状态只有一行文字：
```html
<p class="chat__empty-text">有什么可以帮你的？</p>
```

改为带建议按钮的空状态（对齐 client 的 suggestion chips）：

```html
<div v-if="!visibleMessages.length && !store.loading" class="chat__empty">
  <h2 class="chat__empty-title">有什么可以帮你的？</h2>
  <div class="agent-suggestions">
    <button
      v-for="item in suggestionItems"
      :key="item.prompt"
      class="agent-suggestion"
      @click="handleSendSuggestion(item.prompt)"
    >
      <span :class="['mdi', item.icon, 'agent-suggestion__icon']" />
      <span>{{ item.title }}</span>
    </button>
  </div>
</div>
```

建议数据（script 中）：
```typescript
const suggestionItems = [
  { icon: 'mdi-image-multiple-outline', title: '搜集素材', prompt: '帮我搜集适合电商主图的 5 个 SVG 素材' },
  { icon: 'mdi-chart-line', title: '查看热搜', prompt: '采集微博热搜' },
  { icon: 'mdi-movie-outline', title: '制作视频', prompt: '帮我做一个关于微博热搜的搞笑短视频' },
  { icon: 'mdi-text-box-outline', title: '生成文案', prompt: '写一段关于AI的搞笑短视频文案' },
];
```

CSS（添加到 style）：
```css
.chat__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: 24px;
}
.chat__empty-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}
.agent-suggestions {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  max-width: 520px;
  width: 100%;
}
.agent-suggestion {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border: 1px solid var(--agent-border-soft);
  border-radius: 12px;
  background: var(--agent-surface);
  color: var(--agent-text);
  cursor: pointer;
  font-size: 13px;
  transition: border-color 0.15s, background-color 0.15s;
}
.agent-suggestion:hover {
  border-color: var(--primary);
  background: color-mix(in srgb, var(--primary) 4%, transparent);
}
.agent-suggestion__icon {
  font-size: 18px;
  color: var(--agent-muted);
}
```

需要在 script 添加 `handleSendSuggestion` 方法：
```typescript
function handleSendSuggestion(prompt: string) {
  inputMessage.value = prompt;
  handleSend();
}
```

### C. Markdown 渲染样式对齐（20 分钟）

**文件**: `src/components/AiAssistant/index.vue` 的 `.md-body` 部分

client 的 markdown 使用 `.markdown-body` 类，admin 使用 `.md-body`。确保以下样式存在：

```css
.md-body {
  font-size: 14px;
  line-height: 1.7;
  color: var(--text);
}
.md-body p {
  margin: 0 0 8px;
}
.md-body p:last-child {
  margin-bottom: 0;
}
.md-body code {
  font-family: "JetBrains Mono", "SF Mono", monospace;
  font-size: 12px;
  background: var(--surface);
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid var(--border);
}
.md-body pre {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px;
  overflow-x: auto;
}
.md-body pre code {
  background: none;
  border: none;
  padding: 0;
}
.md-body ul, .md-body ol {
  padding-left: 24px;
  margin: 8px 0;
}
.md-body li {
  margin: 4px 0;
}
.md-body blockquote {
  border-left: 3px solid var(--primary);
  padding-left: 12px;
  margin: 8px 0;
  color: var(--text-3);
}
.md-body a {
  color: var(--primary);
  text-decoration: none;
}
.md-body a:hover {
  text-decoration: underline;
}
.md-body table {
  border-collapse: collapse;
  width: 100%;
  margin: 8px 0;
}
.md-body th, .md-body td {
  border: 1px solid var(--border);
  padding: 8px 12px;
  text-align: left;
}
.md-body th {
  background: var(--surface);
  font-weight: 600;
}
```

### D. 消息 hover 操作增强（15 分钟）

**当前**: 只有 copy 按钮
**目标**: 复制成功时显示 ✓ 反馈（1.5秒后恢复）

```typescript
// 新增 ref
const copiedMessageId = ref<string | number | null>(null);

// 修改 copyText
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
```

Template 中：
```html
<button class="msg__action-btn" @click="copyText(msg.content, msg.id)">
  <el-icon :size="14">
    <Check v-if="copiedMessageId === msg.id" />
    <CopyDocument v-else />
  </el-icon>
</button>
```

需要导入 `Check` icon：
```typescript
import { Check, CopyDocument, ... } from "@element-plus/icons-vue";
```

### E. 暗色模式适配（15 分钟）

确保新组件在 `html.dark` 下正常工作。在 `.ai-desktop` 的 dark 覆盖块中：

```css
html.dark .ai-desktop {
  /* 已有的变量覆盖 */
  --agent-reasoning-bg: color-mix(in srgb, var(--surface) 94%, transparent);
  --agent-stage-connector: rgba(255, 255, 255, 0.08);
}

html.dark .agent-scroll-bottom {
  box-shadow: 0 2px 8px rgb(0 0 0 / 30%);
}
```

---

## 不改什么（范围控制）

1. **不拆分子组件** — `index.vue` 单体文件保持不变
2. **不替换 Element Plus** — 继续使用 `el-icon`, `el-popover`, `el-dialog`
3. **不改交互系统** — `interactions/` 目录下的 10 种交互类型保持不变
4. **不改 store 架构** — 仅新增 ref 和方法，不重构
5. **不添加新依赖** — 仅用现有 UnoCSS + Vue 3 + Element Plus
6. **不改 `AssistantChat.vue`** — 那个是单独的紧凑面板，后续再处理
7. **不实现附件上传** — 需要后端配合

---

## 验证清单

- [ ] `npx vite build` 通过
- [ ] 发送消息 → 思考块自动展开 → 收到内容后 1 秒自动收起
- [ ] 思考块显示耗时（秒）
- [ ] Tool 卡片平滑展开/收起（非瞬间切换）
- [ ] Tool 状态圆点颜色正确（running=橙色脉冲, success=绿色, error=红色）
- [ ] 中文输入时按回车不发送，选字后回车发送
- [ ] Agent Run Stage 卡片有纵向连接线
- [ ] 流式输出时自动滚动，上滚暂停，显示"滚动到底部"按钮
- [ ] 空状态显示建议按钮网格
- [ ] 复制消息后图标变为 ✓（1.5秒恢复）
- [ ] 暗色模式下所有新组件正常显示
- [ ] 所有现有功能（交互系统、slash命令、工具目录、会话管理）不受影响

---

## 关键文件路径

| 文件 | 操作 |
|------|------|
| `yishe-admin/src/utils/cn.ts` | 新建（已完成） |
| `yishe-admin/src/store/modules/aiAssistant.ts` | 修改（已完成） |
| `yishe-admin/src/components/AiAssistant/index.vue` | 主要改动（已完成 + 待补充 B/C/D/E） |

---

## 设计参考

yishe-client 的组件源码位置（供参考实现细节）：
- `yishe-client/src/renderer/src/components/ai-elements/` — 各组件实现
- `yishe-client/src/renderer/src/lib/utils.ts` — cn() 工具
- `yishe-client/src/renderer/src/components/agent/ChatView.vue` — 完整使用示例
