<template>
  <div class="agent-chat-page">
    <!-- ═══════════ 顶栏：极简通透 (ChatGPT / Grok 风格) ═══════════ -->
    <header class="chat-topbar">
      <div class="topbar-left">
        <!-- 返回智能体卡片列表（原生 hash 链接，避免路由视图不切换） -->
        <a class="icon-btn" href="#/ai/agent" title="返回智能体列表" @click="backToList">
          <el-icon :size="16"><ArrowLeft /></el-icon>
        </a>

        <div class="agent-profile" v-if="agent">
          <div class="agent-avatar-wrap" :class="{ 'is-duty': isWorking }">
            <div class="agent-avatar agent-gradient" :class="resolveAgentGradient(agent)" />
          </div>
          <div class="agent-info">
            <div class="agent-name-row">
              <h2 class="agent-name">{{ agent.name }}</h2>
              <span class="status-pill" :class="`status-pill--${taskBadgeClass}`">
                <span class="status-pill__dot" />
                {{ currentTaskStatusLabel }}
              </span>
            </div>
            <div class="agent-meta">
              <span>{{ (agent.capabilities || []).length }} 项通用能力</span>
              <span v-if="contextCount">·</span>
              <button
                v-if="contextCount"
                class="meta-link"
                title="点击查看上下文明细"
                @click="showContextDrawer = true"
              >
                上下文 {{ contextCount }} 条
              </button>
              <span v-if="userMessageCount">·</span>
              <span v-if="userMessageCount" title="你在此会话中发送的消息条数">用户输入 {{ userMessageCount }} 条</span>
              <span v-if="agent.description">·</span>
              <span v-if="agent.description" class="agent-meta__desc">{{ agent.description }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="topbar-right">
        <button
          v-if="agent"
          class="topbar-btn topbar-btn--work"
          :class="{ 'is-on': isWorking }"
          :title="isWorking ? '停止后不再自动开新一轮' : '开启后将持续推进驻守目标'"
          :aria-label="isWorking ? '关闭值守' : '开启值守'"
          @click="toggleWorking"
        >
          <span class="work-dot" />
          <span>{{ isWorking ? '开启中' : '已关闭' }}</span>
        </button>

        <span class="topbar-divider" />

        <button class="topbar-btn topbar-btn--icon" title="刷新任务状态" aria-label="刷新" @click="refreshCurrent">
          <el-icon><Refresh /></el-icon>
        </button>

        <button
          v-if="agent"
          class="topbar-btn topbar-btn--icon"
          title="定时任务（含 AI 自建循环计划）"
          aria-label="定时任务"
          @click="openScheduleDialog"
        >
          <el-icon><Timer /></el-icon>
        </button>

        <button
          v-if="currentTask"
          class="topbar-btn topbar-btn--icon"
          title="清空当前对话并重置状态"
          aria-label="清空对话"
          @click="clearConversation"
        >
          <el-icon><Delete /></el-icon>
        </button>

        <button
          v-if="isBusy"
          class="topbar-btn topbar-btn--icon topbar-btn--danger"
          title="中止任务执行"
          aria-label="中止执行"
          @click="cancelCurrentTask"
        >
          <el-icon><CircleClose /></el-icon>
        </button>

        <button
          v-if="agent"
          class="topbar-btn topbar-btn--icon"
          title="配置智能体设定与工具"
          aria-label="配置"
          @click="openEditDialog"
        >
          <el-icon><Setting /></el-icon>
        </button>
      </div>
    </header>

    <!-- ═══════════ 对话消息流主体 (铺满宽度 · 内部独立滚动) ═══════════ -->
    <main class="chat-scroll" ref="chatScrollRef">
      <div class="chat-container">
        <!-- 首屏加载：极简骨架 -->
        <div v-if="!pageReady" class="chat-boot">
          <div class="boot-skeleton">
            <div class="boot-skeleton__line boot-skeleton__line--user" />
            <div class="boot-skeleton__line" />
            <div class="boot-skeleton__line boot-skeleton__line--short" />
            <div class="boot-skeleton__line" />
          </div>
        </div>

        <!-- 空态欢迎屏 (ChatGPT / Grok 标配) -->
        <div v-else-if="!chatItems.length && !isBusy" class="chat-welcome">
          <div class="welcome-avatar agent-gradient" :class="resolveAgentGradient(agent)" />

          <h1 class="welcome-title">
            {{ agent ? `${agent.name} 已就绪` : "智能体已就绪" }}
          </h1>

          <p class="welcome-subtitle">
            {{ agent?.description || "具备自主决策、系统工具调度与连续推进能力。" }}
          </p>

          <p v-if="isWorking" class="welcome-duty-hint">
            已开启持续执行，系统将在数秒内自动开工…
          </p>

          <!-- 快速灵感提示卡片 (纯扁平文字，无emoji) -->
          <div v-if="starterPrompts.length" class="welcome-prompts">
            <button
              v-for="p in starterPrompts"
              :key="p.text"
              class="prompt-chip"
              @click="useStarterPrompt(p.text)"
            >
              <span class="prompt-chip__text">{{ p.text }}</span>
            </button>
          </div>
        </div>

        <!-- 消息与执行事件流 -->
        <div v-else class="chat-stream">
          <template v-for="(item, idx) in chatItems" :key="idx">
            <!-- 用户消息 (极简右侧气泡) -->
            <div v-if="item.kind === 'user'" class="msg-row msg-row--user">
              <div class="msg-bubble msg-bubble--user">
                <div class="msg-time" :data-at="item.at">
                  {{ formatLogTime(item.at) || (item.at ? String(item.at).slice(11, 19) : '无时间') }}
                </div>
                <div class="msg-text">{{ item.content }}</div>
                <div class="msg-actions">
                  <button class="msg-copy-btn" title="复制内容" @click="copyText(item.content)">
                    <el-icon :size="12"><CopyDocument /></el-icon>
                  </button>
                  <button
                    class="msg-copy-btn"
                    title="存为长期微调笔记（后续值守遵守）"
                    @click="saveAsWorkNote(item.content)"
                  >
                    <el-icon :size="12"><Check /></el-icon>
                  </button>
                </div>
              </div>
            </div>

            <!-- 智能体消息组 (左侧：思考折叠条 + 实时动画 + 正文 Markdown + 审批卡) -->
            <div v-else-if="item.kind === 'assistant-group'" class="msg-row msg-row--assistant">
              <div class="assistant-content-wrap">
                <div class="msg-time msg-time--assistant" :data-at="item.at">
                  {{ formatLogTime(item.at) || (item.at ? String(item.at).slice(11, 19) : '无时间') }}
                </div>
                <!-- 1. Grok / DeepSeek 风格深度思考与工具调度折叠块 -->
                <div v-if="item.tools && item.tools.length" class="thought-accordion">
                  <button class="thought-toggle" @click="toggleToolsExpand(idx, item)">
                    <div class="thought-toggle__left">
                      <span class="thought-label">
                        已调度 {{ item.tools.length }} 个执行动作
                        <template v-if="item.tools.some((t: any) => t.status === 'running')">
                          · 正在执行中
                        </template>
                      </span>
                    </div>
                    <span class="thought-chevron" :class="{ 'is-open': isToolsExpanded(idx, item) }">
                      ▾
                    </span>
                  </button>

                  <div v-show="isToolsExpanded(idx, item)" class="thought-body">
                    <div
                      v-for="(tool, tIdx) in item.tools"
                      :key="tIdx"
                      class="tool-step"
                      :class="{
                        'tool-step--error': tool.status === 'error',
                        'tool-step--running': tool.status === 'running'
                      }"
                    >
                      <div class="tool-step__header">
                        <span class="tool-step__status-dot" />
                        <span class="tool-step__seq">#{{ tIdx + 1 }}</span>
                        <span class="tool-step__name">{{ tool.label || tool.tool }}</span>
                        <span class="tool-step__badge">{{ tool.tool }}</span>
                        <span v-if="tool.status === 'running'" class="tool-step__running-tag">执行中...</span>
                        <span v-else-if="tool.durationMs != null" class="tool-step__dur">
                          {{ formatDuration(tool.durationMs) }}
                        </span>
                      </div>
                      <div v-if="tool.summary" class="tool-step__summary">
                        {{ tool.summary }}
                      </div>
                      <div v-if="tool.error" class="tool-step__error">
                        {{ tool.error }}
                      </div>
                      <div v-if="tool.inputText" class="tool-step__input">
                        <div class="tool-step__input-label">入参</div>
                        <pre class="tool-step__pre">{{ tool.inputText }}</pre>
                      </div>
                      <div v-if="tool.assets && tool.assets.length" class="tool-assets">
                        <div class="tool-assets__label">
                          命中素材 {{ tool.assets.length }}
                        </div>
                        <div class="tool-assets__grid">
                          <div
                            v-for="(a, aIdx) in tool.assets"
                            :key="aIdx"
                            class="tool-assets__card"
                            :title="a.name || a.id || ''"
                          >
                            <img
                              v-if="a.url"
                              class="tool-assets__img"
                              :src="a.url"
                              :alt="a.name || a.id || '素材'"
                              loading="lazy"
                            />
                            <div v-else class="tool-assets__img tool-assets__img--ph">
                              {{ (a.name || a.id || '?')[0] }}
                            </div>
                            <div class="tool-assets__name">
                              {{ a.name || a.id || '未命名素材' }}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 2. 执行中：无内容或有工具在跑时才显示 -->
                <div v-if="isBusy && (!item.content || item.tools?.some((t: any) => t.status === 'running'))" class="agent-thinking-pill">
                  <span class="thinking-spinner" />
                  <span class="agent-thinking-pill__text">
                    {{ thinkingLabel }}<template v-if="thinkingElapsed"> · {{ thinkingElapsed }}</template>
                  </span>
                </div>

                <!-- 3. Markdown 正文 -->
                <div v-if="item.content" class="agent-markdown-body">
                  <MarkdownView :content="item.content" />
                  <button class="msg-copy-btn agent-copy" title="复制回答" @click="copyText(item.content)">
                    <el-icon :size="12"><CopyDocument /></el-icon>
                  </button>
                </div>

                <!-- 4. 人机协作确认卡：仅在真正挂起时展示 -->
                <div v-if="item.interact && isWaiting" class="interaction-card-wrap">
                  <InteractionRenderer
                    :payload="item.interact"
                    :loading="opLoading"
                    @submit="onInteractSubmit"
                    @reject="onInteractReject"
                  />
                </div>
              </div>
            </div>

            <!-- 系统/调度时间线（可追溯） -->
            <div v-else-if="item.kind === 'system'" class="msg-row msg-row--system">
              <div class="system-line" :class="`system-line--${item.level || 'info'}`">
                <span class="system-line__time">{{ formatLogTime(item.at) }}</span>
                <span class="system-line__text">{{ item.content }}</span>
              </div>
            </div>

            <!-- 异常提示条 -->
            <div v-else-if="item.kind === 'error'" class="msg-row msg-row--error">
              <div class="error-banner">
                <span>{{ item.event?.message || '任务执行遇到异常' }}</span>
              </div>
            </div>
          </template>
        </div>
      </div>
    </main>

    <!-- ═══════════ 悬浮式底部输入栏 (ChatGPT / Grok 居中气泡) ═══════════ -->
    <footer class="chat-composer">
      <div class="composer-container">
        <div class="composer-box" :class="{ 'is-focused': isInputFocused }">
          <textarea
            ref="composerTextareaRef"
            v-model="draftPrompt"
            class="composer-textarea"
            :placeholder="composerPlaceholder"
            rows="1"
            @focus="isInputFocused = true"
            @blur="isInputFocused = false"
            @keydown="handleComposerKeyDown"
            @input="autoResizeComposer"
          />

          <div class="composer-toolbar">
            <div class="composer-toolbar__left">
              <!-- 已启用能力提示 (纯扁平无emoji) -->
              <el-popover
                placement="top-start"
                :width="300"
                trigger="hover"
                popper-class="flat-popover"
              >
                <template #reference>
                  <button class="composer-chip">
                    <span>{{ (agent?.capabilities || []).length }} 项已绑定能力</span>
                  </button>
                </template>
                <div class="popover-cap-list">
                  <div class="popover-title">当前智能体绑定的能力：</div>
                  <div v-if="!(agent?.capabilities || []).length" class="popover-empty">
                    默认支持基础系统查询与通用规划
                  </div>
                  <div v-else class="popover-tags">
                    <span v-for="capId in agent?.capabilities || []" :key="capId" class="p-tag">
                      {{ capId }}
                    </span>
                  </div>
                </div>
              </el-popover>

              <span class="composer-chip composer-chip--neutral">
                <span>自主连续推进</span>
              </span>
            </div>

            <div class="composer-toolbar__right">
              <!-- 停止按钮 -->
              <button
                v-if="isBusy"
                class="composer-action-btn composer-action-btn--stop"
                title="中止执行"
                @click="cancelCurrentTask"
              >
                <span class="stop-square" />
              </button>

              <!-- 发送按钮 (圆形箭头) -->
              <button
                v-else
                class="composer-action-btn composer-action-btn--send"
                :class="{ 'is-active': !!draftPrompt.trim() }"
                :disabled="!draftPrompt.trim() || !agent"
                title="发送指令 (Enter)"
                @click="sendPrompt"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" y1="19" x2="12" y2="5" />
                  <polyline points="5 12 12 5 19 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div class="composer-foot-hint">
          <span>Enter 发送 · Shift+Enter 换行 · 智能体具备自主规划、工具调度与审批确认能力</span>
        </div>
      </div>
    </footer>

    <!-- ═══════════ 上下文明细抽屉 ═══════════ -->
    <el-drawer
      v-model="showContextDrawer"
      title="上下文明细"
      size="420px"
      direction="rtl"
    >
      <div class="ctx-list">
        <div v-for="(ev, i) in contextEvents" :key="i" class="ctx-item">
          <div class="ctx-item__head">
            <span class="ctx-item__type" :class="`ctx-item__type--${ev.type}`">{{ ctxTypeLabel(ev.type) }}</span>
            <span class="ctx-item__time">{{ formatLogTime(ev.at) }}</span>
          </div>
          <div v-if="ev.content" class="ctx-item__content">{{ ctxPreview(ev.content) }}</div>
          <div v-else-if="ev.tool" class="ctx-item__content ctx-item__content--tool">{{ ev.tool }}{{ ev.summary ? ' → ' + ctxPreview(ev.summary) : '' }}</div>
        </div>
      </div>
    </el-drawer>

    <!-- ═══════════ 配置智能体全屏弹窗 (Tab 位于标题下左侧 · 靠左自适应 · 零多余Icon) ═══════════ -->
    <el-dialog
      v-model="dialogVisible"
      fullscreen
      :show-close="false"
      class="flat-fs-dialog"
      destroy-on-close
    >
      <template #header>
        <div class="fs-dialog-header">
          <!-- 上行：标题与保存操作 -->
          <div class="fs-dialog-header__top">
            <div class="fs-dialog-header__title-wrap">
              <h2 class="fs-dialog-title">
                配置智能体: {{ agentForm.name }}
              </h2>
              <span class="fs-dialog-subtitle">通用业务能力组合 · 自主协同调度</span>
            </div>

          </div>

          <!-- 下行靠左对齐：主配置 Tabs (位于标题下左侧) -->
          <div class="fs-dialog-header__tabs">
            <button
              v-for="tab in dialogTabs"
              :key="tab.key"
              class="fs-main-tab-btn"
              :class="{ 'is-active': activeDialogTab === tab.key }"
              @click="activeDialogTab = tab.key"
            >
              <span>{{ tab.label }}</span>
              <span v-if="tab.key === 'caps' && agentForm.capabilities.length" class="fs-main-tab-badge">
                {{ agentForm.capabilities.length }}
              </span>
            </button>
          </div>
        </div>
      </template>

      <div class="fs-dialog-body">
        <!-- ── TAB 1: 角色设定与系统核心指令 ── -->
        <div v-show="activeDialogTab === 'basic'" class="fs-tab-view fs-tab-view--basic">
          <div class="fs-view-content">
            <!-- 基础信息行 -->
            <div class="fs-form-row">
              <div class="fs-form-col fs-form-col--name">
                <label class="fs-label">智能体名称</label>
                <el-input
                  v-model="agentForm.name"
                  placeholder="例如：自动化流程执行专员"
                  maxlength="40"
                  show-word-limit
                />
              </div>

              <div class="fs-form-col fs-form-col--desc">
                <label class="fs-label">功能定位简述</label>
                <el-input
                  v-model="agentForm.description"
                  placeholder="简要概括业务职责..."
                  maxlength="120"
                  show-word-limit
                />
              </div>

              <div class="fs-form-col fs-form-col--switch">
                <label class="fs-label">启用状态</label>
                <div class="fs-switch-wrap">
                  <el-switch v-model="agentForm.enabled" active-text="启用" inactive-text="停用" />
                </div>
              </div>
            </div>

            <!-- 核心指令编辑区 -->
            <div class="fs-editor-box">
              <div class="fs-editor-box__header">
                <div class="fs-editor-box__title-wrap">
                  <label class="fs-label">核心业务提示词与执行准则</label>
                  <span class="fs-subhint">定义身份角色、执行目标与工具调用规范</span>
                </div>
                <span class="fs-editor-counter">{{ agentForm.instructions.length }} 字符</span>
              </div>
              <el-input
                v-model="agentForm.instructions"
                type="textarea"
                class="fs-editor-textarea"
                placeholder="定义智能体的身份角色、持续执行目标与工具调用规范..."
              />
              <!-- 优化提示词操作 -->
              <div class="fs-optimize-bar">
                <button class="btn btn--secondary btn--sm" :disabled="optimizing" @click="runOptimize">
                  {{ optimizing ? '优化中...' : '智能优化提示词' }}
                </button>
                <span class="fs-subhint">根据运行日志与反馈自动优化</span>
              </div>
              <!-- 优化结果审阅区 -->
              <div v-if="autoOptimized" class="fs-optimize-review">
                <div class="fs-optimize-review__header">
                  <span class="fs-optimize-review__title">优化建议（{{ optimizeTime }}）</span>
                  <div class="fs-optimize-review__actions">
                    <button class="btn btn--primary btn--sm" @click="acceptOptimized">采纳</button>
                    <button class="btn btn--secondary btn--sm" @click="rejectOptimized">拒绝</button>
                  </div>
                </div>
                <div class="fs-optimize-review__body">{{ autoOptimized }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- TAB: 值守 -->
        <div v-show="activeDialogTab === 'duty'" class="fs-tab-view">
          <div class="fs-view-content">
            <div class="fs-form-row">
              <div class="fs-form-col fs-form-col--switch">
                <label class="fs-label">持续执行</label>
                <div class="fs-switch-wrap">
                  <el-switch
                    v-model="agentForm.dutyMode"
                    active-value="duty"
                    inactive-value="off"
                    active-text="开"
                    inactive-text="关"
                  />
                </div>
              </div>
              <div class="fs-form-col fs-form-col--desc">
                <label class="fs-label">驻守目标（长期职责）</label>
                <el-input
                  v-model="agentForm.dutyGoal"
                  placeholder="例如：每日整理 3–8 张图片素材入组"
                  maxlength="200"
                  show-word-limit
                  :disabled="agentForm.dutyMode !== 'duty'"
                />
              </div>
            </div>
            <div class="fs-runtime-params__grid" style="margin-top: 12px">
              <div class="fs-param">
                <label class="fs-label" title="智能体每天最多自动运行多少轮，达到后当天停止，次日重置">每日最多运行</label>
                <el-input-number v-model="agentForm.dailyRunLimit" :min="1" :max="99999" size="small" />
              </div>
              <div class="fs-param">
                <label class="fs-label" title="每隔多少秒自动唤醒一次智能体执行任务，越小越频繁">自动唤醒间隔（秒）</label>
                <el-input-number v-model="agentForm.wakeIntervalSeconds" :min="10" :max="86400" size="small" />
              </div>
            </div>
          </div>
        </div>

        <!-- TAB: 运行参数 -->
        <div v-show="activeDialogTab === 'runtime'" class="fs-tab-view">
          <div class="fs-view-content">
            <div class="fs-runtime-params__grid">
              <div class="fs-param">
                <label class="fs-label" title="单轮任务中最多调用多少次工具（查素材/建任务等），防止无限循环">单轮最大操作数</label>
                <el-input-number v-model="agentForm.maxToolSteps" :min="5" :max="200" size="small" />
              </div>
              <div class="fs-param">
                <label class="fs-label" title="0=非常严谨稳定，1=平衡，2=自由发散。建任务建议 0.1~0.3">回答稳定度</label>
                <el-input-number v-model="agentForm.temperature" :min="0" :max="2" :step="0.1" :precision="1" size="small" />
              </div>
              <div class="fs-param">
                <label class="fs-label" title="等 AI 回复的最长时间，超时自动中止本轮。推荐 90000（90秒）">响应超时（毫秒）</label>
                <el-input-number v-model="agentForm.llmTimeoutMs" :min="5000" :max="600000" :step="5000" size="small" />
              </div>
            </div>
          </div>
        </div>

        <!-- TAB: 自动清理 -->
        <div v-show="activeDialogTab === 'clean'" class="fs-tab-view">
          <div class="fs-view-content">
            <div class="fs-runtime-params__title" style="margin-bottom: 12px">
              <span>自动清理</span>
              <span class="fs-subhint">清理旧对话记录，用户微调指令自动保留</span>
              <button class="fs-clean-btn" :disabled="cleaningAgent" @click="cleanNow">
                {{ cleaningAgent ? '清理中...' : '立即清理' }}
              </button>
            </div>
            <div class="fs-runtime-params__grid">
              <div class="fs-param">
                <label class="fs-label" title="开启后按间隔自动清理历史对话">自动清理</label>
                <el-switch v-model="agentForm.autoCleanEnabled" />
              </div>
              <div class="fs-param">
                <label class="fs-label" title="已完成对话保留几天的详细记录（超过后只留摘要）">完成保留天数</label>
                <el-input-number v-model="agentForm.retainCompletedDays" :min="1" :max="365" size="small" />
              </div>
              <div class="fs-param">
                <label class="fs-label" title="失败对话保留几天的详细记录">失败保留天数</label>
                <el-input-number v-model="agentForm.retainFailedDays" :min="1" :max="365" size="small" />
              </div>
              <div class="fs-param">
                <label class="fs-label" title="单个对话最多保留多少条上下文事件，超出自动裁剪">上下文上限</label>
                <el-input-number v-model="agentForm.maxWorklogEntries" :min="50" :max="5000" :step="50" size="small" />
              </div>
              <div class="fs-param">
                <label class="fs-label" title="每隔多少小时自动清理一次">清理间隔（小时）</label>
                <el-input-number v-model="agentForm.cleanIntervalHours" :min="1" :max="720" size="small" />
              </div>
            </div>
          </div>
        </div>

        <!-- ── TAB 2: 通用能力库 (靠左分类 · 充分分配空间 · 纯扁平) ── -->
        <div v-show="activeDialogTab === 'caps'" class="fs-tab-view fs-tab-view--caps">
          <div class="fs-view-content">
            <!-- 靠左分类 Tabs (纯扁平文字，无emoji) -->
            <div class="fs-cap-categories">
              <button
                v-for="cat in capabilityCategories"
                :key="cat.key"
                class="fs-cat-btn"
                :class="{ 'is-active': activeCapGroup === cat.key }"
                @click="activeCapGroup = cat.key"
              >
                <span>{{ cat.label }}</span>
                <span class="fs-cat-btn__count">
                  {{ cat.key === 'selected' ? agentForm.capabilities.length : (categoryCounts[cat.key]?.total || 0) }}
                </span>
                <span
                  v-if="cat.key !== 'selected' && categoryCounts[cat.key]?.selected > 0"
                  class="fs-cat-btn__dot"
                />
              </button>
            </div>

            <!-- 工具栏：搜索、风险过滤与批量操作 -->
            <div class="fs-cap-toolbar">
              <div class="fs-cap-toolbar__left">
                <div class="fs-search-wrap">
                  <el-input
                    v-model="capSearch"
                    placeholder="搜索能力名称、工具ID或描述..."
                    clearable
                    prefix-icon="Search"
                  />
                </div>

                <div class="fs-risk-filter">
                  <button
                    class="fs-filter-pill"
                    :class="{ 'is-active': riskFilter === 'all' }"
                    @click="riskFilter = 'all'"
                  >
                    全部风险
                  </button>
                  <button
                    class="fs-filter-pill"
                    :class="{ 'is-active': riskFilter === 'low' }"
                    @click="riskFilter = 'low'"
                  >
                    只读安全
                  </button>
                  <button
                    class="fs-filter-pill"
                    :class="{ 'is-active': riskFilter === 'med_high' }"
                    @click="riskFilter = 'med_high'"
                  >
                    操作执行
                  </button>
                </div>
              </div>

              <div class="fs-cap-toolbar__right">
                <button class="fs-quick-action-btn" @click="toggleSelectCurrentGroup(true)">
                  全选当前分类
                </button>
                <button class="fs-quick-action-btn" @click="toggleSelectCurrentGroup(false)">
                  取消当前分类
                </button>
                <span class="fs-divider-v" />
                <button class="fs-quick-action-btn" @click="selectAllCaps">
                  全部启用
                </button>
                <button class="fs-quick-action-btn fs-quick-action-btn--clear" @click="clearAllCaps">
                  清空已选
                </button>
                <div class="fs-count-summary">
                  已启用 <strong>{{ agentForm.capabilities.length }}</strong> / {{ capabilities.length }} 项
                </div>
              </div>
            </div>

            <!-- 通用工具能力网格 (全宽网格 · 靠左铺满分配空间) -->
            <div class="fs-grid-scroll">
              <div v-if="filteredCapabilities.length === 0" class="fs-empty-caps">
                <p class="fs-empty-caps__text">未找到匹配的能力项</p>
                <button
                  v-if="capSearch || riskFilter !== 'all' || activeCapGroup === 'selected'"
                  class="btn btn--secondary btn--sm"
                  @click="resetCapFilters"
                >
                  重置筛选条件
                </button>
              </div>

              <div v-else class="fs-caps-grid">
                <div
                  v-for="cap in filteredCapabilities"
                  :key="cap.id"
                  class="fs-cap-card"
                  :class="{ 'is-selected': agentForm.capabilities.includes(cap.id) }"
                  @click="toggleCapability(cap.id)"
                >
                  <div class="fs-cap-card__header">
                    <div class="fs-checkbox-box" :class="{ 'is-checked': agentForm.capabilities.includes(cap.id) }">
                      <el-icon v-if="agentForm.capabilities.includes(cap.id)"><Check /></el-icon>
                    </div>

                    <div class="fs-cap-card__title" :title="cap.name || cap.id">
                      {{ cap.name || cap.id }}
                    </div>

                    <div class="fs-cap-card__badges">
                      <span class="fs-cat-tag">{{ resolveCapCategory(cap).label }}</span>
                      <span class="fs-risk-tag" :class="`fs-risk-tag--${cap.risk || 'low'}`">
                        {{ cap.risk === 'high' ? '敏感' : (cap.risk === 'medium' ? '执行' : '只读') }}
                      </span>
                    </div>
                  </div>

                  <div class="fs-cap-card__id">{{ cap.id }}</div>

                  <p class="fs-cap-card__desc" :title="cap.description || ''">
                    {{ cap.description || '支持当前业务环境内的该项能力调用与调度。' }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="fs-dialog-footer">
        <button class="btn btn--secondary" @click="dialogVisible = false">取消</button>
        <button
          class="btn btn--primary"
          :disabled="savingAgent"
          @click="saveAgentConfiguration"
        >
          保存并生效
        </button>
      </div>
    </el-dialog>

    <!-- 定时任务（含 AI 自建循环计划） -->
    <el-dialog v-model="scheduleDialogVisible" title="定时任务" width="720px" class="sched-dialog">
      <div class="sched-list">
        <div v-if="scheduleLoading" class="sched-empty">加载中…</div>
        <div v-else-if="!schedules.length" class="sched-empty">该智能体暂无定时任务</div>
        <div v-for="s in schedules" :key="s.id" class="sched-item">
          <div class="sched-main">
            <div class="sched-title">
              <el-tag v-if="isAiSched(s)" type="warning" size="small" effect="plain">AI 自建</el-tag>
              <span>{{ s.title }}</span>
            </div>
            <div class="sched-meta">
              {{ s.scheduleText || s.triggerType }} · 下次 {{ formatSchedTime(s.nextRunAt) }}
            </div>
            <div class="sched-instructions">{{ s.instructions }}</div>
          </div>
          <div class="sched-ops">
            <el-switch
              :model-value="s.isEnabled"
              inline-prompt
              active-text="启"
              inactive-text="停"
              @change="(v: boolean) => toggleSched(s, v)"
            />
            <el-button size="small" type="danger" text @click="removeSched(s)">删除</el-button>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ArrowLeft,
  Check,
  CircleClose,
  CopyDocument,
  Delete,
  Refresh,
  Search,
  Setting,
  Timer
} from '@element-plus/icons-vue'
import MarkdownView from '@/components/MarkdownView/index.vue'
import InteractionRenderer from '@/components/AiAssistant/interactions/InteractionRenderer.vue'
import {
  AgentAdminApi,
  type AgentDefinition,
  type AgentTask,
  type CapabilityItem
} from '@/api/agent'
import {
  getAiScheduledTaskList,
  enableAiScheduledTask,
  disableAiScheduledTask,
  deleteAiScheduledTask
} from '@/api/aiScheduledTask'
import { resolveAgentGradient } from './gradients'
import './agent-gradients.css'

defineOptions({ name: 'AiAgentChat' })

const route = useRoute()
const router = useRouter()
/** AppView 提供的整页重挂载（解决 hash 已切、视图不切） */
const reloadAppView = inject<() => void>('reload')

// ── 页面状态与数据 ────────────────────────────────────────
const agent = ref<AgentDefinition | null>(null)
const currentTask = ref<AgentTask | null>(null)
const capabilities = ref<CapabilityItem[]>([])

// ── 定时任务（含 AI 自建循环计划） ──────────────────────────
const scheduleDialogVisible = ref(false)
const scheduleLoading = ref(false)
const schedules = ref<any[]>([])

function isAiSched(s: any) {
  return ((s?.tags || []) as string[]).includes('self-wake') || s?.source === 'ai';
}
function formatSchedTime(v?: string | null) {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleString('zh-CN', { hour12: false });
  } catch {
    return '—';
  }
}
async function openScheduleDialog() {
  scheduleDialogVisible.value = true;
  await loadSchedules();
}
async function loadSchedules() {
  if (!agent.value?.id) return;
  scheduleLoading.value = true;
  try {
    const data = await getAiScheduledTaskList({
      agentDefinitionId: String(agent.value.id),
      pageSize: 50,
    });
    const result: any = data;
    schedules.value = result?.items || result?.list || [];
  } catch (e: any) {
    ElMessage.error(e?.message || '加载定时任务失败');
  } finally {
    scheduleLoading.value = false;
  }
}
async function toggleSched(s: any, v: boolean) {
  try {
    if (v) await enableAiScheduledTask(s.id);
    else await disableAiScheduledTask(s.id);
    s.isEnabled = v;
    ElMessage.success(v ? '已启用' : '已暂停');
  } catch (e: any) {
    ElMessage.error(e?.message || '操作失败');
  }
}
async function removeSched(s: any) {
  try {
    await ElMessageBox.confirm('确认删除该定时任务？删除后不再按计划执行。', '提示', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    });
    await deleteAiScheduledTask(s.id);
    await loadSchedules();
    ElMessage.success('已删除');
  } catch {
    /* 用户取消 */
  }
}

