import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const SEEN_KEY = 'vs_seen_payments_ts';

interface PaymentRow {
  id: string;
  project_id: string;
  created_at: string;
}

interface UseUnseenPaymentsReturn {
  /** Set of project IDs that have unseen payments */
  projectsWithUnseen: Set<string>;
  /** Convenience record mapping project id -> boolean for template usage */
  unseenByProject: Record<string, boolean>;
  /** Whether any project has an unseen payment */
  hasUnseenGlobal: boolean;
  /** Mark all payments as seen (updates localStorage timestamp) */
  markGlobalSeen: () => void;
}

export function useUnseenPayments(): UseUnseenPaymentsReturn {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [seenTs, setSeenTs] = useState<string>(() => {
    try {
      return localStorage.getItem(SEEN_KEY) ?? '';
    } catch {
      return '';
    }
  });

  // Fetch recent payments
  const fetchPayments = useCallback(async () => {
    const { data, error } = await supabase
      .from('payments')
      .select('id, project_id, created_at')
      .order('created_at', { ascending: false })
      .limit(200);

    if (!error && data !== null) {
      setPayments(data as PaymentRow[]);
    }
  }, []);

  useEffect(() => {
    void fetchPayments();

    const channel = supabase
      .channel('unseen-payments')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'payments' },
        () => {
          void fetchPayments();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchPayments]);

  const projectsWithUnseen = useMemo<Set<string>>(() => {
    if (seenTs === '') {
      // If never marked seen, all payments are unseen
      const set = new Set<string>();
      for (const p of payments) {
        set.add(p.project_id);
      }
      return set;
    }

    const set = new Set<string>();
    for (const p of payments) {
      if (p.created_at > seenTs) {
        set.add(p.project_id);
      }
    }
    return set;
  }, [payments, seenTs]);

  const unseenByProject = useMemo<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    for (const id of projectsWithUnseen) {
      map[id] = true;
    }
    return map;
  }, [projectsWithUnseen]);

  const hasUnseenGlobal = projectsWithUnseen.size > 0;

  const markGlobalSeen = useCallback(() => {
    const now = new Date().toISOString();
    try {
      localStorage.setItem(SEEN_KEY, now);
    } catch {
      // localStorage may be unavailable
    }
    setSeenTs(now);
  }, []);

  return {
    projectsWithUnseen,
    unseenByProject,
    hasUnseenGlobal,
    markGlobalSeen,
  };
}
