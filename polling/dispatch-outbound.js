const Pollinator = require("pollinator");

var key = process.env["DISPATCH_CLIENT_ID"];
var secret = process.env["DISPATCH_CLIENT_SECRET"];

var url = "https://connect-sbx.dispatch.me/agent/out";
var max_messages = 10;
var out_payload = `{"maxNumberOfMessages":${max_messages}}`;
var secret = Buffer.from(secret, "hex");
const crypto = require("crypto");
var out_signature = crypto
  .createHmac("sha256", secret)
  .update(out_payload, "utf8")
  .digest("hex");

var out_headers = {
  "Content-Type": "application/json",
  "X-Dispatch-Key": key,
  "X-Dispatch-Signature": out_signature,
};

var out_request = {
  method: "POST",
  headers: out_headers,
  body: out_payload,
};

const dispatchRequest = async () => {
  console.log(`Requesting at: ${new Date()}`);
  try {
    let res = await fetch(url, out_request);
    const msg = JSON.stringify(res.body);
    console.log(res.status, msg);
  } catch (error) {
    console.log(error);
  }
};

const startDispatchPolling = () => {
  // Polls every 5 seconds
  const poller = new Pollinator(dispatchRequest, {
    delay: 30000,
  });
  poller.start();
};

module.exports = startDispatchPolling;
