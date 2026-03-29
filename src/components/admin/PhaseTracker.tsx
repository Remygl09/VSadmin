import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Check, ChevronRight, Loader2 } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Phase {
  id: number;
  label: string;
  description: string;
}

interface PhaseTrackerProps {
  projectId: string;
  currentPhase: number;
  onPhaseChange?: (newPhase: number) => void;
}

// ---------------------------------------------------------------------------
// Default phases
// ---------------------------------------------------------------------------

const PHASES: Phase[] = [
  { id: 1, label: 'Discovery', description: 'Initial consultation and requirements gathering' },
  { id: 2, label: 'Proposal', description: 'Scope, timeline, and pricing proposal' },
  { id: 3, label: 'Design', description: 'UI/UX design and prototyping' },
  { id: 4, label: 'Development', description: 'Building the application' },
  { id: 5, label: 'Testing', description: 'QA and user acceptance testing' },
  { id: 6, label: 'Launch', description: 'Deployment and go-live' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PhaseTracker({
  projectId,
  currentPhase,
  onPhaseChange,
}: PhaseTrackerProps) {
  const { toast } = useToast();
  const [updating, setUpdating] = useState(false);

  const handlePhaseClick = async (phaseId: number) => {
    if (phaseId === currentPhase || updating) return;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('projects')
        .update({ current_phase: phaseId })
        .eq('id', projectId);

      if (error) throw error;

      onPhaseChange?.(phaseId);
      toast({ title: `Phase updated to "${PHASES.find((p) => p.id === phaseId)?.label ?? 'Unknown'}"` });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to update phase';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Project Phase
        </h3>
        {updating && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
      </div>

      <div className="flex flex-wrap gap-2">
        {PHASES.map((phase, idx) => {
          const isComplete = phase.id < currentPhase;
          const isCurrent = phase.id === currentPhase;

          return (
            <div key={phase.id} className="flex items-center gap-1">
              <Button
                variant={isCurrent ? 'default' : isComplete ? 'secondary' : 'outline'}
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => void handlePhaseClick(phase.id)}
                disabled={updating}
                title={phase.description}
              >
                {isComplete && <Check className="h-3 w-3" />}
                {phase.label}
              </Button>
              {idx < PHASES.length - 1 && (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
