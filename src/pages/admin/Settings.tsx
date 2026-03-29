import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Settings as SettingsIcon,
  User,
  Shield,
  Loader2,
  Save,
  Key,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminSettings() {
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const [fullName, setFullName] = useState('');
  const [saving, setSaving] = useState(false);

  // Password change
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (profile !== null) {
      setFullName(profile.full_name ?? '');
    }
  }, [profile]);

  // -------------------------------------------------------------------------
  // Save profile
  // -------------------------------------------------------------------------

  const handleSaveProfile = async () => {
    if (user === null) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim() || null })
        .eq('id', user.id);

      if (error) throw error;

      toast({ title: 'Profile updated', description: 'Your display name has been saved.' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update profile';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // -------------------------------------------------------------------------
  // Change password
  // -------------------------------------------------------------------------

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast({
        title: 'Validation error',
        description: 'Password must be at least 6 characters.',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Validation error',
        description: 'Passwords do not match.',
        variant: 'destructive',
      });
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) throw error;

      toast({ title: 'Password updated', description: 'Your password has been changed.' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to change password';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setChangingPassword(false);
    }
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-6">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold font-display text-foreground">
          <SettingsIcon className="h-6 w-6 text-primary" />
          Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your Vision Software admin account.
        </p>
      </div>

      <Separator />

      {/* Profile card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-5 w-5 text-primary" />
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={user?.email ?? ''}
              disabled
              className="text-muted-foreground"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="full-name">Display Name</Label>
            <Input
              id="full-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <div className="grid gap-2">
            <Label>Role</Label>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium capitalize text-foreground">
                {profile?.role ?? 'admin'}
              </span>
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button
              onClick={() => void handleSaveProfile()}
              disabled={saving}
              size="sm"
              className="gap-1.5"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? 'Saving...' : 'Save Profile'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Change password card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Key className="h-5 w-5 text-primary" />
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 6 characters"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
            />
          </div>
          <div className="flex justify-end pt-2">
            <Button
              onClick={() => void handleChangePassword()}
              disabled={changingPassword || newPassword === ''}
              size="sm"
              variant="outline"
              className="gap-1.5"
            >
              {changingPassword ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Key className="h-4 w-4" />
              )}
              {changingPassword ? 'Updating...' : 'Update Password'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* App info */}
      <Card>
        <CardContent className="py-4">
          <p className="text-center text-xs text-muted-foreground">
            Vision Software Admin &middot; v1.0.0
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
