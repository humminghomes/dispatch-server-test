const express = require("express");
const router = express.Router();
var crypto = require("crypto");
const { setDispatchAuthHeaders } = require("../middleware/dispatch-auth");

/// Expects the following body
// {
//   "userId": "humming-homes-user-id"
// }
router.post("/jobs", async (req, res) => {
  console.log("posting new job");

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
          external_id: req.body.userId || "21e63f86285945cabecb75afab8f9ab3",
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
        external_id: crypto.randomUUID(),
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
