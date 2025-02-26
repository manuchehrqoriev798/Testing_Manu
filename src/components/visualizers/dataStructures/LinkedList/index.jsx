import React, { useState, useRef, useEffect } from 'react';
import styles from './styles.module.css';

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
  const [editingNode, setEditingNode] = useState(null);

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
    const sourceNode = nodes[sourceNodeIndex];
    
    // Calculate new node position
    const newPosition = {
      x: sourceNode.position.x + (direction === 'right' ? 100 : -100),
      y: sourceNode.position.y
    };
    
    // Shift existing nodes to make space
    const newNodes = nodes.map(node => {
      if (direction === 'right' && node.position.x > sourceNode.position.x) {
        // Shift nodes to the right by 100 units
        return {
          ...node,
          position: {
            ...node.position,
            x: node.position.x + 100
          }
        };
      } else if (direction === 'left' && node.position.x < sourceNode.position.x) {
        // Shift nodes to the left by 100 units
        return {
          ...node,
          position: {
            ...node.position,
            x: node.position.x - 100
          }
        };
      }
      return node;
    });
    
    const newNode = {
      id: `node-${Date.now()}`,
      label: '',
      position: newPosition
    };
    
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

  const handleWheel = (e) => {
    e.preventDefault();
    setScale(prevScale => Math.max(0.1, prevScale - e.deltaY * 0.001));
  };

  return (
    <div className={styles.visualizer}>
      <div className={styles.container}>
        <div 
          ref={listAreaRef}
          className={styles.area}
          onMouseDown={handleCanvasDragStart}
          onMouseMove={handleCanvasDrag}
          onMouseUp={handleCanvasDragEnd}
          onWheel={handleWheel}
          onClick={handleClickOutside}
        >
          <div 
            className={styles.content}
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`
            }}
          >
            {/* Draw connection arrows first so they appear behind nodes */}
            {nodes.map((node, index) => {
              if (index < nodes.length - 1) {
                const nextNode = nodes[index + 1];
                return (
                  <div
                    key={`connection-${node.id}`}
                    className={styles.arrow}
                    style={{
                      left: node.position.x + 30,
                      top: node.position.y + 30,
                      width: '100px',
                    }}
                  >
                    <div className={styles.arrowLine}></div>
                    <div className={styles.arrowHead}></div>
                  </div>
                );
              }
              return null;
            })}

            {/* Draw nodes on top of arrows */}
            {nodes.map((node, index) => (
              <div
                key={node.id}
                className={`${styles.node} ${hoveredNode === node.id ? styles.hovered : ''} 
                           ${deletingNodes.has(node.id) ? styles.delete : ''} 
                           ${newNodeId === node.id ? styles.appear : ''}`}
                style={{
                  left: node.position?.x || 0,
                  top: node.position?.y || 0,
                }}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                onContextMenu={(e) => handleContextMenu(e, node.id)}
              >
                <button 
                  className={`${styles.btn} ${styles.leftBtn}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddNode(node.id, 'left');
                  }}
                >
                  +
                </button>
                <div className={styles.nodeContent}>
                  {editingNode === node.id ? (
                    <input
                      type="text"
                      value={node.label}
                      onChange={(e) => handleLabelChange(node.id, e.target.value)}
                      onBlur={() => setEditingNode(null)}
                      autoFocus
                      className={styles.nodeInput}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <div 
                      onClick={() => setEditingNode(node.id)}
                      className={styles.nodeLabel}
                    >
                      {node.label || '?'}
                    </div>
                  )}
                  {hoveredNode === node.id && (
                    <button 
                      className={styles.deleteBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteNode(node.id);
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
                <button 
                  className={`${styles.btn} ${styles.rightBtn}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddNode(node.id, 'right');
                  }}
                >
                  +
                </button>
              </div>
            ))}
            {rightClickMenu.nodeId && (
              <div 
                className={styles.menu}
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
            <div className={styles.controls}>
              <button className={styles.btn} onClick={handleZoomIn}>+</button>
              <div className={styles.level}>{Math.round(scale * 100)}%</div>
              <button className={styles.btn} onClick={handleZoomOut}>−</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LinkedListVisualizer;
