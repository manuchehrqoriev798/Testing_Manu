import React, { useState, useCallback, useMemo, useRef } from 'react';
import ReactFlow, { 
  ReactFlowProvider,
  Controls, 
  Background,
  useReactFlow,
  MarkerType,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Handle,
  Position
} from 'reactflow';
import 'reactflow/dist/style.css';
import './GraphNode.css';

const NODE_RADIUS = 30;
const ADD_BUTTON_THRESHOLD = 100;

// Define CustomNode with proper handles
const CustomNode = ({ data, id }) => {
  const [showAddButton, setShowAddButton] = useState(false);
  const [addButtonPos, setAddButtonPos] = useState({ x: 0, y: 0 });
  const nodeRef = useRef(null);
  const { setNodes, setEdges, getNode } = useReactFlow();
  const mouseMoveThrottleRef = useRef(null);

  const handleMouseMove = useCallback((e) => {
    if (!nodeRef.current) return;

    // Throttle mouse move updates
    if (mouseMoveThrottleRef.current) return;
    mouseMoveThrottleRef.current = true;
    
    requestAnimationFrame(() => {
      const rect = nodeRef.current.getBoundingClientRect();
      const nodeCenter = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };

      const dx = e.clientX - nodeCenter.x;
      const dy = e.clientY - nodeCenter.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance >= 35 && distance <= 80) {
        const angle = Math.atan2(dy, dx);
        setAddButtonPos({
          x: Math.cos(angle) * 60, // Fixed distance for smoother appearance
          y: Math.sin(angle) * 60
        });
        setShowAddButton(true);
      } else {
        setShowAddButton(false);
      }

      mouseMoveThrottleRef.current = false;
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setShowAddButton(false);
  }, []);

  const handleNodeAreaClick = (e) => {
    if (!e.target.classList.contains(styles.nodeInput)) {
      e.stopPropagation();
      
      if (!nodeRef.current) return;

      const rect = nodeRef.current.getBoundingClientRect();
      const nodeCenter = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };

      const dx = e.clientX - nodeCenter.x;
      const dy = e.clientY - nodeCenter.y;
      
      // Calculate angle for the new node
      const clickAngle = Math.atan2(dy, dx);
      const snappedAngle = Math.round(clickAngle / (Math.PI / 4)) * (Math.PI / 4);

      const parentNode = getNode(id);
      const newNodeId = `node-${Date.now()}`;
      
      // Position new node 100px away from parent
      const newNode = {
        id: newNodeId,
        type: 'custom',
        data: { label: '' },
        position: {
          x: parentNode.position.x + Math.cos(snappedAngle) * 100,
          y: parentNode.position.y + Math.sin(snappedAngle) * 100
        }
      };

      setNodes((nodes) => [...nodes, newNode]);
      setEdges((edges) => [...edges, {
        id: `e${id}-${newNodeId}`,
        source: id,
        target: newNodeId,
        sourceHandle: 'bottom',
        targetHandle: 'top'
      }]);
    }
  };

  return (
    <div
      ref={nodeRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleNodeAreaClick}
      className="nodeWrapper"
    >
      <div className="node">
        <Handle 
          id="top"
          type="target" 
          position={Position.Top} 
          style={{ opacity: 0 }}
        />
        <input
          type="text"
          value={data.label}
          onChange={(evt) => {
            evt.stopPropagation();
            setNodes((nds) =>
              nds.map((node) => {
                if (node.id === id) {
                  node.data = { ...node.data, label: evt.target.value };
                }
                return node;
              })
            );
          }}
          onClick={(e) => e.stopPropagation()}
          className="nodeInput"
        />
        <Handle 
          id="bottom"
          type="source" 
          position={Position.Bottom}
          style={{ opacity: 0 }}
        />
      </div>
      {showAddButton && (
        <div 
          className={`${styles.addButtonIndicator} ${styles.fadeIn}`}
          style={{
            transform: `translate(${addButtonPos.x}px, ${addButtonPos.y}px)`
          }}
        >
          +
        </div>
      )}
    </div>
  );
};

// Define nodeTypes outside component
const nodeTypes = {
  custom: CustomNode
};

// Define initial nodes with proper handle configuration
const initialNodes = [
  {
    id: '1',
    position: { x: 250, y: 200 },
    data: { label: '' },
    type: 'custom'
  }
];

// Define initial edges with proper marker settings
const initialEdges = [];

const GraphNode = ({ onBack }) => {
  const reactFlowInstance = useReactFlow();
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [showAddButton, setShowAddButton] = useState(false);

  const onNodesChange = useCallback((changes) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, []);

  const onEdgesChange = useCallback((changes) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, []);

  const onConnect = useCallback((params) => {
    setEdges((eds) => addEdge({
      ...params,
      type: 'smoothstep',
      sourceHandle: 'bottom',
      targetHandle: 'top',
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20,
        color: '#333',
      },
    }, eds));
  }, []);

  const handleMouseMove = useCallback((event) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    setMousePos({ x, y });

    const farEnough = nodes.every(node => {
      const dx = node.position.x - x;
      const dy = node.position.y - y;
      return Math.sqrt(dx * dx + dy * dy) > ADD_BUTTON_THRESHOLD;
    });

    setShowAddButton(farEnough);
  }, [nodes]);

  const handleAddNodeClick = useCallback(() => {
    const newNode = {
      id: `node-${nodes.length + 1}`,
      position: mousePos,
      data: { label: `Node ${nodes.length + 1}` },
      type: 'custom'
    };
    setNodes([...nodes, newNode]);
    setShowAddButton(false);
  }, [nodes, mousePos]);

  return (
    <div className="visualizer">
      <div className="controls">
        <button onClick={onBack} className="btn">
          Back
        </button>
      </div>
      <div className="graphContainer" style={{ width: '100%', height: '600px' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
        <div
          className="overlay"
          onMouseMove={handleMouseMove}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: 'none',
          }}
        >
          {showAddButton && (
            <button
              className="addButton"
              style={{
                position: 'absolute',
                left: mousePos.x,
                top: mousePos.y,
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'auto',
              }}
              onClick={handleAddNodeClick}
            >
              +
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Wrap with ReactFlowProvider
const GraphVisualizer = (props) => {
  return (
    <ReactFlowProvider>
      <GraphVisualizerContent {...props} />
    </ReactFlowProvider>
  );
};

export default GraphNode;
