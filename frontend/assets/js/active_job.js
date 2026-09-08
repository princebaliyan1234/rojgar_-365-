const bookingId = new URLSearchParams(window.location.search).get("booking_id");

let booking = null;
let dayRecords = [];
let currentDayRecord = null;
let workerLocation = null;


// ===============================
// DOM ELEMENTS
// ===============================

const loading = document.getElementById("loading");
const errorBox = document.getElementById("error");
const jobPage = document.getElementById("job-page");

const bookingIdElement = document.getElementById("booking-id");
const customerNameElement = document.getElementById("customer-name");
const jobNotesElement = document.getElementById("job-notes");
const bookingDaysElement = document.getElementById("booking-days");
const bookingStatusElement = document.getElementById("booking-status");

const workMessage = document.getElementById("work-message");

const checkinSection = document.getElementById("checkin-section");
const checkInButton = document.getElementById("check-in-btn");

const otpSection = document.getElementById("otp-section");
const otpMessage = document.getElementById("otp-message");
const otpInput = document.getElementById("otp-input");
const confirmCheckinButton =
    document.getElementById("confirm-checkin-btn");


// CHECKOUT ELEMENTS

const checkoutSection =
    document.getElementById("checkout-section");

const checkOutButton =
    document.getElementById("check-out-btn");

const checkoutOtpSection =
    document.getElementById("checkout-otp-section");

const checkoutOtpMessage =
    document.getElementById("checkout-otp-message");

const checkoutOtpInput =
    document.getElementById("checkout-otp-input");

const confirmCheckoutButton =
    document.getElementById("confirm-checkout-btn");


const actionMessage =
    document.getElementById("action-message");


// ===============================
// ERROR HANDLING
// ===============================

function showError(message) {

    loading.style.display = "none";
    jobPage.style.display = "none";

    errorBox.textContent = message;
    errorBox.style.display = "block";
}


// ===============================
// LOAD BOOKING
// ===============================

async function loadBooking() {

    if (!bookingId) {

        showError("No booking ID was provided.");

        return;
    }

    try {

        // ---------------------------------
        // Get booking
        // ---------------------------------

        const bookingResponse = await fetch(
            `${API_BASE_URL}/bookings/${bookingId}`
        );

        if (!bookingResponse.ok) {

            const errorData =
                await bookingResponse.json().catch(() => ({}));

            throw new Error(
                errorData.detail ||
                "Could not load booking."
            );
        }

        booking = await bookingResponse.json();


        // ---------------------------------
        // Get day records
        // ---------------------------------

        const dayRecordsResponse = await fetch(
            `${API_BASE_URL}/bookings/${bookingId}/day-records`
        );

        if (!dayRecordsResponse.ok) {

            const errorData =
                await dayRecordsResponse.json().catch(() => ({}));

            throw new Error(
                errorData.detail ||
                "Could not load day records for this booking."
            );
        }

        dayRecords =
            await dayRecordsResponse.json();


        if (!dayRecords || dayRecords.length === 0) {

            showError(
                "No day record is available for this booking. Please complete checkout first."
            );

            return;
        }


        // ---------------------------------
        // Find current day
        // ---------------------------------

        currentDayRecord = dayRecords.find(
            record => record.status !== "completed"
        );


        if (!currentDayRecord) {

            currentDayRecord =
                dayRecords[dayRecords.length - 1];
        }


        // ---------------------------------
        // Display booking information
        // ---------------------------------

        bookingIdElement.textContent =
            booking.id;

        customerNameElement.textContent =
            booking.customer_id;

        jobNotesElement.textContent =
            booking.job_notes ||
            "No work description provided.";

        bookingDaysElement.textContent =
            `${booking.total_days} day${booking.total_days > 1 ? "s" : ""}`;

        bookingStatusElement.textContent =
            booking.status;


        // ---------------------------------
        // Show page
        // ---------------------------------

        loading.style.display = "none";
        jobPage.style.display = "block";


        updateWorkStatus();


    } catch (error) {

        console.error(
            "Error loading active job:",
            error
        );

        showError(
            error.message ||
            "Something went wrong while loading the job."
        );
    }
}


// ===============================
// UPDATE WORK STATUS
// ===============================

