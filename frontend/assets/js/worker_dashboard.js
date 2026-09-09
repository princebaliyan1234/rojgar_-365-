const workerId = sessionStorage.getItem("user_id");

const loading = document.getElementById("loading");
const errorBox = document.getElementById("error");
const dashboard = document.getElementById("dashboard");

const workerNameElement = document.getElementById("worker-name");
const workerTradeElement = document.getElementById("worker-trade");
const workerUnionElement = document.getElementById("worker-union");
const workerRatingElement = document.getElementById("worker-rating");

const currentPriceElement = document.getElementById("current-price");
const priceInput = document.getElementById("price-input");
const savePriceButton = document.getElementById("save-price-btn");
const priceMessage = document.getElementById("price-message");

const latitudeInput = document.getElementById("latitude-input");
const longitudeInput = document.getElementById("longitude-input");
const saveLocationButton = document.getElementById("save-location-btn");
const currentLocationButton =
    document.getElementById("use-current-location-btn");
const locationMessage = document.getElementById("location-message");

const bookingsContainer =
    document.getElementById("bookings-container");


function showError(message) {

    loading.style.display = "none";

    dashboard.style.display = "block";

    errorBox.textContent = message;

    errorBox.style.display = "block";
}


async function loadWorkerDashboard() {

    if (!workerId) {

        showError(
            "You are not logged in. Please log in as a worker."
        );

        return;
    }

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/workers/${workerId}`
            );

        const workerData =
            await response.json();

        if (!response.ok) {

            throw new Error(
                workerData.detail ||
                "Could not load worker profile."
            );
        }


        console.log(
            "Worker profile:",
            workerData
        );


        renderDashboard(workerData);


        await loadBookings();


        loading.style.display = "none";

        dashboard.style.display = "block";


    } catch (error) {

        console.error(
            "Worker dashboard loading failed:",
            error
        );

        showError(
            error.message ||
            "Could not load worker dashboard."
        );
    }
}


function renderDashboard(workerData) {

    workerNameElement.textContent =
        workerData.name || "Unknown";

    workerTradeElement.textContent =
        workerData.trade || "Unknown";

    workerUnionElement.textContent =
        workerData.union_name || "Unknown";

    workerRatingElement.textContent =
        workerData.rating_avg ?? "No rating yet";


    currentPriceElement.textContent =
        workerData.price ?? "Not set";

    priceInput.value =
        workerData.price ?? "";


    /*
     * Latitude and longitude are not currently
     * returned by GET /workers/{worker_id}.
     *
     * So leave these empty for now.
     */
    latitudeInput.value = "";

    longitudeInput.value = "";
}


async function loadBookings() {

    const response =
        await fetch(
            `${API_BASE_URL}/bookings?worker_id=${workerId}`
        );

    const data =
        await response.json();

    if (!response.ok) {

        throw new Error(
            data.detail ||
            "Could not load bookings."
        );
    }


    console.log(
        "Worker bookings:",
        data
    );


    renderBookings(data);
}


function renderBookings(bookings) {

    bookingsContainer.innerHTML = "";


    if (!bookings || bookings.length === 0) {

        bookingsContainer.innerHTML =
            "<p>No bookings yet.</p>";

        return;
    }


    bookings.forEach(booking => {

        const bookingElement =
            document.createElement("div");

        bookingElement.className =
            "booking-card";


        let actionHTML = "";


        if (booking.status === "requested") {

            actionHTML = `
                <div class="booking-buttons">

                    <button
                        type="button"
                        class="accept-btn"
                        data-booking-id="${booking.id}"
                    >
                        Accept
                    </button>

                    <button
                        type="button"
                        class="reject-btn"
                        data-booking-id="${booking.id}"
                    >
                        Reject
                    </button>

                </div>
            `;
        }


        else if (
            booking.status === "accepted" ||
            booking.status === "in_progress"
        ) {

            actionHTML = `
                <button
                    type="button"
                    class="open-job-btn"
                    data-booking-id="${booking.id}"
                >
                    Open Job
                </button>
            `;
        }


        bookingElement.innerHTML = `
            <h3>
                Booking #${booking.id}
            </h3>

            <p>
                <strong>Customer:</strong>
                ${booking.customer_id}
            </p>

            <p>
                <strong>Work:</strong>
                ${booking.job_notes || "No description"}
            </p>

            <p>
                <strong>Duration:</strong>
                ${booking.total_days}
                day${booking.total_days > 1 ? "s" : ""}
            </p>

            <p>
                <strong>Status:</strong>
                ${formatStatus(booking.status)}
            </p>

            ${actionHTML}
        `;


        bookingsContainer.appendChild(
            bookingElement
        );
    });


    document
        .querySelectorAll(".accept-btn")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => respondToBooking(
                    button.dataset.bookingId,
                    "accepted"
                )
            );
        });


    document
        .querySelectorAll(".reject-btn")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => respondToBooking(
                    button.dataset.bookingId,
                    "rejected"
                )
            );
        });


    document
        .querySelectorAll(".open-job-btn")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const bookingId =
                        button.dataset.bookingId;

                    window.location.href =
                        `active_job.html?booking_id=${bookingId}`;
                }
            );
        });
}


async function respondToBooking(
    bookingId,
    status
) {

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/bookings/${bookingId}/status?status=${status}`,
                {
                    method: "PATCH"
                }
            );

        const data =
            await response.json();

        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Could not update booking."
            );
        }


        await loadBookings();


    } catch (error) {

        console.error(
            "Booking response error:",
            error
        );

        alert(
            error.message ||
            "Could not update booking."
        );
    }
}


