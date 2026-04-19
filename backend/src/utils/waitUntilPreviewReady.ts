/**
 * Poll until the Vite dev server is actually serving (not E2B's "closed port" HTML).
 *
 * Root URL often returns HTTP 200 with an error page while port 5175 is down — do not trust status < 500 alone.
 */

const E2B_ERROR_MARKERS = [
  'closed port',
  'connection refused',
  'no service running on port',
  'closed port error',
];

function looksLikeE2bPortError(html: string): boolean {
  const lower = html.slice(0, 12000).toLowerCase();
  return E2B_ERROR_MARKERS.some((m) => lower.includes(m));
}

async function tryVitePing(base: string): Promise<boolean | 'unknown'> {
  const pingUrl = `${base.replace(/\/$/, '')}/__vite_ping`;
  try {
    const res = await fetch(pingUrl, {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(15_000),
    });
    // E2B commonly returns 502 while nothing listens on 5175
    if (res.status >= 502 && res.status <= 504) return false;
    if (res.status === 200 || res.status === 204) return true;
    // Older Vite might not expose __vite_ping — fall through to root check
    if (res.status === 404) return 'unknown';
    return false;
  } catch {
    return false;
  }
}

async function tryRootLooksLikeApp(base: string): Promise<boolean> {
  const url = `${base.replace(/\/$/, '')}/`;
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(15_000),
    });
    if (res.status >= 500) return false;
    const text = await res.text();
    if (looksLikeE2bPortError(text)) return false;
    // Real Vite/React index usually has module script or vite client
    if (
      text.includes('/@vite/client') ||
      text.includes('@vite/client') ||
      text.includes('__vite') ||
      (text.includes('<!DOCTYPE') && text.includes('root') && !looksLikeE2bPortError(text))
    ) {
      return true;
    }
    return res.ok && !looksLikeE2bPortError(text);
  } catch {
    return false;
  }
}

/**
 * Returns true when preview is ready to load in an iframe.
 */
async function isPreviewReady(sandboxUrl: string): Promise<boolean> {
  const base = sandboxUrl.replace(/\/$/, '');

  const ping = await tryVitePing(base);
  if (ping === true) return true;
  if (ping === false) return false;

  // Ping missing or inconclusive — use root body heuristics
  return tryRootLooksLikeApp(base);
}

export async function waitUntilPreviewReady(
  sandboxUrl: string,
  options?: { maxMs?: number; intervalMs?: number }
): Promise<void> {
  const maxMs = options?.maxMs ?? 120_000;
  const intervalMs = options?.intervalMs ?? 2_000;
  const deadline = Date.now() + maxMs;

  while (Date.now() < deadline) {
    try {
      if (await isPreviewReady(sandboxUrl)) {
        console.log('[waitUntilPreviewReady] Preview is ready:', sandboxUrl);
        return;
      }
    } catch {
      /* network error — retry */
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new Error(
    `Preview did not become ready within ${maxMs}ms: ${sandboxUrl}`
  );
}
