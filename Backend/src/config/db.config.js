import { configDotenv } from "dotenv";
import mongoose from "mongoose";

configDotenv()
export async function connectToDB(){
    try {
        // Mongodb connection 
        await mongoose.connect(process.env.MOGODB_URI)

    } catch (error) { 
        console.log(error)
        process.exit(1)
    }
}