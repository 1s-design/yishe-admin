<script setup lang="ts">
defineOptions({ name: 'AppLoading' })

const props = withDefaults(
  defineProps<{
    text?: string
    label?: string
    caption?: string
    fullscreen?: boolean
    duration?: number
  }>(),
  {
    text: '1s design admin...',
    label: '',
    caption: '',
    fullscreen: false,
    duration: 3
  }
)

const loadingTextStyle = computed(() => ({
  '--app-loading-duration': `${props.duration}s`
}))

const ariaLabel = computed(() => {
  return [props.label, props.text].filter(Boolean).join(' ')
})
</script>

<template>
  <div
    class="app-loading-shell"
    :class="{ 'app-loading-shell--fullscreen': fullscreen }"
    role="status"
    aria-live="polite"
    :aria-label="ariaLabel"
  >
    <div class="app-loading-shell__stage">
      <div class="app-loading-shell__text" :style="loadingTextStyle">
        <p>{{ text }}</p>
      </div>

      <div v-if="label || caption" class="app-loading-shell__meta">
        <div v-if="label" class="app-loading-shell__label">{{ label }}</div>
        <div v-if="caption" class="app-loading-shell__caption">{{ caption }}</div>
      </div>
    </div>
  </div>
</template>
