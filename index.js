 
import dotenv from 'dotenv';
import connectDB from './src/config/dbConfig.js';
import app from './src/app.js';
import { startCluster } from './serviceWorker.js'; // Import startCluster
import { setupSocketIO } from './src/socketIO.js';

dotenv.config(); // Load environment variables

const port = process.env.PORT || 5005;

const startServer = () => {
  // Create the HTTP server and pass it to Socket.IO
  const server = app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });

  // Set up Socket.IO with the server
  setupSocketIO(server);
};
connectDB()
  .then(() => {
    console.log("✅ MongoDB Connected");

    // startCluster();

    startServer();
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err);
  });
