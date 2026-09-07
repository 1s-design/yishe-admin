<template>
  <ContentWrap :plain="true">
    <ListPageLayout class="tts-page">
      <template #filter>
        <div class="list-page-filter list-page-filter--flat">
          <el-form :model="queryParams" label-position="top" class="list-page-search-form">
            <el-row :gutter="12" class="list-page-search-form__row">
              <el-col class="list-page-search-form__col--wide" :xs="24" :sm="12" :md="8" :lg="6">
                <el-form-item :label="t('common.search')">
                  <el-input v-model="queryParams.search" size="small" :placeholder="t('aiTts.searchPlaceholder')" clearable @keyup.enter="getList"
                    @clear="getList" />
                </el-form-item>
              </el-col>
            </el-row>
            <div class="list-page-search-form__actions">
              <el-button size="small" type="primary" :loading="loading" @click="getList">{{ t('common.search') }}</el-button>
              <el-button size="small" type="primary" :icon="Plus" @click="handleAdd">{{ t('aiTts.create') }}</el-button>
              <el-button size="small" type="danger" :icon="Delete" :disabled="selectedRows.length === 0"
                @click="handleBatchDelete">
                {{ t('aiTts.batchDeleteCount', { count: selectedRows.length }) }}
              </el-button>
            </div>
          </el-form>
        </div>
      </template>

      <template #table>
        <div class="list-page-panel list-page-panel--flat list-page-table-panel list-page-table-panel--flat">
          <div class="list-page-table-panel__body">
            <div class="content-container">
              <div class="table-section">
                <div class="common-table">
            <vxe-grid v-bind="gridOptions" :data="dataSource" :loading="loading" @checkbox-change="handleCheckboxChange"
              @checkbox-all="handleCheckboxAll">
              <template #textSlot="{ row }">
                <el-tooltip v-if="row.text" :content="row.text" placement="top" effect="dark" raw-content
                  popper-class="copy-tooltip">
                  <div class="clamp-3">{{ row.text }}</div>
                </el-tooltip>
                <span v-else>-</span>
              </template>
              <template #configSlot="{ row }">
                <div class="config-cell">{{ formatConfig(row.configParams) }}</div>
              </template>
              <template #subtitleSlot="{ row }">
                <div v-if="row.subtitle" class="subtitle-column-wrapper">
                  <div class="subtitle-list-container">
                    <ul class="subtitle-list">
                      <li v-for="s in row.subtitle.sentences" :key="s.index">
                        <span class="subtitle-time">[{{ formatDuration(s.start) }}~{{ formatDuration(s.end) }}s]（{{
                          formatDuration(s.duration) }}s）</span>
                        <span class="subtitle-text"> {{ s.text }}</span>
                      </li>
                    </ul>
                  </div>
                </div>
                <div v-else>{{ t('aiTts.noSubtitle') }}</div>
              </template>
              <template #previewSlot="{ row }">
                <audio v-if="row.resultUrl" :src="row.resultUrl" controls preload="none" class="audio-preview" />
                <span v-else>-</span>
              </template>
              <template #operationSlot="{ row }">
                <el-dropdown
                  class="operation-dropdown"
                  placement="bottom-end"
                  @command="(cmd) => handleOperation(row, String(cmd))"
                >
                  <el-button type="primary" link size="small" class="operation-trigger-button">{{ t('common.operation') }}</el-button>
                  <template #dropdown>
                    <el-dropdown-menu class="operation-menu-compact">
                      <el-dropdown-item command="preview">{{ t('aiTts.previewSubtitle') }}</el-dropdown-item>
                      <el-dropdown-item command="metadata">{{ t('aiTts.viewSubtitleMetadata') }}</el-dropdown-item>
                      <el-dropdown-item command="copyParams">{{ t('aiTts.copyParams') }}</el-dropdown-item>
                      <el-dropdown-item command="delete" class="operation-menu-item--danger">{{ t('common.delete') }}</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </template>
            </vxe-grid>
                </div>
              </div>

              <!-- 字幕预览弹窗组件 -->
              <SubtitlePreview v-model="previewDialogVisible" :row="previewRow" />

              <!-- 字幕元数据弹窗 -->
              <el-dialog v-model="metadataDialogVisible" :title="t('aiTts.subtitleMetadata')" width="800px" :destroy-on-close="true">
                <div class="metadata-container">
                  <pre class="metadata-pre">{{ JSON.stringify(metadataContent, null, 2) }}</pre>
                </div>
                <template #footer>
                  <el-button type="primary" @click="copyMetadata">{{ t('aiTts.copyJson') }}</el-button>
                  <el-button @click="metadataDialogVisible = false">{{ t('common.close') }}</el-button>
                </template>
              </el-dialog>
            </div>
          </div>
        </div>
      </template>

      <template #pagination>
        <div class="list-page-panel list-page-panel--flat list-page-table-panel__pagination list-page-table-panel__pagination--flat pagination-section">
          <Pagination :total="total" v-model:page="queryParams.page" v-model:limit="queryParams.pageSize"
            @pagination="getList" />
        </div>
      </template>

    </ListPageLayout>
    <el-dialog v-model="dialogVisible" :title="dialogTitle" fullscreen class="tts-create-dialog"
      :destroy-on-close="true">
      <div class="tts-create-body">
        <el-form ref="formRef" :model="form" :rules="rules" label-width="96px">
          <el-form-item :label="t('aiTts.text')" prop="text">
            <el-input v-model="form.text" type="textarea" :rows="6" maxlength="1000" show-word-limit />
          </el-form-item>

          <el-form-item v-if="isInstructModel" :label="t('aiTts.instructionTemplate')">
            <el-select v-model="selectedInstructionTemplate" class="w-full" :placeholder="t('aiTts.instructionTemplatePlaceholder')"
              @change="applyInstructionTemplate">
              <el-option v-for="item in instructionTemplates" :key="item.labelKey" :label="t(item.labelKey)"
                :value="item.value" />
            </el-select>
          </el-form-item>

          <el-form-item v-if="isInstructModel" :label="t('aiTts.instructionControl')" prop="instructions">
            <el-input v-model="form.instructions" type="textarea" :rows="5" maxlength="1600" show-word-limit
              :placeholder="t('aiTts.instructionPlaceholder')" />
            <div class="instruction-tip">
              {{ t('aiTts.instructionTip') }}
            </div>
          </el-form-item>

          <!-- 声音复刻模型的音色选择 -->
          <el-form-item v-if="isVoiceCloneModel" :label="t('aiTts.voiceSource')" required>
            <el-radio-group v-model="voiceSource">
              <el-radio value="existing">{{ t('aiTts.voiceSourceExisting') }}</el-radio>
              <el-radio value="material">{{ t('aiTts.voiceSourceMaterial') }}</el-radio>
            </el-radio-group>
          </el-form-item>

          <!-- 选择已有音色 -->
          <el-form-item v-if="isVoiceCloneModel && voiceSource === 'existing'" :label="t('aiTts.selectVoice')" required>
            <div class="voice-list-container">
              <div class="voice-list-header">
                <span>{{ t('aiTts.createdVoiceList') }}</span>
                <el-button :icon="Refresh" size="small" :loading="loadingVoices" @click="loadCustomVoices">
                  {{ t('common.refresh') }}
                </el-button>
              </div>
              <el-select v-model="form.voice" class="w-full" :placeholder="t('aiTts.selectVoicePlaceholder')" :loading="loadingVoices" clearable
                @change="handleVoiceSelect" @clear="customVoiceInfo = null">
                <el-option v-for="item in customVoiceList" :key="item.voice"
                  :label="`${formatVoiceName(item)} (${new Date(item.gmt_create).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })})`"
                  :value="item.voice">
                  <div class="voice-option">
                    <span :title="item.voice">{{ formatVoiceName(item) }}</span>
                    <el-button :icon="Delete" size="small" type="danger" text
                      @click.stop="handleDeleteVoice(item.voice)" />
                  </div>
                </el-option>
              </el-select>
              <div v-if="customVoiceList.length === 0 && !loadingVoices" class="voice-empty">
                {{ t('aiTts.noCreatedVoice') }}
              </div>
            </div>
          </el-form-item>

          <!-- 从文件资源创建音色 -->
          <el-form-item v-if="isVoiceCloneModel && voiceSource === 'material'" :label="t('aiTts.voiceName')">
            <el-input v-model="customVoiceName" :placeholder="t('aiTts.voiceNamePlaceholder')" :disabled="uploadingAudio" clearable
              maxlength="32" show-word-limit />
            <div class="voice-name-tip">
              {{ t('aiTts.voiceNameTip') }}
            </div>
          </el-form-item>

          <el-form-item v-if="isVoiceCloneModel && voiceSource === 'material'" :label="t('aiTts.audioMaterial')" required>
            <div class="voice-list-container">
              <div class="file-resource-toolbar">
                <el-input v-model="fileResourceKeyword" :placeholder="t('aiTts.searchMaterialPlaceholder')" clearable
                  @keyup.enter="loadFileResourceAudios" />
                <el-button :loading="loadingFileResources" @click="loadFileResourceAudios">{{ t('common.query') }}</el-button>
              </div>

              <el-select v-model="selectedFileResourceId" class="w-full" :placeholder="t('aiTts.selectAudioMaterialPlaceholder')"
                :loading="loadingFileResources" clearable>
                <el-option v-for="item in fileResourceAudios" :key="item.id"
                  :label="`${item.name || t('aiTts.unnamed')} (${(item.suffix || '').toLowerCase()})`" :value="item.id" />
              </el-select>

              <div class="file-resource-actions">
                <el-button type="primary" :loading="uploadingAudio" @click="handleCreateVoiceFromMaterial">
                  {{ t('aiTts.createVoiceFromMaterial') }}
                </el-button>
              </div>

              <audio v-if="selectedFileResource?.url" :src="selectedFileResource.url" controls preload="none"
                class="audio-preview" />
            </div>
            <div v-if="customVoiceInfo" class="voice-info">
              <el-alert type="success" :closable="false">
                <template #title>
                  <span>{{ t('aiTts.createdVoiceWithName', { name: customVoiceInfo.preferredName }) }}</span>
                </template>
              </el-alert>
            </div>
            <div v-if="!customVoiceInfo && form.model === 'qwen3-tts-vc-2026-01-22'" class="voice-tip">
              {{ t('aiTts.voiceCloneTip') }}
            </div>
          </el-form-item>

          <el-row :gutter="16">
            <el-col :xs="24" :md="12">
              <el-form-item v-if="!isVoiceCloneModel" :label="t('aiTts.voice')" prop="voice">
                <el-select v-model="form.voice" class="w-full">
                  <el-option :label="t('aiTts.voiceCherry')"
                    value="Cherry" />
                  <el-option :label="t('aiTts.voiceSerena')"
                    value="Serena" />
                  <el-option
                    :label="t('aiTts.voiceEthan')"
                    value="Ethan" />
                  <el-option :label="t('aiTts.voiceChelsie')"
                    value="Chelsie" />
                  <el-option :label="t('aiTts.voiceMomo')"
                    value="Momo" />
                  <el-option :label="t('aiTts.voiceVivian')"
                    value="Vivian" />
                  <el-option :label="t('aiTts.voiceMoon')"
                    value="Moon" />
                  <el-option :label="t('aiTts.voiceMaia')"
                    value="Maia" />
                  <el-option :label="t('aiTts.voiceKai')"
                    value="Kai" />
                  <el-option :label="t('aiTts.voiceNofish')"
                    value="Nofish" />
                  <el-option :label="t('aiTts.voiceBella')"
                    value="Bella" />
                  <el-option
                    :label="t('aiTts.voiceJennifer')"
                    value="Jennifer" />
                  <el-option :label="t('aiTts.voiceRyan')"
                    value="Ryan" />
                  <el-option :label="t('aiTts.voiceKaterina')"
                    value="Katerina" />
                  <el-option :label="t('aiTts.voiceAiden')"
                    value="Aiden" />
                  <el-option
                    :label="t('aiTts.voiceEldricSage')"
                    value="Eldric Sage" />
                  <el-option :label="t('aiTts.voiceMia')"
                    value="Mia" />
                  <el-option
                    :label="t('aiTts.voiceMochi')"
                    value="Mochi" />
                  <el-option
                    :label="t('aiTts.voiceBellona')"
                    value="Bellona" />
                  <el-option
                    :label="t('aiTts.voiceVincent')"
                    value="Vincent" />
                  <el-option :label="t('aiTts.voiceBunny')"
                    value="Bunny" />
                  <el-option
                    :label="t('aiTts.voiceNeil')"
                    value="Neil" />
                  <el-option
                    :label="t('aiTts.voiceElias')"
                    value="Elias" />
                  <el-option
                    :label="t('aiTts.voiceArthur')"
                    value="Arthur" />
                  <el-option
                    :label="t('aiTts.voiceNini')"
                    value="Nini" />
                  <el-option
                    :label="t('aiTts.voiceEbona')"
                    value="Ebona" />
                  <el-option
                    :label="t('aiTts.voiceSeren')"
                    value="Seren" />
                  <el-option
                    :label="t('aiTts.voicePip')"
                    value="Pip" />
                  <el-option
                    :label="t('aiTts.voiceStella')"
                    value="Stella" />
                  <el-option :label="t('aiTts.voiceBodega')"
                    value="Bodega" />
                  <el-option :label="t('aiTts.voiceSonrisa')"
                    value="Sonrisa" />
                  <el-option
                    :label="t('aiTts.voiceAlek')"
                    value="Alek" />
                  <el-option :label="t('aiTts.voiceDolce')"
                    value="Dolce" />
                  <el-option :label="t('aiTts.voiceSohee')"
                    value="Sohee" />
                  <el-option :label="t('aiTts.voiceOnoAnna')"
                    value="Ono Anna" />
                  <el-option
                    :label="t('aiTts.voiceLenn')"
                    value="Lenn" />
                  <el-option :label="t('aiTts.voiceEmilien')"
                    value="Emilien" />
                  <el-option :label="t('aiTts.voiceAndre')"
                    value="Andre" />
                  <el-option
                    :label="t('aiTts.voiceRadioGol')"
                    value="Radio Gol" />
                  <el-option :label="t('aiTts.voiceJada')"
                    value="Jada" />
                  <el-option :label="t('aiTts.voiceDylan')"
                    value="Dylan" />
                  <el-option :label="t('aiTts.voiceLi')"
                    value="Li" />
                  <el-option
                    :label="t('aiTts.voiceMarcus')"
                    value="Marcus" />
                  <el-option
                    :label="t('aiTts.voiceRoy')"
                    value="Roy" />
                  <el-option :label="t('aiTts.voicePeter')"
                    value="Peter" />
                  <el-option :label="t('aiTts.voiceSunny')"
                    value="Sunny" />
                  <el-option :label="t('aiTts.voiceEric')"
                    value="Eric" />
                  <el-option :label="t('aiTts.voiceRocky')"
                    value="Rocky" />
                  <el-option :label="t('aiTts.voiceKiki')"
                    value="Kiki" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :xs="24" :md="12">
              <el-form-item :label="t('aiTts.model')" prop="model">
                <el-select v-model="form.model" class="w-full">
                  <el-option :label="t('aiTts.modelFlash')" value="qwen3-tts-flash" />
                  <el-option :label="t('aiTts.modelInstruct')" value="qwen3-tts-instruct-flash" />
                  <el-option :label="t('aiTts.modelVoiceClone')" value="qwen3-tts-vc-2026-01-22" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="16">
            <el-col :xs="24" :md="8">
              <el-form-item :label="t('aiTts.format')" prop="format">
                <el-select v-model="form.format" class="w-full">
                  <el-option label="mp3" value="mp3" />
                  <el-option label="wav" value="wav" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :xs="24" :md="8">
              <el-form-item :label="t('aiTts.speed')" prop="speed">
                <el-input-number v-model="form.speed" :min="0.5" :max="2" :step="0.1" class="w-full" />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :md="8">
              <el-form-item :label="t('aiTts.pitch')" prop="pitch">
                <el-input-number v-model="form.pitch" :min="0.5" :max="2" :step="0.1" class="w-full" />
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
      </div>

      <template #footer>
        <el-button @click="dialogVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button @click="copyCreateParams">{{ t('aiTts.copyParams') }}</el-button>
        <el-button type="primary" :loading="submitLoading" :disabled="uploadingAudio"
          @click="submitForm">{{ t('aiTts.createAndGenerate') }}</el-button>
      </template>
    </el-dialog>
  </ContentWrap>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch, watchEffect, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Delete, Refresh } from '@element-plus/icons-vue'
