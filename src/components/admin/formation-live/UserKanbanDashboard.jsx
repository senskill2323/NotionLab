import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Loader2, User } from 'lucide-react';
import AdminKanbanView from '@/components/admin/formation-live/AdminKanbanView';

const KpiTile = ({ label, value }) => (
  <div className="rounded-lg border bg-card/40 p-3 text-center">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="text-lg font-bold">{value}</div>
  </div>
);

const normalizeStats = (data) => {
  if (!data) return null;
  const s = Array.isArray(data) ? data[0] : data;
  const partial = {
    todo: s?.todo ?? 0,
    in_progress: s?.in_progress ?? 0,
    blocked: s?.blocked ?? 0,
    done: s?.done ?? 0,
    total_duration_minutes: s?.total_duration_minutes ?? null,
  };
  const total = (partial.todo + partial.in_progress + partial.blocked + partial.done) || 0;
  return {
    ...partial,
    completion_rate: total > 0 ? Math.round((partial.done / total) * 100) : 0,
  };
};

const computeStatsFromCards = (cards) => {
  const res = { todo: 0, in_progress: 0, blocked: 0, done: 0, total_duration_minutes: 0, completion_rate: 0 };
  (cards || []).forEach(c => {
    const st = c.status;
    if (res[st] !== undefined) res[st] += 1;
    const d = Number(c.duration) || 0;
    res.total_duration_minutes += d;
  });
  const total = res.todo + res.in_progress + res.blocked + res.done;
  res.completion_rate = total > 0 ? Math.round((res.done / total) * 100) : 0;
  return res;
};

export default function UserKanbanDashboard({ submissions = [], users = [] }) {
  const [openUserId, setOpenUserId] = useState('');
  const [statsByUser, setStatsByUser] = useState({});
  const [fetchingStats, setFetchingStats] = useState(false);
  const { authReady } = useAuth();

  const usersMap = useMemo(() => new Map(users.map(u => [u.id, u])), [users]);

  const approvedByUser = useMemo(() => {
    const grouped = {};
    for (const s of submissions) {
      const status = (s.submission_status || '').toLowerCase();
      if (!['approved', 'live'].includes(status)) continue; // Live uniquement (tolère 'approved' ou 'live')
      // Filtrer les entrées incomplètes pour éviter des clés "undefined"
      if (!s.user_id || !s.course_id) continue;
      if (!grouped[s.user_id]) grouped[s.user_id] = [];
      grouped[s.user_id].push({ course_id: s.course_id, course_title: s.course_title, user_full_name: s.user_full_name });
    }
    // dédoublonner et trier
    Object.keys(grouped).forEach(uid => {
      const m = new Map();
      grouped[uid].forEach(c => { if (!m.has(c.course_id)) m.set(c.course_id, c); });
      grouped[uid] = Array.from(m.values()).sort((a, b) => (a.course_title || '').localeCompare(b.course_title || ''));
    });
    return grouped;
  }, [submissions]);

  // Liste des utilisateurs visibles (ayant au moins une formation LIVE), dérivée des submissions
  const liveUsers = useMemo(() => {
    const list = Object.keys(approvedByUser).map((uid) => {
      const nameFromSub = (submissions.find(s => String(s.user_id) === String(uid)) || {}).user_full_name;
      const nameFromUsers = (users.find(u => String(u.id) === String(uid)) || {})?.name;
      return {
        id: uid,
        name: nameFromSub || nameFromUsers || 'Utilisateur',
      };
    });
    return list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [approvedByUser, submissions, users]);
  const firstUserId = liveUsers.length > 0 ? String(liveUsers[0].id) : undefined;

  // Si rien n'est ouvert au montage, ouvrir le premier utilisateur et déclencher l'auto-sélection de formation
  useEffect(() => {
    if (!openUserId && firstUserId) {
      setOpenUserId(firstUserId);
    }
  }, [firstUserId, openUserId]);

  // Récupère toutes les cartes de toutes les formations LIVE pour un utilisateur
  const fetchUserCards = async (userId) => {
    if (!authReady) return [];
    const { data: subs, error: subsErr } = await supabase
      .from('formation_submissions')
      .select('id')
      .eq('user_id', userId)
      .eq('submission_status', 'approved');
    if (subsErr) throw subsErr;
    const subIds = (subs || []).map(s => s.id);
    if (subIds.length === 0) return [];
    const { data: viewRows, error: viewErr } = await supabase
      .from('kanban_user_modules_v1')
      .select('*')
      .in('submission_id', subIds);
    if (viewErr) throw viewErr;
    return viewRows || [];
  };

  const fetchStatsForUser = async (userId) => {
    setFetchingStats(true);
    try {
      const rows = await fetchUserCards(userId);
      setStatsByUser(prev => ({ ...prev, [userId]: computeStatsFromCards(rows) }));
    } catch (_) {
      // ignorer pour l'instant
    } finally {
      setFetchingStats(false);
    }
  };

  useEffect(() => {
    // À l'ouverture d'un utilisateur, calculer les stats globales sur toutes ses formations LIVE
    if (!authReady) return;
    if (openUserId && approvedByUser[openUserId]?.length > 0) {
      fetchStatsForUser(openUserId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, openUserId, approvedByUser]);

  return (
    <div className="rounded-lg border p-4 bg-muted/20">
      {liveUsers.length === 0 ? (
        <div className="text-sm text-muted-foreground">Aucun utilisateur avec une formation LIVE disponible.</div>
      ) : (
        <Accordion type="single" collapsible value={openUserId} onValueChange={(v) => setOpenUserId(v ?? '')}>
          {liveUsers.map(u => {
            const liveCourses = approvedByUser[u.id] || [];
            const fullName = u.name;
            const stats = statsByUser[u.id];
            return (
              <AccordionItem key={String(u.id)} value={String(u.id)}>
                <AccordionTrigger className="gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold">{fullName}</div>
                      <div className="text-xs text-muted-foreground">{liveCourses.length} formation(s) LIVE • Vue globale</div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      <KpiTile label="À faire" value={stats?.todo ?? '-'} />
                      <KpiTile label="En cours" value={stats?.in_progress ?? '-'} />
                      <KpiTile label="Bloqué" value={stats?.blocked ?? '-'} />
                      <KpiTile label="Terminé" value={stats?.done ?? '-'} />
                      <KpiTile label="Avancement" value={`${stats?.completion_rate ?? 0}%`} />
                    </div>
                    <div className="mt-2">
                      {fetchingStats && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Chargement des statistiques...
                        </div>
                      )}
                    </div>
                    <div className="mt-4">
                      <AdminKanbanView
                        key={`${u.id}__global`}
                        submission={{
                          user_id: u.id,
                          course_title: 'Kanban global (toutes formations LIVE)',
                          user_full_name: fullName,
                        }}
                        onBack={() => {}}
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
}
