import { configDotenv } from "dotenv";
import mongoose from "mongoose";

import { config } from "dotenv";
config({ path: ".env" });

// configDotenv()
let isConnected = false;
export const connectToDB = async () => {
  if (isConnected) return;

  try {
    console.log("mongodb+srv://mohanlal:Mohanlal%404321%23@cluster0.t4mcf4u.mongodb.net/insurance" || "mongodb+srv://mohanlal:Mohanlal%404321%23@cluster0.t4mcf4u.mongodb.net/insurance")
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/');
    isConnected = true;
    console.log("MongoDB connected");
  } catch (err) {
    console.error("DB connection failed", err);
  }
};
