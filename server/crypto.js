var crypto = require("crypto");

var ALGO = "aes-256-gcm";
var KEY = Buffer.from(process.env.ENCRYPTION_KEY || "", "hex");

function encrypt(plaintext) {
  var iv = crypto.randomBytes(12);
  var cipher = crypto.createCipheriv(ALGO, KEY, iv);
  var enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  var tag = cipher.getAuthTag();
  return iv.toString("hex") + ":" + tag.toString("hex") + ":" + enc.toString("hex");
}

function decrypt(encrypted) {
  var parts = encrypted.split(":");
  var iv = Buffer.from(parts[0], "hex");
  var tag = Buffer.from(parts[1], "hex");
  var enc = Buffer.from(parts[2], "hex");
  var decipher = crypto.createDecipheriv(ALGO, KEY, iv);
  decipher.setAuthTag(tag);
  return decipher.update(enc) + decipher.final("utf8");
}

module.exports = { encrypt: encrypt, decrypt: decrypt };
