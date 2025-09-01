import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Helmet } from 'react-helmet';
import ReactFlow, { Background, Controls, MiniMap } from 'reactflow';
import CustomNode from '@/components/builder/CustomNode';
import 'reactflow/dist/style.css';
import { Loader2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const nodeTypes = {
  custom: CustomNode,
};

const ParcoursDetailPage = () => {
  const { id } = useParams();
  const [parcours, setParcours] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchParcours = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: rpcError } = await supabase.rpc('get_user_approved_parcours_snapshot', { p_course_id: id });
        if (rpcError) throw rpcError;
        
        if (data) {
          setParcours(data);
          setNodes(data.nodes || []);
          setEdges(data.edges || []);
        } else {
          throw new Error("Parcours non trouvé ou non accessible.");
        }
      } catch (err) {
        console.error('Erreur lors du chargement du parcours:', err);
        setError(err.message);
        toast({ title: 'Erreur', description: 'Impossible de charger le parcours validé.', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchParcours();
    }
  }, [id, toast]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-screen text-center p-4">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">Erreur de chargement</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Link to="/dashboard">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour au tableau de bord
          </Button>
        </Link>
      </div>
    );
  }

  if (!parcours) {
    return (
        <div className="flex flex-col justify-center items-center h-screen text-center p-4">
            <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Parcours introuvable</h2>
            <p className="text-muted-foreground mb-4">Le parcours que vous cherchez n'existe pas ou vous n'avez pas la permission de le voir.</p>
            <Link to="/dashboard">
                <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour au tableau de bord
                </Button>
            </Link>
        </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{parcours.title} | Mon Parcours</title>
        <meta name="description" content={parcours.description || `Suivez votre parcours personnalisé ${parcours.title}.`} />
      </Helmet>
      <div className="pt-24 h-screen w-screen flex flex-col">
        <header className="px-4 py-2 border-b bg-background/80 backdrop-blur-sm">
            <div className="container mx-auto flex justify-between items-center">
                <div>
                    <h1 className="text-xl font-bold">{parcours.title}</h1>
                    <p className="text-sm text-muted-foreground">{parcours.description}</p>
                </div>
                <Link to="/dashboard">
                    <Button variant="outline">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Retour
                    </Button>
                </Link>
            </div>
        </header>
        <div className="flex-grow">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
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
      </div>
    </>
  );
};

export default ParcoursDetailPage;