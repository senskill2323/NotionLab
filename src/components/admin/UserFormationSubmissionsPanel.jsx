import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

import { useSubmissions } from '@/hooks/useSubmissions';
import SubmissionCard from '@/components/admin/formation-live/SubmissionCard';
import SubmissionFilters from '@/components/admin/formation-live/SubmissionFilters';
import RejectSubmissionDialog from '@/components/admin/formation-live/RejectSubmissionDialog';
import AdminKanbanView from '@/components/admin/formation-live/AdminKanbanView';
import UserKanbanDashboard from '@/components/admin/formation-live/UserKanbanDashboard';

const UserFormationSubmissionsPanel = () => {
  const {
    submissions,
    loading,
    filters,
    setFilters,
    users,
    handleStatusUpdate,
    handleRejection,
    handleDelete,
  } = useSubmissions();

  const [viewMode, setViewMode] = useState('gallery'); // 'gallery' or 'kanban'
  const [selectedSubmission, setSelectedSubmission] = useState(null);

  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [submissionToReject, setSubmissionToReject] = useState(null);

  // N'afficher que les formations LIVE dans ce panneau
  const filteredSubmissions = (submissions || []).filter(s => {
    const st = (s.submission_status || '').toLowerCase();
    return st === 'approved' || st === 'live';
  });

  const handleRejectClick = (submission) => {
    setSubmissionToReject(submission);
    setIsRejectDialogOpen(true);
  };

  const confirmRejection = () => {
    if (submissionToReject) {
      handleRejection(submissionToReject.id, rejectionNotes);
    }
    setRejectionNotes('');
    setIsRejectDialogOpen(false);
    setSubmissionToReject(null);
  };

  const handleViewDetails = (submission) => {
    setSelectedSubmission(submission);
    setViewMode('kanban');
  };

  const handleBackToGallery = () => {
    setSelectedSubmission(null);
    setViewMode('gallery');
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  if (viewMode === 'kanban' && selectedSubmission) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 300 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -300 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
      >
        <AdminKanbanView submission={selectedSubmission} onBack={handleBackToGallery} />
      </motion.div>
    );
  }

  return (
    <Card className="glass-effect w-full">
      <CardHeader>
        <CardTitle>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            Formation Live
          </div>
        </CardTitle>
        <CardDescription>Affichage exclusif des formations LIVE. Les soumissions en attente/rejetées ne sont pas visibles ici.</CardDescription>
      </CardHeader>
      <CardContent>
        <SubmissionFilters filters={filters} setFilters={setFilters} />
        
        {loading ? (
          <div className="flex justify-center items-center h-96">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        ) : (
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <AnimatePresence>
              {filteredSubmissions.length > 0 ? (
                filteredSubmissions.map(submission => (
                  <SubmissionCard
                    key={submission.id}
                    submission={submission}
                    onStatusChange={handleStatusUpdate}
                    onReject={handleRejectClick}
                    onView={handleViewDetails}
                    onDelete={handleDelete}
                  />
                ))
              ) : (
                <div className="col-span-full text-center py-16 text-muted-foreground">
                  <p>Aucune soumission ne correspond à ce filtre.</p>
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        <RejectSubmissionDialog
          isOpen={isRejectDialogOpen}
          onOpenChange={setIsRejectDialogOpen}
          onConfirm={confirmRejection}
          notes={rejectionNotes}
          setNotes={setRejectionNotes}
        />

        <div className="mt-10">
          <div className="mb-3">
            <h3 className="text-lg font-semibold">Dashboard d’avancement</h3>
            <p className="text-sm text-muted-foreground">Accédez à chaque Kanban par utilisateur et formation LIVE.</p>
          </div>
          <UserKanbanDashboard submissions={submissions} users={users} />
        </div>
      </CardContent>
    </Card>
  );
};

export default UserFormationSubmissionsPanel;





