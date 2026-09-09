function getWorkerIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get("worker_id");
}


async function loadWorker() {
    const workerId = getWorkerIdFromUrl();

    if (!workerId) {
        document.getElementById("loading").style.display = "none";
        document.getElementById("error").style.display = "block";
        document.getElementById("error").textContent =
            "No worker specified.";
        return;
    }

    try {
        const response = await fetch(
            `${API_BASE_URL}/workers/${workerId}`
        );

        if (!response.ok) {
            throw new Error(
                `Worker request failed: ${response.status}`
            );
        }

        const worker = await response.json();

        renderWorker(worker);

    } catch (error) {
        document.getElementById("loading").style.display = "none";
        document.getElementById("error").style.display = "block";
        document.getElementById("error").textContent =
            "Could not load worker details.";

        console.error(error);
    }
}


function renderWorker(worker) {

    document.getElementById("loading").style.display = "none";
    document.getElementById("prebooking").style.display = "block";

    document.getElementById("worker-name").textContent =
        worker.name;

    document.getElementById("worker-trade").textContent =
        worker.trade;

    document.getElementById("worker-rating").textContent =
        worker.rating_avg ?? 0;

    const badge = document.getElementById("worker-badge");

    if (worker.kyc_status === "approved") {
        badge.textContent = "✓ Cooperative Verified";
        badge.style.display = "inline-flex";
    } else {
        badge.textContent = "";
        badge.style.display = "none";
    }

    const photo = document.getElementById("worker-photo");

    photo.src =
        worker.photo_urls?.[0] ||
        "https://placehold.co/120";

    photo.onerror = () => {
        photo.src = "https://placehold.co/120";
    };


    // Mock contact actions

    document.getElementById("chat-btn").addEventListener("click", () => {
        document.getElementById("contact-message").textContent =
            "Chat opened (demo).";
    });

    document.getElementById("call-btn").addEventListener("click", () => {
        document.getElementById("contact-message").textContent =
            "Calling worker (demo).";
    });

    document.getElementById("video-btn").addEventListener("click", () => {
        document.getElementById("contact-message").textContent =
            "Video call started (demo).";
    });


    // Continue to booking

    document.getElementById("continue-btn").addEventListener("click", () => {
        window.location.href =
            `booking.html?worker_id=${worker.id}`;
    });
}


loadWorker();