const draftPrompt = ref('')
const pageReady = ref(false)
const cancelling = ref(false)
const isInputFocused = ref(false)
const opLoading = ref(false)
const savingAgent = ref(false)
const cleaningAgent = ref(false)

async function cleanNow() {
  if (!agent.value || cleaningAgent.value) return
  cleaningAgent.value = true
  try {
    const res: any = await AgentAdminApi.cleanNow(agent.value.id)
    const d = res?.data ?? res
    ElMessage.success(`清理完成：提炼微调 ${d?.promoted ?? 0} 条，裁剪 ${d?.trimmed ?? 0} 条，清空 ${d?.cleared ?? 0} 条`)
  } catch (e: any) {
    ElMessage.error(e?.message || '清理失败')
  } finally {
    cleaningAgent.value = false
  }
}
const optimizing = ref(false)
const autoOptimized = ref('')
const optimizeTime = ref('')

async function runOptimize() {
  if (!agent.value) return
  optimizing.value = true
  try {
    const res: any = await AgentAdminApi.optimizeInstructions(agent.value.id)
    const data = (res as any)?.data ?? res
    autoOptimized.value = data?.autoOptimizedInstructions || ''
    optimizeTime.value = data?.autoOptimizedAt
      ? new Date(data.autoOptimizedAt).toLocaleString('zh-CN')
      : ''
    if (autoOptimized.value) {
      ElMessage.success('优化完成，请审阅')
    } else {
      ElMessage.warning('未生成优化内容')
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '优化失败')
  } finally {
    optimizing.value = false
  }
}

