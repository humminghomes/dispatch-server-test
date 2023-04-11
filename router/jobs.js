const express = require("express");
const router = express.Router();
var crypto = require("crypto");
const { setDispatchAuthHeaders } = require("../middleware/dispatch-auth");

/// DELETE to /api/dispatch/jobs/{Job.External_ID}
router.delete("/jobs/:jobId", async (req, res) => {
  try {
    console.log(`Incoming Request to Delete External Id: ${req.params.jobId}`);
    const deleteBody = [
      {
        header: {
          record_type: "offer",
          version: "v2",
        },
        record: {
          external_id: req.params.jobId,
          status: "canceled",
        },
      },
    ];

    const url = "https://connect-sbx.dispatch.me/agent/in";

    const dispatchJobBody = JSON.stringify(deleteBody);
    const auth = setDispatchAuthHeaders(dispatchJobBody);

    const headers = {
      "X-Dispatch-Key": process.env["DISPATCH_CLIENT_ID"],
      "X-Dispatch-Signature": auth.signature,
      "Content-Type": "application/json",
    };

    let dispatchRes = await fetch(url, {
      method: "POST",
      headers,
      body: auth.payload,
    });

    if (dispatchRes.status === 200) {
      console.log("Received 200 from Dispatch API");
      res.send().status(201);
    } else {
      res.send({ error: "Unauthorized" }).status(400);
    }
  } catch (error) {
    console.log(error);
  }
});

/// POST to /api/dispatch/jobs
/// Creates a mock Offer with a specified id, if not a static id is provided.
/// Expects the following body
// {
//   "userId": "humming-homes-user-id"
// }
router.post("/jobs", async (req, res) => {
  let id = crypto.randomUUID();
  console.log(`Creating new job. External id: ${id}`);

  const newJob = [
    {
      header: {
        record_type: "offer",
        version: "v2",
      },
      record: {
        customer: {
          first_name: "John",
          last_name: "Smith",
          email: "email@dispatch.me",
          external_id: req.body.userId || "21e63f86285945cabecb75afab8f9ab3", // HUMMING_HOMES.User.uid
          phone_numbers: [
            {
              number: "+15550913813",
              primary: true,
              type: "Mobile",
            },
          ],
        },
        title: "Test Job title",
        description: "Test - Job Description",
        external_id: id, // HUMMING_HOMES.Job.uid - our own unique id for this job.
        address: {
          street_1: "1213 Summer St",
          street_2: "apt. 1",
          postal_code: "02151",
          city: "Boston",
          state: "MA",
          country: "United States",
        },
      },
    },
  ];

  try {
    const url = "https://connect-sbx.dispatch.me/agent/in";

    const dispatchJobBody = JSON.stringify(newJob);
    const auth = setDispatchAuthHeaders(dispatchJobBody);

    const headers = {
      "X-Dispatch-Key": process.env["DISPATCH_CLIENT_ID"],
      "X-Dispatch-Signature": auth.signature,
      "Content-Type": "application/json",
    };

    let dispatchRes = await fetch(url, {
      method: "POST",
      headers,
      body: auth.payload,
    });

    if (dispatchRes.status === 200) {
      res.send().status(201);
    } else {
      res.send({ error: "Unauthorized" }).status(400);
    }
  } catch (error) {
    console.log(error);
    res.send({ error: error }).status(500);
  }
});

module.exports = router;
