const workers = [
  { name: "Ramesh Kumar", service: "plumber", rating: 4.5, price: 850 },
  { name: "Suresh Verma", service: "electrician", rating: null, price: 700 },
  { name: "Anita Sharma", service: "bricklayer", rating: 4.8, price: 950 }
];

function renderWorkers(list) {
  const container = document.getElementById("resultsContainer");
  container.innerHTML = "";
  if (list.length === 0) {
    container.innerHTML = "<p>No workers found.</p>";
    return;
  }
  list.forEach(w => {
    const card = document.createElement("div");
    card.innerHTML = `
    <img src="https://placehold.co/80"alt="worker photo">
    <h3>${w.name}</h3>
      <p>${w.service}</p>
      ${w.rating ? `<p>Rating: ${w.rating}</p>` : ""}
      <p>Price: &#8377;${w.price}</p>
      <button class="book-now-btn" onclick="alert('Booking ${w.name}-&#8377;${w.price}')">Book Now</button>
    `;
    container.appendChild(card);
  });
}

document.getElementById("searchBtn").addEventListener("click", () => {
  const service = document.getElementById("serviceInput").value.toLowerCase().trim();
  const nearby = document.getElementByld("proximityToggle").checked;
  let filtered = workers.filter(w=> w.service.includes(service));
  if(nearby){
    filtered = filtered.slice(0,1)
  }
  renderWorkers(filtered);
});

renderWorkers(workers);
