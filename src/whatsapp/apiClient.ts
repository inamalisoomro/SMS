/**
 * whatsapp/apiClient.ts — Typed fetch wrapper for the SAMS WhatsApp Gateway.
 * Reads gateway URL and API key from settings. Never throws raw errors to UI.
 */

import type {
  GatewayMessageResult,
  GatewayEvent,
  GatewayTemplate,
  GatewayDiagnostics,
} from '../types';

const TIMEOUT_MS = 15_000;

export interface GatewayConfig {
  gatewayUrl: string; // e.g. http://localhost:3001
  apiKey: string;
}

export interface ApiError {
  ok: false;
  status: number;
  message: string;
  code?: string;
}

export type ApiResult<T> = { ok: true; data: T } | ApiError;

function getConfig(): GatewayConfig | null {
  try {
    const raw = localStorage.getItem('sams_settings');
    if (!raw) return null;
    const s = JSON.parse(raw) as Record<string, unknown>;
    const url = (s.whatsappGatewayUrl as string) || '';
    const key = (s.whatsappApiKey as string) || '';
    if (!url || !key) return null;
    return { gatewayUrl: url.replace(/\/$/, ''), apiKey: key };
  } catch {
    return null;
  }
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResult<T>> {
  const cfg = getConfig();
  if (!cfg) {
    return {
      ok: false,
      status: 0,
      message: 'WhatsApp gateway not configured. Please set the gateway URL and API key in Settings.',
      code: 'NOT_CONFIGURED',
    };
  }

  const url = `${cfg.gatewayUrl}/api/whatsapp${path}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': cfg.apiKey,
        ...(options.headers ?? {}),
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) {
      let message = `Gateway error (${response.status})`;
      try {
        const body = (await response.json()) as { message?: string; error?: string };
        message = body.message ?? body.error ?? message;
      } catch { /* ignore */ }
      return { ok: false, status: response.status, message };
    }

    const data = (await response.json()) as T;
    return { ok: true, data };
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      return { ok: false, status: 0, message: 'Gateway request timed out', code: 'TIMEOUT' };
    }
    if (err instanceof Error && err.name === 'AbortError') {
      return { ok: false, status: 0, message: 'Gateway request was aborted', code: 'ABORTED' };
    }
    const msg = err instanceof Error ? err.message : 'Network error';
    return { ok: false, status: 0, message: `Cannot reach gateway: ${msg}`, code: 'NETWORK_ERROR' };
  }
}

// ── Public API ──────────────────────────────────────────────────────────────

export async function checkGatewayHealth(): Promise<ApiResult<{ ok: boolean; mode: string; version: string }>> {
  const cfg = getConfig();
  if (!cfg) return { ok: false, status: 0, message: 'Not configured', code: 'NOT_CONFIGURED' };

  try {
    const response = await fetch(`${cfg.gatewayUrl}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return { ok: false, status: response.status, message: 'Gateway unreachable' };
    const data = await response.json() as { ok: boolean; mode: string; version: string };
    return { ok: true, data };
  } catch {
    return { ok: false, status: 0, message: 'Gateway unreachable', code: 'NETWORK_ERROR' };
  }
}

export async function sendMessages(
  messages: Array<{
    clientId: string;
    to: string;
    template: string;
    language: string;
    params: string[];
    dedupeKey: string;
    meta?: Record<string, unknown>;
  }>
): Promise<ApiResult<{ results: GatewayMessageResult[] }>> {
  return apiFetch('/messages', {
    method: 'POST',
    body: JSON.stringify({ messages }),
  });
}

export async function sendTextReply(to: string, text: string): Promise<ApiResult<{ result: string; messageId: string }>> {
  return apiFetch('/text', {
    method: 'POST',
    body: JSON.stringify({ to, text }),
  });
}

export async function fetchEvents(since: number, limit = 100): Promise<ApiResult<{ events: GatewayEvent[]; nextCursor: number; hasMore: boolean }>> {
  return apiFetch(`/events?since=${since}&limit=${limit}`);
}

export async function fetchTemplates(): Promise<ApiResult<{ templates: GatewayTemplate[] }>> {
  return apiFetch('/templates');
}

export async function fetchDiagnostics(): Promise<ApiResult<GatewayDiagnostics>> {
  return apiFetch('/diagnostics');
}

export async function sendTestMessage(to: string): Promise<ApiResult<{ result: string; messageId: string; mode: string }>> {
  return apiFetch('/test', {
    method: 'POST',
    body: JSON.stringify({ to }),
  });
}

export async function simulateMockInbound(from: string, text: string): Promise<ApiResult<{ result: string }>> {
  return apiFetch('/mock/inbound', {
    method: 'POST',
    body: JSON.stringify({ from, text }),
  });
}
