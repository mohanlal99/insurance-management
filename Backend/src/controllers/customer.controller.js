import { connectToDB } from "../config/db.config.js";
import { CustomerPolicy } from "../models/CustomerPolicy.js"
import { Policy } from "../models/Policy.js"



// 1. Create / Purchase a Customer Policy

export const createCustomerPolicy = async (req, res) => {
  try {
    await connectToDB()
    const { policyId, paymentFrequency } = req.body || {};
    const customerId = req.user.id; 

  
    const policy = await Policy.findById(policyId);
    if (!policy) return res.status(404).json({ message: "Policy not found" });

    // Calculate dates
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(startDate.getMonth() + policy.terms.durationInMonths);

    // First payment due
    let nextPaymentDue = new Date(startDate);
    if (paymentFrequency === "monthly") nextPaymentDue.setMonth(startDate.getMonth() + 1);
    else if (paymentFrequency === "quarterly") nextPaymentDue.setMonth(startDate.getMonth() + 3);
    else if (paymentFrequency === "yearly") nextPaymentDue.setFullYear(startDate.getFullYear() + 1);

    
    const customerPolicy = await CustomerPolicy.create({
      customer: customerId,
      policy: policy._id,
      startDate,
      endDate,
      paymentFrequency,
      nextPaymentDue,
      status: "pending_payment",
      createdBy: req.user.id,
    });

    res.status(201).json({ message: "Policy purchased successfully", data: customerPolicy });
  } catch (error) {
    res.status(500).json({ message: "Error purchasing policy", error: error.message });
  }
};



// 2. Get All Policies for a Customer

export const getCustomerPolicies = async (req, res) => {
  try {
    await connectToDB()
    const customerId = req.user.id;

    const policies = await CustomerPolicy.find({ customer: customerId })
      .populate("policy")
      .populate("customer", "-_id name email");

    res.status(200).json({ data: policies });
  } catch (error) {
    res.status(500).json({ message: "Error fetching policies", error: error.message });
  }
};


// 3. Get Single Policy

export const getCustomerPolicyById = async (req, res) => {
  try {
    await connectToDB()
    const { id } = req.params;

    const customerPolicy = await CustomerPolicy.findById(id)
      .populate("policy")
      .populate("customer", "-_id name email")

    if (!customerPolicy) return res.status(404).json({ message: "Policy not found" });

    res.status(200).json({ data: customerPolicy });
  } catch (error) {
    res.status(500).json({ message: "Error fetching policy", error: error.message });
  }
};


// 4. Renew Policy

export const renewCustomerPolicy = async (req, res) => {
  try {
    await connectToDB()
    const { id } = req.params;
    const customerPolicy = await CustomerPolicy.findById(id).populate("policy");

    if (!customerPolicy) return res.status(404).json({ message: "Policy not found" });

     if (customerPolicy.status !== "active")
      return res.status(400).json({ message: "Only active policies can be renewed" });

    const policy = customerPolicy.policy;

    // Extend end date
    customerPolicy.endDate.setMonth(customerPolicy.endDate.getMonth() + policy.renewalPeriodInMonths);
    customerPolicy.renewalCount += 1;
    customerPolicy.renewalDueDate = new Date(customerPolicy.endDate);

    customerPolicy.statusHistory.push({
      status: "renewed",
      date: new Date(),
      updatedBy: req.user.id,
    });

    await customerPolicy.save();

    res.status(200).json({ message: "Policy renewed successfully", data: customerPolicy });
  } catch (error) {
    res.status(500).json({ message: "Error renewing policy", error: error.message });
  }
};


// 5. Cancel Policy

export const cancelCustomerPolicy = async (req, res) => {
  try {
    await connectToDB()
    const { id } = req.params;

    const customerPolicy = await CustomerPolicy.findById(id);
    if (!customerPolicy) return res.status(404).json({ message: "Policy not found" });

      if (customerPolicy.status === "cancelled")
      return res.status(400).json({ message: "Policy is already cancelled" });

    if (customerPolicy.status === "expired")
      return res.status(400).json({ message: "Expired policy cannot be cancelled" });

    customerPolicy.status = "cancelled";
    customerPolicy.statusHistory.push({
      status: "cancelled",
      date: new Date(),
      updatedBy: req.user.id,
    });

    await customerPolicy.save();

    res.status(200).json({ message: "Policy cancelled", data: customerPolicy });
  } catch (error) {
    res.status(500).json({ message: "Error cancelling policy", error: error.message });
  }
};


// 6. Pay Premium

export const payPremium = async (req, res) => {
  try {
    await connectToDB()
    const { id } = req.params;

    const customerPolicy = await CustomerPolicy.findById(id);
    if (!customerPolicy) return res.status(404).json({ message: "Policy not found" });

    
    // Validation
    if (customerPolicy.status === "cancelled")
      return res.status(400).json({ message: "Cannot pay premium for a cancelled policy" });

    if (customerPolicy.status === "expired")
      return res.status(400).json({ message: "Policy expired, please renew instead" });

    customerPolicy.premiumPaid = true;
    customerPolicy.lastPaymentDate = new Date();

    // Calculate next due date
    let next = new Date(customerPolicy.lastPaymentDate);
    if (customerPolicy.paymentFrequency === "monthly") next.setMonth(next.getMonth() + 1);
    else if (customerPolicy.paymentFrequency === "quarterly") next.setMonth(next.getMonth() + 3);
    else if (customerPolicy.paymentFrequency === "yearly") next.setFullYear(next.getFullYear() + 1);

    customerPolicy.nextPaymentDue = next;
    customerPolicy.status = "active";

    customerPolicy.statusHistory.push({
      status: "premium_paid",
      date: new Date(),
      updatedBy: req.user.id,
    });

    await customerPolicy.save();

    res.status(200).json({ message: "Premium paid successfully", data: customerPolicy });
  } catch (error) {
    res.status(500).json({ message: "Error paying premium", error: error.message });
  }
};
