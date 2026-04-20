document.getElementById("addLoanBtn").addEventListener("click", function () {
  loans.push({ name: "Loan " + (++loanIdCounter), balance: 5000, rate: 6, payment: 100 });
  renderLoans();
  calculate();
  scheduleSave();
});

document.getElementById("addCostBtn").addEventListener("click", function () {
  costs.push({ name: "New Cost " + (++costIdCounter), amount: 0, inflation: 0, frequency: "monthly" });
  renderCosts();
  calculate();
  scheduleSave();
});

document.getElementById("addInvestmentBtn").addEventListener("click", function () {
  investments.push({ name: "Investment " + (++investmentIdCounter), rate: 7, dividend: 0, allocation: 0 });
  renderInvestments();
  calculate();
  scheduleSave();
});

// Restore persisted state before initial render
loadState();

// Initial render
renderCosts();
renderLoans();
renderInvestments();

// Planner inputs
document.querySelectorAll("#tab-planner input").forEach(function (el) {
  if (el.closest("#costsList") || el.closest("#loansList") || el.closest("#investmentsList")) return;
  el.addEventListener("input", function () {
    calculate();
    scheduleSave();
  });
});

document.getElementById("savingsRate").addEventListener("input", function () {
  var s = parseInt(this.value) || 0;
  document.getElementById("savingsLabel").textContent = s + "%";
  document.getElementById("investLabel").textContent = (100 - s) + "%";
});

// Opportunity cost inputs
document.querySelectorAll("#tab-opportunity input, #tab-opportunity select").forEach(function (el) {
  el.addEventListener("input", function () {
    calculateOpportunity();
    scheduleSave();
  });
});

// Opportunity cost spending-type toggle
document.querySelectorAll("#ocSpendingType .seg-btn").forEach(function (btn) {
  btn.addEventListener("click", function () {
    document.querySelectorAll("#ocSpendingType .seg-btn").forEach(function (b) {
      b.classList.remove("active");
    });
    btn.classList.add("active");
    var type = btn.getAttribute("data-type");
    document.getElementById("ocFrequencyRow").style.display =
      type === "recurring" ? "block" : "none";
    calculateOpportunity();
    scheduleSave();
  });
});

// Tab switching
document.querySelectorAll(".tab-btn").forEach(function (btn) {
  btn.addEventListener("click", function () {
    document.querySelectorAll(".tab-btn").forEach(function (b) { b.classList.remove("active"); });
    document.querySelectorAll(".tab-content").forEach(function (t) { t.classList.remove("active"); });
    btn.classList.add("active");
    document.getElementById(btn.getAttribute("data-tab")).classList.add("active");
    if (btn.getAttribute("data-tab") === "tab-opportunity") {
      calculateOpportunity();
    }
  });
});

// Reset button
document.getElementById("resetBtn").addEventListener("click", function () {
  if (confirm("Reset all inputs to defaults? This cannot be undone.")) {
    resetState();
  }
});

calculate();
calculateOpportunity();
