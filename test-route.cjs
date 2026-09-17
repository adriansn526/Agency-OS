const { GET } = require('./apps/web/.next/server/app/api/accounting/report/csv/route.js');

async function test() {
  const req = {
    url: 'http://localhost/api/accounting/report/csv?month=2026-09',
    headers: {
      get: (k) => k === 'x-tenant-id' ? 'fb3603ea-93c5-4fa4-8815-1f59714d13b1' : null
    }
  };
  try {
    const res = await GET(req);
    console.log(res.status);
    const text = await res.text();
    console.log(text);
  } catch (e) {
    console.error('CRASH:', e);
  }
}
test();
