var bankAccounts = [];
var bankTransactions = [];
var spendingSummary = [];
var bankAvailable = false;
var bankActiveView = "summary";

var CATEGORY_NAMES = {
  "FOOD_AND_DRINK": "Food & Drink",
  "TRANSPORTATION": "Transportation",
  "RENT_AND_UTILITIES": "Rent & Utilities",
  "GENERAL_MERCHANDISE": "Shopping",
  "ENTERTAINMENT": "Entertainment",
  "PERSONAL_CARE": "Personal Care",
  "MEDICAL": "Medical / Health",
  "INSURANCE": "Insurance",
  "LOAN_PAYMENTS": "Loan Payments",
  "TRANSFER_OUT": "Transfers Out",
  "TRANSFER_IN": "Transfers In",
  "TRAVEL": "Travel",
  "GOVERNMENT_AND_NON_PROFIT": "Taxes & Fees",
  "HOME_IMPROVEMENT": "Home Improvement",
  "GENERAL_SERVICES": "Services",
  "INCOME": "Income",
  "BANK_FEES": "Bank Fees",
  "OTHER": "Other"
};

var EXCLUDED_CATEGORIES = ["INCOME", "TRANSFER_IN", "TRANSFER_OUT", "LOAN_PAYMENTS"];

function bankApi(method, path, body) {
  var opts = { method: method, headers: { "Content-Type": "application/json" } };
  if (body) opts.body = JSON.stringify(body);
  return fetch("/api/plaid/" + path, opts).then(function (res) {
    if (!res.ok) throw new Error("API error: " + res.status);
    return res.json();
  });
}

function categoryName(code) {
  return CATEGORY_NAMES[code] || code.replace(/_/g, " ").replace(/\b\w/g, function (c) {
    return c.toUpperCase();
  }).toLowerCase().replace(/^\w/, function (c) { return c.toUpperCase(); });
}

function loadBankAccounts() {
  bankApi("GET", "accounts").then(function (data) {
    bankAvailable = true;
    bankAccounts = data.accounts || [];
    renderBankTab();
  }).catch(function () {
    bankAvailable = false;
    renderBankTab();
  });
}

function initPlaidLink() {
  var connectBtn = document.getElementById("bankConnectBtn");
  if (connectBtn) {
    connectBtn.disabled = true;
    connectBtn.textContent = "Connecting...";
  }

  bankApi("POST", "create-link-token").then(function (data) {
    if (typeof Plaid === "undefined") {
      alert("Plaid Link SDK failed to load. Check your internet connection or ad blocker.");
      if (connectBtn) { connectBtn.disabled = false; connectBtn.textContent = "Connect Bank"; }
      return;
    }

    var handler = Plaid.create({
      token: data.link_token,
      onSuccess: function (publicToken, metadata) {
        if (connectBtn) connectBtn.textContent = "Linking...";
        bankApi("POST", "exchange-token", {
          public_token: publicToken
        }).then(function () {
          loadBankAccounts();
        }).catch(function (err) {
          alert("Failed to link account: " + err.message);
          if (connectBtn) { connectBtn.disabled = false; connectBtn.textContent = "Connect Bank"; }
        });
      },
      onExit: function () {
        if (connectBtn) { connectBtn.disabled = false; connectBtn.textContent = "Connect Bank"; }
      }
    });
    handler.open();
  }).catch(function (err) {
    alert("Failed to start bank connection: " + err.message);
    if (connectBtn) { connectBtn.disabled = false; connectBtn.textContent = "Connect Bank"; }
  });
}

function syncTransactions() {
  var syncBtn = document.getElementById("bankSyncBtn");
  if (syncBtn) { syncBtn.disabled = true; syncBtn.textContent = "Syncing..."; }

  bankApi("POST", "sync-transactions").then(function (data) {
    if (syncBtn) { syncBtn.disabled = false; syncBtn.textContent = "Sync Now"; }
    if (bankActiveView === "transactions") {
      loadTransactions();
    } else {
      loadSpendingSummary();
    }
  }).catch(function (err) {
    if (syncBtn) { syncBtn.disabled = false; syncBtn.textContent = "Sync Now"; }
    alert("Sync failed: " + err.message);
  });
}

