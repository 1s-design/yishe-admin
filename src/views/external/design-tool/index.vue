<template>
  <div class="dt-page">
    <div class="dt-toolbar">
      <div class="dt-toolbar__left">
        <div class="dt-toolbar__identity">
          <div class="dt-toolbar__title-row">
            <span class="dt-toolbar__title">设计工具</span>
            <span class="dt-connection-state" :class="`dt-connection-state--${adminWsStatusTag.type}`">
              <span class="dt-connection-state__dot" />
              {{ adminWsStatusTag.text }}
            </span>
          </div>
          <div class="dt-toolbar__summary">
            <span><b>{{ toolConnections.length }}</b> 个实例在线</span>
            <span v-if="runningToolCount" class="dt-toolbar__running"><b>{{ runningToolCount }}</b> 个制作中</span>
          </div>
        </div>
      </div>
      <div class="dt-toolbar__right">
        <el-button size="small" @click="openLaunchDialog">
          <Icon icon="ep:plus" />
          打开实例
        </el-button>
        <el-tooltip :content="`最近更新 ${lastRefreshText}`" placement="bottom">
          <el-button size="small" :loading="refreshing" @click="refreshConnections({ force: true })" circle aria-label="刷新连接">
            <Icon icon="ep:refresh" />
          </el-button>
        </el-tooltip>
      </div>
    </div>

    <!-- 表格 -->
    <el-table
      v-if="toolConnections.length > 0 || initialLoading"
      :data="toolConnections"
      v-loading="initialLoading"
      class="dt-table"
      size="small"
      row-key="id"
      :row-class-name="tableRowClass"
    >
      <el-table-column label="实例" min-width="220" show-overflow-tooltip>
        <template #default="{ row }">
          <div class="cell-instance">
            <div class="cell-instance__main">
              <span class="cell-instance__dot" :class="row.isOnline === false ? 'cell-instance__dot--off' : ''" />
              <span class="cell-instance__name">{{ getToolName(row) }}</span>
              <span v-if="row.clientInfo?.app?.version" class="cell-instance__ver">{{ row.clientInfo.app.version }}</span>
            </div>
            <div class="cell-instance__id">{{ row.id }}</div>
          </div>
        </template>
      </el-table-column>

      <el-table-column label="环境" min-width="240" show-overflow-tooltip>
        <template #default="{ row }">
          <div class="cell-env">
            <span>{{ formatBrowser(row) }} · {{ formatOs(row) }}</span>
            <span class="cell-env__sub">{{ row.clientInfo?.machine?.code || '-' }} · {{ formatScreen(row) }}</span>
            <div v-if="getLaunchBinding(row)" class="cell-launch">
              <el-tag size="small" type="primary" effect="plain">客户端环境</el-tag>
              <span class="cell-launch__text">{{ formatLaunchBinding(row) }}</span>
            </div>
          </div>
        </template>
      </el-table-column>

      <el-table-column label="状态" width="108" align="center">
        <template #default="{ row }">
          <span v-if="isStreaming(row)" class="cell-status cell-status--active">● 共享中</span>
          <span
            v-else-if="isDesigning(row)"
            class="cell-status cell-status--active"
            :title="formatBatchStatus(row)"
          >
            ● {{ formatBatchStatus(row) }}
          </span>
          <span v-else class="cell-status cell-status--idle">空闲</span>
        </template>
      </el-table-column>

      <el-table-column label="连接" min-width="140" show-overflow-tooltip>
        <template #default="{ row }">
          <div class="cell-conn">
            <span>{{ formatDateTime(row.connectedAt) }}</span>
            <span class="cell-conn__sub">{{ row.connectedAt ? formatPast(row.connectedAt) : '-' }}</span>
          </div>
        </template>
      </el-table-column>

      <el-table-column label="AI Agent" min-width="220">
        <template #default="{ row }">
          <div v-if="getAgent(row)" class="cell-agent">
            <div class="cell-agent__header">
              <el-tag :type="agentTagType(getAgent(row).agentState)" size="small" effect="plain">
                {{ agentLabel(getAgent(row).agentState) }}
              </el-tag>
              <el-tag v-if="getAgent(row).available" type="success" size="small" effect="plain">可制作</el-tag>
              <span class="cell-agent__time">{{ formatAgentTime(getAgent(row).updatedAt) }}</span>
            </div>
            <!-- 只在非空闲状态时显示详细信息，单行紧凑布局 -->
            <template v-if="getAgent(row).agentState !== 'idle'">
              <div v-if="getAgent(row).userInput" class="cell-agent__compact">
                <span class="cell-agent__v cell-agent__v--hl">{{ getAgent(row).userInput }}</span>
              </div>
              <div v-if="getAgent(row).plan" class="cell-agent__compact">
                <span class="cell-agent__v">
                  {{ getAgent(row).plan.goal }}
                  <b class="cell-agent__p">{{ getAgent(row).plan.currentStep }}/{{ getAgent(row).plan.totalSteps }}</b>
                </span>
              </div>
              <div v-if="getAgent(row).step" class="cell-agent__compact">
                <span class="cell-agent__v">{{ getAgent(row).step }}</span>
              </div>
              <div v-if="getAgent(row).lastToolCall" class="cell-agent__compact">
                <span class="cell-agent__v cell-agent__v--mono">{{ getAgent(row).lastToolCall }}</span>
              </div>
              <div v-if="getAgent(row).lastError" class="cell-agent__compact">
                <span class="cell-agent__v cell-agent__v--err">{{ getAgent(row).lastError }}</span>
              </div>
            </template>
          </div>
          <span v-else class="cell-empty">-</span>
        </template>
      </el-table-column>

      <el-table-column label="" width="60" fixed="right" align="center">
        <template #default="{ row }">
          <div class="cell-actions">
            <el-dropdown trigger="click" @command="(cmd: string) => handleAction(cmd, row)">
              <el-button size="small" text circle :disabled="row.isOnline === false">
                <Icon icon="ep:more-filled" />
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="control">操控面板</el-dropdown-item>
                  <el-dropdown-item command="clear" divided>清空对话</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-else description="当前没有已连接的设计工具" :image-size="60" />

    <!-- 全屏极简设计工作台 -->
    <el-dialog
      v-model="controlPanelVisible"
      class="cp-studio-dialog"
      fullscreen
      :show-close="false"
      :close-on-click-modal="false"
      destroy-on-close
      @close="onControlPanelClose"
    >
      <div v-if="controlTarget" class="cp-studio">
        <!-- 顶部极简工具栏 -->
        <header class="cp-topbar">
          <div class="cp-topbar__left">
            <Icon icon="ep:cpu" class="cp-topbar__icon" />
            <span class="cp-topbar__title">设计端工作台</span>
            <span class="cp-topbar__badge">{{ controlTarget.id }}</span>
            <el-tag v-if="getAgent(controlTarget)" :type="agentTagType(getAgent(controlTarget).agentState)" size="small" effect="plain" class="cp-topbar__tag">
              {{ agentLabel(getAgent(controlTarget).agentState) }}
            </el-tag>
            <el-tooltip v-if="getAgent(controlTarget)?.step" :content="getAgent(controlTarget)?.step" placement="bottom">
              <span class="cp-topbar__step">{{ getAgent(controlTarget)?.step }}</span>
            </el-tooltip>
          </div>

          <div class="cp-topbar__right">
            <el-button size="small" :loading="snapshotLoading" text bg @click="captureRemoteSnapshot">
              <Icon icon="ep:camera" /> 快照
            </el-button>
            <el-button size="small" text bg type="warning" @click="sendRemoteClear(controlTarget!)">
              <Icon icon="ep:delete" /> 清空
            </el-button>
            <el-button size="small" text bg type="danger" @click="sendRemoteStop(controlTarget!)">
              <Icon icon="ep:video-pause" /> 停止
            </el-button>
            <el-button size="small" text circle :loading="conversationLoading" @click="fetchConversation(controlTarget!)">
              <Icon icon="ep:refresh" />
            </el-button>
            <el-button size="small" text circle @click="controlPanelVisible = false">
              <Icon icon="ep:close" />
            </el-button>
          </div>
        </header>

        <!-- 中部工作区：左侧对话流与指令舱 + 右侧实时画布与产物库 -->
        <div class="cp-workspace">
          <!-- 左侧：对话执行流 & 底部指令舱 -->
          <section class="cp-main-pane">
            <div v-loading="conversationLoading" class="cp-timeline">
              <template v-if="conversationData?.conversation?.length">
                <template v-for="(msg, idx) in conversationData.conversation" :key="msg.id || idx">
                  <!-- 用户气泡 (右侧) -->
                  <div v-if="msg.role === 'user'" class="cp-bubble-row cp-bubble-row--user">
                    <div class="cp-bubble cp-bubble--user">
                      <div class="cp-bubble__text">{{ msg.content }}</div>
                    </div>
                  </div>

                  <!-- AI 响应气泡 (左侧) -->
                  <div v-else-if="msg.role === 'assistant'" class="cp-bubble-row cp-bubble-row--assistant">
                    <div class="cp-bubble cp-bubble--assistant">
                      <div v-if="msg.content" class="cp-bubble__text">{{ msg.content }}</div>
                      <!-- 附带规划信息 -->
                      <div v-if="msg.meta?.plan" class="cp-bubble__plan">
                        🎯 目标：{{ msg.meta.plan.goal }} ({{ msg.meta.plan.currentStep || 0 }}/{{ msg.meta.plan.totalSteps }})
                      </div>
                    </div>
                  </div>

                  <!-- 工具执行提示 (居中小标签) -->
                  <div v-else-if="msg.role === 'tool'" class="cp-bubble-row cp-bubble-row--tool">
                    <div class="cp-tool-pill" :class="msg.meta?.toolResult?.success !== false ? 'is-ok' : 'is-err'">
                      <Icon icon="ep:tools" />
                      <span>工具执行{{ msg.meta?.toolResult?.success !== false ? '完成' : '失败' }}</span>
                      <span v-if="msg.meta?.duration" class="cp-tool-pill__dur">{{ msg.meta.duration }}ms</span>
                    </div>
                  </div>
                </template>
              </template>
              <div v-else-if="!conversationLoading" class="cp-timeline-empty">
                <Icon icon="ep:chat-dot-round" class="cp-timeline-empty__icon" />
                <span>暂无对话记录，可在下方输入需求指派任务</span>
              </div>
            </div>

            <!-- 底部一体化输入控制舱 -->
            <div class="cp-dock">
              <!-- 配置项条目 -->
              <div class="cp-dock__config">
                <div class="cp-dock__options">
                  <el-radio-group v-model="adminTaskConfig.preset" size="small" @change="onPresetChange">
                    <el-radio-button label="single">单张</el-radio-button>
                    <el-radio-button label="group">组图</el-radio-button>
                    <el-radio-button label="batch">批量</el-radio-button>
                  </el-radio-group>

                  <template v-if="adminTaskConfig.preset === 'group'">
                    <span class="cp-dock__lbl">张数</span>
                    <el-select v-model="adminTaskConfig.memberCount" size="small" style="width: 104px">
                      <el-option :value="2" label="2张(正反面)" />
                      <el-option :value="3" label="3张" />
                      <el-option :value="4" label="4张" />
                      <el-option :value="5" label="5张" />
                    </el-select>
                  </template>

                  <template v-if="adminTaskConfig.preset === 'batch'">
                    <span class="cp-dock__lbl">张数</span>
                    <el-input-number v-model="adminTaskConfig.jobCount" :min="1" :max="50" size="small" style="width: 80px" controls-position="right" />
                  </template>

                  <span class="cp-dock__lbl">交付</span>
                  <el-select v-model="adminTaskConfig.delivery" size="small" style="width: 86px">
                    <el-option value="save" label="存贴纸" />
                    <el-option value="export" label="导出PNG" />
                    <el-option value="canvas" label="留画布" />
                  </el-select>

                  <el-checkbox v-model="adminTaskConfig.autoImportToLibrary" size="small">入素材库</el-checkbox>
                  <el-checkbox v-if="adminTaskConfig.preset === 'batch'" v-model="adminTaskConfig.autoOptimize" size="small">分析优化</el-checkbox>
                </div>
              </div>

              <!-- 输入框与动作按钮 -->
              <div class="cp-dock__input-box">
                <el-input
                  v-model="remoteMessage"
                  type="textarea"
                  :rows="2"
                  resize="none"
                  :placeholder="inputPlaceholder"
                  :disabled="remoteSending"
                  @keydown.enter.ctrl="sendRemoteCommand"
                />
                <el-button
                  class="cp-dock__submit-btn"
                  :type="adminTaskConfig.preset === 'batch' ? 'warning' : 'primary'"
                  :loading="remoteSending"
                  :disabled="!remoteMessage.trim()"
                  @click="sendRemoteCommand"
                >
                  <Icon :icon="adminTaskConfig.preset === 'batch' ? 'ep:video-play' : 'ep:promotion'" />
                  <span>{{ adminTaskConfig.preset === 'batch' ? '启动制作' : '发送指令' }}</span>
                </el-button>
              </div>

              <!-- 批次执行进度条（若有） -->
              <div v-if="activeBatchRuns.length" class="cp-dock__progress-bar">
                <div class="cp-dock__progress-info">
                  <el-tag size="small" effect="plain" :type="getCpRunTagType(activeBatchRuns[0].phase)">
                    {{ getCpRunLabel(activeBatchRuns[0].phase) }}
                  </el-tag>
                  <span class="cp-dock__progress-text">{{ getCpRunMessage(activeBatchRuns[0]) }}</span>
                  <el-button
                    v-if="activeBatchRuns[0].phase === 'accepted' && activeBatchRuns[0].batch?.status === 'paused'"
                    size="small"
                    text
                    type="primary"
                    @click="controlCpBatch(activeBatchRuns[0], 'resume')"
                  >
                    继续
                  </el-button>
                  <el-button
                    v-else-if="activeBatchRuns[0].phase === 'accepted' && activeBatchRuns[0].batch?.status === 'running'"
                    size="small"
                    text
                    @click="controlCpBatch(activeBatchRuns[0], 'pause')"
                  >
                    暂停
                  </el-button>
                  <el-button
                    v-if="activeBatchRuns[0].phase === 'accepted'"
                    size="small"
                    text
                    type="danger"
                    @click="controlCpBatch(activeBatchRuns[0], 'stop')"
                  >
                    停止
                  </el-button>
                </div>
                <el-progress :percentage="cpAutoProgress" :stroke-width="3" :show-text="false" />
              </div>

              <!-- 状态通知条 -->
              <div v-else-if="targetResults.length" class="cp-dock__ticker">
                <span class="cp-dock__ticker-dot" :class="targetResults[0].success ? 'is-ok' : 'is-err'">●</span>
                <span class="cp-dock__ticker-msg">{{ targetResults[0].message || targetResults[0].error }}</span>
                <span class="cp-dock__ticker-time">{{ formatAgentTime(targetResults[0].reportedAt) }}</span>
              </div>
            </div>
          </section>

          <!-- 右侧：实时监控 & 产物库 -->
          <aside class="cp-side-pane">
            <!-- 实时屏幕 / 画布区 -->
            <div class="cp-side-section cp-side-monitor">
              <div class="cp-side-section__header">
                <span class="cp-side-section__title">
                  <Icon icon="ep:video-camera" />
                  实时监控
                </span>
                <div class="cp-side-section__meta">
                  <el-tag v-if="monitorStatus.connecting" type="warning" size="small">连接中</el-tag>
                  <el-tag v-else-if="monitorStatus.connected" type="success" size="small" effect="plain">已连接</el-tag>
                  <el-button
                    v-if="monitorStatus.connected || monitorStatus.connecting"
                    size="small"
                    text
                    type="danger"
                    @click="stopMonitoring"
                  >
                    断开
                  </el-button>
                  <el-button
                    v-else
                    size="small"
                    text
                    type="primary"
                    @click="startMonitoringFromPanel"
                  >
                    连接画面
                  </el-button>
                </div>
              </div>

              <div class="cp-video-stage">
                <video ref="monitorVideoRef" class="cp-video-player" autoplay playsinline muted />
                <div v-if="monitorStatus.connecting" class="cp-video-overlay">
                  <el-icon class="is-loading"><Loading /></el-icon>
                  <span>建立画面连接中...</span>
                </div>
                <div v-else-if="!monitorStatus.connected" class="cp-video-overlay">
                  <span class="cp-video-hint">点击右上角"连接画面"查看设计工具实时操作</span>
                </div>
              </div>
            </div>

            <!-- 设计产物库区 -->
            <div class="cp-side-section cp-side-gallery">
              <div class="cp-side-section__header">
                <span class="cp-side-section__title">
                  <Icon icon="ep:picture" />
                  设计产物 ({{ liveArtifacts.length }})
                </span>
                <el-button v-if="liveArtifacts.length" size="small" text type="info" @click="liveArtifacts = []">清空</el-button>
              </div>

              <div v-if="liveArtifacts.length" class="cp-gallery-grid">
                <div v-for="(art, aIdx) in liveArtifacts" :key="aIdx" class="cp-gallery-card">
                  <el-image
                    v-if="art.url"
                    :src="art.url"
                    fit="contain"
                    class="cp-gallery-card__img"
                    :preview-src-list="[art.url]"
                  />
                  <div class="cp-gallery-card__info">
                    <span class="cp-gallery-card__name" :title="art.name">{{ art.name || (art.type === 'image-group' ? '组图包' : '贴纸') }}</span>
                    <el-tag size="small" :type="art.type === 'image-group' ? 'warning' : 'info'" effect="plain" class="cp-gallery-card__tag">
                      {{ art.type === 'image-group' ? `组图(${art.stickersCount || 2})` : '贴纸' }}
                    </el-tag>
                  </div>
                </div>
              </div>
              <div v-else class="cp-gallery-empty">
                <span>生成的设计贴纸与组图将展示在此处</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </el-dialog>

    <el-dialog
      v-model="launchDialogVisible"
      title="打开设计工具"
      width="560px"
      :close-on-click-modal="false"
    >
      <el-form label-position="top">
        <el-form-item label="目标客户端">
          <el-select
            v-model="launchClientId"
            placeholder="选择在线客户端"
            filterable
            style="width: 100%"
            :loading="launchClientsLoading"
          >
            <el-option
              v-for="client in launchClientOptions"
              :key="client.id"
              :label="formatLaunchClientLabel(client)"
              :value="client.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="浏览器环境">
          <el-select
            v-model="launchProfileId"
            placeholder="请选择浏览器环境"
            filterable
            style="width: 100%"
            :disabled="!launchClientId"
            popper-class="design-tool-launch-profile-popper"
          >
            <el-option
              v-for="profile in launchProfileOptions"
              :key="profile.profileId"
              :label="profile.label"
              :value="profile.profileId"
            >
              <div class="launch-profile-option" :class="{ 'launch-profile-option--busy': profile.busy }">
                <div class="launch-profile-option__main">
                  <span class="launch-profile-option__name">{{ profile.name }}</span>
                  <span class="launch-profile-option__id">{{ profile.profileId }}</span>
                </div>
                <span class="launch-profile-option__meta">
                  <el-tag v-if="profile.isActive" size="small" type="success" effect="plain">当前</el-tag>
                  <el-tag v-if="profile.busy" size="small" type="warning" effect="plain">执行中</el-tag>
                  <el-tag v-else-if="profile.connected" size="small" type="info" effect="plain">已打开</el-tag>
                  <small>{{ profile.description }}</small>
                </span>
              </div>
            </el-option>
          </el-select>
          <div v-if="launchClientId && !launchProfileOptions.length" class="launch-form-tip">
            当前客户端没有上报浏览器环境，请先在浏览器自动化/Temu 工具集中同步或创建环境。
          </div>
          <div v-else-if="hasBusyLaunchProfiles" class="launch-form-tip">
            环境执行发布任务时仍可打开设计工具，打开操作不会中断当前任务。
          </div>
        </el-form-item>
        <el-form-item label="初始指令">
          <el-input
            v-model="launchPrompt"
            type="textarea"
            :rows="3"
            placeholder="可选：打开后要执行的设计需求，后续会自动交给 tool agent"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="launchDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="launchSending"
          :disabled="!launchClientId || !launchProfileId"
          @click="sendLaunchDesignTool"
        >
          打开
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { Loading } from "@element-plus/icons-vue";
import {
  getMyOnlineRuntimeConnectionViews,
  openDesignToolOnClient,
  type WebsocketConnectionVO,
} from "@/api/system/websocket";
import {
  websocketClient,
  type RuntimeConnectionChangedEvent,
  type ServiceCommandResultEvent,
} from "@/services/websocketClient";
import { formatDate, formatPast } from "@/utils/formatTime";
import request from "@/config/axios";
import { getAccessToken } from "@/utils/auth";
import { ElMessage } from "element-plus";
import { useClientNodeStore } from "@/store/modules/clientNode";
import { normalizeBrowserAutomationProfilesPayload } from "@/services/browserAutomationExecutionContext";
import { resolveDesignToolUrl } from "@/config/toolRegistry";
import { isDesignToolConnectionRunning } from "@/services/designToolRuntimeState";
defineOptions({ name: "DesignToolConnection" });

