import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import { config } from "./config.js";
import { apiLimiter, errorHandler, notFound } from "./middleware.js";
import authRoutes from "./routes/auth.js";
import coreRoutes from "./routes/core.js";
import workflowRoutes from "./routes/workflow.js";
import contentRoutes from "./routes/content.js";
import analyticsRoutes from "./routes/analytics.js";

const app = express();

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(morgan("dev"));
app.use(cookieParser());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(apiLimiter);

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    name: "Astedader Woreda API",
    noWoredaId: true,
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", authRoutes);
app.use("/api", coreRoutes);
app.use("/api", workflowRoutes);
app.use("/api", contentRoutes);
app.use("/api/analytics", analyticsRoutes);

app.use(notFound);
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Astedader Woreda API running on http://localhost:${config.port}`);
});
