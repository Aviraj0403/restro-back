// server.js or index.js

import dotenv from "dotenv";
import http from "http";
import connectDB from "./src/config/dbConfig.js";
import app from "./src/app.js";
import { setupSocketIO } from "./src/socketIO.js";

dotenv.config();

const port = process.env.PORT || 5005;

const startServer = () => {
  const server = http.createServer(app);

  // 👇 Corrected: pass server, then attach io to app here
  const io = setupSocketIO(server);
  app.set("io", io); // Attach io to app for access in controllers

  server.listen(port, () => {
    console.log(`🚀 Server running at http://localhost:${port}`);
  });

  process.on("SIGINT", () => {
    console.log("Gracefully shutting down...");
    server.close(() => {
      console.log("Closed all HTTP connections");
      process.exit(0);
    });
  });

  process.on("SIGTERM", () => {
    console.log("Gracefully shutting down...");
    server.close(() => {
      console.log("Closed all HTTP connections");
      process.exit(0);
    });
  });
};

const connectWithRetry = () => {
  connectDB()
    .then(() => {
      console.log("✅ MongoDB Connected");
      startServer();
    })
    .catch((err) => {
      console.error("❌ MongoDB connection failed:", err);
      console.log("Retrying connection...");
      setTimeout(connectWithRetry, 5000);
    });
};

connectWithRetry();