const DESIGN_TOOL_SOURCES = new Set(["设计工具", "设计端"]);
const CLIENT_SOURCES = new Set(["客户端"]);
const AUTO_REFRESH_INTERVAL_MS = 60_000; // WebSocket 实时推送为主，60s 轮询兜底
type TagType = "success" | "warning" | "danger" | "info" | "primary";

const initialLoading = ref(true);
const refreshing = ref(false);
const toolConnections = ref<WebsocketConnectionVO[]>([]);
const refreshTimer = ref<number | null>(null);
const lastRefreshAt = ref<string | null>(null);
const launchDialogVisible = ref(false);
const launchClientsLoading = ref(false);
const launchSending = ref(false);
const launchClientId = ref("");
const launchProfileId = ref("");
const defaultDesignToolUrl = resolveDesignToolUrl();
const launchPrompt = ref("");
const launchClientOptions = ref<WebsocketConnectionVO[]>([]);
const clientNodeStore = useClientNodeStore();
const pendingLaunchCommandId = ref("");
const pendingLaunchClientId = ref("");
const pendingLaunchProfileId = ref("");
let launchResultTimer: number | null = null;

// 操控面板状态
const controlPanelVisible = ref(false);
const controlTarget = ref<WebsocketConnectionVO | null>(null);
const monitorVideoRef = ref<HTMLVideoElement | null>(null);
const monitorStatus = ref({
  connecting: false,
  connected: false,
  error: null as string | null,
  designToolPeerId: null as string | null,
});
let monitorSessionId = 0;

