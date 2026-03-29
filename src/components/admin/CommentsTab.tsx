import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
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
import { MessageSquare, Loader2, Trash2, Send } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Comment {
  id: string;
  project_id: string;
  user_id: string;
  author_name: string | null;
  content: string;
  created_at: string;
}

interface CommentsTabProps {
  projectId: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CommentsTab({ projectId }: CommentsTabProps) {
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // -----------------------------------------------------------------------
  // Fetch comments
  // -----------------------------------------------------------------------

  const fetchComments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments((data as Comment[] | null) ?? []);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to load comments';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [projectId, toast]);

  useEffect(() => {
    void fetchComments();
  }, [fetchComments]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`comments-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          void fetchComments();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId, fetchComments]);

  // -----------------------------------------------------------------------
  // Add comment
  // -----------------------------------------------------------------------

  const handleSubmit = async () => {
    const trimmed = newComment.trim();
    if (trimmed === '' || user === null) return;

    setSubmitting(true);
    try {
      const authorName = profile?.full_name ?? user.email ?? 'Vision Software Team';

      const { error } = await supabase.from('comments').insert({
        project_id: projectId,
        user_id: user.id,
        author_name: authorName,
        content: trimmed,
      });

      if (error) throw error;

      setNewComment('');
      toast({ title: 'Comment added' });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to add comment';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // -----------------------------------------------------------------------
  // Delete comment
  // -----------------------------------------------------------------------

  const handleDelete = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      setComments((prev) => prev.filter((c) => c.id !== commentId));
      toast({ title: 'Comment deleted' });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to delete comment';
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
      <div className="flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Comments</h3>
        <span className="text-sm text-muted-foreground">({comments.length})</span>
      </div>

      {/* Comment list */}
      {comments.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No comments yet. Start the conversation below.
        </p>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => {
            const isOwn = user !== null && comment.user_id === user.id;
            return (
              <div
                key={comment.id}
                className="rounded-lg border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {comment.author_name ?? 'Vision Software Team'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(comment.created_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>

                  {isOwn && (
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
                          <AlertDialogTitle>Delete comment?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => void handleDelete(comment.id)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>

                <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/90">
                  {comment.content}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* New comment form */}
      <div className="space-y-3 rounded-lg border border-border bg-card p-4">
        <Textarea
          placeholder="Write a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          rows={3}
          className="resize-none"
        />
        <div className="flex justify-end">
          <Button
            onClick={() => void handleSubmit()}
            disabled={submitting || newComment.trim() === ''}
            size="sm"
            className="gap-1.5"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {submitting ? 'Sending...' : 'Send'}
          </Button>
        </div>
      </div>
    </div>
  );
}
