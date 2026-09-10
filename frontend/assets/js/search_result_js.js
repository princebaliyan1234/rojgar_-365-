async function fetchWorkers(
  trade,
  locality,
  lat = null,
  lon = null,
  proximity = null
) {
  let url =
    `${API_BASE_URL}/search?trade=${encodeURIComponent(trade)}&locality=${encodeURIComponent(locality)}`;

  if (lat !== null && lon !== null) {
    url += `&lat=${lat}&lon=${lon}&proximity=${proximity}`;
  }

  const response = await fetch(url);

  if (!response.ok) {
    console.error(
      "Search request failed:",
      response.status
    );

    return [];
  }

  return await response.json();
}


function renderWorkers(
  list,
  requestedProximity = null
) {
  const container =
    document.getElementById("resultsContainer");

  container.innerHTML = "";


  // =========================
  // NO WORKERS
  // =========================

  if (list.length === 0) {
    const message =
      document.createElement("p");

    message.textContent =
      getTranslation("noWorkersFound");

    container.appendChild(message);

    return;
  }


  // =========================
  // PROXIMITY FALLBACK
  // =========================

  const isFallback =
    requestedProximity !== null &&
    list.length === 1 &&
    list[0].distance_km > requestedProximity;

  if (isFallback) {
    const notice =
      document.createElement("p");

    notice.textContent =
      getTranslation("proximityFallback")
        .replace(
          "{distance}",
          requestedProximity
        );

    container.appendChild(notice);
  }


  // =========================
  // WORKER CARDS
  // =========================

  const template =
    document.getElementById(
      "workerCardTemplate"
    );

  list.forEach(w => {
    const card =
      template.content.cloneNode(true);


    // =========================
    // PHOTO
    // =========================

    const img =
      card.querySelector(".worker-photo");

    img.src =
      w.photo_url
        ? `${API_BASE_URL}${w.photo_url}`
        : "https://placehold.co/80";

    img.onerror = () => {
      img.src =
        "https://placehold.co/80";
    };


    // =========================
    // WORKER INFO
    // =========================

    card.querySelector(
      ".worker-name"
    ).textContent = w.name;

    card.querySelector(
      ".worker-trade"
    ).textContent = w.trade;

    card.querySelector(
      ".worker-locality"
    ).textContent = w.locality;


    // =========================
    // RATING
    // =========================

    card.querySelector(
      ".rating-value"
    ).textContent = w.rating_avg;

    card.querySelector(
      ".rating-count"
    ).textContent =
      w.review_count > 0
        ? `(${w.review_count})`
        : "";


    // =========================
    // PRICE
    // =========================

    card.querySelector(
      ".price-value"
    ).textContent =
      w.price != null
        ? `₹${w.price}`
        : getTranslation("priceNotSet");


    // =========================
    // KYC BADGE
    // =========================

    const badge =
      card.querySelector(
        ".worker-verified-badge"
      );

    if (w.kyc_status === "approved") {
      badge.textContent =
        getTranslation(
          "cooperativeVerified"
        );

      badge.style.display =
        "inline-flex";

    } else {
      badge.textContent = "";

      badge.style.display =
        "none";
    }


    // =========================
    // BOOK NOW
    // =========================

    const bookBtn =
      card.querySelector(
        ".book-now-btn"
      );

    bookBtn.textContent =
      getTranslation("bookNow");

    bookBtn.addEventListener(
      "click",
      () => {
        window.location.href =
          `workerprofile.html?worker_id=${w.id}`;
      }
    );


    container.appendChild(card);
  });
}


// =========================
// SEARCH BUTTON
// =========================

document.getElementById(
  "searchBtn"
).addEventListener(
  "click",
  async () => {

    const trade =
      document.getElementById(
        "serviceInput"
      ).value
        .toLowerCase()
        .trim();

    const locality =
      document.getElementById(
        "localityInput"
      ).value.trim();

    const nearby =
      document.getElementById(
        "proximityToggle"
      ).checked;


    // =========================
    // PROXIMITY SEARCH
    // =========================

    if (nearby) {

      if (!navigator.geolocation) {
        alert(
          getTranslation(
            "proximityUnavailable"
          )
        );

        const workers =
          await fetchWorkers(
            trade,
            locality
          );

        renderWorkers(workers);

        return;
      }


      navigator.geolocation.getCurrentPosition(

        async (position) => {

          const lat =
            position.coords.latitude;

          const lon =
            position.coords.longitude;

          const workers =
            await fetchWorkers(
              trade,
              locality,
              lat,
              lon,
              20
            );

          renderWorkers(workers);
        },


        async (error) => {

          console.error(
            "Location error:",
            error
          );

          alert(
            getTranslation(
              "locationDenied"
            )
          );

          const workers =
            await fetchWorkers(
              trade,
              locality
            );

          renderWorkers(workers);
        }

      );

    } else {

      // =========================
      // NORMAL SEARCH
      // =========================

      const workers =
        await fetchWorkers(
          trade,
          locality
        );

      renderWorkers(workers);
    }
  }
);


// =========================
// APPLY SAVED LANGUAGE
// =========================

applyLanguage(selectedLanguage);