import {
  batchDeleteTtsRecord,
  createCustomVoice,
  createTtsRecord,
  deleteTtsRecord,
  getTtsRecordPage,
  listCustomVoices,
  deleteCustomVoice
} from '@/api/ai/tts'
import { getFileResourceList } from '@/api/file-resource'
import { buildOperationColumn, commonGridOptions } from '@/common/table'
import { useI18n } from '@/hooks/web/useI18n'
import { useWindowSize } from '@vueuse/core'
import ContentWrap from '@/components/ContentWrap/src/ContentWrap.vue'
import ListPageLayout from '@/components/ListPageLayout/index.vue'
import Pagination from '@/components/Pagination/index.vue'
import SubtitlePreview from './SubtitlePreview.vue'

const { t } = useI18n()

const formatDuration = (val: any) => {
  if (val === undefined || val === null || val === '') return '-'
  const num = parseFloat(val)
  if (isNaN(num)) return val
  return num.toFixed(2)
}

const loading = ref(false)
const submitLoading = ref(false)
const dialogVisible = ref(false)
const dialogTitle = ref('')
const total = ref(0)
const dataSource = ref<any[]>([])
const formRef = ref()
const selectedRows = ref<any[]>([]) // 多选行

// 字幕预览相关
const previewDialogVisible = ref(false)
const previewRow = ref<any | null>(null)

