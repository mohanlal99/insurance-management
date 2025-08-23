import mongoose from "mongoose";


const claimSchema = new mongoose.Schema({
    customer : {type : mongoose.Schema.Types.ObjectId, ref : 'User' , required: [true, "CustomerId is required!"]},
    customerPolicy : {type : mongoose.Schema.Types.ObjectId, ref : "CustomerPolicy", required : [true, "Customer policyId is requried!"]},
    claimAmount : {type : Number, required : [true, "Claim amount has requried"]},
    description: { type: String },
    documents: [{ type: String }], 
    status: { type: String, enum: ["pending", "approved", "rejected", "under_review"], default: "pending" },
    payout: {
      amountPaid: { type: Number },
      paidAt: { type: Date },
      paymentMethod: { type: String, enum: ["bank_transfer", "cheque", "upi"] },
      transactionId: { type: String }
    },
    assignedAgent: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    claimType: {
      type: String,
      enum: ["accident", "hospitalization", "theft", "damage", "death", "other"],
      required: true
    },
    deadline: { type: Date },
    isFlagged: { type: Boolean, default: false },
    flagReason: { type: String },
    statusHistory: [
        {
            status: {
              type: String,
              enum: ["pending", "under_review", "approved", "rejected", "paid"],
            },
            updatedAt: { type: Date, default: Date.now },
            updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" } // agent/admin
        }
    ],
    
}, { timestamps: true })

export const Claim = mongoose.models.Claim || mongoose.model("Claim", claimSchema)