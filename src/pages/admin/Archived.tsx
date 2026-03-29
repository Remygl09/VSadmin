import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, Archive, ArchiveRestore } from 'lucide-react';

interface ArchivedProject {
  id: string;
  company_name: string;
  founder_name: string;
  status: string;
}

const STATUS_LABELS: Record<string, string> = {
  prospect: 'Prospect',
  in_proposal: 'In Proposal',
  in_assessment: 'In Assessment',
  in_build: 'In Build',
  in_beta: 'In Beta',
  launched: 'Launched',
};

export default function Archived() {
  const [projects, setProjects] = useState<ArchivedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [unarchivingId, setUnarchivingId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchArchived = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('projects')
      .select('id, company_name, founder_name, status')
      .eq('is_archived', true)
      .order('company_name', { ascending: true });

    if (error) {
      toast({
        title: 'Error loading archived clients',
        description: error.message,
        variant: 'destructive',
      });
      setProjects([]);
    } else {
      setProjects(data ?? []);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    void fetchArchived();
  }, [fetchArchived]);

  const handleUnarchive = async (id: string) => {
    setUnarchivingId(id);
    const { error } = await supabase
      .from('projects')
      .update({ is_archived: false })
      .eq('id', id);

    if (error) {
      toast({
        title: 'Failed to unarchive client',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setProjects((prev) => prev.filter((p) => p.id !== id));
      toast({
        title: 'Client unarchived',
        description: 'The client has been moved back to the pipeline.',
      });
    }
    setUnarchivingId(null);
  };

  return (
    <div className="p-6">
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-foreground">
            <Archive className="h-5 w-5 text-primary" />
            Archived Clients
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Archive className="h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">
                No archived clients
              </p>
              <p className="text-xs text-muted-foreground/60">
                Clients you archive from the pipeline will appear here.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Company</TableHead>
                  <TableHead className="text-muted-foreground">Founder</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead className="text-right text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project) => (
                  <TableRow key={project.id} className="border-border">
                    <TableCell className="font-medium text-foreground">
                      {project.company_name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {project.founder_name}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                        {STATUS_LABELS[project.status] ?? project.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 border-border text-muted-foreground hover:border-primary hover:text-primary"
                        disabled={unarchivingId === project.id}
                        onClick={() => void handleUnarchive(project.id)}
                      >
                        {unarchivingId === project.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <ArchiveRestore className="h-3.5 w-3.5" />
                        )}
                        Unarchive
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
