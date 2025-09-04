// redisClient.js
// import redis from 'redis';
// import dotenv from 'dotenv';
// dotenv.config();
// const client = redis.createClient({
//   url: process.env.REDIS_URL || 'redis://localhost:6379', // support env variable
//   socket: {
//     connectTimeout: 10000 // 10 seconds
//   }
// });
// console.log('Connecting to Redis...', process.env.REDIS_URL);
// client.on('error', (err) => console.error('Redis Client Error', err));

// await client.connect();
// console.log('Redis client connected successfully');
// export default client;
//  REDISCLI_AUTH=Q1Bemhr3yF0Uk5P5NGvhDoX6sf9Jpw76 valkey-cli --user red-d2sbbjmr433s73be5nt0 -h oregon-keyvalue.render.com -p 6379 --tls