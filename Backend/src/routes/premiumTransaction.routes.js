import e from "express";
import { cancelPremiumPayment, generateInvoice, getCustomerPremiumTransactions, getPremiumTransactionById, initiatePremiumPayment, refundPremiumPayment, retryPremiumPayment, verifyPremiumPayment } from "../controllers/premiumTransaction.controller.js";
import { adminMiddleware } from "../middlewares/authMiddleware.js";


export const premiumTransactionRoute = e.Router();

/**
 * @desc Initiate payment for a policy premium
 * @route POST /premium/initiate
 */
premiumTransactionRoute.post("/initiate", initiatePremiumPayment);

/**
 * @desc Verify payment after gateway callback / webhook
 * @route POST /premium/verify
 */
premiumTransactionRoute.post("/verify", adminMiddleware, verifyPremiumPayment);

/**
 * @desc Retry a failed premium payment
 * @route POST /premium/retry/:transactionId
 */
premiumTransactionRoute.post("/retry/:transactionId", retryPremiumPayment);

/**
 * @desc Refund a premium payment (Admin/Provider use case)
 * @route POST /premium/refund/:transactionId
 */
premiumTransactionRoute.post("/refund/:transactionId", refundPremiumPayment);

/**
 * @desc Cancel a pending premium payment
 * @route POST /premium/cancel/:transactionId
 */
premiumTransactionRoute.post("/cancel/:transactionId", cancelPremiumPayment);

/**
 * @desc Generate invoice/receipt for premium transaction
 * @route GET /premium/invoice/:transactionId
 */
premiumTransactionRoute.get("/invoice/:transactionId", generateInvoice);

/**
 * @desc Get a single premium transaction details
 * @route GET /premium/:transactionId
 */
premiumTransactionRoute.get("/:transactionId", getPremiumTransactionById);

/**
 * @desc Get all premium transactions for a customer
 * @route GET /premium/customer/:customerId
 */
premiumTransactionRoute.get("/customer/:customerId", getCustomerPremiumTransactions);