const selectedLaunchClient = computed(() =>
  launchClientOptions.value.find((item) => item.id === launchClientId.value) || null,
);

const getBrowserAutomationRuntime = (row?: WebsocketConnectionVO | null) =>
  row?.clientInfo?.services?.["browser-automation"] ||
  row?.clientInfo?.services?.uploader ||
  null;

const launchProfileOptions = computed(() => {
  const runtime = getBrowserAutomationRuntime(selectedLaunchClient.value) as any;
  const profilePayload = normalizeBrowserAutomationProfilesPayload(runtime?.details || {});
  const profiles = Array.isArray(profilePayload.items) ? profilePayload.items : [];
  const instances = Array.isArray(runtime?.details?.browserInstances)
    ? runtime.details.browserInstances
    : Array.isArray(runtime?.details?.instances)
      ? runtime.details.instances
      : [];
  const instanceMap = new Map<string, any>(
    instances
      .map((item: any) => [String(item?.profileId || item?.id || "").trim(), item] as const)
      .filter(([profileId]) => !!profileId),
  );

  return profiles
    .map((profile: any) => {
      const profileId = String(profile?.id || profile?.profileId || "").trim();
      if (!profileId) return null;
      const name = String(profile?.name || profile?.profileName || profileId).trim();
      const instance = instanceMap.get(profileId) || null;
      const busy = instance?.busy === true || instance?.state === "busy";
      const connected = instance?.connected === true || instance?.hasInstance === true;
      const pageCount = typeof instance?.pageCount === "number" ? instance.pageCount : null;
      const isActive = profileId === String(profilePayload.activeProfileId || "").trim();
      return {
        profileId,
        name,
        label: `${name} (${profileId})`,
        description: busy
          ? pageCount !== null
            ? `任务执行中，${pageCount} 个页面`
            : "任务执行中，可继续打开"
          : connected
            ? pageCount !== null
              ? `浏览器已打开，${pageCount} 个页面`
              : "浏览器已打开"
            : isActive
              ? "当前活动环境，执行时复用"
              : "未打开，执行时自动拉起",
        busy,
        connected,
        isActive,
      };
    })
    .filter(Boolean) as Array<{ profileId: string; name: string; label: string; description: string; busy: boolean; connected: boolean; isActive: boolean }>;
});

const hasBusyLaunchProfiles = computed(() => launchProfileOptions.value.some((item) => item.busy));

// 工具端视频流状态（从 clientInfo.screenSharing 读取）
const isStreaming = (row: WebsocketConnectionVO) => !!(row.clientInfo as any)?.screenSharing;

const adminWsStatusTag = computed<{ text: string; type: TagType }>(() => {
  const s = websocketClient.state.status;
  const m: Record<string, { text: string; type: TagType }> = {
    connected: { text: "已连接", type: "success" },
    connecting: { text: "连接中", type: "warning" },
    reconnecting: { text: "重连中", type: "warning" },
    error: { text: "异常", type: "danger" },
    disconnected: { text: "已断开", type: "info" },
  };
  return m[s] || { text: "未连接", type: "info" };
});


const lastRefreshText = computed(() => {
  if (!lastRefreshAt.value) return initialLoading.value ? "读取中" : "-";
  return formatDateTime(lastRefreshAt.value);
});

