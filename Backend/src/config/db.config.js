import { configDotenv } from "dotenv";
import mongoose from "mongoose";

import { config } from "dotenv";
config({ path: ".env" });

// configDotenv()
let isConnected = false;
export const connectToDB = async () => {
  if (isConnected) return;

  try {
    console.log(process.env.MONGODB_URI || 'mongodb://localhost:27017/')
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/');
    isConnected = true;
    console.log("MongoDB connected");
  } catch (err) {
    console.error("DB connection failed", err);
  }
};