function disconnectAccount(itemId) {
  if (!confirm("Disconnect this bank account? Transaction data will be deleted.")) return;
  bankApi("DELETE", "accounts/" + itemId).then(function () {
    loadBankAccounts();
  }).catch(function (err) {
    alert("Failed to disconnect: " + err.message);
  });
}

function loadTransactions() {
  bankApi("GET", "transactions?months=3").then(function (data) {
    bankTransactions = data.transactions || [];
    renderTransactionList();
  }).catch(function () {
    bankTransactions = [];
    renderTransactionList();
  });
}

function loadSpendingSummary() {
  bankApi("GET", "spending-summary?months=3").then(function (data) {
    spendingSummary = (data.summary || []).filter(function (s) {
      return EXCLUDED_CATEGORIES.indexOf(s.category_primary) === -1;
    });
    renderSpendingSummary();
  }).catch(function () {
    spendingSummary = [];
    renderSpendingSummary();
  });
}

function renderBankTab() {
  var statusEl = document.getElementById("bankStatus");
  var actionsEl = document.getElementById("bankActions");
  var contentEl = document.getElementById("bankContent");
  if (!statusEl || !actionsEl || !contentEl) return;

  if (!bankAvailable) {
    actionsEl.innerHTML = "";
    statusEl.innerHTML =
      '<div class="bank-status disconnected">Server offline</div>';
    contentEl.innerHTML =
      '<div class="empty-state">Bank sync requires running the server. ' +
      'Start with <code>npm start</code> and open <code>localhost:3000</code>.</div>';
    return;
  }

  if (bankAccounts.length === 0) {
    actionsEl.innerHTML =
      '<button class="btn-primary" id="bankConnectBtn">Connect Bank</button>';
    statusEl.innerHTML = "";
    contentEl.innerHTML =
      '<div class="empty-state">Connect a bank account to auto-import your spending data.</div>';
    document.getElementById("bankConnectBtn").addEventListener("click", initPlaidLink);
    return;
  }

  // Connected state
  var institutions = {};
  bankAccounts.forEach(function (a) {
    var inst = a.institution || "Bank";
    if (!institutions[inst]) institutions[inst] = { id: a.plaid_item_id, accounts: [] };
    institutions[inst].accounts.push(a);
  });

  var statusHtml = "";
  Object.keys(institutions).forEach(function (name) {
    var group = institutions[name];
    statusHtml += '<div class="bank-institution">';
    statusHtml += '<div class="bank-inst-header">';
    statusHtml += '<span class="bank-status connected">' + escapeHtml(name) + '</span>';
    statusHtml += '<button class="btn-ghost bank-disconnect" data-item="' + group.id + '">Disconnect</button>';
    statusHtml += "</div>";
    group.accounts.forEach(function (a) {
      statusHtml += '<div class="bank-account-row">' +
        escapeHtml(a.name) +
        (a.mask ? ' <span class="bank-mask">••••' + escapeHtml(a.mask) + '</span>' : '') +
        ' <span class="bank-type">' + escapeHtml(a.subtype || a.type || "") + '</span>' +
        "</div>";
    });
    statusHtml += "</div>";
  });
  statusEl.innerHTML = statusHtml;

  statusEl.querySelectorAll(".bank-disconnect").forEach(function (btn) {
    btn.addEventListener("click", function () {
      disconnectAccount(parseInt(btn.getAttribute("data-item")));
    });
  });

  actionsEl.innerHTML =
    '<button class="btn-secondary" id="bankSyncBtn">Sync Now</button>' +
    '<button class="btn-primary" id="bankConnectBtn">+ Add Bank</button>';
  document.getElementById("bankSyncBtn").addEventListener("click", syncTransactions);
  document.getElementById("bankConnectBtn").addEventListener("click", initPlaidLink);

  // Content area with sub-view toggle
  var toggleHtml =
    '<div class="segmented-control bank-toggle">' +
    '<button type="button" class="seg-btn' + (bankActiveView === "summary" ? " active" : "") + '" data-view="summary">Spending Summary</button>' +
    '<button type="button" class="seg-btn' + (bankActiveView === "transactions" ? " active" : "") + '" data-view="transactions">Transactions</button>' +
    '</div>';

  contentEl.innerHTML = toggleHtml + '<div id="bankViewContent"></div>';

  contentEl.querySelectorAll(".bank-toggle .seg-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      contentEl.querySelectorAll(".bank-toggle .seg-btn").forEach(function (b) {
        b.classList.remove("active");
      });
      btn.classList.add("active");
      bankActiveView = btn.getAttribute("data-view");
      if (bankActiveView === "transactions") {
        loadTransactions();
      } else {
        loadSpendingSummary();
      }
    });
  });

  if (bankActiveView === "transactions") {
    loadTransactions();
  } else {
    loadSpendingSummary();
  }
}

