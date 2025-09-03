// redisClient.js
import redis from 'redis';
import dotenv from 'dotenv';
dotenv.config();
const client = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379', // support env variable
});
console.log('Connecting to Redis...', process.env.REDIS_URL);
client.on('error', (err) => console.error('Redis Client Error', err));

await client.connect();
// console.log('Redis client connected successfully');
export default client;