async function acceptOptimized() {
  if (!agent.value) return
  try {
    const res: any = await AgentAdminApi.acceptOptimized(agent.value.id)
    const data = (res as any)?.data ?? res
    agent.value = data as any
    agentForm.instructions = data?.instructions || ''
    autoOptimized.value = ''
    ElMessage.success('已采纳优化版提示词')
  } catch (e: any) {
    ElMessage.error(e?.message || '采纳失败')
  }
}

async function rejectOptimized() {
  if (!agent.value) return
  try {
    await AgentAdminApi.rejectOptimized(agent.value.id)
    autoOptimized.value = ''
    ElMessage.info('已拒绝优化建议')
  } catch (e: any) {
    ElMessage.error(e?.message || '操作失败')
  }
}
const composerTextareaRef = ref<HTMLTextAreaElement | null>(null)
const chatScrollRef = ref<HTMLElement | null>(null)
const expandedToolGroups = ref(new Set<number>())
/** 工具明细默认展开，便于审查是否调用合理 */
const toolAutoOpen = ref(true)

let pollTimer: ReturnType<typeof setInterval> | null = null
let idleWatchTimer: ReturnType<typeof setInterval> | null = null

// ── 全屏弹窗表单 ──────────────────────────────────────────
const dialogVisible = ref(false)
const activeDialogTab = ref<string>('basic')

const dialogTabs = [
  { key: 'basic', label: '基本与指令' },
  { key: 'duty', label: '值守' },
  { key: 'runtime', label: '运行' },
  { key: 'clean', label: '清理' },
  { key: 'caps', label: '能力' },
]
const activeCapGroup = ref<string>('all')
const capSearch = ref('')
const riskFilter = ref<'all' | 'low' | 'med_high'>('all')

const agentForm = reactive({
  name: '',
  description: '',
  instructions: '',
  capabilities: [] as string[],
  enabled: true,
  dutyMode: 'off' as 'off' | 'duty',
  dutyGoal: '',
  dailyRunLimit: 24,
  wakeIntervalSeconds: 30,
  maxToolSteps: 50,
  temperature: 0.2,
  llmTimeoutMs: 90000,
  autoCleanEnabled: true,
  retainCompletedDays: 7,
  retainFailedDays: 3,
  maxWorklogEntries: 500,
  cleanIntervalHours: 24
})

// ── 通用业务智能体预设模板 (全业务通用，纯扁平，无多余Icon) ──
const universalPresets = [
  {
    name: '通用业务协同助手',
    desc: '面向多模块通用业务推进，具备系统查询、任务流转与上下文理解能力',
    instructions: `你是一个严谨高效的企业级业务协同智能体。你的目标是协助用户高效推进各项业务任务。
【工作规范】
1. 优先使用系统提供的真实工具查询数据，严禁凭空捏造虚假信息。
2. 收到用户任务后，先明确目标并拆解步骤，每一步调用最适合的工具推进。
3. 执行结果以结构化、清晰精炼的 Markdown 格式输出。`,
    defaultCaps: ['system.user.query_info', 'system.service.query_status']
  },
  {
    name: '流程与桌面自动化专员',
    desc: '专注于浏览器网页交互、自动化流程、Photoshop及远程客户端任务调度',
    instructions: `你是一名自动化流程执行专家。负责通过浏览器自动化、Photoshop 调度及客户端远程能力完成端到端任务。
【执行原则】
1. 在执行敏感或变更操作前，优先确认上下文参数正确性。
2. 遇到浏览器页面加载或客户端响应异常时，具备自动重试与状态诊断意识。
3. 输出包含操作链接、执行结果与耗时详情。`,
    defaultCaps: ['system.browser_automation.query_pages', 'system.browser_automation.open_link']
  },
  {
    name: '创意与多媒体制作专家',
    desc: '负责 Remotion 视频生成、AI语音TTS、AI图像TTI及多媒体工作流渲染',
    instructions: `你是一名多媒体创作与创意生成专家。擅长协调 AI 绘图、语音合成与视频模板渲染。
【创作流程】
1. 明确创意主题、风格基调及输出格式要求。
2. 智能调度 AI 语音、图像生成或视频模板渲染工具进行批量生产。
3. 渲染完成后提供产物预览信息及资产追踪路径。`,
    defaultCaps: ['video.template.list', 'ai.tts.generate', 'ai.tti.generate']
  },
  {
    name: '电商选品与发布顾问',
    desc: '负责商品信息解析、属性标准化、AI营销文案生成以及跨店铺发布任务调度',
    instructions: `你是一名电商运营与发布专家。负责商品信息解析、属性标准化、AI营销文案生成以及跨店铺发布任务的调度。
【运营准则】
1. 严格遵守电商平台规范，确保商品标题、类目与属性真实合规。
2. 发布任务提交后，实时追踪发布状态与报错信息并及时汇报。`,
    defaultCaps: ['product.search', 'product.detail', 'publish.task.list']
  },
  {
    name: '素材资产与知识库专员',
    desc: '负责贴纸图库、PSD模板、文案句库及企业设计规范知识的统一检索与管理',
    instructions: `你是一名素材资产与知识工程专家。负责企业设计资产、PSD模板、字体与文案资源的分类整理与高效检索。
【资产检索规范】
1. 根据用户关键词精准匹配素材资产标签与属性。
2. 支持多维度筛选（分类、分辨率、风格、许可），输出高可用资产链接。`,
    defaultCaps: ['material.sticker.search', 'material.psd_template.search']
  },
  {
    name: '系统监控与运维审计员',
    desc: '负责系统任务状态追踪、客户端在线探活、性能健康度统计与审计分析',
    instructions: `你是一名系统运维与审计专员。负责系统运行状况、队列任务健康度、客户端连接及操作日志的全局把控。
【运维规范】
1. 持续跟踪未决任务与异常报警，提供排查定位线索。
2. 统计模块容量与趋势，输出规范清晰的系统运行状态分析报告。`,
    defaultCaps: ['system.task.list', 'system.client.list_status', 'statistics.query']
  }
]

// ── 通用能力功能分类定义 ──
const capabilityCategories = [
  { key: 'all', label: '全部能力' },
  { key: 'automation', label: '自动化操作' },
  { key: 'ai', label: 'AI与智能' },
  { key: 'creative', label: '创意与工作流' },
  { key: 'material', label: '素材与知识库' },
  { key: 'ecommerce', label: '电商与业务' },
  { key: 'system', label: '系统与服务' },
  { key: 'selected', label: '已选能力' }
]

function resolveCapCategory(cap: CapabilityItem): { key: string; label: string } {
  const cat = String(cap.category || '').toLowerCase()
  const id = String(cap.id || '').toLowerCase()

  if (
    cat === 'browser' ||
    id.startsWith('system.browser_automation') ||
    id.startsWith('system.ps_automation') ||
    id.startsWith('client_runtime') ||
    id.startsWith('mcp_bridge') ||
    id.startsWith('system.design_tool')
  ) {
    return { key: 'automation', label: '自动化操作' }
  }

  if (
    cat === 'ai' ||
    id.startsWith('ai.') ||
    id.startsWith('image_processing') ||
    id.startsWith('ai_prompt') ||
    id.startsWith('design_request')
  ) {
    return { key: 'ai', label: 'AI与智能' }
  }

  if (
    cat === 'video' ||
    cat === 'workflow' ||
    id.startsWith('video.') ||
    id.startsWith('workflow.') ||
    id.startsWith('hotsearch.') ||
    id.startsWith('task.') ||
    id.startsWith('message_push.')
  ) {
    return { key: 'creative', label: '创意与工作流' }
  }

  if (
    cat === 'material' ||
    id.startsWith('material.') ||
    id.startsWith('asset_') ||
    id.startsWith('font.') ||
    id.startsWith('psd.')
  ) {
    return { key: 'material', label: '素材与知识库' }
  }

  if (
    cat === 'product' ||
    cat === 'shop' ||
    cat === 'publish' ||
    cat === 'partner' ||
    cat === 'ecom' ||
    cat === 'temu' ||
    id.startsWith('product.') ||
    id.startsWith('shop.') ||
    id.startsWith('publish.') ||
    id.startsWith('vendor.')
  ) {
    return { key: 'ecommerce', label: '电商与业务' }
  }

  return { key: 'system', label: '系统与服务' }
}

const categoryCounts = computed(() => {
  const counts: Record<string, { total: number; selected: number }> = {
    all: { total: capabilities.value.length, selected: agentForm.capabilities.length },
    automation: { total: 0, selected: 0 },
    ai: { total: 0, selected: 0 },
    creative: { total: 0, selected: 0 },
    material: { total: 0, selected: 0 },
    ecommerce: { total: 0, selected: 0 },
    system: { total: 0, selected: 0 }
  }

  for (const c of capabilities.value) {
    const groupKey = resolveCapCategory(c).key
    if (counts[groupKey]) {
      counts[groupKey].total += 1
      if (agentForm.capabilities.includes(c.id)) {
        counts[groupKey].selected += 1
      }
    }
  }

  return counts
})

