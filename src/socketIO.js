import { Server } from "socket.io";

export const setupSocketIO = (server) => {
  const io = new Server(server, {
    cors: {
       origin: [
        "http://localhost:5173",
        "http://localhost:5174",
        "https://restro-admin-v1.vercel.app",
        "https://restaurant-tan-phi.vercel.app",
      ],  // Allowing all origins. For production, restrict this to your frontend URLs
      methods: ["GET", "POST"],
      credentials: true,
    },
  });
    
  // Handle a connection from a client
  io.on("connection", (socket) => {
    console.log("A user connected");

    socket.on("disconnect", () => {
      console.log("A user disconnected");
    });
  });

  return io;
};
