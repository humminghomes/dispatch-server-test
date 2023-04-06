const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();

const PORT = process.env.PORT || 8080;

app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(express.json());

const jobsRouter = require("./router/jobs");

app.use("/api/dispatch", jobsRouter);

app.listen(PORT, () => {
  console.log(`Running on http://localhost:${PORT}`);
  startPolling();
});

// extrea
const Pollinator = require("pollinator");

var key = process.env["DISPATCH_CLIENT_ID"];
var secret = process.env["DISPATCH_CLIENT_SECRET"];

var url = "https://connect-sbx.dispatch.me/";
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

const startPolling = async () => {
  try {
    let res = await fetch(url + "agent/out", out_request);
    const msg = JSON.stringify(res.body);
    console.log(msg);
  } catch (error) {
    console.log(error);
  }
};

const poller = new Pollinator(startPolling);
poller.start();
