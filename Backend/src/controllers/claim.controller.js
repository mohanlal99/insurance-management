import mongoose from "mongoose";
import { Claim } from "../models/Claim.js";
import { CustomerPolicy } from "../models/CustomerPolicy.js";
import { connectToDB } from "../config/db.config.js";
// import { Transaction } from '../models/Transaction.js'

const ObjectId = mongoose.Types.ObjectId;

/**
 * Helper: populate claim with customer, customerPolicy and its policy and assignedAgent
 */
const populateClaim = (query) =>
  query
    .populate("customer", "-password -__v")
    .populate({
      path: "customerPolicy",
      populate: { path: "policy", model: "Policy" }
    })
    .populate("assignedAgent", "-password -__v");

/**
 * 1) Create a new claim (Customer)
 * Body: { customerPolicy, claimType, claimAmount, description, documents[] }
 */
export const createClaim = async (req, res) => {
  try {
    await connectToDB()
    const customerId = req.user?.id;
    const { customerPolicy: customerPolicyId, claimType, claimAmount, description, documents = [] } = req.body || {};

    // Basic validation
    if (!customerPolicyId || !ObjectId.isValid(customerPolicyId))
      return res.status(400).json({ message: "Valid customerPolicy id is required." });

    if (!claimType)
      return res.status(400).json({ message: "claimType is required." });

    if (!claimAmount || isNaN(claimAmount) || claimAmount <= 0)
      return res.status(400).json({ message: "Valid claimAmount is required." });

    // Fetch customerPolicy
    const custPol = await CustomerPolicy.findById(customerPolicyId).populate("policy");
    if (!custPol) return res.status(404).json({ message: "Customer policy not found." });

    // Ownership check — only the policy owner can file claim
    if (custPol.customer.toString() !== customerId)
      return res.status(403).json({ message: "You are not the owner of this policy." });

    // Policy must be active and within dates
    if (custPol.status !== "active")
      return res.status(400).json({ message: `Cannot file claim on policy with status: ${custPol.status}` });

    const now = new Date();
    if (custPol.startDate && custPol.startDate > now)
      return res.status(400).json({ message: "Policy not active yet." });

    if (custPol.endDate && custPol.endDate < now)
      return res.status(400).json({ message: "Policy expired." });

    // Prevent concurrent open claims on same policy (optional but helpful)
    const existingOpen = await Claim.findOne({
      customerPolicy: customerPolicyId,
      statusHistory: { $elemMatch: { status: { $in: ["pending", "under_review"] } } }
    });
    if (existingOpen)
      return res.status(409).json({ message: "There is already an open claim for this policy. Please wait for resolution." });

    // Optionally warn about exceeding coverage (we still accept but admin can adjust)
    const policyCoverage = custPol.policy?.coverageAmount ?? null;
    const exceedsCoverage = policyCoverage !== null && claimAmount > policyCoverage;

    // Set a review deadline (policy-specific or default 30 days)
    const defaultDeadlineDays = (custPol.policy?.gracePeriodDays) ? custPol.policy.gracePeriodDays : 30;
    const deadline = new Date(now);
    deadline.setDate(deadline.getDate() + defaultDeadlineDays);

    const claim = await Claim.create({
      customer: customerId,
      customerPolicy: customerPolicyId,
      claimType,
      claimAmount,
      description,
      documents,
      deadline,
      statusHistory: [
        { status: "pending", updatedAt: now, updatedBy: customerId }
      ]
    });

    const populated = await populateClaim(Claim.findById(claim._id));
    return res.status(201).json({
      message: "Claim submitted successfully." + (exceedsCoverage ? " (Note: claim amount exceeds policy coverage and will be reviewed.)" : ""),
      data: await populated
    });
  } catch (err) {
    console.error("createClaim error:", err);
    return res.status(500).json({ message: "Error creating claim", error: err.message });
  }
};

/**
 * 2) Get claims of logged-in customer
 * Supports pagination & filters: ?status=&claimType=&page=&limit=
 */