const isDesignToolConnection = (row?: WebsocketConnectionVO | null) => {
  const src = row?.clientSource || row?.query?.clientSource;
  const s = Array.isArray(src) ? src[0] : src || "";
  return (
    DESIGN_TOOL_SOURCES.has(String(s).trim()) ||
    String(row?.clientInfo?.app?.name || "").trim() === "yishe-tool" ||
    String(row?.id || "").trim().startsWith("designtool-")
  );
};

const isClientConnection = (row?: WebsocketConnectionVO | null) => {
  const src = row?.clientSource || row?.query?.clientSource;
  const s = Array.isArray(src) ? src[0] : src || "";
  return CLIENT_SOURCES.has(String(s).trim());
};

const normalizeRows = (res: unknown): WebsocketConnectionVO[] => {
  if (Array.isArray(res)) return res;
  if (res && typeof res === "object" && Array.isArray((res as any).data)) return (res as any).data;
  return [];
};

const refreshConnections = async (
  options: { force?: boolean; polling?: boolean } = {},
) => {
  if (refreshing.value) return;
  refreshing.value = true;
  try {
    const res = await getMyOnlineRuntimeConnectionViews(options);
    toolConnections.value = normalizeRows(res)
      .filter((r) => isDesignToolConnection(r))
      .sort((a, b) => ((a.connectedAt || "") > (b.connectedAt || "") ? -1 : 1));
    lastRefreshAt.value = new Date().toISOString();
  } finally {
    refreshing.value = false;
    initialLoading.value = false;
  }
};

const refreshLaunchClients = async () => {
  launchClientsLoading.value = true;
  try {
    await clientNodeStore.refresh({ summary: false });
    launchClientOptions.value = clientNodeStore.clients
      .filter((r) => r.isOnline !== false && isClientConnection(r))
      .sort((a, b) => ((a.connectedAt || "") > (b.connectedAt || "") ? -1 : 1));
    if (!launchClientId.value && launchClientOptions.value.length) {
      launchClientId.value = launchClientOptions.value[0].id;
    } else if (
      launchClientId.value &&
      !launchClientOptions.value.some((item) => item.id === launchClientId.value)
    ) {
      launchClientId.value = launchClientOptions.value[0]?.id || "";
    }
  } finally {
    launchClientsLoading.value = false;
  }
};

const formatLaunchClientLabel = (r: WebsocketConnectionVO) => {
  const machine = r.clientInfo?.machine?.code || r.clientInfo?.machineCode || "";
  const workspace = r.clientInfo?.workspaceDirectory || "";
  return [machine || r.id, workspace].filter(Boolean).join(" · ");
};

const openLaunchDialog = () => {
  launchDialogVisible.value = true;
  void refreshLaunchClients();
};

watch(
  () => [launchClientId.value, launchProfileOptions.value.map((item) => item.profileId).join("|")],
  () => {
    if (!launchClientId.value) {
      launchProfileId.value = "";
      return;
    }
    if (
      launchProfileId.value &&
      launchProfileOptions.value.some((item) => item.profileId === launchProfileId.value)
    ) {
      return;
    }
    launchProfileId.value =
      launchProfileOptions.value.find((item) => item.isActive)?.profileId ||
      launchProfileOptions.value[0]?.profileId ||
      "";
  },
);

const selectedLaunchProfile = computed(
  () => launchProfileOptions.value.find((item) => item.profileId === launchProfileId.value) || null,
);

const clearLaunchResultTimer = () => {
  if (launchResultTimer !== null) {
    window.clearTimeout(launchResultTimer);
    launchResultTimer = null;
  }
};

const finishLaunchWaiting = () => {
  pendingLaunchCommandId.value = "";
  pendingLaunchClientId.value = "";
  pendingLaunchProfileId.value = "";
  clearLaunchResultTimer();
  launchSending.value = false;
};

const getCommandResultMessage = (event: ServiceCommandResultEvent) => {
  const data = event.data && typeof event.data === "object" ? event.data : {};
  const result = data.result && typeof data.result === "object" ? data.result : {};
  return (
    event.message ||
    event.error ||
    result.message ||
    data.message ||
    "客户端打开设计工具失败"
  );
};

const isCommandResultFailure = (event: ServiceCommandResultEvent) => {
  if (event.success === false) {
    return true;
  }

  const data = event.data && typeof event.data === "object" ? event.data : {};
  const result = data.result && typeof data.result === "object" ? data.result : {};
  return (
    data.success === false ||
    result.success === false ||
    !!event.error ||
    !!event.errorDetail ||
    !!result.error ||
    !!result.errorDetail ||
    !!data.error ||
    !!data.errorDetail
  );
};

const getLaunchCommandId = (response: any) => {
  return String(response?.data?.commandId || response?.commandId || response?.data?.data?.commandId || "").trim();
};

const sendLaunchDesignTool = async () => {
  const token = String(getAccessToken() || "").trim();
  if (!token) {
    ElMessage.warning("当前后台没有可用 token，请重新登录");
    return;
  }
  if (!launchClientId.value) {
    ElMessage.warning("请选择目标客户端");
    return;
  }
  if (!launchProfileId.value) {
    ElMessage.warning("请选择浏览器环境");
    return;
  }

  launchSending.value = true;
  try {
    const res: any = await openDesignToolOnClient({
      clientId: launchClientId.value,
      token,
      profileId: launchProfileId.value,
      profileName: selectedLaunchProfile.value?.name || selectedLaunchProfile.value?.label,
      machineCode: selectedLaunchClient.value?.clientInfo?.machine?.code,
      toolUrl: defaultDesignToolUrl,
      prompt: launchPrompt.value,
    });
    if (res?.success === false) {
      throw new Error(res?.message || "打开设计工具失败");
    }
    const commandId = getLaunchCommandId(res);
    if (!commandId) {
      throw new Error(res?.message || "打开命令没有返回 commandId");
    }
    pendingLaunchCommandId.value = commandId;
    pendingLaunchClientId.value = launchClientId.value;
    pendingLaunchProfileId.value = launchProfileId.value;
    ElMessage.success("打开命令已发送，等待客户端执行结果");
    clearLaunchResultTimer();
    launchResultTimer = window.setTimeout(() => {
      if (pendingLaunchCommandId.value === commandId) {
        const timeoutText = [
          "客户端执行结果等待超时",
          `commandId=${commandId}`,
          `clientId=${pendingLaunchClientId.value || "-"}`,
          `profileId=${pendingLaunchProfileId.value || "-"}`,
        ].join("，");
        finishLaunchWaiting();
        ElMessage.warning(timeoutText);
      }
    }, 30_000);
  } catch (error: any) {
    pendingLaunchCommandId.value = "";
    pendingLaunchClientId.value = "";
    pendingLaunchProfileId.value = "";
    clearLaunchResultTimer();
    ElMessage.error(error?.message || "打开设计工具失败");
    launchSending.value = false;
  }
};

const onServiceCommandResult = (event: ServiceCommandResultEvent) => {
  if (!pendingLaunchCommandId.value || event.commandId !== pendingLaunchCommandId.value) {
    return;
  }

  finishLaunchWaiting();
  if (!isCommandResultFailure(event)) {
    ElMessage.success(event.message || "设计工具已在所选浏览器环境中打开");
    launchDialogVisible.value = false;
    // 命令刚下发成功，必须立刻拿到服务端最新连接列表
    void refreshConnections({ force: true });
    return;
  }

  ElMessage.error(getCommandResultMessage(event));
};

const resetLaunchState = () => {
  finishLaunchWaiting();
};

const handleLaunchDialogClosed = () => {
  if (!pendingLaunchCommandId.value) {
    return;
  }
  resetLaunchState();
};

watch(launchDialogVisible, (visible) => {
  if (!visible) {
    handleLaunchDialogClosed();
  }
});

watch(launchClientId, () => {
  if (pendingLaunchCommandId.value) {
    resetLaunchState();
  }
});

watch(launchProfileId, () => {
  if (pendingLaunchCommandId.value) {
    resetLaunchState();
  }
});

const clearLaunchStateOnUnmount = () => {
  clearLaunchResultTimer();
  pendingLaunchCommandId.value = "";
  pendingLaunchClientId.value = "";
  pendingLaunchProfileId.value = "";
};

const tableRowClass = ({ row }: { row: WebsocketConnectionVO }) =>
  row.isOnline === false ? "dt-row--offline" : "";

const getToolName = (r: WebsocketConnectionVO) => {
  const name = r.clientInfo?.app?.name || "";
  if (name === "yishe-tool" || !name) return "设计工具";
  return name;
};

const formatBrowser = (r: WebsocketConnectionVO) => {
  const b = r.clientInfo?.browser;
  return b?.name ? (b.version ? `${b.name} ${b.version}` : b.name) : "-";
};

