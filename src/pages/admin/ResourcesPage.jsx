import React from 'react';
    import { Helmet } from 'react-helmet';
    import Navigation from '@/components/Navigation';
    import { Button } from '@/components/ui/button';
    import { Input } from '@/components/ui/input';
    import {
      Table,
      TableBody,
      TableCell,
      TableHead,
      TableHeader,
      TableRow,
    } from "@/components/ui/table";
    import {
      Select,
      SelectContent,
      SelectItem,
      SelectTrigger,
      SelectValue,
    } from "@/components/ui/select";
    import { Checkbox } from "@/components/ui/checkbox"
    import { FolderKanban, Plus, Search, Star, Filter, FileText, FileType, Youtube, StickyNote } from 'lucide-react';
    import { useToast } from '@/components/ui/use-toast';
    import { supabase } from '@/lib/customSupabaseClient';

    const ResourcesPage = () => {
      const { toast } = useToast();
      const [resources, setResources] = React.useState([]);
      const [loading, setLoading] = React.useState(true);
      const [searchTerm, setSearchTerm] = React.useState("");

      React.useEffect(() => {
        const fetchResources = async () => {
          setLoading(true);
          const { data, error } = await supabase
            .from('resources')
            .select(`
              *,
              profile:created_by(first_name, last_name),
              family:builder_families(name),
              subfamily:builder_subfamilies(name),
              assignments:resource_assignments(count)
            `)
            .order('created_at', { ascending: false });

          if (error) {
            console.error("Error fetching resources:", error);
            toast({
              title: "Erreur",
              description: "Impossible de charger les ressources.",
              variant: "destructive",
            });
          } else {
            setResources(data);
          }
          setLoading(false);
        };

        fetchResources();
      }, [toast]);

      const handleAddResource = () => {
        toast({
            title: "🚧 Bientôt disponible !",
            description: "La création de ressources sera bientôt implémentée.",
        });
      };

      const getFileIcon = (format) => {
        switch (format) {
          case 'pdf': return <FileType className="w-4 h-4 text-red-500" />;
          case 'youtube': return <Youtube className="w-4 h-4 text-red-600" />;
          case 'internal_note': return <StickyNote className="w-4 h-4 text-yellow-500" />;
          default: return <FileText className="w-4 h-4 text-gray-500" />;
        }
      }

      const filteredResources = resources.filter(resource => 
        resource.name.toLowerCase().includes(searchTerm.toLowerCase())
      );

      return (
        <>
          <Helmet>
            <title>Gestion des Ressources | Notion Pro</title>
            <meta name="description" content="Gérez toutes les ressources pédagogiques de votre plateforme." />
          </Helmet>
          <div className="flex flex-col h-screen bg-background">
            <Navigation />
            <main className="flex-grow pt-24 pb-8 px-4 sm:px-6 lg:px-8">
              <div className="max-w-7xl mx-auto">
                <header className="mb-6">
                  <div className="flex items-center gap-3">
                    <FolderKanban className="w-8 h-8 text-primary" />
                    <div>
                      <h1 className="text-2xl font-bold">Ressources</h1>
                      <p className="text-muted-foreground text-sm">Éléments concrets et actionnables comme des documents, guides ou procédures.</p>
                    </div>
                  </div>
                </header>

                <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm"><Star className="w-4 h-4 mr-2"/>Favoris</Button>
                        <Button variant="secondary" size="sm">Toutes les ressources</Button>
                         <Button variant="ghost" size="sm"><Filter className="w-4 h-4 mr-2"/>Par Types</Button>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Rechercher une ressource..."
                                className="pl-8 sm:w-[200px] md:w-[300px]"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Button onClick={handleAddResource} className="notion-gradient text-white">
                            <Plus className="w-4 h-4 mr-2" />
                            Nouveau
                        </Button>
                    </div>
                </div>

                <div className="border rounded-lg overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]"><Checkbox /></TableHead>
                                <TableHead>Ressource</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>URL / Note</TableHead>
                                <TableHead>Modification</TableHead>
                                <TableHead>Création</TableHead>
                                <TableHead>Assigné à</TableHead>
                                <TableHead>Famille</TableHead>
                                <TableHead>Sous-Famille</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={9} className="h-24 text-center">Chargement des ressources...</TableCell></TableRow>
                            ) : filteredResources.length > 0 ? (
                                filteredResources.map(resource => (
                                    <TableRow key={resource.id}>
                                        <TableCell><Checkbox /></TableCell>
                                        <TableCell className="font-medium flex items-center gap-2">
                                            {getFileIcon(resource.format)}
                                            {resource.name}
                                        </TableCell>
                                        <TableCell>{resource.type}</TableCell>
                                        <TableCell>
                                            {resource.url ? <a href={resource.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline truncate max-w-[150px] block">{resource.url}</a> : null}
                                            {resource.content ? <p className="truncate max-w-[150px]">{resource.content}</p> : null}
                                        </TableCell>
                                        <TableCell>{new Date(resource.updated_at).toLocaleDateString('fr-FR')}</TableCell>
                                        <TableCell>{new Date(resource.created_at).toLocaleDateString('fr-FR')}</TableCell>
                                        <TableCell>{resource.assignments?.[0]?.count || 0} personne(s)</TableCell>
                                        <TableCell>{resource.family?.name}</TableCell>
                                        <TableCell>{resource.subfamily?.name}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={9} className="h-24 text-center">Aucune ressource trouvée.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
              </div>
            </main>
          </div>
        </>
      );
    };

    export default ResourcesPage;