export const getMyClaims = async (req, res) => {
  try {
    await connectToDB()
    const customerId = req.user?.id;
    const { status, claimType, page = 1, limit = 10 } = req.query;

    const filter = { customer: customerId };
    if (status) filter["statusHistory.status"] = status;
    if (claimType) filter.claimType = claimType;

    const skip = (Math.max(parseInt(page, 10), 1) - 1) * Math.max(parseInt(limit, 10), 1);

    const [total, claims] = await Promise.all([
      Claim.countDocuments(filter),
      populateClaim(
        Claim.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Math.max(parseInt(limit, 10), 1))
      )
    ]);

    return res.status(200).json({ total, page: Number(page), limit: Number(limit), data: claims });
  } catch (err) {
    console.error("getMyClaims error:", err);
    return res.status(500).json({ message: "Error fetching claims", error: err.message });
  }
};

/**
 * 3) Get all claims (Agent & Admin)
 * Query filters: ?status=&customer=&assignedAgent=&claimType=&page=&limit=&dateFrom=&dateTo=
 */
export const getAllClaims = async (req, res) => {
  try {
    await connectToDB()
    const role = req.user?.role;
    if (!["agent", "admin"].includes(role))
      return res.status(403).json({ message: "Only agents or admins can access all claims." });

    const {
      status,
      customer,
      assignedAgent,
      claimType,
      page = 1,
      limit = 20,
      dateFrom,
      dateTo
    } = req.query;

    const filter = {};
    if (status) filter["statusHistory.status"] = status;
    if (customer && ObjectId.isValid(customer)) filter.customer = customer;
    if (assignedAgent && ObjectId.isValid(assignedAgent)) filter.assignedAgent = assignedAgent;
    if (claimType) filter.claimType = claimType;

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    const skip = (Math.max(parseInt(page, 10), 1) - 1) * Math.max(parseInt(limit, 10), 1);

    const [total, claims] = await Promise.all([
      Claim.countDocuments(filter),
      populateClaim(
        Claim.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Math.max(parseInt(limit, 10), 1))
      )
    ]);

    return res.status(200).json({ total, page: Number(page), limit: Number(limit), data: claims });
  } catch (err) {
    console.error("getAllClaims error:", err);
    return res.status(500).json({ message: "Error fetching claims", error: err.message });
  }
};

/**
 * 4) Get claim by id
 * Access: Customer (own claim) OR Agent/Admin (any)
 */
export const getClaimById = async (req, res) => {
  try {
    await connectToDB()
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid claim id." });

    const claim = await populateClaim(Claim.findById(id));
    if (!claim) return res.status(404).json({ message: "Claim not found." });

    const role = req.user?.role;
    const userId = req.user?.id;
    if (role === "customer" && claim.customer._id.toString() !== userId)
      return res.status(403).json({ message: "Access denied to this claim." });

    return res.status(200).json({ data: claim });
  } catch (err) {
    console.error("getClaimById error:", err);
    return res.status(500).json({ message: "Error fetching claim", error: err.message });
  }
};

/**
 * 5) Update claim (Customer) - only when claim is still 'pending'
 * Allowed updates: description, add documents, (optional) update claimAmount
 */
