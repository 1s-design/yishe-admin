<template>
  <div class="tti-parameter-form">
    <el-form-item
      v-for="param in visibleParameters"
      :key="param.key"
      :label="resolveLabel(param)"
      :class="`tti-param--${param.type}`"
    >
      <!-- Select -->
      <el-select
        v-if="param.type === 'select'"
        :model-value="params[param.key] ?? param.defaultValue"
        class="w-full"
        @update:model-value="(v: any) => updateParam(param.key, v)"
      >
        <el-option
          v-for="opt in param.options"
          :key="String(opt.value)"
          :label="opt.label"
          :value="opt.value"
        />
      </el-select>

      <!-- Slider -->
      <div v-else-if="param.type === 'slider'" class="tti-param-slider">
        <el-slider
          :model-value="params[param.key] ?? param.defaultValue"
          :min="param.min ?? 1"
          :max="param.max ?? 4"
          :step="param.step ?? 1"
          show-input
          @update:model-value="(v: any) => updateParam(param.key, v)"
        />
      </div>

      <!-- Textarea -->
      <el-input
        v-else-if="param.type === 'textarea'"
        type="textarea"
        :model-value="params[param.key] ?? param.defaultValue"
        :placeholder="param.placeholder"
        @update:model-value="(v: any) => updateParam(param.key, v)"
      />

      <!-- Boolean -->
      <el-switch
        v-else-if="param.type === 'boolean'"
        :model-value="params[param.key] ?? param.defaultValue"
        @update:model-value="(v: any) => updateParam(param.key, v)"
      />

      <!-- Text (default) -->
      <el-input
        v-else
        :model-value="params[param.key] ?? param.defaultValue"
        :placeholder="param.placeholder"
        @update:model-value="(v: any) => updateParam(param.key, v)"
      />

      <div v-if="param.description" class="tti-param__description">
        {{ param.description }}
      </div>
    </el-form-item>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TtiParameterSchema } from '@/api/ai/tti'

const props = defineProps<{
  parameters: TtiParameterSchema[]
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

function resolveLabel(param: TtiParameterSchema): string {
  return param.label
}

function updateParam(key: string, value: unknown) {
  emit('update:params', { ...props.params, [key]: value })
}
</script>

<style scoped>
.tti-parameter-form {
  width: 100%;
}

.tti-param-slider {
  width: 100%;
}

.tti-param__description {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
  line-height: 1.4;
}
</style>
