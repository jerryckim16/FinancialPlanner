function formatUSD(n) {
  if (!isFinite(n)) return "--";
  var prefix = n < 0 ? "-$" : "$";
  return prefix + Math.abs(Math.round(n)).toLocaleString("en-US");
}

function num(id) {
  return parseFloat(document.getElementById(id).value) || 0;
}

function formatMonths(m) {
  if (m === null || !isFinite(m)) return "Never";
  if (m <= 0) return "Now";
  var years = Math.floor(m / 12);
  var months = m % 12;
  if (years === 0) return months + "mo";
  if (months === 0) return years + "y";
  return years + "y " + months + "mo";
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, function (c) {
    return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
  });
}
