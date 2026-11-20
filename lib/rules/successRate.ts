import { SUCCESS_STATUSES, FAILED_STATUSES } from "./constants";

export function computeSuccessRate(statuses: string[]): { rate: number | null; success: number; failed: number; total: number } {
  let success = 0;
  let failed = 0;
  for (const s of statuses) {
    if (SUCCESS_STATUSES.has(s as any)) success++;
    else if (FAILED_STATUSES.has(s as any)) failed++;
  }
  const finished = success + failed;
  if (finished === 0) return { rate: null, success, failed, total: finished };
  return { rate: (success / finished) * 100, success, failed, total: finished };
}
