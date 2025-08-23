import http from "http";
import app from "./src/app.js";
import { connectToDB } from "./src/config/db.config.js";

const PORT = process.env.PORT || 5050; // define server PORT

const server = http.createServer(app); // Setup a http server using an express app


connectToDB() // Connect to the database

// // Start the server 
// server.listen(PORT, () => {
//   console.log(`Server is runing on http://localhost:${PORT}`);
// });
