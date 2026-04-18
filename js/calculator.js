function calculate() {
  // Income
  var annualIncome = num("annualIncome");
  var taxRate = num("taxRate") / 100;
  var monthlyTakeHome = (annualIncome * (1 - taxRate)) / 12;
  document.getElementById("monthlyTakeHome").textContent = formatUSD(monthlyTakeHome);

  // Costs (sum of dynamic cost list)
  var totalCosts = costs.reduce(function (s, c) { return s + (c.amount || 0); }, 0);
  document.getElementById("totalCosts").textContent = formatUSD(totalCosts);

  // Loan summary (initial state)
  var totalDebt = loans.reduce(function (s, l) { return s + (l.balance || 0); }, 0);
  var totalLoanPayments = loans.reduce(function (s, l) { return s + (l.payment || 0); }, 0);
  document.getElementById("totalDebt").textContent = formatUSD(totalDebt);
  document.getElementById("totalLoanPayments").textContent = formatUSD(totalLoanPayments);

  // Monthly savings (display only — uses initial loan payment total)
  var monthlySavings = monthlyTakeHome - totalCosts - totalLoanPayments;
  document.getElementById("monthlySavings").textContent = formatUSD(monthlySavings);
  var savingsSummary = document.getElementById("savingsSummary");
  var warning = document.getElementById("savingsWarning");
  savingsSummary.classList.remove("positive", "negative");
  if (monthlySavings >= 0) {
    savingsSummary.classList.add("positive");
    warning.style.display = "none";
  } else {
    savingsSummary.classList.add("negative");
    warning.style.display = "block";
  }

  // Investment simulation — monthly, with loans paying down over time
  var principal = num("principal");
  var annualRate = num("rate");
  var years = Math.max(1, parseInt(document.getElementById("years").value) || 1);
  var monthlyRate = annualRate / 100 / 12;
  var months = years * 12;

  // Clone loan state for simulation
  var loanState = loans.map(function (l) {
    return { balance: l.balance || 0, rate: (l.rate || 0) / 100 / 12, payment: l.payment || 0 };
  });

  // Clone cost state with a per-cost monthly inflation factor.
  // annualInflation% compounded over 12 months equals (1 + annualInflation/100) per year.
  var costState = costs.map(function (c) {
    var annualInflation = c.inflation || 0;
    return {
      amount: c.amount || 0,
      monthlyFactor: Math.pow(1 + annualInflation / 100, 1 / 12)
    };
  });

  var investment = principal;
  var totalContributions = principal;
  var totalInterestPaidOnDebt = 0;
  var debtFreeMonth = null;
  var hadDebt = loanState.some(function (l) { return l.balance > 0; });

  var data = [];

  for (var m = 1; m <= months; m++) {
    // Service loans
    var loanPaidThisMonth = 0;
    for (var i = 0; i < loanState.length; i++) {
      var L = loanState[i];
      if (L.balance <= 0) continue;
      var interestCharged = L.balance * L.rate;
      var actualPayment = Math.min(L.payment, L.balance + interestCharged);
      L.balance = Math.max(0, L.balance + interestCharged - actualPayment);
      loanPaidThisMonth += actualPayment;
      totalInterestPaidOnDebt += interestCharged;
    }

    // Check debt-free transition
    var totalDebtRemaining = loanState.reduce(function (s, L) { return s + L.balance; }, 0);
    if (hadDebt && debtFreeMonth === null && totalDebtRemaining <= 0.01) {
      debtFreeMonth = m;
    }

    // This month's total costs (inflation compounds after each month, so month 1 uses starting values)
    var thisMonthCosts = 0;
    for (var ci = 0; ci < costState.length; ci++) {
      thisMonthCosts += costState[ci].amount;
    }

    // Monthly contribution = take-home - costs - loan payments (clamped to 0)
    var contribution = Math.max(0, monthlyTakeHome - thisMonthCosts - loanPaidThisMonth);

    // Grow investment
    investment = investment * (1 + monthlyRate) + contribution;
    totalContributions += contribution;

    // Apply inflation for the next month
    for (var ci2 = 0; ci2 < costState.length; ci2++) {
      costState[ci2].amount *= costState[ci2].monthlyFactor;
    }

    // Record at year boundaries
    if (m % 12 === 0) {
      data.push({
        year: m / 12,
        balance: investment,
        contributed: totalContributions,
        interest: investment - totalContributions,
        debtRemaining: totalDebtRemaining,
        monthlyCosts: thisMonthCosts
      });
    }
  }

  var last = data[data.length - 1];
  document.getElementById("totalValue").textContent = formatUSD(last.balance);
  document.getElementById("totalInterest").textContent = formatUSD(last.interest);
  document.getElementById("totalContrib").textContent = formatUSD(last.contributed);
  document.getElementById("futureCosts").textContent = formatUSD(last.monthlyCosts);
  document.getElementById("interestPct").textContent =
    last.contributed > 0
      ? Math.round((last.interest / last.contributed) * 100) + "% return on contributions"
      : "";

  // Debt-free display
  if (!hadDebt) {
    document.getElementById("debtFree").textContent = "No debt";
    document.getElementById("debtInterestPaid").textContent = "";
  } else if (debtFreeMonth !== null) {
    document.getElementById("debtFree").textContent = formatMonths(debtFreeMonth);
    document.getElementById("debtInterestPaid").textContent =
      formatUSD(totalInterestPaidOnDebt) + " total interest paid";
  } else {
    document.getElementById("debtFree").textContent = "Not within " + years + "y";
    document.getElementById("debtInterestPaid").textContent =
      formatUSD(totalInterestPaidOnDebt) + " interest paid so far";
  }

  // Bar chart
  var maxBalance = last.balance;
  var maxDebt = totalDebt;
  var chart = document.getElementById("barChart");
  chart.innerHTML = "";

  var step = 1;
  if (years > 60) step = 5;
  else if (years > 40) step = 2;

  for (var j = 0; j < data.length; j++) {
    if ((j + 1) % step !== 0 && j !== data.length - 1) continue;

    var d = data[j];
    var pctContrib = maxBalance > 0 ? (d.contributed / maxBalance) * 100 : 0;
    var pctInterest = maxBalance > 0 ? (d.interest / maxBalance) * 100 : 0;
    var hasDebt = d.debtRemaining > 0.01;
    var pctDebt = maxDebt > 0 ? (d.debtRemaining / maxDebt) * 100 : 0;

    var debtHtml = "";
    if (hasDebt) {
      debtHtml =
        '<div class="bar-debt-track">' +
          '<div class="bar-debt" style="width:' + pctDebt + '%"></div>' +
          '<span class="bar-debt-label">' + formatUSD(d.debtRemaining) + '</span>' +
        '</div>';
    }

    var row = document.createElement("div");
    row.className = "bar-row";
    row.innerHTML =
      '<div class="bar-label">' + d.year + "y</div>" +
      '<div class="bar-group">' +
        '<div class="bar-track">' +
          '<div class="bar-principal" style="width:' + pctContrib + '%"></div>' +
          '<div class="bar-interest" style="width:' + pctInterest + '%"></div>' +
        '</div>' +
        debtHtml +
      '</div>' +
      '<div class="bar-amount">' + formatUSD(d.balance) + "</div>";
    chart.appendChild(row);
  }
}
