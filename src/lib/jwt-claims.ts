/**
 * Decode JWT payload (no signature verify — SPA uses this for routing headers only).
 */
export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.')
    if (parts.length < 2) return null
    const segment = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = segment + '='.repeat((4 - (segment.length % 4)) % 4)
    const json = atob(padded)
    return JSON.parse(json) as Record<string, unknown>
  } catch {
    return null
  }
}