export const updateClaim = async (req, res) => {
  try {
    await connectToDB()
    const { id } = req.params;
    const updates = req.body || {};
    const userId = req.user?.id;
    const role = req.user?.role;

    if (!ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid claim id." });

    const claim = await Claim.findById(id).populate({
      path: "customerPolicy",
      populate: { path: "policy", model: "Policy" }
    });
    if (!claim) return res.status(404).json({ message: "Claim not found." });

    // Authorization: customer must own it; admin can also edit if necessary
    if (role === "customer" && claim.customer.toString() !== userId)
      return res.status(403).json({ message: "You cannot update this claim." });

    // Only pending claims can be edited by customer
    const latestStatus = (claim.statusHistory && claim.statusHistory.length) ? claim.statusHistory[claim.statusHistory.length - 1].status : null;
    if (role === "customer" && latestStatus !== "pending")
      return res.status(400).json({ message: "Only pending claims can be edited." });

    // Apply allowed updates
    let changed = false;
    if (updates.description && updates.description !== claim.description) {
      claim.description = updates.description;
      changed = true;
    }

    // documents: append if array provided
    if (Array.isArray(updates.documents) && updates.documents.length > 0) {
      claim.documents = claim.documents.concat(updates.documents);
      changed = true;
    }

    // allow claimAmount update (customer) — must be positive
    if (typeof updates.claimAmount !== "undefined") {
      const newAmount = Number(updates.claimAmount);
      if (isNaN(newAmount) || newAmount <= 0) return res.status(400).json({ message: "Invalid claimAmount." });
      claim.claimAmount = newAmount;
      changed = true;
    }

    if (!changed) return res.status(400).json({ message: "No valid fields provided for update." });

    // push status history entry
    claim.statusHistory.push({
      status: "updated",
      updatedAt: new Date(),
      updatedBy: userId
    });

    await claim.save();

    const populated = await populateClaim(Claim.findById(claim._id));
    return res.status(200).json({ message: "Claim updated successfully.", data: populated });
  } catch (err) {
    console.error("updateClaim error:", err);
    return res.status(500).json({ message: "Error updating claim", error: err.message });
  }
};

/**
 * 6) Agent moves claim to review (assign and change status to under_review)
 */
export const moveClaimToReview = async (req, res) => {
  try {
    await connectToDB()
    const { id } = req.params;
    const role = req.user?.role;
    const agentId = req.user?.id;

    if (!ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid claim id." });
    if (role !== "agent") return res.status(403).json({ message: "Only agents can perform this action." });

    const claim = await Claim.findById(id);
    if (!claim) return res.status(404).json({ message: "Claim not found." });

    const latestStatus = (claim.statusHistory && claim.statusHistory.length) ? claim.statusHistory[claim.statusHistory.length - 1].status : null;
    if (["under_review", "approved", "paid", "rejected"].includes(latestStatus))
      return res.status(400).json({ message: `Claim cannot be moved to review from status: ${latestStatus}` });

    claim.assignedAgent = agentId;
    claim.statusHistory.push({ status: "under_review", updatedAt: new Date(), updatedBy: agentId });

    await claim.save();

    const populated = await populateClaim(Claim.findById(claim._id));
    return res.status(200).json({ message: "Claim moved to under_review and assigned to you.", data: populated });
  } catch (err) {
    console.error("moveClaimToReview error:", err);
    return res.status(500).json({ message: "Error moving claim to review", error: err.message });
  }
};

/**
 * 7) Admin approves claim and (optionally) marks payout
 * Body: { settlementAmount, paymentMethod, transactionId, paidNow (boolean) }
 */
export const approveClaim = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    await connectToDB()
    const { id } = req.params;
    const adminId = req.user?.id;
    const role = req.user?.role;

    if (!ObjectId.isValid(id)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Invalid claim id." });
    }
    if (role !== "admin") {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({ message: "Only admins can approve claims." });
    }
    
    const claim = await Claim.findById(id).populate({
      path: "customerPolicy",
      populate: { path: "policy", model: "Policy" }
    });
    
    
    if (!claim) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Claim not found." });
    }
    
    const latestStatus = (claim.statusHistory && claim.statusHistory.length) ? claim.statusHistory[claim.statusHistory.length - 1].status : null;
    if (["approved", "paid"].includes(latestStatus)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Claim is already approved/paid." });
    }
    
    // decide settlement amount
    const { settlementAmount, paymentMethod, transactionId, paidNow } = req.body || {};
    const policyCoverage = claim.customerPolicy?.policy?.coverageAmount ?? null;
    let finalAmount = typeof settlementAmount !== "undefined" ? Number(settlementAmount) : Number(claim.claimAmount);
    
    if (isNaN(finalAmount) || finalAmount < 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Invalid settlementAmount." });
    }
    
    // cap by coverage if available
    if (policyCoverage !== null && finalAmount > policyCoverage) {
      finalAmount = policyCoverage;
    }
    
    // Update claim -> approved
    claim.statusHistory.push({ status: "approved", updatedAt: new Date(), updatedBy: adminId });
    // Add payout info (payment may happen asynchronously)
    claim.payout = {
      amountPaid: paidNow ? finalAmount : undefined,
      paidAt: paidNow ? new Date() : undefined,
      paymentMethod: paidNow ? paymentMethod : undefined,
      transactionId: paidNow ? transactionId : undefined
    };
    
    // If paidNow, mark paid in status history
    if (paidNow) {
      claim.statusHistory.push({ status: "paid", updatedAt: new Date(), updatedBy: adminId });
    }
    
    // Unflag if flagged previously
    claim.isFlagged = false;
    claim.flagReason = undefined;
    claim.status = "approved"
    
    await claim.save();
    console.log(claim)
    
    // Optionally create a Transaction document (if your Transaction model exists)
    if (mongoose.models.Transaction) {
      const Transaction = mongoose.models.Transaction;
      if (paidNow) {
        await Transaction.create([{
          user: claim.customer,
          policy: claim.customerPolicy,
          amount: finalAmount,
          type: "claim_payout",
          status: "success",
          createdAt: new Date()
        }], { session });
      } else {
        // create pending transaction record for settlement queue (optional)
        await Transaction.create([{
          user: claim.customer,
          policy: claim.customerPolicy,
          amount: finalAmount,
          type: "claim_payout",
          status: "pending",
          createdAt: new Date()
        }], { session });
      }
    }

    await session.commitTransaction();
    session.endSession();

    const populated = await populateClaim(Claim.findById(claim._id));
    return res.status(200).json({ message: "Claim approved successfully.", data: populated });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    // console.error("approveClaim error:", err);
    return res.status(500).json({ message: "Error approving claim", error: err.message });
  }
};

