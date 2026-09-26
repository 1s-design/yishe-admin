<template>
  <div class="agent-runs-page">
    <AgentRunTasks />
  </div>
</template>

<script setup lang="ts">
import AgentRunTasks from "@/components/AgentRunTasks/index.vue";

defineOptions({ name: "AgentRunTasksPage" });
</script>

<style scoped>
.agent-runs-page {
  height: calc(
    100vh - var(--top-tool-height) - var(--tags-view-height)
  );
  overflow: hidden;
}
</style>
