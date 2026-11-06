export interface UseImageDeckOptions {
  maxCache?: number;
  warmTimeout?: number;
  maxConcurrent?: number;
}

type FetchPriority = 'high' | 'auto' | 'low';

interface ImageTask {
  url: string;
  priority: FetchPriority;
  promise: Promise<boolean>;
  resolve: (ok: boolean) => void;
  el?: HTMLImageElement;
  timer?: ReturnType<typeof setTimeout>;
}

export function useImageDeck(options: UseImageDeckOptions = {}) {
  const { maxCache = 36, warmTimeout = 6000, maxConcurrent = 3 } = options;
  const cacheLimit = Number.isFinite(maxCache) ? Math.max(0, Math.floor(maxCache)) : 36;
  const concurrentLimit = Number.isFinite(maxConcurrent) ? Math.max(1, Math.floor(maxConcurrent)) : 3;
  const tasks = new Map<string, ImageTask>();
  const cache = new Map<string, HTMLImageElement>();
  let queue: ImageTask[] = [];
  let active = 0;
  let pumping = false;

  function normalize(url?: string | null): string {
    return typeof url === 'string' ? url.trim() : '';
  }

  function release(el: HTMLImageElement): void {
    el.onload = null;
    el.onerror = null;
    el.removeAttribute('src');
  }

  function touch(url: string): boolean {
    const el = cache.get(url);
    if (!el) return false;
    // Map insertion order makes LRU deterministic even within the same millisecond.
    cache.delete(url);
    cache.set(url, el);
    return true;
  }

  function evict(): void {
    while (cache.size > cacheLimit) {
      const url = cache.keys().next().value!;
      const el = cache.get(url)!;
      cache.delete(url);
      release(el);
    }
  }

  function finish(task: ImageTask, ok: boolean, pumpNext = true): void {
    // Identity checks stop cancelled callbacks from reviving a replaced task.
    if (tasks.get(task.url) !== task) return;
    tasks.delete(task.url);
    clearTimeout(task.timer);
    if (task.el) {
      active--;
      task.el.onload = null;
      task.el.onerror = null;
      if (ok) {
        cache.set(task.url, task.el);
        evict();
      } else {
        release(task.el);
      }
    }
    task.resolve(ok);
    if (pumpNext) pump();
  }

  function start(task: ImageTask): void {
    try {
      const el = new Image();
      task.el = el;
      active++;
      task.timer = setTimeout(() => finish(task, false), warmTimeout);
      el.decoding = 'async';
      el.fetchPriority = task.priority;
      let decoding = false;
      el.onload = async () => {
        if (tasks.get(task.url) !== task || decoding) return;
        decoding = true;
        el.onload = null;
        if (typeof el.decode === 'function') {
          try {
            await el.decode();
          } catch {
            finish(task, el.complete && el.naturalWidth > 0);
            return;
          }
        }
        finish(task, true);
      };
      el.onerror = () => finish(task, false);
      el.src = task.url;
    } catch {
      finish(task, false);
    }
  }

  function pump(): void {
    if (pumping) return;
    pumping = true;
    try {
      while (active < concurrentLimit && queue.length) {
        const task = queue.shift()!;
        if (tasks.get(task.url) === task) start(task);
      }
    } finally {
      pumping = false;
    }
  }

  function getTask(url: string, priority: FetchPriority): ImageTask {
    const existing = tasks.get(url);
    if (existing) return existing;
    let resolve!: (ok: boolean) => void;
    const promise = new Promise<boolean>((done) => {
      resolve = done;
    });
    const task: ImageTask = { url, priority, promise, resolve };
    tasks.set(url, task);
    return task;
  }

  function setPriority(task: ImageTask, priority: FetchPriority): void {
    task.priority = priority;
    if (task.el) task.el.fetchPriority = priority;
  }

  function removeQueued(task: ImageTask): void {
    const index = queue.indexOf(task);
    if (index !== -1) queue.splice(index, 1);
  }

  function ensure(url?: string | null): Promise<boolean> {
    const key = normalize(url);
    if (!key) return Promise.resolve(false);
    if (touch(key)) return Promise.resolve(true);
    const task = getTask(key, 'high');
    setPriority(task, 'high');
    if (!task.el) {
      removeQueued(task);
      queue.unshift(task);
    }
    pump();
    return task.promise;
  }

  function isReady(url?: string | null): boolean {
    return cache.has(normalize(url));
  }

  function awaitReady(url?: string | null, timeoutMs = 900): Promise<boolean> {
    const key = normalize(url);
    if (!key) return Promise.resolve(false);
    if (touch(key)) return Promise.resolve(true);
    const task = ensure(key);
    return new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => resolve(isReady(key)), timeoutMs);
      void task.then((ok) => {
        clearTimeout(timer);
        resolve(ok);
      });
    });
  }

  function warm(urls: Array<string | null | undefined>, priority: 'auto' | 'low'): void {
    for (const raw of urls) {
      const url = normalize(raw);
      if (!url || cache.has(url)) continue;
      const task = getTask(url, priority);
      if (priority === 'auto' && task.priority === 'low') {
        setPriority(task, priority);
        removeQueued(task);
      }
      if (task.el || queue.includes(task)) continue;
      const index = task.priority === 'low' ? -1 : queue.findIndex((item) => item.priority === 'low');
      if (index === -1) queue.push(task);
      else queue.splice(index, 0, task);
    }
    // Background warming must progress even when review input leaves no idle frames.
    pump();
  }

  function warmNow(url?: string | null | Array<string | null | undefined>): void {
    warm(Array.isArray(url) ? url : [url], 'auto');
  }

  function warmIdle(urls: Array<string | null | undefined>): void {
    warm(urls, 'low');
  }

  function setWindow(urls: Array<string | null | undefined>): void {
    const ordered = [...new Set(urls.map(normalize).filter(Boolean))];
    const wanted = new Set(ordered);
    // Batch cancellation prevents a freed slot from starting obsolete queued work.
    queue = [];
    for (const task of tasks.values()) {
      if (!wanted.has(task.url)) finish(task, false, false);
    }
    ordered.forEach((url, index) => {
      if (cache.has(url)) {
        if (index === 0) touch(url);
        return;
      }
      const priority = index === 0 ? 'high' : 'auto';
      const task = getTask(url, priority);
      setPriority(task, priority);
      if (!task.el) queue.push(task);
    });
    pump();
  }

  function reset(): void {
    queue = [];
    for (const task of tasks.values()) finish(task, false, false);
    cache.forEach(release);
    cache.clear();
  }

  return { ensure, isReady, awaitReady, warmNow, warmIdle, setWindow, reset };
}

export type ImageDeck = ReturnType<typeof useImageDeck>;