const openSubtitlePreview = (row: any) => {
  previewRow.value = row
  previewDialogVisible.value = true
}

const handleOperation = (row: any, cmd: string) => {
  if (cmd === 'preview') {
    openSubtitlePreview(row)
    return
  }
  if (cmd === 'metadata') {
    openMetadataDialog(row)
    return
  }
  if (cmd === 'copyParams') {
    copyRecordParams(row)
    return
  }
  if (cmd === 'delete') {
    handleDelete(row)
    return
  }
}

const metadataDialogVisible = ref(false)
const metadataContent = ref<any>(null)

const openMetadataDialog = (row: any) => {
  metadataContent.value = row.subtitle || {}
  metadataDialogVisible.value = true
}

const copyMetadata = () => {
  const text = JSON.stringify(metadataContent.value, null, 2)
  navigator.clipboard.writeText(text).then(() => {
    ElMessage.success(t('aiTts.copiedToClipboard'))
  })
}

// 复制用于创建语音的参数（从表单）
const composeCreateParams = () => {
  const payload: any = {
    text: form.text,
    voice: form.voice,
    model: form.model,
    format: form.format,
    instructions: form.instructions,
    sample_rate: form.sample_rate,
    speed: form.speed,
    pitch: form.pitch
  }

  // 如果是声音复刻并且使用从素材创建的自定义音色，确保使用已创建的 voice
  if (form.model === 'qwen3-tts-vc-2026-01-22') {
    if (voiceSource.value === 'material' && customVoiceInfo.value) {
      payload.voice = customVoiceInfo.value.voice
    }
  }

  return payload
}