async function savePrice() {

    const price =
        Number(priceInput.value);


    if (!price || price <= 0) {

        priceMessage.textContent =
            "Please enter a valid daily wage.";

        return;
    }


    savePriceButton.disabled = true;

    priceMessage.textContent =
        "Saving wage...";


    try {

        const response =
            await fetch(
                `${API_BASE_URL}/workers/${workerId}/price`,
                {
                    method: "PATCH",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        price: price
                    })
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Could not save wage."
            );
        }


        currentPriceElement.textContent =
            data.price;


        priceMessage.textContent =
            "Daily wage saved successfully.";


        if (data.warning) {

            priceMessage.textContent +=
                ` ${data.warning}`;
        }


    } catch (error) {

        console.error(
            "Price update error:",
            error
        );

        priceMessage.textContent =
            error.message ||
            "Could not save wage.";


    } finally {

        savePriceButton.disabled = false;
    }
}


async function saveLocation() {

    const latitude =
        Number(latitudeInput.value);

    const longitude =
        Number(longitudeInput.value);


    if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude)
    ) {

        locationMessage.textContent =
            "Please enter valid latitude and longitude.";

        return;
    }


    if (
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
    ) {

        locationMessage.textContent =
            "Latitude or longitude is outside the valid range.";

        return;
    }


    saveLocationButton.disabled = true;

    locationMessage.textContent =
        "Saving location...";


    try {

        const response =
            await fetch(
                `${API_BASE_URL}/workers/${workerId}/location?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}`,
                {
                    method: "PATCH"
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Could not save location."
            );
        }


        locationMessage.textContent =
            "Location saved successfully.";


        console.log(
            "Updated worker location:",
            data
        );


    } catch (error) {

        console.error(
            "Location update error:",
            error
        );

        locationMessage.textContent =
            error.message ||
            "Could not save location.";


    } finally {

        saveLocationButton.disabled = false;
    }
}


function useCurrentLocation() {

    if (!navigator.geolocation) {

        locationMessage.textContent =
            "Geolocation is not supported by this browser.";

        return;
    }


    locationMessage.textContent =
        "Getting your current location...";


    navigator.geolocation.getCurrentPosition(

        position => {

            const latitude =
                position.coords.latitude;

            const longitude =
                position.coords.longitude;


            latitudeInput.value =
                latitude;

            longitudeInput.value =
                longitude;


            locationMessage.textContent =
                "Current location loaded. Click Save Location.";
        },

        error => {

            console.error(
                "Geolocation error:",
                error
            );

            locationMessage.textContent =
                "Could not get your current location.";
        }
    );
}


function formatStatus(status) {

    if (!status) {

        return "Unknown";
    }


    return status
        .replaceAll("_", " ")
        .replace(/\b\w/g, letter =>
            letter.toUpperCase()
        );
}


savePriceButton.addEventListener(
    "click",
    savePrice
);


saveLocationButton.addEventListener(
    "click",
    saveLocation
);


currentLocationButton.addEventListener(
    "click",
    useCurrentLocation
);


loadWorkerDashboard();