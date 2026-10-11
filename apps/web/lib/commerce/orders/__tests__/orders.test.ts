/** Run with: npx tsx --test lib/commerce/orders/__tests__/*.test.ts */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { OrderInputError, parseOrderInput } from '../../storefront/orders'
import { partnerMessage } from '../admin'

const base = (items: unknown[]) => ({
  customer: { name: 'Ion Popescu', phone: '0722000111', email: 'ion@example.com' },
  shipping: { county: 'Cluj', city: 'Cluj-Napoca', address: 'Str. Client 7' }, paymentMethod: 'cod', items,
})
const P = 'cmv3lnldy0000mbsliu1ci7cl'
const svc = (over: object = {}) => ({ partnerId: P, type: 'paint', paintCode: '3H2 Rosu', ...over })
const fails = (items: unknown[], re: RegExp) => assert.throws(() => parseOrderInput(base(items)), (e) => e instanceof OrderInputError && re.test(e.message))

test('plain items still merge; service lines stay separate with quantity 1', () => {
  const r = parseOrderInput(base([{ slug: 'a-1', quantity: 1 }, { slug: 'a-1', quantity: 2 }, { slug: 'b-2', quantity: 1, service: svc() }, { slug: 'b-2', quantity: 1, service: svc() }]))
  assert.deepEqual(r.items.map((i) => [i.slug, i.quantity, !!i.service]), [['a-1', 3, false], ['b-2', 1, true], ['b-2', 1, true]])
})
test('service parsing: paint code required for paint and paint_mount, ignored for mount', () => {
  fails([{ slug: 'a-1', quantity: 1, service: { partnerId: P, type: 'paint' } }], /codul de vopsea/)
  fails([{ slug: 'a-1', quantity: 1, service: { partnerId: P, type: 'paint_mount' } }], /codul de vopsea/)
  const m = parseOrderInput(base([{ slug: 'a-1', quantity: 1, service: { partnerId: P, type: 'mount', paintCode: 'IGNORED' } }]))
  assert.equal(m.items[0]!.service!.paintCode, null)
})
test('service parsing: bad type, partner id, quantity, VIN, paint code', () => {
  fails([{ slug: 'a-1', quantity: 1, service: svc({ type: 'wash' }) }], /Tipul serviciului/)
  fails([{ slug: 'a-1', quantity: 1, service: svc({ partnerId: 'x' }) }], /Service-ul ales/)
  fails([{ slug: 'a-1', quantity: 1, service: svc({ partnerId: "a'; drop table" }) }], /Service-ul ales/)
  fails([{ slug: 'a-1', quantity: 2, service: svc() }], /cantitatea 1/)
  fails([{ slug: 'a-1', quantity: 1, service: svc({ vin: 'WVWZZZ1JZXW00000' }) }], /VIN/)
  fails([{ slug: 'a-1', quantity: 1, service: svc({ vin: 'WVWZZZ1JZXW00000I' }) }], /VIN/) // I is not allowed in a VIN
  fails([{ slug: 'a-1', quantity: 1, service: svc({ paintCode: '<script>' }) }], /codul de vopsea|Codul de vopsea/)
  fails([{ slug: 'a-1', quantity: 1, service: 'paint' }], /Serviciul de pe linia/)
  const ok = parseOrderInput(base([{ slug: 'a-1', quantity: 1, service: svc({ vin: 'wvwzzz1jzxw000001', paintCode: ' LC9Z ' }) }]))
  assert.equal(ok.items[0]!.service!.vin, 'WVWZZZ1JZXW000001')
  assert.equal(ok.items[0]!.service!.paintCode, 'LC9Z')
})
test('a client-sent price is never part of the parsed order', () => {
  const r = parseOrderInput(base([{ slug: 'a-1', quantity: 1, service: { ...svc(), price: 1, priceRon: 1, settlementRon: 0 } }]))
  assert.deepEqual(Object.keys(r.items[0]!.service!).sort(), ['paintCode', 'partnerId', 'type', 'vin'])
})
test('partner message carries what the garage needs and nothing about money owed to others', () => {
  const m = partnerMessage({ name: 'Ion Popescu', phone: '0722000111' }, { name: 'Service A' },
    [{ service: 'paint_mount', forProductName: 'Bară spate Alfa 145', paintCode: '3H2', vin: null, settlementRon: 450 }], [{ name: 'Bară spate Alfa 145', sku: '066403390' }], 'EC-000012')
  assert.match(m, /EC-000012/); assert.match(m, /Vopsire \+ montaj/); assert.match(m, /cod vopsea 3H2/); assert.match(m, /066403390/); assert.match(m, /0722000111/); assert.match(m, /tarif 450\.00 RON/)
})
