import mongoose from "mongoose";

export async function connectToDB(){
    try {
        // Mongodb connection 
        await mongoose.connect(process.env.MOGODB_URI || 'mongodb://localhost:27017/Insurance')

        console.log("DB connected!")

    } catch (error) {
        console.log(error)
        process.exit(1)
    }
}