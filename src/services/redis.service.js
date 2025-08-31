import redis from 'redis';
import { promisify } from 'util';

const client = redis.createClient();
const keysAsync = promisify(client.keys).bind(client);
const delAsync = promisify(client.del).bind(client);

export const clearAllRedisCache = async () => {
  try {
    const keys = await keysAsync('*');
    if (keys.length > 0) {
      await Promise.all(keys.map((key) => delAsync(key)));
      console.log('All Redis cache cleared!');
    } else {
      console.log('No keys found in Redis.');
    }
  } catch (error) {
    console.error('Error clearing all Redis cache:', error);
  }
};
