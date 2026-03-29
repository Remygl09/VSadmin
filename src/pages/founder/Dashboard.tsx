import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Check, Loader2, Send, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Phase {
  name: string;
  description: string;
}

interface Project {
  id: string;
  name: string;
  current_phase: number;
  created_at: string;
}

interface Outline {
  id: string;
  content: string;
  approved_at: string | null;
  created_at: string;
}

interface Comment {
  id: string;
  project_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles: {
    full_name: string | null;
    role: 'admin' | 'founder';
  } | null;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const PHASES: Phase[] = [
  { name: 'One-on-One Call', description: "We've completed your initial discovery call." },
  { name: 'Admin Input', description: 'Our team is reviewing your project details.' },
  { name: 'Founder Notes', description: "We're waiting for your input and materials." },
  { name: 'Voice Forms', description: "We're collecting voice responses from you and your team." },
  { name: 'AI Outline', description: "We're building your custom website outline using AI." },
  { name: 'Review', description: 'Your outline is ready for review and approval.' },
  { name: 'In Build', description: 'Your website is actively being built by our team.' },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function FounderDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [project, setProject] = useState<Project | null>(null);
  const [outline, setOutline] = useState<Outline | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  /* ---- data fetching ---- */

  const fetchProject = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('projects')
      .select('id, name, current_phase, created_at')
      .eq('founder_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      toast({ title: 'Error', description: 'Failed to load project.', variant: 'destructive' });
      return null;
    }
    return data as Project | null;
  }, [toast]);

  const fetchOutline = useCallback(async (projectId: string) => {
    const { data } = await supabase
      .from('outlines')
      .select('id, content, approved_at, created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    setOutline((data as Outline | null) ?? null);
  }, []);

  const fetchComments = useCallback(async (projectId: string) => {
    const { data } = await supabase
      .from('comments')
      .select('id, project_id, user_id, content, created_at, profiles(full_name, role)')
      .eq('project_id', projectId)
      .is('parent_id', null)
      .order('created_at', { ascending: true });

    setComments((data as Comment[] | null) ?? []);
  }, []);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      const proj = await fetchProject(user.id);
      if (cancelled) return;

      if (proj) {
        setProject(proj);
        await Promise.all([fetchOutline(proj.id), fetchComments(proj.id)]);
      }
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user, fetchProject, fetchOutline, fetchComments]);

  /* ---- realtime comments ---- */

  useEffect(() => {
    if (!project) return;

    const channel = supabase
      .channel(`comments:${project.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comments', filter: `project_id=eq.${project.id}` },
        () => {
          fetchComments(project.id);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [project, fetchComments]);

  /* ---- actions ---- */

  const handlePostComment = async () => {
    if (!user || !project || !newComment.trim()) return;

    setSubmitting(true);
    const { error } = await supabase.from('comments').insert({
      project_id: project.id,
      user_id: user.id,
      content: newComment.trim(),
    });

    if (error) {
      toast({ title: 'Error', description: 'Failed to post comment.', variant: 'destructive' });
    } else {
      setNewComment('');
      await fetchComments(project.id);
    }
    setSubmitting(false);
  };

  /* ---- loading state ---- */

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  /* ---- no project state ---- */

  if (!project) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <ShieldCheck className="h-12 w-12 text-primary" />
        <h2 className="text-2xl font-bold tracking-tight">Welcome to Vision Software</h2>
        <p className="max-w-md text-muted-foreground">
          We don&apos;t have a project linked to your account yet. Your Vision Software team will be
          in touch shortly.
        </p>
      </div>
    );
  }

  /* ---- helpers ---- */

  const currentPhaseIndex = project.current_phase; // 0-based

  function authorLabel(comment: Comment): string {
    if (comment.profiles?.role === 'admin') {
      return 'Vision Software Team';
    }
    return comment.profiles?.full_name ?? 'You';
  }

  /* ---- render ---- */

  return (
    <div className="mx-auto max-w-4xl space-y-10 px-6 py-10">
      {/* ---------- header ---------- */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Created {format(new Date(project.created_at), 'MMMM d, yyyy')}
        </p>
      </div>

      {/* ---------- timeline ---------- */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">Project Timeline</h2>

        <TooltipProvider delayDuration={200}>
          <div className="flex items-center gap-0">
            {PHASES.map((phase, idx) => {
              const isCompleted = idx < currentPhaseIndex;
              const isCurrent = idx === currentPhaseIndex;
              const isFuture = idx > currentPhaseIndex;

              return (
                <div key={phase.name} className="flex items-center">
                  {/* connector line (skip before first) */}
                  {idx > 0 && (
                    <div
                      className={cn(
                        'h-0.5 w-6 sm:w-10',
                        isCompleted ? 'bg-primary' : 'bg-border',
                      )}
                    />
                  )}

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-medium transition-colors',
                          isCompleted && 'bg-primary text-primary-foreground',
                          isCurrent && 'border-2 border-primary bg-primary/10 text-primary',
                          isFuture && 'border border-border bg-muted text-muted-foreground',
                        )}
                        aria-label={phase.name}
                      >
                        {isCompleted ? <Check className="h-4 w-4" /> : idx + 1}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[200px] text-center">
                      <p className="font-medium">{phase.name}</p>
                      <p className="text-xs text-muted-foreground">{phase.description}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              );
            })}
          </div>
        </TooltipProvider>
      </section>

      {/* ---------- current phase card ---------- */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Phase {currentPhaseIndex + 1}: {PHASES[currentPhaseIndex]?.name ?? 'Unknown'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {PHASES[currentPhaseIndex]?.description ?? ''}
          </p>
        </CardContent>
      </Card>

      {/* ---------- approved outline ---------- */}
      {outline && (
        <section>
          <h2 className="mb-4 text-lg font-semibold">Approved Outline</h2>
          <Card>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none pt-6">
              <ReactMarkdown>{outline.content}</ReactMarkdown>
            </CardContent>
            {outline.approved_at && (
              <div className="border-t border-border px-6 py-3">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  Approved on {format(new Date(outline.approved_at), 'MMMM d, yyyy')}
                </p>
              </div>
            )}
          </Card>
        </section>
      )}

      <Separator />

      {/* ---------- comments ---------- */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">Comments</h2>

        {comments.length === 0 && (
          <p className="text-sm text-muted-foreground">No comments yet.</p>
        )}

        <div className="space-y-4">
          {comments.map((comment) => {
            const isAdmin = comment.profiles?.role === 'admin';
            return (
              <Card
                key={comment.id}
                className={cn(isAdmin && 'border-primary/30 bg-primary/5')}
              >
                <CardContent className="py-4">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {authorLabel(comment)}
                    </span>
                    {isAdmin && <ShieldCheck className="h-3.5 w-3.5 text-primary" />}
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(comment.created_at), 'MMM d, yyyy h:mm a')}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-foreground">{comment.content}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* new comment form */}
        <div className="mt-6 space-y-3">
          <Textarea
            placeholder="Write a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={3}
            className="resize-none"
          />
          <div className="flex justify-end">
            <Button
              onClick={handlePostComment}
              disabled={submitting || !newComment.trim()}
              size="sm"
              className="gap-2"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Post Comment
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
