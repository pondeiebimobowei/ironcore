import { apiClient } from "../../lib/api/client";
import type { CreatePaymentInput, Payment } from "./types";

export async function listPayments() {
  const response = await apiClient.get<Payment[]>("/api/payments");

  return response.data;
}

export async function getPayment(paymentId: string) {
  const response = await apiClient.get<Payment>(`/api/payments/${paymentId}`);

  return response.data;
}

export async function createPayment(input: CreatePaymentInput) {
  const response = await apiClient.post<Payment>("/api/payments", input);

  return response.data;
}

export async function verifyPayment(paymentId: string) {
  const response = await apiClient.post<Payment>(
    `/api/payments/${paymentId}/verify`,
  );

  return response.data;
}

export async function rejectPayment(paymentId: string, reason: string) {
  const response = await apiClient.post<Payment>(
    `/api/payments/${paymentId}/reject`,
    { reason },
  );

  return response.data;
}
