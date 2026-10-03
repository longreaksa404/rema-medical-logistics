import { describe, it, expect, beforeEach } from 'vitest';
import {
  createOutbox, OutboxHttpError, OutboxNetworkError, OUTBOX_STORAGE_KEY,
  type OutboxStorage, type OutboxTransport,
} from './outbox';

function memoryStorage(): OutboxStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => { data.set(k, v); } };
}

// transport whose responses are scripted per call
function scriptedTransport(responses: Array<'ok' | 'network' | number>) {
  const calls: Array<{ url: string; body: unknown }> = [];
  const transport: OutboxTransport = {
    async post(url, body) {
      calls.push({ url, body });
      const r = responses.shift() ?? 'ok';
      if (r === 'ok') return { ok: true };
      if (r === 'network') throw new OutboxNetworkError('Network Error');
      throw new OutboxHttpError(r, `HTTP ${r}`);
    },
  };
  return { transport, calls };
}

let ids = 0;
const newId = () => `id-${++ids}`;

const delivery = (userId = 'u1', label = 'Delivery · House 1') =>
  ({ userId, kind: 'delivery' as const, url: '/api/delivery/receipts', body: { householdId: label }, label });

beforeEach(() => { ids = 0; });

describe('outbox', () => {
  it('persists queued items in storage', () => {
    const storage = memoryStorage();
    const outbox = createOutbox({ storage, transport: scriptedTransport([]).transport, newId });
    outbox.enqueue(delivery());

    const reopened = createOutbox({ storage, transport: scriptedTransport([]).transport, newId });
    expect(reopened.pendingFor('u1')).toHaveLength(1);
    expect(JSON.parse(storage.data.get(OUTBOX_STORAGE_KEY)!).items[0].label).toBe('Delivery · House 1');
  });

  it('sends items in the order they were queued', async () => {
    const { transport, calls } = scriptedTransport(['ok', 'ok']);
    const outbox = createOutbox({ storage: memoryStorage(), transport, newId });
    outbox.enqueue(delivery('u1', 'first'));
    outbox.enqueue(delivery('u1', 'second'));

    const result = await outbox.flush('u1');
    expect(calls.map((c) => (c.body as { householdId: string }).householdId)).toEqual(['first', 'second']);
    expect(result.sent).toHaveLength(2);
    expect(outbox.pendingFor('u1')).toHaveLength(0);
  });

  it('keeps items and stops on a network error, preserving order', async () => {
    const { transport, calls } = scriptedTransport(['ok', 'network']);
    const outbox = createOutbox({ storage: memoryStorage(), transport, newId });
    outbox.enqueue(delivery('u1', 'a'));
    outbox.enqueue(delivery('u1', 'b'));
    outbox.enqueue(delivery('u1', 'c'));

    const result = await outbox.flush('u1');
    expect(calls).toHaveLength(2);                        // never tried 'c'
    expect(result.remaining).toBe(2);
    expect(outbox.pendingFor('u1').map((i) => i.label)).toEqual(['b', 'c']);
    expect(outbox.pendingFor('u1')[0]).toMatchObject({ attempts: 1, lastError: 'Network Error' });
  });

  it.each([500, 503, 408, 429, 401])('treats HTTP %i as temporary', async (status) => {
    const outbox = createOutbox({ storage: memoryStorage(), transport: scriptedTransport([status]).transport, newId });
    outbox.enqueue(delivery());
    await outbox.flush('u1');
    expect(outbox.pendingFor('u1')).toHaveLength(1);
    expect(outbox.settledFor('u1')).toHaveLength(0);
  });

  it('moves a permanently rejected item aside and continues with the rest', async () => {
    const { transport, calls } = scriptedTransport([400, 'ok']);
    const outbox = createOutbox({ storage: memoryStorage(), transport, newId });
    outbox.enqueue({ ...delivery('u1', 'closed run'), kind: 'incident' });
    outbox.enqueue(delivery('u1', 'fine'));

    await outbox.flush('u1');
    expect(calls).toHaveLength(2);
    expect(outbox.pendingFor('u1')).toHaveLength(0);
    expect(outbox.settledFor('u1')).toEqual([expect.objectContaining({ label: 'closed run', outcome: 'rejected', reason: 'HTTP 400' })]);
  });

  it('treats a 409 on a delivery as already done', async () => {
    const outbox = createOutbox({ storage: memoryStorage(), transport: scriptedTransport([409]).transport, newId });
    outbox.enqueue(delivery());
    await outbox.flush('u1');
    expect(outbox.settledFor('u1')[0].outcome).toBe('already-done');
  });

  it('only sends the signed-in user\'s items', async () => {
    const { transport, calls } = scriptedTransport(['ok']);
    const outbox = createOutbox({ storage: memoryStorage(), transport, newId });
    outbox.enqueue(delivery('alice', 'alice work'));
    outbox.enqueue(delivery('bob', 'bob work'));

    await outbox.flush('bob');
    expect(calls.map((c) => (c.body as { householdId: string }).householdId)).toEqual(['bob work']);
    expect(outbox.pendingFor('alice')).toHaveLength(1);
  });

  it('never runs two flushes at once', async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => { release = r; });
    let inFlight = 0;
    let maxInFlight = 0;
    const transport: OutboxTransport = {
      async post() {
        inFlight++; maxInFlight = Math.max(maxInFlight, inFlight);
        await gate;
        inFlight--;
      },
    };
    const outbox = createOutbox({ storage: memoryStorage(), transport, newId });
    outbox.enqueue(delivery());

    const a = outbox.flush('u1');
    const b = outbox.flush('u1');
    expect(a).toBe(b);
    release();
    await a;
    expect(maxInFlight).toBe(1);
  });

  it('lets the user dismiss a settled item', async () => {
    const outbox = createOutbox({ storage: memoryStorage(), transport: scriptedTransport([400]).transport, newId });
    outbox.enqueue(delivery());
    await outbox.flush('u1');
    outbox.dismissSettled(outbox.settledFor('u1')[0].id);
    expect(outbox.settledFor('u1')).toHaveLength(0);
  });

  it('survives corrupt storage', () => {
    const storage = memoryStorage();
    storage.setItem(OUTBOX_STORAGE_KEY, '{not json');
    const outbox = createOutbox({ storage, transport: scriptedTransport([]).transport, newId });
    expect(outbox.pendingFor('u1')).toEqual([]);
  });
});
