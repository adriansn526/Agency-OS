import { MongoClient } from 'mongodb';

async function run() {
    const client = new MongoClient('mongodb://localhost:27017');
    try {
        await client.connect();
        const db = client.db('fudly');
        const leads = await db.collection('leads').find().limit(2).toArray();
        console.log(JSON.stringify(leads, null, 2));
    } finally {
        await client.close();
    }
}
run().catch(console.error);
