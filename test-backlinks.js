const target = "inchideriterase.ro";
const limit = 10;
const auth = "Basic YXNuc21hcmtldGluZ0BnbWFpbC5jb206NzIzNmUyNWM5YzRmYTViNg==";

async function test() {
  const res = await fetch('https://api.dataforseo.com/v3/backlinks/backlinks/live', {
    method: 'POST',
    headers: {
      'Authorization': auth,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify([{ target, limit, order_by: ['rank,desc'] }])
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

test();
