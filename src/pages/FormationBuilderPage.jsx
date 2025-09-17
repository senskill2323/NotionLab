import React, { useState, useRef, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import ReactFlow, { ReactFlowProvider, Background, Controls, MiniMap, useReactFlow } from 'reactflow';
import 'reactflow/dist/style.css';
import { useFormationBuilder } from '@/hooks/useFormationBuilder';
import { ModuleCatalog } from '@/components/builder/ModuleCatalog';
import { BuilderHeader } from '@/components/builder/BuilderHeader';
import StartNode from '@/components/builder/StartNode';
import ModuleNode from '@/components/builder/CustomNode';
import CustomEdge from '@/components/builder/CustomEdge';
import { Loader2 } from 'lucide-react';
import { BuilderWelcomeScreen } from '@/components/builder/BuilderWelcomeScreen';
import { useParams } from 'react-router-dom';
import { BuilderControls } from '@/components/builder/BuilderControls';
import ZoomIndicator from '@/components/builder/ZoomIndicator';

const nodeTypes = {
  startNode: StartNode,
  moduleNode: ModuleNode,
};

const edgeTypes = {
  custom: CustomEdge,
};

const FormationBuilderContent = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  handleAddModule,
  handleDeleteSelected,
  handleDuplicateSelected,
  handleAutoLayout,
  undo,
  redo,
  canUndo,
  canRedo,
}) => {
  const reactFlowWrapper = useRef(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const { getNodes } = useReactFlow();

  const handleDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setIsDragging(true);
    try {
      const hasData = !!event.dataTransfer.types?.includes('application/reactflow');
      console.debug('[Builder] ReactFlow onDragOver', { hasData, types: event.dataTransfer.types });
    } catch {}
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((event) => {
    event.preventDefault();
    setIsDragging(false);

    if (!reactFlowInstance) return;

    const dataString = event.dataTransfer.getData('application/reactflow');
    if (!dataString) return;

    const data = JSON.parse(dataString);
    const position = reactFlowInstance.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });
    try {
      console.debug('[Builder] ReactFlow onDrop', { data, position });
    } catch {}
    handleAddModule(data.moduleData, data.family, position);
  }, [reactFlowInstance, handleAddModule]);

  return (
    <div className="flex h-full">
      <aside className="w-1/4 min-w-[350px] max-w-[450px] border-r bg-background/50 h-full overflow-y-auto">
        <ModuleCatalog onAddModuleToFlow={handleAddModule} />
      </aside>
      <main className="flex-1 h-full" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={setReactFlowInstance}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          className="bg-background"
          deleteKeyCode={['Backspace', 'Delete']}
          onNodesDelete={handleDeleteSelected}
          snapToGrid={true}
          snapGrid={[16, 16]}
          fitViewOptions={{ padding: 0.2 }}
        >
          <BuilderControls 
            onClean={() => handleAutoLayout(false)}
            onUndo={undo}
            onRedo={redo}
            canUndo={canUndo}
            canRedo={canRedo}
            onDelete={handleDeleteSelected}
            onDuplicate={handleDuplicateSelected}
          />
          <Background variant="dots" gap={16} size={1} />
          <Controls />
          <MiniMap />
          <ZoomIndicator />
          {isDragging && (
            <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded-lg pointer-events-none z-10">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary font-semibold">
                Déposez ici pour ajouter le module
              </div>
            </div>
          )}
        </ReactFlow>
      </main>
    </div>
  );
};

const Builder = () => {
  const { id: parcoursId } = useParams();
  const builderState = useFormationBuilder();

  return (
    <div className="h-screen flex flex-col bg-background">
      <Helmet>
        <title>{builderState.parcours ? `Éditeur: ${builderState.parcours.title}` : "Builder de Formation"} | Plateforme</title>
      </Helmet>
      
      {parcoursId && !builderState.isLoading && (
        <BuilderHeader 
           parcoursId={parcoursId}
           parcoursName={builderState.parcours?.title || ''}
           handleParcoursNameSave={builderState.handleParcoursNameSave}
           handleSave={builderState.handleSave}
           handleDuplicate={builderState.handleDuplicateParcours}
           handleDelete={builderState.handleDeleteParcours}
           handleCloseAndReturn={builderState.handleCloseAndReturn}
           moduleCount={builderState.moduleCount}
           totalHours={builderState.totalHours}
           handleSubmitForValidation={builderState.handleSubmitForValidation}
        />
      )}

      <div className="flex-1 min-h-0 relative">
        {builderState.isLoading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
          </div>
        )}

        {!parcoursId && !builderState.isLoading && (
          <BuilderWelcomeScreen userParcours={builderState.userParcours} onCreateNew={builderState.handleCreateNewParcours} />
        )}

        {parcoursId && (
          <div className={`h-full ${builderState.isLoading ? 'opacity-0' : 'opacity-100'}`}>
            <FormationBuilderContent {...builderState} />
          </div>
        )}
      </div>
    </div>
  );
}


const FormationBuilderPage = () => {
  return (
    <ReactFlowProvider>
      <Builder />
    </ReactFlowProvider>
  );
};

export default FormationBuilderPage;