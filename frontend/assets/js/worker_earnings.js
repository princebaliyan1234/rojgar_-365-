const workerId =
    localStorage.getItem("user_id");


const loading =
    document.getElementById("loading");

const errorBox =
    document.getElementById("error");

const earningsPage =
    document.getElementById("earnings-page");

const totalEarnings =
    document.getElementById("total-earnings");

const totalJobs =
    document.getElementById("total-jobs");

const ledgerContainer =
    document.getElementById("ledger-container");


async function loadEarnings() {

    if (!workerId) {

        showError(
            "Worker login information not found."
        );

        return;
    }


    try {

        const response =
            await fetch(
                `${API_BASE_URL}/workers/${workerId}/ledger`
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Could not load earnings."
            );
        }


        renderEarnings(data);


    } catch (error) {

        console.error(
            "Earnings loading error:",
            error
        );


        showError(
            error.message ||
            "Could not load earnings."
        );
    }
}


function renderEarnings(data) {

    loading.style.display =
        "none";

    earningsPage.style.display =
        "block";


    totalEarnings.textContent =
        `₹${Number(data.total_earnings || 0).toFixed(2)}`;


    totalJobs.textContent =
        data.total_jobs || 0;


    renderLedger(data.entries || []);
}


function renderLedger(entries) {

    ledgerContainer.innerHTML = "";


    if (!entries || entries.length === 0) {

        ledgerContainer.innerHTML =
            "<p>No completed work yet.</p>";

        return;
    }


    /*
     * Group entries by booking_id
     */

    const bookings = {};


    entries.forEach((entry) => {

        if (!bookings[entry.booking_id]) {

            bookings[entry.booking_id] = [];
        }


        bookings[entry.booking_id].push(entry);
    });


    /*
     * Display each booking
     */

    Object.entries(bookings).forEach(
        ([bookingId, bookingEntries]) => {

            const bookingCard =
                document.createElement("div");

            bookingCard.className =
                "booking-earnings-card";


            const bookingTotal =
                bookingEntries.reduce(
                    (sum, entry) =>
                        sum + Number(entry.wage_amount || 0),
                    0
                );


            const allVerified =
                bookingEntries.every(
                    entry => entry.verified
                );


            const verificationText =
                allVerified
                    ? "✓ Verified"
                    : "⚠ Verification issue";


            bookingCard.innerHTML = `

                <div class="booking-header">

                    <div>

                        <h3>
                            Booking #${bookingId}
                        </h3>

                        <p>
                            ${bookingEntries.length}
                            day${bookingEntries.length !== 1 ? "s" : ""}
                            •
                            ₹${bookingTotal.toFixed(2)} total
                        </p>

                    </div>

                    <span class="verification">
                        ${verificationText}
                    </span>

                </div>


                <div class="booking-days">
                </div>

            `;


            const daysContainer =
                bookingCard.querySelector(
                    ".booking-days"
                );


            /*
             * Add individual days
             */

            bookingEntries.forEach(
                (entry) => {

                    const dayElement =
                        document.createElement("div");

                    dayElement.className =
                        "earning-day";


                    dayElement.innerHTML = `

                        <div>

                            <strong>
                                Day ${entry.day_number}
                            </strong>

                            <p>
                                ${escapeHtml(
                                    entry.remarks ||
                                    "No remarks"
                                )}
                            </p>

                        </div>


                        <div class="day-amount">

                            ₹${Number(
                                entry.wage_amount || 0
                            ).toFixed(2)}

                        </div>

                    `;


                    daysContainer.appendChild(
                        dayElement
                    );
                }
            );


            ledgerContainer.appendChild(
                bookingCard
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


function showError(message) {

    loading.style.display =
        "none";

    earningsPage.style.display =
        "none";

    errorBox.style.display =
        "block";

    errorBox.textContent =
        message;
}


loadEarnings();