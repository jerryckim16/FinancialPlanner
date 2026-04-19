var DEFAULT_INVESTMENTS = [
  { name: "US Stock Index", rate: 10, allocation: 80 },
  { name: "Bond Index", rate: 4, allocation: 20 }
];
var investments = DEFAULT_INVESTMENTS.map(function (inv) { return Object.assign({}, inv); });
var investmentIdCounter = 0;

function getNormalizedAllocations() {
  var total = investments.reduce(function (s, inv) { return s + (inv.allocation || 0); }, 0);
  if (total <= 0) {
    var eq = investments.length > 0 ? 1 / investments.length : 0;
    return investments.map(function () { return eq; });
  }
  return investments.map(function (inv) { return (inv.allocation || 0) / total; });
}

function renderInvestments() {
  var container = document.getElementById("investmentsList");
  container.innerHTML = "";

  if (investments.length === 0) {
    var empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No investments \u2014 click \u2018+ Add Investment\u2019 to build your portfolio.";
    container.appendChild(empty);
    renderAllocationIndicator(container);
    return;
  }

  var header = document.createElement("div");
  header.className = "investment-row investment-header";
  header.innerHTML =
    '<span>Name</span>' +
    '<span>Return (%)</span>' +
    '<span>Allocation (%)</span>' +
    '<span></span>';
  container.appendChild(header);

  investments.forEach(function (inv, idx) {
    var row = document.createElement("div");
    row.className = "investment-row";
    row.innerHTML =
      '<input type="text" data-idx="' + idx + '" data-field="name" value="' + escapeHtml(inv.name) + '" placeholder="Investment name" />' +
      '<div class="percent-suffix">' +
        '<input type="number" data-idx="' + idx + '" data-field="rate" value="' + inv.rate + '" min="-50" max="100" step="0.5" />' +
      '</div>' +
      '<div class="percent-suffix">' +
        '<input type="number" data-idx="' + idx + '" data-field="allocation" value="' + inv.allocation + '" min="0" max="100" step="1" />' +
      '</div>' +
      '<button class="btn-ghost" data-remove="' + idx + '">Remove</button>';
    container.appendChild(row);
  });

  container.querySelectorAll("input").forEach(function (el) {
    el.addEventListener("input", function (e) {
      var idx = parseInt(e.target.getAttribute("data-idx"));
      var field = e.target.getAttribute("data-field");
      if (field === "name") {
        investments[idx][field] = e.target.value;
      } else {
        investments[idx][field] = parseFloat(e.target.value) || 0;
      }
      if (field === "allocation") renderAllocationIndicator(container);
      calculate();
      scheduleSave();
    });
  });

  container.querySelectorAll("[data-remove]").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      var idx = parseInt(e.target.getAttribute("data-remove"));
      investments.splice(idx, 1);
      renderInvestments();
      calculate();
      scheduleSave();
    });
  });

  renderAllocationIndicator(container);
}

function renderAllocationIndicator(container) {
  var existing = container.parentElement.querySelector(".allocation-indicator");
  if (existing) existing.remove();

  var total = investments.reduce(function (s, inv) { return s + (inv.allocation || 0); }, 0);
  var indicator = document.createElement("div");
  indicator.className = "allocation-indicator";

  if (investments.length === 0) {
    indicator.classList.add("warning");
    indicator.textContent = "No investments added";
  } else if (total === 100) {
    indicator.classList.add("valid");
    indicator.textContent = "Allocation: 100%";
  } else {
    indicator.classList.add("warning");
    var diff = 100 - total;
    indicator.textContent = "Allocation: " + total + "%" +
      (diff > 0 ? " \u2014 " + diff + "% unallocated" : " \u2014 " + Math.abs(diff) + "% over");
  }

  container.after(indicator);
}