function updateWorkStatus() {

    if (!currentDayRecord) {
        return;
    }


    // ===============================
    // COMPLETED
    // ===============================

    if (currentDayRecord.status === "completed") {

        workMessage.textContent =
            `Day ${currentDayRecord.day_number} has been completed.`;

        checkinSection.style.display = "none";
        otpSection.style.display = "none";

        checkoutSection.style.display = "none";
        checkoutOtpSection.style.display = "none";

        actionMessage.textContent =
            "This day's work is complete.";

        return;
    }


    // ===============================
    // IN PROGRESS
    // ===============================

    if (currentDayRecord.status === "in_progress") {

        workMessage.textContent =
            `Day ${currentDayRecord.day_number} is currently in progress.`;

        checkinSection.style.display = "none";
        otpSection.style.display = "none";

        checkoutSection.style.display = "block";
        checkoutOtpSection.style.display = "none";

        actionMessage.textContent =
            "You are currently checked in.";

        return;
    }


    // ===============================
    // PENDING
    // ===============================

    workMessage.textContent =
        `Ready to check in for Day ${currentDayRecord.day_number}.`;

    checkinSection.style.display = "block";
    otpSection.style.display = "none";

    checkoutSection.style.display = "none";
    checkoutOtpSection.style.display = "none";

    actionMessage.textContent = "";
}


// ===============================
// GET WORKER LOCATION
// ===============================

function getWorkerLocation() {

    return new Promise((resolve, reject) => {

        if (!navigator.geolocation) {

            reject(
                new Error(
                    "Geolocation is not supported by this browser."
                )
            );

            return;
        }


        navigator.geolocation.getCurrentPosition(

            position => {

                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                });

            },

            error => {

                console.error(
                    "Geolocation error:",
                    error
                );

                let message =
                    "Could not get your location.";

                if (error.code === 1) {

                    message =
                        "Location permission was denied. Please allow location access and try again.";
                }

                if (error.code === 2) {

                    message =
                        "Your location could not be determined. Please try again.";
                }

                if (error.code === 3) {

                    message =
                        "Location request timed out. Please try again.";
                }

                reject(new Error(message));
            },

            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    });
}


// ===============================
// REQUEST CHECK-IN OTP
// ===============================

async function requestCheckInOTP() {

    if (!currentDayRecord) {

        actionMessage.textContent =
            "No active day record is available.";

        return;
    }


    checkInButton.disabled = true;

    actionMessage.textContent =
        "Getting your location...";


    try {

        // ---------------------------------
        // Get GPS
        // ---------------------------------

        workerLocation =
            await getWorkerLocation();


        actionMessage.textContent =
            "Requesting check-in OTP...";


        // ---------------------------------
        // Request OTP
        // ---------------------------------

        const response = await fetch(
            `${API_BASE_URL}/day-records/${currentDayRecord.id}/checkin/request-otp`,
            {
                method: "POST"
            }
        );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Could not request check-in OTP."
            );
        }


        console.log(
            "Check-in OTP response:",
            data
        );


        // ---------------------------------
        // Display OTP
        // ---------------------------------

        if (data.otp) {

            otpMessage.textContent =
                `Your Check-in OTP is: ${data.otp}`;

        } else {

            otpMessage.textContent =
                "A check-in OTP has been generated. Enter the OTP to continue.";
        }


        otpSection.style.display = "block";

        actionMessage.textContent =
            "Enter the OTP and confirm your check-in.";

        otpInput.focus();


    } catch (error) {

        console.error(
            "Check-in request error:",
            error
        );

        actionMessage.textContent =
            error.message ||
            "Could not start check-in.";

        workerLocation = null;

        checkInButton.disabled = false;
    }
}


// ===============================
// CONFIRM CHECK-IN
// ===============================

