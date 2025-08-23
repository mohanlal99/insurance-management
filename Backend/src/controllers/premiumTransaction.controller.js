import { PremiumTransaction } from "../models/PremiumTransaction.js";
import { CustomerPolicy } from "../models/CustomerPolicy.js";

/**
 * @desc Initiate premium payment
 * @route POST /premium/initiate
 */

export const initiatePremiumPayment = async (req, res) => {
  try {
    const { customerPolicyId, amount, isInstallment, installmentNumber } =
      req.body || {};

    // 1. Validate input
    if (!customerPolicyId || !amount) {
      return res
        .status(400)
        .json({ message: "CustomerPolicyId and amount are required" });
    }

    // 2. Check if CustomerPolicy exists
    const customerPolicy = await CustomerPolicy.findById(
      customerPolicyId
    ).populate("policy");
    if (!customerPolicy) {
      return res.status(404).json({ message: "Customer policy not found" });
    }

    // 3. Ensure user owns this policy
    if (customerPolicy.customer.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Not authorized to pay for this policy" });
    }

    const policy = customerPolicy.policy;

    // 4. Validate premium amount (don’t let user pay wrong value)
    if (amount !== policy.premiumAmount) {
      return res
        .status(400)
        .json({ message: `Premium amount must be ${policy.premiumAmount}` });
    }

    // 5. Check if policy already paid for current period
    const existingPayment = await PremiumTransaction.findOne({
      customerPolicy: customerPolicyId,
      status: "success",
      installmentNumber: installmentNumber || 1,
    });

    if (existingPayment) {
      return res
        .status(400)
        .json({ message: "Premium already paid for this installment" });
    }

    // 6. Generate IDs (for invoices and reference)
    const referenceId = "REF-" + Date.now();
    const invoiceNo =
      "INV-" +
      new Date().getFullYear() +
      "-" +
      Math.floor(Math.random() * 100000);

    // 7. Create PremiumTransaction
    const premiumTx = await PremiumTransaction.create({
      customerPolicy: customerPolicyId,
      customer: req.user.id,
      amount,
      totalAmount: amount, // in case of future discounts/charges
      isInstallment: isInstallment || false,
      installmentNumber: installmentNumber || 1,
      totalInstallments: customerPolicy.paymentFrequency === "monthly" ? 12 : 1,
      installmentAmount: amount,
      provider: "mock-gateway",
      gateway: "internal-mock",
      referenceId,
      invoiceNo,
      status: "initiated",
      remarks: `Premium payment for policy ${policy.policyCode}`,
    });

    // 8. Update CustomerPolicy (mark premium as initiated but not active yet)
    customerPolicy.statusHistory.push({
      status: "payment_initiated",
      date: new Date(),
      updatedBy: req.user.id,
    });
    await customerPolicy.save();

    return res.status(201).json({
      message: "Premium payment initiated",
      data: premiumTx,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

/**
 * @desc Verify premium payment after gateway callback
 * @route POST /premium/verify
 */
export const verifyPremiumPayment = async (req, res) => {
  try {
    const {
      transactionId,
      success,
      providerPaymentId,
      providerResponse,
      failureReason,
    } = req.body || {};
    const userId = req.user.id;
    const userRole = req.user.role;

    // 1. Find transaction
    const premiumTx = await PremiumTransaction.findById(transactionId).populate(
      "customerPolicy"
    );
    if (!premiumTx) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    // 3. Prevent duplicate verification
    if (premiumTx.status === "success") {
      return res
        .status(400)
        .json({ message: "Payment already verified as success" });
    }
    if (premiumTx.status === "failed") {
      return res
        .status(400)
        .json({ message: "Payment already marked as failed" });
    }

    // 4. Handle verification
    const custPolicy = await CustomerPolicy.findById(
      premiumTx.customerPolicy._id
    );

    if (success) {
      premiumTx.status = "success";
      premiumTx.completedAt = new Date();
      premiumTx.providerPaymentId =
        providerPaymentId || premiumTx.providerPaymentId;
      premiumTx.providerResponse =
        providerResponse || premiumTx.providerResponse;

      // First-time activation
      if (custPolicy.status === "pending") {
        custPolicy.status = "active";
        custPolicy.startDate = new Date();
        custPolicy.endDate = new Date(
          custPolicy.startDate.getTime() +
            custPolicy.policy.terms.durationInMonths * 30 * 24 * 60 * 60 * 1000
        );
        custPolicy.policyActivatedAt = new Date();
      }

      // Mark payment done
      custPolicy.premiumPaid = true;
      custPolicy.lastPaymentDate = new Date();

      // If installments → schedule next payment
      if (
        premiumTx.isInstallment &&
        premiumTx.installmentNumber < premiumTx.totalInstallments
      ) {
        const nextDue = new Date();
        nextDue.setMonth(nextDue.getMonth() + 1);
        custPolicy.nextPaymentDue = nextDue;
      } else {
        custPolicy.nextPaymentDue = null; // fully paid
      }

      // Push history
      custPolicy.statusHistory.push({
        status: "premium_paid",
        date: new Date(),
        updatedBy: userId,
      });
    } else {
      premiumTx.status = "failed";
      premiumTx.failureReason = failureReason || "Payment failed";
      premiumTx.gatewayStatus = "failed";
      custPolicy.premiumPaid = false;
    }

    await premiumTx.save();
    await custPolicy.save();

    return res.status(200).json({
      message: "Payment verification updated",
      data: {
        transaction: premiumTx,
        customerPolicy: custPolicy,
      },
    });
  } catch (err) {
    console.error("verifyPremiumPayment error:", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

/**
 * @desc Retry a failed premium payment
 * @route POST /premium/retry/:transactionId
 */
export const retryPremiumPayment = async (req, res) => {
  try {
    const { transactionId } = req.params;

    const oldTx = await PremiumTransaction.findById(transactionId);
    if (!oldTx)
      return res.status(404).json({ message: "Transaction not found" });

    if (oldTx.status !== "failed") {
      return res
        .status(400)
        .json({ message: "Only failed transactions can be retried" });
    }

    // Create new retry transaction
    const retryTx = await PremiumTransaction.create({
      customerPolicy: oldTx.customerPolicy,
      customer: oldTx.customer,
      policy: oldTx.policy,
      amount: oldTx.amount,
      status: "initiated",
      paymentGateway: "mock-gateway",
      referenceId: "REF-RETRY-" + Date.now(),
    });

    return res.status(201).json({ message: "Retry initiated", data: retryTx });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

/**
 * @desc Refund a premium payment
 * @route POST /premium/refund/:transactionId
 */
export const refundPremiumPayment = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Only admin can refund payments" });
    }

    const { transactionId } = req.params;
    const premiumTx = await PremiumTransaction.findById(transactionId);
    if (!premiumTx)
      return res.status(404).json({ message: "Transaction not found" });

    if (premiumTx.status !== "success") {
      return res
        .status(400)
        .json({ message: "Only successful payments can be refunded" });
    }

    premiumTx.status = "refunded";
    premiumTx.refundedAt = new Date();
    await premiumTx.save();

    return res
      .status(200)
      .json({ message: "Refund processed", data: premiumTx });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

/**
 * @desc Cancel a pending payment
 * @route POST /premium/cancel/:transactionId
 */
export const cancelPremiumPayment = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const premiumTx = await PremiumTransaction.findById(transactionId);
    if (!premiumTx)
      return res.status(404).json({ message: "Transaction not found" });

    if (
      premiumTx.customer.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to cancel this transaction" });
    }

    if (premiumTx.status !== "initiated") {
      return res
        .status(400)
        .json({ message: "Only initiated transactions can be cancelled" });
    }

    premiumTx.status = "cancelled";
    await premiumTx.save();

    return res
      .status(200)
      .json({ message: "Transaction cancelled", data: premiumTx });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

/**
 * @desc Generate invoice for premium transaction
 * @route GET /premium/invoice/:transactionId
 */
export const generateInvoice = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const premiumTx = await PremiumTransaction.findById(transactionId).populate(
      "customer policy"
    );

    if (!premiumTx)
      return res.status(404).json({ message: "Transaction not found" });
    if (premiumTx.status !== "success") {
      return res
        .status(400)
        .json({ message: "Invoice only for successful payments" });
    }

    const invoice = {
      invoiceNo: "INV-" + premiumTx._id,
      customer: premiumTx.customer,
      policy: premiumTx.policy,
      amount: premiumTx.amount,
      paidAt: premiumTx.paidAt,
      referenceId: premiumTx.referenceId,
    };

    return res
      .status(200)
      .json({ message: "Invoice generated", data: invoice });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

/**
 * @desc Get single transaction
 * @route GET /premium/:transactionId
 */
export const getPremiumTransactionById = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const premiumTx = await PremiumTransaction.findById(transactionId).populate(
      "customer policy"
    );
    if (!premiumTx)
      return res.status(404).json({ message: "Transaction not found" });

    if (
      premiumTx.customer.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    return res.status(200).json({ data: premiumTx });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

/**
 * @desc Get all transactions for a customer
 * @route GET /premium/customer/:customerId
 */
export const getCustomerPremiumTransactions = async (req, res) => {
  try {
    const { customerId } = req.params;

    if (req.user.role !== "admin" && req.user.id !== customerId) {
      return res
        .status(403)
        .json({
          message: "Not authorized to view this customer's transactions",
        });
    }

    const transactions = await PremiumTransaction.find({
      customer: customerId,
    }).populate("policy");
    return res.status(200).json({ data: transactions });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};
