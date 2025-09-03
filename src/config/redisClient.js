// redisClient.js
import redis from 'redis';

const client = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379', // support env variable
});

client.on('error', (err) => console.error('Redis Client Error', err));

await client.connect();
console.log('Redis client connected successfully');
export default client;
