import request from "@/config/axios";

export type ComponentStatus = "ok" | "degraded" | "down";

export type ComponentCategory = "infrastructure" | "external";

export interface ServiceComponentStatus {
  key: string;
  name: string;
  category: ComponentCategory;
  status: ComponentStatus;
  latencyMs: number | null;
  message: string;
  metrics: Record<string, string | number | boolean | null>;
}

export interface SystemStatusOverview {
  timestamp: string;
  summary: {
    total: number;
    ok: number;
    degraded: number;
    down: number;
    overall: ComponentStatus;
  };
  app: {
    name: string;
    version: string;
    nodeVersion: string;
    env: string;
    pid: number;
    uptimeSeconds: number;
    memory: {
      rssMb: number;
      heapUsedMb: number;
      heapTotalMb: number;
      externalMb: number;
    };
  };
  host: {
    hostname: string;
    platform: string;
    arch: string;
    cpuModel: string;
    cpuCores: number;
    totalMemMb: number;
    freeMemMb: number;
    memUsagePercent: number;
    loadAvg: number[];
    osUptimeSeconds: number;
    disk: {
      totalMb: number;
      freeMb: number;
      usagePercent: number;
    } | null;
    network: Array<{ name: string; address: string }>;
  };
  components: ServiceComponentStatus[];
}

export const getSystemStatusOverview = () => {
  return request.get<SystemStatusOverview>({
    url: "/system-status/overview",
  });
};
