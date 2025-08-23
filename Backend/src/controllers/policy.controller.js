import { connectToDB } from "../config/db.config.js";
import { Policy } from "../models/Policy.js";

const generatePolicyCode = async () => {
  const randomNum = Math.floor(1000 + Math.random() * 9000); // 4-digit random
  const code = `POL-${new Date().getFullYear()}-${randomNum}`;

  const exists = await Policy.findOne({ policyCode: code });
  if (exists) return generatePolicyCode();
  return code;
};
// Add policy by the agent or admin
export const addPolicies = async (req, res) => {
  try {
    await connectToDB()
    const {
      policyType,
      title,
      description,
      coverageAmount,
      premiumAmount,
      terms,
      effectiveFrom,
      validTill,
      renewable,
      renewalPeriodInMonths,
      gracePeriodDays,
      eligibility,
      status,
    } = req.body || {};

    const policyCode = await generatePolicyCode();

    const policy = new Policy({
      policyCode,
      policyType,
      title,
      description,
      coverageAmount,
      premiumAmount,
      terms,
      effectiveFrom,
      validTill,
      renewable,
      renewalPeriodInMonths,
      gracePeriodDays,
      eligibility,
      status,
      createdBy: req.user?.id,
    });

    await policy.save();

    return res.status(201).json({
      success: true,
      message: "Policy created successfully",
      data: policy,
    });
  } catch (error) {
    console.error("Error creating policy:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create policy",
      error: error.message,
    });
  }
};

// Get policies controller
export const getPolicies = async (req, res) => {
  try {
    await connectToDB()
    // Extract query params (filters)
    const { category, country, minPrice, maxPrice, isActive, sortBy, order = "asc", page = 1, limit = 10 } = req.query || {};

    // Build filter object
    let filter = {};

    if (category) filter.category = category;
    if (country) filter.country = country;
    if (isActive !== undefined) filter.isActive = isActive === "true";
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    let sort = {};
    if (sortBy) {
      sort[sortBy] = order === "desc" ? -1 : 1;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const policies = await Policy.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(Number(limit)).populate('createdBy' , "-_id name email");

    const total = await Policy.countDocuments(filter);

    res.status(200).json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      policies,
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};

// get policies by the Id
export const getPoliciesById = async (req, res) => {
  try {
    await connectToDB()
    const { id } = req.params;

    const policy = await Policy.findById(id).populate("createdBy", "-_id name email role");
    if (!policy) {
      return res.status(404).json({ message: "Policy not found" });
    }

    res.status(200).json(policy);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};


// update policy by the id
export const updatePolicy = async (req, res) => {
  try {
    await connectToDB()
    const { id } = req.params;
    const updates = req.body;

    const updatedPolicy = await Policy.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    }).populate("createdBy", "-_id name email role");

    if (!updatedPolicy) {
      return res.status(404).json({ message: "Policy not found" });
    }

    res.status(200).json({ message: "Policy updated successfully", policy: updatedPolicy });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};


// Delete policies by the admin or agent
export const deletePolicy = async (req, res) => {
  try {
    await connectToDB()
    const { id } = req.params;

    const deletedPolicy = await Policy.findByIdAndDelete(id);
    if (!deletedPolicy) {
      return res.status(404).json({ message: "Policy not found" });
    }

    res.status(200).json({ message: "Policy deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

