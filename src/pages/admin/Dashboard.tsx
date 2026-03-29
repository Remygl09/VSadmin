import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { format, isPast, parseISO } from 'date-fns';
import {
  Plus,
  DollarSign,
  Calendar,
  GripVertical,
  Search,
  Users,
  Rocket,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUnseenPayments } from '@/hooks/useUnseenPayments';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import ClientFormModal from '@/components/admin/ClientFormModal';
import type { Tag } from '@/components/admin/TagInput';

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

interface Project {
  id: string;
  company_name: string;
  founder_name: string;
  status: Status;
  contract_end: string | null;
  tags: Tag[] | null;
  total_amount: number | null;
}

const POTENTIAL_STATUSES: Status[] = ['prospect', 'in_proposal', 'in_assessment'];
const ACTIVE_STATUSES: Status[] = ['in_build', 'in_beta', 'launched'];
const ALL_STATUSES: Status[] = [...POTENTIAL_STATUSES, ...ACTIVE_STATUSES];

const STATUS_LABELS: Record<Status, string> = {
  prospect: 'Prospect',
  in_proposal: 'In Proposal',
  in_assessment: 'In Assessment',
  in_build: 'In Build',
  in_beta: 'In Beta',
  launched: 'Launched',
};

const STATUS_COLORS: Record<Status, string> = {
  prospect: 'bg-zinc-700/60 text-zinc-200',
  in_proposal: 'bg-amber-900/40 text-amber-300',
  in_assessment: 'bg-purple-900/40 text-purple-300',
  in_build: 'bg-blue-900/40 text-blue-300',
  in_beta: 'bg-cyan-900/40 text-cyan-300',
  launched: 'bg-emerald-900/40 text-emerald-300',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ---------------------------------------------------------------------------
// Sortable Project Card
// ---------------------------------------------------------------------------

interface ProjectCardProps {
  project: Project;
  hasUnseen: boolean;
  onClick: () => void;
  isDragOverlay?: boolean;
}

function SortableProjectCard({ project, hasUnseen, onClick }: ProjectCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const contractExpired =
    project.contract_end !== null &&
    project.contract_end !== '' &&
    isPast(parseISO(project.contract_end));

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative rounded-lg border border-border bg-card p-3 shadow-sm transition-colors hover:border-primary/30 hover:bg-card/80 cursor-pointer"
      onClick={onClick}
    >
      {/* Drag handle */}
      <button
        className="absolute right-2 top-2 opacity-0 group-hover:opacity-60 transition-opacity touch-none"
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>

      {/* Company & Founder */}
      <p className="text-sm font-semibold text-foreground leading-tight pr-6">
        {project.company_name}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{project.founder_name}</p>

      {/* Tags */}
      {project.tags !== null && project.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {project.tags.map((tag) => (
            <span
              key={tag.label}
              className="inline-block rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{
                backgroundColor: `${tag.color}22`,
                color: tag.color,
                border: `1px solid ${tag.color}44`,
              }}
            >
              {tag.label}
            </span>
          ))}
        </div>
      )}

      {/* Footer row */}
      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        {project.total_amount !== null && project.total_amount > 0 && (
          <span className="flex items-center gap-0.5">
            <DollarSign className="h-3 w-3" />
            {formatCurrency(project.total_amount)}
          </span>
        )}
        {project.contract_end !== null && project.contract_end !== '' && (
          <span
            className={`flex items-center gap-0.5 ${
              contractExpired ? 'text-destructive' : ''
            }`}
          >
            <Calendar className="h-3 w-3" />
            {format(parseISO(project.contract_end), 'MMM d, yyyy')}
          </span>
        )}
        {hasUnseen && (
          <span className="ml-auto flex items-center gap-0.5 text-red-400 animate-pulse">
            <DollarSign className="h-3 w-3" />
            New
          </span>
        )}
      </div>
    </div>
  );
}

