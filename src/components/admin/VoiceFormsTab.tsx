import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Copy, Loader2, Mic, Pencil, Plus, Check } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const RESPONDENT_TYPES = ['Founder', 'Employee', 'Customer'] as const;

const RESPONDENT_COLORS: Record<string, string> = {
  Founder: 'bg-primary/15 text-primary',
  Employee: 'bg-blue-500/15 text-blue-400',
  Customer: 'bg-purple-500/15 text-purple-400',
};

interface VoiceForm {
  id: string;
  title: string;
  respondent_type: string;
  share_token: string;
  is_open: boolean | null;
  created_at: string | null;
}

interface VoiceResponse {
  id: string;
  form_id: string | null;
  respondent_name: string | null;
  respondent_email: string | null;
  audio_url: string | null;
  transcript: string | null;
  transcript_edited: boolean | null;
  submitted_at: string | null;
}

interface VoiceFormsTabProps {
  projectId: string;
}

export default function VoiceFormsTab({ projectId }: VoiceFormsTabProps) {
  const [forms, setForms] = useState<VoiceForm[]>([]);
  const [responses, setResponses] = useState<Record<string, VoiceResponse[]>>({});
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState('');
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingTranscript, setEditingTranscript] = useState<string | null>(null);
  const [transcriptText, setTranscriptText] = useState('');
  const [savingTranscript, setSavingTranscript] = useState(false);
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    const { data: formsData, error } = await supabase
      .from('voice_forms')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Error loading forms', description: error.message, variant: 'destructive' });
      setLoading(false);
      return;
    }

    const fetchedForms = (formsData ?? []) as VoiceForm[];
    setForms(fetchedForms);

    const formIds = fetchedForms.map(f => f.id);
    if (formIds.length > 0) {
      const { data: respData } = await supabase
        .from('voice_responses')
        .select('*')
        .in('form_id', formIds)
        .order('submitted_at', { ascending: false });

      const grouped: Record<string, VoiceResponse[]> = {};
      ((respData ?? []) as VoiceResponse[]).forEach(r => {
        const fid = r.form_id ?? '';
        if (!grouped[fid]) grouped[fid] = [];
        grouped[fid]!.push(r);
      });
      setResponses(grouped);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [projectId]); // eslint-disable-line

  const handleCreate = async () => {
    if (!formTitle.trim() || !formType) {
      toast({ title: 'Please fill all required fields', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('voice_forms').insert({
      project_id: projectId,
      title: formTitle.trim(),
      respondent_type: formType,
    });
    if (error) {
      toast({ title: 'Creation failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Voice form created' });
      setModalOpen(false);
      setFormTitle('');
      setFormType('');
      fetchData();
    }
    setSaving(false);
  };

  const toggleOpen = async (formId: string, currentOpen: boolean) => {
    const { error } = await supabase.from('voice_forms').update({ is_open: !currentOpen }).eq('id', formId);
    if (error) {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    } else {
      setForms(prev => prev.map(f => f.id === formId ? { ...f, is_open: !currentOpen } : f));
    }
  };

  const copyLink = async (token: string, formId: string) => {
    const url = `${window.location.origin}/forms/${token}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(formId);
    toast({ title: 'Link copied to clipboard' });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const startEditTranscript = (resp: VoiceResponse) => {
    setEditingTranscript(resp.id);
    setTranscriptText(resp.transcript ?? '');
  };

  const saveTranscript = async (respId: string) => {
    setSavingTranscript(true);
    const { error } = await supabase.from('voice_responses').update({
      transcript: transcriptText,
      transcript_edited: true,
    }).eq('id', respId);
    if (error) {
      toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Transcript updated' });
      setEditingTranscript(null);
      fetchData();
    }
    setSavingTranscript(false);
  };

  const getAudioUrl = (audioPath: string | null) => {
    if (!audioPath) return null;
    const { data } = supabase.storage.from('voice-recordings').getPublicUrl(audioPath);
    return data?.publicUrl ?? null;
  };

  return (
    <div className="space-y-6 pt-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold text-foreground">Voice Forms</h3>
        <Button size="sm" onClick={() => setModalOpen(true)} className="gap-1.5 font-display">
          <Plus className="h-4 w-4" /> Create Voice Form
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : forms.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <Mic className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No voice forms yet.</p>
          <Button size="sm" variant="outline" onClick={() => setModalOpen(true)} className="font-display gap-1.5">
            <Plus className="h-4 w-4" /> Create your first form
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {forms.map(form => {
            const formResponses = responses[form.id] ?? [];

            return (
              <div key={form.id} className="rounded-lg border border-border bg-card overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <div className="flex items-center gap-3">
                    <Mic className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{form.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium', RESPONDENT_COLORS[form.respondent_type] ?? 'bg-secondary text-muted-foreground')}>
                          {form.respondent_type}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {formResponses.length} response{formResponses.length !== 1 ? 's' : ''}
                        </span>
                        {form.created_at && (
                          <span className="text-[10px] text-muted-foreground">
                            Created {format(new Date(form.created_at), 'MMM d, yyyy')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyLink(form.share_token, form.id)}
                      className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                      {copiedId === form.id ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiedId === form.id ? 'Copied' : 'Copy Link'}
                    </Button>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">{form.is_open ? 'Open' : 'Closed'}</span>
                      <Switch
                        checked={form.is_open ?? true}
                        onCheckedChange={() => toggleOpen(form.id, form.is_open ?? true)}
                      />
                    </div>
                  </div>
                </div>

                {formResponses.length === 0 ? (
                  <div className="px-4 py-6 text-center">
                    <p className="text-xs text-muted-foreground">No responses yet.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {formResponses.map(resp => {
                      const audioUrl = getAudioUrl(resp.audio_url);
                      const isEditing = editingTranscript === resp.id;

                      return (
                        <div key={resp.id} className="px-4 py-4 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {resp.respondent_name || 'Anonymous'}
                              </p>
                              {resp.respondent_email && (
                                <p className="text-xs text-muted-foreground">{resp.respondent_email}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium', RESPONDENT_COLORS[form.respondent_type] ?? 'bg-secondary text-muted-foreground')}>
                                {form.respondent_type}
                              </span>
                              {resp.submitted_at && (
                                <span className="text-[10px] text-muted-foreground">
                                  {format(new Date(resp.submitted_at), 'MMM d, h:mm a')}
                                </span>
                              )}
                            </div>
                          </div>

                          {audioUrl && (
                            <audio controls className="w-full h-10" preload="metadata">
                              <source src={audioUrl} type="audio/webm" />
                            </audio>
                          )}

                          <div className="space-y-1">
                            {isEditing ? (
                              <div className="space-y-2">
                                <Textarea
                                  value={transcriptText}
                                  onChange={e => setTranscriptText(e.target.value)}
                                  rows={4}
                                  className="bg-surface border-border resize-none text-sm"
                                />
                                <div className="flex gap-2">
                                  <Button size="sm" onClick={() => saveTranscript(resp.id)} disabled={savingTranscript} className="font-display">
                                    {savingTranscript ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save'}
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => setEditingTranscript(null)} className="font-display">Cancel</Button>
                                </div>
                              </div>
                            ) : (
                              <div>
                                {resp.transcript === null ? (
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    Transcription pending...
                                  </div>
                                ) : (
                                  <div className="space-y-1">
                                    {resp.transcript_edited && (
                                      <Badge variant="outline" className="text-[10px] h-5">Edited</Badge>
                                    )}
                                    <p className="text-sm text-foreground/80 whitespace-pre-wrap">{resp.transcript}</p>
                                    <Button variant="ghost" size="sm" onClick={() => startEditTranscript(resp)} className="gap-1 text-xs text-muted-foreground hover:text-foreground -ml-2">
                                      <Pencil className="h-3 w-3" /> Edit Transcript
                                    </Button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Create Voice Form</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="e.g. Founder Interview" className="bg-surface border-border" />
            </div>
            <div className="space-y-2">
              <Label>Respondent Type *</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger className="bg-surface border-border"><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {RESPONDENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCreate} disabled={saving} className="font-display">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Form'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
