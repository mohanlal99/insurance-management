import { connectToDB } from "../config/db.config.js";
import { Transaction } from "../models/ClaimTransaction.js";


/**
 * Create a new transaction
 * - Handles premium payment, claim payout, refund, wallet top-up
 */
export const createTransaction = async (req, res) => {
  try {
    await connectToDB()
    const {  customerPolicy, claim, amount, transactionType, paymentMethod, referenceId, remarks } = req.body || {};
    const customer = req.user?.id
    // Required field checks
    if ( !amount || !transactionType || !paymentMethod || !referenceId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Ensure valid transaction type & related references
    if (transactionType === "premium_payment" && !customerPolicy) {
      return res.status(400).json({ message: "CustomerPolicy is required for premium payment" });
    }

    if (transactionType === "claim_payout" && !claim) {
      return res.status(400).json({ message: "Claim is required for claim payout" });
    }

    // Ensure referenceId is unique
    const exists = await Transaction.findOne({ referenceId });
    if (exists) {
      return res.status(400).json({ message: "Transaction with this referenceId already exists" });
    }

    // Create transaction
    const transaction = await Transaction.create({
      customer ,
      customerPolicy,
      claim,
      amount,
      transactionType,
      paymentMethod,
      referenceId,
      remarks,
    });

    return res.status(201).json({ message: "Transaction created successfully", transaction });
  } catch (error) {
    return res.status(500).json({ message: "Error creating transaction", error: error.message });
  }
};

/**
 * Get all transactions (Admin only)
 */
export const getAllTransactions = async (req, res) => {
  try {
    await connectToDB()
    const transactions = await Transaction.find()
      .populate("customer", "name email")
      .populate("customerPolicy")
      .populate("claim");

    return res.status(200).json(transactions);
  } catch (error) {
    return res.status(500).json({ message: "Error fetching transactions", error: error.message });
  }
};

/**
 * Get transactions for logged-in customer
 */
export const getMyTransactions = async (req, res) => {
  try {
    await connectToDB()
    const customerId = req.user.id; // assuming req.user is set
    const transactions = await Transaction.find({ customer: customerId })
      .populate("customerPolicy")
      .populate("claim");

    return res.status(200).json(transactions);
  } catch (error) {
    return res.status(500).json({ message: "Error fetching customer transactions", error: error.message });
  }
};

/**
 * Get transaction by ID
 */
export const getTransactionById = async (req, res) => {
  try {
    await connectToDB()
    const { id } = req.params;
    const transaction = await Transaction.findById(id)
      .populate("customer", "name email")
      .populate("customerPolicy")
      .populate("claim");

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    return res.status(200).json(transaction);
  } catch (error) {
    return res.status(500).json({ message: "Error fetching transaction", error: error.message });
  }
};

/**
 * Update transaction status (Admin / Payment Gateway webhook)
 */
export const updateTransactionStatus = async (req, res) => {
  try {
    await connectToDB()
    const { id } = req.params;
    const { status } = req.body || {};

    if (!["pending", "success", "failed"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const transaction = await Transaction.findById(id);
    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    transaction.status = status;
    transaction.updatedAt = Date.now();
    await transaction.save();

    return res.status(200).json({ message: "Transaction status updated", transaction });
  } catch (error) {
    return res.status(500).json({ message: "Error updating transaction", error: error.message });
  }
};
