import mongoose from "mongoose";

const premiumTransactionSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  customerPolicy: { type: mongoose.Schema.Types.ObjectId, ref: "CustomerPolicy", required: true },

  amount: { type: Number, required: true, min: 0 },
  totalAmount: { type: Number },
  currency: { type: String, default: "INR" },

  transactionType: { type: String, enum: ["premium_payment"], default: "premium_payment" },

  // Installments
  isInstallment: { type: Boolean, default: false },
  installmentNumber: { type: Number },
  totalInstallments: { type: Number },
  installmentAmount: { type: Number },
  dueDate: { type: Date },

  // Gateway Info
  provider: { type: String },
  providerPaymentId: { type: String },
  providerResponse: { type: mongoose.Schema.Types.Mixed },
  gateway: { type: String }, 
  gatewayStatus: { type: String },
  gatewayLogs: { type: mongoose.Schema.Types.Mixed },
  referenceId: { type: String, required: true, unique: true },

  // Status
  status: { 
    type: String, 
    enum: ["initiated", "pending", "success", "failed", "refunded"], 
    default: "initiated" 
  },
  failureReason: { type: String },

  // Policy Activation
  isPolicyActivation: { type: Boolean, default: false },
  policyActivatedAt: { type: Date },

  // Timeline
  initiatedAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
  refundedAt: { type: Date },
  expiresAt: { type: Date },
  retryCount: { type: Number, default: 0 },

  // Accounting
  invoiceNo: { type: String, unique: true },
  receiptUrl: { type: String },

  // Idempotency
  idempotencyKey: { type: String },

  // Reversal
  isReversed: { type: Boolean, default: false },
  reversalReason: { type: String },

  // Audit
  remarks: { type: String },
  isSensitiveMasked: { type: Boolean, default: true },

}, { timestamps: true });

export const PremiumTransaction =
  mongoose.models.PremiumTransaction || mongoose.model("PremiumTransaction", premiumTransactionSchema);
