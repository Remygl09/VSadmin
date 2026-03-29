import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import {
  ArrowLeft,
  Building2,
  Calendar,
  CreditCard,
  DollarSign,
  ExternalLink,
  FileText,
  Globe,
  Loader2,
  Mic,
  MessageSquare,
  Brain,
  Save,
  Trash2,
  Upload,
  User,
  Archive,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import AIEngineTab from '@/components/admin/AIEngineTab';
import CommentsTab from '@/components/admin/CommentsTab';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Status =
  | 'prospect'
  | 'in_proposal'
  | 'in_assessment'
  | 'in_build'
  | 'in_beta'
  | 'launched';

interface ProjectRow {
  id: string;
  company_name: string;
  founder_name: string;
  name: string;
  status: string;
  contract_end: string | null;
  tags: unknown;
  total_amount: number | null;
  is_archived: boolean;
  founder_id: string | null;
  current_phase: number;
  industry: string | null;
  notes: string | null;
  stripe_customer_id: string | null;
  stripe_account_id: string | null;
  mrr_amount: number | null;
  voice_form_token: string | null;
  created_at: string;
  updated_at: string;
}

interface VoiceResponse {
  id: string;
  project_id: string;
  question: string;
  audio_url: string | null;
  transcript: string | null;
  created_at: string;
}

interface PaymentRow {
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

const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: 'prospect', label: 'Prospect' },
  { value: 'in_proposal', label: 'In Proposal' },
  { value: 'in_assessment', label: 'In Assessment' },
  { value: 'in_build', label: 'In Build' },
  { value: 'in_beta', label: 'In Beta' },
  { value: 'launched', label: 'Launched' },
];

