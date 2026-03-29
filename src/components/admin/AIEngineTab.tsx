import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
  Brain,
  ChevronDown,
  ChevronRight,
  Check,
  RefreshCw,
  Loader2,
  Sparkles,
  ShieldCheck,
  ShieldOff,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AIReport {
  id: string;
  project_id: string;
  report_type: string;
  content: string;
  approved: boolean;
  created_at: string;
}

interface AIEngineTabProps {
  projectId: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AIEngineTab({ projectId }: AIEngineTabProps) {
  const { toast } = useToast();

  const [reports, setReports] = useState<AIReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [openReportId, setOpenReportId] = useState<string | null>(null);

  // -----------------------------------------------------------------------
  // Fetch reports
  // -----------------------------------------------------------------------

  const fetchReports = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('ai_reports')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports((data as AIReport[] | null) ?? []);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to load AI reports';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [projectId, toast]);

  useEffect(() => {
    void fetchReports();
  }, [fetchReports]);

  // -----------------------------------------------------------------------
  // Generate a new report
  // -----------------------------------------------------------------------

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-ai-report', {
        body: { project_id: projectId },
      });

      if (error) throw error;

      toast({
        title: 'Report generated',
        description: 'A new AI report has been created.',
      });

      // If the function returns the new report, prepend it
      if (data !== null && data !== undefined && typeof data === 'object' && 'id' in data) {
        setReports((prev) => [data as AIReport, ...prev]);
      } else {
        void fetchReports();
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to generate report';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  // -----------------------------------------------------------------------
  // Toggle approval
  // -----------------------------------------------------------------------

  const toggleApproval = async (report: AIReport) => {
    const newApproved = !report.approved;
    try {
      const { error } = await supabase
        .from('ai_reports')
        .update({ approved: newApproved })
        .eq('id', report.id);

      if (error) throw error;

      setReports((prev) =>
        prev.map((r) => (r.id === report.id ? { ...r, approved: newApproved } : r)),
      );

      toast({
        title: newApproved ? 'Report approved' : 'Approval revoked',
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to update approval';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  // -----------------------------------------------------------------------
  // Delete report
  // -----------------------------------------------------------------------

  const deleteReport = async (reportId: string) => {
    try {
      const { error } = await supabase
        .from('ai_reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;

      setReports((prev) => prev.filter((r) => r.id !== reportId));
      toast({ title: 'Report deleted' });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to delete report';
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
          <Brain className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">AI Engine</h3>
        </div>
        <Button
          onClick={() => void handleGenerate()}
          disabled={generating}
          size="sm"
          className="gap-1.5"
        >
          {generating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {generating ? 'Generating...' : 'Generate Report'}
        </Button>
      </div>

      {/* Reports list */}
      {reports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Brain className="mx-auto mb-3 h-10 w-10 opacity-30" />
            <p>No AI reports yet. Click &ldquo;Generate Report&rdquo; to create one.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => {
            const isOpen = openReportId === report.id;
            return (
              <Card key={report.id}>
                <Collapsible
                  open={isOpen}
                  onOpenChange={(open: boolean) =>
                    setOpenReportId(open ? report.id : null)
                  }
                >
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3 px-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {isOpen ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                          <div>
                            <CardTitle className="text-sm font-medium">
                              {report.report_type}
                            </CardTitle>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(report.created_at), 'MMM d, yyyy h:mm a')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {report.approved ? (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                              <ShieldCheck className="h-3.5 w-3.5" />
                              Approved
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <ShieldOff className="h-3.5 w-3.5" />
                              Pending
                            </span>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="px-4 pb-4 pt-0">
                      <div className="prose prose-sm prose-invert max-w-none">
                        <ReactMarkdown>{report.content}</ReactMarkdown>
                      </div>

                      <div className="mt-4 flex items-center gap-2 border-t border-border pt-4">
                        <Button
                          variant={report.approved ? 'outline' : 'default'}
                          size="sm"
                          className="gap-1.5"
                          onClick={() => void toggleApproval(report)}
                        >
                          {report.approved ? (
                            <ShieldOff className="h-3.5 w-3.5" />
                          ) : (
                            <Check className="h-3.5 w-3.5" />
                          )}
                          {report.approved ? 'Revoke Approval' : 'Approve'}
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => void fetchReports()}
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          Refresh
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="ml-auto text-destructive hover:text-destructive"
                            >
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete report?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete this AI report. This
                                action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => void deleteReport(report.id)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
