import mongoose from "mongoose";

const customerPolicySchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "CustomerId is required!"],
    },
    policy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Policy",
      requried: [true, "Policy is required!"],
    },

    policyNumber: { type: String, unique: true },

    startDate: { type: Date, default: new Date() },
    endDate: { type: Date, required: true },

    premiumPaid: { type: Boolean, default: false },
    lastPaymentDate: { type: Date },
    nextPaymentDue: { type: Date },

    renewalCount: { type: Number, default: 0 },
    renewalDueDate: { type: Date },

    paymentFrequency: {
      type: String,
      enum: ["monthly", "quarterly", "yearly"],
      default: "monthly",
    },

    status: {
      type: String,
      enum: ["active", "expired", "pending_payment", "cancelled"],
      default: "active",
    },
    statusHistory: [
      {
        status: String,
        date: Date,
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
    ],

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Agent who issued
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

customerPolicySchema.index(
  { customer: 1, policy: 1 },
  { unique: [true, "Policy has already!"] }
);

customerPolicySchema.pre("save", async function (next) {
  if (this.isNew && !this.policyNumber) {
    const year = new Date().getFullYear();

    const lastPolicy = await mongoose
      .model("CustomerPolicy")
      .findOne({ policyNumber: new RegExp(`^CUST-${year}`) })
      .sort({ createdAt: -1 });

    let nextNumber = "0001";
    if (lastPolicy) {
      const lastNum = parseInt(lastPolicy.policyNumber.split("-")[2]);
      nextNumber = String(lastNum + 1).padStart(4, "0");
    }

    this.policyNumber = `CUST-${year}-${nextNumber}`;
  }
  next();
});

export const CustomerPolicy =
  mongoose.models.CustomerPolicy ||
  mongoose.model("CustomerPolicy", customerPolicySchema);
