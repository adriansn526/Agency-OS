const id = '6d4567008dca1eafefc79b776';
fetch(`http://localhost:3000/api/suppliers/${id}`)
  .then(res => res.json())
  .then(data => console.log(JSON.stringify(data, null, 2)))
  .catch(console.error);
