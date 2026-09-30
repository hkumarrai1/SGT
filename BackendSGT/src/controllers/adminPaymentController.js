import {
  approvePaymentAdmin,
  getPaymentDetailAdmin,
  listPaymentsAdmin,
  rejectPaymentAdmin,
} from "../services/paymentService.js";

export async function listPayments(req, res) {
  const status = req.query.status;
  const payments = await listPaymentsAdmin({ status });
  return res.json({
    success: true,
    payments,
  });
}

export async function getPaymentDetail(req, res) {
  const payment = await getPaymentDetailAdmin(req.params.paymentId);
  return res.json({
    success: true,
    payment,
  });
}

export async function approvePayment(req, res) {
  const result = await approvePaymentAdmin(req.params.paymentId, req.admin.id);
  return res.json(result);
}

export async function rejectPayment(req, res) {
  const result = await rejectPaymentAdmin(
    req.params.paymentId,
    req.admin.id,
    req.body?.reason,
  );
  return res.json(result);
}
