import { v4 as uuidv4 } from 'uuid';
import dagre from 'dagre';

export const calculateParcoursStats = (nodes, edges) => {
    const connectedNodeIds = new Set();
    if (nodes.length > 0) {
        const queue = ['start'];
        const visited = new Set(['start']);
        while (queue.length > 0) {
            const currentNodeId = queue.shift();
            if(currentNodeId) connectedNodeIds.add(currentNodeId);
            edges.forEach(edge => {
                if (edge.source === currentNodeId && !visited.has(edge.target)) {
                    visited.add(edge.target);
                    queue.push(edge.target);
                }
            });
        }
    }

    const connectedNodes = nodes.filter(node => connectedNodeIds.has(node.id) && node.id !== 'start');
    const moduleCount = connectedNodes.length;
    const totalMinutes = connectedNodes.reduce((sum, node) => sum + (node.data.duration * 45), 0);
    const totalHours = (totalMinutes / 60).toFixed(1);

    const families = new Set(connectedNodes.map(n => n.data.family_name));
    let parcoursType = '';
    if (families.has('Apprendre') && families.has('Construire')) {
      parcoursType = 'Le parcours idéal pour apprendre et créer ensemble !';
    } else if (families.has('Apprendre')) {
      parcoursType = 'Parfait pour apprendre Notion, construire viendra après !';
    } else if (families.has('Construire')) {
      parcoursType = 'Un projet de construction en vue !';
    }

    return { moduleCount, totalHours, parcoursType, connectedNodes };
};

export const generateParcoursData = (user, parcoursName, nodes, edges, parcoursType, totalHours) => {
    const { connectedNodes } = calculateParcoursStats(nodes, edges);
    const programData = connectedNodes.map(n => ({
      title: n.data.title,
      duration: `${n.data.duration * 45} min`,
      content: [{ value: n.data.description }]
    }));
    const objectivesData = connectedNodes.map(n => ({ value: `Maîtriser le module : ${n.data.title}` }));

    return {
      author_id: user.id,
      title: parcoursName,
      nodes: nodes,
      edges: edges,
      description: parcoursType || "Un parcours de formation personnalisé sur Notion.",
      objectives: objectivesData,
      program: programData,
      duration_text: `${totalHours}h`,
      course_type: 'custom',
      status: 'preparation',
    };
};

export const createNewModuleNode = (moduleData, family) => ({
  id: uuidv4(),
  type: 'default',
  position: moduleData.position || { x: Math.random() * 400 + 100, y: Math.random() * 200 + 100 },
  data: { ...moduleData, family_name: family.name, family_icon: family.icon },
});

export const performAutoLayout = (nodes, edges) => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: 'LR', nodesep: 50, ranksep: 100 });

    nodes.forEach((node) => {
      dagreGraph.setNode(node.id, { width: node.width || 250, height: node.height || 150 });
    });

    edges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    return nodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      return {
        ...node,
        position: {
          x: nodeWithPosition.x - (node.width || 250) / 2,
          y: nodeWithPosition.y - (node.height || 150) / 2,
        },
      };
    });
};