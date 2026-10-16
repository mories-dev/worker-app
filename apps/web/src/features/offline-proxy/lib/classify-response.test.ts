import { describe, expect, it } from 'vitest'
import { classifyResponse } from './classify-response.ts'

describe('classifyResponse', () => {
  it.each([
    ['sw-mock', false, 'sw-mock'],
    ['sw-mock', true, 'sw-mock'],
    ['sw-cache', true, 'sw-cache'],
    [null, true, 'network-via-sw'],
    [null, false, 'network'],
    ['something-else', false, 'network'],
  ] as const)('X-Served-By=%s, controlled=%s -> %s', (servedBy, controlled, expected) => {
    expect(classifyResponse(servedBy, controlled)).toBe(expected)
  })
})
