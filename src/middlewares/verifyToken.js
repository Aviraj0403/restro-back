import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const secret = process.env.ACCESS_TOKEN_SECRET; 

export const verifyToken = (req, res, next) => {
  console.log("Verifying token...");
  console.log("Cookies:", req.cookies);
  console.log("Authorization Header:", req.headers.authorization);
  

const cookieToken = req.cookies?.accessToken;
console.log("Cookie Token:", cookieToken);
const headerToken = req.headers.authorization?.split(" ")[1];
console.log("Header Token:", headerToken);
const token = cookieToken || headerToken;
console.log("Extracted Token:", token);

  console.log("Extracted token:", token);
  if (!token) {
    return res.status(401).json({
      message: "Access Denied! Token Broken or Expired",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
   console.log("Decoded Token:", decoded);
    if (!decoded?.data) {
      return res.status(401).json({
        message: "User data not available",
      });
    }

    const { id, userName, email, roleType} = decoded.data;
    // console.log("Decoded token data:", decoded.data);
    req.user = { id, userName, email, roleType };

    console.log("User token verified:", req.user);
    next();
  } catch (error) {
    return res.status(400).json({
      message: "Invalid Token",
      error: error.message,
    });
  }
};

// Middleware to verify Firebase ID token if you want to use it in some routes
export const verifyFirebaseToken = async (req, res, next) => {
  const firebaseToken = req.headers['authorization']?.split(' ')[1];

  if (!firebaseToken) {
    return res.status(401).json({
      message: 'Firebase Token Missing',
    });
  }

  try {
    // Verify Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(firebaseToken);
    req.firebaseUser = decodedToken;  // Attach decoded Firebase user to request object
    next();
  } catch (error) {
    return res.status(400).json({
      message: 'Invalid Firebase Token',
      error: error.message,
    });
  }
};