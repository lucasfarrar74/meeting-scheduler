import type { Supplier } from '../types';

// Message types for CDFA Hub communication
interface ImportMessage {
  type: 'CDFA_IMPORT';
  action: 'IMPORT_SUPPLIERS';
  payload: {
    suppliers: Supplier[];
    mode: 'replace' | 'merge';
  };
}

interface ImportResultMessage {
  type: 'CDFA_IMPORT_RESULT';
  success: boolean;
  importedCount: number;
  error?: string;
}

type ImportCallback = (suppliers: Supplier[]) => void;

/**
 * Initialize the import bridge listener
 * Listens for CDFA_IMPORT messages from the parent Hub and calls the provided callback
 */
export function initializeImportBridge(onImport: ImportCallback): () => void {
  const handleMessage = (event: MessageEvent) => {
    const data = event.data;

    // Validate message structure
    if (data?.type !== 'CDFA_IMPORT' || data?.action !== 'IMPORT_SUPPLIERS') {
      return;
    }

    const message = data as ImportMessage;
    const { suppliers } = message.payload;

    // Validate suppliers array
    if (!Array.isArray(suppliers) || suppliers.length === 0) {
      sendResult(event, {
        type: 'CDFA_IMPORT_RESULT',
        success: false,
        importedCount: 0,
        error: 'No valid suppliers provided',
      });
      return;
    }

    // Validate supplier structure
    const validSuppliers = suppliers.filter(
      (s) =>
        s &&
        typeof s.companyName === 'string' &&
        s.companyName.trim() !== '' &&
        s.primaryContact &&
        typeof s.primaryContact.name === 'string'
    );

    if (validSuppliers.length === 0) {
      sendResult(event, {
        type: 'CDFA_IMPORT_RESULT',
        success: false,
        importedCount: 0,
        error: 'No valid suppliers found (must have companyName and primaryContact.name)',
      });
      return;
    }

    try {
      // Call the import callback
      onImport(validSuppliers);

      // Send success result
      sendResult(event, {
        type: 'CDFA_IMPORT_RESULT',
        success: true,
        importedCount: validSuppliers.length,
      });
    } catch (error) {
      sendResult(event, {
        type: 'CDFA_IMPORT_RESULT',
        success: false,
        importedCount: 0,
        error: error instanceof Error ? error.message : 'Import failed',
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
function sendResult(event: MessageEvent, result: ImportResultMessage): void {
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
