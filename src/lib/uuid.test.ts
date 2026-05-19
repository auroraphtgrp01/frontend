import { describe, expect, it, vi } from 'vitest'
import { clientUUID } from './uuid'

describe('clientUUID', () => {
  it('falls back when crypto.randomUUID is unavailable', () => {
    const originalCrypto = globalThis.crypto
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: {
        getRandomValues: (bytes: Uint8Array) => {
          bytes.fill(1)
          return bytes
        },
      },
    })

    expect(clientUUID()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    )

    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: originalCrypto,
    })
  })

  it('uses crypto.randomUUID when available', () => {
    const randomUUID = vi.fn(() => '71a65774-71a0-4d54-89bb-df89ab63748d')
    const originalCrypto = globalThis.crypto
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: { randomUUID },
    })

    expect(clientUUID()).toBe('71a65774-71a0-4d54-89bb-df89ab63748d')
    expect(randomUUID).toHaveBeenCalledTimes(1)

    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: originalCrypto,
    })
  })
})
