// Server-side session store (module-level singleton, lives for the lifetime of the Next.js process)
import type { SessionState } from "./types";

// Map from session_id -> session state
const sessions = new Map<string, SessionState>();

export function getSession(sessionId: string): SessionState | undefined {
  return sessions.get(sessionId);
}

export function setSession(sessionId: string, state: SessionState): void {
  sessions.set(sessionId, state);
}

export function deleteSession(sessionId: string): boolean {
  return sessions.delete(sessionId);
}

export function getOrCreateSession(
  sessionId: string,
  restaurantId: string,
  restaurantName: string,
  language: string,
): SessionState {
  const existing = sessions.get(sessionId);

  // If session exists for a DIFFERENT restaurant, fully reset it
  if (existing && existing.restaurant_id !== restaurantId) {
    sessions.delete(sessionId);
  }

  if (!sessions.has(sessionId)) {
    const newSession: SessionState = {
      restaurant_id: restaurantId,
      restaurant_name: restaurantName,
      language,
      current_order: null,
      conversation_history: [],
    };
    sessions.set(sessionId, newSession);
    return newSession;
  }

  // Update language if changed
  const session = sessions.get(sessionId)!;
  session.language = language;
  return session;
}

export function nextOrderId(): string {
  const now = new Date();
  const ts = now
    .toISOString()
    .replace(/[-T:.Z]/g, "")
    .slice(0, 14);
  return `VORD${ts}`;
}

export function nextBillNumber(restaurantId: string): string {
  const ts = new Date()
    .toISOString()
    .replace(/[-T:.Z]/g, "")
    .slice(0, 14);
  return `BILL-${restaurantId}-V${ts}`;
}
