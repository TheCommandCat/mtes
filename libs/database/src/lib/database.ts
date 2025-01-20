import { Db, MongoClient } from 'mongodb';
import { User } from '@mtes/types';

const connectionString = 'mongodb://127.0.0.1:27017';

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

const db: Db = client.db('lems');

const admins = db.collection<User>('users');
admins.findOne({}).then(user => {
  if (!user) {
    const adminUsername = 'admin';
    const adminPassword = 'admin';
    admins
      .insertOne({
        username: adminUsername,
        isAdmin: true,
        password: adminPassword,
      })
      .then(() => {
        console.log(`⚙️ Setup initial admin user with details - ${adminUsername}:${adminPassword}`);
      });
  }
});

export default db;