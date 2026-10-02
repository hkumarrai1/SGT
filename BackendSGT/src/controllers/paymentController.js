import { SGT_PLANS, OFFICIAL_UPI } from "../data/plans.js";
import {
  getMyPaymentStatus,
  submitPaymentProof,
} from "../services/paymentService.js";

export async function listPlans(req, res) {
  return res.json({
    success: true,
    plans: Object.values(SGT_PLANS),
    officialUpi: OFFICIAL_UPI,
  });
}

export async function getPaymentStatus(req, res) {
  const status = await getMyPaymentStatus(req.user._id);
  return res.json({
    success: true,
    ...status,
  });
}

export async function submitPayment(req, res) {
  const { planId, plan, utr, promoCode } = req.body || {};
  const file = req.file;

  const payment = await submitPaymentProof(
    req.user._id,
    { planId, plan, utr, promoCode },
    file,
  );

  return res.status(201).json({
    success: true,
    message: "Payment submitted — awaiting admin verification.",
    payment: {
      _id: payment._id,
      plan: payment.plan,
      planName: payment.planName,
      amount: payment.amount,
      originalAmount: payment.originalAmount,
      discountAmount: payment.discountAmount,
      promoCode: payment.promoCode,
      utr: payment.utr,
      status: payment.status,
      submittedAt: payment.submittedAt,
    },
  });
}