const filteredCapabilities = computed(() => {
  let list = capabilities.value

  if (activeCapGroup.value === 'selected') {
    list = list.filter((c) => agentForm.capabilities.includes(c.id))
  } else if (activeCapGroup.value !== 'all') {
    list = list.filter((c) => resolveCapCategory(c).key === activeCapGroup.value)
  }

  if (capSearch.value.trim()) {
    const q = capSearch.value.trim().toLowerCase()
    list = list.filter(
      (c) =>
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.id && c.id.toLowerCase().includes(q)) ||
        (c.description && c.description.toLowerCase().includes(q))
    )
  }

  if (riskFilter.value === 'low') {
    list = list.filter((c) => c.risk === 'low' || (!c.risk && c.readOnly))
  } else if (riskFilter.value === 'med_high') {
    list = list.filter((c) => c.risk === 'medium' || c.risk === 'high')
  }

  return list
})

// ── 提示建议卡片 ──────────────────────────────────────────
const starterPrompts = computed(() => {
  if (!agent.value) return []
  const name = (agent.value.name || '').toLowerCase()
  if (name.includes('自动') || name.includes('流程')) {
    return [
      { text: '检查当前客户端与浏览器连接状态，报告运行环境概览' },
      { text: '打开常用设计工具后台并保持页面聚焦' },
      { text: '执行最近一项未完成的自动化排队任务' }
    ]
  }
  if (name.includes('视频') || name.includes('创意')) {
    return [
      { text: '检索高频推荐的 Remotion 视频模板并列出主要属性' },
      { text: '使用 AI 语音合成生成一段 15 秒旁白音频初稿' },
      { text: '生成一组设计风格概念图并追踪产物生成进度' }
    ]
  }
  if (name.includes('电商') || name.includes('商品')) {
    return [
      { text: '搜索近 7 天新增商品并分析类目与库存分布' },
      { text: '为最新设计款式生成多语言电商营销标题与卖点' },
      { text: '查询各店铺商品发布任务的最新执行状态' }
    ]
  }
  return [
    { text: '梳理并报告当前可用的业务工具与能力目录' },
    { text: '查询系统当前进行中的业务任务与健康度概览' },
    { text: '根据业务职责，列出建议优先推进的执行计划' }
  ]
})

// ── 状态计算 ──────────────────────────────────────────────
const isWorking = computed(() => Boolean(agent.value?.enabled && agent.value?.dutyMode === 'duty'))

const contextCount = computed(() => {
  const wl = currentTask.value?.worklog
  return Array.isArray(wl) ? wl.length : 0
})

const userMessageCount = computed(() => {
  const wl = currentTask.value?.worklog
  if (!Array.isArray(wl)) return 0
  return wl.filter((e: any) => e?.type === 'user').length
})

const showContextDrawer = ref(false)

const contextEvents = computed(() => {
  const wl = currentTask.value?.worklog
  return Array.isArray(wl) ? wl : []
})

function ctxTypeLabel(type?: string) {
  const map: Record<string, string> = {
    user: '用户',
    text: 'AI',
    tool: '工具',
    tool_pending: '工具',
    thinking: '思考',
    system: '系统',
    error: '错误',
    completed: '完成',
  }
  return map[type || ''] || type || '?'
}

function ctxPreview(content?: string) {
  const s = String(content || '')
  return s.length > 120 ? s.slice(0, 120) + '…' : s
}

async function toggleWorking() {
  if (!agent.value) return
  const next = isWorking.value ? 'off' : 'duty'
  if (next === 'duty' && !agent.value.dutyGoal?.trim()) {
    ElMessage.warning('请先在「配置」里填写驻守目标，再开启')
    openEditDialog()
    return
  }
  try {
    const payload: any = { dutyMode: next }
    if (next === 'duty' && !agent.value.enabled) {
      payload.enabled = true
    }
    const res: any = await AgentAdminApi.updateDefinition(agent.value.id, payload)
    agent.value = ((res as any)?.data ?? res) as AgentDefinition
    ElMessage.success(next === 'duty' ? '已开启，开始持续执行' : '已关闭，停止自动执行')
    if (next === 'duty') {
      void refreshCurrent()
      startIdleWatch()
    } else {
      stopIdleWatch()
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '切换工作状态失败')
  }
}
const isBusy = computed(() => {
  const st = currentTask.value?.status
  return st === 'pending' || st === 'running'
})

const isWaiting = computed(() => {
  const st = currentTask.value?.status
  return st === 'waiting_approval' || st === 'waiting_input'
})

// ── thinking 态增强：已运行时长 / 最近动作 / 卡住检测 ──
const thinkingTick = ref(0)
let thinkingTimer: ReturnType<typeof setInterval> | null = null

watch(isBusy, (busy) => {
  if (busy && !thinkingTimer) {
    thinkingTick.value = 0
    thinkingTimer = setInterval(() => { thinkingTick.value++ }, 1000)
  } else if (!busy && thinkingTimer) {
    clearInterval(thinkingTimer)
    thinkingTimer = null
  }
}, { immediate: true })

onBeforeUnmount(() => {
  if (thinkingTimer) { clearInterval(thinkingTimer); thinkingTimer = null }
})

const thinkingElapsed = computed(() => {
  void thinkingTick.value
  const events = (currentTask.value?.worklog || []) as any[]
  // 核心修复：优先取本轮用户输入或本轮调度唤醒的时间，精准统计「本轮正在执行」的时长，避免累加整个历史会话创建时长
  let roundStartTime: number | null = null
  for (let i = events.length - 1; i >= 0; i--) {
    const ev = events[i]
    if (ev?.type === 'user' || (ev?.type === 'system' && /唤醒|发起|开始/i.test(ev?.content || ''))) {
      if (ev.at) {
        roundStartTime = new Date(ev.at).getTime()
        break
      }
    }
  }
  const baseTime = roundStartTime || (currentTask.value as any)?.startedAt
  if (!baseTime) return ''
  const sec = Math.max(0, Math.floor((Date.now() - new Date(baseTime).getTime()) / 1000))
  if (sec < 60) return `${sec}s`
  return `${Math.floor(sec / 60)}m${sec % 60}s`
})

const thinkingLastAction = computed(() => {
  void thinkingTick.value
  const events = (currentTask.value?.worklog || []) as any[]
  for (let i = events.length - 1; i >= 0; i--) {
    const ev = events[i]
    if (ev?.type === 'tool_pending') {
      const q = ev.input?.query || ev.input?.keyword || ev.input?.searchText || ''
      const s = ev.input?.sourceId || ev.input?.source || ''
      let detail = ''
      if (q && s) detail = ` · [${s}]「${q}」`
      else if (q) detail = ` ·「${q}」`
      return `正在调用【${ev.label || ev.tool}】${detail}`
    }
    if (ev?.type === 'thinking' && ev.content) return ev.content
    if (ev?.type === 'tool') return `已完成【${ev.label || ev.tool}】`
    if (ev?.type === 'system') return (ev.content || '').slice(0, 30)
    if (ev?.type === 'text') return '正在生成回复...'
    if (ev?.type === 'user') return '正在分析指令与意图...'
  }
  return ''
})

const thinkingStalled = computed(() => {
  void thinkingTick.value
  const events = (currentTask.value?.worklog || []) as any[]
  const last = events[events.length - 1]
  if (!last?.at) return false
  const idleSec = (Date.now() - new Date(last.at).getTime()) / 1000
  // 心跳每 3s 发送，若超过 45s 无任何新事件才提示等待中
  return idleSec > 45
})

const thinkingLabel = computed(() => {
  void thinkingTick.value
  const events = (currentTask.value?.worklog || []) as any[]
  for (let i = events.length - 1; i >= 0; i--) {
    const ev = events[i]
    if (ev?.type === 'tool_pending') {
      const q = ev.input?.query || ev.input?.keyword || ev.input?.searchText || ''
      const s = ev.input?.sourceId || ev.input?.source || ''
      let detail = ''
      if (q && s) detail = ` · [${s}]「${q}」`
      else if (q) detail = ` ·「${q}」`
      return `正在执行：${ev.label || ev.tool}${detail}`
    }
    if (ev?.type === 'thinking' && ev.content) {
      return ev.content
    }
  }
  if (thinkingLastAction.value) return `正在执行：${thinkingLastAction.value}`
  return '正在自主思考与规划工具调用...'
})

const thinkingSubDetail = computed(() => {
  void thinkingTick.value
  const events = (currentTask.value?.worklog || []) as any[]
  for (let i = events.length - 1; i >= 0; i--) {
    const ev = events[i]
    if (ev?.type === 'thinking' && ev.content) {
      return ev.content
    }
  }
  return ''
})

const taskBadgeClass = computed(() => {
  const st = currentTask.value?.status
  if (st === 'running') return 'running'
  if (st === 'waiting_approval' || st === 'waiting_input') return 'waiting'
  if (st === 'completed') return 'completed'
  if (st === 'failed') return 'failed'
  return 'idle'
})

const currentTaskStatusLabel = computed(() => {
  const map: Record<string, string> = {
    pending: '排队中',
    running: '正在执行',
    waiting_approval: '等待审批',
    waiting_input: '等待输入',
    completed: '执行完成',
    failed: '执行异常',
    cancelled: '已中止'
  }
  const st = currentTask.value?.status
  return st ? map[st] || st : '就绪'
})

// ── worklog → 对话流 ─────────────────────────────────────
const chatItems = computed(() => {
  const events = (currentTask.value?.worklog || []) as any[]
  const items: any[] = []
  let textBuf = ''
  let toolBuf: any[] = []
  let interact: any = null
  let groupAt = ''

  const flush = (at?: string) => {
    if (toolBuf.length || textBuf || interact) {
      items.push({
        kind: 'assistant-group',
        tools: toolBuf,
        content: textBuf || '',
        thinking: false,
        interact,
        at: groupAt || at || toolBuf[0]?.at || ''
      })
    }
    textBuf = ''
    toolBuf = []
    interact = null
    groupAt = ''
  }

  for (const ev of events) {
    if (ev?.type === 'text') {
      if (!groupAt && ev.at) groupAt = ev.at
      textBuf += ev.content || ''
      continue
    }
    if (ev?.type === 'thinking') {
      continue
    }
    if (ev?.type === 'user') {
      flush(ev.at)
      items.push({ kind: 'user', content: ev.content, at: ev.at })
    } else if (ev?.type === 'system') {
      flush(ev.at)
      items.push({
        kind: 'system',
        content: ev.content || '',
        level: ev.level || 'info',
        at: ev.at
      })
    } else if (ev?.type === 'tool_pending') {
      let inputText = ''
      try {
        inputText = JSON.stringify(ev.input ?? {}, null, 2)
        if (inputText.length > 800) inputText = inputText.slice(0, 800) + '…'
      } catch {
        inputText = String(ev.input || '')
      }
      const existing = toolBuf.find(t => t.tool === ev.tool && t.status === 'running')
      if (!existing) {
        toolBuf.push({
          id: `pending-${ev.tool}-${ev.at}`,
          tool: ev.tool,
          label: ev.label,
          input: ev.input,
          inputText,
          summary: '正在执行中...',
          error: undefined,
          durationMs: null,
          at: ev.at,
          assets: [],
          status: 'running'
        })
      }
    } else if (ev?.type === 'tool') {
      let inputText = ''
      try {
        inputText = JSON.stringify(ev.input ?? {}, null, 2)
        if (inputText.length > 800) inputText = inputText.slice(0, 800) + '…'
      } catch {
        inputText = String(ev.input || '')
      }
      const pendingIdx = toolBuf.findLastIndex(t => t.tool === ev.tool && t.status === 'running')
      const toolItem = {
        id: `${ev.tool}-${ev.at}`,
        tool: ev.tool,
        label: ev.label,
        input: ev.input,
        inputText,
        summary: ev.summary,
        error: ev.error,
        durationMs: ev.durationMs,
        assets: ev.assets || [],
        status: ev.success ? 'done' : 'error',
        at: ev.at
      }
      if (pendingIdx !== -1) {
        toolBuf[pendingIdx] = toolItem
      } else {
        toolBuf.push(toolItem)
      }
    } else if (ev?.type === 'interrupt') {
      interact = toInteractionPayload(ev.payload || {})
    } else if (ev?.type === 'error') {
      flush(ev.at)
      items.push({ kind: 'error', event: ev, at: ev.at })
    }
  }

  // 最后一轮 assistant 组装
  if (isBusy.value) {
    items.push({
      kind: 'assistant-group',
      tools: toolBuf,
      content: textBuf || '',
      thinking: true,
      interact,
      at: groupAt || toolBuf[0]?.at || ''
    })
  } else {
    flush(groupAt || (events[events.length - 1] as any)?.at)
  }

  return items
})

const composerPlaceholder = computed(() => {
  if (isWaiting.value) return '当前任务等待确认，请输入您的反馈意见...'
  if (isBusy.value) return '智能体执行中，可继续输入指令（Enter 发送）...'
  return '输入业务指令或目标，智能体将自主规划推进 (Enter 发送)...'
})