const copyCreateParams = async () => {
  try {
    const text = JSON.stringify(composeCreateParams(), null, 2)
    await navigator.clipboard.writeText(text)
    ElMessage.success(t('aiTts.createParamsCopied'))
  } catch (err: any) {
    ElMessage.error(err?.message || t('aiTts.copyFailed'))
  }
}

// 复制已有记录的参数
const copyRecordParams = async (row: any) => {
  try {
    const params = row?.configParams || {
      text: row.text,
      voice: row.voice || row?.configParams?.voice || '',
      model: row.configParams?.model || row.model || '',
      format: row.configParams?.format || row.format || '',
      instructions: row.configParams?.instructions || '' ,
      sample_rate: row.configParams?.sample_rate || row.sample_rate || 24000,
      speed: row.configParams?.speed ?? row.speed ?? 1,
      pitch: row.configParams?.pitch ?? row.pitch ?? 1
    }

    await navigator.clipboard.writeText(JSON.stringify(params, null, 2))
    ElMessage.success(t('aiTts.recordParamsCopied'))
  } catch (err: any) {
    ElMessage.error(err?.message || t('aiTts.copyFailed'))
  }
}

const queryParams = reactive({
  page: 1,
  pageSize: 20,
  search: ''
})

const { height } = useWindowSize()
const gridOptions = ref<any>({
  ...commonGridOptions,
  maxHeight: Math.max(height.value - 280, 360),
  columns: [
    { type: 'checkbox', width: 50 },
    { type: 'seq', title: '#', width: 58 },
    { title: t('aiTts.text'), field: 'text', minWidth: 220, slots: { default: 'textSlot' } },
    { title: t('aiTts.configParams'), field: 'configParams', minWidth: 260, slots: { default: 'configSlot' } },
    { title: t('aiTts.preview'), field: 'preview', width: 320, slots: { default: 'previewSlot' } },
    { title: t('aiTts.durationSec'), field: 'duration', width: 96, formatter: ({ cellValue }) => formatDuration(cellValue) },
    { title: t('common.createTime'), field: 'createTime', width: 170 },
    buildOperationColumn('operationSlot')
  ]
})

