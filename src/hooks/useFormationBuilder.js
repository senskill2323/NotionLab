import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNodesState, useEdgesState, addEdge, useReactFlow, getRectOfNodes } from 'reactflow';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useParams, useNavigate } from 'react-router-dom';
import { useDebouncedCallback } from 'use-debounce';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import dagre from 'dagre';

const initialNodes = [
  { 
    id: 'start', 
    type: 'startNode', 
    position: { x: 25, y: 50 }, 
    data: { label: 'Début du parcours' },
    draggable: false,
    selectable: false,
    deletable: false,
  }
];

const initialEdges = [];

const MIN_X_POSITION = 300;

const useUndoRedo = (setNodes, setEdges) => {
    const [history, setHistory] = useState([{ nodes: [], edges: [] }]);
    const [currentIndex, setCurrentIndex] = useState(0);

    const recordHistory = useCallback((nodes, edges) => {
        const newHistory = history.slice(0, currentIndex + 1);
        newHistory.push({ nodes, edges });
        setHistory(newHistory);
        setCurrentIndex(newHistory.length - 1);
    }, [history, currentIndex]);

    const undo = useCallback(() => {
        if (currentIndex > 0) {
            const newIndex = currentIndex - 1;
            const { nodes, edges } = history[newIndex];
            setNodes(nodes);
            setEdges(edges);
            setCurrentIndex(newIndex);
        }
    }, [currentIndex, history, setNodes, setEdges]);

    const redo = useCallback(() => {
        if (currentIndex < history.length - 1) {
            const newIndex = currentIndex + 1;
            const { nodes, edges } = history[newIndex];
            setNodes(nodes);
            setEdges(edges);
            setCurrentIndex(newIndex);
        }
    }, [currentIndex, history, setNodes, setEdges]);

    return { recordHistory, undo, redo, canUndo: currentIndex > 0, canRedo: currentIndex < history.length - 1 };
};