const STATUS_LABELS: Record<string, string> = {
  prospect: 'Prospect',
  in_proposal: 'In Proposal',
  in_assessment: 'In Assessment',
  in_build: 'In Build',
  in_beta: 'In Beta',
  launched: 'Launched',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function safeDate(value: string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  try {
    return format(parseISO(value), 'MMM d, yyyy');
  } catch {
    return '';
  }
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function AdminClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [project, setProject] = useState<ProjectRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  // Editable fields
  const [companyName, setCompanyName] = useState('');
  const [founderName, setFounderName] = useState('');
  const [projectName, setProjectName] = useState('');
  const [status, setStatus] = useState<Status>('prospect');
  const [industry, setIndustry] = useState('');
  const [notes, setNotes] = useState('');
  const [contractEnd, setContractEnd] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [mrrAmount, setMrrAmount] = useState('');
  const [currentPhase, setCurrentPhase] = useState('0');
  const [stripeCustomerId, setStripeCustomerId] = useState('');
  const [stripeAccountId, setStripeAccountId] = useState('');

  // Sub-tab data
  const [voiceResponses, setVoiceResponses] = useState<VoiceResponse[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);

  // -------------------------------------------------------------------------
  // Data fetching
  // -------------------------------------------------------------------------

  const fetchProject = useCallback(async () => {
    if (id === undefined || id === '') return;

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (data === null) {
        toast({ title: 'Not found', description: 'Project not found.', variant: 'destructive' });
        navigate('/admin/dashboard');
        return;
      }

      const row = data as ProjectRow;
      setProject(row);
      setCompanyName(row.company_name);
      setFounderName(row.founder_name);
      setProjectName(row.name ?? '');
      setStatus((row.status as Status) ?? 'prospect');
      setIndustry(row.industry ?? '');
      setNotes(row.notes ?? '');
      setContractEnd(row.contract_end ?? '');
      setTotalAmount(row.total_amount !== null ? String(row.total_amount) : '');
      setMrrAmount(row.mrr_amount !== null ? String(row.mrr_amount) : '');
      setCurrentPhase(String(row.current_phase ?? 0));
      setStripeCustomerId(row.stripe_customer_id ?? '');
      setStripeAccountId(row.stripe_account_id ?? '');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load project';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [id, toast, navigate]);

  const fetchVoiceResponses = useCallback(async () => {
    if (id === undefined || id === '') return;

    const { data, error } = await supabase
      .from('voice_responses')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: false });

    if (!error && data !== null) {
      setVoiceResponses(data as VoiceResponse[]);
    }
  }, [id]);

  const fetchPayments = useCallback(async () => {
    if (id === undefined || id === '') return;

    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: false });

    if (!error && data !== null) {
      setPayments(data as PaymentRow[]);
    }
  }, [id]);

  useEffect(() => {
    void fetchProject();
    void fetchVoiceResponses();
    void fetchPayments();
  }, [fetchProject, fetchVoiceResponses, fetchPayments]);

  // -------------------------------------------------------------------------
  // Save profile
  // -------------------------------------------------------------------------

  const handleSave = async () => {
    if (id === undefined || id === '') return;

    setSaving(true);
    try {
      const updates: Record<string, unknown> = {
        company_name: companyName.trim(),
        founder_name: founderName.trim(),
        name: projectName.trim() || companyName.trim(),
        status,
        industry: industry.trim() || null,
        notes: notes.trim() || null,
        contract_end: contractEnd || null,
        total_amount: totalAmount !== '' ? Number(totalAmount) : null,
        mrr_amount: mrrAmount !== '' ? Number(mrrAmount) : null,
        current_phase: Number(currentPhase) || 0,
        stripe_customer_id: stripeCustomerId.trim() || null,
        stripe_account_id: stripeAccountId.trim() || null,
      };

      const { error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Saved', description: 'Project details updated.' });
      void fetchProject();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // -------------------------------------------------------------------------
  // Archive project
  // -------------------------------------------------------------------------

  const handleArchive = async () => {
    if (id === undefined || id === '') return;

    try {
      const { error } = await supabase
        .from('projects')
        .update({ is_archived: true })
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Archived', description: 'Client has been archived.' });
      navigate('/admin/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to archive';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  // -------------------------------------------------------------------------
  // Generate voice form link
  // -------------------------------------------------------------------------

  const handleGenerateVoiceToken = async () => {
    if (id === undefined || id === '') return;

    try {
      const token = crypto.randomUUID();
      const { error } = await supabase
        .from('projects')
        .update({ voice_form_token: token })
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Voice form link generated' });
      void fetchProject();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate token';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (project === null) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Project not found.</p>
        <Button variant="outline" onClick={() => navigate('/admin/dashboard')}>
          Back to Pipeline
        </Button>
      </div>
    );
  }

  const voiceFormUrl =
    project.voice_form_token !== null && project.voice_form_token !== ''
      ? `${window.location.origin}/forms/${project.voice_form_token}`
      : null;

  const paymentTotal = payments.reduce((sum, p) => sum + (p.amount ?? 0), 0);

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/admin/dashboard')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">
              {project.company_name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {project.founder_name}
              {project.industry !== null && project.industry !== ''
                ? ` \u00B7 ${project.industry}`
                : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="border-primary/30 bg-primary/10 text-primary"
          >
            {STATUS_LABELS[project.status] ?? project.status}
          </Badge>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground">
                <Archive className="h-4 w-4" />
                Archive
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Archive this client?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will move {project.company_name} to the archived list. You
                  can unarchive it later.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => void handleArchive()}>
                  Archive
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Separator />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="profile" className="gap-1.5">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="project" className="gap-1.5">
            <Building2 className="h-4 w-4" />
            Project
          </TabsTrigger>
          <TabsTrigger value="assets" className="gap-1.5">
            <Upload className="h-4 w-4" />
            Assets
          </TabsTrigger>
          <TabsTrigger value="voice-forms" className="gap-1.5">
            <Mic className="h-4 w-4" />
            Voice Forms
          </TabsTrigger>
          <TabsTrigger value="ai-engine" className="gap-1.5">
            <Brain className="h-4 w-4" />
            AI Engine
          </TabsTrigger>
          <TabsTrigger value="comments" className="gap-1.5">
            <MessageSquare className="h-4 w-4" />
            Comments
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-1.5">
            <CreditCard className="h-4 w-4" />
            Payments
          </TabsTrigger>
        </TabsList>

        {/* ---- Profile Tab ---- */}
        <TabsContent value="profile" className="space-y-6 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Client Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="company-name">Company Name</Label>
                <Input
                  id="company-name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="founder-name">Founder Name</Label>
                <Input
                  id="founder-name"
                  value={founderName}
                  onChange={(e) => setFounderName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="industry">Industry</Label>
                <Input
                  id="industry"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="e.g. SaaS, Fintech, Healthcare"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={(val) => setStatus(val as Status)}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className="resize-none"
                  placeholder="Internal notes about this client..."
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              onClick={() => void handleSave()}
              disabled={saving}
              className="gap-1.5"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </TabsContent>

        {/* ---- Project Tab ---- */}
        <TabsContent value="project" className="space-y-6 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Project Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="project-name">Project Name</Label>
                <Input
                  id="project-name"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder={companyName || 'Project name'}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="current-phase">Current Phase</Label>
                <Input
                  id="current-phase"
                  type="number"
                  min="0"
                  value={currentPhase}
                  onChange={(e) => setCurrentPhase(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="contract-end">Contract End</Label>
                <Input
                  id="contract-end"
                  type="date"
                  value={contractEnd}
                  onChange={(e) => setContractEnd(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="total-amount">Total Amount ($)</Label>
                <Input
                  id="total-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="mrr-amount">MRR Amount ($)</Label>
                <Input
                  id="mrr-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={mrrAmount}
                  onChange={(e) => setMrrAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Stripe Integration</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="stripe-customer">Stripe Customer ID</Label>
                <Input
                  id="stripe-customer"
                  value={stripeCustomerId}
                  onChange={(e) => setStripeCustomerId(e.target.value)}
                  placeholder="cus_..."
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="stripe-account">Stripe Account ID</Label>
                <Input
                  id="stripe-account"
                  value={stripeAccountId}
                  onChange={(e) => setStripeAccountId(e.target.value)}
                  placeholder="acct_..."
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              onClick={() => void handleSave()}
              disabled={saving}
              className="gap-1.5"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </TabsContent>

        {/* ---- Assets Tab ---- */}
        <TabsContent value="assets" className="space-y-6 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Upload className="h-5 w-5 text-primary" />
                Project Assets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border py-16 text-center">
                <Upload className="mb-3 h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  Asset management coming soon.
                </p>
                <p className="text-xs text-muted-foreground/60">
                  Upload logos, brand guidelines, wireframes, and other project files.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- Voice Forms Tab ---- */}
        <TabsContent value="voice-forms" className="space-y-6 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Mic className="h-5 w-5 text-primary" />
                Voice Form Link
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {voiceFormUrl !== null ? (
                <div className="flex items-center gap-2">
                  <Input value={voiceFormUrl} readOnly className="flex-1 font-mono text-xs" />
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 shrink-0"
                    onClick={() => {
                      void navigator.clipboard.writeText(voiceFormUrl);
                      toast({ title: 'Copied to clipboard' });
                    }}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Copy
                  </Button>
                </div>
              ) : (
                <div className="text-center">
                  <p className="mb-3 text-sm text-muted-foreground">
                    No voice form link has been generated yet.
                  </p>
                  <Button
                    onClick={() => void handleGenerateVoiceToken()}
                    size="sm"
                    className="gap-1.5"
                  >
                    <Globe className="h-4 w-4" />
                    Generate Link
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Voice responses */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Voice Responses ({voiceResponses.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {voiceResponses.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No voice responses received yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {voiceResponses.map((vr) => (
                    <div
                      key={vr.id}
                      className="rounded-lg border border-border p-4"
                    >
                      <p className="text-sm font-medium text-foreground">
                        {vr.question}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {safeDate(vr.created_at)}
                      </p>
                      {vr.transcript !== null && vr.transcript !== '' && (
                        <p className="mt-2 text-sm text-foreground/80">
                          {vr.transcript}
                        </p>
                      )}
                      {vr.audio_url !== null && vr.audio_url !== '' && (
                        <audio
                          controls
                          className="mt-2 w-full"
                          src={vr.audio_url}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- AI Engine Tab ---- */}
        <TabsContent value="ai-engine" className="pt-4">
          <AIEngineTab projectId={id ?? ''} />
        </TabsContent>

        {/* ---- Comments Tab ---- */}
        <TabsContent value="comments" className="pt-4">
          <CommentsTab projectId={id ?? ''} />
        </TabsContent>

        {/* ---- Payments Tab ---- */}
        <TabsContent value="payments" className="space-y-6 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Payments</h3>
              <span className="text-sm text-muted-foreground">
                ({payments.length})
              </span>
            </div>
            {paymentTotal > 0 && (
              <span className="text-sm font-medium text-foreground">
                Total: {formatCurrency(paymentTotal)}
              </span>
            )}
          </div>

          {payments.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <DollarSign className="mx-auto mb-3 h-10 w-10 opacity-30" />
                <p>No payments recorded for this client.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-muted-foreground">Date</TableHead>
                      <TableHead className="text-muted-foreground">Description</TableHead>
                      <TableHead className="text-muted-foreground">Status</TableHead>
                      <TableHead className="text-right text-muted-foreground">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id} className="border-border">
                        <TableCell className="text-sm text-muted-foreground">
                          {safeDate(payment.created_at)}
                        </TableCell>
                        <TableCell className="text-sm text-foreground">
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
                          {formatCurrency(payment.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
