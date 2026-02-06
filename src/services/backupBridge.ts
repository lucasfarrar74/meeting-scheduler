/**
 * Backup Bridge for CDFA Hub integration
 * Handles backup/restore requests from the Hub via postMessage
 */

// Storage keys used by Meeting Scheduler
const STORAGE_KEYS = {
  projects: 'meeting-scheduler-projects',
  activeProjectId: 'meeting-scheduler-active-project',
  preferences: 'meeting-scheduler-preferences',
};

interface BackupRequestMessage {
  type: 'CDFA_BACKUP_REQUEST';
  action: 'EXPORT_DATA';
  toolId: string;
}

interface RestoreRequestMessage {
  type: 'CDFA_RESTORE_REQUEST';
  action: 'IMPORT_DATA';
  toolId: string;
  data: Record<string, unknown>;
}

/**
 * Collect all localStorage data for backup
 */
function collectBackupData(): Record<string, unknown> {
  const data: Record<string, unknown> = {};

  // Collect projects
  const projects = localStorage.getItem(STORAGE_KEYS.projects);
  if (projects) {
    try {
      data.projects = JSON.parse(projects);
    } catch (e) {
      console.error('Failed to parse projects for backup:', e);
    }
  }

  // Collect active project ID
  const activeProjectId = localStorage.getItem(STORAGE_KEYS.activeProjectId);
  if (activeProjectId) {
    data.activeProjectId = activeProjectId;
  }

  // Collect preferences
  const preferences = localStorage.getItem(STORAGE_KEYS.preferences);
  if (preferences) {
    try {
      data.preferences = JSON.parse(preferences);
    } catch (e) {
      console.error('Failed to parse preferences for backup:', e);
    }
  }

  return data;
}

/**
 * Restore data from backup
 */
function restoreBackupData(data: Record<string, unknown>): boolean {
  try {
    if (data.projects) {
      localStorage.setItem(STORAGE_KEYS.projects, JSON.stringify(data.projects));
    }

    if (data.activeProjectId && typeof data.activeProjectId === 'string') {
      localStorage.setItem(STORAGE_KEYS.activeProjectId, data.activeProjectId);
    }

    if (data.preferences) {
      localStorage.setItem(STORAGE_KEYS.preferences, JSON.stringify(data.preferences));
    }

    return true;
  } catch (e) {
    console.error('Failed to restore backup data:', e);
    return false;
  }
}

/**
 * Initialize the backup bridge listener
 */
export function initializeBackupBridge(): () => void {
  const handleMessage = (event: MessageEvent) => {
    const data = event.data;

    // Handle backup request
    if (data?.type === 'CDFA_BACKUP_REQUEST' && data?.action === 'EXPORT_DATA') {
      const request = data as BackupRequestMessage;

      const backupData = collectBackupData();

      // Send response back to Hub
      const response = {
        type: 'CDFA_BACKUP_RESPONSE',
        toolId: request.toolId,
        toolName: 'Meeting Scheduler',
        data: backupData,
      };

      // Send to parent window (Hub)
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(response, '*');
      }

      // Also try event source
      if (event.source && typeof (event.source as Window).postMessage === 'function') {
        (event.source as Window).postMessage(response, '*');
      }
    }

    // Handle restore request
    if (data?.type === 'CDFA_RESTORE_REQUEST' && data?.action === 'IMPORT_DATA') {
      const request = data as RestoreRequestMessage;

      const success = restoreBackupData(request.data);

      // Send response back to Hub
      const response = {
        type: 'CDFA_RESTORE_RESPONSE',
        toolId: request.toolId,
        success,
      };

      // Send to parent window (Hub)
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(response, '*');
      }

      // Also try event source
      if (event.source && typeof (event.source as Window).postMessage === 'function') {
        (event.source as Window).postMessage(response, '*');
      }

      // Reload the page to apply restored data
      if (success) {
        window.location.reload();
      }
    }
  };

  window.addEventListener('message', handleMessage);

  return () => {
    window.removeEventListener('message', handleMessage);
  };
}
