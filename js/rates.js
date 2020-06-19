async function getRates() {
  const response = await fetch('https://api.exchangeratesapi.io/latest')
    .then(res => res.json())
    .catch(err => console.log(err));
  
    return response;
}

export default getRates();