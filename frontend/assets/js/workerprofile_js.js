function getWorkerIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get("worker_id");
}


async function loadWorkerProfile() {
    const workerId = getWorkerIdFromUrl();

    if (!workerId) {
        document.getElementById("loading").style.display = "none";
        document.getElementById("error").style.display = "block";

        document.getElementById("error").textContent =
            "No worker specified.";

        return;
    }

    try {
        const response =
            await fetch(`${API_BASE_URL}/workers/${workerId}`);

        if (!response.ok) {
            throw new Error(
                `Worker not found (status ${response.status})`
            );
        }

        const worker =
            await response.json();

        renderProfile(worker);

        renderWorkerMap(worker);

        await loadReviews(workerId);

    } catch (err) {
        document.getElementById("loading").style.display =
            "none";

        document.getElementById("error").style.display =
            "block";

        document.getElementById("error").textContent =
            "Could not load worker profile.";

        console.error(err);
    }
}


function renderProfile(worker) {
    document.getElementById("loading").style.display =
        "none";

    document.getElementById("profile").style.display =
        "block";


    // =========================
    // BASIC WORKER INFORMATION
    // =========================

    document.getElementById(
        "profile-name"
    ).textContent =
        worker.name;

    document.getElementById(
        "profile-trade"
    ).textContent =
        worker.trade;


    // =========================
    // KYC BADGE
    // =========================

    document.getElementById(
        "profile-badge"
    ).textContent =
        worker.kyc_status === "approved"
            ? "✓ Cooperative Verified"
            : "";


    // =========================
    // UNION INFORMATION
    // =========================

    document.getElementById(
        "profile-union"
    ).textContent =
        worker.union_name || "";

    document.getElementById(
        "profile-district-union"
    ).textContent =
        worker.district_union_name || "";

    document.getElementById(
        "profile-state-union"
    ).textContent =
        worker.state_union_name || "";


    // =========================
    // PRICE
    // =========================

    document.getElementById(
        "profile-price"
    ).textContent =
        worker.price != null
            ? `₹${worker.price}/day`
            : "Price not set";


    // =========================
    // RATING
    // =========================

    document.getElementById(
        "profile-rating"
    ).textContent =
        worker.rating_avg ?? 0;

    document.getElementById(
        "profile-review-count"
    ).textContent =
        worker.review_count > 0
            ? `${worker.review_count} reviews`
            : "No reviews yet";


    // =========================
    // DESCRIPTION
    // =========================

    document.getElementById(
        "profile-description"
    ).textContent =
        worker.description ||
        "No description provided.";


    // =========================
    // WORKER PHOTOS
    // =========================

    const photosContainer =
        document.getElementById(
            "profile-photos"
        );

    photosContainer.innerHTML = "";

    (worker.photo_urls || []).forEach(
        (url) => {
            const img =
                document.createElement("img");

            img.src = url;
            img.alt = worker.name;

            photosContainer.appendChild(img);
        }
    );


    // =========================
    // MAIN PROFILE PHOTO
    // =========================

    if (
        worker.photo_urls &&
        worker.photo_urls.length > 0
    ) {
        document.getElementById(
            "profile-photo"
        ).src =
            worker.photo_urls[0];
    }


    // =========================
    // BOOK NOW
    // =========================

    document
        .getElementById("book-now-btn")
        .addEventListener(
            "click",
            () => {
                window.location.href =
                    `prebooking.html?worker_id=${worker.id}`;
            }
        );
}


function renderWorkerMap(worker) {
    const mapElement =
        document.getElementById(
            "worker-map"
        );

    const mapMessage =
        document.getElementById(
            "map-message"
        );


    // =========================
    // LOCATION CHECK
    // =========================

    if (
        worker.latitude == null ||
        worker.longitude == null
    ) {
        mapElement.style.display =
            "none";

        mapMessage.style.display =
            "block";

        mapMessage.textContent =
            "Worker location is not available.";

        return;
    }


    // =========================
    // LEAFLET CHECK
    // =========================

    if (typeof L === "undefined") {
        mapElement.style.display =
            "none";

        mapMessage.style.display =
            "block";

        mapMessage.textContent =
            "Map could not be loaded.";

        return;
    }


    // =========================
    // VALIDATE COORDINATES
    // =========================

    const latitude =
        Number(worker.latitude);

    const longitude =
        Number(worker.longitude);

    if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude)
    ) {
        mapElement.style.display =
            "none";

        mapMessage.style.display =
            "block";

        mapMessage.textContent =
            "Worker location is not available.";

        return;
    }


    // =========================
    // CREATE MAP
    // =========================

    const map =
        L.map("worker-map").setView(
            [latitude, longitude],
            14
        );


    // =========================
    // MAP TILES
    // =========================

    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            attribution:
                "© OpenStreetMap contributors"
        }
    ).addTo(map);


    // =========================
    // WORKER MARKER
    // =========================

    L.marker([
        latitude,
        longitude
    ])
        .addTo(map)
        .bindPopup(
            `<strong>${escapeHtml(worker.name)}</strong><br>${escapeHtml(worker.trade)}`
        )
        .openPopup();
}


async function loadReviews(workerId) {
    const reviewsContainer =
        document.getElementById(
            "reviews-container"
        );

    try {
        const response =
            await fetch(
                `${API_BASE_URL}/workers/${workerId}/reviews`
            );

        if (!response.ok) {
            throw new Error(
                "Could not load reviews."
            );
        }

        const reviews =
            await response.json();

        renderReviews(reviews);

    } catch (error) {
        console.error(
            "Review loading error:",
            error
        );

        reviewsContainer.innerHTML =
            "<p>Could not load reviews.</p>";
    }
}


function renderReviews(reviews) {
    const reviewsContainer =
        document.getElementById(
            "reviews-container"
        );

    reviewsContainer.innerHTML = "";

    if (
        !reviews ||
        reviews.length === 0
    ) {
        reviewsContainer.innerHTML =
            "<p>No reviews yet.</p>";

        return;
    }

    reviews.forEach(
        (review) => {
            const reviewCard =
                document.createElement("div");

            reviewCard.className =
                "review-card";


            // =========================
            // RATING STARS
            // =========================

            const stars =
                "★".repeat(review.rating) +
                "☆".repeat(5 - review.rating);


            // =========================
            // REVIEW CONTENT
            // =========================

            reviewCard.innerHTML = `
                <div class="review-rating">
                    ${stars}
                </div>

                <p class="review-text">
                    "${escapeHtml(review.review_text)}"
                </p>

                <p class="review-customer">
                    — ${escapeHtml(review.customer_name)}
                </p>
            `;

            reviewsContainer.appendChild(
                reviewCard
            );
        }
    );
}


function escapeHtml(text) {
    const div =
        document.createElement("div");

    div.textContent =
        text;

    return div.innerHTML;
}


loadWorkerProfile();