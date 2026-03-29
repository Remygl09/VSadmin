import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DollarSign,
  Loader2,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Payment {
  id: string;
  project_id: string;
  amount: number;
  currency: string;
  status: string;
  stripe_payment_id: string | null;
  description: string | null;
  seen: boolean;
  created_at: string;
}

interface PaymentsTabProps {
  projectId: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusIcon(status: string) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
    case 'pending':
      return <Clock className="h-4 w-4 text-amber-400" />;
    case 'failed':
      return <XCircle className="h-4 w-4 text-red-400" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(amount / 100);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PaymentsTab({ projectId }: PaymentsTabProps) {
  const { toast } = useToast();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('pending');

  // -----------------------------------------------------------------------
  // Fetch
  // -----------------------------------------------------------------------

  const fetchPayments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPayments((data as Payment[] | null) ?? []);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to load payments';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [projectId, toast]);

  useEffect(() => {
    void fetchPayments();
  }, [fetchPayments]);

  // -----------------------------------------------------------------------
  // Mark as seen
  // -----------------------------------------------------------------------

  const markSeen = async (paymentId: string) => {
    try {
      const { error } = await supabase
        .from('payments')
        .update({ seen: true })
        .eq('id', paymentId);

      if (error) throw error;

      setPayments((prev) =>
        prev.map((p) => (p.id === paymentId ? { ...p, seen: true } : p)),
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to update payment';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  // -----------------------------------------------------------------------
  // Create payment
  // -----------------------------------------------------------------------

  const handleCreate = async () => {
    const numericAmount = Math.round(parseFloat(amount) * 100);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      toast({ title: 'Enter a valid amount', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('payments').insert({
        project_id: projectId,
        amount: numericAmount,
        currency: 'usd',
        status,
        description: description.trim() || null,
      });

      if (error) throw error;

      toast({ title: 'Payment recorded' });
      setAmount('');
      setDescription('');
      setStatus('pending');
      setShowForm(false);
      void fetchPayments();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to create payment';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // -----------------------------------------------------------------------
  // Delete
  // -----------------------------------------------------------------------

  const handleDelete = async (paymentId: string) => {
    try {
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', paymentId);

      if (error) throw error;

      setPayments((prev) => prev.filter((p) => p.id !== paymentId));
      toast({ title: 'Payment deleted' });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to delete payment';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalCompleted = payments
    .filter((p) => p.status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Payments</h3>
          <span className="text-sm text-muted-foreground">
            ({payments.length}) &middot; {formatCurrency(totalCompleted, 'usd')} received
          </span>
        </div>
        <Button
          size="sm"
          className="gap-1.5"
          onClick={() => setShowForm((prev) => !prev)}
        >
          <Plus className="h-4 w-4" />
          Record Payment
        </Button>
      </div>

      {/* New payment form */}
      {showForm && (
        <Card>
          <CardContent className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="pay-amount">Amount (USD) *</Label>
              <Input
                id="pay-amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="500.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pay-status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="pay-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pay-desc">Description</Label>
              <Textarea
                id="pay-desc"
                placeholder="Payment description..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="resize-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowForm(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => void handleCreate()}
                disabled={saving}
                className="gap-1.5"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payments list */}
      {payments.length === 0 && !showForm ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <DollarSign className="mx-auto mb-3 h-10 w-10 opacity-30" />
            <p>No payments recorded yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {payments.map((payment) => (
            <div
              key={payment.id}
              className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                {statusIcon(payment.status)}
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {formatCurrency(payment.amount, payment.currency)}
                    {!payment.seen && (
                      <span className="ml-2 inline-block h-2 w-2 rounded-full bg-blue-500" />
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {payment.description ?? payment.status}
                    {' \u00B7 '}
                    {format(new Date(payment.created_at), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {!payment.seen && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => void markSeen(payment.id)}
                    title="Mark as seen"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                )}

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete payment?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently remove this payment record. This
                        action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => void handleDelete(payment.id)}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
