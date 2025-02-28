import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactFlow, { 
  ReactFlowProvider,
  Controls, 
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  Handle,
  Position
} from 'reactflow';
import 'reactflow/dist/style.css';
import styles from './styles.module.css';

// CustomNode remains unchanged
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

const nodeTypes = { custom: CustomNode };

const TreeVisualizerContent = ({ onActivate, onBack }) => {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const LEVEL_HEIGHT = 120;
  const NODE_WIDTH = 150;

  const getSubtreeWidth = useCallback((nodeId, level) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return 0;
    
    // Base spacing increases with level
    const baseSpacing = Math.pow(2, level) * NODE_WIDTH;
    
    if (!node.data.leftChildId && !node.data.rightChildId) {
      return baseSpacing;
    }
    
    const leftWidth = node.data.leftChildId ? getSubtreeWidth(node.data.leftChildId, level + 1) : 0;
    const rightWidth = node.data.rightChildId ? getSubtreeWidth(node.data.rightChildId, level + 1) : 0;
    
    return Math.max(baseSpacing, leftWidth + rightWidth);
  }, [nodes]);

  const calculateNodePosition = useCallback((parentNode, isLeft, level) => {
    const subtreeWidth = getSubtreeWidth(parentNode.id, level);
    const horizontalOffset = subtreeWidth / 2;
    
    return {
      x: parentNode.position.x + (isLeft ? -horizontalOffset : horizontalOffset),
      y: parentNode.position.y + LEVEL_HEIGHT
    };
  }, [getSubtreeWidth]);

  const updateAffectedNodePositions = useCallback((nodeList, startNodeId) => {
    const getPathToRoot = (nodeId, path = []) => {
      const node = nodeList.find(n => n.id === nodeId);
      if (!node) return path;
      path.push(node.id);
      if (node.data.parentId) {
        return getPathToRoot(node.data.parentId, path);
      }
      return path;
    };

    const affectedNodeIds = getPathToRoot(startNodeId);
    let updatedNodes = [...nodeList];

    const updateSubtree = (nodeId, x, level) => {
      const currentNode = updatedNodes.find(n => n.id === nodeId);
      if (!currentNode) return;

      if (affectedNodeIds.includes(nodeId)) {
        currentNode.position = { x, y: level * LEVEL_HEIGHT };
      }

      const subtreeWidth = getSubtreeWidth(nodeId, level);
      const spacing = subtreeWidth / 2;

      if (currentNode.data.leftChildId) {
        updateSubtree(
          currentNode.data.leftChildId,
          x - spacing,
          level + 1
        );
      }
      if (currentNode.data.rightChildId) {
        updateSubtree(
          currentNode.data.rightChildId,
          x + spacing,
          level + 1
        );
      }
    };

    const highestAffectedNode = nodeList.find(n => n.id === affectedNodeIds[affectedNodeIds.length - 1]);
    const level = Math.floor(highestAffectedNode.position.y / LEVEL_HEIGHT);
    updateSubtree(highestAffectedNode.id, highestAffectedNode.position.x, level);

    return updatedNodes;
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
      const parentLevel = Math.floor(parent.position.y / LEVEL_HEIGHT);
      
      // Calculate horizontal spacing based on parent's position and level
      const spacing = Math.pow(2, parentLevel) * NODE_WIDTH;
      
      const position = {
        x: parent.position.x + (isLeft ? -spacing : spacing),
        y: parent.position.y + LEVEL_HEIGHT
      };

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
  }, []);

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
  }, [addChild, handleNodeLabelChange, onActivate]);

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
            minZoom={0.1}
            maxZoom={4}
          >
            <Background />
            <Controls />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
};

const TreeVisualizer = (props) => {
  return (
    <ReactFlowProvider>
      <TreeVisualizerContent {...props} />
    </ReactFlowProvider>
  );
};

export default TreeVisualizer;