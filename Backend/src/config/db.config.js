import { configDotenv } from "dotenv";
import mongoose from "mongoose";

import { config } from "dotenv";
config({ path: ".env" });

configDotenv()
let isConnected = false;
export const connectToDB = async () => {
  if (isConnected) return;

  try {
    await mongoose.connect(process.env.MONGODB_URI,{
        serverSelectionTimeoutMS: 5000
    });
    isConnected = true;
    console.log("MongoDB connected");
  } catch (err) {
    console.error("DB connection failed", err);
  }
};