function renderTransactionList() {
  var container = document.getElementById("bankViewContent");
  if (!container) return;

  if (bankTransactions.length === 0) {
    container.innerHTML =
      '<div class="empty-state">No transactions yet. Click "Sync Now" to import from your bank.</div>';
    return;
  }

  var html = '<div class="txn-header txn-row">' +
    "<span>Date</span><span>Description</span><span>Category</span><span>Amount</span>" +
    "</div>";
  html += '<div class="txn-list">';

  bankTransactions.forEach(function (t) {
    var isExpense = t.amount > 0;
    var displayName = t.merchant_name || t.name || "Unknown";
    html += '<div class="txn-row">' +
      "<span>" + escapeHtml(t.date) + "</span>" +
      "<span>" + escapeHtml(displayName) + "</span>" +
      '<span class="txn-category">' + escapeHtml(categoryName(t.category_primary || "OTHER")) + "</span>" +
      '<span class="txn-amount ' + (isExpense ? "expense" : "income") + '">' +
      (isExpense ? "-" : "+") + formatUSD(Math.abs(t.amount)) + "</span>" +
      "</div>";
  });

  html += "</div>";
  container.innerHTML = html;
}

function renderSpendingSummary() {
  var container = document.getElementById("bankViewContent");
  if (!container) return;

  if (spendingSummary.length === 0) {
    container.innerHTML =
      '<div class="empty-state">No spending data. Click "Sync Now" to import transactions.</div>';
    return;
  }

  var html = '<div class="spending-header spending-row">' +
    "<span>Category</span><span>3-Mo Total</span><span>Monthly Avg</span><span></span>" +
    "</div>";

  spendingSummary.forEach(function (s) {
    var name = categoryName(s.category_primary);
    html += '<div class="spending-row">' +
      "<span>" + escapeHtml(name) + "</span>" +
      '<span class="spending-total">' + formatUSD(s.total) + "</span>" +
      '<span class="spending-avg">' + formatUSD(s.monthly_avg) + "/mo</span>" +
      '<button class="btn-add-cost" data-name="' + escapeHtml(name) +
      '" data-amount="' + Math.round(s.monthly_avg) + '">Add to Costs</button>' +
      "</div>";
  });

  container.innerHTML = html;

  container.querySelectorAll(".btn-add-cost").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var catName = btn.getAttribute("data-name");
      var amount = parseInt(btn.getAttribute("data-amount")) || 0;
      addCategoryToCosts(catName, amount);
      btn.textContent = "Added";
      btn.disabled = true;
    });
  });
}

function addCategoryToCosts(name, monthlyAvg) {
  var matchIdx = -1;
  var searchTerm = name.toLowerCase();
  for (var i = 0; i < costs.length; i++) {
    if (costs[i].name.toLowerCase().indexOf(searchTerm) !== -1 ||
        searchTerm.indexOf(costs[i].name.toLowerCase()) !== -1) {
      matchIdx = i;
      break;
    }
  }

  if (matchIdx !== -1) {
    var existing = costs[matchIdx];
    if (confirm(
      "Update '" + existing.name + "' from " + formatUSD(existing.amount) +
      " to " + formatUSD(monthlyAvg) + "/mo based on bank data?"
    )) {
      costs[matchIdx].amount = monthlyAvg;
    } else {
      return;
    }
  } else {
    costs.push({
      name: name,
      amount: monthlyAvg,
      inflation: 2,
      frequency: "monthly"
    });
  }

  renderCosts();
  calculate();
  scheduleSave();
}
