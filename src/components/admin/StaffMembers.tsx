import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Users, Loader2, Plus, Trash2, Mail } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StaffMember {
  id: string;
  project_id: string;
  name: string;
  email: string | null;
  role: string;
  created_at: string;
}

interface StaffMembersProps {
  projectId: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StaffMembers({ projectId }: StaffMembersProps) {
  const { toast } = useToast();

  const [members, setMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('developer');

  // -----------------------------------------------------------------------
  // Fetch
  // -----------------------------------------------------------------------

  const fetchMembers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('staff_members')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMembers((data as StaffMember[] | null) ?? []);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to load staff members';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [projectId, toast]);

  useEffect(() => {
    void fetchMembers();
  }, [fetchMembers]);

  // -----------------------------------------------------------------------
  // Create
  // -----------------------------------------------------------------------

  const handleCreate = async () => {
    const trimmedName = name.trim();
    if (trimmedName === '') {
      toast({ title: 'Name is required', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('staff_members').insert({
        project_id: projectId,
        name: trimmedName,
        email: email.trim() || null,
        role,
      });

      if (error) throw error;

      toast({ title: 'Staff member added' });
      setName('');
      setEmail('');
      setRole('developer');
      setShowForm(false);
      void fetchMembers();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to add staff member';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // -----------------------------------------------------------------------
  // Delete
  // -----------------------------------------------------------------------

  const handleDelete = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('staff_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      toast({ title: 'Staff member removed' });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to remove staff member';
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Staff Members</h3>
          <span className="text-sm text-muted-foreground">({members.length})</span>
        </div>
        <Button
          size="sm"
          className="gap-1.5"
          onClick={() => setShowForm((prev) => !prev)}
        >
          <Plus className="h-4 w-4" />
          Add Member
        </Button>
      </div>

      {/* New member form */}
      {showForm && (
        <Card>
          <CardContent className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="staff-name">Name *</Label>
              <Input
                id="staff-name"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="staff-email">Email</Label>
              <Input
                id="staff-email"
                type="email"
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="staff-role">Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger id="staff-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="developer">Developer</SelectItem>
                  <SelectItem value="designer">Designer</SelectItem>
                  <SelectItem value="project_manager">Project Manager</SelectItem>
                  <SelectItem value="qa">QA</SelectItem>
                  <SelectItem value="devops">DevOps</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
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
                {saving ? 'Saving...' : 'Add'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Members list */}
      {members.length === 0 && !showForm ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Users className="mx-auto mb-3 h-10 w-10 opacity-30" />
            <p>No staff members assigned yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">{member.name}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="capitalize">{member.role.replace('_', ' ')}</span>
                  {member.email !== null && member.email !== '' && (
                    <>
                      <span>&middot;</span>
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {member.email}
                      </span>
                    </>
                  )}
                </div>
              </div>

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
                    <AlertDialogTitle>Remove staff member?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove {member.name} from the project.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => void handleDelete(member.id)}
                    >
                      Remove
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
