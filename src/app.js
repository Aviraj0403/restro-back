// src/app.js
import express from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from 'dotenv';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Routes
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import foodRoutes from './routes/food.routes.js';
import categoryRoutes from './routes/catgory.routes.js';
import cartRoutes from './routes/cart.routes.js';
import offerRoutes from './routes/offer.routes.js';
import orderRoutes from './routes/order.routes.js';
import mapRoutes from './routes/map.routes.js'
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// CORS
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://restro-admin-v1.vercel.app',
  'https://restaurant-tan-phi.vercel.app',
  'https://nominatim.openstreetmap.org',
  'https://nominatim.openstreetmap.org/reverse?lat=28.5802496&lon=77.3718016&format=json'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("CORS not allowed"), false);
  },
  credentials: true,
}));

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());
app.use(helmet());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

// Static files
app.use(express.static(join(__dirname, 'public')));
app.get('/robots.txt', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'robots.txt'));
});

// Routes
app.use('/v1/api/auth', authRoutes);
app.use('/v1/api/users', userRoutes);
app.use('/v1/api/foods', foodRoutes);
app.use('/v1/api/categories', categoryRoutes);
app.use('/v1/api/cart', cartRoutes);
app.use('/v1/api', offerRoutes);
app.use('/v1/api/orders', orderRoutes);
app.use('/v1/api', mapRoutes)

// Health check
app.get('/', (req, res) => {
  res.send('Hello Avi Raj! Production is running smoothly on Ci-Cd !');
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something went wrong!');
});

export default app;
