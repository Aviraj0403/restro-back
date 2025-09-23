import express from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv'; // For environment variables
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import { logSessionActivity } from './middlewares/logSessionActivity.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import foodRoutes from './routes/food.routes.js';
import categoryRoutes from './routes/catgory.routes.js';
import cartRoutes from './routes/cart.routes.js';
import offerRoutes from './routes/offer.routes.js';
import orderRoutes from './routes/order.routes.js';
dotenv.config(); // Load environment variables

// Get the current directory name in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create Express app
const app = express();

// Allowed origins for CORS (replace with your frontend origins)
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://restro-admin-v1.vercel.app',
  'https://restaurant-tan-phi.vercel.app',
];

// CORS middleware
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // Allow requests from mobile apps, curl, etc.
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, true); // Allow all origins for now (you may change this)
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true, // Allow cookies and authorization headers
}));

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

app.use(helmet());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));


// Static files (e.g., for serving `robots.txt`)
app.use(express.static(join(__dirname, 'public')));
app.get('/robots.txt', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'robots.txt'));
});

// API routes
app.use('/v1/api/auth', authRoutes);
app.use('/v1/api/users', userRoutes);
app.use('/v1/api/foods', foodRoutes);
app.use('/v1/api/categories', categoryRoutes);
app.use('/v1/api/cart', cartRoutes);
app.use('/v1/api', offerRoutes);
app.use('/v1/api/orders', orderRoutes);

// Health check route
app.get('/', (req, res) => {
  res.send('Hello Avi Raj! Production is running smoothly!');
});

// Centralized error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something went wrong!');
});

export default app;