export const useFormationBuilder = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [parcours, setParcours] = useState(null);
  const [userParcours, setUserParcours] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { id: parcoursId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getNodes, getEdges, setViewport, fitView } = useReactFlow();
  const { recordHistory, undo, redo, canUndo, canRedo } = useUndoRedo(setNodes, setEdges);

  useEffect(() => {
    recordHistory(nodes, edges);
  }, [nodes, edges]);

  const handleAutoLayout = useCallback((isInitial = false) => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: 'LR', nodesep: 70, ranksep: 120 });

    const currentNodes = getNodes();
    const currentEdges = getEdges();
    
    const layoutNodes = currentNodes.filter(n => n.id !== 'start');
    const startNode = currentNodes.find(n => n.id === 'start');

    if (!startNode) return;

    layoutNodes.forEach((node) => {
      dagreGraph.setNode(node.id, { width: 225, height: 120 });
    });

    currentEdges.forEach((edge) => {
      if (dagreGraph.hasNode(edge.source) && dagreGraph.hasNode(edge.target)) {
        dagreGraph.setEdge(edge.source, edge.target);
      }
    });

    dagre.layout(dagreGraph);

    const newNodes = layoutNodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      return {
        ...node,
        position: {
          x: nodeWithPosition.x - 225 / 2 + MIN_X_POSITION,
          y: nodeWithPosition.y - 120 / 2,
        },
      };
    });

    const allLaidOutNodes = [startNode, ...newNodes];
    setNodes(allLaidOutNodes);

    if (isInitial) {
      setTimeout(() => {
        setViewport({ x: 61.2, y: 36.2, zoom: 0.93 }, { duration: 800 });
      }, 100);
    } else {
       setTimeout(() => fitView({ padding: 0.2, duration: 800 }), 100);
    }
  }, [getNodes, getEdges, setNodes, setViewport, fitView]);

  const fetchUserParcours = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('courses')
      .select('id, title, updated_at')
      .eq('author_id', user.id)
      .eq('course_type', 'custom')
      .order('updated_at', { ascending: false });

    if (error) {
      toast({ title: "Erreur", description: "Impossible de charger vos parcours existants.", variant: "destructive" });
    } else {
      setUserParcours(data);
    }
  }, [user, toast]);

  const fetchParcours = useCallback(async () => {
    if (!parcoursId) {
      setNodes(initialNodes);
      setEdges(initialEdges);
      setParcours(null);
      await fetchUserParcours();
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('id', parcoursId)
      .single();

    if (error) {
      toast({ title: "Erreur", description: "Impossible de charger le parcours.", variant: "destructive" });
      navigate('/formation-builder');
    } else if (data) {
      setParcours(data);
      if (data.nodes && data.nodes.length > 0) {
        const startNodeExists = data.nodes.some(n => n.id === 'start');
        const nodesWithLockedStart = data.nodes.map(n => n.id === 'start' ? { ...n, ...initialNodes[0] } : n);
        setNodes(startNodeExists ? nodesWithLockedStart : [...initialNodes, ...data.nodes]);
      } else {
        setNodes(initialNodes);
      }
      setEdges(data.edges || []);
      
      setTimeout(() => handleAutoLayout(true), 50);
    }
    setIsLoading(false);
  }, [parcoursId, setNodes, setEdges, toast, navigate, fetchUserParcours, handleAutoLayout]);

  useEffect(() => {
    fetchParcours();
  }, [fetchParcours]);

  const onConnect = useCallback((params) => setEdges((eds) => addEdge({...params, type: 'custom'}, eds)), [setEdges]);

  const handleAddModule = useCallback((moduleData, family, position) => {
    const newNode = {
      id: `module-${uuidv4()}`,
      type: 'moduleNode',
      position: { x: 0, y: 0 },
      data: {
        moduleId: moduleData.id,
        title: moduleData.title,
        description: moduleData.description,
        duration: moduleData.duration,
        family_name: family.name,
        family_icon: family.icon || 'BrainCircuit',
      },
    };

    if (position) {
      newNode.position = {
        x: Math.max(position.x, MIN_X_POSITION),
        y: position.y,
      };
    } else {
      const moduleNodes = getNodes().filter(n => n.type === 'moduleNode');
      if (moduleNodes.length > 0) {
        const lastNode = moduleNodes.reduce((max, node) => (node.position.y > max.position.y ? node : max), moduleNodes[0]);
        newNode.position = { x: MIN_X_POSITION, y: lastNode.position.y + 120 };
      } else {
        newNode.position = { x: MIN_X_POSITION, y: 50 };
      }
    }

    setNodes((nds) => nds.concat(newNode));
  }, [setNodes, getNodes]);

  const handleSave = useCallback(async ({ withToast = true } = {}) => {
    if (!parcoursId) return;
    setIsSaving(true);
    const currentParcours = getNodes();
    const currentEdges = getEdges();
    const { error } = await supabase
      .from('courses')
      .update({ nodes: currentParcours, edges: currentEdges, updated_at: new Date().toISOString() })
      .eq('id', parcoursId);

    setIsSaving(false);
    if (error) {
      if (withToast) toast({ title: "Erreur de sauvegarde", description: error.message, variant: "destructive" });
    } else {
      if (withToast) toast({ title: "Sauvegardé", description: "Votre parcours a été sauvegardé." });
    }
  }, [parcoursId, getNodes, getEdges, toast]);

  const debouncedSave = useDebouncedCallback(() => handleSave({ withToast: false }), 1500);

  useEffect(() => {
    if (parcoursId && !isLoading) {
      debouncedSave();
    }
  }, [nodes, edges, parcoursId, isLoading, debouncedSave]);

  const handleParcoursNameSave = useCallback(async (newName) => {
    if (!parcoursId || !newName) return;
    setParcours(p => ({ ...p, title: newName }));
    const { error } = await supabase.from('courses').update({ title: newName }).eq('id', parcoursId);
    if (error) {
      toast({ title: "Erreur", description: "Impossible de renommer le parcours.", variant: "destructive" });
      fetchParcours();
    } else {
      toast({ title: "Renommé", description: "Le parcours a été renommé avec succès." });
    }
  }, [parcoursId, toast, fetchParcours]);

  const handleCloseAndReturn = useCallback(() => {
    navigate('/dashboard');
  }, [navigate]);

  const handleSubmitForValidation = useCallback(async () => {
    if (!parcoursId) return;
    try {
      // Ensure latest graph is saved before submission
      await handleSave({ withToast: false });
      const { error } = await supabase.rpc('submit_course_for_validation', { p_course_id: parcoursId });
      if (error) throw error;
      toast({ title: 'Demande envoyée', description: 'Votre formation a été soumise pour validation. Vous verrez "Démarré" après approbation.' });
    } catch (e) {
      toast({ title: 'Erreur', description: `Soumission impossible: ${e.message}`, variant: 'destructive' });
    }
  }, [parcoursId, handleSave, toast]);

  const handleCreateNewParcours = async () => {
    if (!user) return;
    const newParcoursTitle = `Nouvelle formation Sans Titre...`;
    const { data, error } = await supabase
      .from('courses')
      .insert({
        title: newParcoursTitle,
        author_id: user.id,
        status: 'draft',
        course_type: 'custom',
        nodes: initialNodes,
        edges: initialEdges,
      })
      .select('id')
      .single();

    if (error) {
      toast({ title: "Erreur", description: "Impossible de créer le nouveau parcours.", variant: "destructive" });
    } else {
      toast({ title: "Créé !", description: "Votre nouveau parcours est prêt." });
      navigate(`/formation-builder/${data.id}`);
    }
  };

  const handleDeleteSelected = useCallback(() => {
    const selectedNodes = getNodes().filter(n => n.selected && n.id !== 'start');
    const selectedEdges = getEdges().filter(e => e.selected);
    
    const nodeIdsToDelete = selectedNodes.map(n => n.id);
    
    setNodes(nds => nds.filter(n => !n.selected || n.id === 'start'));
    setEdges(eds => eds.filter(e => !selectedEdges.includes(e) && !nodeIdsToDelete.includes(e.source) && !nodeIdsToDelete.includes(e.target)));
  }, [getNodes, getEdges, setNodes, setEdges]);

  const handleDuplicateSelected = useCallback(() => {
    const selectedNodes = getNodes().filter(n => n.selected && n.id !== 'start');
    if (selectedNodes.length === 0) return;

    const newNodes = selectedNodes.map(node => {
      const newNode = JSON.parse(JSON.stringify(node));
      newNode.id = `module-${uuidv4()}`;
      newNode.position.x += 20;
      newNode.position.y += 20;
      newNode.selected = false;
      return newNode;
    });

    setNodes(nds => nds.concat(newNodes));
  }, [getNodes, setNodes]);

  const handleDuplicateParcours = useCallback(async () => {
    if (!parcours) return;
    const newTitle = `Copie de ${parcours.title}`;
    const { data, error } = await supabase
      .from('courses')
      .insert({
        ...parcours,
        id: undefined,
        created_at: undefined,
        updated_at: undefined,
        title: newTitle,
        status: 'draft',
      })
      .select('id')
      .single();

    if (error) {
      toast({ title: "Erreur", description: "Impossible de dupliquer le parcours.", variant: "destructive" });
    } else {
      toast({ title: "Dupliqué !", description: `Le parcours a été dupliqué sous le nom "${newTitle}".` });
      navigate(`/formation-builder/${data.id}`);
    }
  }, [parcours, navigate, toast]);

  const handleDeleteParcours = useCallback(async () => {
    if (!parcoursId) return;
    const { error } = await supabase.from('courses').delete().eq('id', parcoursId);
    if (error) {
      toast({ title: "Erreur", description: "Impossible de supprimer le parcours.", variant: "destructive" });
    } else {
      toast({ title: "Supprimé", description: "Le parcours a été supprimé." });
      navigate('/formation-builder');
    }
  }, [parcoursId, navigate, toast]);

  const getConnectedModules = useCallback(() => {
    const startNode = nodes.find(n => n.id === 'start');
    if (!startNode) return new Set();

    const visited = new Set();
    const queue = ['start'];
    
    while (queue.length > 0) {
      const currentNodeId = queue.shift();
      if (visited.has(currentNodeId)) continue;
      
      visited.add(currentNodeId);
      
      // Trouver tous les nœuds connectés à partir du nœud actuel
      const connectedEdges = edges.filter(edge => edge.source === currentNodeId);
      connectedEdges.forEach(edge => {
        if (!visited.has(edge.target)) {
          queue.push(edge.target);
        }
      });
    }
    
    // Retourner seulement les modules (exclure le nœud start)
    visited.delete('start');
    return visited;
  }, [nodes, edges]);

  const moduleCount = useMemo(() => nodes.filter(n => n.type === 'moduleNode').length, [nodes]);

  const totalHours = useMemo(() => {
    const connectedModuleIds = getConnectedModules();
    const totalMinutes = nodes
      .filter(n => n.type === 'moduleNode' && connectedModuleIds.has(n.id))
      .reduce((sum, node) => sum + (node.data.duration || 0), 0);
    return Math.round(totalMinutes / 60 * 10) / 10;
  }, [nodes, edges, getConnectedModules]);

  return {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    handleAddModule,
    handleSave,
    handleParcoursNameSave,
    handleCloseAndReturn,
    handleSubmitForValidation,
    handleCreateNewParcours,
    handleDuplicateParcours,
    handleDeleteParcours,
    parcours,
    userParcours,
    isSaving,
    isLoading,
    moduleCount,
    totalHours,
    handleDeleteSelected,
    handleDuplicateSelected,
    handleAutoLayout,
    undo,
    redo,
    canUndo,
    canRedo,
  };
};
