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

      payload.Actions.forEach(async (action) => {
        const json = JSON.stringify(action);
        console.log("Action Received:");
        console.log(json);
        console.log("------");

        const data = action.Put;

        if (data.ack) {
          if (data.ack.ack_message === "Created offer") {
            await saveOfferCreatedToDatabase(action.Put.ack.data);
          }
        }

        if (data.joboffer) {
          await updateJobOfferStatus(data.joboffer);
        }

        if (data.job) {
          await updateJobStatus(data.job);
        }

        if (data.appointment) {
          await saveAppointmentAndUpdateJobStatus(data.appointment);
        }
      });

      // Save Message in DB
      sendAckMessage(val);
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
  const user = await prisma.dispatchCustomer.findUnique({
    where: { id: offer.customer.external_id },
  });

  if (user) return user;

  const customer = {
    id: offer.customer.external_id,
    email: offer.customer.email,
    firstName: offer.customer.first_name,
    lastName: offer.customer.last_name,
  };

  const newUser = await prisma.dispatchCustomer.create({
    data: customer,
  });

  return newUser;
};

const saveOfferCreatedToDatabase = async (offer) => {
  const customer = await createCustomerIfNeeded(offer);

  const existing = await prisma.dispatchJob.findUnique({
    where: { id: offer.job.external_id },
  });

  if (existing) return;

  const job = {
    id: offer.job.external_id,
    title: offer.job.title,
    description: offer.job.description,
    status: offer.status,
    customerId: customer.id,
  };

  await prisma.dispatchJob.create({
    data: job,
  });

  console.log("Job created");
  return;
};

const updateJobOfferStatus = async (offer) => {
  const existing = await prisma.dispatchJob.findUnique({
    where: { id: offer.job.external_id },
  });

  if (!existing) {
    console.log("No job exists to update");
    return;
  }

  await prisma.dispatchJob.update({
    where: { id: existing.id },
    data: {
      status: offer.status,
      dispatchJobId: offer.job_id,
    },
  });

  console.log("Job offer Updated");
  return;
};

const updateJobStatus = async (job) => {
  const existing = await prisma.dispatchJob.findUnique({
    where: { id: job.external_id },
  });

  if (!existing) {
    console.log("No job exists to update");
    return;
  }

  await prisma.dispatchJob.update({
    where: { id: existing.id },
    data: {
      status: job.status,
      dispatchJobId: job.id,
    },
  });

  console.log("Job Updated");
  return;
};

const saveAppointmentAndUpdateJobStatus = async (appointment) => {
  const existingJob = await prisma.dispatchJob.findUnique({
    where: { dispatchJobId: appointment.job_id },
  });

  if (!existingJob) {
    console.log("No job exists to update");
    return;
  }

  await prisma.dispatchJob.update({
    where: { id: existingJob.id },
    data: {
      status: appointment.status,
    },
  });

  await prisma.dispatchAppointment.create({
    data: {
      id: appointment.id,
      status: appointment.status,
      jobId: appointment.job_id,
      startTime: new Date(appointment.start_time),
      endTime: new Date(appointment.end_time),
    },
  });

  console.log("Saved Appointment");
};

export default startDispatchPolling;
