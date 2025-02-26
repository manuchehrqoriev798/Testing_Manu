import React, { useState, useRef, useEffect } from 'react';
import ReactFlow, { 
  Controls, 
  Background,
  MarkerType,
  useNodesState,
  useEdgesState
} from 'reactflow';
import 'reactflow/dist/style.css';
import styles from './styles.module.css';

const TreeVisualizer = ({ onActivate, onBack }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [nextNodeId, setNextNodeId] = useState(1);
  const treeAreaRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState(null);
  const LEVEL_HEIGHT = 120;
  const NODE_WIDTH = 50;
  const [rightClickMenu, setRightClickMenu] = useState({ nodeId: null, position: { x: 0, y: 0 } });

  const getSubtreeWidth = (nodeId, level) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return 0;
    
    // Width increases exponentially with level to ensure enough space
    const spacing = Math.pow(2, level) * NODE_WIDTH * 1.5;
    
    if (!node.leftChildId && !node.rightChildId) {
      return spacing;
    }
    
    const leftWidth = node.leftChildId ? getSubtreeWidth(node.leftChildId, level + 1) : 0;
    const rightWidth = node.rightChildId ? getSubtreeWidth(node.rightChildId, level + 1) : 0;
    
    return Math.max(spacing, leftWidth + rightWidth);
  };

  const calculateNodePosition = (parentNode, isLeft) => {
    const level = parentNode.level + 1;
    
    // Get the parent's subtree width
    const subtreeWidth = getSubtreeWidth(parentNode.id, level);
    
    // Calculate horizontal offset based on level
    const horizontalOffset = subtreeWidth / 2;
    
    // Position relative to parent
    const newPosition = {
      x: parentNode.position.x + (isLeft ? -horizontalOffset : horizontalOffset),
      y: parentNode.position.y + LEVEL_HEIGHT
    };

    return newPosition;
  };

  const updateAffectedNodePositions = (nodeList, startNodeId) => {
    // Find the path from the new node to the root
    const getPathToRoot = (nodeId, path = []) => {
      const node = nodeList.find(n => n.id === nodeId);
      if (!node) return path;
      path.push(node.id);
      if (node.parentId) {
        return getPathToRoot(node.parentId, path);
      }
      return path;
    };

    const affectedNodeIds = getPathToRoot(startNodeId);
    let updatedNodes = [...nodeList];

    // Update only the affected subtree
    const updateSubtree = (nodeId, x, level) => {
      const currentNode = updatedNodes.find(n => n.id === nodeId);
      if (!currentNode) return;

      // Only update position if this node is in the affected path
      if (affectedNodeIds.includes(nodeId)) {
        currentNode.position = { x, y: level * LEVEL_HEIGHT };
        currentNode.level = level;
      }

      const subtreeWidth = getSubtreeWidth(nodeId, level);
      const spacing = subtreeWidth / 2;

      // Recursively update children if they're in the affected path
      if (currentNode.leftChildId) {
        updateSubtree(
          currentNode.leftChildId,
          x - spacing,
          level + 1
        );
      }
      if (currentNode.rightChildId) {
        updateSubtree(
          currentNode.rightChildId,
          x + spacing,
          level + 1
        );
      }
    };

    // Find the highest affected node (closest to root)
    const highestAffectedNode = nodeList.find(n => n.id === affectedNodeIds[affectedNodeIds.length - 1]);
    
    // Start update from the highest affected node
    updateSubtree(highestAffectedNode.id, highestAffectedNode.position.x, highestAffectedNode.level);

    return updatedNodes;
  };

  const addChild = (parentId, isLeft) => {
    const parent = nodes.find(n => n.id === parentId);
    if (!parent) return;

    // Check if the slot is already taken
    if (isLeft && parent.leftChildId) return;
    if (!isLeft && parent.rightChildId) return;

    const newNode = {
      id: `node-${nextNodeId}`,
      data: { label: nextNodeId.toString() },
      position: calculateNodePosition(parent, isLeft),
      type: 'default',
      parentId: parentId,
      leftChildId: null,
      rightChildId: null
    };

    // Update parent's child references
    const updatedParent = {
      ...parent,
      [isLeft ? 'leftChildId' : 'rightChildId']: newNode.id
    };

    // Create new nodes array with the updated parent and new node
    const updatedNodes = [
      ...nodes.filter(n => n.id !== parentId),
      updatedParent,
      newNode
    ];

    // Only recalculate positions for affected nodes
    const recalculatedNodes = updateAffectedNodePositions(updatedNodes, newNode.id);
    setNodes(recalculatedNodes);
    setNextNodeId(prev => prev + 1);

    // If there are existing nodes, connect to the new node
    if (nodes.length > 0) {
      const newEdge = {
        id: `edge-${parent.id}-${newNode.id}`,
        source: parent.id,
        target: newNode.id,
        type: 'smoothstep',
        markerEnd: { type: MarkerType.ArrowClosed }
      };
      setEdges(prev => [...prev, newEdge]);
    }
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY * -0.001;
    const newScale = Math.min(Math.max(0.1, scale + delta), 4);
    setScale(newScale);
  };

  useEffect(() => {
    const treeArea = treeAreaRef.current;
    if (treeArea) {
      treeArea.addEventListener('wheel', handleWheel, { passive: false });
    }
    return () => {
      if (treeArea) {
        treeArea.removeEventListener('wheel', handleWheel);
      }
    };
  }, [scale]);

  const handleCanvasDragStart = (e) => {
    setIsDraggingCanvas(true);
    setDragStart({
      x: e.clientX - offset.x,
      y: e.clientY - offset.y
    });
  };

  const handleCanvasDrag = (e) => {
    if (isDraggingCanvas) {
      setOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleCanvasDragEnd = () => {
    setIsDraggingCanvas(false);
  };

  const calculateConnectionPath = (parentNode, childNode) => {
    const startX = parentNode.position.x + NODE_WIDTH / 2;
    const startY = parentNode.position.y + NODE_WIDTH / 2;
    const endX = childNode.position.x + NODE_WIDTH / 2;
    const endY = childNode.position.y + NODE_WIDTH / 2;

    const dx = endX - startX;
    const dy = endY - startY;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    return {
      left: startX,
      top: startY,
      width: length,
      transform: `rotate(${angle}deg)`
    };
  };

  // Update the initial node creation to use the new positioning
  useEffect(() => {
    setTimeout(() => {
      const rootNode = {
        id: 'node-1',
        data: { label: '1' },
        position: { x: window.innerWidth / 2, y: 100 },
        type: 'default',
        parentId: null,
        leftChildId: null,
        rightChildId: null
      };
      setNodes([rootNode]);
      if (onActivate) onActivate();
    }, 0);
  }, []);

  const handleContextMenu = (e, nodeId) => {
    e.preventDefault();
    setRightClickMenu({
      nodeId,
      position: { x: e.clientX, y: e.clientY }
    });
  };

  const handleClickOutside = () => {
    setRightClickMenu({ nodeId: null, position: { x: 0, y: 0 } });
  };

  const handleSwitchNodes = (sourceId, targetId) => {
    const newNodes = [...nodes];
    const sourceNode = newNodes.find(n => n.id === sourceId);
    const targetNode = newNodes.find(n => n.id === targetId);
    
    // Switch labels
    const tempLabel = sourceNode.data.label;
    sourceNode.data.label = targetNode.data.label;
    targetNode.data.label = tempLabel;
    
    setNodes(newNodes);
    setRightClickMenu({ nodeId: null, position: { x: 0, y: 0 } });
  };

  const createNode = () => {
    addChild(nodes[nodes.length - 1].id, true);
  };

  return (
    <div className={styles.visualizer}>
      <div className={styles.controls}>
        <button onClick={onBack} className={styles.btn}>Back</button>
        <button onClick={createNode} className={styles.btn}>Add Node</button>
      </div>
      <div className={styles.flowContainer}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>

      {rightClickMenu.nodeId && (
        <div
          className={styles.contextMenu}
          style={{
            left: rightClickMenu.position.x,
            top: rightClickMenu.position.y
          }}
        >
          {nodes.find(n => n.id === rightClickMenu.nodeId)?.leftChildId && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSwitchNodes(rightClickMenu.nodeId, nodes.find(n => n.id === rightClickMenu.nodeId)?.leftChildId);
              }}
            >
              Switch ({nodes.find(n => n.id === rightClickMenu.nodeId)?.data.label || '?'}) with left child ({nodes.find(n => n.id === nodes.find(n => n.id === rightClickMenu.nodeId)?.leftChildId)?.data.label || '?'})
            </button>
          )}
          {nodes.find(n => n.id === rightClickMenu.nodeId)?.rightChildId && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSwitchNodes(rightClickMenu.nodeId, nodes.find(n => n.id === rightClickMenu.nodeId)?.rightChildId);
              }}
            >
              Switch ({nodes.find(n => n.id === rightClickMenu.nodeId)?.data.label || '?'}) with right child ({nodes.find(n => n.id === nodes.find(n => n.id === rightClickMenu.nodeId)?.rightChildId)?.data.label || '?'})
            </button>
          )}
          {nodes.find(n => n.id === rightClickMenu.nodeId)?.parentId && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSwitchNodes(rightClickMenu.nodeId, nodes.find(n => n.id === rightClickMenu.nodeId)?.parentId);
              }}
            >
              Switch ({nodes.find(n => n.id === rightClickMenu.nodeId)?.data.label || '?'}) with parent ({nodes.find(n => n.id === nodes.find(n => n.id === rightClickMenu.nodeId)?.parentId)?.data.label || '?'})
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default function WrappedTreeVisualizer(props) {
  return (
    <ReactFlow.Provider>
      <TreeVisualizer {...props} />
    </ReactFlow.Provider>
  );
} 