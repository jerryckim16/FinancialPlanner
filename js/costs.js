var costs = [
  { name: "Rent / Mortgage", amount: 1500 },
  { name: "Food", amount: 500 },
  { name: "Car Payment", amount: 300 },
  { name: "Car Insurance", amount: 120 },
  { name: "Phone", amount: 60 },
  { name: "Utilities", amount: 150 },
  { name: "Other", amount: 100 }
];
var costIdCounter = 0;

function renderCosts() {
  var container = document.getElementById("costsList");
  container.innerHTML = "";

  if (costs.length === 0) {
    var empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No costs \u2014 click \u2018Add Cost\u2019 to start tracking expenses.";
    container.appendChild(empty);
    return;
  }

  costs.forEach(function (cost, idx) {
    var row = document.createElement("div");
    row.className = "cost-row";
    row.innerHTML =
      '<input type="text" data-idx="' + idx + '" data-field="name" value="' + escapeHtml(cost.name) + '" placeholder="Cost name" />' +
      '<div class="dollar-prefix">' +
        '<input type="number" data-idx="' + idx + '" data-field="amount" value="' + cost.amount + '" min="0" step="10" />' +
      '</div>' +
      '<button class="btn-ghost" data-remove="' + idx + '">Remove</button>';
    container.appendChild(row);
  });

  container.querySelectorAll("input").forEach(function (el) {
    el.addEventListener("input", function (e) {
      var idx = parseInt(e.target.getAttribute("data-idx"));
      var field = e.target.getAttribute("data-field");
      var value = field === "name" ? e.target.value : (parseFloat(e.target.value) || 0);
      costs[idx][field] = value;
      calculate();
    });
  });

  container.querySelectorAll("[data-remove]").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      var idx = parseInt(e.target.getAttribute("data-remove"));
      costs.splice(idx, 1);
      renderCosts();
      calculate();
    });
  });
}
