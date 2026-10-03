// outbox.ts — device-side queue for field submissions made without connectivity.
//
// Volunteers record deliveries, assessments and incidents in places where the
// network drops. When a submission cannot reach the server it is stored here
// (localStorage) and replayed in order once the connection returns.
//
// Safety of replays: a request whose response was lost may already have been
// applied. Assessments and incidents carry a clientRef the server de-duplicates
// on; deliveries are naturally idempotent (a household can only be delivered
// once — a repeat returns 409, which we treat as "already done").
//
// Items belong to the user who created them and are only sent from that user's
// session, so a shared phone never submits one person's work as another's.

export type OutboxKind = 'delivery' | 'assessment' | 'incident';

export interface OutboxItem {
  id: string;
  userId: string;
  kind: OutboxKind;
  url: string;
  body: unknown;
  label: string;            // human description shown in the sync banner
  createdAt: string;
  attempts: number;
  lastError?: string;
}

export interface SettledItem extends OutboxItem {
  settledAt: string;
  outcome: 'rejected' | 'already-done';
  reason: string;
}

export interface OutboxState {
  items: OutboxItem[];      // waiting to be sent
  settled: SettledItem[];   // could not be applied — shown to the user until dismissed
}

// What the transport throws when a request fails
export class OutboxNetworkError extends Error {}
export class OutboxHttpError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}

export interface OutboxTransport {
  post(url: string, body: unknown): Promise<unknown>;
}

export interface OutboxStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface FlushResult {
  sent: OutboxItem[];
  settled: SettledItem[];
  remaining: number;
}

export const OUTBOX_STORAGE_KEY = 'rema_outbox_v1';

// Server is unreachable or overloaded — keep the item and try again later
function isTransient(err: unknown): boolean {
  if (err instanceof OutboxNetworkError) return true;
  if (err instanceof OutboxHttpError) {
    return err.status >= 500 || err.status === 408 || err.status === 429 || err.status === 401;
  }
  return true;
}

export function createOutbox(deps: {
  storage: OutboxStorage;
  transport: OutboxTransport;
  newId?: () => string;
  now?: () => Date;
}) {
  const { storage, transport } = deps;
  const newId = deps.newId ?? (() => crypto.randomUUID());
  const now = deps.now ?? (() => new Date());
  const listeners = new Set<() => void>();
  let flushing: Promise<FlushResult> | null = null;

  function read(): OutboxState {
    try {
      const raw = storage.getItem(OUTBOX_STORAGE_KEY);
      if (!raw) return { items: [], settled: [] };
      const parsed = JSON.parse(raw) as Partial<OutboxState>;
      return { items: parsed.items ?? [], settled: parsed.settled ?? [] };
    } catch {
      return { items: [], settled: [] };
    }
  }

  // snapshot only changes identity when written, so React's useSyncExternalStore is happy
  let snapshot = read();

  function write(state: OutboxState) {
    snapshot = state;
    storage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(state));
    listeners.forEach((l) => l());
  }

  function enqueue(input: Pick<OutboxItem, 'userId' | 'kind' | 'url' | 'body' | 'label'>): OutboxItem {
    const item: OutboxItem = { ...input, id: newId(), createdAt: now().toISOString(), attempts: 0 };
    const state = read();
    write({ ...state, items: [...state.items, item] });
    return item;
  }

  async function runFlush(userId: string): Promise<FlushResult> {
    const result: FlushResult = { sent: [], settled: [], remaining: 0 };

    for (;;) {
      const next = read().items.find((i) => i.userId === userId);
      if (!next) break;

      try {
        await transport.post(next.url, next.body);
        const state = read();
        write({ ...state, items: state.items.filter((i) => i.id !== next.id) });
        result.sent.push(next);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';

        if (isTransient(err)) {
          // stop here; order is preserved for the next attempt
          const state = read();
          write({
            ...state,
            items: state.items.map((i) => (i.id === next.id ? { ...i, attempts: i.attempts + 1, lastError: message } : i)),
          });
          break;
        }

        // The server refused it for good (e.g. the run was closed while offline).
        // A delivery refused with 409 means the household is already delivered —
        // most likely by an earlier attempt of this same request.
        const alreadyDone = next.kind === 'delivery' && err instanceof OutboxHttpError && err.status === 409;
        const settled: SettledItem = {
          ...next,
          attempts: next.attempts + 1,
          settledAt: now().toISOString(),
          outcome: alreadyDone ? 'already-done' : 'rejected',
          reason: message,
        };
        const state = read();
        write({
          items: state.items.filter((i) => i.id !== next.id),
          settled: [...state.settled, settled],
        });
        result.settled.push(settled);
      }
    }

    result.remaining = read().items.filter((i) => i.userId === userId).length;
    return result;
  }

  return {
    enqueue,

    /** Sends this user's queued items in order. Only one flush runs at a time. */
    flush(userId: string): Promise<FlushResult> {
      if (!flushing) {
        flushing = runFlush(userId).finally(() => {
          flushing = null;
          listeners.forEach((l) => l());
        });
        listeners.forEach((l) => l());
      }
      return flushing;
    },

    isFlushing: () => flushing !== null,

    getSnapshot: () => snapshot,

    pendingFor: (userId: string) => snapshot.items.filter((i) => i.userId === userId),
    settledFor: (userId: string) => snapshot.settled.filter((i) => i.userId === userId),

    dismissSettled(id: string) {
      const state = read();
      write({ ...state, settled: state.settled.filter((i) => i.id !== id) });
    },

    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
  };
}

export type Outbox = ReturnType<typeof createOutbox>;
