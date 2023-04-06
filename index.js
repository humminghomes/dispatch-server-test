require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const PORT = process.env.PORT || 8080;

// External Job Route
const jobsRouter = require("./router/jobs");
const startDispatchPolling = require("./polling/dispatch-outbound");

app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(express.json());
app.use("/api/dispatch", jobsRouter);

// Start server
app.listen(PORT, () => {
  console.log(`Running on http://localhost:${PORT}`);
  startDispatchPolling();
});
