var STORAGE_KEY = "financialPlanner.state.v1";
var STORAGE_VERSION = 1;

var PLANNER_INPUT_IDS = [
  "annualIncome", "taxRate", "incomeGrowth",
  "savingsRate",
  "principal", "years", "deficitAPR"
];

var OC_INPUT_IDS = ["ocAmount", "ocName", "ocRate", "ocYears", "ocFrequency"];

function buildState() {
  var planner = {};
  for (var i = 0; i < PLANNER_INPUT_IDS.length; i++) {
    var id = PLANNER_INPUT_IDS[i];
    var el = document.getElementById(id);
    if (el) planner[id] = el.value;
  }
  planner.costs = costs.map(function (c) { return Object.assign({}, c); });
  planner.loans = loans.map(function (l) { return Object.assign({}, l); });
  planner.investments = investments.map(function (inv) { return Object.assign({}, inv); });

  var opportunity = {};
  for (var j = 0; j < OC_INPUT_IDS.length; j++) {
    var oid = OC_INPUT_IDS[j];
    var oel = document.getElementById(oid);
    if (oel) opportunity[oid] = oel.value;
  }
  var activeSeg = document.querySelector("#ocSpendingType .seg-btn.active");
  opportunity.ocSpendingType = activeSeg ? activeSeg.getAttribute("data-type") : "onetime";

  return { version: STORAGE_VERSION, planner: planner, opportunity: opportunity };
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(buildState()));
  } catch (e) {
    // private browsing or quota exceeded — silently ignore
  }
}

var saveTimer = null;
function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(saveState, 150);
}

function loadState() {
  var raw;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch (e) {
    return false;
  }
  if (!raw) return false;

  var state;
  try {
    state = JSON.parse(raw);
  } catch (e) {
    return false;
  }
  if (!state || state.version !== STORAGE_VERSION) return false;

  var p = state.planner || {};
  for (var i = 0; i < PLANNER_INPUT_IDS.length; i++) {
    var id = PLANNER_INPUT_IDS[i];
    if (p[id] !== undefined) {
      var el = document.getElementById(id);
      if (el) el.value = p[id];
    }
  }
  if (p.savingsRate !== undefined) {
    var s = parseInt(p.savingsRate) || 0;
    var sl = document.getElementById("savingsLabel");
    var il = document.getElementById("investLabel");
    if (sl) sl.textContent = s + "%";
    if (il) il.textContent = (100 - s) + "%";
  }

  if (Array.isArray(p.costs)) {
    costs.length = 0;
    for (var ci = 0; ci < p.costs.length; ci++) costs.push(Object.assign({}, p.costs[ci]));
  }
  if (Array.isArray(p.loans)) {
    loans.length = 0;
    for (var li = 0; li < p.loans.length; li++) loans.push(Object.assign({}, p.loans[li]));
  }
  if (Array.isArray(p.investments)) {
    investments.length = 0;
    for (var ii = 0; ii < p.investments.length; ii++) investments.push(Object.assign({}, p.investments[ii]));
  }

  var oc = state.opportunity || {};
  for (var j = 0; j < OC_INPUT_IDS.length; j++) {
    var oid = OC_INPUT_IDS[j];
    if (oc[oid] !== undefined) {
      var oel = document.getElementById(oid);
      if (oel) oel.value = oc[oid];
    }
  }
  if (oc.ocSpendingType === "onetime" || oc.ocSpendingType === "recurring") {
    document.querySelectorAll("#ocSpendingType .seg-btn").forEach(function (btn) {
      if (btn.getAttribute("data-type") === oc.ocSpendingType) btn.classList.add("active");
      else btn.classList.remove("active");
    });
    var freqRow = document.getElementById("ocFrequencyRow");
    if (freqRow) freqRow.style.display = oc.ocSpendingType === "recurring" ? "block" : "none";
  }

  return true;
}

function resetInputToDefault(id) {
  var el = document.getElementById(id);
  if (!el) return;
  if (el.type === "number" || el.type === "text" || el.type === "range") {
    el.value = el.defaultValue;
  } else if (el.tagName === "SELECT") {
    for (var i = 0; i < el.options.length; i++) {
      if (el.options[i].defaultSelected) { el.selectedIndex = i; return; }
    }
    el.selectedIndex = 0;
  }
}

function resetState() {
  try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}

  costs.length = 0;
  for (var i = 0; i < DEFAULT_COSTS.length; i++) costs.push(Object.assign({}, DEFAULT_COSTS[i]));
  loans.length = 0;
  for (var j = 0; j < DEFAULT_LOANS.length; j++) loans.push(Object.assign({}, DEFAULT_LOANS[j]));
  investments.length = 0;
  for (var k = 0; k < DEFAULT_INVESTMENTS.length; k++) investments.push(Object.assign({}, DEFAULT_INVESTMENTS[k]));

  for (var pi = 0; pi < PLANNER_INPUT_IDS.length; pi++) resetInputToDefault(PLANNER_INPUT_IDS[pi]);
  for (var oi = 0; oi < OC_INPUT_IDS.length; oi++) resetInputToDefault(OC_INPUT_IDS[oi]);

  var savingsInput = document.getElementById("savingsRate");
  if (savingsInput) {
    var sv = parseInt(savingsInput.value) || 0;
    var sl = document.getElementById("savingsLabel");
    var il = document.getElementById("investLabel");
    if (sl) sl.textContent = sv + "%";
    if (il) il.textContent = (100 - sv) + "%";
  }

  document.querySelectorAll("#ocSpendingType .seg-btn").forEach(function (btn) {
    if (btn.getAttribute("data-type") === "onetime") btn.classList.add("active");
    else btn.classList.remove("active");
  });
  var freqRow = document.getElementById("ocFrequencyRow");
  if (freqRow) freqRow.style.display = "none";

  renderCosts();
  renderLoans();
  renderInvestments();
  calculate();
  calculateOpportunity();
}
