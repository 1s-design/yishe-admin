<template>
  <ContentWrap :plain="true">
    <div class="mnt">
      <header class="mnt__head">
        <div class="mnt__heading">
          <h2 class="mnt__title">{{ title }}</h2>
          <p v-if="description" class="mnt__desc">{{ description }}</p>
        </div>
        <div class="mnt__actions">
          <slot name="actions" />
        </div>
      </header>
      <div class="mnt__body">
        <slot />
      </div>
    </div>
  </ContentWrap>
</template>

<script setup lang="ts">
import ContentWrap from "@/components/ContentWrap/src/ContentWrap.vue";

defineOptions({ name: "MaintenancePage" });

defineProps({
  title: { type: String, required: true },
  description: { type: String, default: "" },
});
</script>

<style scoped lang="scss">
.mnt {
  display: flex;
  flex-direction: column;
  gap: 24px;
  color: var(--el-text-color-primary);

  :deep(.mnt-meta) {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    font-size: 12px;
    white-space: nowrap;
  }

  :deep(.mnt-meta__item) {
    display: inline-flex;
    align-items: baseline;
    gap: 6px;
  }

  :deep(.mnt-meta__label) {
    color: var(--el-text-color-secondary);
  }

  :deep(.mnt-meta__value) {
    font-weight: 500;
    color: var(--el-text-color-primary);
  }

  :deep(.mnt-meta__sep) {
    width: 1px;
    height: 11px;
    background: var(--el-border-color);
  }

  :deep(.mnt-badge) {
    display: inline-flex;
    align-items: center;
    height: 18px;
    padding: 0 6px;
    font-size: 11px;
    font-weight: 500;
    line-height: 1;
    color: var(--el-color-info);
    white-space: nowrap;
    background: color-mix(in srgb, var(--el-color-info) 10%, transparent);
    border-radius: 4px;
  }

  :deep(.mnt-grid) {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 12px;
  }

  :deep(.mnt-card) {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 16px;
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;
    transition: border-color 0.15s ease;

    &:hover {
      border-color: var(--el-border-color);
    }
  }

  :deep(.mnt-card__head) {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  :deep(.mnt-card__title) {
    font-size: 13.5px;
    font-weight: 600;
    letter-spacing: 0.01em;
  }

  :deep(.mnt-card__desc) {
    margin: 0;
    font-size: 12px;
    line-height: 1.5;
    color: var(--el-text-color-secondary);
  }

  :deep(.mnt-card__metrics) {
    display: flex;
    gap: 24px;
    padding-top: 12px;
    border-top: 1px solid var(--el-border-color-lighter);
  }

  :deep(.mnt-card__metric) {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  :deep(.mnt-card__metric-value) {
    font-size: 16px;
    font-weight: 600;
    line-height: 1.2;
    color: var(--el-text-color-placeholder);
    font-variant-numeric: tabular-nums;
  }

  :deep(.mnt-card__metric-label) {
    font-size: 11.5px;
    color: var(--el-text-color-secondary);
  }

  :deep(.mnt-settings) {
    display: grid;
    grid-template-columns: 240px minmax(0, 1fr);
    gap: 16px;
    align-items: start;
  }

  :deep(.mnt-settings__nav) {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding-right: 12px;
    border-right: 1px solid var(--el-border-color-lighter);
  }

  :deep(.mnt-nav-item) {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 10px 12px;
    color: var(--el-text-color-primary);
    text-align: left;
    cursor: pointer;
    background: transparent;
    border: none;
    border-radius: 6px;
    transition: background-color 0.15s ease;

    &:hover {
      background: var(--el-fill-color-light);
    }

    &.is-active {
      background: color-mix(in srgb, var(--el-color-primary) 8%, transparent);
    }
  }

  :deep(.mnt-nav-item__title) {
    font-size: 13px;
    font-weight: 500;
  }

  :deep(.mnt-nav-item__desc) {
    font-size: 11.5px;
    line-height: 1.4;
    color: var(--el-text-color-secondary);
  }

  :deep(.mnt-settings__panel) {
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-height: 260px;
    padding: 18px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;
  }

  :deep(.mnt-panel-head) {
    display: flex;
    align-items: center;
    gap: 8px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--el-border-color-lighter);
  }

  :deep(.mnt-panel-title) {
    font-size: 13.5px;
    font-weight: 600;
  }

  :deep(.mnt-empty) {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    letter-spacing: 0.02em;
    color: var(--el-text-color-placeholder);
  }
}

.mnt__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.mnt__heading {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.mnt__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: 0.02em;
}

.mnt__desc {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
}

.mnt__actions {
  flex-shrink: 0;
}

.mnt__body {
  min-width: 0;
}

@media (width <= 900px) {
  .mnt {
    :deep(.mnt-settings) {
      grid-template-columns: 1fr;
    }

    :deep(.mnt-settings__nav) {
      flex-direction: row;
      padding-right: 0;
      padding-bottom: 10px;
      overflow-x: auto;
      border-right: none;
      border-bottom: 1px solid var(--el-border-color-lighter);
    }

    :deep(.mnt-nav-item) {
      flex: 0 0 auto;
      min-width: 140px;
    }
  }
}

@media (width <= 640px) {
  .mnt {
    gap: 18px;

    :deep(.mnt-grid) {
      grid-template-columns: 1fr;
    }

    :deep(.mnt-card) {
      padding: 14px;
    }

    :deep(.mnt-settings__panel) {
      min-height: 200px;
      padding: 14px;
    }

    :deep(.mnt-nav-item__desc) {
      display: none;
    }
  }

  .mnt__head {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
}
</style>