watchEffect(() => {
  gridOptions.value.maxHeight = Math.max(height.value - 280, 360);
})

const form = reactive({
  id: '',
  text: '',
  voice: 'Cherry',
  model: 'qwen3-tts-flash',
  format: 'mp3',
  instructions: '',
  sample_rate: 24000,
  speed: 1,
  pitch: 1
})

const selectedInstructionTemplate = ref('')
const customVoiceInfo = ref<any>(null)
const uploadingAudio = ref(false)
const voiceSource = ref<'existing' | 'material'>('existing') // 音色来源：existing=选择已有，material=从素材创建
const customVoiceName = ref('') // 用户输入的音色名称
const customVoiceList = ref<any[]>([]) // 已创建的音色列表
const loadingVoices = ref(false) // 加载音色列表中
const fileResourceKeyword = ref('')
const fileResourceAudios = ref<any[]>([])
const selectedFileResourceId = ref('')
const loadingFileResources = ref(false)

const selectedFileResource = computed(() => {
  return fileResourceAudios.value.find((item) => item.id === selectedFileResourceId.value)
})

const audioSuffixSet = new Set(['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac', 'amr', 'opus'])

const resolveAudioMimeType = (suffix?: string) => {
  const normalized = (suffix || '').toLowerCase()
  const map: Record<string, string> = {
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    m4a: 'audio/mp4',
    aac: 'audio/aac',
    ogg: 'audio/ogg',
    flac: 'audio/flac',
    amr: 'audio/amr',
    opus: 'audio/opus'
  }
  return map[normalized] || 'audio/mpeg'
}

const sanitizePreferredName = (value: string) => {
  return value
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/^[0-9_-]+/, '')
    .substring(0, 32)
}

// 格式化音色显示名称
const formatVoiceName = (item: any) => {
 return item.voice
}

const instructionTemplates = [
  {
    labelKey: 'aiTts.instructStandardBroadcast',
    value: '标准播音风格：吐字清晰精准，字正腔圆，语速中等，语调稳健。'
  },
  {
    labelKey: 'aiTts.instructAdVoiceover',
    value: '广告配音风格：音调偏高，语速中等偏快，充满活力和感染力，强调卖点。'
  },
  {
    labelKey: 'aiTts.instructGentleHealing',
    value: '温柔治愈风格：语速偏慢，音调柔和甜美，语气温暖关怀，像贴心朋友。'
  },
  {
    labelKey: 'aiTts.instructNewsBroadcast',
    value: '新闻播报风格：语速中等偏快，吐字清晰，语调平稳，客观冷静。'
  },
  {
    labelKey: 'aiTts.instructDocumentary',
    value: '纪录片解说：语速中等，音色浑厚，语调沉稳，叙事感强。'
  },
  {
    labelKey: 'aiTts.instructAudiobook',
    value: '有声书朗读：语速中等偏慢，情感细腻，停顿自然，带叙事节奏。'
  },
  {
    labelKey: 'aiTts.instructGameCharacter',
    value: '游戏角色配音：语调起伏明显，情绪鲜明，节奏感强，角色感突出。'
  },
  {
    labelKey: 'aiTts.instructEmotionProgression',
    value: '情绪递进效果：从平静叙述逐渐增强情绪，音量上扬，语速略快。'
  },
  {
    labelKey: 'aiTts.instructDeepMagnetic',
    value: '低沉磁性：音调偏低，语速中等，音色有磁性，沉稳有力。'
  },
  {
    labelKey: 'aiTts.instructCrispSweet',
    value: '清脆甜美：音调偏高，语速偏快，语气轻快俏皮，活泼明亮。'
  },
  {
    labelKey: 'aiTts.instructRationalTeaching',
    value: '理性教学风格：语速中等，吐字清楚，逻辑感强，节奏有条理。'
  },
  {
    labelKey: 'aiTts.instructHighEnergy',
    value: '高能发布：语速偏快，语调上扬，节奏紧凑，情绪饱满。'
  },
  {
    labelKey: 'aiTts.instructCalmMeditation',
    value: '舒缓冥想：语速慢，音调平稳，语气柔和放松，适合引导与放松。'
  }
]

