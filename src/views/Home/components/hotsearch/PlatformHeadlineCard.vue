<template>
  <article
    class="hs-hl"
    :class="{ 'is-stale': platform.stale, 'has-accent': !!accent }"
    :style="accentStyle(platform.display)"
    role="button"
    tabindex="0"
    @click="emit('open', platform)"
    @keydown.enter="emit('open', platform)"
  >
    <header class="hs-hl__head">
      <span class="hs-hl__brand">
        <img v-if="iconSrc" class="hs-hl__icon" :src="iconSrc" alt="" />
        <span class="hs-hl__name">{{ platform.platformName }}</span>
      </span>
      <span class="hs-hl__tail">
        <span v-if="ageLabel" class="hs-hl__age">{{ ageLabel }}</span>
        <Icon icon="ep:arrow-right" class="hs-hl__arrow" :size="12" />
      </span>
    </header>

    <template v-if="rows.length">
      <div class="hs-hl__lead">
        <a
          v-if="rows[0].link"
          class="hs-hl__lead-title"
          :href="rows[0].link"
          target="_blank"
          rel="noopener noreferrer"
          @click.stop
        >{{ rows[0].title }}</a>
        <span v-else class="hs-hl__lead-title">{{ rows[0].title }}</span>
        <div v-if="rows[0].badges.length || rows[0].heat" class="hs-hl__lead-meta">
          <span v-for="badge in rows[0].badges" :key="badge" class="hs-hl__tag">{{ badge }}</span>
          <span v-if="rows[0].heat" class="hs-hl__heat">{{ rows[0].heat }}</span>
        </div>
      </div>

      <ol v-if="rows.length > 1" class="hs-hl__rows">
        <li v-for="(row, index) in rows.slice(1)" :key="index" class="hs-hl__row">
          <span class="hs-hl__rank">{{ row.rank }}</span>
          <a
            v-if="row.link"
            class="hs-hl__title"
            :href="row.link"
            target="_blank"
            rel="noopener noreferrer"
            @click.stop
          >{{ row.title }}</a>
          <span v-else class="hs-hl__title">{{ row.title }}</span>
          <span v-if="row.heat" class="hs-hl__heat">{{ row.heat }}</span>
        </li>
      </ol>
    </template>
    <div v-else class="hs-hl__empty">暂无条目</div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { HotsearchOverviewPlatform } from '@/api/hotsearch'
import { accentStyle, resolvePlatformIcon } from './icons'

defineOptions({ name: 'HotsearchPlatformHeadlineCard' })

const props = defineProps<{
  platform: HotsearchOverviewPlatform
}>()

const emit = defineEmits<{
  (e: 'open', platform: HotsearchOverviewPlatform): void
}>()

const iconSrc = computed(() => resolvePlatformIcon(props.platform.display.icon))
const accent = computed(() => props.platform.display.accent)

const rows = computed(() => {
  const display = props.platform.display
  const fields = display.fields
  const badgeFields = display.badges || []
  return (props.platform.top || []).map((item, index) => {
    const trend = String(item[fields.trend] ?? '').trim()
    const badges = badgeFields
      .map((key) => String(item[key] ?? '').trim())
      .filter((value) => value && value !== trend)
    return {
      rank: item[fields.rank] ?? index + 1,
      title: String(item[fields.title] ?? '').trim(),
      heat: String(item[fields.heat] ?? '').trim(),
      link: String(item[fields.link] ?? '').trim(),
      badges: Array.from(new Set(badges))
    }
  }).filter((row) => row.title)
})

const ageLabel = computed(() => {
  const minutes = props.platform.ageMinutes
  if (minutes === null || minutes === undefined) return ''
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  return `${Math.floor(hours / 24)} 天前`
})
</script>

<style scoped lang="scss">
.hs-hl {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  padding: 14px 16px 12px;
  overflow: hidden;
  cursor: pointer;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  outline: none;
  transition: border-color 0.15s ease, background-color 0.15s ease;

  &:hover,
  &:focus-visible {
    background: color-mix(in srgb, var(--el-color-primary) 2%, var(--el-bg-color));
    border-color: var(--el-border-color);

    .hs-hl__arrow {
      color: var(--el-color-primary);
      opacity: 1;
    }
  }

  &.has-accent:hover,
  &.has-accent:focus-visible {
    border-color: color-mix(in srgb, var(--hs-accent) 32%, var(--el-border-color));

    .hs-hl__arrow {
      color: var(--hs-accent);
    }
  }

  &.is-stale {
    .hs-hl__name,
    .hs-hl__lead,
    .hs-hl__rows {
      opacity: 0.62;
    }
  }
}

.hs-hl__head {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  min-width: 0;
}

.hs-hl__brand {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  min-width: 0;
}

.hs-hl__icon {
  flex-shrink: 0;
  width: 14px;
  height: 14px;
  object-fit: contain;
  border-radius: 3px;
}

.hs-hl__name {
  overflow: hidden;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--el-text-color-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hs-hl__tail {
  display: inline-flex;
  flex-shrink: 0;
  gap: 6px;
  align-items: center;
}

.hs-hl__age {
  font-size: 11px;
  line-height: 1;
  color: var(--el-text-color-placeholder);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.hs-hl__arrow {
  color: var(--el-text-color-placeholder);
  opacity: 0;
  transition: opacity 0.15s ease, color 0.15s ease;
}

.hs-hl__lead {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  padding: 10px 12px;
  overflow: hidden;
  background: color-mix(in srgb, var(--hs-accent, var(--el-color-primary)) 5%, transparent);
  border-radius: 6px;
}

.hs-hl__lead-title {
  display: -webkit-box;
  overflow: hidden;
  font-size: 13.5px;
  font-weight: 600;
  line-height: 1.45;
  color: var(--el-text-color-primary);
  text-decoration: none;
  word-break: break-all;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

a.hs-hl__lead-title:hover {
  color: var(--hs-accent, var(--el-color-primary));
}

.hs-hl__lead-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 8px;
  align-items: center;
  min-width: 0;
  overflow: hidden;
}

.hs-hl__tag {
  height: 15px;
  max-width: 120px;
  padding: 0 4px;
  overflow: hidden;
  font-size: 10px;
  line-height: 15px;
  color: var(--hs-accent, var(--el-color-primary));
  text-overflow: ellipsis;
  white-space: nowrap;
  background: color-mix(in srgb, var(--hs-accent, var(--el-color-primary)) 10%, transparent);
  border-radius: 3px;
}

.hs-hl__rows {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.hs-hl__row {
  display: flex;
  gap: 8px;
  align-items: baseline;
  min-width: 0;
  overflow: hidden;
}

.hs-hl__rank {
  flex-shrink: 0;
  width: 14px;
  font-size: 11px;
  line-height: 1.5;
  color: var(--el-text-color-placeholder);
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.hs-hl__title {
  flex: 1;
  overflow: hidden;
  font-size: 12.5px;
  line-height: 1.45;
  color: var(--el-text-color-regular);
  text-decoration: none;
  text-overflow: ellipsis;
  white-space: nowrap;
}

a.hs-hl__title:hover {
  color: var(--hs-accent, var(--el-color-primary));
}

.hs-hl__heat {
  max-width: 30%;
  overflow: hidden;
  font-size: 11px;
  line-height: 1.5;
  color: var(--el-text-color-placeholder);
  text-overflow: ellipsis;
  white-space: nowrap;
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}

.hs-hl__empty {
  padding: 6px 0;
  font-size: 11.5px;
  color: var(--el-text-color-placeholder);
}
</style>
