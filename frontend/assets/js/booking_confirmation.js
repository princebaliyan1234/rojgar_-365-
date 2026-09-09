function getBookingData() {
    const data = sessionStorage.getItem("booking_data");

    if (!data) {
        return null;
    }

    try {
        return JSON.parse(data);
    } catch (error) {
        console.error("Could not read booking data:", error);
        return null;
    }
}


function getPaymentData() {
    const data = sessionStorage.getItem("payment_data");

    if (!data) {
        return null;
    }

    try {
        return JSON.parse(data);
    } catch (error) {
        console.error("Could not read payment data:", error);
        return null;
    }
}


async function loadConfirmation() {

    const bookingData = getBookingData();
    const paymentData = getPaymentData();

    if (!bookingData || !paymentData || !bookingData.booking_id) {

        document.getElementById("loading").style.display = "none";

        document.getElementById("error").style.display = "block";

        document.getElementById("error").textContent =
            "Booking confirmation information is missing.";

        return;
    }


    try {

        // Get the actual booking from backend
        const bookingResponse =
            await fetch(
                `${API_BASE_URL}/bookings/${bookingData.booking_id}`
            );


        if (!bookingResponse.ok) {

            throw new Error(
                `Booking request failed: ${bookingResponse.status}`
            );

        }


        const booking =
            await bookingResponse.json();


        // Get worker details
        const workerResponse =
            await fetch(
                `${API_BASE_URL}/workers/${booking.worker_id}`
            );


        if (!workerResponse.ok) {

            throw new Error(
                `Worker request failed: ${workerResponse.status}`
            );

        }


        const worker =
            await workerResponse.json();


        renderConfirmation(
            worker,
            booking,
            bookingData,
            paymentData
        );


    } catch (error) {

        document.getElementById("loading").style.display =
            "none";

        document.getElementById("error").style.display =
            "block";

        document.getElementById("error").textContent =
            "Could not load booking confirmation.";

        console.error(
            "Confirmation loading failed:",
            error
        );

    }
}


function renderConfirmation(
    worker,
    booking,
    bookingData,
    paymentData
) {

    document.getElementById("loading").style.display =
        "none";

    document.getElementById("confirmation").style.display =
        "block";


    // REAL BACKEND BOOKING ID
    document.getElementById("booking-id").textContent =
        `BOOKING-${booking.id}`;


    // Worker details
    document.getElementById("worker-name").textContent =
        worker.name || "Unknown";


    document.getElementById("worker-trade").textContent =
        worker.trade || "Unknown";


    // Date and time are stored in sessionStorage
    // because the current backend Booking model does not store them
    document.getElementById("booking-date").textContent =
        bookingData.date || "Not specified";


    document.getElementById("booking-time").textContent =
        bookingData.time_slot || "Not specified";


    // Duration comes from backend booking
    document.getElementById("booking-days").textContent =
        `${booking.total_days} day${booking.total_days > 1 ? "s" : ""}`;


    // Payment model comes from backend
    document.getElementById("payment-model").textContent =
        booking.payment_model || "milestone";


    // Payment breakdown comes from the backend checkout breakdown
    document.getElementById("work-amount").textContent =
        `₹${Number(bookingData.work_amount).toFixed(2)}`;


    document.getElementById("commission").textContent =
        `₹${Number(bookingData.commission).toFixed(2)}`;


    document.getElementById("remote-fee").textContent =
        `₹${Number(bookingData.remote_fee).toFixed(2)}`;


    document.getElementById("final-amount").textContent =
        `₹${Number(bookingData.final_amount).toFixed(2)}`;


    // Payment status comes from the mock payment result
    document.getElementById("payment-status").textContent =
        paymentData.status || "held";


    // Done button
    document
        .getElementById("done-btn")
        .addEventListener("click", () => {

            window.location.href =
                "search_result.html";

        });
}


loadConfirmation();