const formatOs = (r: WebsocketConnectionVO) => {
  const o = r.clientInfo?.os;
  return o?.name ? (o.version ? `${o.name} ${o.version}` : o.name) : "-";
};

const formatScreen = (r: WebsocketConnectionVO) => {
  const s = r.clientInfo?.screen;
  return s?.width && s?.height ? `${s.width}×${s.height}` : "-";
};

const getLaunchBinding = (r: WebsocketConnectionVO) => {
  const launch = r.clientInfo?.launch;
  if (
    launch?.source !== "admin-design-tool" ||
    !String(launch.clientId || "").trim() ||
    !String(launch.profileId || "").trim()
  ) {
    return null;
  }
  return launch;
};

const formatLaunchBinding = (r: WebsocketConnectionVO) => {
  const launch = getLaunchBinding(r);
  if (!launch) return "";
  const client = launch.machineCode || launch.clientId;
  const profile = launch.profileName || launch.profileId;
  return `${client} · ${profile}`;
};

const formatDateTime = (v?: string | null) => (v ? formatDate(new Date(v), "YYYY-MM-DD HH:mm:ss") : "-");

const getAgent = (r: WebsocketConnectionVO) => (r.clientInfo as any)?.agent || null;

const isDesigning = (r: WebsocketConnectionVO) =>
  isDesignToolConnectionRunning(r);

const formatBatchStatus = (r: WebsocketConnectionVO) => {
  const batch = r.clientInfo?.designWorker?.batch as any;
  if (!batch || !["preparing", "running", "paused"].includes(batch.status)) {
    return "制作中";
  }
  if (batch.status === "preparing") return "准备中";
  const progress = `${Number(batch.completed || 0)}/${Number(batch.total || 0)}`;
  return batch.status === "paused" ? `${progress} 已暂停` : `${progress} 制作中`;
};

const runningToolCount = computed(
  () => toolConnections.value.filter(isDesigning).length,
);


const agentLabel = (s: string) =>
  ({ idle: "空闲", thinking: "思考中", executing: "执行中", waiting_user: "等待用户", error: "异常" }[s] || s);

const agentTagType = (s: string): TagType =>
  ({ idle: "success", thinking: "warning", executing: "primary", waiting_user: "info", error: "danger" }[s] as TagType || "info");

const formatAgentTime = (iso?: string) => {
  if (!iso) return "-";
  try { return new Date(iso).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }); }
  catch { return iso; }
};

const stopTimer = () => { if (refreshTimer.value !== null) { clearInterval(refreshTimer.value); refreshTimer.value = null; } };

// WebSocket 实时更新：收到推送后原地更新连接列表，无需 REST 轮询
const onRuntimeConnectionChanged = (evt: RuntimeConnectionChangedEvent) => {
  const conn = evt.connection;
  if (!conn || !isDesignToolConnection(conn)) return;

  const list = toolConnections.value;
  const idx = list.findIndex((c) => c.id === conn.id);

  if (evt.action === "removed") {
    if (idx >= 0) list.splice(idx, 1);
    return;
  }

  // connected / updated → 原地更新或插入
  if (idx >= 0) {
    list[idx] = conn;
  } else {
    list.push(conn);
    list.sort((a, b) => ((a.connectedAt || "") > (b.connectedAt || "") ? -1 : 1));
  }
  lastRefreshAt.value = new Date().toISOString();
};
const startTimer = () => {
  stopTimer();
  refreshTimer.value = window.setInterval(
    () => refreshConnections({ polling: true }),
    AUTO_REFRESH_INTERVAL_MS,
  );
};

// ── 远程命令 ──
const remoteMessage = ref("");
const remoteSending = ref(false);
const remoteResults = ref<Array<{
  requestId: string;
  success: boolean;
  message?: string;
  agentResponse?: string;
  error?: string;
  connectionId?: string;
  reportedAt?: string;
  phase?: string;
}>>([]);

const remoteResultLabel = (result: { success: boolean; phase?: string }) => {
  if (result.phase === "accepted" || result.phase === "dispatching") return "执行中";
  if (result.phase === "rejected") return "未接收";
  if (result.phase === "cancelled") return "已停止";
  return result.success ? "完成" : "失败";
};

const openControlPanel = async (row: WebsocketConnectionVO) => {
  // 关闭旧面板
  if (controlPanelVisible.value) {
    await stopMonitoring();
  }
  controlTarget.value = row;
  remoteMessage.value = "";
  remoteResults.value = [];
  controlPanelVisible.value = true;
  monitorSessionId += 1;
  monitorStatus.value = {
    connecting: false,
    connected: false,
    error: null,
    designToolPeerId: null,
  };
  // 加载对话日志
  fetchConversation(row);
};

const onControlPanelClose = () => {
  stopMonitoring();
  controlTarget.value = null;
};

const startMonitoringFromPanel = () => {
  if (controlTarget.value) {
    void startMonitoring(controlTarget.value);
  }
};

const startMonitoring = async (row: WebsocketConnectionVO) => {
  const sessionId = monitorSessionId;
  console.log("[Monitor] startMonitoring called, sessionId:", sessionId, "targetId:", row.id);

  if (!monitorVideoRef.value) {
    console.warn("[Monitor] monitorVideoRef is null");
    monitorStatus.value.error = "视频元素未准备好";
    return;
  }
  console.log("[Monitor] monitorVideoRef OK");

  monitorStatus.value.connecting = true;
  monitorStatus.value.error = null;
  let removeResponseListener = () => {};

  try {
    console.log("[Monitor] importing canvasMonitorService...");
    const { canvasMonitorService } = await import("@/services/canvasMonitor");
    console.log("[Monitor] canvasMonitorService imported, initPeer...");

    const adminPeerId = await canvasMonitorService.initPeer();
    console.log("[Monitor] adminPeerId:", adminPeerId);

    const requestId = `monitor-${Date.now()}`;
    console.log("[Monitor] requestId:", requestId);

    const responsePromise = new Promise<any>((resolve) => {
      let settled = false;
      let timer: number | null = null;
      const cleanup = (handler: (data: any) => void) => {
        (websocketClient.events as any).off("remote-result", handler);
        if (timer !== null) { window.clearTimeout(timer); timer = null; }
      };
      const handler = (data: any) => {
        if (data?.requestId !== requestId || settled) return;
        settled = true;
        console.log("[Monitor] remote-result received:", data);
        cleanup(handler);
        resolve(data);
      };
      removeResponseListener = () => {
        if (settled) return;
        settled = true;
        cleanup(handler);
      };
      (websocketClient.events as any).on("remote-result", handler);

      timer = window.setTimeout(() => {
        if (settled) return;
        settled = true;
        console.warn("[Monitor] remote-result timeout (15s)");
        cleanup(handler);
        resolve({ success: false, error: "请求超时" });
      }, 15000);
    });

    if (sessionId !== monitorSessionId || !controlPanelVisible.value) {
      console.log("[Monitor] session changed or panel closed, aborting");
      removeResponseListener();
      return;
    }

    console.log("[Monitor] sending page-monitor-request to connection:", row.id);
    const sendResult: any = await request.postOriginal({
      url: "/websocket/remote-command",
      data: {
        connectionId: row.id,
        command: {
          type: "page-monitor-request",
          payload: { adminPeerId, requestId },
          requestId,
        },
      },
    });
    console.log("[Monitor] sendResult:", sendResult);

    if (sendResult?.success === false) {
      removeResponseListener();
      throw new Error(sendResult?.message || "监控请求发送失败");
    }

    console.log("[Monitor] waiting for remote-result...");
    const response = await responsePromise;
    console.log("[Monitor] response:", response);

    if (sessionId !== monitorSessionId || !controlPanelVisible.value) {
      console.log("[Monitor] session changed after response, aborting");
      return;
    }

    if (!response.success || !response.designToolPeerId) {
      throw new Error(response.error || "获取设计端页面流 Peer ID 失败");
    }

    monitorStatus.value.designToolPeerId = response.designToolPeerId;
    console.log("[Monitor] connecting to design tool peer:", response.designToolPeerId);

    await canvasMonitorService.connectToDesignTool(
      response.designToolPeerId,
      monitorVideoRef.value,
      {
        autoReconnect: true,
        maxRetries: 3,
        onStatusChange: (status) => {
          console.log("[Monitor] onStatusChange:", status);
          if (sessionId !== monitorSessionId || !controlPanelVisible.value) return;
          monitorStatus.value.connected = status.isConnected;
          monitorStatus.value.connecting = !status.isConnected && !status.error;
          monitorStatus.value.error = status.error;
        },
      },
    );

    if (sessionId !== monitorSessionId || !controlPanelVisible.value) {
      console.log("[Monitor] session changed after connect, stopping");
      canvasMonitorService.stopMonitoring();
      return;
    }

    monitorStatus.value.connected = true;
    monitorStatus.value.connecting = false;
    console.log("[Monitor] monitoring started successfully");
  } catch (error: any) {
    removeResponseListener();
    console.error("[Monitor] startMonitoring failed:", error?.message, error);
    monitorStatus.value.error = error?.message || "启动监控失败";
    monitorStatus.value.connecting = false;
  }
};

