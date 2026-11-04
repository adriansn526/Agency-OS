import { describe, expect, it } from 'vitest'
import { buildMessages, isExpoToken } from '../push'

describe('partner push', () => {
  it('accepts only Expo push tokens', () => {
    expect(isExpoToken('ExponentPushToken[abcdefghijklmnop]')).toBe(true)
    expect(isExpoToken('ExpoPushToken[abcdefghijklmnop]')).toBe(true)
    expect(isExpoToken('fcm:APA91b...')).toBe(false)
    expect(isExpoToken('ExponentPushToken[]')).toBe(false)
    expect(isExpoToken(undefined)).toBe(false)
  })

  it('builds one message per distinct valid token', () => {
    const t = 'ExponentPushToken[abcdefghijklmnop]'
    const msgs = buildMessages([t, t, 'garbage'], { title: 'Cerere nouă', body: 'Instalații, Cluj', data: { requestId: 'r1' } })
    expect(msgs).toEqual([{ to: t, sound: 'default', title: 'Cerere nouă', body: 'Instalații, Cluj', data: { requestId: 'r1' } }])
  })
})
