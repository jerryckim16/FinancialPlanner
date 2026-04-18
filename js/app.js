document.getElementById("addLoanBtn").addEventListener("click", function () {
  loans.push({ name: "Loan " + (++loanIdCounter), balance: 5000, rate: 6, payment: 100 });
  renderLoans();
  calculate();
});

document.getElementById("addCostBtn").addEventListener("click", function () {
  costs.push({ name: "New Cost " + (++costIdCounter), amount: 0, inflation: 0 });
  renderCosts();
  calculate();
});

// Initial render
renderCosts();
renderLoans();

document.querySelectorAll(".card input").forEach(function (el) {
  if (el.closest("#costsList") || el.closest("#loansList")) return;
  el.addEventListener("input", calculate);
});

calculate();
