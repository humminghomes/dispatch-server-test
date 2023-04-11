import zlib from "zlib";
import crypto from "crypto";

export const setDispatchAuthHeaders = (payload) => {
  var secret = process.env["DISPATCH_CLIENT_SECRET"];

  var payload = zlib.gzipSync(payload);
  var secret = Buffer.from(secret, "hex");
  var signature = crypto
    .createHmac("sha256", secret)
    .update(payload, "utf8")
    .digest("hex");

  return { signature, payload };
};
