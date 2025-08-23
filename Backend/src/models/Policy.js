import mongoose from "mongoose";

const policySchema = new mongoose.Schema(
  {
    policyCode: { type: String, unique: true, required: true },
    policyType: {
      type: String,
      enum: ["health", "auto", "home", "life"],
      required: true,
    },
    title: { type: String, required: true , unique : [true, "Policy has already!"]},
    description: { type: String },

    coverageAmount: { type: Number, required: true, min: 0 },
    premiumAmount: { type: Number, required: true, min: 0 },

    terms: {
      durationInMonths: { type: Number, required: true },
      exclusions: [String],
      conditions: [String],
    },

    effectiveFrom: { type: Date, required: true },
    validTill: { type: Date, required: true },

    renewable: { type: Boolean, default: true },
    renewalPeriodInMonths: { type: Number, default: 12 },
    gracePeriodDays: { type: Number, default: 30 },

    eligibility: {
      minAge: { type: Number, default: 18 },
      maxAge: { type: Number, default: 65 },
      regionsAllowed: [String],
    },

      status: {
      type: String,
      enum: ["active", "expired", "cancelled"],
      default: "active",
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const Policy =
  mongoose.models.Policy || mongoose.model("Policy", policySchema);
