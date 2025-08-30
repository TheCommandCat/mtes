import { Db, MongoClient } from 'mongodb';
import { User } from '@mtes/types';

const randomString = (length: number) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const connectionString = process.env.MONGODB_URI || 'mongodb://localhost:27017';

const initDbClient = async () => {
  const client = new MongoClient(connectionString);

  try {
    console.log(`🔗 Connecting to MongoDB server at ${connectionString}`);
    await client.connect();
    console.log('🚀 MongoDB Client connected.');
  } catch (err) {
    console.error('❌ Unable to connect to mongodb: ', err);
  }

  return client;
};

const client = await initDbClient();

const dbName = process.env.MONGODB_DB_NAME || 'mtes';
const db: Db = client.db(dbName);

const admins = db.collection<User>('users');
admins.findOne({}).then(user => {
  if (!user) {
    const adminUsername = 'admin';
    const adminPassword = randomString(6);
    admins
      .insertOne({
        username: adminUsername,
        isAdmin: true,
        password: adminPassword,
        lastPasswordSetDate: new Date()
      })
      .then(() => {
        console.log(`⚙️ Setup initial admin user with details - ${adminUsername}:${adminPassword}`);
      });
  }
});

export default db;
