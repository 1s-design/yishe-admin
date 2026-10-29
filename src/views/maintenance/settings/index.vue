<template>
  <MaintenancePage title="系统配置" description="按分组维护系统级参数，保存后对全局生效">
    <div class="mnt-settings">
      <nav class="mnt-settings__nav" aria-label="配置分组">
        <button
          v-for="group in MAINTENANCE_CONFIG_GROUPS"
          :key="group.key"
          type="button"
          class="mnt-nav-item"
          :class="{ 'is-active': group.key === activeKey }"
          :aria-current="group.key === activeKey ? 'page' : undefined"
          @click="activeKey = group.key"
        >
          <span class="mnt-nav-item__title">{{ group.title }}</span>
          <span class="mnt-nav-item__desc">{{ group.description }}</span>
        </button>
      </nav>

      <section class="mnt-settings__panel">
        <header class="mnt-panel-head">
          <span class="mnt-panel-title">{{ activeGroup?.title || "系统配置" }}</span>
          <span class="mnt-badge">待接入</span>
        </header>
        <div class="mnt-empty">配置项待接入</div>
      </section>
    </div>
  </MaintenancePage>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import MaintenancePage from "../components/MaintenancePage.vue";
import { MAINTENANCE_CONFIG_GROUPS } from "../catalog";

defineOptions({ name: "SystemMaintenanceSettings" });

const activeKey = ref(MAINTENANCE_CONFIG_GROUPS[0]?.key || "");

const activeGroup = computed(
  () => MAINTENANCE_CONFIG_GROUPS.find((group) => group.key === activeKey.value) || null,
);
</script>
