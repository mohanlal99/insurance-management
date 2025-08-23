import app from "../src/app.js";
import { connectToDB } from "../src/config/db.config.js";


// Ensure DB connection (cold start only)
const dbReady = connectToDB();

export default async function handler(req, res) {
  await dbReady;
  return app(req, res);
}
