import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import ReactFlow, { 
  ReactFlowProvider,
  Controls, 
  Background,
  useReactFlow,
  applyNodeChanges,
  applyEdgeChanges,
  Handle,
  Position
} from 'reactflow';
import 'reactflow/dist/style.css';
import styles from './styles.module.css';

// Define CustomNode component
const CustomNode = React.memo(({ data, id }) => {
  const [hoveredNode, setHoveredNode] = useState(false);

  return (
    <div 
      className={`${styles.nodeWrapper}`}
      onMouseEnter={() => setHoveredNode(true)}
      onMouseLeave={() => setHoveredNode(false)}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <div className={`${styles.node} ${data.isRoot ? styles.root : ''}`}>
        <input
          type="text"
          value={data.label}
          onChange={(e) => data.onChange(id, e.target.value)}
          className={styles.nodeInput}
          onClick={(e) => e.stopPropagation()}
          placeholder="?"
        />
      </div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      
      {hoveredNode && !data.leftChildId && (
        <button
          className={`${styles.addBtn} ${styles.addBtnLeft}`}
          onClick={(e) => {
            e.stopPropagation();
            data.onAddChild(id, 'left');
          }}
        >
          +
        </button>
      )}
      {hoveredNode && !data.rightChildId && (
        <button
          className={`${styles.addBtn} ${styles.addBtnRight}`}
          onClick={(e) => {
            e.stopPropagation();
            data.onAddChild(id, 'right');
          }}
        >
          +
        </button>
      )}
    </div>
  );
});

CustomNode.displayName = 'CustomNode';

// Define nodeTypes outside of the component
const nodeTypes = {
  custom: CustomNode
};

// Main component content
const TreeVisualizerContent = ({ onActivate, onBack }) => {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const LEVEL_HEIGHT = 120;
  const NODE_WIDTH = 50;

  const getSubtreeWidth = useCallback((nodeId, level) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return 0;
    
    const spacing = Math.pow(2, level) * NODE_WIDTH * 1.5;
    
    if (!node.data.leftChildId && !node.data.rightChildId) {
      return spacing;
    }
    
    const leftWidth = node.data.leftChildId ? getSubtreeWidth(node.data.leftChildId, level + 1) : 0;
    const rightWidth = node.data.rightChildId ? getSubtreeWidth(node.data.rightChildId, level + 1) : 0;
    
    return Math.max(spacing, leftWidth + rightWidth);
  }, [nodes]);

  const calculateNodePosition = useCallback((parentNode, isLeft) => {
    const level = parentNode.position.y / LEVEL_HEIGHT + 1;
    const subtreeWidth = getSubtreeWidth(parentNode.id, level);
    const horizontalOffset = subtreeWidth / 2;
    
    return {
      x: parentNode.position.x + (isLeft ? -horizontalOffset : horizontalOffset),
      y: parentNode.position.y + LEVEL_HEIGHT
    };
  }, [getSubtreeWidth]);

  const onNodesChange = useCallback((changes) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, []);

  const onEdgesChange = useCallback((changes) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, []);

  const handleNodeLabelChange = useCallback((nodeId, newValue) => {
    setNodes(nds => 
      nds.map(node => 
        node.id === nodeId 
          ? { ...node, data: { ...node.data, label: newValue } }
          : node
      )
    );
  }, []);

  const addChild = useCallback((parentId, side) => {
    setNodes(currentNodes => {
      const parent = currentNodes.find(n => n.id === parentId);
      if (!parent) return currentNodes;

      const isLeft = side === 'left';
      if (isLeft && parent.data.leftChildId) return currentNodes;
      if (!isLeft && parent.data.rightChildId) return currentNodes;

      const newNodeId = `node-${currentNodes.length + 1}`;
      const position = calculateNodePosition(parent, isLeft);

      const newNode = {
        id: newNodeId,
        type: 'custom',
        position,
        data: {
          label: (currentNodes.length + 1).toString(),
          isRoot: false,
          parentId,
          leftChildId: null,
          rightChildId: null,
          onAddChild: addChild,
          onChange: handleNodeLabelChange
        }
      };

      const updatedParent = {
        ...parent,
        data: {
          ...parent.data,
          [isLeft ? 'leftChildId' : 'rightChildId']: newNodeId
        }
      };

      const updatedNodes = currentNodes.map(n => 
        n.id === parentId ? updatedParent : n
      ).concat(newNode);

      setEdges(eds => [
        ...eds,
        {
          id: `e${parentId}-${newNodeId}`,
          source: parentId,
          target: newNodeId,
          type: 'smoothstep'
        }
      ]);

      return updatedNodes;
    });
  }, [calculateNodePosition]);

  // Initialize root node
  useEffect(() => {
    if (nodes.length === 0) {
      const rootNode = {
        id: 'node-1',
        type: 'custom',
        position: { x: window.innerWidth / 2, y: 50 },
        data: {
          label: '1',
          isRoot: true,
          parentId: null,
          leftChildId: null,
          rightChildId: null,
          onAddChild: addChild,
          onChange: handleNodeLabelChange
        }
      };
      setNodes([rootNode]);
      if (onActivate) onActivate();
    }
  }, []);

  return (
    <div className={styles.visualizer}>
      <div className={styles.container}>
        <div className={styles.controls}>
          <button className={styles.backBtn} onClick={onBack}>
            Back to Home
          </button>
        </div>
        <div className={styles.area}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
          >
            <Background />
            <Controls />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
};

// Wrap with ReactFlowProvider
const TreeVisualizer = (props) => {
  return (
    <ReactFlowProvider>
      <TreeVisualizerContent {...props} />
    </ReactFlowProvider>
  );
};

export default TreeVisualizer; 