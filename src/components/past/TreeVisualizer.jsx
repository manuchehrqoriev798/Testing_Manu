import React, { useState, useRef, useEffect } from 'react';
import './treeVisualizer.css';

const TreeVisualizer = ({ onActivate, onBack }) => {
  const [nodes, setNodes] = useState([]);
  const [isTreeCreated, setIsTreeCreated] = useState(true);
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
      id: `node-${nodes.length + 1}`,
      label: (nodes.length + 1).toString(),
      level: parent.level + 1,
      position: calculateNodePosition(parent, isLeft),
      isRoot: false,
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
        label: '1',
        level: 0,
        position: {
          x: window.innerWidth / 2,
          y: 100
        },
        isRoot: true,
        parentId: null,
        leftChildId: null,
        rightChildId: null
      };
      setNodes([rootNode]);
      setIsTreeCreated(true);
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
    const tempLabel = sourceNode.label;
    sourceNode.label = targetNode.label;
    targetNode.label = tempLabel;
    
    setNodes(newNodes);
    setRightClickMenu({ nodeId: null, position: { x: 0, y: 0 } });
  };

  return (
    <div className="tree-visualizer">
      <div className="tree-container" onClick={handleClickOutside}>
        <div className="tree-controls">
          <button className="tree-back-btn" onClick={onBack}>
            Back to Home
          </button>
        </div>
        <div className="tree-area" 
          ref={treeAreaRef}
          onMouseDown={handleCanvasDragStart}
          onMouseMove={handleCanvasDrag}
          onMouseUp={handleCanvasDragEnd}
          onMouseLeave={handleCanvasDragEnd}
          style={{
            cursor: isDraggingCanvas ? 'grabbing' : 'default'
          }}
        >
          <div className="tree-content" style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: '0 0'
          }}>
            {nodes.map(node => {
              const parent = nodes.find(n => n.id === node.parentId);
              return parent ? (
                <div
                  key={`connection-${node.id}`}
                  className="tree-connection"
                  style={calculateConnectionPath(parent, node)}
                />
              ) : null;
            })}
            {nodes.map(node => (
              <div
                key={node.id}
                className={`tree-node ${node.isRoot ? 'tree-root' : ''}`}
                style={{
                  left: node.position.x,
                  top: node.position.y
                }}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                onContextMenu={(e) => handleContextMenu(e, node.id)}
              >
                <input
                  type="text"
                  value={node.label}
                  onChange={(e) => {
                    const newNodes = nodes.map(n =>
                      n.id === node.id ? { ...n, label: e.target.value } : n
                    );
                    setNodes(newNodes);
                  }}
                  className="tree-node-input"
                  onClick={(e) => e.stopPropagation()}
                  placeholder="?"
                />
                {hoveredNode === node.id && (
                  <>
                    {!node.leftChildId && (
                      <button
                        className="tree-add-child-btn tree-left"
                        onClick={() => addChild(node.id, true)}
                      >
                        +
                      </button>
                    )}
                    {!node.rightChildId && (
                      <button
                        className="tree-add-child-btn tree-right"
                        onClick={() => addChild(node.id, false)}
                      >
                        +
                      </button>
                    )}
                  </>
                )}
              </div>
            ))}
            {rightClickMenu.nodeId && (
              <div 
                className="node-context-menu"
                style={{
                  left: rightClickMenu.position.x,
                  top: rightClickMenu.position.y
                }}
              >
                {nodes.find(n => n.id === rightClickMenu.nodeId)?.leftChildId && (
                  <button
                    onClick={() => {
                      const node = nodes.find(n => n.id === rightClickMenu.nodeId);
                      handleSwitchNodes(rightClickMenu.nodeId, node.leftChildId);
                    }}
                  >
                    Switch ({nodes.find(n => n.id === rightClickMenu.nodeId)?.label || '?'}) with left child ({nodes.find(n => n.id === nodes.find(n => n.id === rightClickMenu.nodeId)?.leftChildId)?.label || '?'})
                  </button>
                )}
                {nodes.find(n => n.id === rightClickMenu.nodeId)?.rightChildId && (
                  <button
                    onClick={() => {
                      const node = nodes.find(n => n.id === rightClickMenu.nodeId);
                      handleSwitchNodes(rightClickMenu.nodeId, node.rightChildId);
                    }}
                  >
                    Switch ({nodes.find(n => n.id === rightClickMenu.nodeId)?.label || '?'}) with right child ({nodes.find(n => n.id === nodes.find(n => n.id === rightClickMenu.nodeId)?.rightChildId)?.label || '?'})
                  </button>
                )}
                {nodes.find(n => n.id === rightClickMenu.nodeId)?.parentId && (
                  <button
                    onClick={() => {
                      const node = nodes.find(n => n.id === rightClickMenu.nodeId);
                      handleSwitchNodes(rightClickMenu.nodeId, node.parentId);
                    }}
                  >
                    Switch ({nodes.find(n => n.id === rightClickMenu.nodeId)?.label || '?'}) with parent ({nodes.find(n => n.id === nodes.find(n => n.id === rightClickMenu.nodeId)?.parentId)?.label || '?'})
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="tree-zoom-controls">
            <button 
              className="tree-zoom-btn" 
              onClick={() => setScale(prev => Math.min(4, prev + 0.1))}
              title="Zoom In"
            >
              +
            </button>
            <div className="tree-zoom-level">{Math.round(scale * 100)}%</div>
            <button 
              className="tree-zoom-btn" 
              onClick={() => setScale(prev => Math.max(0.1, prev - 0.1))}
              title="Zoom Out"
            >
              −
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TreeVisualizer; 