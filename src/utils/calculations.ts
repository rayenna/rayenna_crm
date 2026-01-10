import { PaymentStatus } from '@prisma/client';

export interface PaymentFields {
  advanceReceived?: number | null;
  payment1?: number | null;
  payment2?: number | null;
  payment3?: number | null;
  lastPayment?: number | null;
  projectCost?: number | null;
}

export const calculatePayments = (fields: PaymentFields) => {
  const totalReceived =
    (fields.advanceReceived || 0) +
    (fields.payment1 || 0) +
    (fields.payment2 || 0) +
    (fields.payment3 || 0) +
    (fields.lastPayment || 0);

  const projectCost = fields.projectCost || 0;
  const balanceAmount = Math.max(0, projectCost - totalReceived);

  let paymentStatus: PaymentStatus = PaymentStatus.PENDING;
  if (totalReceived >= projectCost) {
    paymentStatus = PaymentStatus.FULLY_PAID;
  } else if (totalReceived > 0) {
    paymentStatus = PaymentStatus.PARTIAL;
  }

  return {
    totalAmountReceived: totalReceived,
    balanceAmount: balanceAmount,
    paymentStatus,
  };
};

export const calculateExpectedProfit = (
  projectCost: number | null | undefined,
  systemCapacity: number | null | undefined
): number | null => {
  if (!projectCost || !systemCapacity || systemCapacity === 0) {
    return null;
  }

  // This is a placeholder calculation - adjust based on actual business logic
  // Example: profit = projectCost * margin_percentage - fixed_costs
  // For now, using a simple percentage-based calculation
  const marginPercentage = 0.15; // 15% margin (adjust as needed)
  const expectedProfit = projectCost * marginPercentage;

  return Math.round(expectedProfit * 100) / 100; // Round to 2 decimal places
};
