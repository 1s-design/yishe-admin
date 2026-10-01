<template>
  <div class="ai-assistant-page">
    <AiAssistant />
  </div>
</template>

<script setup lang="ts">
import AiAssistant from "@/components/AiAssistant/index.vue";

defineOptions({
  name: "AiAssistantPage",
});
</script>

<style scoped>
.ai-assistant-page {
  --ai-assistant-page-height: calc(
    100vh - var(--top-tool-height) - var(--tags-view-height)
  );
  --ai-assistant-page-height: calc(
    100dvh - var(--top-tool-height) - var(--tags-view-height)
  );

  display: flex;
  width: 100%;
  height: var(--ai-assistant-page-height);
  min-height: 0;
  overflow: hidden;
}

.ai-assistant-page > * {
  flex: 1;
  min-width: 0;
  min-height: 0;
}

@media (max-width: 768px) {
  .ai-assistant-page {
    --ai-assistant-page-height: calc(
      100vh - var(--top-tool-height)
    );
    --ai-assistant-page-height: calc(
      100dvh - var(--top-tool-height)
    );
  }
}
</style>
