function calculate() {
  // Income
  var annualIncome = num("annualIncome");
  var taxRate = num("taxRate") / 100;
  var incomeGrowth = num("incomeGrowth") / 100;
  var monthlyTakeHome = (annualIncome * (1 - taxRate)) / 12;
  var incomeMonthlyFactor = Math.pow(1 + incomeGrowth, 1 / 12);
  document.getElementById("monthlyTakeHome").textContent = formatUSD(monthlyTakeHome);

  // Costs (sum of dynamic cost list, normalized to monthly equivalents)
  var totalCosts = costs.reduce(function (s, c) {
    var amt = c.amount || 0;
    return s + (c.frequency === "annual" ? amt / 12 : amt);
  }, 0);
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

  // Savings / investment split
  var savingsRatePct = num("savingsRate") / 100;
  var investmentPct = 1 - savingsRatePct;

  // Investment simulation — monthly, with loans paying down over time
  var principal = num("principal");
  var years = Math.max(1, parseInt(document.getElementById("years").value) || 1);
  var months = years * 12;

  var allocations = getNormalizedAllocations();
  var invCount = investments.length;
  var monthlyRates = investments.map(function (inv) {
    return (inv.rate || 0) / 100 / 12;
  });
  var monthlyDividendRates = investments.map(function (inv) {
    return (inv.dividend || 0) / 100 / 12;
  });

  // Clone loan state for simulation
  var loanState = loans.map(function (l) {
    return { balance: l.balance || 0, rate: (l.rate || 0) / 100 / 12, payment: l.payment || 0 };
  });

  // Clone cost state with a per-cost monthly inflation factor.
  // Annual costs are spread evenly across 12 months.
  var costState = costs.map(function (c) {
    var amt = c.amount || 0;
    var monthlyAmount = c.frequency === "annual" ? amt / 12 : amt;
    var annualInflation = c.inflation || 0;
    return {
      amount: monthlyAmount,
      monthlyFactor: Math.pow(1 + annualInflation / 100, 1 / 12)
    };
  });

  var invBalances = [];
  var invContributions = [];
  var invDividendsPaid = [];
  for (var k = 0; k < invCount; k++) {
    var initBal = principal * allocations[k];
    invBalances.push(initBal);
    invContributions.push(initBal);
    invDividendsPaid.push(0);
  }
  var investment = principal;
  var totalContributions = principal;
  var totalInterestPaidOnDebt = 0;
  var debtFreeMonth = null;
  var hadDebt = loanState.some(function (l) { return l.balance > 0; });
  var savings = 0;
  var deficitDebt = 0;
  var deficitEverOccurred = false;
  var DEFICIT_APR = num("deficitAPR") / 100;
  var deficitMonthlyRate = DEFICIT_APR / 12;

  var currentTakeHome = monthlyTakeHome;
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

    // This month's total costs
    var thisMonthCosts = 0;
    for (var ci = 0; ci < costState.length; ci++) {
      thisMonthCosts += costState[ci].amount;
    }

    // Cash flow this month
    var netCashflow = currentTakeHome - thisMonthCosts - loanPaidThisMonth;
    var investContrib = 0;

    if (netCashflow >= 0) {
      // SURPLUS: pay down any accrued deficit debt first, then save/invest
      var surplus = netCashflow;
      if (deficitDebt > 0) {
        var payoff = Math.min(deficitDebt, surplus);
        deficitDebt -= payoff;
        surplus -= payoff;
      }

      // Split remaining between savings and investments
      savings += surplus * savingsRatePct;
      investContrib = surplus * investmentPct;
    } else {
      // DEFICIT: draw from savings → investments → new debt
      deficitEverOccurred = true;
      var deficit = -netCashflow;

      var fromSavings = Math.min(savings, deficit);
      savings -= fromSavings;
      deficit -= fromSavings;

      if (deficit > 0) {
        if (invCount > 0) {
          var totalInv = invBalances.reduce(function (s, b) { return s + b; }, 0);
          if (totalInv > 0) {
            var fromInv = Math.min(totalInv, deficit);
            var ratio = fromInv / totalInv;
            for (var kk = 0; kk < invCount; kk++) {
              invBalances[kk] *= (1 - ratio);
            }
            deficit -= fromInv;
          }
        } else if (investment > 0) {
          var fromInv = Math.min(investment, deficit);
          investment -= fromInv;
          deficit -= fromInv;
        }
      }

      if (deficit > 0) {
        deficitDebt += deficit;
      }
    }

    // Grow each investment independently (applies regardless of surplus/deficit).
    // Rate = capital appreciation. Dividend = additional cash yield paid from balance to savings.
    var monthlyDividends = 0;
    if (invCount > 0) {
      for (var k = 0; k < invCount; k++) {
        var thisContrib = investContrib * allocations[k];
        invBalances[k] = invBalances[k] * (1 + monthlyRates[k]) + thisContrib;
        invContributions[k] += thisContrib;
        var divPayout = invBalances[k] * monthlyDividendRates[k];
        if (divPayout > 0) {
          monthlyDividends += divPayout;
          invBalances[k] -= divPayout;
          invDividendsPaid[k] += divPayout;
        }
      }
      investment = invBalances.reduce(function (s, b) { return s + b; }, 0);
    } else {
      investment += investContrib;
    }
    totalContributions += investContrib;
    savings += monthlyDividends;

    // Accrue interest on any deficit debt
    if (deficitDebt > 0) {
      var deficitInterest = deficitDebt * deficitMonthlyRate;
      deficitDebt += deficitInterest;
      totalInterestPaidOnDebt += deficitInterest;
    }

    // Combined debt remaining (loans + accrued deficit)
    var totalDebtRemaining = loanState.reduce(function (s, L) { return s + L.balance; }, 0) + deficitDebt;
    if (hadDebt && debtFreeMonth === null && totalDebtRemaining <= 0.01) {
      debtFreeMonth = m;
    }

    // Grow take-home and inflate costs for the next month
    currentTakeHome *= incomeMonthlyFactor;
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
        monthlyCosts: thisMonthCosts,
        savings: savings,
        deficitDebt: deficitDebt,
        investmentBreakdown: investments.map(function (inv, idx) {
          return {
            name: inv.name,
            balance: invBalances[idx],
            contributed: invContributions[idx],
            interest: invBalances[idx] - invContributions[idx],
            dividendsPaid: invDividendsPaid[idx]
          };
        })
      });
    }
  }

  var last = data[data.length - 1];
  var finalAssets = last.balance + last.savings;
  var finalNetWorth = finalAssets - last.debtRemaining;

  document.getElementById("netWorthValue").textContent = formatUSD(finalNetWorth);
  document.getElementById("totalAssets").textContent = formatUSD(finalAssets);
  var assetParts = [];
  if (last.balance > 0.01) assetParts.push(formatUSD(last.balance) + " invested");
  if (last.savings > 0.01) assetParts.push(formatUSD(last.savings) + " savings");
  document.getElementById("assetsSub").textContent = assetParts.join(" + ");

  document.getElementById("totalDebtEnd").textContent =
    last.debtRemaining > 0.01 ? formatUSD(last.debtRemaining) : "$0";
  document.getElementById("debtEndSub").textContent =
    totalInterestPaidOnDebt > 0.01 ? formatUSD(totalInterestPaidOnDebt) + " total interest paid" : "";

  document.getElementById("futureCosts").textContent = formatUSD(last.monthlyCosts);

  // Debt-free display
  var finalDeficitDebt = last.deficitDebt || 0;
  if (!hadDebt && finalDeficitDebt <= 0.01) {
    document.getElementById("debtFree").textContent = "No debt";
    document.getElementById("debtInterestPaid").textContent = deficitEverOccurred
      ? "Deficit recovered within period"
      : "";
  } else if (finalDeficitDebt > 0.01) {
    document.getElementById("debtFree").textContent = "In deficit";
    document.getElementById("debtInterestPaid").textContent =
      formatUSD(finalDeficitDebt) + " accrued at " + (DEFICIT_APR * 100) + "% APR";
  } else if (debtFreeMonth !== null) {
    document.getElementById("debtFree").textContent = formatMonths(debtFreeMonth);
    document.getElementById("debtInterestPaid").textContent =
      formatUSD(totalInterestPaidOnDebt) + " total interest paid";
  } else {
    document.getElementById("debtFree").textContent = "Not within " + years + "y";
    document.getElementById("debtInterestPaid").textContent =
      formatUSD(totalInterestPaidOnDebt) + " interest paid so far";
  }

  // Escalate warning banner if simulation ever hit a deficit
  if (deficitEverOccurred) {
    var warningBanner = document.getElementById("savingsWarning");
    warningBanner.style.display = "block";
    warningBanner.textContent = finalDeficitDebt > 0.01
      ? "Your costs exceeded income — " + formatUSD(finalDeficitDebt) + " of revolving debt accrued by end of period."
      : "Your costs exceeded income in some months. Reserves were drawn down to cover the gap.";
  }

  // Savings display
  document.getElementById("savingsBalance").textContent = formatUSD(savings);

  // Per-investment breakdown table
  var breakdownContainer = document.getElementById("investmentBreakdown");
  if (last.investmentBreakdown && last.investmentBreakdown.length > 1) {
    var bHtml = '<div class="breakdown-header">Investment Breakdown</div>';
    bHtml += '<div class="breakdown-table">';
    var anyDividends = last.investmentBreakdown.some(function (b) { return b.dividendsPaid > 0.01; });
    bHtml += '<div class="breakdown-row breakdown-row-header">' +
      '<span>Investment</span><span>Balance</span>' +
      (anyDividends ? '<span>Dividends Paid</span>' : '') + '</div>';
    for (var bi = 0; bi < last.investmentBreakdown.length; bi++) {
      var bInv = last.investmentBreakdown[bi];
      bHtml += '<div class="breakdown-row">' +
        '<span>' + escapeHtml(bInv.name) + '</span>' +
        '<span>' + formatUSD(bInv.balance) + '</span>' +
        (anyDividends ? '<span>' + formatUSD(bInv.dividendsPaid) + '</span>' : '') +
        '</div>';
    }
    bHtml += '</div>';
    breakdownContainer.innerHTML = bHtml;
  } else {
    breakdownContainer.innerHTML = '';
  }

  // Vertical bar chart with canvas
  // Scan data for actual ranges (not just last point or initial state)
  var maxAssets = 0;
  var maxDebt = 0;
  for (var j = 0; j < data.length; j++) {
    var assets = data[j].balance + data[j].savings;
    if (assets > maxAssets) maxAssets = assets;
    if (data[j].debtRemaining > maxDebt) maxDebt = data[j].debtRemaining;
  }
  var maxBalance = maxAssets;
  var chart = document.getElementById("barChart");
  chart.innerHTML = "";

  var step = 1;
  if (years > 30) step = 5;
  else if (years > 15) step = 2;

  var filteredData = [];
  for (var j = 0; j < data.length; j++) {
    if ((j + 1) % step !== 0 && j !== data.length - 1) continue;
    filteredData.push(data[j]);
  }

  var dpr = window.devicePixelRatio || 1;
  var chartW = chart.offsetWidth || 670;
  var chartH = 380;
  var n = filteredData.length;
  var padL = 65;
  var padR = 20;
  var padT = 20;
  var padB = 36;
  var canvas = document.createElement("canvas");
  canvas.width = chartW * dpr;
  canvas.height = chartH * dpr;
  canvas.style.width = chartW + "px";
  canvas.style.height = chartH + "px";
  var ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  chart.appendChild(canvas);

  var plotW = chartW - padL - padR;
  var plotH = chartH - padT - padB;

  // Use a single unified tick step for the whole axis
  var rawMax = Math.max(maxBalance, maxDebt) || 1;
  var tickStep = computeTickStep(rawMax);

  // Snap yMax/yMin to tick boundaries; always include at least one tick of positive space
  var yMax = Math.max(tickStep, Math.ceil(maxBalance / tickStep) * tickStep);
  if (yMax < maxBalance * 1.02) yMax += tickStep;
  var yMin = 0;
  if (maxDebt > 0) {
    yMin = -(Math.ceil(maxDebt / tickStep) * tickStep);
    if (Math.abs(yMin) < maxDebt * 1.02) yMin -= tickStep;
  }
  var yRange = yMax - yMin || 1;
  function yPos(v) { return padT + ((yMax - v) / yRange) * plotH; }
  var zeroY = yPos(0);

  var colSpacing = plotW / n;
  var barW = Math.max(4, Math.min(colSpacing * 0.6, 30));

  // Unified grid lines and y-axis labels
  ctx.font = "10px 'JetBrains Mono', monospace";
  ctx.textAlign = "right";

  for (var t = yMin; t <= yMax; t += tickStep) {
    var ty = yPos(t);
    if (t === 0) continue;
    ctx.strokeStyle = t < 0 ? "#fbeaea" : "#eef0f3";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(padL, ty);
    ctx.lineTo(chartW - padR, ty);
    ctx.stroke();
    ctx.fillStyle = t < 0 ? "#c0868b" : "#86868b";
    ctx.fillText(formatCompactUSD(t), padL - 8, ty + 3);
  }

  // Zero line
  ctx.strokeStyle = "#aaa";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padL, zeroY);
  ctx.lineTo(chartW - padR, zeroY);
  ctx.stroke();
  ctx.fillStyle = "#86868b";
  ctx.font = "10px 'JetBrains Mono', monospace";
  ctx.textAlign = "right";
  ctx.fillText("$0", padL - 8, zeroY + 3);

  // Draw bars
  var netWorthPoints = [];
  for (var i = 0; i < n; i++) {
    var d = filteredData[i];
    var cx = padL + (i + 0.5) * colSpacing;
    var x = cx - barW / 2;

    // Assets bar (investments + savings, upward from zero)
    var totalAssets = d.balance + d.savings;
    if (totalAssets > 0.01) {
      var assetsTop = yPos(totalAssets);
      ctx.fillStyle = "#0071e3";
      roundedRect(ctx, x, assetsTop, barW, zeroY - assetsTop, 3, "both");
      ctx.fill();
    }

    // Debt bar (downward from zero)
    if (d.debtRemaining > 0.01) {
      var debtBot = yPos(-d.debtRemaining);
      ctx.fillStyle = "#ff3b30";
      roundedRect(ctx, x, zeroY, barW, debtBot - zeroY, 3, "both");
      ctx.fill();
    }

    // Net worth point
    var nw = d.balance + d.savings - d.debtRemaining;
    netWorthPoints.push({ x: cx, y: yPos(nw), value: nw, year: d.year, dataIdx: i });
  }

  // X-axis labels
  ctx.fillStyle = "#86868b";
  ctx.font = "10px 'JetBrains Mono', monospace";
  ctx.textAlign = "center";
  for (var i = 0; i < n; i++) {
    var d = filteredData[i];
    var cx = padL + (i + 0.5) * colSpacing;
    ctx.fillText(d.year + "y", cx, chartH - padB + 16);
  }

  // Net worth line
  if (netWorthPoints.length > 1) {
    ctx.strokeStyle = "rgba(30, 30, 30, 0.8)";
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

    ctx.fillStyle = "#1d1d1f";
    for (var i = 0; i < netWorthPoints.length; i++) {
      var p = netWorthPoints[i];
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Hover tooltip for net worth dots
  var tooltip = document.createElement("div");
  tooltip.className = "chart-tooltip";
  chart.appendChild(tooltip);

  var HOVER_RADIUS = 20;
  var activePoint = null;

  canvas.addEventListener("mousemove", function (e) {
    var rect = canvas.getBoundingClientRect();
    var mx = e.clientX - rect.left;
    var my = e.clientY - rect.top;

    var closest = null;
    var minDist = HOVER_RADIUS;
    for (var i = 0; i < netWorthPoints.length; i++) {
      var p = netWorthPoints[i];
      var dx = mx - p.x;
      var dy = my - p.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) {
        minDist = dist;
        closest = p;
      }
    }

    if (closest) {
      if (activePoint !== closest) {
        activePoint = closest;
        var fd = filteredData[closest.dataIdx];
        var ttBreakdown = '';
        var hasAny = fd.balance > 0.01 || fd.savings > 0.01 || fd.debtRemaining > 0.01;
        if (hasAny) {
          ttBreakdown = '<div class="tt-breakdown">';
          if (fd.balance > 0.01) {
            ttBreakdown += '<div class="tt-inv">Investments: ' + formatUSD(fd.balance) + '</div>';
            var bd = fd.investmentBreakdown;
            if (bd && bd.length > 1) {
              for (var bi = 0; bi < bd.length; bi++) {
                ttBreakdown += '<div class="tt-inv">&nbsp;&nbsp;' + escapeHtml(bd[bi].name) + ': ' + formatUSD(bd[bi].balance) + '</div>';
              }
            }
          }
          if (fd.savings > 0.01) ttBreakdown += '<div class="tt-inv">Savings: ' + formatUSD(fd.savings) + '</div>';
          if (fd.debtRemaining > 0.01) ttBreakdown += '<div class="tt-inv">Debt: -' + formatUSD(fd.debtRemaining) + '</div>';
          ttBreakdown += '</div>';
        }
        tooltip.innerHTML =
          '<div class="tt-year">Year ' + closest.year + '</div>' +
          '<div class="tt-value">' + formatUSD(closest.value) + '</div>' +
          '<div class="tt-label">Net Worth</div>' + ttBreakdown;
      }
      tooltip.style.left = closest.x + "px";
      tooltip.style.top = (closest.y - 12) + "px";
      tooltip.classList.add("visible");
      canvas.style.cursor = "pointer";
    } else if (activePoint) {
      activePoint = null;
      tooltip.classList.remove("visible");
      canvas.style.cursor = "default";
    }
  });

  canvas.addEventListener("mouseleave", function () {
    activePoint = null;
    tooltip.classList.remove("visible");
    canvas.style.cursor = "default";
  });

  function roundedRect(ctx, x, y, w, h, r, side) {
    if (w <= 0 || h <= 0) return;
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    if (side === "top") {
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.arcTo(x + w, y, x + w, y + r, r);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x, y + h);
      ctx.lineTo(x, y + r);
      ctx.arcTo(x, y, x + r, y, r);
    } else if (side === "bottom") {
      ctx.moveTo(x, y);
      ctx.lineTo(x + w, y);
      ctx.lineTo(x + w, y + h - r);
      ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
      ctx.lineTo(x + r, y + h);
      ctx.arcTo(x, y + h, x, y + h - r, r);
      ctx.lineTo(x, y);
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
