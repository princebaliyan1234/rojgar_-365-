function getBookingIdFromUrl() {

    const params = new URLSearchParams(
        window.location.search
    );

    return params.get("booking_id");
}


function getBookingData() {

    const data =
        sessionStorage.getItem("booking_data");

    if (!data) {
        return null;
    }

    try {

        return JSON.parse(data);

    } catch (error) {

        console.error(
            "Could not read booking data:",
            error
        );

        return null;
    }
}


async function loadCheckout() {

    const bookingId =
        getBookingIdFromUrl();

    const bookingData =
        getBookingData();


    if (!bookingId || !bookingData) {

        document.getElementById("loading").style.display =
            "none";

        document.getElementById("error").style.display =
            "block";

        document.getElementById("error").textContent =
            "Booking information is missing.";

        return;
    }


    try {

        /*
         * Get the booking from the backend.
         *
         * This confirms that the booking actually
         * exists in the database.
         */

        const bookingResponse =
            await fetch(
                `${API_BASE_URL}/bookings/${bookingId}`
            );


        if (!bookingResponse.ok) {

            throw new Error(
                `Booking request failed: ${bookingResponse.status}`
            );

        }


        const booking =
            await bookingResponse.json();


        /*
         * Get the worker details.
         */

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


        /*
         * Get the REAL payment breakdown
         * calculated by the backend.
         */

        const checkoutResponse =
            await fetch(
                `${API_BASE_URL}/bookings/${bookingId}/checkout`
            );


        if (!checkoutResponse.ok) {

            const errorData =
                await checkoutResponse.json().catch(
                    () => null
                );

            throw new Error(
                errorData?.detail ||
                `Checkout request failed: ${checkoutResponse.status}`
            );

        }


        const breakdown =
            await checkoutResponse.json();


        console.log(
            "Backend booking:",
            booking
        );

        console.log(
            "Backend checkout breakdown:",
            breakdown
        );


        renderCheckout(
            worker,
            booking,
            bookingData,
            breakdown
        );


    } catch (error) {

        document.getElementById("loading").style.display =
            "none";

        document.getElementById("error").style.display =
            "block";

        document.getElementById("error").textContent =
            error.message ||
            "Could not load checkout details.";

        console.error(error);

    }

}


function renderCheckout(
    worker,
    booking,
    bookingData,
    breakdown
) {

    document.getElementById("loading").style.display =
        "none";

    document.getElementById("checkout").style.display =
        "block";


    /*
     * Worker information
     */

    document.getElementById("worker-name").textContent =
        worker.name;

    document.getElementById("worker-trade").textContent =
        worker.trade;

    document.getElementById("worker-rating").textContent =
        worker.rating_avg ?? 0;


    const badge =
        document.getElementById("worker-badge");


    if (worker.kyc_status === "approved") {

        badge.textContent =
            "✓ Cooperative Verified";

        badge.style.display =
            "inline-flex";

    } else {

        badge.textContent = "";

        badge.style.display =
            "none";

    }


    const photo =
        document.getElementById("worker-photo");


    photo.src =
        worker.photo_urls?.[0] ||
        "https://placehold.co/100";


    photo.onerror = () => {

        photo.src =
            "https://placehold.co/100";

    };


    /*
     * Booking information
     */

    document.getElementById("booking-date").textContent =
        bookingData.date;

    document.getElementById("booking-time").textContent =
        bookingData.time_slot;

    document.getElementById("booking-days").textContent =
        `${booking.total_days} day${booking.total_days > 1 ? "s" : ""}`;

    document.getElementById("payment-model").textContent =
        booking.payment_model;

    document.getElementById("job-notes").textContent =
        booking.job_notes || bookingData.job_notes;


    /*
     * Payment information
     *
     * These values now come directly from
     * the backend checkout endpoint.
     */

    const dailyRate =
        worker.price;


    document.getElementById("daily-rate").textContent =
        dailyRate != null
            ? `₹${dailyRate.toFixed(2)}`
            : "Price not set";


    document.getElementById("days-amount").textContent =
        booking.total_days;


    document.getElementById("work-amount").textContent =
        `₹${breakdown.base_price.toFixed(2)}`;


    document.getElementById("commission").textContent =
        `₹${breakdown.commission.toFixed(2)}`;


    document.getElementById("remote-fee").textContent =
        `₹${breakdown.remote_fee.toFixed(2)}`;


    document.getElementById("final-amount").textContent =
        `₹${breakdown.total.toFixed(2)}`;


    /*
     * Save the backend breakdown so the
     * mock payment page can display it.
     */

    const updatedBookingData = {

        ...bookingData,

        booking_id: booking.id,

        worker_id: booking.worker_id,

        customer_id: booking.customer_id,

        total_days: booking.total_days,

        payment_model: booking.payment_model,

        daily_rate: dailyRate,

        work_amount: breakdown.base_price,

        commission: breakdown.commission,

        remote_fee: breakdown.remote_fee,

        final_amount: breakdown.total

    };


    sessionStorage.setItem(
        "booking_data",
        JSON.stringify(updatedBookingData)
    );


    setupPayment(booking.id);

}


function setupPayment(bookingId) {

    document
        .getElementById("pay-btn")
        .addEventListener("click", () => {

            document.getElementById("payment-message").textContent =
                "Opening mock payment...";


            /*
             * The actual escrow confirmation will happen
             * after the mock payment succeeds.
             */

            setTimeout(() => {

                window.location.href =
                    `mock_payment.html?booking_id=${bookingId}`;

            }, 500);

        });

}


loadCheckout();