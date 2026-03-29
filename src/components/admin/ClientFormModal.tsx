import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatPhoneNumber } from '@/lib/formatPhone';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, UserPlus } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ClientFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface FormData {
  companyName: string;
  founderName: string;
  email: string;
  phone: string;
  notes: string;
}

const INITIAL_FORM: FormData = {
  companyName: '',
  founderName: '',
  email: '',
  phone: '',
  notes: '',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ClientFormModal({
  open,
  onOpenChange,
  onSuccess,
}: ClientFormModalProps) {
  const { toast } = useToast();

  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setForm(INITIAL_FORM);
  };

  // -----------------------------------------------------------------------
  // Submit
  // -----------------------------------------------------------------------

  const handleSubmit = async () => {
    const trimmedCompany = form.companyName.trim();
    const trimmedFounder = form.founderName.trim();

    if (trimmedCompany === '') {
      toast({
        title: 'Validation error',
        description: 'Company name is required.',
        variant: 'destructive',
      });
      return;
    }

    if (trimmedFounder === '') {
      toast({
        title: 'Validation error',
        description: 'Founder name is required.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('projects').insert({
        company_name: trimmedCompany,
        founder_name: trimmedFounder,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        notes: form.notes.trim() || null,
        status: 'prospect',
      });

      if (error) throw error;

      toast({ title: 'Client created', description: `${trimmedCompany} has been added.` });
      resetForm();
      onSuccess();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to create client';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) resetForm();
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            New Client
          </DialogTitle>
          <DialogDescription>
            Add a new client to the Vision Software pipeline.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Company name */}
          <div className="grid gap-2">
            <Label htmlFor="company-name">Company Name *</Label>
            <Input
              id="company-name"
              placeholder="Acme Inc."
              value={form.companyName}
              onChange={(e) => updateField('companyName', e.target.value)}
            />
          </div>

          {/* Founder name */}
          <div className="grid gap-2">
            <Label htmlFor="founder-name">Founder Name *</Label>
            <Input
              id="founder-name"
              placeholder="Jane Doe"
              value={form.founderName}
              onChange={(e) => updateField('founderName', e.target.value)}
            />
          </div>

          {/* Email */}
          <div className="grid gap-2">
            <Label htmlFor="client-email">Email</Label>
            <Input
              id="client-email"
              type="email"
              placeholder="jane@acme.com"
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
            />
          </div>

          {/* Phone */}
          <div className="grid gap-2">
            <Label htmlFor="client-phone">Phone</Label>
            <Input
              id="client-phone"
              type="tel"
              placeholder="646-315-2195"
              value={form.phone}
              onChange={(e) =>
                updateField('phone', formatPhoneNumber(e.target.value))
              }
            />
          </div>

          {/* Notes */}
          <div className="grid gap-2">
            <Label htmlFor="client-notes">Notes</Label>
            <Textarea
              id="client-notes"
              placeholder="Any initial notes about this client..."
              value={form.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            disabled={saving}
            className="gap-1.5"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            {saving ? 'Creating...' : 'Create Client'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
