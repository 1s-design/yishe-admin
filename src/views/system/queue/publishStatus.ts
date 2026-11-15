export type PublishPhase =
  | 'rejected'
  | 'awaiting-review'
  | 'queued'
  | 'publishing'
  | 'published'
  | 'failed';

export interface PublishDispatchInfo {
  status: string;
  lastError: string;
  profileId: string;
  startedAt: string;
  finishedAt: string;
  attemptCount: number;
}

export function getPublishDispatchInfo(source: any): PublishDispatchInfo {
  const raw = source?.metadata?.publishDispatch;
  const d = raw && typeof raw === 'object' ? raw : {};
  return {
    status: String(d.status || '').trim(),
    lastError: String(d.lastError || '').trim(),
    profileId: String(d.profileId || '').trim(),
    startedAt: String(d.startedAt || '').trim(),
    finishedAt: String(d.finishedAt || '').trim(),
    attemptCount: Number(d.attemptCount || 0) || 0
  };
}

/** 发布业务态：审核轴 + 执行轴派生，不新增落库字段 */
export function derivePublishPhase(source: any): PublishPhase {
  const review = String(source?.metadata?.publishReview?.status || '').trim();
  if (review === 'rejected') return 'rejected';
  if (review === 'pending') return 'awaiting-review';
  const dispatch = getPublishDispatchInfo(source).status;
  const status = String(source?.status || '').trim();
  if (dispatch === 'failed' || status === 'failed') return 'failed';
  if (dispatch === 'completed' || status === 'completed') return 'published';
  if (dispatch === 'assigned' || dispatch === 'running' || status === 'processing') return 'publishing';
  return 'queued';
}

export const PHASE_LABEL_KEY: Record<PublishPhase, string> = {
  rejected: 'queue.phaseRejected',
  'awaiting-review': 'queue.phaseAwaitingReview',
  queued: 'queue.phaseQueued',
  publishing: 'queue.phasePublishing',
  published: 'queue.phasePublished',
  failed: 'queue.phaseFailed'
};