function formatDuration(ms?: number) {
  if (ms == null) return ''
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(ms < 10000 ? 1 : 0)}s`
}

function formatLogTime(at?: string) {
  if (!at) return ''
  try {
    const d = new Date(at)
    const p = (n: number) => String(n).padStart(2, '0')
    return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
  } catch {
    return ''
  }
}

/** 把用户这句话存为长期微调笔记（注入后续值守） */
async function saveAsWorkNote(text: string) {
  if (!agent.value || !text.trim()) return
  try {
    await AgentAdminApi.appendWorkNote(agent.value.id, text.trim())
    ElMessage.success('已保存为长期微调笔记，后续值守将遵守')
  } catch (e: any) {
    ElMessage.error(e?.message || '保存微调笔记失败')
  }
}

function toInteractionPayload(payload: any) {
  if (!payload) return null
  const question = String(payload?.question || payload?.title || '需要确认')
  return {
    type: payload?.type || 'confirm',
    runId: payload?.runId || currentTask.value?.runId || currentTask.value?.id || '',
    question,
    title: question,
    message: payload?.message || payload?.contextSummary || '',
    tool: payload?.toolName || payload?.tool,
    toolName: payload?.toolName || payload?.tool,
    options: payload?.options,
    confirmText: payload?.confirmText || '批准执行',
    cancelText: payload?.cancelText || '驳回',
    fields: payload?.fields,
    defaultValue: payload?.defaultValue,
    riskLevel: payload?.riskLevel,
    preview: payload?.preview,
    plan: payload?.plan,
    compare: payload?.compare,
    steps: payload?.steps
  } as any
}

// ── 数据加载 ──────────────────────────────────────────────
async function loadAgentAndLatestTask() {
  const id = String(route.params.id || '')
  if (!id) {
    router.replace('/ai/agent')
    return
  }

  try {
    // 🚀 并发拉取智能体信息与最新任务，消除串行瀑布流延迟
    const [defRes, capRes, taskRes] = await Promise.all([
      AgentAdminApi.definitions(),
      AgentAdminApi.capabilities().catch(() => []),
      AgentAdminApi.tasks({ agentDefinitionId: id, pageSize: 1 }).catch(() => null)
    ])

    const list = ((defRes as any)?.data ?? defRes) as AgentDefinition[] || []
    agent.value = list.find((x) => x.id === id) || null
    capabilities.value = ((capRes as any)?.data ?? capRes) as CapabilityItem[] || []

    if (!agent.value) {
      ElMessage.warning('智能体不存在或已被移除')
      router.replace('/ai/agent')
      return
    }

    const items = (taskRes as any)?.data?.items ?? (taskRes as any)?.items ?? []
    if (items.length) {
      await openTask(items[0].id)
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '加载智能体信息失败')
  } finally {
    pageReady.value = true
    // 🚀 核心修复：在 DOM 切换到 chat-stream 并挂载完毕后，立即瞬间置底，并做延时补滚
    await nextTick()
    scrollToBottom({ instant: true, retries: 3 })
  }
}

async function openTask(taskId: string) {
  try {
    const res: any = await AgentAdminApi.taskDetail(taskId)
    currentTask.value = (res?.data ?? res) as AgentTask
    await nextTick()
    scrollToBottom({ instant: true, retries: 2 })
    if (isBusy.value) startPolling()
    else stopPolling()
  } catch {
    /* ignore */
  }
}

async function refreshCurrent() {
  if (currentTask.value?.id) {
    await openTask(currentTask.value.id)
  } else if (agent.value) {
    await loadAgentAndLatestTask()
  }
}

function backToList(e?: Event) {
  e?.preventDefault()
  e?.stopPropagation()
  const go = () => {
    // 强制 AppView 重挂载，确保聊天页卸载、列表页出现
    reloadAppView?.()
  }
  if (route.name === 'AiAgent') {
    go()
    return
  }
  void router
    .replace({ path: '/ai/agent' })
    .then(go)
    .catch(() => {
      window.location.hash = '#/ai/agent'
      setTimeout(go, 0)
    })
}

// ── 发送指令与对话 ────────────────────────────────────────
async function sendPrompt() {
  const text = draftPrompt.value.trim()
  if (!text || !agent.value) return

  draftPrompt.value = ''
  nextTick(autoResizeComposer)

  if (currentTask.value && isWaiting.value) {
    try {
      const res: any = await AgentAdminApi.replyTask(currentTask.value.id, text)
      currentTask.value = (res?.data ?? res) as AgentTask
      scrollToBottom()
      startPolling()
      ElMessage.success('已补充输入并继续执行')
    } catch (e: any) {
      ElMessage.error(e?.message || '补充输入失败')
    }
    return
  }

  // 每个智能体只保留一条对话：已有会话线程则续聊，否则创建首个任务
  if (currentTask.value) {
    try {
      const res: any = await AgentAdminApi.sendMessage(currentTask.value.id, text)
      currentTask.value = (res?.data ?? res) as AgentTask
      expandedToolGroups.value.clear()
      await nextTick()
      scrollToBottom()
      startPolling()
    } catch (e: any) {
      if (isBusy.value) {
        // 执行中：消息已入队，等当前轮完成后处理
        ElMessage.info('消息已记录，将在当前任务完成后处理')
      } else {
        ElMessage.error(e?.message || '发送消息失败')
      }
    }
    return
  }

  try {
    const res: any = await AgentAdminApi.dispatchTask({
      agentDefinitionId: agent.value.id,
      title: text.length > 20 ? text.slice(0, 20) + '...' : text,
      prompt: text
    })
    currentTask.value = (res?.data ?? res) as AgentTask
    expandedToolGroups.value.clear()
    await nextTick()
    scrollToBottom()
    startPolling()
  } catch (e: any) {
    ElMessage.error(e?.message || '下发任务失败')
  }
}

function useStarterPrompt(text: string) {
  draftPrompt.value = text
  sendPrompt()
}

// ── 轮询任务状态 ──────────────────────────────────────────
function startPolling() {
  stopPolling()
  pollTimer = setInterval(async () => {
    if (!currentTask.value?.id) return stopPolling()
    try {
      const res: any = await AgentAdminApi.taskDetail(currentTask.value.id)
      const fresh = (res?.data ?? res) as AgentTask
      currentTask.value = fresh
      if (!['pending', 'running'].includes(fresh.status)) {
        stopPolling()
      }
      await nextTick()
      scrollToBottom({ instant: false, retries: 1 })
    } catch {
      stopPolling()
    }
  }, 2200)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

/**
 * 值守空闲观察：开启后后台会新建任务轮，对话页需主动拉取才看得到。
 * 无进行中任务时定期查最新任务并打开。
 */
function startIdleWatch() {
  stopIdleWatch()
  idleWatchTimer = setInterval(async () => {
    if (!agent.value || !isWorking.value) return
    if (isBusy.value) return
    try {
      const id = String(route.params.id || '')
      if (!id) return
      const taskRes: any = await AgentAdminApi.tasks({ agentDefinitionId: id, pageSize: 1 })
      const items = taskRes?.data?.items ?? taskRes?.items ?? []
      const latest = items[0]
      if (!latest) return
      // 用户眼中只有一个对话：新任务静默切换
      if (!currentTask.value || currentTask.value.id !== latest.id) {
        await openTask(latest.id)
      }
    } catch {
      /* ignore */
    }
  }, 3000)
}

function stopIdleWatch() {
  if (idleWatchTimer) {
    clearInterval(idleWatchTimer)
    idleWatchTimer = null
  }
}

// ── 人机协作确认提交 (Human-in-the-loop) ──────────────────
async function onInteractSubmit(payload: any) {
  if (!currentTask.value) return
  opLoading.value = true
  try {
    // 任务已不在挂起态：反馈转为追加消息，避免 500
    if (!isWaiting.value) {
      const text = String(
        payload?.input?.value ?? payload?.input?.answer ?? payload?.reason ?? ''
      ).trim() || JSON.stringify(payload?.input || {})
      const res: any = await AgentAdminApi.sendMessage(currentTask.value.id, text)
      currentTask.value = (res?.data ?? res) as AgentTask
      startPolling()
      return
    }
    if (payload?.confirmed) {
      const res: any = await AgentAdminApi.approveTask(currentTask.value.id)
      currentTask.value = (res?.data ?? res) as AgentTask
    } else {
      const res: any = await AgentAdminApi.replyTask(
        currentTask.value.id,
        JSON.stringify(payload?.input || {})
      )
      currentTask.value = (res?.data ?? res) as AgentTask
    }
    startPolling()
  } catch (e: any) {
    ElMessage.error(e?.message || '确认提交失败')
  } finally {
    opLoading.value = false
  }
}

async function onInteractReject() {
  if (!currentTask.value) return
  if (!isWaiting.value) return
  opLoading.value = true
  try {
    const res: any = await AgentAdminApi.declineTask(currentTask.value.id)
    currentTask.value = (res?.data ?? res) as AgentTask
    startPolling()
  } catch (e: any) {
    ElMessage.error(e?.message || '驳回操作失败')
  } finally {
    opLoading.value = false
  }
}

async function cancelCurrentTask() {
  if (!currentTask.value || cancelling.value) return
  try {
    await ElMessageBox.confirm('确定中止当前智能体的执行过程吗？', '提示', {
      type: 'warning',
      confirmButtonText: '确定中止',
      cancelButtonText: '取消'
    })
    cancelling.value = true
    const id = currentTask.value.id
    // 1) 立即本地置为已中止并停轮询（消除“点了没反应”）
    stopPolling()
    currentTask.value = {
      ...currentTask.value,
      status: 'cancelled',
      finishedAt: new Date().toISOString()
    } as AgentTask
    ElMessage.info('任务已中止')
    // 2) 后台落库/真正 abort 图，不阻塞 UI
    AgentAdminApi.cancelTask(id)
      .then((res: any) => {
        const fresh = (res?.data ?? res) as AgentTask
        if (currentTask.value?.id === id && fresh) currentTask.value = fresh
      })
      .catch((e: any) => {
        ElMessage.error(e?.message || '中止落库失败')
      })
      .finally(() => {
        cancelling.value = false
      })
  } catch {
    cancelling.value = false
  }
}

/** 清空对话并重置会话状态（删除当前任务，下次发送为全新会话） */
async function clearConversation() {
  const id = currentTask.value?.id
  if (!id) return
  try {
    await ElMessageBox.confirm(
      '将清空当前全部对话记录并重置会话状态，此操作不可恢复。确定继续吗？',
      '清空对话',
      {
        type: 'warning',
        confirmButtonText: '清空并重置',
        cancelButtonText: '取消'
      }
    )
    await AgentAdminApi.clearTask(id)
    stopPolling()
    currentTask.value = null
    expandedToolGroups.value.clear()
    draftPrompt.value = ''
    pageReady.value = true
    ElMessage.success('对话已清空，可开始新会话')
    nextTick(() => {
      composerTextareaRef.value?.focus()
    })
  } catch {
    /* cancel */
  }
}

// ── 全屏弹窗配置 ──────────────────────────────────────────
function openEditDialog() {
  if (!agent.value) return
  activeDialogTab.value = 'basic'
  activeCapGroup.value = 'all'
  capSearch.value = ''
  riskFilter.value = 'all'

  agentForm.name = agent.value.name || ''
  agentForm.dutyMode = agent.value.dutyMode === 'duty' ? 'duty' : 'off'
  agentForm.dutyGoal = agent.value.dutyGoal || ''
  agentForm.dailyRunLimit = agent.value.dailyRunLimit || 24
  agentForm.wakeIntervalSeconds = (agent.value as any).wakeIntervalSeconds || 30
  agentForm.maxToolSteps = (agent.value as any).maxToolSteps || 50
  agentForm.temperature = Number((agent.value as any).temperature) || 0.2
  agentForm.llmTimeoutMs = (agent.value as any).llmTimeoutMs || 90000
  agentForm.autoCleanEnabled = (agent.value as any).autoCleanEnabled !== false
  agentForm.retainCompletedDays = (agent.value as any).retainCompletedDays || 7
  agentForm.retainFailedDays = (agent.value as any).retainFailedDays || 3
  agentForm.maxWorklogEntries = (agent.value as any).maxWorklogEntries || 500
  agentForm.cleanIntervalHours = (agent.value as any).cleanIntervalHours || 24
  agentForm.description = agent.value.description || ''
  agentForm.instructions = agent.value.instructions || ''
  agentForm.capabilities = Array.isArray(agent.value.capabilities) ? [...agent.value.capabilities] : []
  agentForm.enabled = agent.value.enabled ?? true

  // 加载优化草稿
  autoOptimized.value = (agent.value as any).autoOptimizedInstructions || ''
  optimizeTime.value = (agent.value as any).autoOptimizedAt
    ? new Date((agent.value as any).autoOptimizedAt).toLocaleString('zh-CN')
    : ''

  dialogVisible.value = true
}

function applyPreset(p: (typeof universalPresets)[0]) {
  agentForm.name = p.name
  agentForm.description = p.desc
  agentForm.instructions = p.instructions
  agentForm.capabilities = [...p.defaultCaps]
  ElMessage.success(`已应用「${p.name}」预设`)
}

function toggleCapability(id: string) {
  const idx = agentForm.capabilities.indexOf(id)
  if (idx >= 0) agentForm.capabilities.splice(idx, 1)
  else agentForm.capabilities.push(id)
}

function toggleSelectCurrentGroup(select: boolean) {
  const groupCaps = filteredCapabilities.value.map((c) => c.id)
  if (select) {
    for (const id of groupCaps) {
      if (!agentForm.capabilities.includes(id)) {
        agentForm.capabilities.push(id)
      }
    }
    ElMessage.success(`已勾选当前分类 ${groupCaps.length} 项能力`)
  } else {
    agentForm.capabilities = agentForm.capabilities.filter((id) => !groupCaps.includes(id))
    ElMessage.info('已取消勾选当前分类能力')
  }
}

function selectAllCaps() {
  agentForm.capabilities = capabilities.value.map((c) => c.id)
  ElMessage.success(`已启用全部 ${capabilities.value.length} 项系统能力`)
}

function clearAllCaps() {
  agentForm.capabilities = []
  ElMessage.info('已清空所有勾选能力')
}

function resetCapFilters() {
  capSearch.value = ''
  riskFilter.value = 'all'
  activeCapGroup.value = 'all'
}

async function saveAgentConfiguration() {
  if (!agent.value) return
  if (!agentForm.name.trim()) {
    ElMessage.warning('请输入智能体名称')
    return
  }

  savingAgent.value = true
  try {
    const res: any = await AgentAdminApi.updateDefinition(agent.value.id, {
      name: agentForm.name.trim(),
      description: agentForm.description.trim(),
      instructions: agentForm.instructions.trim(),
      capabilities: agentForm.capabilities,
      enabled: agentForm.enabled,
      dutyMode: agentForm.dutyMode,
      dutyGoal: agentForm.dutyGoal.trim() || null,
      dailyRunLimit: agentForm.dailyRunLimit,
      wakeIntervalSeconds: agentForm.wakeIntervalSeconds,
      maxToolSteps: agentForm.maxToolSteps,
      temperature: agentForm.temperature,
      llmTimeoutMs: agentForm.llmTimeoutMs,
      autoCleanEnabled: agentForm.autoCleanEnabled,
      retainCompletedDays: agentForm.retainCompletedDays,
      retainFailedDays: agentForm.retainFailedDays,
      maxWorklogEntries: agentForm.maxWorklogEntries,
      cleanIntervalHours: agentForm.cleanIntervalHours
    })
    agent.value = ((res as any)?.data ?? res) as AgentDefinition
    dialogVisible.value = false
    ElMessage.success('智能体配置已更新')
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  } finally {
    savingAgent.value = false
  }
}

function handleComposerKeyDown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendPrompt()
  }
}

function autoResizeComposer() {
  const el = composerTextareaRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 180)}px`
}

