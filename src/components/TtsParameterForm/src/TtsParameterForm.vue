<template>
  <div class="tts-parameter-form">
    <el-form-item
      v-for="param in visibleParameters"
      :key="param.key"
      :label="resolveLabel(param)"
      :class="`tts-param--${param.type}`"
    >
      <!-- Select -->
      <el-select
        v-if="param.type === 'select'"
        :model-value="params[param.key] ?? param.defaultValue"
        class="w-full"
        @update:model-value="(v) => updateParam(param.key, v)"
      >
        <el-option
          v-for="opt in param.options"
          :key="String(opt.value)"
          :label="opt.label"
          :value="opt.value"
        />
      </el-select>

      <!-- Slider -->
      <div v-else-if="param.type === 'slider'" class="tts-param-slider">
        <el-slider
          :model-value="params[param.key] ?? param.defaultValue"
          :min="param.min"
          :max="param.max"
          :step="param.step"
          show-input
          @update:model-value="(v) => updateParam(param.key, v)"
        />
      </div>

      <!-- Textarea -->
      <el-input
        v-else-if="param.type === 'textarea'"
        type="textarea"
        :model-value="params[param.key] ?? param.defaultValue"
        :placeholder="param.placeholder"
        @update:model-value="(v) => updateParam(param.key, v)"
      />

      <!-- Boolean -->
      <el-switch
        v-else-if="param.type === 'boolean'"
        :model-value="params[param.key] ?? param.defaultValue"
        @update:model-value="(v) => updateParam(param.key, v)"
      />

      <!-- Text (default) -->
      <el-input
        v-else
        :model-value="params[param.key] ?? param.defaultValue"
        :placeholder="param.placeholder"
        @update:model-value="(v) => updateParam(param.key, v)"
      />

      <div v-if="param.description" class="tts-param__description">
        {{ param.description }}
      </div>
    </el-form-item>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TtsParameterSchema } from '@/api/ai/tts'

const props = defineProps<{
  parameters: TtsParameterSchema[]
  params: Record<string, any>
  model?: string
}>()

const emit = defineEmits<{ 'update:params': [value: Record<string, any>] }>()

const visibleParameters = computed(() => {
  return props.parameters.filter((param) => {
    if (!param.visibleWhen) return true
    return props.params[param.visibleWhen.param] === param.visibleWhen.equals
  })
})

function resolveLabel(param: TtsParameterSchema): string {
  return param.label
}

function updateParam(key: string, value: unknown) {
  emit('update:params', { ...props.params, [key]: value })
}
</script>

<style scoped>
.tts-parameter-form {
  width: 100%;
}

.tts-param-slider {
  width: 100%;
  padding: 0 8px;
}

.tts-param__description {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--el-text-color-secondary);
}
</style>
