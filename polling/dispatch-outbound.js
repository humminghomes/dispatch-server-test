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
    const val = await res.json();

    val.forEach(async (val) => {
      console.log();
      const payload = val.Message.Request.Payload;

      payload.Actions.forEach((action) => {
        const json = JSON.stringify(action);
        console.log(json);
      });

      var receipt = `{"Receipt":"${val.Message.Receipt}","ProcedureID":"${val.Message.Request.ProcedureID}","Result":"success"}`;
      receipt = encodeURIComponent(receipt);
      var ack_signature = crypto
        .createHmac("sha256", secret)
        .update(receipt, "utf8")
        .digest("hex");

      var ack_headers = {
        "Content-Type": "application/json",
        "X-Dispatch-Key": key,
        "X-Dispatch-Signature": ack_signature,
      };

      var ack_request = {
        method: "POST",
        headers: ack_headers,
        body: receipt,
      };

      let ackRes = await fetch(
        "https://connect-sbx.dispatch.me/agent/ack",
        out_request
      );
      const ackJson = await ackRes.json();
      console.log(ackJson);
    });
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