function scrollToBottom(options: { instant?: boolean; retries?: number } = {}) {
  const { instant = false, retries = 2 } = options
  nextTick(() => {
    const el = chatScrollRef.value
    if (!el) return

    const doScroll = () => {
      if (!el) return
      // 双重保障：scrollTop 置底 + scrollTo 执行
      el.scrollTop = el.scrollHeight
      el.scrollTo({
        top: el.scrollHeight,
        behavior: instant ? 'auto' : 'smooth'
      })
    }

    doScroll()

    // 针对 Markdown 异步高亮与图片渲染高度撑开的延时补滚
    if (retries > 0) {
      setTimeout(doScroll, 80)
      setTimeout(doScroll, 220)
      if (retries > 2) {
        setTimeout(doScroll, 500)
      }
    }
  })
}

// 消息条数变化时自动平滑滚到底部（仅在已就绪后触发）
watch(
  () => chatItems.value.length,
  (newLen, oldLen) => {
    if (pageReady.value && newLen > (oldLen || 0)) {
      scrollToBottom({ instant: false, retries: 1 })
    }
  }
)

const userFoldedToolGroups = ref(new Set<number>())

function isToolsExpanded(idx: number, item?: any) {
  if (userFoldedToolGroups.value.has(idx)) return false
  if (expandedToolGroups.value.has(idx)) return true
  if (toolAutoOpen.value) return true
  if (item?.tools?.some((t: any) => t.status === 'running')) return true
  return false
}

function toggleToolsExpand(idx: number, item?: any) {
  if (isToolsExpanded(idx, item)) {
    userFoldedToolGroups.value.add(idx)
    expandedToolGroups.value.delete(idx)
  } else {
    userFoldedToolGroups.value.delete(idx)
    expandedToolGroups.value.add(idx)
  }
  nextTick(() => {
    scrollToBottom({ instant: false, retries: 1 })
  })
}

async function copyText(str: string) {
  try {
    await navigator.clipboard.writeText(str)
    ElMessage.success('已复制到剪贴板')
  } catch {
    ElMessage.info('复制失败，请手动选择复制')
  }
}

onMounted(() => {
  void loadAgentAndLatestTask().then(() => {
    if (isWorking.value) startIdleWatch()
  })
})

// 路由 id 变化时重置加载态，避免残留上一会话内容
watch(
  () => route.params.id,
  (id, prev) => {
    if (!id || id === prev) return
    pageReady.value = false
    currentTask.value = null
    stopPolling()
    void loadAgentAndLatestTask()
  }
)

onBeforeUnmount(() => {
  stopPolling()
  stopIdleWatch()
})
</script>

<style scoped lang="scss">
/* ═══════════════════════════════════════════════════════════
   极简扁平对话工作台 (ChatGPT / Grok 风格 · 黑夜/白天全兼容)
   ═══════════════════════════════════════════════════════════ */

.agent-chat-page {
  /* 对齐布局 ElScrollbar 可视高度，避免外层再出一条滚动条 */
  --chat-page-height: calc(
    100vh - var(--top-tool-height) - var(--tags-view-height)
  );
  --chat-page-height: calc(
    100dvh - var(--top-tool-height) - var(--tags-view-height)
  );

  display: flex;
  flex-direction: column;
  width: 100%;
  height: var(--chat-page-height);
  min-height: 0;
  overflow: hidden;
  background: var(--app-content-bg-color, #f8fafc);

  /* 主题色彩令牌 */
  --c-bg-surface: var(--app-content-surface-color, #ffffff);
  --c-border: var(--app-content-border-color, rgba(148, 163, 184, 0.22));
  --c-text-primary: var(--el-text-color-primary, #0f172a);
  --c-text-secondary: var(--el-text-color-secondary, #64748b);
  --c-text-placeholder: var(--el-text-color-placeholder, #94a3b8);
  --c-primary: var(--el-color-primary, var(--el-color-primary));
}

/* ════ 顶栏 ════ */
.chat-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 52px;
  padding: 0 24px;
  background: transparent;
  flex-shrink: 0;
  z-index: 10;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  corner-shape: squircle;
  border: none;
  background: transparent;
  color: var(--c-text-secondary);
  cursor: pointer;
  text-decoration: none;
  transition: all 0.15s ease;

  &:hover {
    background: var(--el-fill-color);
    color: var(--c-text-primary);
  }
}

.agent-profile {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.agent-avatar-wrap {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  position: relative;
  border-radius: 50%;

  &.is-duty {
    &::before {
      content: '';
      position: absolute;
      inset: -3px;
      border-radius: 50%;
      border: 2px solid var(--el-color-danger);
      pointer-events: none;
      animation: agent-duty-heartbeat 1.4s ease-in-out infinite;
    }

    &::after {
      content: '';
      position: absolute;
      inset: -3px;
      border-radius: 50%;
      border: 2px solid var(--el-color-danger);
      opacity: 0;
      pointer-events: none;
      animation: agent-duty-heart-ring 1.4s ease-in-out infinite;
    }
  }
}

.agent-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  color: var(--c-text-primary);
  font-weight: 600;
  font-size: 13px;
  overflow: hidden;

  &:not(.agent-gradient) {
    background: var(--el-fill-color);
  }

  &.agent-gradient {
    color: var(--el-color-white);
    isolation: isolate;
  }
}

@keyframes agent-duty-heartbeat {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  15% {
    transform: scale(1.12);
    opacity: 1;
  }
  30% {
    transform: scale(1);
    opacity: 0.85;
  }
  45% {
    transform: scale(1.08);
    opacity: 1;
  }
  60% {
    transform: scale(1);
    opacity: 0.9;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes agent-duty-heart-ring {
  0% {
    transform: scale(1);
    opacity: 0.55;
  }
  70% {
    transform: scale(1.35);
    opacity: 0;
  }
  100% {
    transform: scale(1.35);
    opacity: 0;
  }
}

@keyframes agent-duty-border {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  10% {
    transform: scale(1);
  }
  40% {
    opacity: 0.8;
  }
  66% {
    outline-width: 2px;
  }
  100% {
    transform: scale(1.23);
    opacity: 0;
    outline-width: 0px;
  }
}

.agent-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.agent-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.agent-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--c-text-primary);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10.5px;
  padding: 1px 6px;
  border-radius: 10px;
  corner-shape: squircle;
  background: var(--el-fill-color);
  color: var(--c-text-secondary);

  &__dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: currentColor;
  }

  &--running {
    background: color-mix(in srgb, var(--el-color-success) 12%, transparent);
    color: var(--el-color-success);
  }

  &--waiting {
    background: color-mix(in srgb, var(--el-color-warning) 12%, transparent);
    color: var(--el-color-warning);
  }
}

.agent-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--c-text-placeholder);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  &__desc {
    max-width: 280px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.topbar-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 30px;
  padding: 0 10px;
  border-radius: 8px;
  corner-shape: squircle;
  border: none;
  background: transparent;
  color: var(--c-text-secondary);
  font-size: 12.5px;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: var(--el-fill-color);
    color: var(--c-text-primary);
  }

  &--icon {
    width: 30px;
    padding: 0;
    justify-content: center;
    font-size: 14px;
  }

  &--danger {
    background: color-mix(in srgb, var(--el-color-danger) 12%, transparent);
    color: var(--el-color-danger);

    &:hover {
      background: color-mix(in srgb, var(--el-color-danger) 12%, transparent);
      color: var(--el-color-danger);
    }
  }

  &--work {
    gap: 6px;

    .work-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--c-text-placeholder, #94a3b8);
    }

    &.is-on {
      background: color-mix(in srgb, var(--el-color-success) 12%, transparent);
      color: var(--el-color-success);

      .work-dot {
        background: var(--el-color-success);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--el-color-success) 18%, transparent);
        animation: duty-pulse 1.6s ease-in-out infinite;
      }

      &:hover {
        background: color-mix(in srgb, var(--el-color-danger) 12%, transparent);
        color: var(--el-color-danger);

        .work-dot {
          background: var(--el-color-danger);
          box-shadow: none;
          animation: none;
        }
      }
    }
  }
}

.topbar-divider {
  width: 1px;
  height: 16px;
  margin: 0 4px;
  background: var(--el-border-color-lighter);
  border-radius: 1px;
}

@keyframes duty-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.45;
  }
}

/* ════ 对话流（页面内唯一滚动区） ════ */
.chat-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  display: flex;
  flex-direction: column;
  scrollbar-width: thin;
  scrollbar-color: var(--el-border-color-darker, rgba(148, 163, 184, 0.45)) transparent;

  &::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: var(--el-border-color-darker, rgba(148, 163, 184, 0.45));
    border-radius: 999px;

    &:hover {
      background: var(--el-text-color-placeholder, #94a3b8);
    }
  }
}

.chat-container {
  width: 100%;
  max-width: none;
  margin: 0 auto;
  padding: 20px 28px 16px;
  display: flex;
  flex-direction: column;
  flex: 1;
  box-sizing: border-box;
}

/* 首屏加载占位 */
.chat-boot {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: auto 0;
  padding: 48px 0;
}

.boot-skeleton {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  max-width: 480px;

  &__line {
    height: 14px;
    border-radius: 7px;
    background: var(--el-fill-color, rgba(148, 163, 184, 0.12));
    animation: boot-fade 1.4s ease-in-out infinite;

    &--user {
      width: 60%;
      align-self: flex-end;
    }

    &--short {
      width: 72%;
    }
  }
}

@keyframes boot-fade {
  0%,
  100% {
    opacity: 0.5;
  }
  50% {
    opacity: 1;
  }
}

/* 空态欢迎屏 */
.chat-welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: auto 0;
  text-align: center;
  padding: 40px 0;
}

.welcome-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  margin-bottom: 16px;
  overflow: hidden;

  &:not(.agent-gradient) {
    background: var(--el-fill-color);
  }
}

.welcome-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--c-text-primary);
  margin: 0 0 8px;
  letter-spacing: -0.01em;
}

.welcome-subtitle {
  font-size: 13.5px;
  color: var(--c-text-secondary);
  max-width: 460px;
  line-height: 1.55;
  margin: 0 0 24px;
}

.welcome-duty-hint {
  font-size: 12px;
  color: var(--c-primary, var(--el-color-primary));
  margin: -12px 0 20px;
  animation: boot-fade 1.4s ease-in-out infinite;
}

.welcome-prompts {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  max-width: 720px;
}

.prompt-chip {
  display: flex;
  align-items: center;
  padding: 10px 14px;
  border-radius: 8px;
  corner-shape: squircle;
  border: 1px solid var(--c-border);
  background: var(--c-bg-surface);
  color: var(--c-text-primary);
  font-size: 12.5px;
  text-align: left;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    border-color: var(--c-primary);
    background: var(--el-fill-color-lighter);
  }
}

/* 消息流 */
.chat-stream {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.msg-row {
  display: flex;
  width: 100%;

  &--user {
    justify-content: flex-end;
  }

  &--assistant {
    justify-content: flex-start;
  }

  &--system {
    justify-content: center;
    padding: 2px 0;
  }
}

/* 调度/状态时间线 */
.system-line {
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  max-width: 92%;
  padding: 4px 10px;
  border-radius: 8px;
  corner-shape: squircle;
  font-size: 11.5px;
  line-height: 1.45;
  background: var(--el-fill-color-light, rgba(148, 163, 184, 0.1));
  color: var(--c-text-secondary);

  &__time {
    flex-shrink: 0;
    font-variant-numeric: tabular-nums;
    color: var(--c-text-placeholder);
    font-size: 10.5px;
  }

  &__text {
    white-space: pre-wrap;
    word-break: break-word;
  }

  &--warn {
    background: color-mix(in srgb, var(--el-color-warning) 12%, transparent);
    color: var(--el-color-warning);
  }

  &--success {
    background: color-mix(in srgb, var(--el-color-success) 12%, transparent);
    color: var(--el-color-success);
  }
}

.msg-time {
  font-size: 11px;
  color: var(--el-text-color-secondary, #909399);
  margin-bottom: 4px;
  user-select: none;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.3px;

  &--assistant {
    margin-bottom: 6px;
    padding-left: 2px;
  }
}

.meta-link {
  background: none;
  border: none;
  padding: 0;
  font-size: inherit;
  color: var(--c-primary, var(--el-color-primary));
  cursor: pointer;
  text-decoration: underline dotted;
  text-underline-offset: 3px;

  &:hover {
    opacity: 0.8;
  }
}

.ctx-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 4px 0;
}

.ctx-item {
  padding: 8px 10px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  font-size: 12px;

  &__head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  }

  &__type {
    font-size: 11px;
    padding: 1px 6px;
    border-radius: 4px;
    background: var(--el-fill-color);
    color: var(--el-text-color-secondary);

    &--user {
      background: color-mix(in srgb, var(--el-color-primary) 12%, transparent);
      color: var(--el-color-primary);
    }
    &--error {
      background: color-mix(in srgb, var(--el-color-danger) 12%, transparent);
      color: var(--el-color-danger);
    }
    &--tool {
      background: color-mix(in srgb, var(--el-color-warning) 12%, transparent);
      color: var(--el-color-warning);
    }
    &--completed {
      background: color-mix(in srgb, var(--el-color-success) 12%, transparent);
      color: var(--el-color-success);
    }
  }

  &__time {
    font-size: 11px;
    color: var(--el-text-color-placeholder);
    margin-left: auto;
  }

  &__content {
    color: var(--el-text-color-regular);
    line-height: 1.5;
    word-break: break-word;

    &--tool {
      color: var(--el-text-color-secondary);
      font-family: monospace;
      font-size: 11px;
    }
  }
}

