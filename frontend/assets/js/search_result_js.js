async function fetchWorkers(trade, locality, lat = null, lon = null, proximity = null) {
  let url = `${API_BASE_URL}/search?trade=${encodeURIComponent(trade)}&locality=${encodeURIComponent(locality)}`;
  if (lat !== null && lon !== null) {
    url += `&lat=${lat}&lon=${lon}&proximity=${proximity}`;
  }
  const response = await fetch(url);
  if (!response.ok) {
    console.error("Search request failed:", response.status);
    return [];
  }
  return await response.json();
}

function renderWorkers(list, requestedProximity = null) {
  const container = document.getElementById("resultsContainer");
  container.innerHTML = "";

  if (list.length === 0) {
    container.innerHTML = "<p>No workers found.</p>";
    return;
  }

  const isFallback =
    requestedProximity !== null &&
    list.length === 1 &&
    list[0].distance_km > requestedProximity;

  if (isFallback) {
    const notice = document.createElement("p");
    notice.textContent = `No workers within ${requestedProximity}km — showing the nearest match instead:`;
    container.appendChild(notice);
  }

  const template = document.getElementById("workerCardTemplate");

  list.forEach(w => {
    const card = template.content.cloneNode(true);

    const img = card.querySelector(".worker-photo");
    img.src = w.photo_urls?.[0] || "https://placehold.co/80";
    img.onerror = () => { img.src = "https://placehold.co/80"; };
    card.querySelector(".worker-name").textContent = w.name;
    card.querySelector(".worker-trade").textContent = w.trade;
    card.querySelector(".worker-locality").textContent = w.locality;
    card.querySelector(".rating-value").textContent = w.rating_avg;
    card.querySelector(".rating-count").textContent = w.review_count > 0 ? `(${w.review_count})` : "";
    card.querySelector(".price-value").textContent = `₹${w.price}`;

    const bookBtn = card.querySelector(".book-now-btn");
    bookBtn.addEventListener("click", () => alert(`Booking ${w.name} - ₹${w.price}`));

    container.appendChild(card);
  });
}

document.getElementById("searchBtn").addEventListener("click", async () => {
  const trade = document.getElementById("serviceInput").value.toLowerCase().trim();
  const locality = document.getElementById("localityInput").value.trim();
  const nearby = document.getElementById("proximityToggle").checked;

  if (nearby) {
    if (!navigator.geolocation) {
      alert("Your browser doesn't support location — proximity search unavailable.");
      const workers = await fetchWorkers(trade, locality, lat, lon, 20);
      renderWorkers(workers, 20);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        const workers = await fetchWorkers(trade, locality, lat, lon, 20);
        renderWorkers(workers);
      },
      async (error) => {
        alert("Location access denied — showing all matches instead.");
        const workers = await fetchWorkers(trade, locality);
        renderWorkers(workers);
      }
    );
  } else {
    const workers = await fetchWorkers(trade, locality);
    renderWorkers(workers);
  }
});