const stopMonitoring = async () => {
  const targetId = controlTarget.value?.id;
  monitorSessionId += 1;
  try {
    const { canvasMonitorService } = await import("@/services/canvasMonitor");
    canvasMonitorService.stopMonitoring();
  } catch (error) {
    console.error("停止监控失败:", error);
  }
  monitorStatus.value.connected = false;
  monitorStatus.value.connecting = false;
  monitorStatus.value.designToolPeerId = null;
  monitorStatus.value.error = null;

  if (targetId) {
    request.postOriginal({
      url: "/websocket/remote-command",
      data: {
        connectionId: targetId,
        command: {
          type: "page-monitor-stop",
          requestId: `monitor-stop-${Date.now()}`,
        },
      },
    }).catch(() => undefined);
  }
};

const handleAction = (cmd: string, row: WebsocketConnectionVO) => {
  switch (cmd) {
    case "control": void openControlPanel(row); break;
    case "clear": sendRemoteClear(row); break;
  }
};


// ── 创作形式与参数配置 ──
const adminTaskConfig = reactive({
  preset: "single" as "single" | "group" | "batch",
  outputKind: "single" as "single" | "group" | "independent-batch",
  memberCount: 2,
  jobCount: 3,
  delivery: "save" as "save" | "export" | "canvas",
  autoImportToLibrary: true,
  autoOptimize: false,
});

const onPresetChange = (val: string) => {
  if (val === "single") {
    adminTaskConfig.outputKind = "single";
    adminTaskConfig.memberCount = 1;
  } else if (val === "group") {
    adminTaskConfig.outputKind = "group";
    if (adminTaskConfig.memberCount < 2) adminTaskConfig.memberCount = 2;
  } else if (val === "batch") {
    adminTaskConfig.outputKind = "independent-batch";
    if (adminTaskConfig.jobCount < 1) adminTaskConfig.jobCount = 3;
  }
};

const inputPlaceholder = computed(() => {
  if (adminTaskConfig.preset === "single") {
    return "输入设计需求，例如：科技感极简 Logo 贴纸（Ctrl+Enter 发送）";
  }
  if (adminTaskConfig.preset === "group") {
    return `输入组图需求（共 ${adminTaskConfig.memberCount} 张），例如：黑金商务名片正反面，第1张正面为姓名职务，第2张背面为企业Slogan（Ctrl+Enter 发送）`;
  }
  return `输入批量制作需求（共 ${adminTaskConfig.jobCount} 张），例如：国潮复古风咖啡包装贴纸系列，自动批量生成（Ctrl+Enter 启动）`;
});

// ── 操控面板自动制作进度跟踪 ──
type CpRunPhase = "dispatching" | "accepted" | "completed" | "failed" | "rejected" | "cancelled";
interface CpBatchRun {
  requestId: string;
  phase: CpRunPhase;
  message?: string;
  error?: string;
  assignedCount: number;
  batch?: {
    status: string;
    completed: number;
    succeeded: number;
    failed: number;
    total: number;
    items?: Array<{ index: number; title: string; status: string; error?: string }>;
  };
}

const cpAutoRuns = ref<CpBatchRun[]>([]);
const cpTerminalPhases = new Set<CpRunPhase>(["completed", "failed", "rejected", "cancelled"]);

const activeBatchRuns = computed(() =>
  cpAutoRuns.value.filter((r) => !cpTerminalPhases.has(r.phase)),
);

const cpAutoTotalCount = computed(() => cpAutoRuns.value.reduce((s, r) => s + r.assignedCount, 0));
const cpAutoCompletedCount = computed(() =>
  cpAutoRuns.value.reduce((s, r) => {
    if (r.batch) return s + Math.min(r.batch.completed, r.assignedCount);
    return s + (cpTerminalPhases.has(r.phase) ? r.assignedCount : 0);
  }, 0),
);
const cpAutoProgress = computed(() =>
  cpAutoTotalCount.value ? Math.round((cpAutoCompletedCount.value / cpAutoTotalCount.value) * 100) : 0,
);

const getCpRunLabel = (phase: CpRunPhase) =>
  ({ dispatching: "发送中", accepted: "制作中", completed: "已完成", failed: "失败", rejected: "未接收", cancelled: "已停止" })[phase] || phase;

const getCpRunTagType = (phase: CpRunPhase): "success" | "danger" | "primary" | "info" => {
  if (phase === "completed") return "success";
  if (["failed", "rejected", "cancelled"].includes(phase)) return "danger";
  if (phase === "accepted") return "primary";
  return "info";
};

const getCpRunMessage = (run: CpBatchRun) => {
  if (run.error) return run.error;
  const b = run.batch;
  if (!b) return run.message || "等待设计端接收";
  if (b.status === "preparing") return `正在拆解需求 · 0/${run.assignedCount}`;
  if (b.status === "paused") return `已暂停 · ${b.completed}/${run.assignedCount}`;
  if (b.status === "done") return `${b.succeeded}/${run.assignedCount} 张制作完成`;
  if (b.status === "stopped") return `已停止 · ${b.completed}/${run.assignedCount}`;
  const current = b.items?.[b.completed];
  const detail = current ? `${current.title} · ${current.error || current.status}` : "自动制作中";
  return `${b.completed}/${run.assignedCount} · ${detail}`;
};

const controlCpBatch = async (run: CpBatchRun, action: "pause" | "resume" | "stop") => {
  if (!controlTarget.value) return;
  try {
    await request.postOriginal({
      url: "/websocket/remote-command",
      data: {
        connectionId: controlTarget.value.id,
        command: {
          type: "batch-control",
          payload: { action },
          requestId: `${action}-${run.requestId}-${Date.now()}`,
        },
      },
    });
    run.message = action === "pause" ? "正在暂停" : action === "resume" ? "正在继续" : "正在停止";
  } catch (error: any) {
    ElMessage.error(error?.message || "批次控制失败");
  }
};

const liveArtifacts = ref<Array<{
  type: "sticker" | "image-group";
  name?: string;
  url?: string;
  customStickerId?: string;
  stickerId?: string;
  groupId?: string;
  stickersCount?: number;
}>>([]);

const snapshotLoading = ref(false);
const captureRemoteSnapshot = async () => {
  if (!controlTarget.value || snapshotLoading.value) return;
  snapshotLoading.value = true;
  try {
    const res: any = await request.postOriginal({
      url: "/websocket/remote-command",
      data: {
        connectionId: controlTarget.value.id,
        command: { type: "snapshot", requestId: `snap-${Date.now()}` },
      },
    });
    if (res?.data?.snapshot || res?.snapshot) {
      const snapUrl = res?.data?.snapshot || res?.snapshot;
      liveArtifacts.value.unshift({
        type: "sticker",
        name: "画布即时快照",
        url: snapUrl,
      });
      ElMessage.success("已获取画布最新快照");
    }
  } catch (err: any) {
    console.error("捕获画布快照失败:", err);
    ElMessage.error(err?.message || "获取快照失败");
  } finally {
    snapshotLoading.value = false;
  }
};

const sendRemoteStop = async (row: WebsocketConnectionVO) => {
  try {
    await request.postOriginal({
      url: "/websocket/remote-command",
      data: {
        connectionId: row.id,
        command: { type: "stop", requestId: `stop-${Date.now()}` },
      },
    });
    ElMessage.success("已向设计端发送停止指令");
  } catch (error: any) {
    console.error("远程停止失败:", error);
    ElMessage.error("发送停止指令失败");
  }
};