.msg-bubble {
  position: relative;
  max-width: 82%;
  padding: 10px 14px;
  border-radius: 12px;
  corner-shape: squircle;
  font-size: 14px;
  line-height: 1.6;

  &--user {
    background: var(--el-fill-color);
    color: var(--c-text-primary);
    border-bottom-right-radius: 4px;

    &:hover .msg-copy-btn {
      opacity: 1;
    }
  }
}

.msg-actions {
  display: flex;
  gap: 2px;
  margin-top: 4px;
  justify-content: flex-end;
  min-height: 18px;
}

.msg-copy-btn {
  border: none;
  background: transparent;
  color: var(--c-text-placeholder);
  cursor: pointer;
  padding: 2px;
  opacity: 0;
  transition: opacity 0.15s ease;

  &:hover {
    color: var(--c-text-primary);
  }

  &.agent-copy {
    position: static;
    margin-top: 6px;
    opacity: 0.6;
    &:hover { opacity: 1; }
  }
}

.assistant-content-wrap {
  width: 100%;
}

.thought-accordion {
  border: 1px solid var(--c-border);
  border-radius: 8px;
  corner-shape: squircle;
  background: var(--c-bg-surface);
  margin-bottom: 14px;
  overflow: hidden;
}

.thought-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 12.5px;
  color: var(--c-text-secondary);

  &:hover {
    color: var(--c-text-primary);
  }

  &__left {
    display: flex;
    align-items: center;
    gap: 6px;
  }
}

.thought-chevron {
  font-size: 12px;
  transition: transform 0.15s ease;

  &.is-open {
    transform: rotate(180deg);
  }
}

.thought-body {
  padding: 6px 12px 10px;
  border-top: 1px dashed var(--c-border);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tool-step {
  font-size: 12px;
  padding: 6px 0;
  border-bottom: 1px dashed var(--c-border);

  &:last-child {
    border-bottom: none;
  }

  &__header {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  &__seq {
    font-size: 10px;
    color: var(--c-text-placeholder);
    font-variant-numeric: tabular-nums;
    min-width: 18px;
  }

  &__dur {
    margin-left: auto;
    font-size: 10px;
    color: var(--c-text-placeholder);
    font-variant-numeric: tabular-nums;
  }

  &__input {
    margin-top: 6px;
  }

  &__input-label {
    font-size: 10px;
    color: var(--c-text-placeholder);
    margin-bottom: 2px;
  }

  &__pre {
    margin: 0;
    padding: 6px 8px;
    border-radius: 6px;
    background: var(--el-fill-color-light, rgba(148, 163, 184, 0.12));
    font-size: 10.5px;
    line-height: 1.4;
    color: var(--c-text-secondary);
    overflow: auto;
    max-height: 120px;
    white-space: pre-wrap;
    word-break: break-word;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  }

  &__error {
    margin-top: 4px;
    font-size: 11px;
    color: var(--el-color-danger);
  }
}

.tool-assets {
  margin-top: 8px;

  &__label {
    font-size: 10px;
    color: var(--c-text-placeholder);
    margin-bottom: 6px;
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
    gap: 8px;
  }

  &__card {
    border-radius: 8px;
    overflow: hidden;
    background: var(--el-fill-color-light, rgba(148, 163, 184, 0.1));
    border: 1px solid var(--c-border);
  }

  &__img {
    display: block;
    width: 100%;
    height: 72px;
    object-fit: cover;
    background: var(--el-fill-color);

    &--ph {
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--c-text-placeholder);
      font-size: 18px;
    }
  }

  &__name {
    padding: 4px 6px 6px;
    font-size: 10px;
    color: var(--c-text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--el-color-success);
  }

  &--error &__status-dot {
    background: var(--el-color-danger);
  }

  &--running &__status-dot {
    background: var(--el-color-primary);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--el-color-primary) 18%, transparent);
    animation: pulse-dot 1.2s ease-in-out infinite;
  }

  &__running-tag {
    margin-left: auto;
    font-size: 10px;
    color: var(--el-color-primary);
    background: color-mix(in srgb, var(--el-color-primary) 12%, transparent);
    border: 1px solid color-mix(in srgb, var(--el-color-primary) 25%, transparent);
    padding: 1px 6px;
    border-radius: 4px;
    font-weight: 500;
  }

  &__name {
    font-weight: 500;
    color: var(--c-text-primary);
  }

  &__badge {
    font-size: 10.5px;
    color: var(--c-text-placeholder);
    background: var(--el-fill-color);
    padding: 1px 5px;
    border-radius: 3px;
    corner-shape: squircle;
    font-family: monospace;
  }

  &__summary {
    color: var(--c-text-secondary);
    margin-left: 12px;
    margin-top: 2px;
  }
}

.agent-thinking-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  padding: 4px 0;

  &__text {
    font-size: 13px;
  }
}

.thinking-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid var(--el-border-color);
  border-top-color: var(--el-text-color-secondary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  flex-shrink: 0;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes pulse-dot {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.55;
    transform: scale(1.3);
  }
}

.agent-markdown-body {
  font-size: 14.5px;
  line-height: 1.7;
  color: var(--c-text-primary);
}

.interaction-card-wrap {
  margin-top: 10px;
  border: none;
  border-radius: 8px;
  padding: 0;
  background: transparent;
}

.error-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 8px;
  corner-shape: squircle;
  background: color-mix(in srgb, var(--el-color-danger) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--el-color-danger) 25%, transparent);
  color: var(--el-color-danger);
  font-size: 13px;
}

/* ════ 底部固定输入栏（始终贴底 · 无边框扁平） ════ */
.chat-composer {
  flex: 0 0 auto;
  position: sticky;
  bottom: 0;
  z-index: 5;
  padding: 12px 24px 16px;
  background: transparent;
}

.composer-container {
  width: 100%;
  max-width: none;
  margin: 0 auto;
  box-sizing: border-box;
}

.composer-box {
  display: flex;
  flex-direction: column;
  background: var(--el-fill-color-light, rgba(148, 163, 184, 0.1));
  border: none;
  border-radius: 18px;
  corner-shape: squircle;
  padding: 12px 16px 10px;
  transition: background 0.15s ease;

  &.is-focused {
    background: var(--el-fill-color, rgba(148, 163, 184, 0.16));
  }
}

.composer-textarea {
  width: 100%;
  min-height: 24px;
  max-height: 180px;
  border: none;
  outline: none;
  background: transparent;
  resize: none;
  font-size: 14px;
  line-height: 1.5;
  color: var(--c-text-primary);
  padding: 2px 4px 6px;

  &::placeholder {
    color: var(--c-text-placeholder);
  }
}

.composer-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 4px;
}

.composer-toolbar__left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.composer-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 26px;
  padding: 0 8px;
  border-radius: 8px;
  corner-shape: squircle;
  border: none;
  background: transparent;
  color: var(--c-text-secondary);
  font-size: 11.5px;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    color: var(--c-text-primary);
    background: var(--el-fill-color);
  }

  &--neutral {
    cursor: default;
    background: transparent;
  }
}

.composer-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  transition: all 0.15s ease;

  &--send {
    background: var(--el-fill-color);
    color: var(--c-text-placeholder);

    &.is-active {
      background: var(--c-primary);
      color: var(--el-color-white);

      &:hover {
        opacity: 0.9;
      }
    }
  }

  &--stop {
    background: var(--el-color-primary);
    color: var(--el-color-white);

    .stop-square {
      width: 10px;
      height: 10px;
      background: var(--el-color-white);
      border-radius: 2px;
      corner-shape: squircle;
    }
  }
}

.composer-foot-hint {
  text-align: center;
  font-size: 11.5px;
  color: var(--c-text-placeholder);
  margin-top: 8px;
}

@media (max-width: 768px) {
  .agent-chat-page {
    --chat-page-height: calc(100vh - var(--top-tool-height));
    --chat-page-height: calc(100dvh - var(--top-tool-height));
  }

  .chat-topbar {
    padding: 0 12px;
  }

  .chat-container {
    padding: 14px 12px 12px;
  }

  .chat-composer {
    padding: 8px 12px 10px;
  }

  .composer-foot-hint {
    display: none;
  }
}

/* ── 定时任务弹窗 ─────────────────────────────────────── */
.sched-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 56vh;
  overflow: auto;
}

.sched-empty {
  padding: 24px 0;
  text-align: center;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.sched-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  corner-shape: squircle;
}

.sched-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sched-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  font-size: 13px;
}

