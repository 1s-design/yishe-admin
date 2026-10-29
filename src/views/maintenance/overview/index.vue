<template>
  <MaintenancePage title="维护概览" description="系统运行、存储与流量的统计入口">
    <template #actions>
      <div class="mnt-meta">
        <span class="mnt-meta__item">
          <span class="mnt-meta__label">访问范围</span>
          <span class="mnt-meta__value">仅管理员</span>
        </span>
        <span class="mnt-meta__sep" />
        <span class="mnt-meta__item">
          <span class="mnt-meta__label">数据源</span>
          <span class="mnt-meta__value">待接入</span>
        </span>
      </div>
    </template>

    <div class="mnt-grid">
      <article v-for="section in MAINTENANCE_SECTIONS" :key="section.key" class="mnt-card">
        <div class="mnt-card__head">
          <span class="mnt-card__title">{{ section.title }}</span>
          <span class="mnt-badge">待接入</span>
        </div>
        <p class="mnt-card__desc">{{ section.description }}</p>
        <div class="mnt-card__metrics">
          <div v-for="metric in section.metrics" :key="metric" class="mnt-card__metric">
            <span class="mnt-card__metric-value">—</span>
            <span class="mnt-card__metric-label">{{ metric }}</span>
          </div>
        </div>
      </article>
    </div>
  </MaintenancePage>
</template>

<script setup lang="ts">
import MaintenancePage from "../components/MaintenancePage.vue";
import { MAINTENANCE_SECTIONS } from "../catalog";

defineOptions({ name: "SystemMaintenanceOverview" });
</script>
