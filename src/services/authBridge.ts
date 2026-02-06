// Auth Bridge - Listen for authentication from CDFA Hub parent window

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface AuthMessage {
  type: 'CDFA_AUTH';
  action: 'AUTH_STATE_CHANGED' | 'LOGOUT';
  payload: {
    user: AuthUser | null;
    idToken: string | null;
  };
}

export interface AuthRequest {
  type: 'CDFA_AUTH_REQUEST';
  action: 'REQUEST_AUTH_STATE';
}

type AuthCallback = (user: AuthUser | null, idToken: string | null) => void;

// Check if running in an iframe
export function isInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

// Auth bridge class for receiving auth from Hub
class AuthBridge {
  private callbacks: Set<AuthCallback> = new Set();
  private currentUser: AuthUser | null = null;
  private currentToken: string | null = null;
  private isListening = false;

  constructor() {
    this.handleMessage = this.handleMessage.bind(this);
  }

  private handleMessage(event: MessageEvent) {
    const data = event.data as AuthMessage;

    if (data?.type !== 'CDFA_AUTH') return;

    if (data.action === 'AUTH_STATE_CHANGED') {
      this.currentUser = data.payload.user;
      this.currentToken = data.payload.idToken;
      this.notifyCallbacks();
    } else if (data.action === 'LOGOUT') {
      this.currentUser = null;
      this.currentToken = null;
      this.notifyCallbacks();
    }
  }

  private notifyCallbacks() {
    this.callbacks.forEach(callback => {
      callback(this.currentUser, this.currentToken);
    });
  }

  startListening() {
    if (this.isListening) return;

    window.addEventListener('message', this.handleMessage);
    this.isListening = true;

    if (isInIframe()) {
      this.requestAuthState();
    }
  }

  stopListening() {
    if (!this.isListening) return;

    window.removeEventListener('message', this.handleMessage);
    this.isListening = false;
  }

  requestAuthState() {
    if (!isInIframe()) return;

    const request: AuthRequest = {
      type: 'CDFA_AUTH_REQUEST',
      action: 'REQUEST_AUTH_STATE',
    };

    try {
      window.parent.postMessage(request, '*');
    } catch (e) {
      console.warn('Failed to request auth state from parent:', e);
    }
  }

  onAuthChange(callback: AuthCallback): () => void {
    this.callbacks.add(callback);
    callback(this.currentUser, this.currentToken);
    return () => {
      this.callbacks.delete(callback);
    };
  }

  getUser(): AuthUser | null {
    return this.currentUser;
  }

  getToken(): string | null {
    return this.currentToken;
  }
}

export const authBridge = new AuthBridge();