const sendRemoteCommand = async () => {
  if (!controlTarget.value || !remoteMessage.value.trim() || remoteSending.value) return;
  remoteSending.value = true;
  const requestId = adminTaskConfig.preset === "batch"
    ? `cp-batch-${Date.now()}`
    : `cmd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  
  try {
    if (adminTaskConfig.preset === "batch") {
      const run: CpBatchRun = {
        requestId,
        phase: "dispatching",
        assignedCount: adminTaskConfig.jobCount,
        message: "正在启动批量自动制作",
      };
      cpAutoRuns.value.unshift(run);
      const res: any = await request.postOriginal({
        url: "/websocket/remote-command",
        data: {
          connectionId: controlTarget.value.id,
          command: {
            type: "batch-start",
            payload: {
              description: remoteMessage.value.trim(),
              count: adminTaskConfig.jobCount,
              enableAnalysisOptimization: adminTaskConfig.autoOptimize,
              failureStrategy: "save_anyway",
            },
            requestId,
          },
        },
      });
      if (res?.success === false) throw new Error(res?.message || "启动批量制作失败");
      run.message = "等待设计端接收批次";
      ElMessage.success(`已启动 ${adminTaskConfig.jobCount} 张批量制作`);
    } else {
      const taskOptions = {
        preset: adminTaskConfig.preset,
        outputKind: adminTaskConfig.outputKind,
        memberCount: adminTaskConfig.preset === "group" ? adminTaskConfig.memberCount : 1,
        jobCount: 1,
        delivery: adminTaskConfig.delivery,
        autoImportToLibrary: adminTaskConfig.autoImportToLibrary,
      };
      const res: any = await request.postOriginal({
        url: "/websocket/remote-command",
        data: {
          connectionId: controlTarget.value.id,
          command: {
            type: "chat",
            payload: {
              message: remoteMessage.value.trim(),
              taskOptions,
            },
            requestId,
          },
        },
      });
      if (res?.success === false) throw new Error(res?.message || "发送失败");
      remoteResults.value.unshift({
        requestId,
        success: true,
        phase: "dispatching",
        message: "命令已发送，Agent 正在处理...",
        connectionId: controlTarget.value.id,
        reportedAt: new Date().toISOString(),
      });
    }
    remoteMessage.value = "";
  } catch (error: any) {
    remoteResults.value.unshift({
      requestId,
      success: false,
      error: error?.message || "发送失败",
      connectionId: controlTarget.value.id,
      reportedAt: new Date().toISOString(),
    });
  } finally {
    remoteSending.value = false;
  }
};

const sendRemoteClear = async (row: WebsocketConnectionVO) => {
  try {
    const res: any = await request.postOriginal({
      url: "/websocket/remote-command",
      data: {
        connectionId: row.id,
        command: { type: "clear", requestId: `clear-${Date.now()}` },
      },
    });
    if (res?.success === false) {
      throw new Error(res?.message || "远程清空失败");
    }
    ElMessage.success("已清空设计端画布与对话");
  } catch (error: any) {
    console.error("远程清空失败:", error);
    ElMessage.error("远程清空失败");
  }
};

// 过滤当前目标的执行结果
const targetResults = computed(() => {
  if (!controlTarget.value) return [];
  return remoteResults.value
    .filter((r) => r.connectionId === controlTarget.value!.id)
    .slice(0, 5);
});

// ── 对话日志 ──
const conversationTarget = ref<WebsocketConnectionVO | null>(null);
const conversationLoading = ref(false);
const conversationData = ref<{
  conversation?: Array<{
    id: string;
    role: string;
    content: string;
    timestamp: number;
    tool_calls?: Array<{ id: string; name: string; arguments: any }>;
    tool_call_id?: string;
    tool_name?: string;
    meta?: {
      iteration?: number;
      duration?: number;
      plan?: { goal: string; totalSteps: number; currentStep: number };
      toolArgs?: any;
      toolResult?: { success: boolean; [k: string]: any };
      type?: string;
    };
  }>;
  agentStatus?: {
    status: string;
    plan?: { goal: string; totalSteps: number; currentStep: number } | null;
    error?: string | null;
  };
  message?: string;
} | null>(null);

const fetchConversation = async (row: WebsocketConnectionVO) => {
  conversationTarget.value = row;
  conversationLoading.value = true;
  conversationData.value = null;
  const requestId = `conv-${Date.now()}`;
  try {
    const res: any = await request.postOriginal({
      url: "/websocket/remote-command",
      data: {
        connectionId: row.id,
        command: { type: "getConversation", requestId },
      },
    });
    if (res?.success === false) {
      throw new Error(res?.message || "请求失败");
    }
  } catch (error: any) {
    conversationData.value = { message: `请求失败: ${error?.message || "网络错误"}` };
    conversationLoading.value = false;
    return;
  }
  // 超时兜底：10 秒没收到 WebSocket 响应则停止 loading
  setTimeout(() => {
    if (conversationLoading.value) {
      conversationLoading.value = false;
      if (!conversationData.value) {
        conversationData.value = { message: "等待响应超时，请确认设计工具已连接并重试" };
      }
    }
  }, 10_000);
};

const formatMs = (ts?: number) => {
  if (!ts) return "-";
  return new Date(ts).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const formatJson = (data: any) => {
  if (data === undefined || data === null) return "";
  if (typeof data === "string") return data;
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
};

const copyConversation = () => {
  if (!conversationData.value?.conversation) return;
  const lines = conversationData.value.conversation.map((m) => {
    const time = formatMs(m.timestamp);
    const iter = m.meta?.iteration ? ` [第${m.meta.iteration}轮]` : "";
    const dur = m.meta?.duration ? ` (${m.meta.duration}ms)` : "";
    let text = `--- ${m.role.toUpperCase()}${iter}${dur} ${time} ---\n`;
    if (m.content) text += m.content + "\n";
    if (m.tool_calls?.length) {
      m.tool_calls.forEach((tc) => {
        text += `工具调用: ${tc.name}\n参数: ${formatJson(tc.arguments)}\n`;
      });
    }
    if (m.role === "tool" && m.meta?.toolArgs) {
      text += `调用参数: ${formatJson(m.meta.toolArgs)}\n`;
    }
    if (m.role === "tool" && m.meta?.toolResult) {
      text += `执行结果: ${formatJson(m.meta.toolResult)}\n`;
    }
    return text;
  });
  const log = lines.join("\n");
  navigator.clipboard.writeText(log).then(() => {
    // 简单提示
    const btn = document.querySelector(".conv-copy-toast");
    if (btn) btn.textContent = "已复制";
  });
};

let wsUnsubscribe: (() => void) | null = null;

const resultHandler = (data: any) => {
  // 提取设计产物
  if (data?.outputs && Array.isArray(data.outputs)) {
    for (const out of data.outputs) {
      if (
        !liveArtifacts.value.some(
          (a) =>
            (a.customStickerId && a.customStickerId === out.customStickerId) ||
            (a.groupId && a.groupId === out.groupId) ||
            (a.url && a.url === out.url),
        )
      ) {
        liveArtifacts.value.unshift(out);
      }
    }
  }

  // 对话日志响应（按 requestId 前缀匹配，不依赖 conversation 字段）
  if (data?.requestId?.startsWith("conv-")) {
    conversationData.value = {
      conversation: data.conversation || [],
      agentStatus: data.agentStatus,
      message: data.message || data.error || "无数据",
    };
    conversationLoading.value = false;
    return;
  }
  // 普通远程命令结果
  if (data?.requestId?.startsWith("monitor-") || data?.requestId?.startsWith("monitor-stop-")) {
    return;
  }

  const nextResult = {
    requestId: data?.requestId || "unknown",
    success: data?.success,
    phase: data?.phase,
    message: data?.message,
    agentResponse: data?.agentResponse,
    error: data?.error,
    connectionId: data?.connectionId,
    reportedAt: data?.reportedAt,
  };
  const existingIndex = remoteResults.value.findIndex(
    (item) => item.requestId === nextResult.requestId,
  );
  if (existingIndex >= 0) {
    remoteResults.value[existingIndex] = {
      ...remoteResults.value[existingIndex],
      ...nextResult,
    };
  } else {
    remoteResults.value.unshift(nextResult);
  }
  if (remoteResults.value.length > 20) remoteResults.value.length = 20;
};

onMounted(() => {
  refreshConnections();
  startTimer();
  const handler = onRuntimeConnectionChanged;
  websocketClient.events.on("runtimeConnectionChanged", handler as any);
  wsUnsubscribe = () => websocketClient.events.off("runtimeConnectionChanged", handler as any);
  websocketClient.events.on("serviceCommandResult", onServiceCommandResult);
  (websocketClient.events as any).on("remote-result", resultHandler);
});

onBeforeUnmount(() => {
  stopTimer();
  wsUnsubscribe?.();
  websocketClient.events.off("serviceCommandResult", onServiceCommandResult);
  clearLaunchStateOnUnmount();
  (websocketClient.events as any).off("remote-result", resultHandler);
  // 清理监控连接
  stopMonitoring();
});
</script>

<style scoped>


/* 移动端适配 */
@media (width <= 768px) {
  .cp-main {
    flex-direction: column;
  }

  .cp-right {
    border-top: none;
    border-left: none;
  }

  .cp-video-box {
    width: 100%;
    height: auto;
    aspect-ratio: 16 / 9;
  }

  .cp-topbar {
    gap: 4px;
    padding: 6px 8px;
  }

  .cp-topbar__step {
    display: none;
  }

  .cp-topbar__hide-mobile {
    display: none;
  }
}

@media (width <= 640px) {
  .dt-page {
    padding: 6px;
  }

  .dt-toolbar {
    min-height: 0;
    align-items: flex-start;
    padding: 7px 4px 9px;
  }

  .dt-toolbar__right {
    flex-wrap: wrap;
    justify-content: flex-end;
  }
}

.dt-page {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 10px 12px;
}

/* ── Toolbar ── */
.dt-toolbar {
  display: flex;
  min-height: 54px;
  padding: 7px 10px;
  background: var(--el-bg-color);
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.dt-toolbar__summary {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.dt-toolbar__running {
  color: var(--el-color-warning);
  font-weight: 500;
}

/* ── Modern Studio Console (Pure Element-Plus Tokens, Strict Height Limit, Dual-Theme) ── */
.cp-studio-dialog :deep(.el-dialog) {
  margin: 0 !important;
  padding: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  max-width: 100vw !important;
  max-height: 100vh !important;
  overflow: hidden !important;
  display: flex !important;
  flex-direction: column !important;
  background: var(--el-bg-color-page) !important;
}

.cp-studio-dialog :deep(.el-dialog__header) {
  display: none !important;
}

.cp-studio-dialog :deep(.el-dialog__body) {
  padding: 0 !important;
  margin: 0 !important;
  flex: 1 1 0% !important;
  min-height: 0 !important;
  height: 100% !important;
  width: 100% !important;
  overflow: hidden !important;
  display: flex !important;
  flex-direction: column !important;
  background: var(--el-bg-color-page) !important;
}

.cp-studio {
  display: flex;
  flex-direction: column;
  flex: 1 1 0%;
  min-height: 0;
  height: 100%;
  max-height: 100%;
  width: 100%;
  background: var(--el-bg-color-page);
  color: var(--el-text-color-primary);
  overflow: hidden;
  box-sizing: border-box;
}

/* 顶部导航栏 (44px) */
.cp-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 44px;
  min-height: 44px;
  padding: 0 16px;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-lighter);
  flex-shrink: 0;
  gap: 12px;
  box-sizing: border-box;
}

.cp-topbar__left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  overflow: hidden;
}

.cp-topbar__icon {
  font-size: 16px;
  color: var(--el-color-primary);
  flex-shrink: 0;
}

.cp-topbar__title {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  white-space: nowrap;
}

.cp-topbar__badge {
  font-family: "SF Mono", Consolas, monospace;
  font-size: 11px;
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color-light);
  padding: 1px 6px;
  border-radius: 4px;
  white-space: nowrap;
}

.cp-topbar__step {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 240px;
}

.cp-topbar__right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

/* 工作区分栏 */
.cp-workspace {
  display: flex;
  flex: 1 1 0%;
  min-height: 0;
  height: calc(100% - 44px);
  max-height: calc(100% - 44px);
  width: 100%;
  overflow: hidden;
  box-sizing: border-box;
}

/* 左侧主流面板 (严格受限高度，防止外溢) */
.cp-main-pane {
  display: flex;
  flex-direction: column;
  flex: 1 1 0%;
  min-width: 0;
  min-height: 0;
  height: 100%;
  max-height: 100%;
  background: var(--el-bg-color-page);
  border-right: 1px solid var(--el-border-color-lighter);
  overflow: hidden;
  box-sizing: border-box;
}

/* 对话执行时间线 (最大高度锁定，独立滚动) */
.cp-timeline {
  flex: 1 1 0%;
  min-height: 0;
  height: 100%;
  max-height: 100%;
  padding: 16px;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-sizing: border-box;
}

.cp-timeline-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--el-text-color-placeholder);
  gap: 8px;
  font-size: 13px;
}

.cp-timeline-empty__icon {
  font-size: 36px;
  opacity: 0.4;
}

/* 经典极简气泡对话流 */
.cp-bubble-row {
  display: flex;
  width: 100%;
  box-sizing: border-box;
}

.cp-bubble-row--user {
  justify-content: flex-end;
}

.cp-bubble-row--assistant {
  justify-content: flex-start;
}

.cp-bubble-row--tool {
  justify-content: center;
}

.cp-bubble {
  max-width: 75%;
  padding: 8px 12px;
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.55;
  word-break: break-word;
  overflow-wrap: anywhere;
  box-sizing: border-box;
}

/* 用户气泡：主色背景，白字 */
.cp-bubble--user {
  background: var(--el-color-primary);
  color: #ffffff;
  border-bottom-right-radius: 2px;
}

/* AI 响应气泡：中性卡片底色，边框 */
.cp-bubble--assistant {
  background: var(--el-bg-color);
  color: var(--el-text-color-primary);
  border: 1px solid var(--el-border-color-lighter);
  border-bottom-left-radius: 2px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
}

.cp-bubble__text {
  white-space: pre-wrap;
}

.cp-bubble__plan {
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px dashed var(--el-border-color-lighter);
  font-size: 11px;
  color: var(--el-color-primary);
}

/* 工具调用极简中性胶囊 */
.cp-tool-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-secondary);
  border: 1px solid var(--el-border-color-lighter);
}

.cp-tool-pill.is-ok {
  color: var(--el-color-success);
}

.cp-tool-pill.is-err {
  color: var(--el-color-danger);
}

.cp-tool-pill__dur {
  font-family: monospace;
  font-size: 10px;
  opacity: 0.7;
}

/* 底部极简指令舱 (固定底部) */
.cp-dock {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 14px 12px;
  background: var(--el-bg-color);
  border-top: 1px solid var(--el-border-color-lighter);
  flex-shrink: 0;
  box-sizing: border-box;
}

.cp-dock__config {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}

.cp-dock__options {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.cp-dock__lbl {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.cp-dock__input-box {
  display: flex;
  align-items: stretch;
  gap: 8px;
  width: 100%;
  box-sizing: border-box;
}

.cp-dock__input-box .el-textarea {
  flex: 1;
}

.cp-dock__input-box :deep(.el-textarea__inner) {
  border-radius: 6px;
  padding: 8px 10px;
  font-size: 13px;
  line-height: 1.45;
  background: var(--el-bg-color-page);
  color: var(--el-text-color-primary);
  border-color: var(--el-border-color);
}

.cp-dock__submit-btn {
  align-self: stretch;
  min-width: 90px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.cp-dock__progress-bar {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 4px 8px;
  background: var(--el-fill-color-light);
  border-radius: 4px;
}

.cp-dock__progress-info {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.cp-dock__progress-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--el-text-color-secondary);
}

.cp-dock__ticker {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--el-text-color-secondary);
  padding: 1px 0;
}

.cp-dock__ticker-dot.is-ok { color: var(--el-color-success); font-weight: 700; }
.cp-dock__ticker-dot.is-err { color: var(--el-color-danger); font-weight: 700; }
.cp-dock__ticker-msg { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cp-dock__ticker-time { color: var(--el-text-color-placeholder); }

/* 右侧侧边栏 (固定 360px) */
.cp-side-pane {
  width: 360px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  max-height: 100%;
  background: var(--el-bg-color);
  overflow: hidden;
  box-sizing: border-box;
}

.cp-side-section {
  display: flex;
  flex-direction: column;
  padding: 12px 14px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  box-sizing: border-box;
}

.cp-side-section.cp-side-monitor {
  flex-shrink: 0;
}

.cp-side-section.cp-side-gallery {
  flex: 1 1 0%;
  min-height: 0;
  overflow: hidden;
}

.cp-side-section__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  flex-shrink: 0;
}

.cp-side-section__title {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.cp-side-section__meta {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* 视频监控舞台 */
.cp-video-stage {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  background: #000000;
  border-radius: 6px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.cp-video-player {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.cp-video-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: rgba(255, 255, 255, 0.85);
  font-size: 12px;
  background: rgba(0, 0, 0, 0.65);
}

.cp-video-hint {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
  text-align: center;
  padding: 0 16px;
}

/* 产物库网格 (内部独立滚动) */
.cp-gallery-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  flex: 1 1 0%;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 2px;
  box-sizing: border-box;
}

.cp-gallery-card {
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color-page);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  overflow: hidden;
  padding: 4px;
  box-sizing: border-box;
}

.cp-gallery-card__img {
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 4px;
  background: var(--el-bg-color);
}

.cp-gallery-card__info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 4px;
  gap: 4px;
}

.cp-gallery-card__name {
  font-size: 11px;
  color: var(--el-text-color-regular);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cp-gallery-card__tag {
  font-size: 10px;
  padding: 0 4px;
  height: 18px;
  line-height: 16px;
}

.cp-gallery-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 24px 0;
  text-align: center;
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}

/* 窄屏幕自适应 */
@media (max-width: 860px) {
  .cp-workspace {
    flex-direction: column;
  }
  .cp-side-pane {
    width: 100%;
    height: auto;
    border-left: none;
    border-top: 1px solid var(--el-border-color-lighter);
  }
}
</style>
