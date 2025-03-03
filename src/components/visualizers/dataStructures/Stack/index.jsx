import React, { useState, useCallback, useEffect, useRef, createContext, useContext } from 'react';
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
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import styles from './styles.module.css';

// Constants
const NODE_RADIUS = 30;
const ADD_BUTTON_THRESHOLD = 100;
const STACK_X = 50;
const STACK_BASE_Y = 100;
const HEIGHT = 50;
const THRESHOLD = 20;

// Context to share state setters
const NodesEdgesContext = createContext();

// CustomNode for graph nodes
const CustomNode = ({ data, id }) => {
  const [showAddButton, setShowAddButton] = useState(false);
  const [addButtonPos, setAddButtonPos] = useState({ x: 0, y: 0 });
  const nodeRef = useRef(null);
  const { getNode } = useReactFlow();
  const { setNodes, setEdges } = useContext(NodesEdgesContext);
  const mouseMoveThrottleRef = useRef(null);

  const handleMouseMove = useCallback((e) => {
    if (!nodeRef.current) return;
    if (mouseMoveThrottleRef.current) return;
    mouseMoveThrottleRef.current = true;

    requestAnimationFrame(() => {
      const rect = nodeRef.current.getBoundingClientRect();
      const nodeCenter = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
      const dx = e.clientX - nodeCenter.x;
      const dy = e.clientY - nodeCenter.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance >= 35 && distance <= 80) {
        const angle = Math.atan2(dy, dx);
        setAddButtonPos({ x: Math.cos(angle) * 60, y: Math.sin(angle) * 60 });
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
        y: rect.top + rect.height / 2,
      };
      const dx = e.clientX - nodeCenter.x;
      const dy = e.clientY - nodeCenter.y;
      const clickAngle = Math.atan2(dy, dx);
      const snappedAngle = Math.round(clickAngle / (Math.PI / 4)) * (Math.PI / 4);

      const parentNode = getNode(id);
      const newNodeId = `node-${Date.now()}`;
      const newNode = {
        id: newNodeId,
        type: 'custom',
        data: { label: '' },
        position: {
          x: parentNode.position.x + Math.cos(snappedAngle) * 100,
          y: parentNode.position.y + Math.sin(snappedAngle) * 100,
        },
      };

      setNodes((nodes) => [...nodes, newNode]);
      setEdges((edges) => [
        ...edges,
        {
          id: `e${id}-${newNodeId}`,
          source: id,
          target: newNodeId,
          sourceHandle: 'bottom',
          targetHandle: 'top',
        },
      ]);
    }
  };

  return (
    <div
      ref={nodeRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleNodeAreaClick}
      className={styles.nodeWrapper}
    >
      <div className={styles.node}>
        <Handle id="top" type="target" position={Position.Top} style={{ opacity: 0 }} />
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
          className={styles.nodeInput}
        />
        <Handle id="bottom" type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      </div>
      {showAddButton && (
        <div
          className={`${styles.addButtonIndicator} ${styles.fadeIn}`}
          style={{ transform: `translate(${addButtonPos.x}px, ${addButtonPos.y}px)` }}
        >
          +
        </div>
      )}
    </div>
  );
};

// StackNode for stack elements
const StackNode = ({ data }) => {
  return (
    <div
      style={{
        width: 100,
        height: 40,
        background: '#eee',
        border: '1px solid #333',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {data.label}
    </div>
  );
};

// Node types
const nodeTypes = {
  custom: CustomNode,
  stackNode: StackNode,
};

// Initial nodes and edges
const initialNodes = [
  { id: '1', position: { x: 250, y: 200 }, data: { label: '' }, type: 'custom' },
];
const initialEdges = [];

// GraphVisualizerContent component
const GraphVisualizerContent = ({ onBack }) => {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [stackOrder, setStackOrder] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [showAddButton, setShowAddButton] = useState(false);

  const onNodesChange = useCallback((changes) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, []);

  const onEdgesChange = useCallback((changes) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, []);

  const onConnect = useCallback(
    (params) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: 'smoothstep',
            sourceHandle: 'bottom',
            targetHandle: 'top',
            markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20, color: '#333' },
          },
          eds
        )
      ),
    []
  );

  const calculateStackPositions = useCallback((stackOrder) => {
    const positions = {};
    stackOrder.forEach((nodeId, index) => {
      positions[nodeId] = { x: STACK_X, y: STACK_BASE_Y + index * HEIGHT };
    });
    return positions;
  }, []);

  useEffect(() => {
    const positions = calculateStackPositions(stackOrder);
    setNodes((nds) =>
      nds.map((node) => {
        if (stackOrder.includes(node.id)) {
          return {
            ...node,
            position: positions[node.id],
            draggable: node.id === stackOrder[0],
          };
        }
        return node;
      })
    );
  }, [stackOrder, calculateStackPositions]);

  const pushToStack = useCallback((value) => {
    if (!value.trim()) return;
    const newNodeId = `stack-${Date.now()}`;
    const newNode = {
      id: newNodeId,
      type: 'stackNode',
      data: { label: value },
      position: { x: STACK_X, y: STACK_BASE_Y },
      draggable: true,
    };
    setNodes((nds) => [...nds, newNode]);
    setStackOrder((order) => [newNodeId, ...order]);
    setInputValue('');
  }, []);

  const popFromStack = useCallback(() => {
    if (stackOrder.length === 0) return;
    const topId = stackOrder[0];
    setNodes((nds) => nds.filter((node) => node.id !== topId));
    setStackOrder((order) => order.slice(1));
  }, [stackOrder]);

  const onNodeDragStop = useCallback(
    (event, node) => {
      if (node.type === 'stackNode' && node.id === stackOrder[0]) {
        if (Math.abs(node.position.x - STACK_X) > THRESHOLD) {
          popFromStack();
        } else {
          setNodes((nds) =>
            nds.map((n) => {
              if (n.id === node.id) {
                return { ...n, position: { x: STACK_X, y: STACK_BASE_Y } };
              }
              return n;
            })
          );
        }
      }
    },
    [stackOrder, popFromStack]
  );

  const handleMouseMove = useCallback(
    (event) => {
      const bounds = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - bounds.left;
      const y = event.clientY - bounds.top;
      setMousePos({ x, y });

      const farEnough = nodes.every((node) => {
        const dx = node.position.x - x;
        const dy = node.position.y - y;
        return Math.sqrt(dx * dx + dy * dy) > ADD_BUTTON_THRESHOLD;
      });
      setShowAddButton(farEnough);
    },
    [nodes]
  );

  const handleAddNodeClick = useCallback(() => {
    const newNode = {
      id: `node-${nodes.length + 1}`,
      position: mousePos,
      data: { label: `Node ${nodes.length + 1}` },
      type: 'custom',
    };
    setNodes([...nodes, newNode]);
    setShowAddButton(false);
  }, [nodes, mousePos]);

  return (
    <NodesEdgesContext.Provider value={{ setNodes, setEdges }}>
      <div className={styles.visualizer}>
        <div className={styles.controls}>
          <button onClick={onBack} className={styles.btn}>
            Back
          </button>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Enter value"
            className={styles.input}
          />
          <button onClick={() => pushToStack(inputValue)} className={styles.btn}>
            Push
          </button>
        </div>
        <div className={styles.graphContainer} style={{ width: '100%', height: '600px' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            onNodeDragStop={onNodeDragStop}
            fitView
          >
            <Background />
            <Controls />
          </ReactFlow>
          <div
            className={styles.overlay}
            onMouseMove={handleMouseMove}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}
          >
            {showAddButton && (
              <button
                className={styles.addButton}
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
    </NodesEdgesContext.Provider>
  );
};

// GraphVisualizer wrapper
const GraphVisualizer = (props) => {
  return (
    <ReactFlowProvider>
      <GraphVisualizerContent {...props} />
    </ReactFlowProvider>
  );
};

export default GraphVisualizer;