import React from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import ReactFlow, { Background, Controls, MiniMap } from 'reactflow';

const ViewSubmissionDialog = ({ submission, isOpen, onOpenChange }) => {
  if (!submission) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh]">
        <DialogHeader>
          <DialogTitle>{submission.course_title}</DialogTitle>
          <DialogDescription>
            Soumis par {submission.user_full_name} le {format(new Date(submission.submitted_at), 'd MMMM yyyy', { locale: fr })}.
          </DialogDescription>
        </DialogHeader>
        <div className="h-[calc(100%-100px)] w-full border rounded-lg overflow-hidden">
          <ReactFlow
            nodes={submission.course_snapshot.nodes}
            edges={submission.course_snapshot.edges}
            fitView
            proOptions={{ hideAttribution: true }}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ViewSubmissionDialog;