const isInstructModel = computed(() => form.model === 'qwen3-tts-instruct-flash')
const isVoiceCloneModel = computed(() => form.model === 'qwen3-tts-vc-2026-01-22')

watch(
  () => form.model,
  (model) => {
    if (model !== 'qwen3-tts-instruct-flash') {
      form.instructions = ''
      selectedInstructionTemplate.value = ''
    }
    if (model !== 'qwen3-tts-vc-2026-01-22') {
      customVoiceInfo.value = null
      voiceSource.value = 'existing'
      // 切换到其他模型时，恢复默认音色
      if (!form.voice || form.voice.startsWith('qwen-tts-vc-')) {
        form.voice = 'Cherry'
      }
    } else {
      // 切换到声音复刻模型时，清空音色选择
      form.voice = ''
      customVoiceInfo.value = null
      // 加载音色列表
      if (dialogVisible.value) {
        loadCustomVoices()
        loadFileResourceAudios()
      }
    }
  }
)

// 监听音色来源变化，清空相关状态
watch(
  () => voiceSource.value,
  () => {
    form.voice = ''
    customVoiceInfo.value = null
    customVoiceName.value = ''
    selectedFileResourceId.value = ''
  }
)

const rules = {
  text: [{ required: true, message: t('aiTts.textRequired'), trigger: 'blur' }],
  voice: [{ required: true, message: t('aiTts.selectVoicePlaceholder'), trigger: 'change' }],
  model: [{ required: true, message: t('aiTts.selectModelRequired'), trigger: 'change' }]
}

const resetForm = () => {
  form.id = ''
  form.text = ''
  form.voice = 'Cherry'
  form.model = 'qwen3-tts-flash'
  form.format = 'mp3'
  form.instructions = ''
  selectedInstructionTemplate.value = ''
  customVoiceInfo.value = null
  customVoiceName.value = ''
  voiceSource.value = 'existing'
  fileResourceKeyword.value = ''
  fileResourceAudios.value = []
  selectedFileResourceId.value = ''
  form.sample_rate = 24000
  form.speed = 1
  form.pitch = 1
}

// 加载自定义音色列表
const loadCustomVoices = async () => {
  if (loadingVoices.value) return

  loadingVoices.value = true
  try {
    const res = await listCustomVoices({ pageIndex: 0, pageSize: 100 })
    const payload = res?.data ?? res
    customVoiceList.value = payload?.voices || []
    if (customVoiceList.value.length > 0) {
      console.log('成功加载音色列表，共', customVoiceList.value.length, '个音色')
    }
  } catch (error: any) {
    console.error('loadCustomVoices error:', error)
    ElMessage.error(error?.message || t('aiTts.loadVoicesFailed'))
  } finally {
    loadingVoices.value = false
  }
}

// 选择音色
const handleVoiceSelect = (voice: string) => {
  const selectedVoice = customVoiceList.value.find(v => v.voice === voice)
  if (selectedVoice) {
    customVoiceInfo.value = {
      voice: selectedVoice.voice,
      preferredName: formatVoiceName(selectedVoice),
      targetModel: selectedVoice.target_model
    }
  }
}

// 删除自定义音色
const handleDeleteVoice = async (voice: string) => {
  try {
    await ElMessageBox.confirm(t('aiTts.confirmDeleteVoice'), t('aiTts.deleteConfirm'), {
      confirmButtonText: t('common.confirm'),
      cancelButtonText: t('common.cancel'),
      type: 'warning'
    })

    await deleteCustomVoice(voice)
    ElMessage.success(t('aiTts.voiceDeleted'))

    // 如果删除的是当前选中的音色，清空选择
    if (form.voice === voice) {
      form.voice = ''
      customVoiceInfo.value = null
    }

    // 刷新列表
    await loadCustomVoices()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error?.message || t('aiTts.deleteVoiceFailed'))
    }
  }
}

const loadFileResourceAudios = async () => {
  if (loadingFileResources.value) return
  loadingFileResources.value = true
  try {
    const res = await getFileResourceList({
      currentPage: 1,
      pageSize: 200,
      keyword: fileResourceKeyword.value || undefined,
      isDeleted: false
    })
    const payload = res?.data ?? res
    const list = payload?.list || []
    fileResourceAudios.value = list.filter((item) => audioSuffixSet.has(String(item?.suffix || '').toLowerCase()))
  } catch (error: any) {
    ElMessage.error(error?.message || t('aiTts.queryMaterialFailed'))
  } finally {
    loadingFileResources.value = false
  }
}