.sched-meta {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.sched-instructions {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.sched-ops {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
</style>

<style lang="scss">
/* ═══════════════════════════════════════════════════════════
   全屏弹窗全局样式 (Teleport 兼容 · 黑夜/白天全兼容 · 零多余Icon)
   ═══════════════════════════════════════════════════════════ */

.sched-dialog {
  --el-dialog-padding-primary: 16px 20px;
  border-radius: 12px;
  corner-shape: squircle;
  overflow: hidden;

  .el-dialog__header {
    display: flex;
    align-items: center;
    min-height: 52px;
    padding: 0 20px !important;
    margin: 0 !important;
    border-bottom: 1px solid var(--el-border-color-lighter);
  }

  .el-dialog__title {
    font-size: 15px;
    font-weight: 600;
    line-height: 1.4;
  }

  .el-dialog__headerbtn {
    top: 0;
    right: 8px;
    height: 52px;
    width: 40px;
  }

  .el-dialog__body {
    padding: 16px 20px 20px;
    background: var(--app-content-surface-color, var(--el-bg-color));
  }
}

.flat-fs-dialog {
  margin: 0 !important;
  padding: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  max-width: 100vw !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;

  /* 弹窗色彩令牌 (白天默认) */
  --c-dialog-bg: var(--app-content-surface-color, #ffffff);
  --c-dialog-border: var(--app-content-border-color, rgba(148, 163, 184, 0.22));
  --c-dialog-text: var(--el-text-color-primary, #0f172a);
  --c-dialog-subtext: var(--el-text-color-secondary, #64748b);
  --c-dialog-mute: var(--el-text-color-placeholder, #94a3b8);
  --c-primary: var(--el-color-primary, var(--el-color-primary));

  /* 关键：只读 (Low)、执行 (Medium)、敏感 (High) 标签色彩令牌 */
  --c-tag-low-bg: var(--el-color-success-light-9);
  --c-tag-low-text: var(--el-color-success);
  --c-tag-low-border: var(--el-color-success-light-7);

  --c-tag-med-bg: var(--el-color-primary-light-9);
  --c-tag-med-text: var(--el-color-primary);
  --c-tag-med-border: var(--el-color-primary-light-7);

  --c-tag-high-bg: var(--el-color-danger-light-9);
  --c-tag-high-text: var(--el-color-danger);
  --c-tag-high-border: var(--el-color-danger-light-7);

  --c-tag-cat-bg: var(--el-fill-color-light);
  --c-tag-cat-text: var(--el-text-color-regular);
  --c-tag-cat-border: var(--el-border-color-lighter);

  background: var(--c-dialog-bg) !important;

  .el-dialog__header {
    padding: 0 !important;
    margin: 0 !important;
    border-bottom: 1px solid var(--c-dialog-border);
    flex-shrink: 0;
    background: var(--c-dialog-bg);
  }

  .el-dialog__body {
    padding: 0 !important;
    flex: 1 !important;
    display: flex !important;
    flex-direction: column !important;
    min-height: 0 !important;
    overflow: hidden !important;
    background: var(--c-dialog-bg);
  }

  /* 顶栏容器 (两层结构：上层标题操作，下层靠左Tab) */
  .fs-dialog-header {
    display: flex;
    flex-direction: column;
    padding: 14px 28px 0;
    background: var(--c-dialog-bg);

    &__top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }

    &__title-wrap {
      display: flex;
      align-items: baseline;
      gap: 12px;
    }

    &__actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    &__tabs {
      display: flex;
      align-items: center;
      gap: 20px;
    }
  }

  .fs-dialog-title {
    font-size: 17px;
    font-weight: 600;
    color: var(--c-dialog-text);
    margin: 0;
    letter-spacing: -0.01em;
  }

  .fs-dialog-subtitle {
    font-size: 12px;
    color: var(--c-dialog-mute);
  }

  /* 标题下方靠左的主配置 Tab */
  .fs-main-tab-btn {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 38px;
    padding: 0 2px;
    border: none;
    background: transparent;
    color: var(--c-dialog-subtext);
    font-size: 13.5px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      color: var(--c-dialog-text);
    }

    &.is-active {
      color: var(--c-primary);
      font-weight: 600;

      &::after {
        content: '';
        position: absolute;
        bottom: -1px;
        left: 0;
        right: 0;
        height: 2px;
        background: var(--c-primary);
        border-radius: 2px;
        corner-shape: squircle;
      }
    }
  }

  .fs-main-tab-badge {
    font-size: 11px;
    padding: 0 6px;
    height: 18px;
    line-height: 18px;
    border-radius: 10px;
    corner-shape: squircle;
    background: var(--el-fill-color, #e2e8f0);
    color: var(--c-dialog-subtext);

    .is-active & {
      background: var(--c-primary);
      color: var(--el-color-white);
    }
  }

  /* 弹窗主体视口 */
  .fs-dialog-body {
    width: 100%;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .fs-dialog-footer {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    padding: 12px 28px;
    border-top: 1px solid var(--c-dialog-border);
    background: var(--c-dialog-bg);
  }

  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 34px;
    padding: 0 14px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
    border: 1px solid transparent;

    &--primary {
      background: var(--c-primary);
      color: var(--el-color-white);

      &:hover { opacity: 0.9; }
      &:disabled { opacity: 0.5; cursor: not-allowed; }
    }

    &--secondary {
      background: var(--c-dialog-bg);
      border-color: var(--c-dialog-border);
      color: var(--c-dialog-text);

      &:hover {
        background: var(--el-fill-color);
        border-color: var(--el-border-color);
      }
    }

    &--sm {
      height: 28px;
      padding: 0 10px;
      font-size: 12px;
    }
  }

  .fs-tab-view {
    flex: 1;
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    overflow-y: auto;
    min-height: 0;
  }

  /* 靠左对齐，充分分配空间，消除两侧多余空白 */
  .fs-view-content {
    width: 100%;
    padding: 20px 28px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
  }

  /* ── TAB 1 布局 ── */
  .fs-form-row {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 14px;
    width: 100%;
  }

  .fs-form-col {
    display: flex;
    flex-direction: column;
    gap: 6px;

    &--name {
      width: 320px;
      flex-shrink: 0;
    }

    &--desc {
      flex: 1;
      min-width: 0;
    }

    &--switch {
      width: 110px;
      flex-shrink: 0;
    }
  }

  .fs-label {
    font-size: 12.5px;
    font-weight: 600;
    color: var(--c-dialog-text);
  }

  .fs-switch-wrap {
    height: 32px;
    display: flex;
    align-items: center;
  }

  /* 常用预设（纯文本芯片，无emoji） */
  .fs-presets-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 16px;
    flex-wrap: wrap;
  }

  .fs-presets-label {
    font-size: 12px;
    color: var(--c-dialog-subtext);
  }

  .fs-presets-list {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .fs-preset-pill {
    display: inline-flex;
    align-items: center;
    height: 26px;
    padding: 0 10px;
    border-radius: 6px;
    corner-shape: squircle;
    border: 1px solid var(--c-dialog-border);
    background: var(--c-dialog-bg);
    color: var(--el-text-color-regular, #334155);
    font-size: 12px;
    cursor: pointer;
    transition: all 0.12s ease;

    &:hover {
      border-color: var(--c-primary);
      color: var(--c-primary);
    }
  }

  .fs-clean-btn {
  margin-left: auto;
  padding: 3px 10px;
  font-size: 12px;
  font-weight: 500;
  color: var(--el-color-primary);
  background: color-mix(in srgb, var(--el-color-primary) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--el-color-primary) 25%, transparent);
  border-radius: 5px;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: color-mix(in srgb, var(--el-color-primary) 18%, transparent);
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.fs-runtime-params {
    margin-bottom: 16px;

    &__title {
      display: flex;
      align-items: baseline;
      gap: 10px;
      margin-bottom: 10px;
      font-size: 13px;
      font-weight: 600;
      color: var(--c-dialog-text);
    }

    &__grid {
      display: flex;
      flex-wrap: wrap;
      gap: 12px 20px;
    }
  }

  .fs-param {
    display: flex;
    flex-direction: column;
    gap: 4px;

    .fs-label {
      font-size: 11.5px;
      color: var(--c-dialog-subtext);
    }
  }

  .fs-optimize-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 8px;
  }

  .fs-optimize-review {
    margin-top: 12px;
    border: 1px solid var(--c-dialog-border);
    border-radius: 8px;
    overflow: hidden;

    &__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      background: var(--el-fill-color-light);
    }

    &__title {
      font-size: 12px;
      font-weight: 600;
      color: var(--c-dialog-text);
    }

    &__actions {
      display: flex;
      gap: 8px;
    }

    &__body {
      padding: 12px;
      font-size: 12px;
      line-height: 1.7;
      color: var(--c-dialog-subtext);
      white-space: pre-wrap;
      max-height: 300px;
      overflow-y: auto;
    }
  }

  .fs-editor-box {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 480px;

    &__header {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    &__title-wrap {
      display: flex;
      align-items: baseline;
      gap: 10px;
    }
  }

  .fs-subhint {
    font-size: 12px;
    color: var(--c-dialog-mute);
  }

  .fs-editor-counter {
    font-size: 12px;
    color: var(--c-dialog-mute);
  }

  .fs-editor-textarea {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;

    .el-textarea__inner {
      flex: 1 !important;
      height: 100% !important;
      min-height: 460px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 13.5px;
      line-height: 1.65;
      padding: 14px 16px;
      resize: none;
      border-radius: 8px;
      corner-shape: squircle;
      background: var(--c-dialog-bg);
      color: var(--c-dialog-text);
      border-color: var(--c-dialog-border);

      &:focus {
        border-color: var(--c-primary);
      }
    }
  }

  /* ── TAB 2: 通用能力库 (靠左分类 · 全宽分布) ── */
  .fs-cap-categories {
    display: flex;
    align-items: center;
    gap: 6px;
    overflow-x: auto;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--c-dialog-border);
    margin-bottom: 12px;
    flex-shrink: 0;

    &::-webkit-scrollbar {
      height: 4px;
    }
  }

  .fs-cat-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 32px;
    padding: 0 12px;
    border-radius: 6px;
    corner-shape: squircle;
    border: 1px solid var(--c-dialog-border);
    background: var(--c-dialog-bg);
    color: var(--c-dialog-subtext);
    font-size: 12.5px;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.12s ease;

    &:hover {
      border-color: var(--el-border-color);
      color: var(--c-dialog-text);
    }

    &.is-active {
      background: var(--el-fill-color, #e2e8f0);
      border-color: var(--el-border-color);
      color: var(--c-dialog-text);
      font-weight: 600;
    }

    &__count {
      font-size: 11px;
      opacity: 0.75;
    }

    &__dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--c-primary);
    }
  }

  .fs-cap-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 12px;
    flex-shrink: 0;

    &__left {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    &__right {
      display: flex;
      align-items: center;
      gap: 8px;
    }
  }

  .fs-search-wrap {
    width: 260px;
  }

  .fs-risk-filter {
    display: flex;
    gap: 4px;
  }

  .fs-filter-pill {
    height: 28px;
    padding: 0 10px;
    border-radius: 6px;
    corner-shape: squircle;
    border: 1px solid var(--c-dialog-border);
    background: var(--c-dialog-bg);
    color: var(--c-dialog-subtext);
    font-size: 12px;
    cursor: pointer;
    transition: all 0.12s ease;

    &:hover {
      color: var(--c-dialog-text);
    }

    &.is-active {
      background: var(--el-fill-color, #e2e8f0);
      color: var(--c-dialog-text);
      font-weight: 600;
    }
  }

  .fs-quick-action-btn {
    border: none;
    background: transparent;
    color: var(--c-primary);
    font-size: 12px;
    cursor: pointer;
    padding: 4px 6px;
    border-radius: 4px;
    corner-shape: squircle;

    &:hover {
      background: var(--el-fill-color-light);
    }

    &--clear {
      color: var(--c-dialog-mute);
    }
  }

  .fs-divider-v {
    width: 1px;
    height: 14px;
    background: var(--c-dialog-border);
  }

  .fs-count-summary {
    font-size: 12.5px;
    color: var(--c-dialog-subtext);
    margin-left: 8px;

    strong {
      color: var(--c-primary);
    }
  }

  .fs-grid-scroll {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
    padding-right: 4px;
  }

  .fs-empty-caps {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 0;
    gap: 10px;

    &__text {
      font-size: 13px;
      color: var(--c-dialog-subtext);
    }
  }

  /* 通用能力网格 (全宽网格 · 靠左铺满分配空间) */
  .fs-caps-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
    gap: 10px;
    width: 100%;
  }

  .fs-cap-card {
    display: flex;
    flex-direction: column;
    padding: 12px 14px;
    border-radius: 8px;
    border: 1px solid var(--c-dialog-border, rgba(148, 163, 184, 0.22));
    background: var(--el-fill-color-lighter, #f8fafc);
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      background: var(--el-fill-color-light, #f1f5f9);
      border-color: rgba(148, 163, 184, 0.45);
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
      transform: translateY(-1px);
    }

    &.is-selected {
      border-color: var(--c-primary);
      background: color-mix(in srgb, var(--c-primary) 8%, #ffffff);
      box-shadow: 0 0 0 1px var(--c-primary), 0 2px 8px color-mix(in srgb, var(--c-primary) 18%, transparent);

      &:hover {
        background: color-mix(in srgb, var(--c-primary) 12%, #ffffff);
      }
    }

    &__header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }

    &__title {
      font-size: 13px;
      font-weight: 600;
      color: var(--c-dialog-text);
      flex: 1;
      min-width: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    &__badges {
      display: flex;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;
    }

    &__id {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11px;
      color: var(--c-dialog-mute);
      margin-bottom: 6px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    &__desc {
      font-size: 11.5px;
      color: var(--c-dialog-subtext);
      line-height: 1.45;
      margin: 0;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  }

  .fs-checkbox-box {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    border-radius: 4px;
    corner-shape: squircle;
    border: 1px solid rgba(148, 163, 184, 0.35);
    background: var(--c-dialog-bg);
    color: var(--el-color-white);
    font-size: 11px;
    flex-shrink: 0;
    transition: all 0.12s ease;

    &.is-checked {
      background: var(--c-primary);
      border-color: var(--c-primary);
    }
  }

  .fs-cat-tag {
    display: inline-flex;
    align-items: center;
    font-size: 10.5px;
    line-height: 1.1;
    padding: 2px 6px;
    border-radius: 4px;
    corner-shape: squircle;
    background: var(--c-tag-cat-bg);
    color: var(--c-tag-cat-text);
    border: 1px solid var(--c-tag-cat-border);
  }

  /* 关键：只读 / 执行 / 敏感 Tag 样式（高对比度，兼容黑天白天） */
  .fs-risk-tag {
    display: inline-flex;
    align-items: center;
    font-size: 11px;
    line-height: 1.1;
    padding: 2px 6px;
    border-radius: 4px;
    corner-shape: squircle;
    font-weight: 500;
    border: 1px solid transparent;
    transition: all 0.12s ease;

    &--low {
      background: var(--c-tag-low-bg);
      color: var(--c-tag-low-text);
      border-color: var(--c-tag-low-border);
    }

    &--medium {
      background: var(--c-tag-med-bg);
      color: var(--c-tag-med-text);
      border-color: var(--c-tag-med-border);
    }

    &--high {
      background: var(--c-tag-high-bg);
      color: var(--c-tag-high-text);
      border-color: var(--c-tag-high-border);
    }
  }
}

/* ═══════════════════════════════════════════════════════════
   🌙 暗色模式 (html.dark) 针对全屏弹窗无缝生效
   ═══════════════════════════════════════════════════════════ */
html.dark .flat-fs-dialog {
  --c-dialog-bg: var(--el-bg-color-overlay);
  --c-dialog-border: var(--el-border-color-lighter);
  --c-dialog-text: var(--el-text-color-primary);
  --c-dialog-subtext: var(--el-text-color-secondary);
  --c-dialog-mute: var(--el-text-color-placeholder);

  /* 暗色模式下：只读 (Low)、执行 (Medium)、敏感 (High) 标签色彩 */
  --c-tag-low-bg: var(--el-color-success-light-9);
  --c-tag-low-text: var(--el-color-success);
  --c-tag-low-border: rgba(52, 211, 153, 0.3);

  --c-tag-med-bg: var(--el-color-primary-light-9);
  --c-tag-med-text: var(--el-color-primary);
  --c-tag-med-border: rgba(96, 165, 250, 0.3);

  --c-tag-high-bg: var(--el-color-danger-light-9);
  --c-tag-high-text: var(--el-color-danger);
  --c-tag-high-border: rgba(248, 113, 113, 0.3);

  --c-tag-cat-bg: var(--el-fill-color-light);
  --c-tag-cat-text: var(--el-text-color-regular);
  --c-tag-cat-border: rgba(255, 255, 255, 0.08);

  .fs-dialog-header {
    background: var(--el-bg-color-overlay);
  }

  .fs-main-tab-badge {
    background: var(--el-fill-color-light);
    color: var(--el-text-color-secondary);
  }

  .fs-cat-btn {
    background: var(--el-bg-color);
    border-color: rgba(255, 255, 255, 0.08);
    color: var(--el-text-color-secondary);

    &:hover {
      color: var(--el-text-color-primary);
      border-color: rgba(255, 255, 255, 0.15);
    }

    &.is-active {
      background: var(--el-fill-color);
      color: var(--el-color-white);
      border-color: rgba(255, 255, 255, 0.18);
    }
  }

  .fs-cap-card {
    background: var(--el-fill-color-light);
    border-color: rgba(255, 255, 255, 0.08);

    &:hover {
      background: var(--el-fill-color);
      border-color: rgba(255, 255, 255, 0.16);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }

    &.is-selected {
      background: color-mix(in srgb, var(--el-color-primary, var(--el-color-primary)) 16%, #18181b);
      border-color: var(--el-color-primary, var(--el-color-primary));
      box-shadow: 0 0 0 1px var(--el-color-primary, var(--el-color-primary)), 0 2px 10px rgba(0, 0, 0, 0.35);

      &:hover {
        background: color-mix(in srgb, var(--el-color-primary, var(--el-color-primary)) 20%, #18181b);
      }
    }
  }

  .fs-checkbox-box {
    background: var(--el-bg-color);
    border-color: rgba(255, 255, 255, 0.2);

    &.is-checked {
      background: var(--el-color-primary, var(--el-color-primary));
      border-color: var(--el-color-primary, var(--el-color-primary));
    }
  }

  .fs-editor-textarea .el-textarea__inner {
    background: var(--el-bg-color);
    border-color: rgba(255, 255, 255, 0.08);
    color: var(--el-text-color-primary);
  }

  .fs-preset-pill {
    background: var(--el-bg-color);
    border-color: rgba(255, 255, 255, 0.08);
    color: var(--el-text-color-regular);

    &:hover {
      border-color: var(--el-color-primary, var(--el-color-primary));
      color: var(--el-color-white);
    }
  }

  .fs-filter-pill {
    background: var(--el-bg-color);
    border-color: rgba(255, 255, 255, 0.08);
    color: var(--el-text-color-secondary);

    &:hover {
      color: var(--el-text-color-primary);
      border-color: rgba(255, 255, 255, 0.18);
    }

    &.is-active {
      background: var(--el-fill-color);
      border-color: rgba(255, 255, 255, 0.2);
      color: var(--el-color-white);
    }
  }
}
</style>
