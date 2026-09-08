const unionId = localStorage.getItem("union_id");
const adminId = localStorage.getItem("user_id");
const role = localStorage.getItem("role");


if (role !== "admin" || !adminId || !unionId) {
    alert("Admin access required.");

    window.location.href = "../index.html";
}


/* =========================
   ADMIN PROFILE
========================= */

async function loadAdminProfile() {

    try {

        const response = await fetch(
            `${API_BASE_URL}/admins/${adminId}`
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.detail || "Could not load admin profile."
            );
        }


        document.getElementById("admin-name").textContent =
            data.name || "Not available";


        document.getElementById("admin-phone").textContent =
            data.phone || "Not available";


        document.getElementById("admin-role").textContent =
            "Cooperative Admin";


        if (data.union) {

            document.getElementById("admin-union").textContent =
                data.union.name;

            document.getElementById("admin-union-level").textContent =
                data.union.level || "Local";

        } else {

            document.getElementById("admin-union").textContent =
                "Not assigned";

            document.getElementById("admin-union-level").textContent =
                "Not available";
        }


    } catch (error) {

        console.error(error);

        document.getElementById("admin-name").textContent =
            "Could not load";

        document.getElementById("admin-phone").textContent =
            "Could not load";

        document.getElementById("admin-role").textContent =
            "Cooperative Admin";

        document.getElementById("admin-union").textContent =
            "Could not load";

        document.getElementById("admin-union-level").textContent =
            "Could not load";
    }
}


/* =========================
   DASHBOARD STATISTICS
========================= */

async function loadStats() {

    try {

        const response = await fetch(
            `${API_BASE_URL}/unions/${unionId}/stats`
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.detail || "Could not load statistics."
            );
        }


        document.getElementById("total-bookings").textContent =
            data.total_bookings;


        document.getElementById("total-earnings").textContent =
            `₹${Number(data.total_distributed_earnings).toFixed(2)}`;


        document.getElementById("welfare-fund").textContent =
            `₹${Number(data.welfare_fund_balance).toFixed(2)}`;


    } catch (error) {

        console.error(error);

        document.getElementById("total-bookings").textContent =
            "Error";

        document.getElementById("total-earnings").textContent =
            "Error";

        document.getElementById("welfare-fund").textContent =
            "Error";
    }
}


/* =========================
   NAVIGATION
========================= */

document
    .getElementById("worker-directory-btn")
    .addEventListener("click", function () {

        window.location.href = "admin_workers.html";

    });


document
    .getElementById("price-band-btn")
    .addEventListener("click", function () {

        window.location.href = "admin_price_bands.html";

    });


/* =========================
   LOGOUT
========================= */

document
    .getElementById("logout-btn")
    .addEventListener("click", function () {

        localStorage.removeItem("user_id");
        localStorage.removeItem("role");
        localStorage.removeItem("union_id");

        window.location.href = "../index.html";

    });


/* =========================
   LOAD DASHBOARD
========================= */

loadAdminProfile();
loadStats();