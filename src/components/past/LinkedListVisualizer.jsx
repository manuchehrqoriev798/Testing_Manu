import React, { useState, useRef, useEffect } from 'react';
import './linkedListVisualizer.css';

const LinkedListVisualizer = ({ onBack }) => {
  const [nodes, setNodes] = useState([]);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const listAreaRef = useRef(null);
  const [deletingNodes, setDeletingNodes] = useState(new Set());
  const [newNodeId, setNewNodeId] = useState(null);
  const [rightClickMenu, setRightClickMenu] = useState({ nodeId: null, position: { x: 0, y: 0 } });

  // Initialize with first node
  useEffect(() => {
    const initialNode = {
      id: `node-${Date.now()}`,
      label: '',
      position: {
        x: window.innerWidth / 2 - 20,
        y: window.innerHeight / 2 - 20,
      },
    };
    setNodes([initialNode]);
  }, []);

  const handleAddNode = (sourceNodeId, direction) => {
    const sourceNodeIndex = nodes.findIndex(node => node.id === sourceNodeId);
    const newNode = {
      id: `node-${Date.now()}`,
      label: '',
    };
    
    const newNodes = [...nodes];
    const insertIndex = direction === 'right' ? sourceNodeIndex + 1 : sourceNodeIndex;
    newNodes.splice(insertIndex, 0, newNode);
    
    setNodes(newNodes);
    setNewNodeId(newNode.id);
    setTimeout(() => setNewNodeId(null), 500);
  };

  const handleDeleteNode = (nodeId) => {
    setDeletingNodes(prev => new Set([...prev, nodeId]));

    setTimeout(() => {
      setNodes(nodes.filter(node => node.id !== nodeId));
      setHoveredNode(null);
      setDeletingNodes(prev => {
        const updated = new Set(prev);
        updated.delete(nodeId);
        return updated;
      });
    }, 300);
  };

  const handleLabelChange = (nodeId, newValue) => {
    setNodes(nodes.map(node =>
      node.id === nodeId ? { ...node, label: newValue } : node
    ));
  };

  const handleZoomIn = () => {
    setScale(prevScale => Math.min(4, prevScale + 0.1));
  };

  const handleZoomOut = () => {
    setScale(prevScale => Math.max(0.1, prevScale - 0.1));
  };

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

  const handleSwitchNodes = (sourceIndex, targetIndex) => {
    const newNodes = [...nodes];
    [newNodes[sourceIndex], newNodes[targetIndex]] = [newNodes[targetIndex], newNodes[sourceIndex]];
    setNodes(newNodes);
    setRightClickMenu({ nodeId: null, position: { x: 0, y: 0 } });
  };

  return (
    <div className="linked-list-container" onClick={handleClickOutside}>
      <div className="linked-list-controls">
        <button className="linked-list-back-btn" onClick={onBack}>
          Back to Home
        </button>
      </div>
      <div 
        className="linked-list-area" 
        ref={listAreaRef}
        onMouseDown={handleCanvasDragStart}
        onMouseMove={handleCanvasDrag}
        onMouseUp={handleCanvasDragEnd}
        onMouseLeave={handleCanvasDragEnd}
      >
        <div className="linked-list-content" style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transformOrigin: '0 0'
        }}>
          <div className="linked-list-nodes-container">
            {nodes.map((node, index) => (
              <div
                key={node.id}
                className="linked-list-node-wrapper"
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                onContextMenu={(e) => handleContextMenu(e, node.id)}
              >
                <div className={`linked-list-node ${
                  newNodeId === node.id ? 'appear' : ''
                } ${
                  deletingNodes.has(node.id) ? 'delete' : ''
                } ${
                  hoveredNode === node.id ? 'linked-list-node-hovered' : ''
                }`}>
                  {hoveredNode === node.id && (
                    <>
                      <button 
                        className="linked-list-add-node-btn left"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddNode(node.id, 'left');
                        }}
                      >
                        +
                      </button>
                      <button 
                        className="linked-list-add-node-btn right"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddNode(node.id, 'right');
                        }}
                      >
                        +
                      </button>
                    </>
                  )}
                  <input
                    type="text"
                    value={node.label}
                    onChange={(e) => handleLabelChange(node.id, e.target.value)}
                    className="linked-list-node-input"
                    placeholder="?"
                  />
                  {hoveredNode === node.id && (
                    <button 
                      className="linked-list-delete-node-btn"
                      onClick={() => handleDeleteNode(node.id)}
                    >
                      ×
                    </button>
                  )}
                </div>
                {index < nodes.length - 1 && (
                  <div className="linked-list-connection-line">
                    <div className="linked-list-arrow-head" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        {rightClickMenu.nodeId && (
          <div 
            className="node-context-menu"
            style={{
              left: rightClickMenu.position.x,
              top: rightClickMenu.position.y
            }}
          >
            {nodes.findIndex(n => n.id === rightClickMenu.nodeId) > 0 && (
              <button
                onClick={() => {
                  const currentIndex = nodes.findIndex(n => n.id === rightClickMenu.nodeId);
                  handleSwitchNodes(currentIndex, currentIndex - 1);
                }}
              >
                Switch ({nodes[nodes.findIndex(n => n.id === rightClickMenu.nodeId)].label || '?'}) with left node ({nodes[nodes.findIndex(n => n.id === rightClickMenu.nodeId) - 1].label || '?'})
              </button>
            )}
            {nodes.findIndex(n => n.id === rightClickMenu.nodeId) < nodes.length - 1 && (
              <button
                onClick={() => {
                  const currentIndex = nodes.findIndex(n => n.id === rightClickMenu.nodeId);
                  handleSwitchNodes(currentIndex, currentIndex + 1);
                }}
              >
                Switch ({nodes[nodes.findIndex(n => n.id === rightClickMenu.nodeId)].label || '?'}) with right node ({nodes[nodes.findIndex(n => n.id === rightClickMenu.nodeId) + 1].label || '?'})
              </button>
            )}
          </div>
        )}
        <div className="linked-list-zoom-controls">
          <button className="linked-list-zoom-btn" onClick={handleZoomIn}>+</button>
          <div className="linked-list-zoom-level">{Math.round(scale * 100)}%</div>
          <button className="linked-list-zoom-btn" onClick={handleZoomOut}>−</button>
        </div>
      </div>
    </div>
  );
};

export default LinkedListVisualizer;
