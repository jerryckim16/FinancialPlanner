require("dotenv").config();

var express = require("express");
var helmet = require("helmet");
var path = require("path");
var plaidRouter = require("./plaid");

var app = express();
var PORT = process.env.PORT || 3000;

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://cdn.plaid.com"],
      connectSrc: ["'self'", "https://*.plaid.com"],
      frameSrc: ["https://cdn.plaid.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:"]
    }
  }
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, "..")));
app.use("/api/plaid", plaidRouter);

app.use(function (err, _req, res, _next) {
  var status = 500;
  var message = "Internal server error";

  if (err.response && err.response.data) {
    status = err.response.status || 500;
    message = err.response.data.error_message || message;
    console.error("Plaid error:", err.response.data);
  } else {
    console.error("Server error:", err.message);
  }

  res.status(status).json({ error: message });
});

app.listen(PORT, function () {
  console.log("Financial Planner running at http://localhost:" + PORT);
});
