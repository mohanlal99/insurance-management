import e from "express";
import { adminMiddleware } from "../middlewares/authMiddleware.js";
import { createTransaction, getAllTransactions, getMyTransactions, getTransactionById, updateTransactionStatus } from "../controllers/transaction.controller.js";


export const transactionRoute = e.Router();

// Create new transaction
transactionRoute.post("/", createTransaction);

// Get all transactions (Admin only)
transactionRoute.get("/", adminMiddleware, getAllTransactions);

// Get logged-in customer’s transactions
transactionRoute.get("/my", getMyTransactions);

// Get transaction by ID
transactionRoute.get("/:id", getTransactionById);

// Update transaction status (Admin / Payment Gateway webhook)
transactionRoute.put("/:id/status", updateTransactionStatus);
