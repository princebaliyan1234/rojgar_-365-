function getWorkerIdFromUrl() {

    const params = new URLSearchParams(
        window.location.search
    );

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

    document.getElementById("booking").style.display = "block";


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
        "https://placehold.co/120";


    photo.onerror = () => {

        photo.src =
            "https://placehold.co/120";

    };


    setupBooking(worker);

}


function setupBooking(worker) {

    const dateInput =
        document.getElementById("booking-date");


    // Prevent selecting dates in the past

    const today =
        new Date().toISOString().split("T")[0];

    dateInput.min = today;


    document
        .getElementById("submit-booking-btn")
        .addEventListener("click", async () => {

            const message =
                document.getElementById("booking-message");


            const date =
                dateInput.value;

            const timeSlot =
                document.getElementById("time-slot").value;

            const jobNotes =
                document.getElementById("job-notes").value.trim();


            if (!date) {

                message.textContent =
                    "Please select a date.";

                return;

            }


            if (!timeSlot) {

                message.textContent =
                    "Please select a time slot.";

                return;

            }


            if (!jobNotes) {

                message.textContent =
                    "Please describe the work.";

                return;

            }


            /*
             * Get the logged-in customer's ID.
             *
             * The onboarding page stores this as:
             * localStorage.user_id
             */

            const customerId =
                localStorage.getItem("user_id");


            if (!customerId) {

                message.textContent =
                    "Customer login information is missing.";

                return;

            }


            /*
             * DEMO ONLY
             *
             * Randomly determine the number of days
             * between 1 and 8.
             */

            const totalDays =
                Math.floor(Math.random() * 8) + 1;


            /*
             * Payment model is fixed for the demo.
             */

            const paymentModel =
                "milestone";


            /*
             * Standard booking.
             *
             * The backend will get the worker's
             * daily price from WorkerProfile.
             */

            const bookingPayload = {

                type: "standard",

                payment_model: paymentModel,

                job_notes: jobNotes,

                customer_id: Number(customerId),

                worker_id: worker.id,

                price: null,

                total_days: totalDays

            };


            /*
             * Prevent duplicate clicks while
             * the booking is being created.
             */

            const submitButton =
                document.getElementById("submit-booking-btn");

            submitButton.disabled = true;

            submitButton.textContent =
                "Creating booking...";


            try {

                /*
                 * Create the REAL booking in the backend.
                 */

                const response = await fetch(
                    `${API_BASE_URL}/bookings`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type": "application/json"
                        },

                        body: JSON.stringify(
                            bookingPayload
                        )
                    }
                );


                if (!response.ok) {

                    const errorData =
                        await response.json().catch(
                            () => null
                        );

                    throw new Error(
                        errorData?.detail ||
                        `Booking request failed: ${response.status}`
                    );

                }


                /*
                 * Backend returns the newly
                 * created booking.
                 */

                const booking =
                    await response.json();


                console.log(
                    "Booking created:",
                    booking
                );


                /*
                 * Store the real booking ID.
                 *
                 * The checkout page will use this
                 * ID to request the backend's
                 * payment calculation.
                 */

                sessionStorage.setItem(
                    "booking_id",
                    String(booking.id)
                );


                /*
                 * Keep the information that belongs
                 * specifically to the frontend demo.
                 *
                 * Date and time are not currently
                 * stored in the backend Booking model,
                 * so we keep them in sessionStorage.
                 */

                const bookingData = {

                    booking_id: booking.id,

                    worker_id: worker.id,

                    customer_id: Number(customerId),

                    date: date,

                    time_slot: timeSlot,

                    job_notes: jobNotes,

                    total_days: totalDays,

                    payment_model: paymentModel

                };


                sessionStorage.setItem(
                    "booking_data",
                    JSON.stringify(bookingData)
                );


                /*
                 * Go to checkout.
                 */

                window.location.href =
                    `checkout.html?booking_id=${booking.id}`;

            } catch (error) {

                console.error(
                    "Booking creation failed:",
                    error
                );


                message.textContent =
                    error.message ||
                    "Could not create booking.";


                submitButton.disabled = false;

                submitButton.textContent =
                    "Continue";

            }

        });

}


loadWorker();