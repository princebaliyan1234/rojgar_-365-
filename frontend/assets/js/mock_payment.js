const params = new URLSearchParams(window.location.search);
const bookingId = params.get("booking_id");


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


function showError(message) {
    document.getElementById("loading").style.display = "none";
    document.getElementById("payment-page").style.display = "none";

    const errorElement = document.getElementById("error");

    errorElement.style.display = "block";
    errorElement.textContent = message;
}


async function loadPaymentDetails() {

    if (!bookingId) {
        showError("Booking ID is missing.");
        return;
    }

    try {

        /*
         * Get the booking from the backend.
         */
        const bookingResponse = await fetch(
            `${API_BASE_URL}/bookings/${bookingId}`
        );

        if (!bookingResponse.ok) {
            throw new Error(
                `Could not load booking: ${bookingResponse.status}`
            );
        }

        const booking = await bookingResponse.json();


        /*
         * Get the actual checkout amount from the backend.
         *
         * This makes sure the payment page displays
         * the same amount that the backend will charge.
         */
        const checkoutResponse = await fetch(
            `${API_BASE_URL}/bookings/${bookingId}/checkout`
        );

        if (!checkoutResponse.ok) {
            const errorData = await checkoutResponse.json();

            throw new Error(
                errorData.detail || "Could not load payment details."
            );
        }

        const checkout = await checkoutResponse.json();


        /*
         * Display total amount.
         */
        document.getElementById("total-amount").textContent =
            `₹${Number(checkout.total).toFixed(2)}`;


        /*
         * Display payment model.
         */
        document.getElementById("payment-model").textContent =
            booking.payment_model || "milestone";


        /*
         * Display duration.
         */
        document.getElementById("duration").textContent =
            `${booking.total_days} day${booking.total_days > 1 ? "s" : ""}`;


        /*
         * Hide loading screen and show payment page.
         */
        document.getElementById("loading").style.display = "none";
        document.getElementById("payment-page").style.display = "block";


    } catch (error) {

        console.error(
            "Failed to load payment details:",
            error
        );

        showError(
            error.message || "Could not load payment details."
        );
    }
}


async function completePayment() {

    if (!bookingId) {
        alert("Booking ID is missing.");
        return;
    }


    const paymentButton =
        document.getElementById("pay-btn");


    if (paymentButton) {
        paymentButton.disabled = true;
        paymentButton.textContent = "Processing...";
    }


    const paymentMessage =
        document.getElementById("payment-message");


    if (paymentMessage) {
        paymentMessage.textContent =
            "Processing payment...";
    }


    try {

        /*
         * Confirm checkout with the backend.
         *
         * IMPORTANT:
         * This is what creates the DayRecord entries.
         */
        const response = await fetch(
            `${API_BASE_URL}/bookings/${bookingId}/checkout`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    confirm: true
                })
            }
        );


        const paymentResults = await response.json();


        if (!response.ok) {

            throw new Error(
                paymentResults.detail ||
                "Payment could not be completed."
            );
        }


        /*
         * Make sure every day payment is held.
         */
        const allHeld = paymentResults.every(
            result =>
                result.payment_status === "held"
        );


        if (!allHeld) {

            throw new Error(
                "Payment was not successfully held for all work days."
            );
        }


        /*
         * Save overall payment information.
         */
        sessionStorage.setItem(
            "payment_data",
            JSON.stringify({
                status: "held",

                confirmed_at:
                    new Date().toISOString(),

                results: paymentResults
            })
        );


        /*
         * IMPORTANT:
         *
         * Save the DayRecord IDs returned by checkout.
         *
         * The worker's Active Job page will use these IDs
         * for check-in and check-out.
         */
        sessionStorage.setItem(
            `day_records_${bookingId}`,
            JSON.stringify(paymentResults)
        );


        /*
         * Also update booking_data if it exists.
         *
         * This isn't required for the backend,
         * but keeps the frontend booking information
         * available for the confirmation page.
         */
        const bookingData = getBookingData();

        if (bookingData) {

            bookingData.payment_status = "held";

            sessionStorage.setItem(
                "booking_data",
                JSON.stringify(bookingData)
            );
        }


        /*
         * Go to booking confirmation.
         */
        window.location.href =
            `booking_confirmation.html?booking_id=${bookingId}`;


    } catch (error) {

        console.error(
            "Payment failed:",
            error
        );


        if (paymentMessage) {
            paymentMessage.textContent =
                error.message || "Payment failed.";
        }


        if (paymentButton) {
            paymentButton.disabled = false;
            paymentButton.textContent = "Pay Now";
        }
    }
}


/*
 * Set up the page after HTML has loaded.
 */
document.addEventListener(
    "DOMContentLoaded",
    () => {

        const paymentButton =
            document.getElementById("pay-btn");


        if (paymentButton) {

            paymentButton.addEventListener(
                "click",
                completePayment
            );
        }


        /*
         * Load payment details immediately.
         */
        loadPaymentDetails();
    }
);