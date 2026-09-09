let selectedRole = null;
let userPhone = null;
let adminLogin = false;


document.getElementById("english-btn").addEventListener(
"click",
function () {
applyLanguage("en");
showScreen("screen2");
}
);

document.getElementById("hindi-btn").addEventListener(
"click",
function () {
applyLanguage("hi");
showScreen("screen2");
}
);

document.getElementById("bihari-btn").addEventListener(
"click",
function () {
applyLanguage("bi");
showScreen("screen2");
}
);
// =========================
// SCREEN CONTROL
// =========================



function showScreen(screenId) {

    document.querySelectorAll(".screen").forEach(screen => {
        screen.style.display = "none";
    });

    document.getElementById(screenId).style.display = "block";

}

// =========================
// ROLE
// =========================

document.getElementById("buyer-btn").addEventListener(
    "click",
    function () {

        selectedRole = "buyer";
        adminLogin = false;

        console.log("Role selected:", selectedRole);

        showScreen("screen3");
    }

);

document.getElementById("worker-btn").addEventListener(
    "click",
    function () {

        selectedRole = "worker";
        adminLogin = false;

        console.log("Role selected:", selectedRole);

        // Worker fields will be shown after OTP verification.

        showScreen("screen3");
    }

);

// =========================
// ADMIN LOGIN
// =========================

document.getElementById("admin-btn").addEventListener(
    "click",
    function () {

        // Admin is login-only.
        // Admin accounts cannot be created through onboarding.

        adminLogin = true;
        selectedRole = null;

        console.log("Admin login selected");

        showScreen("screen3");
    }

);

// =========================
// SEND OTP
// =========================

document.getElementById("send-otp-btn").addEventListener(
    "click",
    async function (event) {

        event.preventDefault();
        event.stopPropagation();

        console.log("SEND OTP BUTTON CLICKED");

        const phone =
            document.getElementById("phone-input").value.trim();


        if (!phone) {

            alert("Please enter your phone number.");

            return;
        }


        if (!/^\d{10}$/.test(phone)) {

            alert("Please enter a valid 10-digit phone number.");

            return;
        }


        userPhone = phone;


        try {

            const response = await fetch(
                `${API_BASE_URL}/send-otp?phone=${encodeURIComponent(phone)}`,
                {
                    method: "POST"
                }
            );


            const data = await response.json();

            console.log("OTP RESPONSE:", data);


            if (!response.ok) {

                alert(
                    data.detail ||
                    "Could not send OTP."
                );

                return;
            }


            document.getElementById("otp-message").textContent =
                "OTP sent successfully.";


            document.getElementById("demo-otp").textContent =
                `Demo OTP: ${data.otp}`;


            document.getElementById("otp-section").style.display =
                "block";


        } catch (error) {

            console.error("OTP ERROR:", error);

            alert("Could not connect to the server.");
        }
    }

);

// =========================
// VERIFY OTP
// =========================

document.getElementById("verify-otp-btn").addEventListener(
    "click",
    async function (event) {

        event.preventDefault();
        event.stopImmediatePropagation();


        const code =
            document.getElementById("otp-input").value.trim();


        if (!code) {

            alert("Please enter the OTP.");

            return;
        }


        if (!userPhone) {

            alert("Please enter your phone number first.");

            return;
        }


        try {

            const response = await fetch(
                `${API_BASE_URL}/verify-otp?phone=${encodeURIComponent(userPhone)}&code=${encodeURIComponent(code)}`,
                {
                    method: "POST"
                }
            );


            const data = await response.json();

            console.log("Verify OTP response:", data);


            if (!response.ok) {

                alert(
                    data.detail ||
                    "Invalid OTP."
                );

                return;
            }


            // =========================
            // EXISTING USER
            // =========================

            if (data.user_exists) {

                localStorage.setItem(
                    "user_id",
                    data.user_id
                );


                // Save role returned by backend.

                localStorage.setItem(
                    "role",
                    data.role
                );


                // ========================================
                // ADMIN LOGIN
                // ========================================

                if (adminLogin) {

                    if (data.role !== "admin") {

                        alert(
                            "This phone number is not registered as a Cooperative Admin."
                        );

                        localStorage.removeItem("user_id");
                        localStorage.removeItem("role");
                        localStorage.removeItem("union_id");

                        return;
                    }


                    localStorage.setItem(
                        "user_id",
                        data.user_id
                    );


                    localStorage.setItem(
                        "role",
                        "admin"
                    );


                    // Prototype:
                    // this admin manages Sadar Bazaar Workers Union.
                    // Union ID 4 = Sadar Bazaar Workers Union.

                    localStorage.setItem(
                        "union_id",
                        "4"
                    );


                    window.location.href =
                        "../admin/admin_dashboard.html";

                    return;
                }


                // ========================================
                // BUYER
                // ========================================

                if (data.role === "buyer") {

                    window.location.href =
                        "../customer/search_result.html";

                    return;
                }


                // ========================================
                // WORKER
                // ========================================

                if (data.role === "worker") {

                    window.location.href =
                        "../worker/worker_dashboard.html";

                    return;
                }


                alert("Login successful.");

                return;
            }


            // =========================
            // NEW USER
            // =========================

            // Admin cannot create an account.

            if (adminLogin) {

                alert(
                    "No Cooperative Admin account exists for this phone number."
                );

                return;
            }


            showScreen("screen4");


            // Show worker fields only for worker.

            if (selectedRole === "worker") {

                document.getElementById(
                    "worker-fields"
                ).style.display = "block";


                // Load state unions.

                loadStateUnions();

            } else {

                document.getElementById(
                    "worker-fields"
                ).style.display = "none";
            }


        } catch (error) {

            console.error(error);

            alert("Could not verify OTP.");
        }
    }

);

