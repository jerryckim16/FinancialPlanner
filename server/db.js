var Database = require("better-sqlite3");
var path = require("path");
var fs = require("fs");

var dataDir = path.join(__dirname, "..", "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

var db = new Database(path.join(dataDir, "planner.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(
  "CREATE TABLE IF NOT EXISTS plaid_items (" +
    "id INTEGER PRIMARY KEY AUTOINCREMENT," +
    "item_id TEXT UNIQUE NOT NULL," +
    "access_token TEXT NOT NULL," +
    "institution TEXT," +
    "cursor TEXT DEFAULT NULL," +
    "created_at TEXT DEFAULT (datetime('now'))," +
    "updated_at TEXT DEFAULT (datetime('now'))" +
  ");" +

  "CREATE TABLE IF NOT EXISTS accounts (" +
    "id INTEGER PRIMARY KEY AUTOINCREMENT," +
    "plaid_item_id INTEGER REFERENCES plaid_items(id) ON DELETE CASCADE," +
    "account_id TEXT UNIQUE NOT NULL," +
    "name TEXT," +
    "type TEXT," +
    "subtype TEXT," +
    "mask TEXT" +
  ");" +

  "CREATE TABLE IF NOT EXISTS transactions (" +
    "id INTEGER PRIMARY KEY AUTOINCREMENT," +
    "account_id TEXT REFERENCES accounts(account_id) ON DELETE CASCADE," +
    "transaction_id TEXT UNIQUE NOT NULL," +
    "date TEXT NOT NULL," +
    "name TEXT," +
    "amount REAL NOT NULL," +
    "category_primary TEXT," +
    "category_detailed TEXT," +
    "merchant_name TEXT," +
    "pending INTEGER DEFAULT 0" +
  ");" +

  "CREATE INDEX IF NOT EXISTS idx_txn_date ON transactions(date);" +
  "CREATE INDEX IF NOT EXISTS idx_txn_account ON transactions(account_id);" +
  "CREATE INDEX IF NOT EXISTS idx_txn_category ON transactions(category_primary);"
);

var stmts = {
  insertItem: db.prepare(
    "INSERT INTO plaid_items (item_id, access_token, institution) VALUES (?, ?, ?)"
  ),
  getItems: db.prepare("SELECT * FROM plaid_items"),
  getItemById: db.prepare("SELECT * FROM plaid_items WHERE id = ?"),
  getItemByItemId: db.prepare("SELECT * FROM plaid_items WHERE item_id = ?"),
  updateCursor: db.prepare(
    "UPDATE plaid_items SET cursor = ?, updated_at = datetime('now') WHERE item_id = ?"
  ),
  deleteItem: db.prepare("DELETE FROM plaid_items WHERE id = ?"),

  insertAccount: db.prepare(
    "INSERT OR REPLACE INTO accounts (plaid_item_id, account_id, name, type, subtype, mask) " +
    "VALUES (?, ?, ?, ?, ?, ?)"
  ),
  getAccounts: db.prepare(
    "SELECT a.*, p.institution, p.id as plaid_item_id FROM accounts a " +
    "JOIN plaid_items p ON a.plaid_item_id = p.id"
  ),

  upsertTransaction: db.prepare(
    "INSERT OR REPLACE INTO transactions " +
    "(account_id, transaction_id, date, name, amount, category_primary, category_detailed, merchant_name, pending) " +
    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ),
  removeTransaction: db.prepare("DELETE FROM transactions WHERE transaction_id = ?"),
  getTransactions: db.prepare(
    "SELECT * FROM transactions WHERE date >= date('now', '-' || ? || ' months') " +
    "ORDER BY date DESC"
  ),
  getSpendingSummary: db.prepare(
    "SELECT category_primary, " +
    "SUM(amount) as total, " +
    "COUNT(*) as count, " +
    "ROUND(SUM(amount) / CAST(? AS REAL), 2) as monthly_avg " +
    "FROM transactions " +
    "WHERE date >= date('now', '-' || ? || ' months') AND amount > 0 " +
    "GROUP BY category_primary " +
    "ORDER BY total DESC"
  )
};

function insertItem(itemId, encryptedToken, institution) {
  return stmts.insertItem.run(itemId, encryptedToken, institution);
}

function getItems() {
  return stmts.getItems.all();
}

function getItemById(id) {
  return stmts.getItemById.get(id);
}

function getItemByItemId(itemId) {
  return stmts.getItemByItemId.get(itemId);
}

function updateCursor(itemId, cursor) {
  stmts.updateCursor.run(cursor, itemId);
}

function deleteItem(id) {
  stmts.deleteItem.run(id);
}

function insertAccounts(plaidItemId, accounts) {
  var insert = db.transaction(function (accts) {
    for (var i = 0; i < accts.length; i++) {
      var a = accts[i];
      stmts.insertAccount.run(
        plaidItemId, a.account_id, a.name, a.type, a.subtype, a.mask || null
      );
    }
  });
  insert(accounts);
}

function getAccounts() {
  return stmts.getAccounts.all();
}

function upsertTransactions(txns) {
  var upsert = db.transaction(function (list) {
    for (var i = 0; i < list.length; i++) {
      var t = list[i];
      stmts.upsertTransaction.run(
        t.account_id, t.transaction_id, t.date, t.name,
        t.amount, t.category_primary, t.category_detailed,
        t.merchant_name, t.pending ? 1 : 0
      );
    }
  });
  upsert(txns);
}

function removeTransactions(transactionIds) {
  var remove = db.transaction(function (ids) {
    for (var i = 0; i < ids.length; i++) {
      stmts.removeTransaction.run(ids[i]);
    }
  });
  remove(transactionIds);
}

function getTransactions(months) {
  return stmts.getTransactions.all(months || 3);
}

function getSpendingSummary(months) {
  var m = months || 3;
  return stmts.getSpendingSummary.all(m, m);
}

module.exports = {
  insertItem: insertItem,
  getItems: getItems,
  getItemById: getItemById,
  getItemByItemId: getItemByItemId,
  updateCursor: updateCursor,
  deleteItem: deleteItem,
  insertAccounts: insertAccounts,
  getAccounts: getAccounts,
  upsertTransactions: upsertTransactions,
  removeTransactions: removeTransactions,
  getTransactions: getTransactions,
  getSpendingSummary: getSpendingSummary
};