/**
 * 8) Admin rejects claim
 * Body: { reason }
 */
export const rejectClaim = async (req, res) => {
  try {
    await connectToDB()
    const { id } = req.params;
    const adminId = req.user?.id;
    const role = req.user?.role;
    const { reason } = req.body || {};

    if (!ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid claim id." });
    if (role !== "admin") return res.status(403).json({ message: "Only admins can reject claims." });
    if (!reason) return res.status(400).json({ message: "Rejection reason is required." });

    const claim = await Claim.findById(id);
    if (!claim) return res.status(404).json({ message: "Claim not found." });

    const latestStatus = (claim.statusHistory && claim.statusHistory.length) ? claim.statusHistory[claim.statusHistory.length - 1].status : null;
    if (["rejected", "paid"].includes(latestStatus)) return res.status(400).json({ message: "Claim cannot be rejected in current status." });

    claim.statusHistory.push({ status: "rejected", updatedAt: new Date(), updatedBy: adminId });
    claim.rejection = {
      reason,
      rejectedBy: adminId,
      rejectedAt: new Date()
    };

    await claim.save();

    const populated = await populateClaim(Claim.findById(claim._id));
    return res.status(200).json({ message: "Claim rejected.", data: populated });
  } catch (err) {
    console.error("rejectClaim error:", err);
    return res.status(500).json({ message: "Error rejecting claim", error: err.message });
  }
};

/**
 * 9) Delete claim
 * - Customer: allowed only if pending & owns it
 * - Admin: allowed anytime
 */
export const deleteClaim = async (req, res) => {
  try {
    await connectToDB()
    const { id } = req.params;
    const userId = req.user?.id;
    const role = req.user?.role;

    if (!ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid claim id." });

    const claim = await Claim.findById(id);
    if (!claim) return res.status(404).json({ message: "Claim not found." });

    if (role === "customer") {
      if (claim.customer.toString() !== userId) return res.status(403).json({ message: "You cannot delete this claim." });
      const latestStatus = (claim.statusHistory && claim.statusHistory.length) ? claim.statusHistory[claim.statusHistory.length - 1].status : null;
      if (latestStatus !== "pending") return res.status(400).json({ message: "Only pending claims can be deleted by customer." });
      await claim.remove();
      return res.status(200).json({ message: "Claim deleted successfully." });
    }

    if (role === "admin") {
      await claim.remove();
      return res.status(200).json({ message: "Claim deleted by admin." });
    }

    return res.status(403).json({ message: "Only customers (owner) or admins can delete claims." });
  } catch (err) {
    console.error("deleteClaim error:", err);
    return res.status(500).json({ message: "Error deleting claim", error: err.message });
  }
};
