 
import express from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';

import { logSessionActivity } from './middlewares/logSessionActivity.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';  // Import 'join' and 'dirname' from 'path'
import { time } from 'console';

// Get the current directory name in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // Allow requests without origin (mobile apps, curl, etc.)
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      // return callback(new Error('Not allowed by CORS'));
      return callback(null, true); // Allow all origins for now
    }
  },
  credentials: true, // Send cookies and authorization headers
}));

// Middleware for JSON body parsing and cookies
app.use(express.json());
app.use(cookieParser());

// Session activity logging middleware
app.use(logSessionActivity);

// API Routes
app.use('/api', authRoutes);
app.use('/api', userRoutes); 
// app.use('/api', employeeRoutes);
// app.use('/api', admitRoutes);
// app.use('/api', courseRoutes);
// app.use('/api', examSubjectRoutes);
// app.use('/api', subjectRoutes);
// app.use('/api', marksheetRoutes);
// app.use('/api', ticketRoutes);

  // In development, serve assets (e.g., images, JavaScript) from 'public' folder
app.use(express.static(join(__dirname, 'public')));

app.get('/robots.txt', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'robots.txt'));
  });

// Root route (Health check or default response)
app.get('/', (req, res) => {
  res.send('Hello AviRaj! PRoduction is running smoothly! ');
});

// Centralized error handling (for unhandled errors)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something went wrong!');
});

export default app;
