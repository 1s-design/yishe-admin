import request from "@/config/axios";

export interface DesignJobStats {
  onlineStations: number;
  activeJobs: number;
  todayCompleted: number;
  todayApproved: number;
  todayRejected: number;
  todayReworked: number;
  approvalRate: number;
}

export interface DesignJobRecord {
  id: string;
  inspirationId?: string;
  sourceStickerId?: string;
  jobType: "new" | "rework";
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  workerId?: string;
  brainType?: "builtin" | "mcp_external";
  reworkPrompt?: string;
  reworkTags?: string[];
  outputStickerId?: string;
  outputPreviewUrl?: string;
  durationMs?: number;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TriggerReworkParams {
  stickerId: string;
  reworkPrompt: string;
  reworkTags?: string[];
}

export const getDesignJobStats = (): Promise<DesignJobStats> =>
  request.get({ url: "/design-job/stats" });

export const getDesignJobsByInspiration = (
  inspirationId: string,
): Promise<DesignJobRecord[]> =>
  request.get({ url: `/design-job/list/${inspirationId}` });

export const triggerDesignJobRework = (data: TriggerReworkParams) =>
  request.post({ url: "/design-job/rework", data });
