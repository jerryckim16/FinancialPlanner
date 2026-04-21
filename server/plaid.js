var express = require("express");
var { PlaidApi, Configuration, PlaidEnvironments } = require("plaid");
var db = require("./db");
var crypto = require("./crypto");

var config = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV || "sandbox"],
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
      "PLAID-SECRET": process.env.PLAID_SECRET
    }
  }
});

var client = new PlaidApi(config);
var router = express.Router();

router.post("/create-link-token", function (_req, res, next) {
  client.linkTokenCreate({
    user: { client_user_id: "local-user" },
    client_name: "Financial Planner",
    products: ["transactions"],
    country_codes: ["US"],
    language: "en"
  }).then(function (response) {
    res.json({ link_token: response.data.link_token });
  }).catch(next);
});

router.post("/exchange-token", function (req, res, next) {
  var publicToken = req.body.public_token;
  if (!publicToken) return res.status(400).json({ error: "Missing public_token" });

  client.itemPublicTokenExchange({ public_token: publicToken })
    .then(function (exchangeRes) {
      var accessToken = exchangeRes.data.access_token;
      var itemId = exchangeRes.data.item_id;
      var encryptedToken = crypto.encrypt(accessToken);

      return client.itemGet({ access_token: accessToken }).then(function (itemRes) {
        var institution = itemRes.data.item.institution_id || "Unknown";

        return client.institutionsGetById({
          institution_id: institution,
          country_codes: ["US"]
        }).then(function (instRes) {
          return instRes.data.institution.name;
        }).catch(function () {
          return institution;
        });
      }).then(function (institutionName) {
        var result = db.insertItem(itemId, encryptedToken, institutionName);
        var plaidItemId = result.lastInsertRowid;

        return client.accountsGet({ access_token: accessToken }).then(function (acctRes) {
          var accounts = acctRes.data.accounts.map(function (a) {
            return {
              account_id: a.account_id,
              name: a.name,
              type: a.type,
              subtype: a.subtype,
              mask: a.mask
            };
          });
          db.insertAccounts(plaidItemId, accounts);
          res.json({ success: true, institution: institutionName, accounts: accounts });
        });
      });
    }).catch(next);
});

router.get("/accounts", function (_req, res) {
  var accounts = db.getAccounts();
  res.json({ accounts: accounts });
});

router.post("/sync-transactions", function (_req, res, next) {
  var items = db.getItems();
  if (items.length === 0) return res.json({ synced: 0 });

  var totalSynced = 0;

  function syncItem(idx) {
    if (idx >= items.length) return res.json({ synced: totalSynced });

    var item = items[idx];
    var accessToken = crypto.decrypt(item.access_token);
    var cursor = item.cursor || undefined;

    function syncPage(pageCursor) {
      var params = { access_token: accessToken };
      if (pageCursor) params.cursor = pageCursor;

      client.transactionsSync(params)
        .then(function (syncRes) {
          var data = syncRes.data;

          if (data.added && data.added.length > 0) {
            var toAdd = data.added.map(function (t) {
              var cat = t.personal_finance_category || {};
              return {
                account_id: t.account_id,
                transaction_id: t.transaction_id,
                date: t.date,
                name: t.name || t.merchant_name || "Unknown",
                amount: t.amount,
                category_primary: cat.primary || "OTHER",
                category_detailed: cat.detailed || "",
                merchant_name: t.merchant_name || "",
                pending: t.pending
              };
            });
            db.upsertTransactions(toAdd);
            totalSynced += toAdd.length;
          }

          if (data.modified && data.modified.length > 0) {
            var toMod = data.modified.map(function (t) {
              var cat = t.personal_finance_category || {};
              return {
                account_id: t.account_id,
                transaction_id: t.transaction_id,
                date: t.date,
                name: t.name || t.merchant_name || "Unknown",
                amount: t.amount,
                category_primary: cat.primary || "OTHER",
                category_detailed: cat.detailed || "",
                merchant_name: t.merchant_name || "",
                pending: t.pending
              };
            });
            db.upsertTransactions(toMod);
          }

          if (data.removed && data.removed.length > 0) {
            db.removeTransactions(data.removed.map(function (r) {
              return r.transaction_id;
            }));
          }

          db.updateCursor(item.item_id, data.next_cursor);

          if (data.has_more) {
            syncPage(data.next_cursor);
          } else {
            syncItem(idx + 1);
          }
        }).catch(next);
    }

    syncPage(cursor);
  }

  syncItem(0);
});

router.get("/transactions", function (req, res) {
  var months = parseInt(req.query.months) || 3;
  var txns = db.getTransactions(months);
  res.json({ transactions: txns });
});

router.get("/spending-summary", function (req, res) {
  var months = parseInt(req.query.months) || 3;
  var summary = db.getSpendingSummary(months);
  res.json({ summary: summary, months: months });
});

router.delete("/accounts/:id", function (req, res, next) {
  var itemId = parseInt(req.params.id);
  var item = db.getItemById(itemId);
  if (!item) return res.status(404).json({ error: "Not found" });

  try {
    var accessToken = crypto.decrypt(item.access_token);
    client.itemRemove({ access_token: accessToken }).catch(function () {});
  } catch (e) {
    // Token may already be invalid
  }

  db.deleteItem(itemId);
  res.json({ success: true });
});

module.exports = router;
