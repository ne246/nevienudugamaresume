// scripts/cleanDB.ts
// QUICK Astra DB cleaner (drops the collection, or deletes all docs)

import { DataAPIClient } from "@datastax/astra-db-ts";
import "dotenv/config";

const {
  ASTRA_DB_NAMESPACE,
  ASTRA_DB_COLLECTION,
  ASTRA_DB_API_ENDPOINT,
  ASTRA_DB_APPLICATION_TOKEN,
} = process.env;

if (!ASTRA_DB_NAMESPACE || !ASTRA_DB_COLLECTION || !ASTRA_DB_API_ENDPOINT || !ASTRA_DB_APPLICATION_TOKEN) {
  throw new Error("Missing env vars. Check .env");
}

// initialize the Astra DB client
const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
const db = client.db(ASTRA_DB_API_ENDPOINT, { keyspace: ASTRA_DB_NAMESPACE });

// choose how you want to clean:
// "drop" = deletes the entire collection (recommended)
// "delete" = keeps collection but removes all docs
const MODE: "drop" | "delete" = "drop";

const cleanDB = async () => {
  if (MODE === "drop") {
    const res = await db.dropCollection(ASTRA_DB_COLLECTION);
    console.log("✅ Dropped collection:", ASTRA_DB_COLLECTION);
    console.log(res);
    return;
  }

  const collection = db.collection(ASTRA_DB_COLLECTION);
  const res = await collection.deleteMany({});
  console.log("✅ Deleted all docs in collection:", ASTRA_DB_COLLECTION);
  console.log(res);
};

cleanDB().catch((err) => {
  console.error("❌ Failed to clean DB:", err);
  process.exit(1);
});
