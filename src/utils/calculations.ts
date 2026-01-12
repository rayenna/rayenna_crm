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

/**
 * Calculate Gross Profit
 * Gross Profit = Order Value (projectCost) - Total Project Cost (totalProjectCost)
 * If totalProjectCost is null/undefined, return null (cannot calculate without cost)
 */
export const calculateGrossProfit = (
  projectCost: number | null | undefined,
  totalProjectCost: number | null | undefined
): number | null => {
  // Order Value must be present and valid
  if (projectCost === null || projectCost === undefined || isNaN(projectCost)) {
    return null;
  }
  
  // If Total Project Cost is not provided, cannot calculate gross profit
  if (totalProjectCost === null || totalProjectCost === undefined || isNaN(totalProjectCost)) {
    return null;
  }

  const grossProfit = projectCost - totalProjectCost;
  return Math.round(grossProfit * 100) / 100; // Round to 2 decimal places
};

/**
 * Calculate Profitability Percentage
 * Profitability (%) = (Gross Profit / Order Value) × 100
 */
export const calculateProfitability = (
  grossProfit: number | null | undefined,
  projectCost: number | null | undefined
): number | null => {
  // Both values must be present and valid
  if (grossProfit === null || grossProfit === undefined || isNaN(grossProfit)) {
    return null;
  }
  if (projectCost === null || projectCost === undefined || isNaN(projectCost) || projectCost === 0) {
    return null; // Cannot divide by zero
  }

  const profitability = (grossProfit / projectCost) * 100;
  return Math.round(profitability * 100) / 100; // Round to 2 decimal places
};

/**
 * Calculate Financial Year from a date
 * FY runs from April 1 to March 31
 * e.g., April 1, 2024 to March 31, 2025 = FY 2024-25
 */
export const calculateFY = (date: Date | string | null | undefined): string | null => {
  if (!date) return null;
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return null;
    
    const year = dateObj.getFullYear();
    const month = dateObj.getMonth() + 1; // getMonth() returns 0-11
    
    // If month is April (4) or later, FY starts in current year
    // If month is Jan-Mar (1-3), FY started in previous year
    if (month >= 4) {
      // April 2024 to March 2025 = FY 2024-25
      return `${year}-${String(year + 1).slice(-2)}`;
    } else {
      // January 2025 to March 2025 = FY 2024-25 (started in 2024)
      return `${year - 1}-${String(year).slice(-2)}`;
    }
  } catch (error) {
    return null;
  }
};
