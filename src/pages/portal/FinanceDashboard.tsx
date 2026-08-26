import { createClient } from '@supabase/supabase-js';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
  ArrowLeft,
  RefreshCw,
  WalletCards,
  ReceiptText,
  BadgeDollarSign,
  HandCoins,
  ShieldAlert,
  LockKeyhole,
  Eye,
} from 'lucide-react';

type Transaction = {
  id: string;
  source: string;
  type: string;
  amount: number;
  status: string;
  date: string;
  reference: string | null;
  description: string;
};

type FinanceStats = {
  revenue: number;
  payments: number;
  payouts: number;
  commissions: number;
  outstanding: number;
};

const emptyStats: FinanceStats = {
  revenue: 0,
  payments: 0,
  payouts: 0,
  commissions: 0,
  outstanding: 0,
};

const verificationClient = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  }
);

export default function FinanceDashboard() {
  const [authorized, setAuthorized] = useState(false);
  const [password, setPassword] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [authError, setAuthError] = useState('');
  const [stats, setStats] = useState<FinanceStats>(emptyStats);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const formatAmount = (value: number) =>
    new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      maximumFractionDigits: 0,
    }).format(value);

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  const statusClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
      case 'completed':
        return 'text-emerald-400 bg-emerald-500/10';
      case 'cancelled':
      case 'canceled':
      case 'failed':
        return 'text-red-400 bg-red-500/10';
      default:
        return 'text-amber-400 bg-amber-500/10';
    }
  };

  const loadFinance = async () => {
    setLoading(true);
    setError('');

    try {
      const [
        paymentsResult,
        invoicesResult,
        payoutsResult,
        commissionsResult,
      ] = await Promise.all([
        supabase
          .from('payments')
          .select(
            'id,invoice_id,amount,payment_method,reference_number,status,payment_date,created_at'
          )
          .order('payment_date', { ascending: false }),

        supabase
          .from('invoices')
          .select(
            'id,project_id,client_id,amount,status,due_date,created_at'
          )
          .order('created_at', { ascending: false }),

        supabase
          .from('payouts')
          .select(
            'id,recipient_id,recipient_role,amount,payment_method,reference_number,status,notes,paid_at,created_at,payout_type'
          )
          .order('created_at', { ascending: false }),

        supabase
          .from('commissions')
          .select(
            'id,connector_id,project_id,payment_id,eligible_amount,commission_percentage,amount,status,paid_at,created_at,payment_method,payment_reference'
          )
          .order('created_at', { ascending: false }),
      ]);

      if (paymentsResult.error) throw paymentsResult.error;
      if (invoicesResult.error) throw invoicesResult.error;
      if (payoutsResult.error) throw payoutsResult.error;
      if (commissionsResult.error) throw commissionsResult.error;

      const payments = paymentsResult.data || [];
      const invoices = invoicesResult.data || [];
      const payouts = payoutsResult.data || [];
      const commissions = commissionsResult.data || [];

      const paidPayments = payments.filter(
        (item) =>
          String(item.status || '').toLowerCase() === 'paid'
      );

      const revenue = paidPayments.reduce(
        (total, item) => total + Number(item.amount || 0),
        0
      );

      const totalPayments = payments.reduce(
        (total, item) => total + Number(item.amount || 0),
        0
      );

      const paidPayouts = payouts.filter((item) =>
        ['paid', 'completed'].includes(
          String(item.status || '').toLowerCase()
        )
      );

      const payoutTotal = paidPayouts.reduce(
        (total, item) => total + Number(item.amount || 0),
        0
      );

      const paidCommissions = commissions.filter((item) =>
        ['paid', 'completed'].includes(
          String(item.status || '').toLowerCase()
        )
      );

      const commissionTotal = paidCommissions.reduce(
        (total, item) => total + Number(item.amount || 0),
        0
      );

      const outstanding = invoices
        .filter(
          (invoice) =>
            String(invoice.status || '').toLowerCase() !== 'paid'
        )
        .reduce(
          (total, invoice) =>
            total + Number(invoice.amount || 0),
          0
        );

      const rows: Transaction[] = [
        ...payments.map((item) => ({
          id: `payment-${item.id}`,
          source: 'payments',
          type: 'Client Payment',
          amount: Number(item.amount || 0),
          status: String(item.status || 'pending'),
          date: item.payment_date || item.created_at,
          reference: item.reference_number || null,
          description: 'Payment received from a client invoice.',
        })),

        ...payouts.map((item) => ({
          id: `payout-${item.id}`,
          source: 'payouts',
          type:
            item.payout_type === 'connector_commission'
              ? 'Connector Commission'
              : item.payout_type === 'operator_payment'
              ? 'Operator Payment'
              : 'Team Payout',
          amount: Number(item.amount || 0),
          status: String(item.status || 'pending'),
          date: item.paid_at || item.created_at,
          reference: item.reference_number || null,
          description:
            item.notes || `Payout to ${item.recipient_role}.`,
        })),

        ...commissions.map((item) => ({
          id: `commission-${item.id}`,
          source: 'commissions',
          type: 'Commission',
          amount: Number(item.amount || 0),
          status: String(item.status || 'pending'),
          date: item.paid_at || item.created_at,
          reference: item.payment_reference || null,
          description: `Connector commission at ${Number(
            item.commission_percentage || 0
          )}%.`,
        })),
      ];

      rows.sort(
        (a, b) =>
          new Date(b.date).getTime() -
          new Date(a.date).getTime()
      );

      setStats({
        revenue,
        payments: totalPayments,
        payouts: payoutTotal,
        commissions: commissionTotal,
        outstanding,
      });

      setTransactions(rows);
    } catch (err: any) {
      console.error('Finance dashboard error:', err);

      setError(
        err?.message ||
          'Unable to load financial information.'
      );
    } finally {
      setLoading(false);
    }
  };

  const unlockFinance = async () => {
    setAuthError('');

    if (!password) {
      setAuthError(
        'Enter your Owner password to continue.'
      );
      return;
    }

    setUnlocking(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user?.email) {
        throw new Error(
          'Your authenticated account could not be verified.'
        );
      }

      /*
       * IMPORTANT:
       * Use an isolated Supabase client for password verification.
       * This verifies the password without replacing the active
       * Owner session used by the Avelixa portal.
       */
      const {
        data: verificationData,
        error: passwordError,
      } = await verificationClient.auth.signInWithPassword({
        email: user.email,
        password,
      });

      if (passwordError || !verificationData.user) {
        throw new Error(
          'The Owner password is incorrect.'
        );
      }

      await verificationClient.auth.signOut();

      const {
        data: roles,
        error: rolesError,
      } = await supabase.rpc('get_my_roles');

      if (rolesError) {
        throw rolesError;
      }

      const hasOwnerRole =
        Array.isArray(roles) &&
        roles.some(
          (item: any) =>
            String(
              typeof item === 'string'
                ? item
                : item?.role || ''
            )
              .trim()
              .toLowerCase() === 'owner'
        );

      if (!hasOwnerRole) {
        throw new Error(
          'Owner authorization could not be confirmed.'
        );
      }

      setPassword('');
      setAuthorized(true);

      await loadFinance();
    } catch (err: any) {
      console.error(
        'Finance verification failed:',
        err
      );

      setAuthorized(false);
      setAuthError(
        err?.message ||
          'Unable to unlock Finance.'
      );
    } finally {
      setUnlocking(false);
    }
  };

  const netPosition = useMemo(
    () =>
      stats.revenue -
      stats.payouts -
      stats.commissions,
    [stats]
  );

  if (!authorized) {
    return (
      <div className="max-w-xl mx-auto py-10">
        <Link
          to="/portal/owner"
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Owner Dashboard
        </Link>

        <div className="mt-8 rounded-2xl border border-ink-800/60 bg-ink-900/40 p-8">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <LockKeyhole className="w-7 h-7 text-amber-400" />
          </div>

          <h1 className="mt-6 text-2xl font-semibold text-white">
            Owner Finance
          </h1>

          <p className="mt-2 text-sm leading-6 text-gray-400">
            This area contains sensitive Avelixa
            financial information. Re-enter your
            Owner password to continue.
          </p>

          {authError && (
            <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
              {authError}
            </div>
          )}

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void unlockFinance();
            }}
            className="mt-6 space-y-4"
          >
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Owner Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                autoComplete="current-password"
                placeholder="Enter your password"
                className="w-full rounded-xl bg-ink-950 border border-ink-800 px-4 py-3 text-white outline-none focus:border-accent-500"
              />
            </div>

            <button
              type="submit"
              disabled={unlocking || !password}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-accent-600 px-5 py-3 text-white font-medium hover:bg-accent-500 transition-colors disabled:opacity-50"
            >
              <Eye className="w-4 h-4" />

              {unlocking
                ? 'Verifying...'
                : 'Unlock Finance'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <Link
            to="/portal/owner"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Owner Dashboard
          </Link>

          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <WalletCards className="w-5 h-5 text-emerald-400" />
            </div>

            <div>
              <h1 className="text-2xl font-semibold text-white">
                Finance
              </h1>

              <p className="text-sm text-gray-400 mt-1">
                Complete financial visibility across Avelixa.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void loadFinance()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-ink-800 text-gray-300 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
        >
          <RefreshCw
            className={`w-4 h-4 ${
              loading ? 'animate-spin' : ''
            }`}
          />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <FinanceCard
          icon={BadgeDollarSign}
          label="Revenue Received"
          value={formatAmount(stats.revenue)}
        />

        <FinanceCard
          icon={ReceiptText}
          label="All Client Payments"
          value={formatAmount(stats.payments)}
        />

        <FinanceCard
          icon={HandCoins}
          label="Paid Payouts"
          value={formatAmount(stats.payouts)}
        />

        <FinanceCard
          icon={WalletCards}
          label="Paid Commissions"
          value={formatAmount(stats.commissions)}
        />

        <FinanceCard
          icon={ShieldAlert}
          label="Outstanding"
          value={formatAmount(stats.outstanding)}
        />
      </div>

      <div className="rounded-2xl border border-accent-500/20 bg-accent-500/5 p-6">
        <div className="text-xs uppercase tracking-widest text-accent-400 font-bold">
          Current Net Position
        </div>

        <div className="mt-2 text-3xl font-semibold text-white">
          {formatAmount(netPosition)}
        </div>

        <p className="mt-2 text-sm text-gray-400">
          Revenue received minus paid team payouts and paid commissions.
        </p>
      </div>

      <div className="rounded-2xl border border-ink-800/60 bg-ink-900/40 overflow-hidden">
        <div className="p-6 border-b border-ink-800/60">
          <h2 className="text-lg font-semibold text-white">
            Financial Transactions
          </h2>

          <p className="text-sm text-gray-500 mt-1">
            Client payments, commissions and team payouts recorded by Avelixa.
          </p>
        </div>

        {loading ? (
          <div className="p-10 text-center text-gray-400">
            Loading financial transactions...
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            No financial transactions found.
          </div>
        ) : (
          <div className="divide-y divide-ink-800/60">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="font-medium text-white">
                      {transaction.type}
                    </h3>

                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs capitalize ${statusClass(
                        transaction.status
                      )}`}
                    >
                      {transaction.status}
                    </span>
                  </div>

                  <p className="text-sm text-gray-500 mt-1">
                    {transaction.description}
                  </p>

                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-600">
                    <span>
                      {formatDate(transaction.date)}
                    </span>

                    {transaction.reference && (
                      <span>
                        Ref: {transaction.reference}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-lg font-semibold text-white">
                  {formatAmount(transaction.amount)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FinanceCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof WalletCards;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-ink-800/60 bg-ink-900/40 p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
          {label}
        </span>

        <Icon className="w-4 h-4 text-accent-400" />
      </div>

      <div className="mt-4 text-xl font-semibold text-white">
        {value}
      </div>
    </div>
  );
}
