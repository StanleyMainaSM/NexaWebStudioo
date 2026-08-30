export type PaymentAmountValidation =
  | { valid: true; amount: number }
  | { valid: false; amount: null; message: string };

export function validatePaymentAmount(
  input: string | number,
  remainingBalance: number
): PaymentAmountValidation {
  if (!Number.isFinite(remainingBalance) || remainingBalance <= 0) {
    return {
      valid: false,
      amount: null,
      message: 'There is no remaining balance available for payment.',
    };
  }

  const amount = typeof input === 'number' ? input : Number(input.trim());

  if (!Number.isFinite(amount)) {
    return {
      valid: false,
      amount: null,
      message: 'Enter a valid payment amount.',
    };
  }

  if (amount <= 0) {
    return {
      valid: false,
      amount: null,
      message: 'Payment amount must be greater than zero.',
    };
  }

  if (amount > remainingBalance) {
    return {
      valid: false,
      amount: null,
      message: 'Payment amount cannot exceed the remaining balance.',
    };
  }

  return { valid: true, amount };
}
