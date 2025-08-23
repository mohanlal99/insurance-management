  import { configDotenv } from "dotenv";
  import express from "express";
  import { authRoute } from "./routes/auth.routes.js";
  import { authMiddleware, roleMiddleware } from "./middlewares/authMiddleware.js";
  import { userRoute } from "./routes/user.route.js";
  import cookieParser from "cookie-parser";
  import { policiesRoute } from "./routes/policy.routes.js";
  import { customerRoute } from "./routes/customer.routes.js";
  import { claimRoute } from "./routes/claim.routes.js";
  import { transactionRoute } from "./routes/transaction.route.js";
  import { premiumTransactionRoute } from "./routes/premiumTransaction.routes.js";
  import cors from 'cors'

  configDotenv(); // Include env

  // connectToDB() 

  const app = express(); // Initialize App
  app.use(express.json()); // Application Body parser
  app.use(cookieParser()) // cookie parser 

  app.use(cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000", // frontend URL
    credentials: true, // allow cookies/auth headers
  }));



  // Basic app get Route 
  app.get("/" , (req, res)=>{
      res.status(200).send(`<center>Insurance Management System Backend Apis</center>`)
  })

  // auth routes
  app.use('/api/auth' , authRoute)

  // auth middleware
  app.use(authMiddleware)

  app.use('/api/', userRoute)

  // claim routes
  app.use("/api/claims" , claimRoute)

  app.use('/api/premium/transaction', premiumTransactionRoute)

  // customer rouets
  app.use("/api/customer-policies", customerRoute)
  app.use('/api/transactions', transactionRoute)
  // admin and agent verified for the policy route
  app.use(roleMiddleware)

  app.use('/api/policies', policiesRoute)


  // Unkown route handler
  app.use((req, res) => {
    res.status(404).json({ error: "404 - Page Not Found!" });
  });

  export default app;
