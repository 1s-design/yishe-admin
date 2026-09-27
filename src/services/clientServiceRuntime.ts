import type { WebsocketConnectionVO } from "@/api/system/websocket";

export type ClientServiceRuntimeLike = Record<string, any> | null | undefined;

export type ClientServiceSummary = "available" | "offline";

export function getClientServiceRuntimeSafe(
  runtime?: ClientServiceRuntimeLike,
): Record<string, any> {
  return (runtime || {}) as Record<string, any>;
}

export function hasClientServiceRuntime(runtime?: ClientServiceRuntimeLike): boolean {
  return Object.keys(getClientServiceRuntimeSafe(runtime)).length > 0;
}

export function isClientServiceRuntimeAvailable(runtime?: ClientServiceRuntimeLike): boolean {
  const safeRuntime = getClientServiceRuntimeSafe(runtime);
  const status = String(safeRuntime.status || "").toLowerCase();
  const state = String(safeRuntime.state || "").toLowerCase();
  if (status === "error" || state === "error" || status === "disconnected") {
    return false;
  }
  return !!(
    safeRuntime.available ||
    safeRuntime.connected ||
    status === "connected" ||
    safeRuntime.details?.photoshopReady === true ||
    safeRuntime.details?.serviceStatus === "connected" ||
    safeRuntime.details?.serviceHealthy === true
  );
}

export function isClientServiceRuntimeBusy(runtime?: ClientServiceRuntimeLike): boolean {
  const safeRuntime = getClientServiceRuntimeSafe(runtime);
  if (safeRuntime.busy === false) {
    return false;
  }
  const activeJobsCount = Number(
    safeRuntime.details?.activeJobsCount ?? safeRuntime.details?.queueCount ?? 0,
  );
  const currentTaskId = String(safeRuntime.currentTaskId || "").trim();
  const state = String(safeRuntime.state || "").trim().toLowerCase();
  return !!(
    safeRuntime.busy === true ||
    (state === "busy" && !!currentTaskId) ||
    (!!currentTaskId && safeRuntime.busy !== false && state !== "idle" && state !== "connected") ||
    safeRuntime.details?.currentExecution?.running === true ||
    (Number.isFinite(activeJobsCount) &&
      activeJobsCount > 0 &&
      safeRuntime.busy !== false &&
      state !== "idle")
  );
}

export function isClientServiceNodeAvailable(
  client?: Pick<WebsocketConnectionVO, "isOnline"> | null,
  runtime?: ClientServiceRuntimeLike,
): boolean {
  return !!(
    client?.isOnline &&
    isClientServiceRuntimeAvailable(runtime) &&
    !isClientServiceRuntimeBusy(runtime)
  );
}

export function resolveClientServiceSummary(
  runtime?: ClientServiceRuntimeLike,
): ClientServiceSummary {
  const safeRuntime = getClientServiceRuntimeSafe(runtime);

  if (isClientServiceRuntimeAvailable(safeRuntime)) {
    return "available";
  }

  return "offline";
}
