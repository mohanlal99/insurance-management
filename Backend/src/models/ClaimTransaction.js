import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
  customer: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },

  customerPolicy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "CustomerPolicy" 
  }, // optional → not all transactions belong to a policy (e.g., wallet recharge)

  claim: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Claim" 
  }, // optional → when paying claim settlement

  amount: { 
    type: Number, 
    required: true, 
    min: [0, "Amount cannot be negative!"] 
  },

  transactionType: { 
    type: String, 
    enum: ["premium_payment", "claim_payout", "refund", "wallet_topup"], 
    required: true 
  },

  paymentMethod: { 
    type: String, 
    enum: ["credit_card", "debit_card", "upi", "net_banking", "wallet"], 
    required: true 
  },

  status: { 
    type: String, 
    enum: ["pending", "success", "failed"], 
    default: "pending" 
  },

  referenceId: { 
    type: String, 
    unique: true, 
    required: true 
  }, // gateway transaction id

  remarks: { type: String }, // e.g., "Monthly premium for Policy #1234"

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

export const Transaction = mongoose.models.Transaction || mongoose.model("Transaction", transactionSchema);
