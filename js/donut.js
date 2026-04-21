function renderAllocationDonut(containerId, data) {
  var container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";

  var items = data.filter(function (d) { return d.value > 0.01; });
  if (items.length === 0) {
    container.innerHTML = '<div class="empty-state">No allocation data yet</div>';
    return;
  }

  var total = items.reduce(function (s, d) { return s + d.value; }, 0);

  var colors = [
    "oklch(70% 0.22 300)",
    "oklch(74% 0.18 155)",
    "oklch(75% 0.17 55)",
    "oklch(70% 0.20 220)",
    "oklch(68% 0.22 25)",
    "oklch(72% 0.18 340)",
    "oklch(70% 0.15 90)",
    "oklch(65% 0.20 270)"
  ];

  var size = 180;
  var thickness = 22;
  var r = size / 2 - thickness / 2 - 2;
  var cx = size / 2;
  var cy = size / 2;
  var gap = items.length > 1 ? 0.03 : 0;

  var a = -Math.PI / 2;
  var svgPaths = "";

  for (var i = 0; i < items.length; i++) {
    var frac = items[i].value / total;
    var color = colors[i % colors.length];

    if (items.length === 1) {
      svgPaths += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r +
        '" fill="none" stroke="' + color + '" stroke-width="' + thickness + '" />';
    } else {
      var gapAngle = gap / 2;
      var startAngle = a + gapAngle;
      var endAngle = a + frac * Math.PI * 2 - gapAngle;

      if (endAngle > startAngle) {
        var x1 = cx + r * Math.cos(startAngle);
        var y1 = cy + r * Math.sin(startAngle);
        var x2 = cx + r * Math.cos(endAngle);
        var y2 = cy + r * Math.sin(endAngle);
        var large = (endAngle - startAngle) > Math.PI ? 1 : 0;

        svgPaths += '<path d="M ' + x1.toFixed(2) + " " + y1.toFixed(2) +
          " A " + r + " " + r + " 0 " + large + " 1 " + x2.toFixed(2) + " " + y2.toFixed(2) +
          '" fill="none" stroke="' + color + '" stroke-width="' + thickness +
          '" stroke-linecap="round" />';
      }
    }

    a += frac * Math.PI * 2;
  }

  var svg =
    '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + " " + size + '">' +
    svgPaths +
    '<text x="' + cx + '" y="' + (cy - 6) + '" text-anchor="middle" class="donut-label">TOTAL</text>' +
    '<text x="' + cx + '" y="' + (cy + 14) + '" text-anchor="middle" class="donut-total">' +
    formatCompactUSD(total) + "</text>" +
    "</svg>";

  var legend = '<div class="donut-legend">';
  for (var i = 0; i < items.length; i++) {
    var pct = (items[i].value / total * 100).toFixed(1);
    legend +=
      '<div class="donut-legend-item">' +
      '<span class="donut-dot" style="background: ' + colors[i % colors.length] + '"></span>' +
      '<span class="donut-legend-name">' + escapeHtml(items[i].name) + "</span>" +
      '<span class="donut-legend-pct">' + pct + "%</span>" +
      '<span class="donut-legend-value">' + formatUSD(items[i].value) + "</span>" +
      "</div>";
  }
  legend += "</div>";

  container.innerHTML = '<div class="donut-chart">' + svg + "</div>" + legend;
}
