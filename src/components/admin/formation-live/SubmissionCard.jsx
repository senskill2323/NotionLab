import React from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { User, Clock, Eye, MoreVertical, CheckCircle, XCircle, Hourglass } from 'lucide-react';

const statusConfig = {
  approved: { label: 'Live', variant: 'success', icon: <CheckCircle className="w-3 h-3" /> },
  pending: { label: 'À Valider', variant: 'warning', icon: <Hourglass className="w-3 h-3" /> },
  rejected: { label: 'Rejeté', variant: 'destructive', icon: <XCircle className="w-3 h-3" /> },
};

const SubmissionCard = ({ submission, onStatusChange, onReject, onView }) => {
  const currentStatus = statusConfig[submission.submission_status] || { label: 'Inconnu', variant: 'secondary' };

  const cardVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, scale: 0.9 },
  };

  return (
    <motion.div layout variants={cardVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.3 }}>
      <Card className={`relative overflow-hidden transition-all duration-300 hover:shadow-lg h-full flex flex-col ${submission.submission_status === 'pending' ? 'border-yellow-500/50 border-2 animate-pulse-border' : ''}`}>
        <CardHeader className="p-4">
          <div className="flex justify-between items-start">
            <CardTitle className="text-base font-semibold pr-8">{submission.course_title}</CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => onStatusChange(submission.id, 'approved')}>
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                  <span>Valider (Live)</span>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onStatusChange(submission.id, 'pending')}>
                  <Hourglass className="mr-2 h-4 w-4 text-yellow-500" />
                  <span>Mettre en attente</span>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onReject(submission)}>
                  <XCircle className="mr-2 h-4 w-4 text-red-500" />
                  <span>Rejeter...</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => onView(submission)}>
                  <Eye className="mr-2 h-4 w-4" />
                  <span>Voir le détail</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <CardDescription className="flex items-center text-xs text-muted-foreground pt-1">
            <User className="w-3 h-3 mr-1.5" />
            {submission.user_full_name}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0 flex-grow" />
        <CardFooter className="p-4 pt-0 flex justify-between items-center text-xs text-muted-foreground">
          <Badge variant={currentStatus.variant} className="flex items-center gap-1.5">
            {currentStatus.icon}
            {currentStatus.label}
          </Badge>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{format(new Date(submission.submitted_at), 'd MMM yyyy', { locale: fr })}</span>
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default SubmissionCard;