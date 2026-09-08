const bookingId =
    new URLSearchParams(window.location.search).get("booking_id");

let booking = null;
let dayRecords = [];

const loading =
    document.getElementById("loading");

const errorBox =
    document.getElementById("error");

const bookingPage =
    document.getElementById("booking-page");

const bookingIdElement =
    document.getElementById("booking-id");

const workerNameElement =
    document.getElementById("worker-name");

const jobNotesElement =
    document.getElementById("job-notes");

const durationElement =
    document.getElementById("duration");

const bookingStatusElement =
    document.getElementById("booking-status");

const dayRecordsElement =
    document.getElementById("day-records");


// Confirmation elements

const confirmationSection =
    document.getElementById("confirmation-section");

const confirmCompletionButton =
    document.getElementById("confirm-completion-btn");

const confirmationMessage =
    document.getElementById("confirmation-message");


// Review elements

const reviewSection =
    document.getElementById("review-section");

const ratingInput =
    document.getElementById("rating-input");

const reviewText =
    document.getElementById("review-text");

const submitReviewButton =
    document.getElementById("submit-review-btn");

const reviewMessage =
    document.getElementById("review-message");


function showError(message) {

    loading.style.display = "none";

    bookingPage.style.display = "none";

    errorBox.textContent = message;

    errorBox.style.display = "block";
}


async function loadBooking() {

    if (!bookingId) {

        showError(
            "No booking ID was provided."
        );

        return;
    }


    try {

        // Get booking

        const bookingResponse =
            await fetch(
                `${API_BASE_URL}/bookings/${bookingId}`
            );

        const bookingData =
            await bookingResponse.json();

        if (!bookingResponse.ok) {

            throw new Error(
                bookingData.detail ||
                "Could not load booking."
            );
        }

        booking = bookingData;


        // Get worker

        const workerResponse =
            await fetch(
                `${API_BASE_URL}/workers/${booking.worker_id}`
            );

        const workerData =
            await workerResponse.json();

        if (!workerResponse.ok) {

            throw new Error(
                workerData.detail ||
                "Could not load worker."
            );
        }


        // Get day records

        const dayRecordsResponse =
            await fetch(
                `${API_BASE_URL}/bookings/${bookingId}/day-records`
            );

        const dayRecordsData =
            await dayRecordsResponse.json();

        if (!dayRecordsResponse.ok) {

            throw new Error(
                dayRecordsData.detail ||
                "Could not load work progress."
            );
        }

        dayRecords = dayRecordsData;


        // Display booking information

        bookingIdElement.textContent =
            booking.id;

        workerNameElement.textContent =
            workerData.name || booking.worker_id;

        jobNotesElement.textContent =
            booking.job_notes ||
            "No work description provided.";

        durationElement.textContent =
            `${booking.total_days} day${booking.total_days > 1 ? "s" : ""}`;

        bookingStatusElement.textContent =
            formatStatus(booking.status);


        renderDayRecords();


        // Show customer confirmation

        if (
            booking.status === "awaiting_confirmation" &&
            dayRecords.length > 0 &&
            dayRecords.every(
                record => record.status === "completed"
            )
        ) {

            confirmationSection.style.display =
                "block";
        }


        // Show review if booking is completed

        if (booking.status === "completed") {

            reviewSection.style.display =
                "block";
        }


        loading.style.display =
            "none";

        bookingPage.style.display =
            "block";


    } catch (error) {

        console.error(
            "Error loading booking details:",
            error
        );

        showError(
            error.message ||
            "Something went wrong."
        );
    }
}


function renderDayRecords() {

    dayRecordsElement.innerHTML = "";


    if (!dayRecords || dayRecords.length === 0) {

        dayRecordsElement.innerHTML =
            "<p>No day records found.</p>";

        return;
    }


    dayRecords.forEach(record => {

        const dayElement =
            document.createElement("div");

        dayElement.className =
            "day-record";


        const statusText =
            formatStatus(record.status);


        dayElement.innerHTML = `
            <div>
                <strong>
                    Day ${record.day_number}
                </strong>
            </div>

            <div class="day-status">
                ${statusText}
            </div>
        `;


        dayRecordsElement.appendChild(
            dayElement
        );
    });
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


async function confirmWorkCompleted() {

    confirmCompletionButton.disabled =
        true;

    confirmationMessage.textContent =
        "Confirming completion...";


    try {

        const response =
            await fetch(
                `${API_BASE_URL}/bookings/${bookingId}/confirm`,
                {
                    method: "PATCH"
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Could not confirm completion."
            );
        }


        console.log(
            "Customer confirmation response:",
            data
        );


        booking.status =
            "completed";


        bookingStatusElement.textContent =
            "Completed";


        confirmationMessage.textContent =
            "Work has been confirmed as completed.";


        confirmCompletionButton.style.display =
            "none";


        // Show review section

        reviewSection.style.display =
            "block";


    } catch (error) {

        console.error(
            "Completion error:",
            error
        );


        confirmationMessage.textContent =
            error.message ||
            "Could not confirm completion.";


        confirmCompletionButton.disabled =
            false;
    }
}


async function submitReview() {

    const rating =
        Number(ratingInput.value);

    const review =
        reviewText.value.trim();


    if (!rating) {

        reviewMessage.textContent =
            "Please select a rating.";

        return;
    }


    if (!review) {

        reviewMessage.textContent =
            "Please write a review.";

        return;
    }


    submitReviewButton.disabled =
        true;

    reviewMessage.textContent =
        "Submitting review...";


    try {

        const response =
            await fetch(
                `${API_BASE_URL}/bookings/${bookingId}/review`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        rating: rating,
                        review_text: review
                    })
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Could not submit review."
            );
        }


        console.log(
            "Review submitted:",
            data
        );


        reviewMessage.textContent =
            "Thank you! Your review has been submitted.";


        ratingInput.disabled =
            true;

        reviewText.disabled =
            true;

        submitReviewButton.style.display =
            "none";


    } catch (error) {

        console.error(
            "Review submission error:",
            error
        );


        reviewMessage.textContent =
            error.message ||
            "Could not submit review.";


        submitReviewButton.disabled =
            false;
    }
}


confirmCompletionButton.addEventListener(
    "click",
    confirmWorkCompleted
);


submitReviewButton.addEventListener(
    "click",
    submitReview
);


loadBooking();