import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Star, Download, Users, ArrowLeft } from 'lucide-react';
import Papa from 'papaparse';
import { useToast } from '@/components/ui/use-toast';
import { Link } from 'react-router-dom';

const ChatHeader = ({ messages, user }) => {
  const [activeProfessor, setActiveProfessor] = useState('main_prof');
  const { toast } = useToast();

  const exportToCsv = () => {
    if (!messages || messages.length === 0) {
      toast({ title: "Aucun message", description: "Il n'y a rien à exporter." });
      return;
    }

    const dataToExport = messages.map(msg => {
      const senderName = ['admin', 'prof', 'owner'].includes(msg.sender) ? 'NotionLab' : (user?.profile?.first_name || 'Vous');
      return {
        "Date": new Date(msg.created_at).toLocaleString('fr-FR'),
        "Auteur": senderName,
        "Message": msg.content,
        "Fichier": msg.file_url || (msg.resource ? msg.resource.name : ''),
      };
    });

    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `conversation-notionlab-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-10 bg-background/80 backdrop-blur-md border-b">
      <div className="flex justify-between items-center h-16 px-4 w-full">
        <div className="flex items-center gap-4">
          {user && (
            <Link to="/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
          )}
          <Select value={activeProfessor} onValueChange={setActiveProfessor}>
            <SelectTrigger className="w-[180px] h-9">
              <Users className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Professeur" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="main_prof">NotionLab</SelectItem>
              <SelectItem value="other_prof_1" disabled>Autre Prof 1 (bientôt)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon">
                <Star className="w-5 h-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 text-sm">
              Astuce : Pour un accès rapide, ajoutez cette page à vos favoris (Ctrl+D ou ⌘+D).
            </PopoverContent>
          </Popover>
          <Button variant="ghost" size="icon" onClick={exportToCsv}>
            <Download className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default ChatHeader;