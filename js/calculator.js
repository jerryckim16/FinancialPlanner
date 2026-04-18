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

  // Horizontal bar chart with canvas
  var maxBalance = last.balance;
  var maxDebt = totalDebt;
  var chart = document.getElementById("barChart");
  chart.innerHTML = "";

  var step = 1;
  if (years > 60) step = 5;
  else if (years > 40) step = 2;

  var filteredData = [];
  for (var j = 0; j < data.length; j++) {
    if ((j + 1) % step !== 0 && j !== data.length - 1) continue;
    filteredData.push(data[j]);
  }

  var dpr = window.devicePixelRatio || 1;
  var chartW = chart.offsetWidth || 670;
  var n = filteredData.length;
  var rowH = 28;
  var rowGap = 4;
  var padL = 45;
  var padR = 15;
  var padT = 25;
  var padB = 10;
  var chartH = padT + n * (rowH + rowGap) + padB;
  var canvas = document.createElement("canvas");
  canvas.width = chartW * dpr;
  canvas.height = chartH * dpr;
  canvas.style.width = chartW + "px";
  canvas.style.height = chartH + "px";
  var ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  chart.appendChild(canvas);

  var plotW = chartW - padL - padR;

  var xMax = maxBalance > 0 ? maxBalance * 1.05 : 1;
  var xMin = maxDebt > 0 ? -maxDebt * 1.1 : -(xMax * 0.02);
  var xRange = xMax - xMin;
  function xPos(v) { return padL + ((v - xMin) / xRange) * plotW; }
  var zeroX = xPos(0);

  // X-axis grid lines and labels at top
  var tickStep = computeTickStep(xMax);
  ctx.font = "10px 'JetBrains Mono', monospace";
  ctx.textAlign = "center";

  for (var t = 0; t <= xMax; t += tickStep) {
    var tx = xPos(t);
    ctx.strokeStyle = "#e8e8ed";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(tx, padT);
    ctx.lineTo(tx, chartH - padB);
    ctx.stroke();
    ctx.fillStyle = "#86868b";
    ctx.fillText(formatCompactUSD(t), tx, padT - 8);
  }

  if (maxDebt > 0) {
    var debtTickStep = computeTickStep(maxDebt);
    for (var t = -debtTickStep; t >= xMin; t -= debtTickStep) {
      var tx = xPos(t);
      ctx.strokeStyle = "#e8e8ed";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(tx, padT);
      ctx.lineTo(tx, chartH - padB);
      ctx.stroke();
      ctx.fillStyle = "#c0868b";
      ctx.fillText(formatCompactUSD(t), tx, padT - 8);
    }
  }

  // Zero line
  ctx.strokeStyle = "#bbb";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(zeroX, padT);
  ctx.lineTo(zeroX, chartH - padB);
  ctx.stroke();

  // Draw bars
  var netWorthPoints = [];
  for (var i = 0; i < n; i++) {
    var d = filteredData[i];
    var cy = padT + i * (rowH + rowGap) + rowH / 2;
    var barTop = cy - rowH / 2 + 2;
    var barH = rowH - 4;

    // Portfolio bars (right of zero)
    if (d.interest >= 0) {
      var contribRight = xPos(d.contributed);
      ctx.fillStyle = "#0071e3";
      roundedRect(ctx, zeroX, barTop, contribRight - zeroX, barH, 3, "left");
      ctx.fill();

      var balRight = xPos(d.balance);
      ctx.fillStyle = "#34c759";
      roundedRect(ctx, contribRight, barTop, balRight - contribRight, barH, 3, "right");
      ctx.fill();
    } else {
      var balRight = xPos(Math.max(0, d.balance));
      ctx.fillStyle = "#0071e3";
      roundedRect(ctx, zeroX, barTop, balRight - zeroX, barH, 3, "both");
      ctx.fill();
    }

    // Debt bar (left of zero)
    if (d.debtRemaining > 0.01) {
      var debtLeft = xPos(-d.debtRemaining);
      ctx.fillStyle = "#ff3b30";
      roundedRect(ctx, debtLeft, barTop, zeroX - debtLeft, barH, 3, "both");
      ctx.fill();
    }

    // Year label
    ctx.fillStyle = "#86868b";
    ctx.textAlign = "right";
    ctx.font = "11px 'JetBrains Mono', monospace";
    ctx.fillText(d.year + "y", padL - 8, cy + 4);

    // Balance label at end of bar
    var labelX = d.interest >= 0 ? xPos(d.balance) : xPos(Math.max(0, d.balance));
    ctx.fillStyle = "#1d1d1f";
    ctx.textAlign = "left";
    ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.fillText(formatCompactUSD(d.balance), labelX + 5, cy + 4);

    // Net worth point
    var nw = d.balance - d.debtRemaining;
    netWorthPoints.push({ x: xPos(nw), y: cy });
  }

  // Net worth line
  if (netWorthPoints.length > 1) {
    ctx.strokeStyle = "rgba(30, 30, 30, 0.7)";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 3]);
    ctx.beginPath();
    for (var i = 0; i < netWorthPoints.length; i++) {
      var p = netWorthPoints[i];
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Dots
    ctx.fillStyle = "#1d1d1f";
    for (var i = 0; i < netWorthPoints.length; i++) {
      var p = netWorthPoints[i];
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function roundedRect(ctx, x, y, w, h, r, side) {
    if (w <= 0) return;
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    if (side === "left") {
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w, y);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.arcTo(x, y + h, x, y + h - r, r);
      ctx.lineTo(x, y + r);
      ctx.arcTo(x, y, x + r, y, r);
    } else if (side === "right") {
      ctx.moveTo(x, y);
      ctx.lineTo(x + w - r, y);
      ctx.arcTo(x + w, y, x + w, y + r, r);
      ctx.lineTo(x + w, y + h - r);
      ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
      ctx.lineTo(x, y + h);
    } else {
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.arcTo(x + w, y, x + w, y + r, r);
      ctx.lineTo(x + w, y + h - r);
      ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
      ctx.lineTo(x + r, y + h);
      ctx.arcTo(x, y + h, x, y + h - r, r);
      ctx.lineTo(x, y + r);
      ctx.arcTo(x, y, x + r, y, r);
    }
    ctx.closePath();
  }
}
