export type CommissionEarning = {
  amount: number | null;
  status: string | null;
  paid_at: string | null;
};

export const formatConnectorMoney = (value: number) =>
  `KSh ${value.toLocaleString('en-KE', { maximumFractionDigits: 2 })}`;

export function isCancelledCommission(status: string | null) {
  return ['cancelled', 'canceled', 'rejected', 'void'].includes((status || '').toLowerCase());
}

export function isPaidCommission(status: string | null) {
  return ['paid', 'completed', 'confirmed'].includes((status || '').toLowerCase());
}

export function calculateConnectorEarnings(commissions: CommissionEarning[]) {
  const valid = commissions.filter((commission) => !isCancelledCommission(commission.status));
  const totalEarned = valid.reduce((sum, commission) => sum + Number(commission.amount || 0), 0);
  const paid = valid
    .filter((commission) => isPaidCommission(commission.status) || Boolean(commission.paid_at))
    .reduce((sum, commission) => sum + Number(commission.amount || 0), 0);
  const pending = Math.max(totalEarned - paid, 0);

  return { totalEarned, paid, pending };
}
