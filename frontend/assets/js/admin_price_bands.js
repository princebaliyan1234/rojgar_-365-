const unionId = sessionStorage.getItem("union_id");
const role = sessionStorage.getItem("role");

// =========================
// BASIC ADMIN ACCESS CHECK
// =========================
if (role !== "admin" || !unionId) {
  alert("Admin access required.");
  window.location.href = "../onboarding/onboarding_html.html";
}

// =========================
// ELEMENTS
// =========================
const tradeInput = document.getElementById("trade-input");
const floorInput = document.getElementById("floor-input");
const ceilingInput = document.getElementById("ceiling-input");
const saveBtn = document.getElementById("save-btn");
const formMessage = document.getElementById("form-message");
const currentBandContainer = document.getElementById("current-band-container");

// =========================
// FORMAT TRADE NAME
// =========================
function formatTrade(trade) {
  return trade
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// =========================
// LOAD CURRENT PRICE BAND
// =========================
async function loadCurrentBand() {
  const trade = tradeInput.value;

  if (!trade) {
    currentBandContainer.innerHTML = `
      <p>Select a trade to view its current price band.</p>
    `;
    floorInput.value = "";
    ceilingInput.value = "";
    return;
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/price-bands?union_id=${unionId}&trade=${encodeURIComponent(trade)}`
    );
    const data = await response.json();

    // =========================
    // NO PRICE BAND EXISTS
    // =========================
    if (response.status === 404) {
      currentBandContainer.innerHTML = `
        <div class="no-band">
          <p>No price band has been set for <strong>${formatTrade(trade)}</strong>.</p>
        </div>
      `;
      floorInput.value = "";
      ceilingInput.value = "";
      return;
    }

    // =========================
    // OTHER ERROR
    // =========================
    if (!response.ok) {
      throw new Error(data.detail || "Could not load price band.");
    }

    // =========================
    // SHOW CURRENT BAND
    // =========================
    currentBandContainer.innerHTML = `
      <div class="band-card">
        <h3>${formatTrade(data.trade)}</h3>
        <p><strong>Minimum:</strong> ₹${Number(data.floor).toFixed(2)}</p>
        <p><strong>Maximum:</strong> ₹${Number(data.ceiling).toFixed(2)}</p>
      </div>
    `;

    // Put current values into the form
    floorInput.value = data.floor;
    ceilingInput.value = data.ceiling;
  } catch (error) {
    console.error(error);
    currentBandContainer.innerHTML = `
      <p class="error-text">Could not load current price band.</p>
    `;
  }
}

// =========================
// SAVE PRICE BAND
// =========================
async function savePriceBand() {
  const trade = tradeInput.value;
  const floor = Number(floorInput.value);
  const ceiling = Number(ceilingInput.value);

  // =========================
  // VALIDATION
  // =========================
  if (!trade) {
    formMessage.textContent = "Please select a trade.";
    return;
  }

  if (floorInput.value === "" || ceilingInput.value === "") {
    formMessage.textContent = "Please enter both prices.";
    return;
  }

  if (floor < 0 || ceiling < 0) {
    formMessage.textContent = "Prices cannot be negative.";
    return;
  }

  if (floor > ceiling) {
    formMessage.textContent = "Minimum price cannot be greater than maximum price.";
    return;
  }

  try {
    formMessage.textContent = "Saving...";

    const response = await fetch(`${API_BASE_URL}/price-bands`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        union_id: Number(unionId),
        trade: trade,
        floor: floor,
        ceiling: ceiling
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Could not save price band.");
    }

    formMessage.textContent = "Price band saved successfully.";

    // Reload current band
    await loadCurrentBand();
  } catch (error) {
    console.error(error);
    formMessage.textContent = error.message;
  }
}

// =========================
// TRADE CHANGE
// =========================
tradeInput.addEventListener("change", loadCurrentBand);

// =========================
// SAVE BUTTON
// =========================
saveBtn.addEventListener("click", savePriceBand);

// =========================
// BACK BUTTON
// =========================
document.getElementById("back-btn").addEventListener("click", function () {
  window.location.href = "admin_dashboard.html";
});