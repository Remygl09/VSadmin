import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
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
import { CalendarDays, Loader2, Plus, Trash2 } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MeetingNote {
  id: string;
  project_id: string;
  title: string;
  content: string;
  meeting_date: string;
  created_at: string;
}

interface MeetingNotesProps {
  projectId: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MeetingNotes({ projectId }: MeetingNotesProps) {
  const { toast } = useToast();

  const [notes, setNotes] = useState<MeetingNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [meetingDate, setMeetingDate] = useState(
    format(new Date(), 'yyyy-MM-dd'),
  );

  // -----------------------------------------------------------------------
  // Fetch
  // -----------------------------------------------------------------------

  const fetchNotes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('meeting_notes')
        .select('*')
        .eq('project_id', projectId)
        .order('meeting_date', { ascending: false });

      if (error) throw error;
      setNotes((data as MeetingNote[] | null) ?? []);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to load meeting notes';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [projectId, toast]);

  useEffect(() => {
    void fetchNotes();
  }, [fetchNotes]);

  // -----------------------------------------------------------------------
  // Create
  // -----------------------------------------------------------------------

  const handleCreate = async () => {
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (trimmedTitle === '') {
      toast({ title: 'Title is required', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('meeting_notes').insert({
        project_id: projectId,
        title: trimmedTitle,
        content: trimmedContent,
        meeting_date: meetingDate,
      });

      if (error) throw error;

      toast({ title: 'Meeting note added' });
      setTitle('');
      setContent('');
      setMeetingDate(format(new Date(), 'yyyy-MM-dd'));
      setShowForm(false);
      void fetchNotes();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to save meeting note';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // -----------------------------------------------------------------------
  // Delete
  // -----------------------------------------------------------------------

  const handleDelete = async (noteId: string) => {
    try {
      const { error } = await supabase
        .from('meeting_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;

      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      toast({ title: 'Meeting note deleted' });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to delete meeting note';
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
          <CalendarDays className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Meeting Notes</h3>
          <span className="text-sm text-muted-foreground">({notes.length})</span>
        </div>
        <Button
          size="sm"
          className="gap-1.5"
          onClick={() => setShowForm((prev) => !prev)}
        >
          <Plus className="h-4 w-4" />
          Add Note
        </Button>
      </div>

      {/* New note form */}
      {showForm && (
        <Card>
          <CardContent className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="note-title">Title *</Label>
              <Input
                id="note-title"
                placeholder="Weekly check-in"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="note-date">Meeting Date</Label>
              <Input
                id="note-date"
                type="date"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="note-content">Notes</Label>
              <Textarea
                id="note-content"
                placeholder="Meeting notes..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={5}
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

      {/* Notes list */}
      {notes.length === 0 && !showForm ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <CalendarDays className="mx-auto mb-3 h-10 w-10 opacity-30" />
            <p>No meeting notes yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div
              key={note.id}
              className="rounded-lg border border-border bg-card p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-sm">{note.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(note.meeting_date), 'MMM d, yyyy')}
                  </p>
                </div>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete meeting note?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => void handleDelete(note.id)}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              {note.content !== '' && (
                <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/90">
                  {note.content}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
