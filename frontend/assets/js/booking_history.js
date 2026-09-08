// ===============================
// GET CUSTOMER ID
// ===============================

const customerId = localStorage.getItem("user_id");


// ===============================
// DOM ELEMENTS
// ===============================

const loading = document.getElementById("loading");
const errorBox = document.getElementById("error");
const bookingsContainer =
    document.getElementById("bookings-container");


// ===============================
// LOAD BOOKINGS
// ===============================

async function loadBookings() {

    if (!customerId) {

        showError(
            "You are not logged in. Please log in as a customer."
        );

        return;
    }


    try {

        const response = await fetch(
            `${API_BASE_URL}/bookings?customer_id=${customerId}`
        );


        const data = await response.json();


        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Could not load your bookings."
            );
        }


        console.log(
            "Customer bookings:",
            data
        );


        loading.style.display = "none";


        if (!data || data.length === 0) {

            bookingsContainer.innerHTML = `
                <div class="empty-message">
                    <p>You don't have any bookings yet.</p>
                </div>
            `;

            return;
        }


        renderBookings(data);


    } catch (error) {

        console.error(
            "Error loading bookings:",
            error
        );

        showError(
            error.message ||
            "Something went wrong while loading your bookings."
        );
    }
}


// ===============================
// RENDER BOOKINGS
// ===============================

function renderBookings(bookings) {

    bookingsContainer.innerHTML = "";


    bookings.forEach(booking => {

        const bookingCard =
            document.createElement("div");

        bookingCard.className =
            "booking-card";


        bookingCard.innerHTML = `

            <h2>
                Booking #${booking.id}
            </h2>

            <p>
                <strong>Worker:</strong>
                ${booking.worker_id}
            </p>

            <p>
                <strong>Work:</strong>
                ${booking.job_notes || "No work description provided."}
            </p>

            <p>
                <strong>Duration:</strong>
                ${booking.total_days}
                day${booking.total_days > 1 ? "s" : ""}
            </p>

            <p>
                <strong>Status:</strong>
                <span class="status status-${booking.status}">
                    ${formatStatus(booking.status)}
                </span>
            </p>

            <button
                type="button"
                class="view-details-btn"
                data-booking-id="${booking.id}"
            >
                View Details
            </button>

        `;


        bookingsContainer.appendChild(
            bookingCard
        );
    });


    // ===============================
    // BUTTON EVENTS
    // ===============================

    const buttons =
        document.querySelectorAll(
            ".view-details-btn"
        );


    buttons.forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const bookingId =
                    button.dataset.bookingId;

                window.location.href =
                    `booking_details.html?booking_id=${bookingId}`;
            }
        );
    });
}


// ===============================
// FORMAT STATUS
// ===============================

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


// ===============================
// ERROR
// ===============================

function showError(message) {

    loading.style.display = "none";

    errorBox.textContent =
        message;

    errorBox.style.display =
        "block";
}


// ===============================
// INITIALIZE
// ===============================

loadBookings();