const handleCreateVoiceFromMaterial = async () => {
  if (!selectedFileResource.value?.url) {
    ElMessage.warning(t('aiTts.selectAudioMaterialFirst'))
    return
  }

  let preferredName = sanitizePreferredName(customVoiceName.value.trim())
  if (!preferredName) {
    preferredName = sanitizePreferredName(selectedFileResource.value.name || '') || `custom_voice_${Date.now()}`
  }

  uploadingAudio.value = true
  try {
    const res = await createCustomVoice({
      audioUrl: selectedFileResource.value.url,
      targetModel: 'qwen3-tts-vc-2026-01-22',
      preferredName,
      audioMimeType: resolveAudioMimeType(selectedFileResource.value.suffix)
    })

    const payload = res?.data ?? res
    if (payload?.success && payload?.voice) {
      customVoiceInfo.value = {
        voice: payload.voice,
        preferredName: payload.preferredName,
        targetModel: payload.targetModel
      }
      form.voice = payload.voice
      customVoiceName.value = ''
      ElMessage.success(t('aiTts.customVoiceCreated', { name: payload.preferredName }))
      await loadCustomVoices()
    } else {
      throw new Error(t('aiTts.createVoiceFailed'))
    }
  } catch (error: any) {
    ElMessage.error(error?.message || t('aiTts.createCustomVoiceFailed'))
    customVoiceInfo.value = null
  } finally {
    uploadingAudio.value = false
  }
}

const applyInstructionTemplate = (value: string) => {
  if (!value) return
  form.instructions = value
}

const formatConfig = (configParams: any) => {
  if (!configParams) return '-'
  const instructions = configParams.instructions
    ? truncateText(String(configParams.instructions), 60)
    : ''
  const parts = [
    `voice:${configParams.voice || '-'}`,
    `model:${configParams.model || '-'}`,
    `format:${configParams.format || '-'}`,
    `speed:${configParams.speed ?? '-'}`,
    `pitch:${configParams.pitch ?? '-'}`
  ]
  if (instructions) {
    parts.push(`instructions:${instructions}`)
  }
  return parts.join(' | ')
}

