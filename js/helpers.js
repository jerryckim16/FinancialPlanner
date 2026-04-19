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

function formatCompactUSD(n) {
  var abs = Math.abs(n);
  var sign = n < 0 ? "-" : "";
  if (abs >= 1000000) return sign + "$" + (abs / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  if (abs >= 1000) return sign + "$" + Math.round(abs / 1000) + "K";
  return sign + "$" + Math.round(abs);
}

function computeTickStep(range) {
  if (range <= 0) return 1;
  var rawStep = range / 5;
  var mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  var res = rawStep / mag;
  if (res <= 1.5) return mag;
  if (res <= 3.5) return 2 * mag;
  if (res <= 7.5) return 5 * mag;
  return 10 * mag;
}
