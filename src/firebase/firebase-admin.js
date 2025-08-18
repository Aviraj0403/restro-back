import { configDotenv } from 'dotenv';
import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import path from 'path';
dotenv.config(); 

// Hardcoded Service Account Credentials
const serviceAccount = {
  type: process.env.FIREBASE_TYPE,
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),  // Ensuring proper format for multiline private key
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
  universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN,
};

// console.log(serviceAccount);


try {
  // Initialize Firebase Admin SDK with the service account
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  console.log('Firebase Admin initialized');
} catch (error) {
  console.error('Error initializing Firebase Admin:', error);
  console.error('Ensure firebase-admin is correctly installed and that the service account file is correct.');
}

// Export the admin instance for other modules to use
export default admin;
