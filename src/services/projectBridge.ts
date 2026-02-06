import type { EventConfig } from '../types';

// Message types for CDFA Hub project creation communication
interface CreateProjectMessage {
  type: 'CDFA_PROJECT';
  action: 'CREATE_PROJECT';
  payload: {
    name: string;
    cdfaActivityId: string;
    fiscalYear?: string;
    startDate?: string;
    endDate?: string;
    location?: string;
  };
}

interface ProjectResultMessage {
  type: 'CDFA_PROJECT_RESULT';
  success: boolean;
  projectId?: string;
  shareId?: string;
  error?: string;
}

type CreateProjectCallback = (
  name: string,
  options: { cdfaActivityId: string; fiscalYear?: string }
) => { id: string; shareId?: string } | undefined;

type SetEventConfigCallback = (config: EventConfig) => void;

/**
 * Initialize the project bridge listener
 * Listens for CDFA_PROJECT messages from the parent Hub and creates linked projects
 */
export function initializeProjectBridge(
  onCreateProject: CreateProjectCallback,
  onSetEventConfig: SetEventConfigCallback
): () => void {
  const handleMessage = (event: MessageEvent) => {
    const data = event.data;

    // Validate message structure
    if (data?.type !== 'CDFA_PROJECT' || data?.action !== 'CREATE_PROJECT') {
      return;
    }

    const message = data as CreateProjectMessage;
    const { name, cdfaActivityId, fiscalYear, startDate, endDate, location } = message.payload;

    // Validate required fields
    if (!name || !cdfaActivityId) {
      sendResult(event, {
        type: 'CDFA_PROJECT_RESULT',
        success: false,
        error: 'Missing required fields: name and cdfaActivityId',
      });
      return;
    }

    try {
      // Create the project with CDFA activity link
      const project = onCreateProject(name, { cdfaActivityId, fiscalYear });

      if (!project) {
        sendResult(event, {
          type: 'CDFA_PROJECT_RESULT',
          success: false,
          error: 'Failed to create project',
        });
        return;
      }

      // Set default event config with dates from the activity
      const eventConfig: EventConfig = {
        id: crypto.randomUUID(),
        name,
        startDate: startDate || new Date().toISOString().split('T')[0],
        endDate: endDate || startDate || new Date().toISOString().split('T')[0],
        startTime: '09:00',
        endTime: '17:00',
        defaultMeetingDuration: 30,
        breaks: [],
        schedulingStrategy: 'efficient',
      };

      // Add location if provided
      if (location) {
        (eventConfig as EventConfig & { location?: string }).location = location;
      }

      onSetEventConfig(eventConfig);

      // Send success result
      sendResult(event, {
        type: 'CDFA_PROJECT_RESULT',
        success: true,
        projectId: project.id,
        shareId: project.shareId,
      });
    } catch (error) {
      sendResult(event, {
        type: 'CDFA_PROJECT_RESULT',
        success: false,
        error: error instanceof Error ? error.message : 'Project creation failed',
      });
    }
  };

  // Add the listener
  window.addEventListener('message', handleMessage);

  // Return cleanup function
  return () => {
    window.removeEventListener('message', handleMessage);
  };
}

/**
 * Send result back to the parent window
 */
function sendResult(event: MessageEvent, result: ProjectResultMessage): void {
  // Try to send to the event source first
  if (event.source && typeof event.source.postMessage === 'function') {
    (event.source as Window).postMessage(result, '*');
  }

  // Also try to send to parent window if we're in an iframe
  if (window.parent && window.parent !== window) {
    window.parent.postMessage(result, '*');
  }
}

/**
 * Check if the app is running inside an iframe
 */
export function isInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true; // If accessing window.top throws, we're in an iframe with different origin
  }
}
