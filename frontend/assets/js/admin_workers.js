
const API_BASE_URL = "http://127.0.0.1:8000";

const unionId = localStorage.getItem("union_id");
const role = localStorage.getItem("role");


// =========================
// BASIC ADMIN ACCESS CHECK
// =========================

if (role !== "admin" || !unionId) {
    alert("Admin access required.");
    window.location.href = "../index.html";
}


// =========================
// LOAD WORKERS
// =========================

async function loadWorkers() {

    const container = document.getElementById("workers-container");

    if (!unionId) {
        container.innerHTML = "<p>Union information not found.</p>";
        return;
    }

    try {

        const response = await fetch(
            `${API_BASE_URL}/unions/${unionId}/workers`
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Could not load workers.");
        }

        document.getElementById("union-info").textContent =
            `${data.length} worker(s) found`;


        // =========================
        // SEPARATE BY KYC STATUS
        // =========================

        const pendingWorkers = data.filter(
            worker => worker.kyc_status === "pending"
        );

        const approvedWorkers = data.filter(
            worker => worker.kyc_status === "approved"
        );

        const rejectedWorkers = data.filter(
            worker => worker.kyc_status === "rejected"
        );


        container.innerHTML = "";


        // =========================
        // PENDING WORKERS
        // =========================

        const pendingSection = document.createElement("section");

        pendingSection.className = "worker-section";

        pendingSection.innerHTML = `
            <h2>Pending KYC</h2>
            <p class="section-description">
                Workers waiting for verification.
            </p>
        `;

        if (pendingWorkers.length === 0) {

            pendingSection.innerHTML += `
                <div class="empty-state">
                    <p>No workers are waiting for KYC approval.</p>
                </div>
            `;

        } else {

            pendingWorkers.forEach(worker => {

                pendingSection.innerHTML += createWorkerCard(
                    worker,
                    true
                );

            });

        }

        container.appendChild(pendingSection);


        // =========================
        // APPROVED WORKERS
        // =========================

        const approvedSection = document.createElement("section");

        approvedSection.className = "worker-section";

        approvedSection.innerHTML = `
            <h2>Verified Workers</h2>
            <p class="section-description">
                Workers whose KYC has been approved.
            </p>
        `;

        if (approvedWorkers.length === 0) {

            approvedSection.innerHTML += `
                <div class="empty-state">
                    <p>No verified workers yet.</p>
                </div>
            `;

        } else {

            approvedWorkers.forEach(worker => {

                approvedSection.innerHTML += createWorkerCard(
                    worker,
                    false
                );

            });

        }

        container.appendChild(approvedSection);


        // =========================
        // REJECTED WORKERS
        // =========================

        const rejectedSection = document.createElement("section");

        rejectedSection.className = "worker-section";

        rejectedSection.innerHTML = `
            <h2>Rejected Workers</h2>
            <p class="section-description">
                Workers whose KYC has been rejected.
            </p>
        `;

        if (rejectedWorkers.length === 0) {

            rejectedSection.innerHTML += `
                <div class="empty-state">
                    <p>No rejected workers.</p>
                </div>
            `;

        } else {

            rejectedWorkers.forEach(worker => {

                rejectedSection.innerHTML += createRejectedWorkerCard(
                    worker
                );

            });

        }

        container.appendChild(rejectedSection);

    } catch (error) {

        console.error(error);

        container.innerHTML = `
            <div class="error-state">
                <p>Could not load workers.</p>

                <button onclick="loadWorkers()">
                    Try Again
                </button>
            </div>
        `;

    }
}


// =========================
// CREATE WORKER CARD
// =========================

function createWorkerCard(worker, showActions) {

    return `
        <div class="worker-card">

            <div class="worker-info">

                <h3>${escapeHtml(worker.name)}</h3>

                <p>
                    <strong>Trade:</strong>
                    ${escapeHtml(worker.trade)}
                </p>

                <p>
                    <strong>KYC Status:</strong>

                    <span class="kyc-status ${worker.kyc_status}">
                        ${formatKycStatus(worker.kyc_status)}
                    </span>
                </p>

            </div>

            ${
                showActions
                ?
                `
                <div class="worker-actions">

                    <button
                        class="approve-btn"
                        onclick="updateKyc(${worker.id}, 'approved')"
                    >
                        Approve
                    </button>

                    <button
                        class="reject-btn"
                        onclick="updateKyc(${worker.id}, 'rejected')"
                    >
                        Reject
                    </button>

                </div>
                `
                :
                ""
            }

        </div>
    `;
}


// =========================
// CREATE REJECTED CARD
// =========================

function createRejectedWorkerCard(worker) {

    return `
        <div class="worker-card">

            <div class="worker-info">

                <h3>${escapeHtml(worker.name)}</h3>

                <p>
                    <strong>Trade:</strong>
                    ${escapeHtml(worker.trade)}
                </p>

                <p>
                    <strong>KYC Status:</strong>

                    <span class="kyc-status rejected">
                        ✗ Rejected
                    </span>
                </p>

            </div>

            <div class="worker-actions">

                <button
                    class="approve-btn"
                    onclick="updateKyc(${worker.id}, 'approved')"
                >
                    Approve
                </button>

            </div>

        </div>
    `;
}


// =========================
// UPDATE KYC
// =========================

async function updateKyc(workerId, status) {

    const confirmation = confirm(
        `Are you sure you want to ${status} this worker's KYC?`
    );

    if (!confirmation) {
        return;
    }

    try {

        const response = await fetch(
            `${API_BASE_URL}/workers/${workerId}/kyc`,
            {
                method: "PATCH",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    kyc_status: status
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.detail || "Could not update KYC."
            );
        }

        await loadWorkers();

    } catch (error) {

        console.error(error);

        alert(error.message);

    }
}


// =========================
// FORMAT KYC STATUS
// =========================

function formatKycStatus(status) {

    if (status === "approved") {
        return "✓ Approved";
    }

    if (status === "rejected") {
        return "✗ Rejected";
    }

    return "Pending";
}


// =========================
// BASIC HTML ESCAPING
// =========================

function escapeHtml(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// =========================
// BACK BUTTON
// =========================

document.getElementById("back-btn").addEventListener(
    "click",
    function () {

        window.location.href = "admin_dashboard.html";

    }
);


// =========================
// INITIAL LOAD
// =========================

loadWorkers();

