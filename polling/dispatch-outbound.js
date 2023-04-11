import Pollinator from "pollinator";

var key = process.env["DISPATCH_CLIENT_ID"];
var secret = process.env["DISPATCH_CLIENT_SECRET"];

var url = "https://connect-sbx.dispatch.me/agent/out";
var max_messages = 10;
var out_payload = `{"maxNumberOfMessages":${max_messages}}`;
var secret = Buffer.from(secret, "hex");
import { createHmac } from "crypto";
import prisma from "../prisma/db.js";
var out_signature = createHmac("sha256", secret)
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
    console.log(`Received ${val.length} messages`);
    val.forEach(async (val) => {
      const payload = val.Message.Request.Payload;

      payload.Actions.forEach((action) => {
        const json = JSON.stringify(action);
        console.log("Action Received:");
        console.log(json);
        console.log("------");

        if (action.ack_message === "Created offer") {
          console.log("offer");
          // saveOfferCreatedToDatabase(action.Put.ack.data);
        }
      });

      // Save Message in DB
      // sendAckMessage(val);
      // Save job info
    });

    if (val.length >= 10) {
      // I'm not sure if a method in JS can call itself.
      dispatchRequest();
    }
  } catch (error) {
    console.log(error);
  }
};

const startDispatchPolling = (val) => {
  // Polls every 30 seconds
  const poller = new Pollinator(dispatchRequest, {
    delay: 30000,
  });
  poller.start();
};

const sendAckMessage = async (val) => {
  var receipt = `{"Receipt":"${val.Message.Receipt}","ProcedureID":"${val.Message.Request.ProcedureID}","Result":"success"}`;
  var ack_signature = createHmac("sha256", secret)
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
    ack_request
  );
  const ackJson = await ackRes.json();
  console.log(ackJson);
  console.log("ACK successful");
};

const createCustomerIfNeeded = async (offer) => {
  const prisma = prisma;

  const user = await prisma.customer.findOne({
    where: { id: offer.customer.external_id },
  });

  if (user) return user;

  const customer = {
    id: offer.customer.external_id,
    email: offer.customer.email,
    firstName: offer.customer.first_name,
    lastName: offer.customer.last_name,
  };

  const newUser = await prisma.customer.create({
    data: customer,
  });

  return newUser;
};

const saveOfferCreatedToDatabase = async (offer) => {
  const customer = createCustomerIfNeeded(offer);

  const job = {
    id: offer.job.external_id,
    title: offer.job.title,
    description: offer.job.description,
    status: offer.status,
    customer: customer,
  };

  const newJob = await prisma.job.create({
    data: job,
  });

  console.log("Job created");
};

export default startDispatchPolling;