async function confirmCheckIn() {

    const code =
        otpInput.value.trim();


    // ---------------------------------
    // Validate OTP
    // ---------------------------------

    if (!code) {

        actionMessage.textContent =
            "Please enter the OTP.";

        return;
    }


    if (!/^\d{6}$/.test(code)) {

        actionMessage.textContent =
            "OTP must be 6 digits.";

        return;
    }


    // ---------------------------------
    // Check GPS
    // ---------------------------------

    if (!workerLocation) {

        actionMessage.textContent =
            "Your location is missing. Please click Check In again.";

        otpSection.style.display = "none";

        checkInButton.disabled = false;

        return;
    }


    confirmCheckinButton.disabled = true;

    actionMessage.textContent =
        "Confirming check-in...";


    try {

        const url =
            `${API_BASE_URL}/day-records/${currentDayRecord.id}/checkin/confirm` +
            `?code=${encodeURIComponent(code)}` +
            `&worker_lat=${encodeURIComponent(workerLocation.latitude)}` +
            `&worker_lon=${encodeURIComponent(workerLocation.longitude)}`;


        const response = await fetch(
            url,
            {
                method: "POST"
            }
        );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Check-in failed."
            );
        }


        console.log(
            "Check-in successful:",
            data
        );


        // ---------------------------------
        // Update day record
        // ---------------------------------

        currentDayRecord.status =
            "in_progress";


        // ---------------------------------
        // Update booking status
        // ---------------------------------

        try {

            const bookingStatusResponse =
                await fetch(
                    `${API_BASE_URL}/bookings/${bookingId}/status?status=in_progress`,
                    {
                        method: "PATCH"
                    }
                );


            if (!bookingStatusResponse.ok) {

                console.warn(
                    "Day check-in succeeded, but booking status could not be updated."
                );
            }

        } catch (statusError) {

            console.warn(
                "Could not update booking status:",
                statusError
            );
        }


        // ---------------------------------
        // Reset check-in UI
        // ---------------------------------

        otpSection.style.display = "none";

        otpInput.value = "";

        checkInButton.disabled = false;

        confirmCheckinButton.disabled = false;


        workerLocation = null;


        // ---------------------------------
        // Update UI
        // ---------------------------------

        workMessage.textContent =
            `Day ${currentDayRecord.day_number} is currently in progress.`;

        actionMessage.textContent =
            "Check-in successful. You are now checked in.";


        updateWorkStatus();


    } catch (error) {

        console.error(
            "Check-in confirmation error:",
            error
        );

        actionMessage.textContent =
            error.message ||
            "Check-in failed.";

        confirmCheckinButton.disabled = false;
    }
}


// =====================================================
// CHECKOUT
// =====================================================


// ===============================
// REQUEST CHECK-OUT OTP
// ===============================

async function requestCheckOutOTP() {

    if (!currentDayRecord) {

        actionMessage.textContent =
            "No active day record is available.";

        return;
    }


    if (currentDayRecord.status !== "in_progress") {

        actionMessage.textContent =
            "You must be checked in before checking out.";

        return;
    }


    checkOutButton.disabled = true;

    actionMessage.textContent =
        "Getting your location...";


    try {

        // ---------------------------------
        // Get GPS
        // ---------------------------------

        workerLocation =
            await getWorkerLocation();


        actionMessage.textContent =
            "Requesting check-out OTP...";


        // ---------------------------------
        // Request OTP
        // ---------------------------------

        const response = await fetch(
            `${API_BASE_URL}/day-records/${currentDayRecord.id}/checkout/request-otp`,
            {
                method: "POST"
            }
        );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Could not request check-out OTP."
            );
        }


        console.log(
            "Check-out OTP response:",
            data
        );


        // ---------------------------------
        // Display OTP
        // ---------------------------------

        if (data.otp) {

            checkoutOtpMessage.textContent =
                `Your Check-out OTP is: ${data.otp}`;

        } else {

            checkoutOtpMessage.textContent =
                "A check-out OTP has been generated. Enter the OTP to continue.";
        }


        checkoutOtpSection.style.display =
            "block";


        actionMessage.textContent =
            "Enter the OTP and confirm your check-out.";

        checkoutOtpInput.focus();


    } catch (error) {

        console.error(
            "Check-out request error:",
            error
        );

        actionMessage.textContent =
            error.message ||
            "Could not start check-out.";

        workerLocation = null;

        checkOutButton.disabled = false;
    }
}


// ===============================
// CONFIRM CHECK-OUT
// ===============================

