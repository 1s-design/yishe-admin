import type { App } from 'vue'
import AppLoading from './index.vue'
import './style.scss'

export { AppLoading }

export interface AppLoadingOptions {
  text?: string
  label?: string
  caption?: string
  duration?: number
}

const DEFAULT_LOADING_OPTIONS: Required<AppLoadingOptions> = {
  text: '1s design admin...',
  label: '',
  caption: '',
  duration: 3
}

const escapeHtml = (value: string) => {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export const renderAppLoadingMarkup = (options: AppLoadingOptions = {}) => {
  const config = { ...DEFAULT_LOADING_OPTIONS, ...options }
  const label = config.label ? `<div class="app-loading-shell__label">${escapeHtml(config.label)}</div>` : ''
  const caption = config.caption
    ? `<div class="app-loading-shell__caption">${escapeHtml(config.caption)}</div>`
    : ''
  const meta = label || caption ? `<div class="app-loading-shell__meta">${label}${caption}</div>` : ''

  return `
    <div class="app-loading-shell app-loading-shell--fullscreen" role="status" aria-live="polite" aria-label="${escapeHtml(`${config.label} ${config.text}`.trim())}">
      <div class="app-loading-shell__stage">
        <div class="app-loading-shell__text" style="--app-loading-duration:${config.duration}s;">
          <p>${escapeHtml(config.text)}</p>
        </div>
        ${meta}
      </div>
    </div>
  `
}

export const mountBootLoading = (
  target: string | HTMLElement = '#app',
  options: AppLoadingOptions = {}
) => {
  if (typeof document === 'undefined') return

  const element = typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target
  if (!element) return

  element.innerHTML = renderAppLoadingMarkup(options)
}

export const setupAppLoading = (app: App<Element>) => {
  app.component('AppLoading', AppLoading)
}
