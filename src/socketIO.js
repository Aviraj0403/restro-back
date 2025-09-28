import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import cookie from "cookie"; 

const secret = process.env.JWTSECRET;

export const setupSocketIO = (server) => {
  const io = new Server(server, {
    cors: {
      origin: [
        "http://localhost:5173",
        "http://localhost:5174",
        "https://restro-admin-v1.vercel.app",
        "https://restaurant-tan-phi.vercel.app",
      ],
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Middleware to parse cookies and verify token before Socket.IO connection
  io.use((socket, next) => {
    const cookieHeader = socket.request.headers.cookie;  // Get cookies from headers

    if (!cookieHeader) {
      return next(new Error("No cookies found"));
    }

    // Manually parse the cookies using the 'cookie' library
    const cookies = cookie.parse(cookieHeader);  // Parse the cookie string into an object
    const token = cookies.jwt;  // Extract the JWT token

    if (!token) {
      return next(new Error("Authentication error: Token is missing"));
    }

    // Verify the JWT token
    jwt.verify(token, secret, (err, decoded) => {
      if (err || !decoded) {
        return next(new Error("Authentication error: Invalid token"));
      }

      // Check if the user is an admin by looking at roleType
      if (decoded.data.roleType !== "admin") {
        return next(new Error("Authorization error: You must be an admin to connect"));
      }

      // Attach the authenticated user data to the socket object
      socket.user = decoded.data;
      // console.log("Authenticated admin user:", socket.user);

      return next();  // Proceed with the connection if the token is valid and role is admin
    });
  });

  // Handle a connection from an admin user
  io.on("connection", (socket) => {
    // console.log("📡 Socket.IO admin client connected", socket.id);
    // console.log("Authenticated admin user:", socket.user);

    // Handle the "newOrder" event, which can be emitted by the admin
    socket.on("newOrder", (order) => {
      // console.log(`New order received: ${order}`);
      io.emit("newOrder", order);  // Emit to all connected clients
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log("Admin disconnected", socket.id);
    });
  });

  return io;
};