const truncateText = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength)}...`
}

const getList = async () => {
  loading.value = true
  try {
    const res = await getTtsRecordPage({
      page: queryParams.page,
      pageSize: queryParams.pageSize,
      search: queryParams.search
    })
    const payload = res?.data ?? res
    dataSource.value = payload?.list || []
    total.value = payload?.total || 0
  } finally {
    loading.value = false
  }
}

const handleAdd = () => {
  dialogTitle.value = t('aiTts.createVoice')
  resetForm()
  dialogVisible.value = true
  // 默认加载音色列表（声音复刻模型可能用到）
  loadCustomVoices()
  loadFileResourceAudios()
}

const submitForm = async () => {
  await formRef.value?.validate()

  // 如果是声音复刻模型，检查音色
  if (form.model === 'qwen3-tts-vc-2026-01-22') {
    if (voiceSource.value === 'existing' && !form.voice) {
      ElMessage.warning(t('aiTts.selectExistingVoice'))
      return
    }
    if (voiceSource.value === 'material' && !customVoiceInfo.value) {
      ElMessage.warning(t('aiTts.createVoiceFromMaterialFirst'))
      return
    }
  }

  submitLoading.value = true
  try {
    const res = await createTtsRecord({
      text: form.text,
      voice: form.voice,
      model: form.model,
      format: form.format,
      instructions: form.instructions,
      sample_rate: form.sample_rate,
      speed: form.speed,
      pitch: form.pitch
    })
    const payload = res?.data ?? res

    if (payload?.status === 'failed') {
      ElMessage.warning(t('aiTts.generatedFailedWithError', { message: payload?.errorMessage || t('aiTts.unknownError') }))
    } else {
      ElMessage.success(t('aiTts.createAndGenerateSuccess'))
    }

    dialogVisible.value = false
    await getList()
  } finally {
    submitLoading.value = false
  }
}

const handleDelete = async (row: any) => {
  await ElMessageBox.confirm(t('aiTts.confirmDeleteRecord'), t('common.tip'), { type: 'warning' })
  await deleteTtsRecord(row.id)
  ElMessage.success(t('common.deleteSuccess'))
  await getList()
}

// 多选change事件
const handleCheckboxChange = ({ records }: any) => {
  selectedRows.value = records
}

// 全选change事件
const handleCheckboxAll = ({ records }: any) => {
  selectedRows.value = records
}

// 批量删除
const handleBatchDelete = async () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning(t('aiTts.selectDeleteRecord'))
    return
  }

  try {
    await ElMessageBox.confirm(t('aiTts.confirmBatchDelete', { count: selectedRows.value.length }), t('aiTts.batchDeleteConfirm'), {
      confirmButtonText: t('common.confirm'),
      cancelButtonText: t('common.cancel'),
      type: 'warning'
    })

    loading.value = true
    await batchDeleteTtsRecord(selectedRows.value.map(row => row.id))

    ElMessage.success(t('aiTts.batchDeleteSuccess', { count: selectedRows.value.length }))
    selectedRows.value = []
    await getList()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error?.message || t('aiTts.batchDeleteFailed'))
    }
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  getList()
})
</script>

<style scoped>


@media (width <= 900px) {
  .search-form-container {
    grid-template-columns: 1fr;
    grid-auto-flow: row;
    gap: 8px;
  }

  .search-label {
    width: auto;
    padding-right: 0;
    text-align: left;
  }

  .search-field-actions {
    justify-content: flex-start;
  }

  .search-actions {
    justify-content: flex-start;
  }
}

@media (width <= 768px) {
  .tts-create-body {
    height: calc(100vh - 116px);
    padding: 16px;
  }
}

.tts-page {
  height: 100%;
  padding: 8px 0 0;
  background-color: transparent;
}

.tts-page.list-page-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0;
}

.filter-section {
  margin: 0;
  margin-bottom: 12px;
  flex-shrink: 0;
}

.tts-page :deep(.list-page-layout__main) {
  gap: 10px;
}

.tts-page :deep(.list-page-filter--flat) {
  gap: 10px;
  padding-bottom: 10px;
}

.table-section {
  flex: 1;
  min-height: 0;
}

.pagination-section {
  display: flex;
  justify-content: flex-end;
  flex-shrink: 0;
  margin-top: 0;
  margin-bottom: 0;
}

.content-container {
  padding: 0;
}

.search-bar {
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
}

  .search-form-container {
    display: grid;
    width: 100%;
    margin-bottom: 12px;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 12px;
  }

  .search-field {
    display: flex;
    width: 100%;
    min-height: 32px;
    align-items: center;
    gap: 8px;
  }

  .search-field-wide {
    width: 100%;
    max-width: 640px;
  }

  .search-field-actions {
    display: flex;
    justify-content: flex-start;
    align-items: center;
    width: 100%;
  }

.search-field-actions .search-label {
  display: none;
}

  .search-label {
    width: 96px;
    min-width: 64px;
    padding-right: 8px;
    font-size: 13px;
    line-height: 32px;
    color: var(--el-text-color-regular);
    text-align: right;
    flex-shrink: 0;
  }

  .search-field> :not(.search-label) {
    max-width: 100%;
    min-width: 0;
    flex: 1;
  }

.search-field .el-input,
.search-field .el-select {
  width: 100%;
}

.search-field .el-button {
  white-space: nowrap;
}

  .search-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-start;
    gap: 6px;
    align-items: center;
  }


.audio-preview {
  width: 300px;
  height: 28px;
}

.clamp-3 {
  display: -webkit-box;
  overflow: hidden;
  word-break: break-all;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
}

.config-cell {
  line-height: 1.4;
  word-break: break-all;
  white-space: normal;
}

.instruction-tip {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-regular);
}

.voice-name-tip {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--el-text-color-secondary);
}

.tts-create-dialog :deep(.el-dialog__body) {
  padding: 0;
}

.tts-create-body {
  height: calc(100vh - 124px);
  padding: 24px;
  overflow-y: auto;
}

.voice-list-container {
  width: 100%;
}

.voice-list-header {
  display: flex;
  margin-bottom: 8px;
  font-size: 13px;
  color: var(--el-text-color-regular);
  justify-content: space-between;
  align-items: center;
}

.voice-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.voice-empty {
  padding: 12px;
  margin-top: 8px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  text-align: center;
  background-color: var(--el-fill-color-light);
  border-radius: 4px;
}

.file-resource-toolbar {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  margin-bottom: 8px;
}

.file-resource-actions {
  margin-top: 8px;
  margin-bottom: 8px;
}

/* 弹窗居中 */
.subtitle-preview-dialog {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.subtitle-column-wrapper {
  max-width: 100%;
}

.subtitle-header {
  padding-bottom: 2px;
  margin-bottom: 2px;
  font-size: 11px;
  color: var(--el-text-color-secondary);
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.subtitle-list-container {
  max-height: 100px;
  overflow-y: auto;
  scrollbar-width: thin;
}

.subtitle-list {
  padding: 0;
  margin: 0;
  font-size: 12px;
  list-style: none;
}

.subtitle-list li {
  margin-bottom: 2px;
  line-height: 1.2;
  word-break: break-all;
  white-space: normal;
}

.subtitle-time {
  font-size: 11px;
  color: var(--el-text-color-placeholder);
}

.subtitle-text {
  color: var(--el-text-color-regular);
}

:global(.copy-tooltip) {
  max-width: 400px !important;
  line-height: 1.6;
}

.metadata-container {
  max-height: 60vh;
  padding: 16px;
  overflow-y: auto;
  background: #f5f7fa;
  border-radius: 8px;
}

.metadata-pre {
  margin: 0;
  font-family: monospace;
  font-size: 13px;
  line-height: 1.5;
  color: #303133;
  word-break: break-all;
  white-space: pre-wrap;
}
</style>
