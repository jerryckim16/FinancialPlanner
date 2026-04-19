function calculateOpportunity() {
  var amount = num("ocAmount");
  var activeSeg = document.querySelector("#ocSpendingType .seg-btn.active");
  var spendingType = activeSeg ? activeSeg.getAttribute("data-type") : "onetime";
  var frequency = document.getElementById("ocFrequency").value;
  var annualRate = num("ocRate");
  var years = Math.max(1, parseInt(document.getElementById("ocYears").value) || 1);

  var monthlyRate = annualRate / 100 / 12;
  var months = years * 12;

  var oneTime = 0;
  var recurring = 0;
  if (spendingType === "recurring") {
    recurring = amount;
  } else {
    oneTime = amount;
  }

  // Convert recurring to monthly
  var monthlyRecurring = 0;
  if (frequency === "daily") monthlyRecurring = recurring * 30.44;
  else if (frequency === "weekly") monthlyRecurring = recurring * 52 / 12;
  else if (frequency === "monthly") monthlyRecurring = recurring;
  else if (frequency === "annual") monthlyRecurring = recurring / 12;

  // Total spent over the period
  var totalSpent = oneTime + monthlyRecurring * months;

  // Future value of one-time investment
  var fvOneTime = oneTime * Math.pow(1 + annualRate / 100, years);

  // Future value of recurring monthly investment (annuity)
  var fvRecurring = 0;
  if (monthlyRate > 0 && monthlyRecurring > 0) {
    fvRecurring = monthlyRecurring * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
  } else if (monthlyRecurring > 0) {
    fvRecurring = monthlyRecurring * months;
  }

  var totalFV = fvOneTime + fvRecurring;
  var opportunityCost = totalFV - totalSpent;
  var multiple = totalSpent > 0 ? totalFV / totalSpent : 0;

  // Update display
  document.getElementById("ocSpent").textContent = formatUSD(totalSpent);

  var itemName = document.getElementById("ocName").value.trim();
  var spentParts = [];
  if (oneTime > 0) spentParts.push(formatUSD(oneTime) + " one-time");
  if (monthlyRecurring > 0) spentParts.push(formatUSD(monthlyRecurring) + "/mo recurring");
  document.getElementById("ocSpentSub").textContent = spentParts.join(" + ");

  document.getElementById("ocGrown").textContent = formatUSD(totalFV);
  document.getElementById("ocCost").textContent = formatUSD(opportunityCost);

  var costLabel = itemName
    ? "You're paying " + formatUSD(opportunityCost) + " for " + itemName
    : "Money lost to spending instead of investing";
  document.getElementById("ocCostSub").textContent = costLabel;

  document.getElementById("ocMultiple").textContent = multiple.toFixed(1) + "x";
  document.getElementById("ocMultipleSub").textContent =
    "Every $1 spent costs $" + multiple.toFixed(2) + " in " + years + "y";

  // Chart: cumulative spent vs investment value, year by year
  var chart = document.getElementById("ocChart");
  chart.innerHTML = "";

  var data = [];
  var inv = oneTime;
  var spent = oneTime;
  data.push({ year: 0, spent: spent, invested: inv });

  for (var y = 1; y <= years; y++) {
    // Grow the one-time portion for a year (monthly compounding)
    // and add recurring contributions each month
    for (var mo = 0; mo < 12; mo++) {
      inv = inv * (1 + monthlyRate) + monthlyRecurring;
      spent += monthlyRecurring;
    }
    data.push({ year: y, spent: spent, invested: inv });
  }

  // Canvas setup
  var dpr = window.devicePixelRatio || 1;
  var chartW = chart.offsetWidth || 670;
  var chartH = 320;
  var canvas = document.createElement("canvas");
  canvas.width = chartW * dpr;
  canvas.height = chartH * dpr;
  canvas.style.width = chartW + "px";
  canvas.style.height = chartH + "px";
  var ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  chart.appendChild(canvas);

  var padL = 65, padR = 20, padT = 20, padB = 36;
  var plotW = chartW - padL - padR;
  var plotH = chartH - padT - padB;

  var yMax = data[data.length - 1].invested;
  if (yMax <= 0) yMax = Math.max(totalSpent, 1);
  var tickStep = computeTickStep(yMax);
  yMax = Math.ceil(yMax / tickStep) * tickStep;
  if (yMax < data[data.length - 1].invested * 1.02) yMax += tickStep;
  var yRange = yMax;

  function yPos(v) { return padT + ((yMax - v) / yRange) * plotH; }
  function xPos(yr) { return padL + (yr / years) * plotW; }

  // Grid lines
  ctx.font = "10px 'JetBrains Mono', monospace";
  ctx.textAlign = "right";
  for (var t = 0; t <= yMax; t += tickStep) {
    var ty = yPos(t);
    ctx.strokeStyle = "#eef0f3";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(padL, ty);
    ctx.lineTo(chartW - padR, ty);
    ctx.stroke();
    ctx.fillStyle = "#86868b";
    ctx.fillText(formatCompactUSD(t), padL - 8, ty + 3);
  }

  // X-axis labels
  ctx.textAlign = "center";
  ctx.fillStyle = "#86868b";
  var labelStep = 1;
  if (years > 30) labelStep = 10;
  else if (years > 15) labelStep = 5;
  else if (years > 8) labelStep = 2;
  for (var y = 0; y <= years; y += labelStep) {
    ctx.fillText(y + "y", xPos(y), chartH - padB + 16);
  }
  if (years % labelStep !== 0) {
    ctx.fillText(years + "y", xPos(years), chartH - padB + 16);
  }

  // Spent line (gray)
  ctx.strokeStyle = "#86868b";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (var i = 0; i < data.length; i++) {
    var px = xPos(data[i].year);
    var py = yPos(data[i].spent);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  // Fill area between lines
  ctx.fillStyle = "rgba(0, 113, 227, 0.08)";
  ctx.beginPath();
  for (var i = 0; i < data.length; i++) {
    var px = xPos(data[i].year);
    if (i === 0) ctx.moveTo(px, yPos(data[i].invested));
    else ctx.lineTo(px, yPos(data[i].invested));
  }
  for (var i = data.length - 1; i >= 0; i--) {
    ctx.lineTo(xPos(data[i].year), yPos(data[i].spent));
  }
  ctx.closePath();
  ctx.fill();

  // Invested line (blue)
  ctx.strokeStyle = "#0071e3";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (var i = 0; i < data.length; i++) {
    var px = xPos(data[i].year);
    var py = yPos(data[i].invested);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  // Dots on invested line
  var investPoints = [];
  for (var i = 0; i < data.length; i++) {
    var d = data[i];
    var px = xPos(d.year);
    var py = yPos(d.invested);
    ctx.fillStyle = "#0071e3";
    ctx.beginPath();
    ctx.arc(px, py, 3, 0, Math.PI * 2);
    ctx.fill();
    investPoints.push({ x: px, y: py, year: d.year, value: d.invested, spent: d.spent });
  }

  // Hover tooltip
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
    for (var i = 0; i < investPoints.length; i++) {
      var p = investPoints[i];
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
        var costAtPoint = closest.value - closest.spent;
        tooltip.innerHTML =
          '<div class="tt-year">Year ' + closest.year + '</div>' +
          '<div class="tt-value">' + formatUSD(closest.value) + '</div>' +
          '<div class="tt-label">Opportunity cost: ' + formatUSD(costAtPoint) + '</div>';
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
}
