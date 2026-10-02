import { Request, Response } from 'express';
import { generateAiBrief } from '../services/ai.service';

// ─── POST /api/ai/brief ───────────────────────────────────────────────────────
// Requires EMERGENCY_COORDINATOR or SUPER_ADMIN (enforced in routes).
// Read-only: reads aggregate dashboard state, calls Anthropic API.
// No database writes. No system actions triggered.

export async function postAiBrief(req: Request, res: Response): Promise<void> {
  try {
    const result = await generateAiBrief();
    res.status(200).json(result);
  } catch (err) {
    // Always return 503 — caller shows graceful fallback, not a crash.
    // The underlying error (DB / upstream API) is logged, not sent to the client.
    console.error('[ai-brief]', err);
    res.status(503).json({ error: 'AI Brief temporarily unavailable' });
  }
}