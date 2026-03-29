import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import {
  CreditCard,
  DollarSign,
  Loader2,
  Search,
  ArrowUpDown,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/useDebounce';
import { useUnseenPayments } from '@/hooks/useUnseenPayments';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PaymentWithProject {
  id: string;
  project_id: string;
  amount: number;
  currency: string;
  status: string;
  stripe_payment_id: string | null;
  description: string | null;
  seen: boolean;
  created_at: string;
  company_name: string;
}

type SortField = 'created_at' | 'amount' | 'company_name';
type SortDir = 'asc' | 'desc';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function safeDate(value: string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '--';
  try {
    return format(parseISO(value), 'MMM d, yyyy');
  } catch {
    return '--';
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminPayments() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { markGlobalSeen } = useUnseenPayments();

  const [payments, setPayments] = useState<PaymentWithProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const debouncedSearch = useDebounce(searchTerm, 300);

  // Mark payments as seen on mount
  useEffect(() => {
    markGlobalSeen();
  }, [markGlobalSeen]);

  // -------------------------------------------------------------------------
  // Data fetching
  // -------------------------------------------------------------------------

  const fetchPayments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*, projects(company_name)')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;

      const mapped: PaymentWithProject[] = (data ?? []).map((row: Record<string, unknown>) => {
        const projects = row['projects'] as { company_name: string } | null;
        return {
          id: row['id'] as string,
          project_id: row['project_id'] as string,
          amount: row['amount'] as number,
          currency: (row['currency'] as string | null) ?? 'usd',
          status: (row['status'] as string | null) ?? 'unknown',
          stripe_payment_id: (row['stripe_payment_id'] as string | null) ?? null,
          description: (row['description'] as string | null) ?? null,
          seen: Boolean(row['seen']),
          created_at: row['created_at'] as string,
          company_name: projects?.company_name ?? 'Unknown',
        };
      });

      setPayments(mapped);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load payments';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void fetchPayments();
  }, [fetchPayments]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel('admin-payments')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payments' },
        () => {
          void fetchPayments();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchPayments]);

  // -------------------------------------------------------------------------
  // Filtered & sorted
  // -------------------------------------------------------------------------

  const filtered = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();

    let result =
      term === ''
        ? payments
        : payments.filter((p) => {
            if (p.company_name.toLowerCase().includes(term)) return true;
            if (p.description !== null && p.description.toLowerCase().includes(term)) return true;
            if (p.status.toLowerCase().includes(term)) return true;
            return false;
          });

    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'created_at') {
        cmp = a.created_at.localeCompare(b.created_at);
      } else if (sortField === 'amount') {
        cmp = a.amount - b.amount;
      } else if (sortField === 'company_name') {
        cmp = a.company_name.localeCompare(b.company_name);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [payments, debouncedSearch, sortField, sortDir]);

  // -------------------------------------------------------------------------
  // Sort toggle
  // -------------------------------------------------------------------------

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  // -------------------------------------------------------------------------
  // Totals
  // -------------------------------------------------------------------------

  const totalAmount = useMemo(
    () => filtered.reduce((sum, p) => sum + p.amount, 0),
    [filtered],
  );

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold font-display text-foreground">
            <CreditCard className="h-6 w-6 text-primary" />
            Payments
          </h1>
          <p className="text-sm text-muted-foreground">
            All payments across Vision Software clients.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search payments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 w-full pl-8 sm:w-56"
            />
          </div>

          {/* Total */}
          {totalAmount > 0 && (
            <Card className="border-primary/20 bg-primary/5 shadow-none">
              <CardContent className="flex items-center gap-2 px-4 py-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Total
                  </p>
                  <p className="text-sm font-bold text-primary">
                    {formatCurrency(totalAmount, 'usd')}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <DollarSign className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              {payments.length === 0
                ? 'No payments recorded yet.'
                : 'No payments match your search.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>
                    <button
                      className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                      onClick={() => toggleSort('created_at')}
                    >
                      Date
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                      onClick={() => toggleSort('company_name')}
                    >
                      Client
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead className="text-muted-foreground">Description</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead className="text-right">
                    <button
                      className="ml-auto flex items-center gap-1 text-muted-foreground hover:text-foreground"
                      onClick={() => toggleSort('amount')}
                    >
                      Amount
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((payment) => (
                  <TableRow
                    key={payment.id}
                    className="border-border cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/admin/clients/${payment.project_id}`)}
                  >
                    <TableCell className="text-sm text-muted-foreground">
                      {safeDate(payment.created_at)}
                    </TableCell>
                    <TableCell className="text-sm font-medium text-foreground">
                      {payment.company_name}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {payment.description ?? '--'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          payment.status === 'succeeded'
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                            : payment.status === 'pending'
                              ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                              : 'border-red-500/30 bg-red-500/10 text-red-400'
                        }
                      >
                        {payment.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium text-foreground">
                      {formatCurrency(payment.amount, payment.currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
