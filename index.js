import * as dotenv from "dotenv";
dotenv.config();
import express, { urlencoded, json } from "express";
const app = express();
import cors from "cors";
const PORT = process.env.PORT || 8080;

import jobsRouter from "./router/jobs.js";
import startDispatchPolling from "./polling/dispatch-outbound.js";

app.use(urlencoded({ extended: true }));
app.use(cors());
app.use(json());
app.use("/api/dispatch", jobsRouter);

// Start server
app.listen(PORT, () => {
  console.log(`Running on http://localhost:${PORT}`);
  startDispatchPolling();
});