// =========================
// LOAD STATE UNIONS
// =========================

async function loadStateUnions() {

    const stateSelect =
        document.getElementById("state-union-input");


    try {

        const response = await fetch(
            `${API_BASE_URL}/unions?level=state`
        );


        if (!response.ok) {

            throw new Error(
                "Could not load state unions."
            );
        }


        const unions = await response.json();


        stateSelect.innerHTML =
            `<option value="">${translations[selectedLanguage].selectStateUnion}</option>`;


        unions.forEach(union => {

            const option =
                document.createElement("option");


            option.value = union.id;

            option.textContent = union.name;

            stateSelect.appendChild(option);
        });


    } catch (error) {

        console.error(error);

        alert("Could not load state unions.");
    }

}

// =========================
// STATE → DISTRICT
// =========================

document.getElementById("state-union-input").addEventListener(
    "change",
    async function () {

        const stateUnionId = this.value;


        const districtSelect =
            document.getElementById(
                "district-union-input"
            );


        const localSelect =
            document.getElementById(
                "local-union-input"
            );


        // Reset district and local.

        districtSelect.innerHTML =
            `<option value="">${translations[selectedLanguage].selectDistrictUnion}</option>`;


        localSelect.innerHTML =
            `<option value="">${translations[selectedLanguage].selectLocalUnion}</option>`;


        districtSelect.disabled = true;

        localSelect.disabled = true;


        if (!stateUnionId) {
            return;
        }


        try {

            const response = await fetch(
                `${API_BASE_URL}/unions?level=district&parent_union_id=${stateUnionId}`
            );


            if (!response.ok) {

                throw new Error(
                    "Could not load district unions."
                );
            }


            const unions = await response.json();


            unions.forEach(union => {

                const option =
                    document.createElement("option");


                option.value = union.id;

                option.textContent = union.name;

                districtSelect.appendChild(option);
            });


            districtSelect.disabled = false;


        } catch (error) {

            console.error(error);

            alert("Could not load district unions.");
        }
    }

);

// =========================
// DISTRICT → LOCAL
// =========================

document.getElementById("district-union-input").addEventListener(
    "change",
    async function () {

        const districtUnionId = this.value;


        const localSelect =
            document.getElementById(
                "local-union-input"
            );


        localSelect.innerHTML =
            `<option value="">${translations[selectedLanguage].selectLocalUnion}</option>`;


        localSelect.disabled = true;


        if (!districtUnionId) {
            return;
        }


        try {

            const response = await fetch(
                `${API_BASE_URL}/unions?level=local&parent_union_id=${districtUnionId}`
            );


            if (!response.ok) {

                throw new Error(
                    "Could not load local unions."
                );
            }


            const unions = await response.json();


            unions.forEach(union => {

                const option =
                    document.createElement("option");


                option.value = union.id;

                option.textContent = union.name;

                localSelect.appendChild(option);
            });


            localSelect.disabled = false;


        } catch (error) {

            console.error(error);

            alert("Could not load local unions.");
        }
    }

);

// =========================
// FINISH PROFILE
// =========================

document.getElementById("finish-btn").addEventListener(
    "click",
    async function (event) {

        event.preventDefault();
        event.stopImmediatePropagation();


        const name =
            document.getElementById(
                "name-input"
            ).value.trim();


        const locality =
            document.getElementById(
                "area-input"
            ).value.trim();


        if (!name) {

            alert("Please enter your name.");

            return;
        }


        if (!locality) {

            alert(
                "Please enter your area/locality."
            );

            return;
        }


        // =========================
        // CREATE USER
        // =========================

        try {

            const userResponse = await fetch(
                `${API_BASE_URL}/users`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({

                        phone: userPhone,

                        name: name,

                        role: selectedRole,

                        locality: locality,

                        latitude: null,

                        longitude: null,

                        photo_url: null
                    })
                }
            );


            const userData =
                await userResponse.json();


            if (!userResponse.ok) {

                alert(
                    userData.detail ||
                    "Could not create user."
                );

                return;
            }


            // Save user ID.

            localStorage.setItem(
                "user_id",
                userData.id
            );


            // =========================
            // BUYER
            // =========================

            if (selectedRole === "buyer") {

                localStorage.setItem(
                    "role",
                    "buyer"
                );


                window.location.href =
                    "../customer/search_result.html";

                return;
            }


            // =========================
            // WORKER
            // =========================

            const trade =
                document.getElementById(
                    "trade-input"
                ).value.trim();


            const localUnionId =
                document.getElementById(
                    "local-union-input"
                ).value;


            if (!trade) {

                alert(
                    "Please enter your trade."
                );

                return;
            }


            if (!localUnionId) {

                alert(
                    "Please select your local union."
                );

                return;
            }


            const workerResponse = await fetch(
                `${API_BASE_URL}/workers/profile`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({

                        user_id: userData.id,

                        trade: trade,

                        union_id: Number(localUnionId),

                        skill_cert: false,

                        description: null
                    })
                }
            );


            const workerData =
                await workerResponse.json();


            if (!workerResponse.ok) {

                alert(
                    workerData.detail ||
                    "Could not create worker profile."
                );

                return;
            }


            localStorage.setItem(
                "worker_id",
                workerData.id
            );


            localStorage.setItem(
                "role",
                "worker"
            );


            document.getElementById(
                "profile-message"
            ).textContent =
                "Worker profile created successfully!";


        } catch (error) {

            console.error(error);

            alert(
                "Could not connect to the server."
            );
        }
    }

);

// =========================
// INITIAL SCREEN
// =========================

console.log("JS FILE LOADED");

showScreen("screen1");