import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import ReactFlow, { 
  ReactFlowProvider, 
  Controls, 
  Background, 
  useReactFlow, 
  MarkerType,
  Handle,
  Position
} from 'reactflow';
import 'reactflow/dist/style.css';
import styles from './styles.module.css';

// Custom Node Component with Handles - defined outside component
const CustomNode = ({ data, id }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [leftButtonHovered, setLeftButtonHovered] = useState(false);
  const [rightButtonHovered, setRightButtonHovered] = useState(false);
  const nodeRef = useRef(null);

  // Add a buffer when leaving so we have time to click buttons
  const handleMouseEnter = () => setIsHovered(true);
  
  // Don't immediately remove the hover when the mouse leaves
  const handleMouseLeave = (e) => {
    // Check if we're moving toward one of our buttons
    const nodeRect = nodeRef.current.getBoundingClientRect();
    
    // Don't turn off hover if we're moving toward the buttons
    if (e.clientX < nodeRect.left - 40 || e.clientX > nodeRect.right + 40) {
      // Only deactivate hover after a short delay
      setTimeout(() => {
        setIsHovered(false);
      }, 100);
    } else {
      // Immediately deactivate if not moving toward buttons
      setIsHovered(false);
    }
  };

  return (
    <div
      ref={nodeRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={styles.nodeWrapper}
    >
      {/* Target handle's position changes when left add button is hovered */}
      <Handle 
        type="target" 
        position={Position.Left} 
        className={`${leftButtonHovered ? styles.handleOffset : ''}`}
      />

      <div className={`${styles.node} ${isHovered ? styles.hovered : ''}`}>
        <input
          type="text"
          value={data.label}
          onChange={(e) => {
            e.stopPropagation();
            data.onLabelChange(id, e.target.value);
          }}
          onClick={(e) => e.stopPropagation()}
          className={styles.nodeInput}
          placeholder="?"
        />
      </div>
      
      {/* Source handle's position changes when right add button is hovered */}
      <Handle 
        type="source" 
        position={Position.Right} 
        className={`${rightButtonHovered ? styles.handleOffset : ''}`}
      />
      
      {/* Make buttons always visible but conditional styling */}
      <div className={styles.nodeControls}>
        {isHovered && (
          <button
            className={styles.deleteBtn}
            onClick={(e) => {
              e.stopPropagation();
              data.onDeleteNode(id);
            }}
          >
            ×
          </button>
        )}
        
        <button
          className={`${styles.addButton} ${styles.addButtonLeft} ${isHovered ? styles.visible : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            data.onAddNode(id, 'before');
          }}
          onMouseEnter={() => {
            setLeftButtonHovered(true);
            setIsHovered(true); // Keep hovered state active
          }}
          onMouseLeave={() => setLeftButtonHovered(false)}
        >
          +
        </button>
        
        <button
          className={`${styles.addButton} ${styles.addButtonRight} ${isHovered ? styles.visible : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            data.onAddNode(id, 'after');
          }}
          onMouseEnter={() => {
            setRightButtonHovered(true);
            setIsHovered(true); // Keep hovered state active
          }}
          onMouseLeave={() => setRightButtonHovered(false)}
        >
          +
        </button>
      </div>
    </div>
  );
};

// Define nodeTypes outside of components
const nodeTypes = { custom: CustomNode };

const LinkedListVisualizer = ({ onBack }) => {
  const [nodeOrder, setNodeOrder] = useState(['node-1']);
  const [nodeData, setNodeData] = useState({ 'node-1': { label: '' } });
  const reactFlowInstance = useReactFlow();
  const [initialLayoutDone, setInitialLayoutDone] = useState(false);

  // Compute nodes based on nodeOrder
  const nodes = useMemo(() => {
    return nodeOrder.map((id, index) => ({
      id,
      type: 'custom',
      position: { x: 150 + index * 200, y: 200 },
      draggable: true,
      data: {
        label: nodeData[id]?.label || '',
        onAddNode: (sourceId, direction) => {
          const sourceIndex = nodeOrder.findIndex((nid) => nid === sourceId);
          const newNodeId = `node-${Date.now()}`;
          let newOrder;

          if (direction === 'before') {
            newOrder = [
              ...nodeOrder.slice(0, sourceIndex),
              newNodeId,
              ...nodeOrder.slice(sourceIndex),
            ];
          } else {
            newOrder = [
              ...nodeOrder.slice(0, sourceIndex + 1),
              newNodeId,
              ...nodeOrder.slice(sourceIndex + 1),
            ];
          }

          setNodeOrder(newOrder);
          setNodeData((prev) => ({ ...prev, [newNodeId]: { label: '' } }));
        },
        onDeleteNode: (id) => {
          setNodeOrder((prev) => prev.filter((nid) => nid !== id));
          setNodeData((prev) => {
            const { [id]: _, ...rest } = prev;
            return rest;
          });
        },
        onLabelChange: (id, newLabel) => {
          setNodeData((prev) => ({ ...prev, [id]: { label: newLabel } }));
        },
      },
    }));
  }, [nodeOrder, nodeData]);

  // Compute edges based on nodeOrder
  const edges = useMemo(() => {
    return nodeOrder.slice(0, -1).map((id, index) => ({
      id: `e${id}-${nodeOrder[index + 1]}`,
      source: id,
      target: nodeOrder[index + 1],
      type: 'default',
      animated: false,
      style: { stroke: '#2196F3', strokeWidth: 3 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20,
        color: '#2196F3',
      },
    }));
  }, [nodeOrder]);

  // Set initial layout once
  useEffect(() => {
    if (!initialLayoutDone && reactFlowInstance) {
      reactFlowInstance.setViewport({ x: 0, y: 0, zoom: 1 });
      setInitialLayoutDone(true);
    }
  }, [reactFlowInstance, initialLayoutDone]);

  // Memoize default edge options
  const defaultEdgeOptions = useMemo(() => ({
    type: 'default',
    style: { stroke: '#2196F3', strokeWidth: 3 },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: '#2196F3',
    },
  }), []);

  return (
    <div className={styles.visualizer}>
      <div className={styles.controls}>
        <button onClick={onBack} className={styles.backBtn}>
          Back
        </button>
      </div>
      <div className={styles.graphContainer} style={{ width: '100%', height: '600px' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitViewOptions={{ padding: 0.2 }}
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
          minZoom={0.5}
          maxZoom={1.5}
          defaultEdgeOptions={defaultEdgeOptions}
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
};

// Create a wrapped component to avoid recreating ReactFlowProvider on each render
const WrappedLinkedListVisualizer = ({ onBack }) => (
  <ReactFlowProvider>
    <LinkedListVisualizer onBack={onBack} />
  </ReactFlowProvider>
);

export default WrappedLinkedListVisualizer;