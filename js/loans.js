var loans = [
  { name: "Student Loan", balance: 25000, rate: 5.5, payment: 280 }
];
var loanIdCounter = 0;

function simulateLoan(balance, annualRate, payment) {
  var monthlyRate = annualRate / 100 / 12;
  var monthlyInterest = balance * monthlyRate;

  if (balance <= 0 || payment <= 0) {
    return { monthsToPayoff: 0, totalInterest: 0, totalPaid: 0, neverPaysOff: false, monthlyInterest: monthlyInterest };
  }

  if (payment <= monthlyInterest) {
    return { neverPaysOff: true, monthlyInterest: monthlyInterest };
  }

  var b = balance;
  var totalInterest = 0;
  var totalPaid = 0;
  var months = 0;
  var MAX_MONTHS = 12 * 100;

  while (b > 0 && months < MAX_MONTHS) {
    var interest = b * monthlyRate;
    var actualPayment = Math.min(payment, b + interest);
    b = b + interest - actualPayment;
    totalInterest += interest;
    totalPaid += actualPayment;
    months++;
    if (b < 0.01) b = 0;
  }

  return {
    monthsToPayoff: months,
    totalInterest: totalInterest,
    totalPaid: totalPaid,
    neverPaysOff: false,
    monthlyInterest: monthlyInterest
  };
}

function renderLoans() {
  var container = document.getElementById("loansList");
  container.innerHTML = "";

  if (loans.length === 0) {
    var empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No loans \u2014 click \u2018Add Loan\u2019 to include debt in your plan.";
    container.appendChild(empty);
    return;
  }

  loans.forEach(function (loan, idx) {
    var row = document.createElement("div");
    row.className = "loan-row";

    var meta = simulateLoan(loan.balance, loan.rate, loan.payment);

    row.innerHTML =
      '<div>' +
        '<label>Name</label>' +
        '<input type="text" data-idx="' + idx + '" data-field="name" value="' + escapeHtml(loan.name) + '" placeholder="e.g. Student Loan" />' +
      '</div>' +
      '<div>' +
        '<label>Balance ($)</label>' +
        '<input type="number" data-idx="' + idx + '" data-field="balance" value="' + loan.balance + '" min="0" step="100" />' +
      '</div>' +
      '<div>' +
        '<label>Rate (%)</label>' +
        '<input type="number" data-idx="' + idx + '" data-field="rate" value="' + loan.rate + '" min="0" max="100" step="0.1" />' +
      '</div>' +
      '<div>' +
        '<label>Monthly Payment ($)</label>' +
        '<input type="number" data-idx="' + idx + '" data-field="payment" value="' + loan.payment + '" min="0" step="10" />' +
      '</div>' +
      '<div>' +
        '<label>&nbsp;</label>' +
        '<button class="btn-ghost" data-remove="' + idx + '">Remove</button>' +
      '</div>' +
      '<div class="loan-meta">' +
        (meta.neverPaysOff
          ? '<span class="warn">\u26A0 Payment too low \u2014 does not cover monthly interest (' + formatUSD(meta.monthlyInterest) + '/mo).</span>'
          : '<span>Pays off in <strong>' + formatMonths(meta.monthsToPayoff) + '</strong></span>' +
            '<span>Total interest: <strong>' + formatUSD(meta.totalInterest) + '</strong></span>' +
            '<span>Total paid: <strong>' + formatUSD(meta.totalPaid) + '</strong></span>'
        ) +
      '</div>';

    container.appendChild(row);
  });

  container.querySelectorAll("input").forEach(function (el) {
    el.addEventListener("input", function (e) {
      var idx = parseInt(e.target.getAttribute("data-idx"));
      var field = e.target.getAttribute("data-field");
      var value = field === "name" ? e.target.value : (parseFloat(e.target.value) || 0);
      loans[idx][field] = value;
      calculate();
      var metaDiv = e.target.closest(".loan-row").querySelector(".loan-meta");
      var meta = simulateLoan(loans[idx].balance, loans[idx].rate, loans[idx].payment);
      metaDiv.innerHTML = meta.neverPaysOff
        ? '<span class="warn">\u26A0 Payment too low \u2014 does not cover monthly interest (' + formatUSD(meta.monthlyInterest) + '/mo).</span>'
        : '<span>Pays off in <strong>' + formatMonths(meta.monthsToPayoff) + '</strong></span>' +
          '<span>Total interest: <strong>' + formatUSD(meta.totalInterest) + '</strong></span>' +
          '<span>Total paid: <strong>' + formatUSD(meta.totalPaid) + '</strong></span>';
    });
  });

  container.querySelectorAll("[data-remove]").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      var idx = parseInt(e.target.getAttribute("data-remove"));
      loans.splice(idx, 1);
      renderLoans();
      calculate();
    });
  });
}
