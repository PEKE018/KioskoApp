export type PendingUpdateStatus = 'available' | 'downloaded';

export interface PendingUpdateInfo {
  version: string;
  releaseNotes?: string;
  status: PendingUpdateStatus;
}

export const LAST_CHECKED_VERSION_KEY = 'stockpos_last_checked_version';
export const DISMISSED_VERSION_KEY = 'stockpos_dismissed_version';
export const PENDING_UPDATE_KEY = 'stockpos_pending_update';

export function getPendingUpdate(): PendingUpdateInfo | null {
  const rawValue = localStorage.getItem(PENDING_UPDATE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as PendingUpdateInfo;
  } catch {
    localStorage.removeItem(PENDING_UPDATE_KEY);
    return null;
  }
}

export function setPendingUpdate(update: PendingUpdateInfo): void {
  localStorage.setItem(PENDING_UPDATE_KEY, JSON.stringify(update));
}

export function clearPendingUpdate(): void {
  localStorage.removeItem(PENDING_UPDATE_KEY);
}

export function clearPendingUpdateIfInstalled(currentVersion: string): void {
  const pendingUpdate = getPendingUpdate();
  if (pendingUpdate?.version === currentVersion) {
    clearPendingUpdate();
    localStorage.removeItem(DISMISSED_VERSION_KEY);
  }
}
