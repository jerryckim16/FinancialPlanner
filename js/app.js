document.getElementById("addLoanBtn").addEventListener("click", function () {
  loans.push({ name: "Loan " + (++loanIdCounter), balance: 5000, rate: 6, payment: 100 });
  renderLoans();
  calculate();
});

document.getElementById("addCostBtn").addEventListener("click", function () {
  costs.push({ name: "New Cost " + (++costIdCounter), amount: 0, inflation: 0, frequency: "monthly" });
  renderCosts();
  calculate();
});

// Initial render
renderCosts();
renderLoans();

// Planner inputs
document.querySelectorAll("#tab-planner input").forEach(function (el) {
  if (el.closest("#costsList") || el.closest("#loansList")) return;
  el.addEventListener("input", calculate);
});

document.getElementById("investmentAllocation").addEventListener("input", function () {
  document.getElementById("allocationLabel").textContent = this.value + "%";
});

// Opportunity cost inputs
document.querySelectorAll("#tab-opportunity input, #tab-opportunity select").forEach(function (el) {
  el.addEventListener("input", calculateOpportunity);
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

calculate();
calculateOpportunity();
