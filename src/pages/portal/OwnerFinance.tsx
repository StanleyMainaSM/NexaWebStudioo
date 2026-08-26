import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Wallet,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Clock3,
  XCircle,
  ShieldCheck,
} from 'lucide-react';

type FinanceTransaction = {
  id: string;
  transaction_type: string;
  amount: number;
  status: string;
  verification_status: string | null;
  description: string | null;
  reference_number: string | null;
  created_at: string;
};

const transactionFilters = [
  { value: 'all', label: 'All Transactions' },
  { value: 'client_payment', label: 'Client Payments' },
  { value: 'operator_payment', label: 'Operator Payments' },
  { value: 'connector_commission', label: 'Connector Commissions' },
  { value: 'admin_payment', label: 'Admin Payments' },
  { value: 'business_expense', label: 'Business Expenses' },
  { value: 'other_income', label: 'Other Income' },
  { value: 'other_expense', label: 'Other Expenses' },
];

export default function OwnerFinance() {
  const [transactions, setTransactions] = useState<
    FinanceTransaction[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  const loadTransactions = async () => {
    setLoading(true);
    setError('');

    try {
      const { data, error: transactionError } =
        await supabase
          .from('finance_transactions')
          .select(
            'id,transaction_type,amount,status,verification_status,description,reference_number,created_at'
          )
          .order('created_at', {
            ascending: false,
          });

      if (transactionError) {
        throw transactionError;
      }

      setTransactions(
        (data || []) as FinanceTransaction[]
      );
    } catch (err: any) {
      setError(
        err?.message ||
          'Unable to load Avelixa financial transactions.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTransactions();
  }, []);

  const filteredTransactions = useMemo(() => {
    if (filter === 'all') {
      return transactions;
    }

    return transactions.filter(
      (transaction) =>
        transaction.transaction_type === filter
    );
  }, [transactions, filter]);

  const totalAmount = useMemo(
    () =>
      transactions.reduce(
        (total, transaction) =>
          total + Number(transaction.amount || 0),
        0
      ),
    [transactions]
  );

  const paidAmount = useMemo(
    () =>
      transactions
        .filter(
          (transaction) =>
            transaction.status.toLowerCase() === 'paid'
        )
        .reduce(
          (total, transaction) =>
            total + Number(transaction.amount || 0),
          0
        ),
    [transactions]
  );

  const pendingAmount = useMemo(
    () =>
      transactions
        .filter(
          (transaction) =>
            transaction.status.toLowerCase() === 'pending' ||
            transaction.status.toLowerCase() === 'not_paid'
        )
        .reduce(
          (total, transaction) =>
            total + Number(transaction.amount || 0),
          0
        ),
    [transactions]
  );

  const formatAmount = (amount: number) =>
    new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      maximumFractionDigits: 0,
    }).format(amount);

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  const getStatusClasses = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
      case 'completed':
      case 'verified':
        return 'bg-emerald-500/10 text-emerald-400';

      case 'cancelled':
      case 'canceled':
      case 'failed':
      case 'rejected':
        return 'bg-red-500/10 text-red-400';

      default:
        return 'bg-amber-500/10 text-amber-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
      case 'completed':
      case 'verified':
        return (
          <CheckCircle2 className="w-3.5 h-3.5" />
        );

      case 'cancelled':
      case 'canceled':
      case 'failed':
      case 'rejected':
        return (
          <XCircle className="w-3.5 h-3.5" />
        );

      default:
        return (
          <Clock3 className="w-3.5 h-3.5" />
        );
    }
  };

  const transactionTypeLabel = (
    transactionType: string
  ) =>
    transactionType
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (character) =>
        character.toUpperCase()
      );

  const isExpenseTransaction = (
    transactionType: string
  ) =>
    transactionType === 'business_expense' ||
    transactionType === 'other_expense' ||
    transactionType === 'operator_payment' ||
    transactionType === 'connector_commission' ||
    transactionType === 'admin_payment';

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-accent-600/10 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-accent-400" />
          </div>

          <div>
            <h1 className="text-2xl font-semibold text-white">
              Financial Operations
            </h1>

            <p className="text-sm text-gray-400 mt-1">
              Track every financial transaction
              recorded in Avelixa.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadTransactions}
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-ink-800/60 bg-ink-900/40 p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">
              Total Transactions
            </span>

            <Wallet className="w-5 h-5 text-accent-400" />
          </div>

          <p className="text-2xl font-semibold text-white mt-3">
            {transactions.length}
          </p>

          <p className="text-xs text-gray-500 mt-1">
            Recorded financial operations
          </p>
        </div>

        <div className="rounded-2xl border border-ink-800/60 bg-ink-900/40 p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">
              Processed Value
            </span>

            <ArrowUpRight className="w-5 h-5 text-emerald-400" />
          </div>

          <p className="text-2xl font-semibold text-white mt-3">
            {formatAmount(paidAmount)}
          </p>

          <p className="text-xs text-gray-500 mt-1">
            Paid transactions
          </p>
        </div>

        <div className="rounded-2xl border border-ink-800/60 bg-ink-900/40 p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">
              Pending Value
            </span>

            <Clock3 className="w-5 h-5 text-amber-400" />
          </div>

          <p className="text-2xl font-semibold text-white mt-3">
            {formatAmount(pendingAmount)}
          </p>

          <p className="text-xs text-gray-500 mt-1">
            Awaiting completion
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-accent-500/20 bg-accent-500/5 p-5 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-accent-400 mt-0.5 shrink-0" />

        <div>
          <p className="text-sm font-semibold text-white">
            Owner Financial Control
          </p>

          <p className="text-xs text-gray-400 mt-1">
            This financial ledger is restricted to
            authorized Avelixa Owner access.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Transaction Ledger
          </h2>

          <p className="text-sm text-gray-500 mt-1">
            Total recorded value: {formatAmount(totalAmount)}
          </p>
        </div>

        <select
          value={filter}
          onChange={(event) =>
            setFilter(event.target.value)
          }
          className="rounded-xl bg-ink-950 border border-ink-800 px-4 py-2.5 text-sm text-white outline-none focus:border-accent-500"
        >
          {transactionFilters.map((option) => (
            <option
              key={option.value}
              value={option.value}
            >
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-2xl border border-ink-800/60 bg-ink-900/40 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-400">
            Loading financial transactions...
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="p-10 text-center">
            <Wallet className="w-10 h-10 mx-auto text-gray-600 mb-3" />

            <p className="text-gray-400">
              No financial transactions found.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-ink-800/60">
            {filteredTransactions.map(
              (transaction) => (
                <div
                  key={transaction.id}
                  className="p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center">
                        {isExpenseTransaction(
                          transaction.transaction_type
                        ) ? (
                          <ArrowDownRight className="w-4 h-4 text-red-400" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="font-medium text-white truncate">
                          {transactionTypeLabel(
                            transaction.transaction_type
                          )}
                        </p>

                        <p className="text-sm text-gray-500 truncate">
                          {transaction.description ||
                            transaction.reference_number ||
                            'Avelixa financial transaction'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-3 ml-12">
                      <span className="px-2.5 py-1 rounded-lg bg-white/5 text-xs text-gray-400">
                        {formatDate(
                          transaction.created_at
                        )}
                      </span>

                      {transaction.reference_number && (
                        <span className="px-2.5 py-1 rounded-lg bg-white/5 text-xs text-gray-500">
                          Ref: {transaction.reference_number}
                        </span>
                      )}

                      {transaction.verification_status && (
                        <span
                          className={`px-2.5 py-1 rounded-lg text-xs ${getStatusClasses(
                            transaction.verification_status
                          )}`}
                        >
                          {transaction.verification_status}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-lg font-semibold text-white">
                      {formatAmount(
                        Number(transaction.amount)
                      )}
                    </span>

                    <span
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs capitalize ${getStatusClasses(
                        transaction.status
                      )}`}
                    >
                      {getStatusIcon(
                        transaction.status
                      )}

                      {transaction.status.replace(
                        /_/g,
                        ' '
                      )}
                    </span>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}