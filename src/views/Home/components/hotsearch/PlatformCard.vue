<template>
  <article
    class="hs-card"
    :class="{
      'is-stale': platform.stale,
      'is-compact': compact,
      'has-accent': !!accent
    }"
    :style="accentStyle(platform.display)"
    role="button"
    tabindex="0"
    @click="emit('open', platform)"
    @keydown.enter="emit('open', platform)"
  >
    <header class="hs-card__head">
      <span class="hs-card__brand">
        <img v-if="iconSrc" class="hs-card__icon" :src="iconSrc" alt="" />
        <span class="hs-card__name">{{ platform.platformName }}</span>
      </span>
      <span class="hs-card__tail">
        <span v-if="ageLabel" class="hs-card__age">{{ ageLabel }}</span>
        <Icon icon="ep:arrow-right" class="hs-card__arrow" :size="12" />
      </span>
    </header>

    <ol v-if="rows.length" class="hs-card__rows">
      <li v-for="(row, index) in rows" :key="index" class="hs-card__row">
        <span class="hs-card__rank" :class="{ 'is-top': index < 3 }">{{ row.rank }}</span>
        <div class="hs-card__main">
          <a
            v-if="row.link"
            class="hs-card__title"
            :href="row.link"
            target="_blank"
            rel="noopener noreferrer"
            @click.stop
          >{{ row.title }}</a>
          <span v-else class="hs-card__title">{{ row.title }}</span>
          <span v-if="row.subtitle" class="hs-card__subtitle">{{ row.subtitle }}</span>
        </div>
        <span v-if="row.badges.length" class="hs-card__badges">
          <span v-for="badge in row.badges" :key="badge" class="hs-card__tag">{{ badge }}</span>
        </span>
        <span v-if="row.trend" class="hs-card__badge" :class="trendClass(row.trend)">{{ row.trend }}</span>
        <span v-if="row.heat" class="hs-card__heat">{{ row.heat }}</span>
      </li>
    </ol>
    <div v-else class="hs-card__empty">暂无条目</div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { HotsearchOverviewPlatform } from '@/api/hotsearch'
import { accentStyle, resolvePlatformIcon } from './icons'

defineOptions({ name: 'HotsearchPlatformCard' })

const props = defineProps<{
  platform: HotsearchOverviewPlatform
}>()

const emit = defineEmits<{
  (e: 'open', platform: HotsearchOverviewPlatform): void
}>()

const iconSrc = computed(() => resolvePlatformIcon(props.platform.display.icon))
const accent = computed(() => props.platform.display.accent)
const compact = computed(() => props.platform.display.layout === 'compact')

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
      trend,
      link: String(item[fields.link] ?? '').trim(),
      subtitle: String(item[fields.subtitle] ?? '').trim(),
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

const trendClass = (trend: string) => {
  if (/热|沸|爆/.test(trend)) return 'is-hot'
  if (trend.includes('新')) return 'is-new'
  return 'is-info'
}
</script>

<style scoped lang="scss">
.hs-card {
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

    .hs-card__arrow {
      color: var(--el-color-primary);
      opacity: 1;
    }
  }

  &.has-accent:hover,
  &.has-accent:focus-visible {
    border-color: color-mix(in srgb, var(--hs-accent) 32%, var(--el-border-color));

    .hs-card__arrow {
      color: var(--hs-accent);
    }
  }

  &.is-stale {
    .hs-card__name,
    .hs-card__rows {
      opacity: 0.62;
    }
  }

  &.is-compact {
    gap: 8px;
    padding: 12px 14px 10px;

    .hs-card__rows {
      gap: 5px;
    }

    .hs-card__subtitle,
    .hs-card__badges {
      display: none;
    }

    .hs-card__title {
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
}

.hs-card__head {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  min-width: 0;
}

.hs-card__brand {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  min-width: 0;
}

.hs-card__icon {
  flex-shrink: 0;
  width: 14px;
  height: 14px;
  object-fit: contain;
  border-radius: 3px;
}

.hs-card__name {
  overflow: hidden;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--el-text-color-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hs-card__tail {
  display: inline-flex;
  flex-shrink: 0;
  gap: 6px;
  align-items: center;
}

.hs-card__age {
  font-size: 11px;
  line-height: 1;
  color: var(--el-text-color-placeholder);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.hs-card__arrow {
  color: var(--el-text-color-placeholder);
  opacity: 0;
  transition: opacity 0.15s ease, color 0.15s ease;
}

.hs-card__rows {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.hs-card__row {
  display: flex;
  gap: 8px;
  align-items: baseline;
  min-width: 0;
  overflow: hidden;
}

.hs-card__rank {
  flex-shrink: 0;
  width: 14px;
  font-size: 11.5px;
  font-weight: 500;
  line-height: 1.5;
  color: var(--el-text-color-placeholder);
  text-align: right;
  font-variant-numeric: tabular-nums;

  &.is-top {
    font-weight: 700;
    color: var(--hs-accent, var(--el-text-color-primary));
  }
}

.hs-card__main {
  display: flex;
  flex: 1 1 0;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.hs-card__title {
  display: -webkit-box;
  overflow: hidden;
  font-size: 12.5px;
  line-height: 1.45;
  color: var(--el-text-color-regular);
  text-decoration: none;
  word-break: break-all;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

a.hs-card__title:hover {
  color: var(--hs-accent, var(--el-color-primary));
}

.hs-card__subtitle {
  overflow: hidden;
  font-size: 11px;
  line-height: 1.4;
  color: var(--el-text-color-placeholder);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hs-card__badges {
  display: inline-flex;
  flex: 0 0 auto;
  gap: 4px;
  align-self: center;
  max-width: 30%;
  overflow: hidden;
}

.hs-card__tag {
  height: 15px;
  max-width: 76px;
  padding: 0 4px;
  overflow: hidden;
  font-size: 10px;
  line-height: 15px;
  color: var(--hs-accent, var(--el-color-primary));
  text-overflow: ellipsis;
  white-space: nowrap;
  background: color-mix(in srgb, var(--hs-accent, var(--el-color-primary)) 9%, transparent);
  border-radius: 3px;
}

.hs-card__heat {
  max-width: 28%;
  overflow: hidden;
  font-size: 11px;
  line-height: 1.5;
  color: var(--el-text-color-placeholder);
  text-overflow: ellipsis;
  white-space: nowrap;
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}

.hs-card__badge {
  height: 15px;
  max-width: 60px;
  padding: 0 4px;
  overflow: hidden;
  font-size: 10px;
  line-height: 15px;
  text-overflow: ellipsis;
  white-space: nowrap;
  border-radius: 3px;
  flex-shrink: 0;

  &.is-hot {
    color: var(--el-color-danger);
    background: color-mix(in srgb, var(--el-color-danger) 10%, transparent);
  }

  &.is-new {
    color: var(--el-color-primary);
    background: color-mix(in srgb, var(--el-color-primary) 10%, transparent);
  }

  &.is-info {
    color: var(--el-color-info);
    background: color-mix(in srgb, var(--el-color-info) 10%, transparent);
  }
}

.hs-card__empty {
  padding: 6px 0;
  font-size: 11.5px;
  color: var(--el-text-color-placeholder);
}
</style>
