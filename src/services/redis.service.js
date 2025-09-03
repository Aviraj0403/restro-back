import { createClient } from 'redis';

const client = createClient();

client.on('error', (err) => console.error('❌ Redis Client Error:', err));
// Ensure client is connected before using
await client.connect();

export const clearAllRedisCache = async () => {
  try {
    const keys = await client.keys('*');

    if (keys.length > 0) {
      const pipeline = client.multi();
      keys.forEach((key) => pipeline.del(key));
      await pipeline.exec();

      console.log(`✅ Cleared ${keys.length} Redis keys.`);
    } else {
      console.log('ℹ️ No Redis keys to delete.');
    }
  } catch (error) {
    console.error('❌ Error clearing Redis cache:', error);
  }
};
