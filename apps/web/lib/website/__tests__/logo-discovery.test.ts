import { test } from 'node:test'
import assert from 'node:assert/strict'
import { extractLogoCandidates, isPrivateAddress, safeFetch } from '../logo-discovery'

test('logo <img> beats JSON-LD beats apple-touch-icon; urls are made absolute', () => {
  const html = `<html><head><link rel="apple-touch-icon" href="/icon.png"><script type="application/ld+json">{"@type":"Organization","logo":"https://x.ro/ld.png"}</script></head>
    <body><img src="/img/banner.jpg" alt="banner"><img class="site-logo" src="/img/logo.svg" alt="Firma logo"><img src="/partner-logo.png" alt="partner"></body></html>`
  assert.deepEqual(extractLogoCandidates(html, 'https://x.ro/'), ['https://x.ro/img/logo.svg', 'https://x.ro/ld.png', 'https://x.ro/icon.png'])
})
test('data URIs, javascript: and non-http urls are ignored', () => {
  assert.deepEqual(extractLogoCandidates('<img src="data:image/png;base64,AAA" alt="logo"><img src="javascript:x" alt="logo"><img src="ftp://a/logo.png" alt="logo">', 'https://x.ro'), [])
})
test('private and special addresses are refused', () => {
  for (const ip of ['127.0.0.1', '10.1.2.3', '192.168.0.9', '172.20.0.1', '169.254.169.254', '100.64.0.1', '::1', 'fe80::1', 'fd00::1', '::ffff:10.0.0.1', '0.0.0.0']) assert.equal(isPrivateAddress(ip), true, ip)
  for (const ip of ['8.8.8.8', '93.184.216.34', '2606:4700:4700::1111']) assert.equal(isPrivateAddress(ip), false, ip)
})
test('safeFetch refuses loopback, metadata and non-http targets without connecting', async () => {
  for (const u of ['http://127.0.0.1:1/', 'http://169.254.169.254/latest/meta-data', 'http://[::1]/', 'file:///etc/passwd', 'ftp://example.com/']) assert.equal(await safeFetch(u, { maxBytes: 1000 }), null, u)
})
