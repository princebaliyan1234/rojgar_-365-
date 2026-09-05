const englishBtn = document.querySelector("#english-btn");
const hindiBtn = document.querySelector("#hindi-btn");
const buyerBtn = document.querySelector("#buyer-btn");
const workerBtn = document.querySelector("#worker-btn");

const screen1 = document.querySelector("#screen1");
const screen2 = document.querySelector("#screen2");

englishBtn.addEventListener("click", function() {
  localStorage.setItem("language", "english");
  screen1.style.display = "none";
  screen2.style.display = "block";
});

hindiBtn.addEventListener("click", function() {
  localStorage.setItem("language", "hindi");
  screen1.style.display = "none";
  screen2.style.display = "block";
});

buyerBtn.addEventListener("click", function() {
  localStorage.setItem("role", "buyer");
  screen2.style.display = "none";
  screen3.style.display = "block";
});

workerBtn.addEventListener("click", function() {
  localStorage.setItem("role", "worker");
  screen2.style.display = "none";
  screen3.style.display = "block";
});
const phoneInput = document.querySelector("#phone-input");
const sendOtpBtn = document.querySelector("#send-otp-btn");
const otpSection = document.querySelector("#otp-section");
const otpInput = document.querySelector("#otp-input");
const verifyOtpBtn=document.querySelector("#verify-otp-btn");
sendOtpBtn.addEventListener("click",function() {
  const phoneNumber = phoneInput.value;
  console.log("OTP sent to: " + phoneNumber);
  otpSection.style.display ="block";

});
verifyOtpBtn.addEventListener("click", function() {
  const enteredOtp = otpInput.value;

  if (enteredOtp === "1234") {
    screen3.style.display = "none";
    screen4.style.display = "block";

    const savedRole = localStorage.getItem("role");
    if (savedRole === "worker") {
      workerFields.style.display = "block";
    }
  } else {
    alert("Wrong OTP. Try 1234 for this test version.");
  }
});

const screen4 = document.querySelector("#screen4");
const workerFields = document.querySelector("#worker-fields");
const nameInput = document.querySelector("#name-input");
const areaInput = document.querySelector("#area-input");
const tradeInput = document.querySelector("#trade-input");
const finishBtn = document.querySelector("#finish-btn");
finishBtn.addEventListener("click", function() {
  const name = nameInput.value;
  const area = areaInput.value;
  const trade = tradeInput.value;

  localStorage.setItem("name", name);
  localStorage.setItem("area", area);

  const savedRole = localStorage.getItem("role");
  if (savedRole === "worker") {
    localStorage.setItem("trade", trade);
  }

  alert("Onboarding complete! Welcome, " + name + ".");
});