function DragOverlayCard({ project, hasUnseen }: ProjectCardProps) {
  return (
    <div className="rounded-lg border border-primary/40 bg-card p-3 shadow-lg w-64">
      <p className="text-sm font-semibold text-foreground">{project.company_name}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{project.founder_name}</p>
      {project.tags !== null && project.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {project.tags.map((tag) => (
            <span
              key={tag.label}
              className="inline-block rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{
                backgroundColor: `${tag.color}22`,
                color: tag.color,
                border: `1px solid ${tag.color}44`,
              }}
            >
              {tag.label}
            </span>
          ))}
        </div>
      )}
      {hasUnseen && (
        <span className="mt-2 inline-flex items-center gap-0.5 text-xs text-red-400 animate-pulse">
          <DollarSign className="h-3 w-3" />
          New payment
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status Column
// ---------------------------------------------------------------------------

interface ColumnProps {
  status: Status;
  projects: Project[];
  unseenMap: Record<string, boolean>;
  onCardClick: (id: string) => void;
}

function StatusColumn({ status, projects, unseenMap, onCardClick }: ColumnProps) {
  const columnTotal = projects.reduce(
    (sum, p) => sum + (p.total_amount ?? 0),
    0,
  );

  return (
    <div className="flex min-w-[260px] max-w-[300px] flex-1 flex-col">
      {/* Column header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[status]}`}
          >
            {STATUS_LABELS[status]}
          </span>
          <span className="text-xs text-muted-foreground">{projects.length}</span>
        </div>
        {columnTotal > 0 && (
          <span className="text-xs font-medium text-muted-foreground">
            {formatCurrency(columnTotal)}
          </span>
        )}
      </div>

      {/* Droppable area */}
      <SortableContext
        items={projects.map((p) => p.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-1 flex-col gap-2 rounded-lg border border-dashed border-border/50 bg-secondary/20 p-2 min-h-[120px]">
          {projects.map((project) => (
            <SortableProjectCard
              key={project.id}
              project={project}
              hasUnseen={unseenMap[project.id] === true}
              onClick={() => onCardClick(project.id)}
            />
          ))}
          {projects.length === 0 && (
            <p className="py-8 text-center text-xs text-muted-foreground/50">
              No clients
            </p>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Dashboard Component
// ---------------------------------------------------------------------------

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { unseenByProject } = useUnseenPayments();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [mrr, setMrr] = useState<number | null>(null);
  const [showClientModal, setShowClientModal] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Sensors for dnd-kit
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const fetchProjects = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, company_name, founder_name, status, contract_end, tags, total_amount')
        .in('status', ALL_STATUSES)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const mapped: Project[] = (data ?? []).map((row) => ({
        id: row.id as string,
        company_name: row.company_name as string,
        founder_name: row.founder_name as string,
        status: row.status as Status,
        contract_end: (row.contract_end as string) ?? null,
        tags: (row.tags as Tag[] | null) ?? null,
        total_amount: (row.total_amount as number) ?? null,
      }));

      setProjects(mapped);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to load projects';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchMrr = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke<{ mrr: number }>(
        'get-mrr',
      );
      if (error) throw error;
      setMrr(data?.mrr ?? null);
    } catch {
      // MRR is non-critical; silently ignore
    }
  }, []);

  useEffect(() => {
    void fetchProjects();
    void fetchMrr();
  }, [fetchProjects, fetchMrr]);

  // Realtime subscription for project changes
  useEffect(() => {
    const channel = supabase
      .channel('dashboard-projects')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'projects' },
        () => {
          void fetchProjects();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchProjects]);

  // ---------------------------------------------------------------------------
  // Grouped & Filtered projects
  // ---------------------------------------------------------------------------

  const groupedByStatus = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    const filtered =
      term === ''
        ? projects
        : projects.filter((p) => {
            if (p.company_name.toLowerCase().includes(term)) return true;
            if (p.founder_name.toLowerCase().includes(term)) return true;
            if (
              p.tags !== null &&
              p.tags.some((t) => t.label.toLowerCase().includes(term))
            ) {
              return true;
            }
            return false;
          });

    const grouped: Record<Status, Project[]> = {
      prospect: [],
      in_proposal: [],
      in_assessment: [],
      in_build: [],
      in_beta: [],
      launched: [],
    };

    for (const project of filtered) {
      const bucket = grouped[project.status];
      if (bucket !== undefined) {
        bucket.push(project);
      }
    }

    return grouped;
  }, [projects, searchTerm]);

  // ---------------------------------------------------------------------------
  // Drag and drop handlers
  // ---------------------------------------------------------------------------

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;

      if (over === null || over === undefined) return;

      const projectId = String(active.id);
      const overId = String(over.id);

      // Determine target status: the over target could be a project card or a
      // column droppable. We check if overId matches a status name first.
      let targetStatus: Status | undefined;

      if (ALL_STATUSES.includes(overId as Status)) {
        targetStatus = overId as Status;
      } else {
        // overId is a project id — find which status column it belongs to
        const overProject = projects.find((p) => p.id === overId);
        targetStatus = overProject?.status;
      }

      if (targetStatus === undefined) return;

      const draggedProject = projects.find((p) => p.id === projectId);
      if (draggedProject === undefined) return;

      // No change
      if (draggedProject.status === targetStatus) return;

      // Optimistic update
      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId ? { ...p, status: targetStatus as Status } : p,
        ),
      );

      try {
        const { error } = await supabase
          .from('projects')
          .update({ status: targetStatus })
          .eq('id', projectId);

        if (error) throw error;

        toast({
          title: 'Status updated',
          description: `${draggedProject.company_name} moved to ${STATUS_LABELS[targetStatus]}.`,
        });
      } catch (err: unknown) {
        // Revert on failure
        void fetchProjects();
        const message =
          err instanceof Error ? err.message : 'Failed to update status';
        toast({ title: 'Error', description: message, variant: 'destructive' });
      }
    },
    [projects, toast, fetchProjects],
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  const handleCardClick = useCallback(
    (id: string) => {
      navigate(`/admin/clients/${id}`);
    },
    [navigate],
  );

  // Active project for drag overlay
  const activeProject = useMemo(() => {
    if (activeId === null) return null;
    return projects.find((p) => p.id === activeId) ?? null;
  }, [activeId, projects]);

  // ---------------------------------------------------------------------------
  // Unseen payments map
  // ---------------------------------------------------------------------------

  const unseenMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    if (unseenByProject !== undefined && unseenByProject !== null) {
      for (const [key, value] of Object.entries(unseenByProject)) {
        map[key] = Boolean(value);
      }
    }
    return map;
  }, [unseenByProject]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">
            Vision Software Pipeline
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your client pipeline across every stage.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 w-full pl-8 sm:w-56"
            />
          </div>

          {/* MRR display */}
          {mrr !== null && (
            <Card className="border-primary/20 bg-primary/5 shadow-none">
              <CardContent className="flex items-center gap-2 px-4 py-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    MRR
                  </p>
                  <p className="text-sm font-bold text-primary">
                    {formatCurrency(mrr)}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Add Client button */}
          <Button onClick={() => setShowClientModal(true)} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            Add Client
          </Button>
        </div>
      </div>

      <Separator />

      {/* Pipeline sections */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        {/* Potential Clients */}
        <section>
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold font-display text-foreground">
              Potential Clients
            </h2>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {POTENTIAL_STATUSES.map((status) => (
              <StatusColumn
                key={status}
                status={status}
                projects={groupedByStatus[status]}
                unseenMap={unseenMap}
                onCardClick={handleCardClick}
              />
            ))}
          </div>
        </section>

        <Separator />

        {/* Active Clients */}
        <section>
          <div className="mb-4 flex items-center gap-2">
            <Rocket className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold font-display text-foreground">
              Active Clients
            </h2>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {ACTIVE_STATUSES.map((status) => (
              <StatusColumn
                key={status}
                status={status}
                projects={groupedByStatus[status]}
                unseenMap={unseenMap}
                onCardClick={handleCardClick}
              />
            ))}
          </div>
        </section>

        {/* Drag overlay */}
        <DragOverlay>
          {activeProject !== null ? (
            <DragOverlayCard
              project={activeProject}
              hasUnseen={unseenMap[activeProject.id] === true}
              onClick={() => {}}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Client form modal */}
      <ClientFormModal
        open={showClientModal}
        onOpenChange={setShowClientModal}
        onSuccess={() => {
          setShowClientModal(false);
          void fetchProjects();
        }}
      />
    </div>
  );
}
