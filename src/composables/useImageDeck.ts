/**
 * 图片预解码调度器（快捷审核「逐张看大图」场景专用）
 *
 * 手感卡顿的两个真正来源：
 *  1) 下一张图只 `new Image(); img.src = url` 是「开始下载」，不等于「已解码」。
 *     真正切换 `<img :src>` 时浏览器会在主线程同步解码几 MB 的原图 → 掉帧 + 白闪。
 *  2) 一次性并发预载 8~9 张大图，带宽被摊薄，反而让紧邻的下一张更慢。
 *
 * 解决思路：
 *  - `ensure()` 用 `img.decode()` 拿到「真正可立即上屏」的 Promise，并缓存已解码的元素
 *  - `warmIdle()` 把远处的图丢到空闲帧里慢慢预热，只给下一张开「立即」通道
 *  - `awaitReady(url, timeout)` 让调用方能「图就绪才切换，但绝不让用户干等」
 */
export interface UseImageDeckOptions {
  /** 最多保留多少个已解码元素（超出按最早介入顺序淘汰，防止内存堆积） */
  maxCache?: number;
  /** 单张图解码的最长等待时间，超时即放弃并允许重试 */
  warmTimeout?: number;
}

interface CacheEntry {
  el: HTMLImageElement;
  usedAt: number;
}

const noopIdle: (cb: () => void) => void = (cb) => {
  setTimeout(cb, 1);
};

function pickIdle(): (cb: () => void) => void {
  const w = typeof window === 'undefined' ? undefined : (window as any);
  if (w?.requestIdleCallback) {
    return (cb: () => void) => w.requestIdleCallback(cb, { timeout: 800 });
  }
  return noopIdle;
}

export function useImageDeck(options: UseImageDeckOptions = {}) {
  const { maxCache = 12, warmTimeout = 6000 } = options;
  const idle = pickIdle();

  /** url -> 解码 Promise（true=已可上屏） */
  const tasks = new Map<string, Promise<boolean>>();
  /** 已确认解码完成的 url */
  const ready = new Set<string>();
  /** 已解码的元素缓存（保住引用，浏览器才不会把它从解码缓存里丢掉） */
  const cache = new Map<string, CacheEntry>();
  /** 低优先级预热队列 */
  const idleQueued = new Set<string>();
  let pumping = false;

  function normalize(url?: string | null): string {
    return typeof url === 'string' ? url.trim() : '';
  }

  /** 淘汰最久未使用的元素，释放其位图 */
  function evict(): void {
    while (cache.size > maxCache) {
      let oldestKey = '';
      let oldestAt = Number.POSITIVE_INFINITY;
      cache.forEach((entry, key) => {
        if (entry.usedAt < oldestAt) {
          oldestAt = entry.usedAt;
          oldestKey = key;
        }
      });
      if (!oldestKey) break;
      const victim = cache.get(oldestKey);
      cache.delete(oldestKey);
      ready.delete(oldestKey);
      tasks.delete(oldestKey);
      // 断开引用让浏览器回收解码后的位图
      if (victim) victim.el.src = '';
    }
  }

  /** 真正发起一次下载 + 解码 */
  function start(rawUrl: string): Promise<boolean> {
    const url = normalize(rawUrl);
    if (!url) return Promise.resolve(false);

    const existing = tasks.get(url);
    if (existing) return existing;

    const task = new Promise<boolean>((resolve) => {
      const el = new Image();
      let settled = false;

      const settle = (ok: boolean) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (ok) {
          ready.add(url);
          cache.set(url, { el, usedAt: Date.now() });
          evict();
        } else {
          // 失败要清掉 task，否则后续永远拿到 rejected/失败态
          tasks.delete(url);
        }
        resolve(ok);
      };

      const timer = setTimeout(() => settle(false), warmTimeout);

      el.decoding = 'async';
      el.onload = () => {
        // decode() 能确保像素已就绪、上屏时不再同步解码；不支持的浏览器退回 onload
        if (typeof el.decode === 'function') {
          el.decode().then(
            () => settle(true),
            () => settle(true),
          );
        } else {
          settle(true);
        }
      };
      el.onerror = () => settle(false);
      el.src = url;
    });

    tasks.set(url, task);
    return task;
  }

  /** 确保开始解码（幂等）。返回是否已可立即上屏 */
  function ensure(url?: string | null): Promise<boolean> {
    const key = normalize(url);
    if (!key) return Promise.resolve(false);
    const entry = cache.get(key);
    if (entry) entry.usedAt = Date.now();
    return start(key);
  }

  /** 该图是否已解码、可直接上屏 */
  function isReady(url?: string | null): boolean {
    return ready.has(normalize(url));
  }

  /**
   * 等待某张图就绪，最多等 timeoutMs。
   * 超时返回 false —— 调用方应「照切不误」，宁可偶尔白一下也不让用户干等。
   */
  function awaitReady(url?: string | null, timeoutMs = 900): Promise<boolean> {
    const key = normalize(url);
    if (!key) return Promise.resolve(false);
    if (ready.has(key)) return Promise.resolve(true);

    return Promise.race([
      start(key),
      new Promise<boolean>((resolve) => {
        setTimeout(() => resolve(ready.has(key)), timeoutMs);
      }),
    ]);
  }

  /** 立即抢占式预热（给「下一张」用） */
  function warmNow(url?: string | null): void {
    const key = normalize(url);
    if (!key || tasks.has(key)) return;
    void start(key);
  }

  /** 空闲帧预热（给更远的图用，不与当前图抢带宽） */
  function warmIdle(urls: Array<string | null | undefined>): void {
    let added = false;
    for (const raw of urls) {
      const key = normalize(raw);
      if (!key || tasks.has(key) || idleQueued.has(key)) continue;
      idleQueued.add(key);
      added = true;
    }
    if (added) pumpIdle();
  }

  function pumpIdle(): void {
    if (pumping) return;
    pumping = true;
    const step = (): void => {
      const next = idleQueued.values().next();
      if (next.done) {
        pumping = false;
        return;
      }
      const url = next.value;
      idleQueued.delete(url);
      void start(url).finally(() => idle(step));
    };
    idle(step);
  }

  /** 重新加载队列时清空（避免旧 URL 占着内存） */
  function reset(): void {
    cache.forEach((entry) => {
      entry.el.src = '';
    });
    cache.clear();
    tasks.clear();
    ready.clear();
    idleQueued.clear();
  }

  return { ensure, isReady, awaitReady, warmNow, warmIdle, reset };
}

export type ImageDeck = ReturnType<typeof useImageDeck>;
