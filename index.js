import dotenv from "dotenv";
import http from "http";
import connectDB from "./src/config/dbConfig.js";
import app from "./src/app.js";
import { setupSocketIO } from "./src/socketIO.js";

dotenv.config();

const port = process.env.PORT || 5005;

// Function to start the server
const startServer = () => {
  const server = http.createServer(app);

  // Setup Socket.IO with the necessary configurations
  setupSocketIO(server, app, {
    allowedOrigins: [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://restro-admin-v1.vercel.app",
      "https://restaurant-tan-phi.vercel.app",
    ],
    jwtSecret: process.env.JWT_SECRET,
  });

  // Start the server and listen on the configured port
  server.listen(port, () => {
    console.log(`🚀 Server running at http://localhost:${port}`);
  });

  // Graceful shutdown on SIGINT (Ctrl + C) or SIGTERM (e.g., Heroku)
  process.on('SIGINT', () => {
    console.log('Gracefully shutting down...');
    server.close(() => {
      console.log('Closed all HTTP connections');
      process.exit(0); // Exit the process
    });
  });

  process.on('SIGTERM', () => {
    console.log('Gracefully shutting down...');
    server.close(() => {
      console.log('Closed all HTTP connections');
      process.exit(0); // Exit the process
    });
  });
};

// Function to handle MongoDB connection and retries
const connectWithRetry = () => {
  connectDB()
    .then(() => {
      console.log("✅ MongoDB Connected");
      startServer();
    })
    .catch((err) => {
      console.error("❌ MongoDB connection failed:", err);
      console.log("Retrying connection...");
      setTimeout(connectWithRetry, 5000); // Retry every 5 seconds
    });
};

// Initialize the MongoDB connection and start the server
connectWithRetry();

// Global error handling for uncaught exceptions and unhandled promise rejections
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  // Perform any necessary cleanup before exiting
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err);
  // Perform any necessary cleanup before exiting
  process.exit(1);
});
