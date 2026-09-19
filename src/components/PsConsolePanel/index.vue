<template>
  <div class="ps-console" v-loading="loading">
    <div class="ops-header">
      <div>
        <div class="ops-header__title">{{ t('psConsole.title') }}</div>
      </div>
      <div class="ops-header__actions">
        <div class="inline-status-group">
          <div class="inline-status" :class="`is-${serviceStatus.level}`">
            <span class="inline-status__dot" />
            <span class="inline-status__label">{{ t('psConsole.psService') }}</span>
            <span class="inline-status__text">{{ serviceStatus.text }}</span>
          </div>
        </div>
        <el-button type="primary" :disabled="!selectedClient" @click="operationDialogVisible = true"
          >{{ t('psConsole.openPanel') }}</el-button
        >
        <el-button type="primary" @click="refreshClients">{{ t('psConsole.refreshNodes') }}</el-button>
      </div>
    </div>

    <div class="tab-layout">
      <ExternalClientSidebar
        class="ops-sidebar"
        :items="clientNodeItems"
        :loading="loading"
        :selected-client-id="selectedClientId"
        :section-title="t('psConsole.clientNodes')"
        :empty-text="t('psConsole.noAvailableClient')"
        @select="selectedClientId = $event"
      />

      <section class="ops-main">
        <div class="ops-panel">
          <div class="ops-panel__head">
            <div>
              <div class="ops-panel__title">{{ t('psConsole.nodePsServiceStatus') }}</div>
              <div class="ops-panel__sub" v-if="selectedClient">
                {{ selectedClientDisplayName }}
              </div>
            </div>
          </div>

          <template v-if="selectedClient">
            <div class="compact-info compact-info--grid">
              <div class="compact-info__item">
                <span class="compact-info__label">{{ t('psConsole.overall') }}</span>
                <span class="compact-info__value">
                  <span class="status-chip" :class="`is-${serviceStatus.level}`">
                    <span class="status-chip__dot" />
                    <span>{{ serviceStatus.text }}</span>
                  </span>
                </span>
              </div>
              <div class="compact-info__item">
                <span class="compact-info__label">{{ t('psConsole.serviceStatus') }}</span>
                <span class="compact-info__value">
                  <span class="status-chip" :class="`is-${selectedPsServiceConnectionStatus.tone}`">
                    <span class="status-chip__dot" />
                    <span>{{ selectedPsServiceConnectionStatus.text }}</span>
                  </span>
                </span>
              </div>
              <div class="compact-info__item">
                <span class="compact-info__label">Photoshop</span>
                <span class="compact-info__value">
                  <span class="status-chip" :class="`is-${selectedPsApplicationStatus.tone}`">
                    <span class="status-chip__dot" />
                    <span>{{ selectedPsApplicationStatus.text }}</span>
                  </span>
                </span>
              </div>
              <div class="compact-info__item">
                <span class="compact-info__label">{{ t('psConsole.runningState') }}</span>
                <span class="compact-info__value">{{
                  resolvePsStateText(selectedPsBridgeService?.state)
                }}</span>
              </div>
              <div class="compact-info__item">
                <span class="compact-info__label">{{ t('psConsole.version') }}</span>
                <span class="compact-info__value">{{
                  selectedPsBridgeService?.version || "-"
                }}</span>
              </div>
              <div class="compact-info__item">
                <span class="compact-info__label">{{ t('psConsole.serviceAddress') }}</span>
                <span class="compact-info__value">{{
                  selectedPsBridgeService?.endpoint || "-"
                }}</span>
              </div>
              <div class="compact-info__item">
                <span class="compact-info__label">{{ t('psConsole.currentTask') }}</span>
                <span class="compact-info__value">{{
                  selectedPsBridgeService?.currentTaskId || "-"
                }}</span>
              </div>
              <div class="compact-info__item">
                <span class="compact-info__label">{{ t('psConsole.lastChecked') }}</span>
                <span class="compact-info__value">{{
                  formatDateSafe(selectedPsBridgeService?.lastCheckedAt)
                }}</span>
              </div>
              <div class="compact-info__item">
                <span class="compact-info__label">{{ t('psConsole.supportedCommands') }}</span>
                <span class="compact-info__value">{{
                  formatListSafe(selectedPsBridgeService?.supportedCommands)
                }}</span>
              </div>
              <div class="compact-info__item compact-info__item--full">
                <span class="compact-info__label">{{ t('psConsole.description') }}</span>
                <span class="compact-info__value">{{
                  selectedPsBridgeService?.message || "-"
                }}</span>
              </div>
              <div class="compact-info__item compact-info__item--full">
                <span class="compact-info__label">{{ t('psConsole.lastError') }}</span>
                <span class="compact-info__value">{{
                  selectedPsBridgeService?.lastError || "-"
                }}</span>
              </div>
            </div>
          </template>

          <el-empty v-else :description="t('psConsole.selectClient')" />
        </div>
      </section>
    </div>

    <el-dialog
      v-model="operationDialogVisible"
      fullscreen
      append-to-body
      :destroy-on-close="false"
      class="ps-operation-dialog"
      :title="operationDialogTitle"
    >
      <div v-if="selectedClient" class="operation-shell">
        <el-tabs v-model="activeTab" class="operation-tabs">
          <el-tab-pane :label="t('psConsole.service')" name="service">
            <div class="operation-grid operation-grid--service">
              <div class="ops-panel">
                <div class="ops-panel__head">
                  <div>
                    <div class="ops-panel__title">{{ t('psConsole.serviceControl') }}</div>
                  </div>
                </div>

                <div class="form-grid form-grid--service">
                  <div class="field-block">
                    <label>{{ t('psConsole.startTimeout') }}</label>
                    <el-input-number
                      v-model="serviceForm.startTimeout"
                      :min="5"
                      :max="120"
                      controls-position="right"
                    />
                  </div>
                  <div class="field-block field-block--switch">
                    <label>{{ t('psConsole.stopStrategy') }}</label>
                    <el-switch
                      v-model="serviceForm.forceStop"
                      :active-text="t('psConsole.forceStop')"
                      :inactive-text="t('psConsole.gracefulStop')"
                    />
                  </div>
                </div>

                <div class="button-row button-row--service-grid">
                  <el-button
                    :loading="loadingMap.refreshRuntime"
                    @click="dispatchPsCommand('refreshRuntime')"
                    >{{ t('psConsole.refreshStatus') }}</el-button
                  >
                  <el-button
                    :loading="loadingMap.health"
                    @click="dispatchPsCommand('health', {}, 'maintenance')"
                    >{{ t('psConsole.healthCheck') }}</el-button
                  >
                  <el-button
                    type="primary"
                    :loading="loadingMap.startPhotoshop"
                    @click="
                      dispatchPsCommand(
                        'startPhotoshop',
                        { timeout: serviceForm.startTimeout },
                        'maintenance',
                      )
                    "
                    >{{ t('psConsole.startPhotoshop') }}</el-button
                  >
                  <el-button
                    :loading="loadingMap.restartPhotoshop"
                    @click="
                      dispatchPsCommand(
                        'restartPhotoshop',
                        { timeout: serviceForm.startTimeout },
                        'maintenance',
                      )
                    "
                    >{{ t('psConsole.restartPhotoshop') }}</el-button
                  >
                  <el-button
                    type="danger"
                    :loading="loadingMap.stopPhotoshop"
                    @click="
                      dispatchPsCommand(
                        'stopPhotoshop',
                        { force: serviceForm.forceStop },
                        'maintenance',
                      )
                    "
                    >{{ t('psConsole.stopPhotoshop') }}</el-button
                  >
                </div>
              </div>

              <div class="ops-panel">
                <div class="ops-panel__head">
                  <div>
                    <div class="ops-panel__title">{{ t('psConsole.serviceDetail') }}</div>
                  </div>
                </div>

                <div class="compact-info compact-info--grid">
                  <div class="compact-info__item">
                    <span class="compact-info__label">{{ t('psConsole.overall') }}</span>
                    <span class="compact-info__value">
                      <span class="status-chip" :class="`is-${serviceStatus.level}`">
                        <span class="status-chip__dot" />
                        <span>{{ serviceStatus.text }}</span>
                      </span>
                    </span>
                  </div>
                  <div class="compact-info__item">
                    <span class="compact-info__label">{{ t('psConsole.serviceStatus') }}</span>
                    <span class="compact-info__value">
                      <span class="status-chip" :class="`is-${selectedPsServiceConnectionStatus.tone}`">
                        <span class="status-chip__dot" />
                        <span>{{ selectedPsServiceConnectionStatus.text }}</span>
                      </span>
                    </span>
                  </div>
                  <div class="compact-info__item">
                    <span class="compact-info__label">Photoshop</span>
                    <span class="compact-info__value">
                      <span class="status-chip" :class="`is-${selectedPsApplicationStatus.tone}`">
                        <span class="status-chip__dot" />
                        <span>{{ selectedPsApplicationStatus.text }}</span>
                      </span>
                    </span>
                  </div>
                  <div class="compact-info__item">
                    <span class="compact-info__label">{{ t('psConsole.runningState') }}</span>
                    <span class="compact-info__value">{{
                      resolvePsStateText(selectedPsBridgeService?.state)
                    }}</span>
                  </div>
                  <div class="compact-info__item">
                    <span class="compact-info__label">{{ t('psConsole.version') }}</span>
                    <span class="compact-info__value">{{
                      selectedPsBridgeService?.version || "-"
                    }}</span>
                  </div>
                  <div class="compact-info__item">
                    <span class="compact-info__label">{{ t('psConsole.lastChecked') }}</span>
                    <span class="compact-info__value">{{
                      formatDateSafe(selectedPsBridgeService?.lastCheckedAt)
                    }}</span>
                  </div>
                  <div class="compact-info__item compact-info__item--full">
                    <span class="compact-info__label">{{ t('psConsole.description') }}</span>
                    <span class="compact-info__value">{{
                      selectedPsBridgeService?.message || "-"
                    }}</span>
                  </div>
                </div>
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane :label="t('psConsole.psdAnalysis')" name="analyze">
            <div class="operation-grid">
              <div class="ops-panel">
                <div class="ops-panel__head">
                  <div>
                    <div class="ops-panel__title">{{ t('psConsole.analysisParams') }}</div>
                    <div class="ops-panel__sub">
                      {{ t('psConsole.analysisParamsDesc') }}
                    </div>
                  </div>
                </div>

                <div class="form-stack">
                  <div class="field-block">
                    <label>{{ t('psConsole.psdPath') }}</label>
                    <el-input v-model="analyzeForm.psdPath" placeholder="D:\\path\\to\\file.psd" />
                  </div>

                  <div class="button-row button-row--analysis wrap">
                    <el-button
                      type="primary"
                      :loading="loadingMap.analyzePsd"
                      @click="handleAnalyzePsd('static')"
                      >{{ t('psConsole.staticAnalysis') }}</el-button
                    >
                    <el-button
                      :loading="loadingMap.runtimeAnalyzePsd"
                      @click="handleAnalyzePsd('runtime')"
                      >{{ t('psConsole.runtimeProbe') }}</el-button
                    >
                    <el-button
                      :disabled="!analysisResult"
                      @click="copyJson(analysisResult, t('psConsole.analysisResultCopied'))"
                      >{{ t('psConsole.copyJson') }}</el-button
                    >
                    <el-button
                      :disabled="!analysisResult"
                      :type="analysisViewMode === 'detail' ? 'primary' : 'default'"
                      plain
                      @click="analysisViewMode = 'detail'"
                      >{{ t('psConsole.analysisDetail') }}</el-button
                    >
                    <el-button
                      :disabled="!analysisResult"
                      :type="analysisViewMode === 'compact' ? 'primary' : 'default'"
                      plain
                      @click="analysisViewMode = 'compact'"
                      >{{ t('psConsole.compactInfo') }}</el-button
                    >
                  </div>
                </div>

                <div class="compact-info compact-info--grid" v-if="analysisResult">
                  <div class="compact-info__item">
                    <span class="compact-info__label">{{ t('psConsole.docSize') }}</span>
                    <span class="compact-info__value">{{
                      formatDocumentSize(analysisDocumentInfo)
                    }}</span>
                  </div>
                  <div class="compact-info__item">
                    <span class="compact-info__label">{{ t('psConsole.artboardCount') }}</span>
                    <span class="compact-info__value">{{
                      analysisStatistics.artboard_count ?? 0
                    }}</span>
                  </div>
                  <div class="compact-info__item">
                    <span class="compact-info__label">{{ t('psConsole.smartObjects') }}</span>
                    <span class="compact-info__value">{{
                      analysisStatistics.total_smart_objects ?? 0
                    }}</span>
                  </div>
                  <div class="compact-info__item">
                    <span class="compact-info__label">{{ t('psConsole.layerCount') }}</span>
                    <span class="compact-info__value">{{
                      analysisStatistics.total_layers ?? 0
                    }}</span>
                  </div>
                  <div class="compact-info__item compact-info__item--full">
                    <span class="compact-info__label">{{ t('psConsole.analysisSource') }}</span>
                    <span class="compact-info__value">{{ analysisSourceLabel }}</span>
                  </div>
                </div>

                <div
                  v-if="analysisViewMode === 'compact' && compactArtboardPreviews.length"
                  class="analysis-preview-list"
                >
                  <div
                    v-for="artboard in compactArtboardPreviews"
                    :key="artboard.key"
                    class="analysis-preview-card"
                  >
                    <div class="analysis-preview-card__head">
                      <div class="analysis-preview-card__title">{{ artboard.name || t('psConsole.unnamedArtboard') }}</div>
                      <div class="analysis-preview-card__meta">
                        {{ artboard.sizeLabel }} · {{ artboard.smartObjectCount }} {{ t('psConsole.smartObjectCount') }}
                      </div>
                    </div>
                    <div class="analysis-preview-stage">
                      <div
                        class="analysis-preview-artboard"
                        :style="{
                          width: `${artboard.canvasWidth}px`,
                          height: `${artboard.canvasHeight}px`,
                        }"
                      >
                        <div
                          v-for="item in artboard.smartObjects"
                          :key="item.key"
                          class="analysis-preview-object"
                          :style="{
                            left: `${item.left}px`,
                            top: `${item.top}px`,
                            width: `${item.width}px`,
                            height: `${item.height}px`,
                          }"
                        >
                          <span class="analysis-preview-object__label">{{ item.name }}</span>
                        </div>
                      </div>
                    </div>
                    <div v-if="artboard.smartObjects.length" class="analysis-preview-legend">
                      <div
                        v-for="item in artboard.smartObjects"
                        :key="`${item.key}-meta`"
                        class="analysis-preview-legend__item"
                      >
                        <span class="analysis-preview-legend__name">{{ item.name }}</span>
                        <span class="analysis-preview-legend__meta">
                          {{ item.meta }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="ops-panel">
                <div class="ops-panel__head">
                  <div>
                    <div class="ops-panel__title">{{
                      analysisViewMode === "compact" ? t('psConsole.compactInfo') : t('psConsole.analysisResult')
                    }}</div>
                    <div class="ops-panel__sub">{{
                      analysisViewMode === "compact"
                        ? t('psConsole.compactInfoDesc', { source: analysisSourceLabel })
                        : t('psConsole.analysisResultDesc', { source: analysisSourceLabel })
                    }}</div>
                  </div>
                </div>
                <pre class="result">{{
                  analysisResult
                    ? jsonText(analysisViewMode === "compact" ? compactAnalysisResult : analysisResult)
                    : t('psConsole.noAnalysisResult')
                }}</pre>
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane :label="t('psConsole.debugProcess')" name="process">
            <div class="operation-grid">
              <div class="ops-panel">
                <div class="ops-panel__head">
                  <div>
                    <div class="ops-panel__title">{{ t('psConsole.processParams') }}</div>
                    <div class="ops-panel__sub">{{ t('psConsole.processParamsDesc') }}</div>
                  </div>
                </div>

                <div class="form-stack">
                  <div class="field-block">
                    <label>{{ t('psConsole.psdPathRequired') }}</label>
                    <el-input
                      v-model="processForm.psdPath"
                      placeholder="D:\\templates\\template.psd"
                    />
                  </div>
                  <div class="field-block">
                    <label>{{ t('psConsole.exportDir') }}</label>
                    <el-input v-model="processForm.exportDir" :placeholder="t('psConsole.exportDirPlaceholder')" disabled />
                  </div>
                  <div class="form-grid">
                    <div class="field-block">
                      <label>{{ t('psConsole.exportFilename') }}</label>
                      <el-input
                        v-model="processForm.outputFilename"
                        :placeholder="t('psConsole.exportFilenamePlaceholder')"
                      />
                    </div>
                    <div class="field-block">
                      <label>verbose</label>
                      <el-switch
                        v-model="processForm.verbose"
                        :active-text="t('psConsole.on')"
                        :inactive-text="t('psConsole.off')"
                      />
                    </div>
                  </div>
                  <div class="subsection-head">
                    <div class="subsection-title">{{ t('psConsole.smartObjectConfig') }}</div>
                    <el-button size="small" @click="addSmartObject">{{ t('psConsole.addSmartObject') }}</el-button>
                  </div>
                  <div class="smart-object-list">
                    <div
                      v-for="(item, index) in processForm.smartObjects"
                      :key="`smart-object-${index}`"
                      class="smart-object-card"
                    >
                      <div class="smart-object-card__head">
                        <div class="smart-object-card__title">{{ t('psConsole.smartObjectTitle', { index: index + 1 }) }}</div>
                        <el-button
                          link
                          type="danger"
                          :disabled="processForm.smartObjects.length <= 1"
                          @click="removeSmartObject(index)"
                          >{{ t('common.delete') }}</el-button
                        >
                      </div>
                      <div class="form-grid">
                        <div class="field-block">
                          <label>{{ t('psConsole.smartObjectName') }}</label>
                          <el-input
                            v-model="item.smartObjectName"
                            :placeholder="t('psConsole.smartObjectNamePlaceholder')"
                          />
                        </div>
                        <div class="field-block">
                          <label>{{ t('psConsole.imagePathRequired') }}</label>
                          <el-input v-model="item.imagePath" placeholder="D:\\images\\image.jpg" />
                        </div>
                        <div class="field-block">
                          <label>{{ t('psConsole.backgroundImagePath') }}</label>
                          <el-input
                            v-model="item.backgroundImagePath"
                            :placeholder="t('psConsole.backgroundImagePathPlaceholder')"
                          />
                        </div>
                      </div>
                      <div class="form-grid">
                        <div class="field-block">
                          <label>{{ t('psConsole.resizeMode') }}</label>
                          <el-select v-model="item.resizeMode">
                            <el-option label="contain" value="contain" />
                            <el-option label="cover" value="cover" />
                            <el-option label="stretch" value="stretch" />
                            <el-option label="custom" value="custom" />
                          </el-select>
                        </div>
                        <div class="field-block">
                          <label>tile_size</label>
                          <el-input-number
                            v-model="item.tileSize"
                            :min="64"
                            :max="2048"
                            controls-position="right"
                          />
                        </div>
                        <div class="field-block">
                          <label>旋转角度 (rotation°)</label>
                          <el-input-number
                            v-model="item.rotation"
                            :min="-360"
                            :max="360"
                            :step="90"
                            controls-position="right"
                          />
                        </div>
                      </div>
                      <div v-if="item.resizeMode === 'custom'" class="field-block">
                        <label>custom_options</label>
                        <div class="button-row wrap">
                          <el-button
                            v-for="template in customTemplateOptions"
                            :key="template.key"
                            size="small"
                            @click="applyCustomOptionsTemplate(index, template.key)"
                            >{{ template.label() }}</el-button
                          >
                        </div>
                        <el-input
                          v-model="item.customOptionsText"
                          type="textarea"
                          :rows="7"
                          placeholder='{\"position\":{\"x\":0,\"y\":0,\"unit\":\"px\"},\"size\":{\"width\":800,\"height\":600,\"unit\":\"px\"},\"child_resize_mode\":\"contain\"}'
                        />
                      </div>
                    </div>
                  </div>
                  <!-- 颜色图层调试配置已临时停用 -->
                  <div class="button-row wrap">
                    <el-button
                      type="primary"
                      :loading="loadingMap.debugProcess"
                      @click="handleDebugProcess"
                      >{{ t('psConsole.startProcess') }}</el-button
                    >
                    <el-button @click="copyText(processPayloadPreview, t('psConsole.processPayloadCopied'))"
                      >{{ t('psConsole.copyParams') }}</el-button
                    >
                  </div>
                </div>
              </div>

              <div class="ops-panel">
                <div class="ops-panel__head">
                  <div>
                    <div class="ops-panel__title">{{ t('psConsole.backendParamsAndResult') }}</div>
                    <div class="ops-panel__sub">{{ t('psConsole.backendParamsAndResultDesc') }}</div>
                  </div>
                </div>
                <pre class="result">{{ processPayloadPreview }}</pre>
                <pre class="result result--secondary">{{
                  processResult ? jsonText(processResult) : t('psConsole.noProcessResult')
                }}</pre>
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane :label="t('psConsole.logs')" name="logs">
            <div class="operation-grid">
              <div class="ops-panel">
                <div class="ops-panel__head">
                  <div>
                    <div class="ops-panel__title">{{ t('psConsole.latestCommandResult') }}</div>
                    <div class="ops-panel__sub">{{ t('psConsole.latestCommandResultDesc') }}</div>
                  </div>
                  <div class="ops-panel__actions">
                    <el-button
                      :disabled="!latestCommandResult"
                      @click="copyJson(latestCommandResult, t('psConsole.commandResultCopied'))"
                      >{{ t('psConsole.copyResult') }}</el-button
                    >
                  </div>
                </div>
                <pre class="result">{{
                  latestCommandResult ? jsonText(latestCommandResult) : t('psConsole.noCommandResult')
                }}</pre>
              </div>

              <div class="ops-panel">
                <div class="ops-panel__head">
                  <div>
                    <div class="ops-panel__title">{{ t('psConsole.debugLogs') }}</div>
                    <div class="ops-panel__sub">{{ t('psConsole.debugLogsDesc') }}</div>
                  </div>
                  <div class="ops-panel__actions">
                    <el-button @click="clearCommandLogs">{{ t('psConsole.clearLogs') }}</el-button>
                  </div>
                </div>
                <div class="log-list">
                  <div v-if="!commandLogs.length" class="log-empty">{{ t('psConsole.noDebugLogs') }}</div>
                  <div
                    v-for="item in commandLogs"
                    :key="item.id"
                    class="log-item"
                    :class="`is-${item.level}`"
                  >
                    <div class="log-item__meta">
                      <span>{{ item.time }}</span>
                      <span>{{ resolveActionText(item.action) }}</span>
                    </div>
                    <div class="log-item__message">{{ item.message }}</div>
                  </div>
                </div>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
      <el-empty v-else :description="t('psConsole.selectClientNode')" />
    </el-dialog>
  </div>
</template>

<script lang="ts" setup>
import { computed, onActivated, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import { useLocalStorage } from "@vueuse/core";
import { ElMessage } from "element-plus";
import { useI18n } from "@/hooks/web/useI18n";
import { formatDate } from "@/utils/formatTime";
import { sendServiceCommand } from "@/api/system/websocket";
import ExternalClientSidebar, {
  type ClientNodeItem,
  type ClientNodeBadge,
} from "@/views/external/components/ExternalClientSidebar.vue";
import {
  websocketClient,
  type ServiceCommandResultEvent,
  type ServiceRuntimeEvent,
} from "@/services/websocketClient";
import { usePluginClientNodes } from "@/services/clientNodeState";

defineOptions({ name: "PsConsolePanel" });

const { t } = useI18n();

type PsCommandAction =
  | "refreshRuntime"
  | "health"
  | "startPhotoshop"
  | "stopPhotoshop"
  | "restartPhotoshop"
  | "analyzePsd"
  | "runtimeAnalyzePsd"
  | "debugProcess";

type CommandMode = "production" | "debug" | "maintenance";

interface SmartObjectForm {
  smartObjectName: string;
  imagePath: string;
  backgroundImagePath: string;
  resizeMode: "contain" | "cover" | "stretch" | "custom";
  tileSize: number;
  rotation: number;
  customOptionsText: string;
}

interface CommandLogItem {
  id: string;
  time: string;
  action: string;
  level: "info" | "success" | "error";
  message: string;
}

interface ServiceCommandDispatchResponse {
  success: boolean;
  message?: string;
  data?: {
    commandId?: string;
    clientId?: string;
    pluginKey?: string;
    service?: string;
    action?: string;
    payload?: Record<string, any>;
    createdAt?: string;
  };
}

const {
  clients: psClients,
  loading,
  refresh: refreshClientNodes,
} = usePluginClientNodes("ps-automation");
const selectedClientId = ref("");
const activeTab = ref("service");
const operationDialogVisible = ref(false);
const analysisViewMode = ref<"detail" | "compact">("detail");
const analysisExecutionMode = ref<"static" | "runtime">("static");
const latestCommandResult = ref<ServiceCommandResultEvent | Record<string, any> | null>(null);
const analysisResult = ref<Record<string, any> | null>(null);
const processResult = ref<Record<string, any> | null>(null);
const commandLogs = ref<CommandLogItem[]>([]);

const loadingMap = reactive<Record<PsCommandAction, boolean>>({
  refreshRuntime: false,
  health: false,
  startPhotoshop: false,
  stopPhotoshop: false,
  restartPhotoshop: false,
  analyzePsd: false,
  runtimeAnalyzePsd: false,
  debugProcess: false,
});

const pendingActions = reactive<Record<string, PsCommandAction>>({});
const silentCommandIds = new Set<string>();
const runtimeBootstrapDone = ref(false);
let runtimeBootstrapResolver: (() => void) | null = null;
let runtimeBootstrapTimer: ReturnType<typeof setTimeout> | null = null;

const beginRuntimeBootstrap = () => {
  runtimeBootstrapDone.value = false;
  if (runtimeBootstrapTimer) {
    clearTimeout(runtimeBootstrapTimer);
    runtimeBootstrapTimer = null;
  }
  return new Promise<void>((resolve) => {
    runtimeBootstrapResolver = resolve;
    runtimeBootstrapTimer = setTimeout(() => {
      completeRuntimeBootstrap();
    }, 12_000);
  });
};

const completeRuntimeBootstrap = () => {
  if (runtimeBootstrapDone.value) {
    return;
  }
  runtimeBootstrapDone.value = true;
  runtimeBootstrapResolver?.();
  runtimeBootstrapResolver = null;
  if (runtimeBootstrapTimer) {
    clearTimeout(runtimeBootstrapTimer);
    runtimeBootstrapTimer = null;
  }
};

const serviceFormStorage = useLocalStorage("ps_console_panel_service_form", {
  startTimeout: 30,
  forceStop: false,
});
const serviceForm = reactive({
  startTimeout: serviceFormStorage.value?.startTimeout ?? 30,
  forceStop: serviceFormStorage.value?.forceStop ?? false,
});

const analyzeFormStorage = useLocalStorage("ps_console_panel_analyze_form", {
  psdPath: "",
});
const analyzeForm = reactive({
  psdPath: analyzeFormStorage.value?.psdPath ?? "",
});

const createSmartObject = (): SmartObjectForm => ({
  smartObjectName: "",
  imagePath: "",
  backgroundImagePath: "",
  resizeMode: "contain",
  tileSize: 512,
  rotation: 0,
  customOptionsText: "",
});

const processFormStorage = useLocalStorage("ps_console_panel_process_form", {
  psdPath: "",
  exportDir: "",
  outputFilename: "",
  verbose: true,
  smartObjects: [createSmartObject()],
});
const processForm = reactive({
  psdPath: processFormStorage.value?.psdPath ?? "",
  exportDir: processFormStorage.value?.exportDir ?? "",
  outputFilename: processFormStorage.value?.outputFilename ?? "",
  verbose: processFormStorage.value?.verbose ?? true,
  smartObjects: Array.isArray(processFormStorage.value?.smartObjects)
    ? processFormStorage.value.smartObjects
    : [createSmartObject()],
});

if (!Array.isArray(processForm.smartObjects) || !processForm.smartObjects.length) {
  processForm.smartObjects = [createSmartObject()];
}

watch(
  serviceForm,
  (value) => {
    serviceFormStorage.value = {
      startTimeout: Number(value.startTimeout) || 30,
      forceStop: !!value.forceStop,
    };
  },
  { deep: true },
);

watch(
  analyzeForm,
  (value) => {
    analyzeFormStorage.value = {
      psdPath: String(value.psdPath || ""),
    };
  },
  { deep: true },
);

watch(
  processForm,
  (value) => {
    processFormStorage.value = JSON.parse(
      JSON.stringify({
        psdPath: String(value.psdPath || ""),
        exportDir: String(value.exportDir || ""),
        outputFilename: String(value.outputFilename || ""),
        verbose: !!value.verbose,
        smartObjects: Array.isArray(value.smartObjects) ? value.smartObjects : [createSmartObject()],
      }),
    );
  },
  { deep: true },
);

const customTemplateOptions = [
  { key: "px-contain", label: () => t('psConsole.pixelContain') },
  { key: "px-cover", label: () => t('psConsole.pixelCover') },
  { key: "percent-contain", label: () => t('psConsole.percentContain') },
  { key: "percent-cover", label: () => t('psConsole.percentCover') },
];

const customOptionsTemplates: Record<string, Record<string, any>> = {
  "px-contain": {
    position: { x: 0, y: 0, unit: "px" },
    size: { width: 800, height: 600, unit: "px" },
    child_resize_mode: "contain",
  },
  "px-cover": {
    position: { x: 0, y: 0, unit: "px" },
    size: { width: 800, height: 600, unit: "px" },
    child_resize_mode: "cover",
  },
  "percent-contain": {
    position: { x: 10, y: 10, unit: "%" },
    size: { width: 80, height: 80, unit: "%" },
    child_resize_mode: "contain",
  },
  "percent-cover": {
    position: { x: 10, y: 10, unit: "%" },
    size: { width: 80, height: 80, unit: "%" },
    child_resize_mode: "cover",
  },
};

const getPhotoshopService = (client: any) =>
  client.clientInfo?.services?.["ps-automation"] || client.clientInfo?.services?.photoshop || null;

const isPsAutomationActivelyBusy = (psAutomation?: Record<string, any> | null) => {
  if (!psAutomation || psAutomation.running !== true) {
    return false;
  }
  const queueCount = Number(psAutomation.queueCount ?? 0);
  const currentPsSetId = String(psAutomation.currentPsSetId || "").trim();
  return (Number.isFinite(queueCount) && queueCount > 0) || !!currentPsSetId;
};

const isPsServiceBusy = (client: any, service?: any) => {
  const runtime = service || getPhotoshopService(client);
  if (!runtime) {
    return isPsAutomationActivelyBusy(client?.clientInfo?.psAutomation);
  }
  if (runtime.busy === true) {
    return true;
  }
  if (isPsAutomationActivelyBusy(client?.clientInfo?.psAutomation)) {
    return true;
  }
  const taskId = String(runtime.currentTaskId || "").trim();
  const state = String(runtime.state || "").trim().toLowerCase();
  return !!(taskId && state === "busy" && runtime.busy !== false);
};

const hasPsServiceError = (service?: any) =>
  !!(service?.status === "error" || service?.state === "error");

const resolvePsRuntimeDisplay = (service?: any) => {
  if (!service) {
    return {
      summary: { text: t('psConsole.statusNotReported'), tone: "info" as ClientNodeBadge["tone"] },
      service: { text: t('psConsole.statusNotReported'), tone: "info" as ClientNodeBadge["tone"] },
      application: { text: "-", tone: "info" as ClientNodeBadge["tone"] },
      hasError: false,
    };
  }

  const details = service?.details || {};
  const connected = !!service.connected;
  const available = !!(service.available || details?.photoshopReady === true);
  const busy = !!service.busy;
  const hasError = hasPsServiceError(service);
  const photoshopRunning = !!(
    details?.photoshopRunning ?? (available || busy)
  );
  const rawPhotoshopStatus = String(details?.photoshopStatus || "").trim().toLowerCase();
  const photoshopStatus = String(
    !busy && rawPhotoshopStatus === "busy"
      ? available
        ? "ready"
        : photoshopRunning
          ? "starting"
          : "stopped"
      : details?.photoshopStatus ||
          (busy
            ? "busy"
            : available
              ? "ready"
              : photoshopRunning
                ? "starting"
                : connected
                  ? "stopped"
                  : "unknown"),
  );

  const serviceStatus = hasError
    ? { text: t('psConsole.serviceError'), tone: "danger" as ClientNodeBadge["tone"] }
    : connected
      ? { text: t('psConsole.serviceOnline'), tone: "success" as ClientNodeBadge["tone"] }
      : service?.status === "disconnected" || service?.state === "offline"
        ? { text: t('psConsole.serviceNotStarted'), tone: "info" as ClientNodeBadge["tone"] }
        : { text: t('psConsole.notReady'), tone: "info" as ClientNodeBadge["tone"] };

  const applicationStatus = busy
    ? { text: t('psConsole.running'), tone: "warning" as ClientNodeBadge["tone"] }
    : available || photoshopStatus === "ready"
      ? { text: t('psConsole.available'), tone: "success" as ClientNodeBadge["tone"] }
      : connected && (photoshopStatus === "starting" || photoshopRunning)
        ? { text: t('psConsole.starting'), tone: "warning" as ClientNodeBadge["tone"] }
        : connected
          ? { text: t('psConsole.notStarted'), tone: "info" as ClientNodeBadge["tone"] }
          : { text: t('psConsole.unavailable'), tone: "info" as ClientNodeBadge["tone"] };

  const summary = busy
    ? { text: t('psConsole.running'), tone: "warning" as ClientNodeBadge["tone"] }
    : available
      ? { text: t('psConsole.available'), tone: "success" as ClientNodeBadge["tone"] }
      : hasError
        ? { text: t('psConsole.serviceError'), tone: "danger" as ClientNodeBadge["tone"] }
        : connected && applicationStatus.text === t('psConsole.starting')
          ? { text: t('psConsole.waitingReady'), tone: "warning" as ClientNodeBadge["tone"] }
          : connected
            ? { text: t('psConsole.serviceOnline'), tone: "info" as ClientNodeBadge["tone"] }
            : service?.status === "disconnected" || service?.state === "offline"
              ? { text: t('psConsole.serviceNotStarted'), tone: "info" as ClientNodeBadge["tone"] }
              : { text: t('psConsole.notReady'), tone: "info" as ClientNodeBadge["tone"] };

  return {
    summary,
    service: serviceStatus,
    application: applicationStatus,
    hasError,
  };
};

const selectedClient = computed(() => {
  if (!psClients.value.length) {
    return null;
  }
  return (
    psClients.value.find((client) => client.id === selectedClientId.value) || psClients.value[0]
  );
});
const selectedClientDisplayName = computed(
  () => selectedClient.value?.clientInfo?.machine?.code || selectedClient.value?.id || "-",
);
const operationDialogTitle = computed(
  () => `${t('psConsole.operationTitlePrefix')} · ${selectedClientDisplayName.value}`,
);

const normalizePluginKey = (value?: string | null) => {
  const normalized = String(value || "").trim();
  if (!normalized) return "";
  if (normalized === "photoshop") return "ps-automation";
  return normalized;
};

const getPsBridgeService = (client: any) => {
  const service = getPhotoshopService(client);
  if (!service) {
    return null;
  }

  if (!runtimeBootstrapDone.value) {
    return {
      ...service,
      busy: false,
      hasError: false,
      level: "info" as ClientNodeBadge["tone"],
      text: t('psConsole.syncing'),
      serviceStatus: { text: t('psConsole.syncing'), tone: "info" as ClientNodeBadge["tone"] },
      applicationStatus: { text: "-", tone: "info" as ClientNodeBadge["tone"] },
    };
  }

  const busy = isPsServiceBusy(client, service);
  const details = service?.details || {};
  const normalizedState = busy
    ? "busy"
    : service?.available || details?.photoshopReady
      ? "idle"
      : service?.state === "error"
        ? "error"
        : service?.state === "offline"
          ? "offline"
          : "connected";
  const display = resolvePsRuntimeDisplay({
    ...service,
    busy,
    state: normalizedState,
    details: {
      ...details,
      photoshopStatus:
        !busy && String(details?.photoshopStatus || "").toLowerCase() === "busy"
          ? service?.available || details?.photoshopReady
            ? "ready"
            : "starting"
          : details?.photoshopStatus,
    },
  });

  return {
    ...service,
    busy,
    state: normalizedState,
    currentTaskId: busy ? service?.currentTaskId : null,
    hasError: display.hasError,
    level: display.summary.tone,
    text: display.summary.text,
    serviceStatus: display.service,
    applicationStatus: display.application,
  };
};

const selectedPsBridgeService = computed(() =>
  selectedClient.value ? getPsBridgeService(selectedClient.value) : null,
);
const clientNodeItems = computed<ClientNodeItem[]>(() =>
  psClients.value.map((client) => {
    return {
      connectionId: client.id,
      name: client.clientInfo?.machine?.code || client.id,
      time: formatDateSafe(client.connectedAt || undefined),
      metaLeft: client.clientInfo?.appVersion || t('psConsole.unknownVersion'),
      metaRight: client.clientInfo?.machine?.platform || t('psConsole.unknownPlatform'),
      detail: client.clientInfo?.workspaceDirectory
        ? `${t('psConsole.workDir')}: ${client.clientInfo.workspaceDirectory}`
        : `${t('psConsole.workDir')}: ${t('psConsole.workDirNotReported')}`,
    };
  }),
);

const analysisDocumentInfo = computed<Record<string, any>>(
  () => analysisResult.value?.document_info || {},
);
const analysisStatistics = computed<Record<string, any>>(
  () => analysisResult.value?.statistics || {},
);
const analysisSourceLabel = computed(() =>
  analysisExecutionMode.value === "runtime" ? t('psConsole.runtimeProbe') : t('psConsole.staticAnalysis'),
);
const compactAnalysisResult = computed(() => {
  const result = analysisResult.value;
  if (!result) {
    return null;
  }

  const artboards = Array.isArray(result.artboards) ? result.artboards : [];
  return {
    file_info: result.file_info || null,
    document_info: result.document_info || null,
    statistics: {
      artboard_count: result.statistics?.artboard_count ?? artboards.length,
      total_smart_objects: result.statistics?.total_smart_objects ?? 0,
    },
    artboards: artboards.map((artboard: Record<string, any>) => ({
      name: artboard.name || "",
      path: artboard.path || "",
      visible: artboard.visible ?? true,
      position: artboard.position || null,
      size: artboard.size || null,
      smart_object_count:
        artboard.smart_object_count ??
        (Array.isArray(artboard.smart_objects) ? artboard.smart_objects.length : 0),
      smart_objects: Array.isArray(artboard.smart_objects)
        ? artboard.smart_objects.map((item: Record<string, any>) => ({
            name: item.name || "",
            path: item.path || "",
            visible: item.visible ?? true,
            position: item.position || null,
            size: item.size || null,
            smart_object: item.smart_object || null,
          }))
        : [],
    })),
  };
});
const compactArtboardPreviews = computed(() => {
  const compact = compactAnalysisResult.value;
  if (!compact || !Array.isArray(compact.artboards)) {
    return [];
  }

  const maxCanvasWidth = 320;
  const maxCanvasHeight = 220;
  const minObjectSize = 18;

  return compact.artboards.map((artboard: Record<string, any>, artboardIndex: number) => {
    const width = Math.max(1, Number(artboard.size?.width) || Number(compact.document_info?.width) || 1);
    const height = Math.max(1, Number(artboard.size?.height) || Number(compact.document_info?.height) || 1);
    const scale = Math.min(maxCanvasWidth / width, maxCanvasHeight / height, 1);
    const canvasWidth = Math.max(120, Math.round(width * scale));
    const canvasHeight = Math.max(90, Math.round(height * scale));

    const smartObjects = Array.isArray(artboard.smart_objects)
      ? artboard.smart_objects.map((item: Record<string, any>, index: number) => {
          const rawLeft =
            Number(item.position?.relative_left) ||
            Number(item.position?.relative_x) ||
            Number(item.position?.left) ||
            Number(item.position?.x) ||
            0;
          const rawTop =
            Number(item.position?.relative_top) ||
            Number(item.position?.relative_y) ||
            Number(item.position?.top) ||
            Number(item.position?.y) ||
            0;
          const rawWidth = Number(item.size?.width) || 0;
          const rawHeight = Number(item.size?.height) || 0;

          const hasRealSize = rawWidth > 0 && rawHeight > 0;
          const scaledWidth = hasRealSize ? Math.max(minObjectSize, Math.round(rawWidth * scale)) : minObjectSize;
          const scaledHeight = hasRealSize ? Math.max(minObjectSize, Math.round(rawHeight * scale)) : minObjectSize;
          const maxLeft = Math.max(0, canvasWidth - scaledWidth);
          const maxTop = Math.max(0, canvasHeight - scaledHeight);
          const left = Math.min(maxLeft, Math.max(0, Math.round(rawLeft * scale)));
          const top = Math.min(maxTop, Math.max(0, Math.round(rawTop * scale)));

          return {
            key: `${artboardIndex}-${index}-${item.path || item.name || "smart-object"}`,
            name: item.name || t('psConsole.smartObjectFallback', { index: index + 1 }),
            left,
            top,
            width: scaledWidth,
            height: scaledHeight,
            meta: `${Math.max(0, Math.round(rawLeft))}, ${Math.max(0, Math.round(rawTop))} · ${Math.max(0, Math.round(rawWidth))} x ${Math.max(0, Math.round(rawHeight))}`,
          };
        })
      : [];

    return {
      key: `${artboardIndex}-${artboard.path || artboard.name || "artboard"}`,
      name: artboard.name || t('psConsole.artboardFallback', { index: artboardIndex + 1 }),
      sizeLabel: `${Math.round(width)} x ${Math.round(height)}`,
      smartObjectCount:
        Number(artboard.smart_object_count) || (Array.isArray(artboard.smart_objects) ? artboard.smart_objects.length : 0),
      canvasWidth,
      canvasHeight,
      smartObjects,
    };
  });
});
const processPayloadPreview = computed(() => jsonText(buildProcessRequest(false)));

const jsonText = (value: any) => {
  try {
    return JSON.stringify(value ?? null, null, 2);
  } catch {
    return String(value ?? "");
  }
};

const stripQuotes = (value?: string | null) =>
  String(value || "")
    .trim()
    .replace(/^['"]+|['"]+$/g, "");

const normalizeWindowsPath = (value?: string | null) => stripQuotes(value).replace(/\//g, "\\");

const formatDateSafe = (value?: string) => {
  if (!value) return "-";
  try {
    return formatDate(new Date(value));
  } catch {
    return value;
  }
};

const formatListSafe = (value?: Array<string | number> | null) => {
  if (!Array.isArray(value) || !value.length) {
    return "-";
  }
  return value.join(", ");
};

const findClientDisplayName = (clientId?: string | null) => {
  const client = psClients.value.find((item) => item.id === clientId);
  return client?.clientInfo?.machine?.code || client?.id || clientId || "-";
};

const resolvePsStateText = (value?: string | null) => {
  if (!value) return "-";
  const stateMap: Record<string, string> = {
    idle: t('psConsole.stateIdle'),
    busy: t('psConsole.running'),
    error: t('psConsole.stateError'),
    offline: t('psConsole.stateOffline'),
    connected: t('psConsole.serviceOnline'),
  };
  return stateMap[value] || value;
};

const formatDocumentSize = (value?: Record<string, any> | null) => {
  const width = Number(value?.width || 0);
  const height = Number(value?.height || 0);
  if (!width || !height) {
    return "-";
  }
  return `${width} x ${height}px`;
};

const resolveActionText = (value?: string | null) => {
  const actionMap: Record<string, string> = {
    refreshRuntime: t('psConsole.refreshStatus'),
    health: t('psConsole.healthCheck'),
    startPhotoshop: t('psConsole.startPhotoshop'),
    stopPhotoshop: t('psConsole.stopPhotoshop'),
    restartPhotoshop: t('psConsole.restartPhotoshop'),
    analyzePsd: t('psConsole.staticAnalysis'),
    runtimeAnalyzePsd: t('psConsole.runtimeProbe'),
    debugProcess: t('psConsole.debugProcess'),
  };
  return actionMap[String(value || "").trim()] || String(value || "-");
};

const pushCommandLog = (
  action: string,
  level: CommandLogItem["level"],
  message: string,
  clientId?: string | null,
) => {
  const prefix = clientId ? `[${findClientDisplayName(clientId)}] ` : "";
  commandLogs.value = [
    {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      time: formatDate(new Date(), "HH:mm:ss"),
      action,
      level,
      message: `${prefix}${message}`.trim(),
    },
    ...commandLogs.value,
  ].slice(0, 80);
};

const clearCommandLogs = () => {
  commandLogs.value = [];
};

const serviceStatus = computed(() => {
  if (!psClients.value.length) {
    return {
      level: "danger",
      text: t('psConsole.noAvailableClient'),
    };
  }

  if (selectedPsBridgeService.value) {
    return {
      level: selectedPsBridgeService.value.level,
      text: selectedPsBridgeService.value.text,
    };
  }

  return {
    level: "info",
    text: t('psConsole.notReady'),
  };
});

const selectedPsServiceConnectionStatus = computed(
  () =>
    selectedPsBridgeService.value?.serviceStatus || {
      text: t('psConsole.statusNotReported'),
      tone: "info" as ClientNodeBadge["tone"],
    },
);

const selectedPsApplicationStatus = computed(
  () =>
    selectedPsBridgeService.value?.applicationStatus || {
      text: "-",
      tone: "info" as ClientNodeBadge["tone"],
    },
);

const finishAction = (action?: string | null) => {
  if (!action) {
    return;
  }
  if (action in loadingMap) {
    loadingMap[action as PsCommandAction] = false;
  }
};

const clearPendingState = () => {
  Object.keys(pendingActions).forEach((key) => {
    delete pendingActions[key];
  });
  silentCommandIds.clear();
  (Object.keys(loadingMap) as PsCommandAction[]).forEach((key) => {
    loadingMap[key] = false;
  });
};

const refreshClients = async () => {
  await refreshClientNodes();
};

watch(
  psClients,
  (list) => {
    if (!list.length) {
      selectedClientId.value = "";
      return;
    }
    if (!selectedClientId.value || !list.some((item) => item.id === selectedClientId.value)) {
      selectedClientId.value = list[0].id;
    }
  },
  { immediate: true },
);

watch(selectedClientId, (value, previousValue) => {
  if (!value) {
    operationDialogVisible.value = false;
  }
  if (value === previousValue) {
    return;
  }
  activeTab.value = "service";
  analysisViewMode.value = "detail";
  analysisExecutionMode.value = "static";
  analysisResult.value = null;
  processResult.value = null;
  latestCommandResult.value = null;
  clearCommandLogs();
  clearPendingState();
});

const copyText = async (text: string, successMessage = t('psConsole.copied')) => {
  if (!text) {
    ElMessage.warning(t('psConsole.nothingToCopy'));
    return;
  }

  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    ElMessage.success(successMessage);
  } catch (error: any) {
    ElMessage.error(error?.message || t('psConsole.copyFailed'));
  }
};

const copyJson = async (value: any, successMessage = t('psConsole.jsonCopied')) => {
  await copyText(jsonText(value), successMessage);
};

const dispatchPsCommand = async (
  action: PsCommandAction,
  payload: Record<string, any> = {},
  mode: CommandMode = "production",
  options: { silent?: boolean } = {},
) => {
  const client = selectedClient.value;
  if (!client) {
    ElMessage.warning(t('psConsole.selectClientNode'));
    return;
  }

  if (loadingMap[action]) {
    return;
  }

  loadingMap[action] = true;
  if (!options.silent) {
    pushCommandLog(action, "info", t('psConsole.commandSent', { action: resolveActionText(action) }), client.id);
  }

  try {
    const response = (await sendServiceCommand({
      target: {
        clientId: client.id,
        pluginKey: "ps-automation",
      },
      command: {
        name: action,
        payload,
      },
      mode,
    })) as ServiceCommandDispatchResponse;

    if (!response?.success) {
      finishAction(action);
      const message = response?.message || t('psConsole.commandSendFailed');
      if (options.silent && action === "refreshRuntime") {
        completeRuntimeBootstrap();
      }
      if (!options.silent) {
        pushCommandLog(action, "error", message, client.id);
        ElMessage.error(message);
      }
      return;
    }

    const commandId = response.data?.commandId;
    if (commandId) {
      pendingActions[commandId] = action;
      if (options.silent) {
        silentCommandIds.add(commandId);
      }
    } else {
      finishAction(action);
    }

    if (!options.silent) {
      ElMessage.success(response.message || t('psConsole.commandSentSuccess'));
    }
  } catch (error: any) {
    finishAction(action);
    const message = error?.message || t('psConsole.commandSendFailed');
    if (options.silent && action === "refreshRuntime") {
      completeRuntimeBootstrap();
    }
    if (!options.silent) {
      pushCommandLog(action, "error", message, client.id);
      ElMessage.error(message);
    }
  }
};

const syncSelectedClientRuntime = async (options: { silent?: boolean } = { silent: true }) => {
  if (!selectedClient.value?.isOnline) {
    return;
  }
  await dispatchPsCommand("refreshRuntime", {}, "maintenance", options);
};

const addSmartObject = () => {
  processForm.smartObjects.push(createSmartObject());
};

const removeSmartObject = (index: number) => {
  if (processForm.smartObjects.length <= 1) {
    return;
  }
  processForm.smartObjects.splice(index, 1);
};

const applyCustomOptionsTemplate = (index: number, templateKey: string) => {
  const target = processForm.smartObjects[index];
  if (!target) {
    return;
  }
  target.resizeMode = "custom";
  target.customOptionsText = jsonText(customOptionsTemplates[templateKey] || {});
};

const buildProcessRequest = (strict = true) => {
  const psdPath = normalizeWindowsPath(processForm.psdPath);
  if (strict && !psdPath) {
    throw new Error(t('psConsole.psdPathRequired'));
  }
  const preserveEmptyStructure = !strict;

  const smartObjects = processForm.smartObjects
    .map((item, index) => {
      const imagePath = normalizeWindowsPath(item.imagePath);
      const backgroundImagePath = normalizeWindowsPath(item.backgroundImagePath);
      const smartObjectName = stripQuotes(item.smartObjectName);
      const customOptionsText = item.customOptionsText.trim();
      const hasCustomOptions = customOptionsText.length > 0;
      const hasMeaningfulConfig =
        !!imagePath ||
        !!backgroundImagePath ||
        !!smartObjectName ||
        hasCustomOptions ||
        item.resizeMode !== "contain" ||
        Math.max(64, Number(item.tileSize) || 512) !== 512;
      const isEffectivelyEmpty = !hasMeaningfulConfig;

      if (strict && isEffectivelyEmpty) {
        return null;
      }

      if (strict && !imagePath) {
        throw new Error(t('psConsole.smartObjectImageRequired', { index: index + 1 }));
      }

      const payload: Record<string, any> = {
        image_path: imagePath,
        resize_mode: item.resizeMode || "contain",
        tile_size: Math.max(64, Number(item.tileSize) || 512),
        rotation: Number(item.rotation) || 0,
      };

      if (smartObjectName) {
        payload.smart_object_name = smartObjectName;
      }

      if (backgroundImagePath) {
        payload.background_image_path = backgroundImagePath;
      }

      if (payload.resize_mode === "custom") {
        if (strict && !customOptionsText) {
          throw new Error(t('psConsole.customOptionsRequired', { index: index + 1 }));
        }
        if (customOptionsText) {
          try {
            payload.custom_options = JSON.parse(customOptionsText);
          } catch (error: any) {
            if (strict) {
              throw new Error(
                t('psConsole.customOptionsInvalidJson', { index: index + 1, detail: error?.message || error }),
              );
            }
          }
        }
      }

      return payload;
    })
    .filter(Boolean) as Record<string, any>[];

  if (strict && !smartObjects.length) {
    throw new Error(t('psConsole.atLeastOneSmartObject'));
  }

  const request: Record<string, any> = {
    psd_path: psdPath,
    verbose: !!processForm.verbose,
  };

  if (smartObjects.length || preserveEmptyStructure) {
    request.smart_objects = smartObjects;
  }

  const exportDir = normalizeWindowsPath(processForm.exportDir);
  if (exportDir) {
    request.export_dir = exportDir;
  }

  const outputFilename = stripQuotes(processForm.outputFilename);
  if (outputFilename) {
    request.output_filename = outputFilename;
  }

  return request;
};

const handleAnalyzePsd = async (mode: "static" | "runtime" = "static") => {
  const psdPath = normalizeWindowsPath(analyzeForm.psdPath);
  if (!psdPath) {
    ElMessage.warning(t('psConsole.psdPathRequired'));
    return;
  }

  analyzeForm.psdPath = psdPath;
  analysisViewMode.value = "detail";
  analysisExecutionMode.value = mode;
  analysisResult.value = null;
  await dispatchPsCommand(mode === "runtime" ? "runtimeAnalyzePsd" : "analyzePsd", { psdPath }, "debug");
};

const handleDebugProcess = async () => {
  try {
    const request = buildProcessRequest(true);
    processResult.value = null;
    await dispatchPsCommand("debugProcess", { request }, "debug");
  } catch (error: any) {
    const message = error?.message || t('psConsole.processValidationFailed');
    pushCommandLog("debugProcess", "error", message, selectedClient.value?.id);
    ElMessage.warning(message);
  }
};

const handleServiceRuntime = (_event: ServiceRuntimeEvent) => {
  // 运行态以 store 合并结果为准；不在此处提前结束 bootstrap，避免用到旧的 busy 快照。
};

const handleServiceCommandResult = async (event: ServiceCommandResultEvent) => {
  if (normalizePluginKey(event.pluginKey || event.service) !== "ps-automation") {
    return;
  }

  const pendingAction = pendingActions[event.commandId];
  const isSelectedClient = event.clientId === selectedClientId.value;

  if (!pendingAction && !isSelectedClient) {
    return;
  }

  if (pendingAction) {
    delete pendingActions[event.commandId];
    finishAction(pendingAction);
  }

  const action = pendingAction || event.action || "refreshRuntime";
  const message = event.message || event.error || (event.success ? t('psConsole.execSuccess') : t('psConsole.execFailed'));

  latestCommandResult.value = event;
  pushCommandLog(action, event.success ? "success" : "error", message, event.clientId);

  if (action === "analyzePsd" || action === "runtimeAnalyzePsd") {
    analysisResult.value = event.success && event.data ? event.data : null;
  }

  if (action === "debugProcess") {
    processResult.value = event.data || {
      success: event.success,
      message,
      error: event.error || null,
    };
  }

  const wasSilent = silentCommandIds.delete(event.commandId);
  if (!wasSilent) {
    (event.success ? ElMessage.success : ElMessage.error)(message);
  }
  // refreshRuntime 的实时结果由客户端 serviceRuntime 推送；此处再拉 HTTP 节点列表会把旧 busy 覆盖回来。
  if (action !== "refreshRuntime") {
    await refreshClients();
  }
  if (wasSilent && action === "refreshRuntime") {
    completeRuntimeBootstrap();
  }
};

const bootstrapPanelRuntime = async () => {
  const bootstrapDone = beginRuntimeBootstrap();
  try {
    await refreshClients();
    if (!selectedClient.value?.isOnline) {
      completeRuntimeBootstrap();
      return;
    }
    await syncSelectedClientRuntime({ silent: true });
    await bootstrapDone;
  } catch {
    completeRuntimeBootstrap();
  }
};

onMounted(async () => {
  websocketClient.events.on("serviceRuntime", handleServiceRuntime);
  websocketClient.events.on("serviceCommandResult", handleServiceCommandResult);
  await bootstrapPanelRuntime();
});

onActivated(() => {
  void bootstrapPanelRuntime();
});

onUnmounted(() => {
  websocketClient.events.off("serviceRuntime", handleServiceRuntime);
  websocketClient.events.off("serviceCommandResult", handleServiceCommandResult);
});
</script>

<style scoped lang="scss">
.ps-console {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ops-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.ops-header__title {
  font-size: 16px;
  font-weight: 600;
}

.ops-header__actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-start;
  align-items: center;
}

.tab-layout {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
}

.inline-status-group {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.inline-status {
  display: inline-flex;
  height: 26px;
  max-width: 100%;
  min-width: 0;
  padding: 0 8px;
  overflow: hidden;
  font-size: 11px;
  white-space: nowrap;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color);
  border-radius: 999px;
  align-items: center;
  gap: 6px;
}

.inline-status.is-success {
  color: #67c23a;
  border-color: rgb(103 194 58 / 28%);
}

.inline-status.is-warning {
  color: #f97316;
  border-color: rgb(249 115 22 / 28%);
}

.inline-status.is-danger {
  color: #f56c6c;
  border-color: rgb(245 108 108 / 28%);
}

.inline-status__dot {
  width: 8px;
  height: 8px;
  background: var(--el-text-color-secondary);
  border-radius: 999px;
}

.inline-status.is-success .inline-status__dot {
  background: #67c23a;
  box-shadow: 0 0 0 0 rgb(103 194 58 / 34%);
  animation: status-breath-success 1.8s infinite ease-in-out;
}

.inline-status.is-warning .inline-status__dot {
  background: #f97316;
  box-shadow: 0 0 0 0 rgb(249 115 22 / 34%);
  animation: status-breath-warning 1.8s infinite ease-in-out;
}

.inline-status.is-danger .inline-status__dot {
  background: #f56c6c;
  box-shadow: 0 0 0 0 rgb(245 108 108 / 34%);
  animation: status-breath-danger 1.8s infinite ease-in-out;
}

.inline-status__label {
  font-weight: 600;
  color: var(--el-text-color-primary);
  flex-shrink: 0;
}

.inline-status__text {
  min-width: 0;
  overflow: hidden;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.compact-info {
  display: flex;
  padding: 12px;
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
  flex-direction: column;
  gap: 8px;
}

.compact-info--grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.compact-info__item {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  gap: 10px;
  align-items: start;
}

.compact-info__item--full {
  grid-column: 1 / -1;
}

.compact-info__label {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.compact-info__value {
  font-size: 12px;
  line-height: 1.45;
  color: var(--el-text-color-primary);
  word-break: break-word;
}

.ops-sidebar,
.ops-main {
  min-width: 0;
}

.ops-main {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ops-panel {
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color);
  border-radius: 12px;
}

.ops-panel,
.ops-sidebar:deep(.external-sidebar) {
  padding: 10px;
}

.ops-sidebar:deep(.external-sidebar) {
  position: sticky;
  top: 0;
}

.ops-panel__head {
  display: flex;
  padding-bottom: 8px;
  margin-bottom: 10px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
}

.ops-panel__title {
  font-size: 14px;
  font-weight: 600;
}

.ops-panel__sub {
  margin-top: 2px;
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.ops-panel__actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-start;
}

.ops-panel__actions :deep(.el-button),
.button-row :deep(.el-button) {
  margin-left: 0;
}

.status-chip {
  display: inline-flex;
  height: 22px;
  max-width: 100%;
  min-width: 0;
  padding: 0 8px;
  overflow: hidden;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  border: 1px solid var(--el-border-color);
  border-radius: 999px;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.status-chip > span:last-child {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-chip__dot {
  width: 8px;
  height: 8px;
  background: #909399;
  border-radius: 999px;
}

.status-chip.is-success {
  color: #67c23a;
}

.status-chip.is-warning {
  color: #f97316;
}

.status-chip.is-danger {
  color: #f56c6c;
}

.status-chip.is-info {
  color: #909399;
}

.status-chip.is-success .status-chip__dot {
  background: #67c23a;
  box-shadow: 0 0 0 0 rgb(103 194 58 / 34%);
  animation: status-breath-success 1.8s infinite ease-in-out;
}

.status-chip.is-warning .status-chip__dot {
  background: #f97316;
  box-shadow: 0 0 0 0 rgb(249 115 22 / 34%);
  animation: status-breath-warning 1.8s infinite ease-in-out;
}

.status-chip.is-danger .status-chip__dot {
  background: #f56c6c;
  box-shadow: 0 0 0 0 rgb(245 108 108 / 34%);
  animation: status-breath-danger 1.8s infinite ease-in-out;
}

.ps-operation-dialog :deep(.el-dialog__header) {
  padding: 12px 14px 10px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.ps-operation-dialog :deep(.el-dialog) {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.ps-operation-dialog :deep(.el-dialog__body) {
  min-height: 0;
  padding: 0;
  overflow: hidden;
  background: var(--el-bg-color-page);
  flex: 1;
}

.operation-shell {
  display: flex;
  height: 100%;
  min-height: 0;
  padding: 10px 12px 12px;
  overflow: hidden;
  box-sizing: border-box;
  flex-direction: column;
}

.operation-tabs {
  display: flex;
  min-height: 0;
  overflow: hidden;
  flex: 1;
  flex-direction: column;
}

.operation-tabs:deep(.el-tabs__header) {
  order: 0;
  flex: 0 0 auto;
  margin: 0 0 8px;
}

.operation-tabs:deep(.el-tabs__content) {
  order: 1;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}

.operation-tabs:deep(.el-tab-pane) {
  height: 100%;
  overflow: auto;
}

.operation-grid {
  display: grid;
  grid-template-columns: minmax(520px, 1.4fr) minmax(320px, 0.8fr);
  gap: 12px;
  align-items: start;
}

.operation-grid--service {
  grid-template-columns: minmax(560px, 1.5fr) minmax(280px, 0.7fr);
  gap: 16px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.form-grid--service {
  grid-template-columns: minmax(0, 170px) minmax(0, 1fr);
  gap: 14px 16px;
  margin-bottom: 14px;
}

.form-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.field-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.field-block label {
  font-size: 12px;
  line-height: 1.4;
  color: var(--el-text-color-secondary);
}

.field-block--switch {
  align-self: end;
}

.field-block--switch :deep(.el-switch) {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  min-height: 40px;
}

.field-block--switch :deep(.el-switch__label) {
  line-height: 1.35;
  white-space: normal;
}

.field-block :deep(.el-input),
.field-block :deep(.el-input-number),
.field-block :deep(.el-select) {
  width: 100%;
}

.button-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.button-row.wrap {
  flex-wrap: wrap;
}

.button-row--analysis {
  margin-bottom: 8px;
}

.button-row--service-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.button-row--service-grid :deep(.el-button) {
  width: 100%;
  min-height: 36px;
  justify-content: center;
}

.subsection-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.subsection-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.smart-object-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.smart-object-card {
  padding: 12px;
  background: var(--el-fill-color-lighter);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
}

.smart-object-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.smart-object-card__title {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.analysis-preview-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 12px;
  margin-bottom: 12px;
}

.analysis-preview-card {
  display: flex;
  padding: 10px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
  flex-direction: column;
  gap: 10px;
}

.analysis-preview-card__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.analysis-preview-card__title {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.analysis-preview-card__meta {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.analysis-preview-stage {
  display: flex;
  min-height: 240px;
  padding: 12px;
  overflow: auto;
  border: 1px dashed var(--el-border-color);
  border-radius: 10px;
  align-items: center;
  justify-content: center;
}

.analysis-preview-artboard {
  position: relative;
  background:
    linear-gradient(to right, var(--el-fill-color-light) 1px, transparent 1px),
    linear-gradient(to bottom, var(--el-fill-color-light) 1px, transparent 1px);
  background-color: var(--el-bg-color);
  background-size: 16px 16px;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  flex: 0 0 auto;
}

.analysis-preview-object {
  position: absolute;
  display: flex;
  min-width: 18px;
  min-height: 18px;
  padding: 4px 6px;
  overflow: hidden;
  background: color-mix(in srgb, var(--el-color-primary) 10%, transparent);
  border: 1px solid var(--el-color-primary);
  border-radius: 8px;
  box-sizing: border-box;
  align-items: flex-start;
}

.analysis-preview-object__label {
  font-size: 10px;
  line-height: 1.2;
  color: var(--el-text-color-primary);
  word-break: break-word;
}

.analysis-preview-legend {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.analysis-preview-legend__item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  font-size: 11px;
}

.analysis-preview-legend__name {
  min-width: 0;
  font-weight: 500;
  color: var(--el-text-color-primary);
  word-break: break-word;
}

.analysis-preview-legend__meta {
  color: var(--el-text-color-secondary);
  text-align: right;
  white-space: nowrap;
}

.result {
  max-height: min(100%, calc(100vh - 260px));
  min-height: 220px;
  padding: 12px;
  margin: 0;
  overflow: auto;
  font-size: 12px;
  line-height: 1.6;
  color: var(--el-text-color-primary);
  word-break: break-word;
  white-space: pre-wrap;
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
  box-sizing: border-box;
}

.result--secondary {
  min-height: 160px;
  margin-top: 12px;
}

.log-list {
  display: flex;
  max-height: min(100%, calc(100vh - 260px));
  min-height: 220px;
  overflow: auto;
  flex-direction: column;
  gap: 8px;
}

.log-empty {
  padding: 32px 16px;
  color: var(--el-text-color-secondary);
  text-align: center;
  background: var(--el-bg-color);
  border: 1px dashed var(--el-border-color);
  border-radius: 10px;
}

.log-item {
  display: flex;
  padding: 10px 12px;
  background: var(--el-fill-color-lighter);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
  flex-direction: column;
  gap: 6px;
}

.log-item.is-success {
  border-color: rgb(103 194 58 / 26%);
}

.log-item.is-error {
  border-color: rgb(245 108 108 / 26%);
}

.log-item__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.log-item__message {
  font-size: 12px;
  line-height: 1.6;
  color: var(--el-text-color-primary);
  word-break: break-word;
  white-space: pre-wrap;
}

@keyframes status-breath-success {
  0%,
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgb(103 194 58 / 16%);
  }

  50% {
    transform: scale(1.04);
    box-shadow: 0 0 0 6px rgb(103 194 58 / 0%);
  }
}

@keyframes status-breath-warning {
  0%,
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgb(249 115 22 / 16%);
  }

  50% {
    transform: scale(1.04);
    box-shadow: 0 0 0 6px rgb(249 115 22 / 0%);
  }
}

@keyframes status-breath-danger {
  0%,
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgb(245 108 108 / 16%);
  }

  50% {
    transform: scale(1.04);
    box-shadow: 0 0 0 6px rgb(245 108 108 / 0%);
  }
}

@media (width <= 1024px) {
  .tab-layout,
  .compact-info--grid,
  .operation-grid,
  .form-grid {
    grid-template-columns: 1fr;
  }

  .ops-sidebar:deep(.external-sidebar) {
    position: static;
  }
}

@media (width <= 1280px) {
  .operation-grid--service {
    grid-template-columns: 1fr;
  }

  .form-grid--service {
    grid-template-columns: 1fr;
  }
}

@media (width <= 768px) {
  .ops-header,
  .ops-panel__head,
  .subsection-head,
  .smart-object-card__head,
  .log-item__meta {
    flex-direction: column;
    align-items: flex-start;
  }

  .ops-header__actions,
  .button-row {
    width: 100%;
  }

  .button-row--service-grid {
    grid-template-columns: 1fr;
  }

  .operation-shell {
    padding: 8px;
  }

  .analysis-preview-list {
    grid-template-columns: 1fr;
  }

  .analysis-preview-legend__item {
    flex-direction: column;
    gap: 4px;
  }

  .analysis-preview-legend__meta {
    text-align: left;
    white-space: normal;
  }
}
</style>