async function confirmCheckOut() {

    const code =
        checkoutOtpInput.value.trim();


    // ---------------------------------
    // Validate OTP
    // ---------------------------------

    if (!code) {

        actionMessage.textContent =
            "Please enter the check-out OTP.";

        return;
    }


    if (!/^\d{6}$/.test(code)) {

        actionMessage.textContent =
            "OTP must be 6 digits.";

        return;
    }


    // ---------------------------------
    // Check GPS
    // ---------------------------------

    if (!workerLocation) {

        actionMessage.textContent =
            "Your location is missing. Please click Check Out again.";

        checkoutOtpSection.style.display =
            "none";

        checkOutButton.disabled = false;

        return;
    }


    confirmCheckoutButton.disabled = true;

    actionMessage.textContent =
        "Confirming check-out...";


    try {

        // ---------------------------------
        // Build request
        // ---------------------------------

        const url =
            `${API_BASE_URL}/day-records/${currentDayRecord.id}/checkout/confirm` +
            `?code=${encodeURIComponent(code)}` +
            `&worker_lat=${encodeURIComponent(workerLocation.latitude)}` +
            `&worker_lon=${encodeURIComponent(workerLocation.longitude)}`;


        // ---------------------------------
        // Confirm check-out
        // ---------------------------------

        const response = await fetch(
            url,
            {
                method: "POST"
            }
        );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Check-out failed."
            );
        }


        console.log(
            "Check-out successful:",
            data
        );


        // ---------------------------------
        // Update current day
        // ---------------------------------

        currentDayRecord.status =
            "completed";


        // ---------------------------------
        // Find next day
        // ---------------------------------

        const nextDayRecord =
            dayRecords.find(
                record =>
                    record.status !== "completed"
            );


        // ---------------------------------
        // Update booking status
        // ---------------------------------

        if (nextDayRecord) {

            try {

                const bookingStatusResponse =
                    await fetch(
                        `${API_BASE_URL}/bookings/${bookingId}/status?status=in_progress`,
                        {
                            method: "PATCH"
                        }
                    );


                if (!bookingStatusResponse.ok) {

                    console.warn(
                        "Day checkout succeeded, but booking status could not be updated."
                    );
                }

            } catch (statusError) {

                console.warn(
                    "Could not update booking status:",
                    statusError
                );
            }

        } else {
// ---------------------------------
// All days completed
// ---------------------------------

try {

    const completeResponse =
        await fetch(
            `${API_BASE_URL}/bookings/${bookingId}/complete`,
            {
                method: "PATCH"
            }
        );


    const completeData =
        await completeResponse.json().catch(() => ({}));


    if (!completeResponse.ok) {

        console.warn(
            "All days completed, but booking could not be marked complete:",
            completeData.detail || completeData
        );

    } else {

        console.log(
            "Booking completed successfully:",
            completeData
        );

        booking.status = "awaiting_confirmation";
        bookingStatusElement.textContent =
            "awaiting_confirmation";
    }


} catch (statusError) {

    console.warn(
        "Could not complete booking:",
        statusError
    );
}
        }


        // ---------------------------------
        // Reset checkout UI
        // ---------------------------------

        checkoutOtpSection.style.display =
            "none";

        checkoutOtpInput.value = "";

        checkOutButton.disabled = false;

        confirmCheckoutButton.disabled = false;

        workerLocation = null;


        // ---------------------------------
        // Move to next day
        // ---------------------------------

        if (nextDayRecord) {

            currentDayRecord =
                nextDayRecord;

            workMessage.textContent =
                `Day ${currentDayRecord.day_number} is ready to check in.`;

            actionMessage.textContent =
                `Day ${currentDayRecord.day_number} is ready. Check in when you begin work.`;

        } else {

            workMessage.textContent =
                "All days of this job have been completed.";

            actionMessage.textContent =
                "All work days are complete. The job is awaiting customer confirmation.";
        }


        updateWorkStatus();


    } catch (error) {

        console.error(
            "Check-out confirmation error:",
            error
        );

        actionMessage.textContent =
            error.message ||
            "Check-out failed.";

        confirmCheckoutButton.disabled = false;
    }
}


// ===============================
// BUTTON EVENTS
// ===============================

checkInButton.addEventListener(
    "click",
    requestCheckInOTP
);

confirmCheckinButton.addEventListener(
    "click",
    confirmCheckIn
);

checkOutButton.addEventListener(
    "click",
    requestCheckOutOTP
);

confirmCheckoutButton.addEventListener(
    "click",
    confirmCheckOut
);


// ===============================
// INITIALIZE PAGE
// ===============================

loadBooking();