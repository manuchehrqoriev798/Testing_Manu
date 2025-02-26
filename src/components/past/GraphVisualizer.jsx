import React, { useState, useRef, useEffect } from 'react';
import './graphVisualizer.css';

const GraphVisualizer = ({ onBack }) => {
  const [isGraphCreated, setIsGraphCreated] = useState(true);
  const [nodes, setNodes] = useState([]);
  const graphAreaRef = useRef(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [connections, setConnections] = useState([]);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isDraggingNode, setIsDraggingNode] = useState(false);
  const [draggedNode, setDraggedNode] = useState(null);
  const [addButtonPosition, setAddButtonPosition] = useState(null);
  const [cursorAngle, setCursorAngle] = useState(0);
  const NODE_RADIUS = 20; // Half of node width
  const INTERACTION_RADIUS = 40; // Distance from node edge where interaction is allowed
  const [deletingNodes, setDeletingNodes] = useState(new Set());
  const [newNodeId, setNewNodeId] = useState(null);
  const [rightClickMenu, setRightClickMenu] = useState({ nodeId: null, position: { x: 0, y: 0 } });

  // Automatically create initial node when component mounts
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

  const handleCreateGraph = () => {
    setIsGraphCreated(true);
    // Wait for the graph area to be rendered
    setTimeout(() => {
      // Add initial empty node in the center of the graph area
      const initialNode = {
        id: `node-${Date.now()}`, // Use timestamp for unique IDs
        label: '', // Empty label by default
        position: {
          x: graphAreaRef.current.clientWidth / 2 - 20,
          y: graphAreaRef.current.clientHeight / 2 - 20,
        },
      };
      setNodes([initialNode]);
    }, 0);
  };

  const handleAddNode = () => {
    const newNode = {
      id: `node-${nodes.length + 1}`,
      label: nodes.length + 1,
      position: {
        x: Math.random() * (graphAreaRef.current.clientWidth - 100),
        y: Math.random() * (graphAreaRef.current.clientHeight - 100),
      },
    };
    setNodes([...nodes, newNode]);
  };

  // Add wheel event listener for zooming
  useEffect(() => {
    const handleWheel = (e) => {
      e.preventDefault();
      const delta = e.deltaY * -0.01;
      const newScale = Math.min(Math.max(0.1, scale + delta), 4);
      setScale(newScale);
    };

    const graphArea = graphAreaRef.current;
    if (graphArea) {
      graphArea.addEventListener('wheel', handleWheel, { passive: false });
    }

    return () => {
      if (graphArea) {
        graphArea.removeEventListener('wheel', handleWheel);
      }
    };
  }, [scale]);

  const handleNodeMouseDown = (e, nodeId) => {
    e.stopPropagation();
    setIsDraggingNode(true);
    setDraggedNode(nodeId);
  };

  const handleNodeMouseMove = (e, nodeId) => {
    if (isDraggingNode) {
      if (!draggedNode || !isDraggingNode) return;
      e.stopPropagation();
      const rect = graphAreaRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left - offset.x) / scale;
      const y = (e.clientY - rect.top - offset.y) / scale;

      setNodes(nodes.map(node => 
        node.id === draggedNode ? { ...node, position: { x, y } } : node
      ));
    } else {
      const node = nodes.find(n => n.id === nodeId);
      if (!node) return;

      const rect = graphAreaRef.current.getBoundingClientRect();
      const cursorX = (e.clientX - rect.left - offset.x) / scale;
      const cursorY = (e.clientY - rect.top - offset.y) / scale;

      const nodeCenter = {
        x: node.position.x + NODE_RADIUS,
        y: node.position.y + NODE_RADIUS
      };

      // Calculate distance from cursor to node center
      const dx = cursorX - nodeCenter.x;
      const dy = cursorY - nodeCenter.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Only show add button if cursor is between node edge and interaction radius
      if (distance > NODE_RADIUS && distance <= NODE_RADIUS + INTERACTION_RADIUS) {
        const angle = Math.atan2(dy, dx);
        setCursorAngle(angle);
        setAddButtonPosition({
          x: cursorX - 10,
          y: cursorY - 10
        });
        setHoveredNode(nodeId);
      } else {
        setAddButtonPosition(null);
      }
    }
  };

  const handleNodeMouseUp = (e) => {
    e.stopPropagation();
    setIsDraggingNode(false);
    setDraggedNode(null);
  };

  const handleCanvasDragStart = (e) => {
    if (!isDraggingNode) {
      setIsDraggingCanvas(true);
      setDragStart({
        x: e.clientX - offset.x,
        y: e.clientY - offset.y
      });
    }
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

  const addNodeAtAngle = (sourceNode, angle) => {
    const spacing = 100;
    
    const initialPosition = {
      x: sourceNode.position.x + spacing * Math.cos(angle),
      y: sourceNode.position.y + spacing * Math.sin(angle)
    };

    // Helper function to check if position is occupied
    const isPositionOccupied = (x, y) => {
      const occupiedThreshold = 50; // Increased threshold for better spacing
      return nodes.some(node => 
        Math.sqrt(
          Math.pow(node.position.x - x, 2) + 
          Math.pow(node.position.y - y, 2)
        ) < occupiedThreshold
      );
    };

    let newPosition = initialPosition;
    
    // If initial position is occupied, try finding a free spot
    if (isPositionOccupied(initialPosition.x, initialPosition.y)) {
      let currentSpacing = spacing;
      const maxAttempts = 20;
      
      for (let i = 0; i < maxAttempts; i++) {
        currentSpacing += 60;
        const adjustedPosition = {
          x: sourceNode.position.x + currentSpacing * Math.cos(angle),
          y: sourceNode.position.y + currentSpacing * Math.sin(angle)
        };
        
        if (!isPositionOccupied(adjustedPosition.x, adjustedPosition.y)) {
          newPosition = adjustedPosition;
          break;
        }
      }
    }

    const newNode = {
      id: `node-${Date.now()}`,
      label: '',
      position: newPosition,
    };
    
    const newConnection = {
      from: sourceNode.id,
      to: newNode.id,
    };

    setNodes([...nodes, newNode]);
    setConnections([...connections, newConnection]);
    
    // Set the new node ID to trigger animation
    setNewNodeId(newNode.id);
    // Clear the animation class after animation completes
    setTimeout(() => setNewNodeId(null), 500);
  };

  const calculateLineProperties = (fromNode, toNode) => {
    // Calculate center points of nodes
    const fromX = fromNode.position.x + 20;
    const fromY = fromNode.position.y + 20;
    const toX = toNode.position.x + 20;
    const toY = toNode.position.y + 20;

    const dx = toX - fromX;
    const dy = toY - fromY;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    
    // Adjust length to not overlap with nodes
    const nodeRadius = 20; // Half of node width
    const adjustedLength = length - (2 * nodeRadius);
    
    return {
      left: fromX,
      top: fromY,
      width: adjustedLength,
      transform: `rotate(${angle}deg)`,
    };
  };

  const handleNodeClick = (e, nodeId) => {
    e.stopPropagation();
    setHoveredNode(nodeId === hoveredNode ? null : nodeId);
  };

  const handleGraphAreaClick = () => {
    setHoveredNode(null);
  };

  const handleDeleteNode = (nodeId) => {
    // Add node to deleting set
    setDeletingNodes(prev => new Set([...prev, nodeId]));

    // Wait for animation to complete before removing the node
    setTimeout(() => {
      // Find all connections involving this node
      const nodeConnections = connections.filter(
        conn => conn.from === nodeId || conn.to === nodeId
      );

      // Create new connections between nodes that were connected through the deleted node
      const newConnections = [];
      const incomingConnections = nodeConnections.filter(conn => conn.to === nodeId);
      const outgoingConnections = nodeConnections.filter(conn => conn.from === nodeId);

      // Connect incoming nodes to outgoing nodes
      incomingConnections.forEach(inConn => {
        outgoingConnections.forEach(outConn => {
          newConnections.push({
            from: inConn.from,
            to: outConn.to
          });
        });
      });

      // Filter out connections involving the deleted node and add new connections
      setConnections([
        ...connections.filter(conn => conn.from !== nodeId && conn.to !== nodeId),
        ...newConnections
      ]);

      // Remove the node
      setNodes(nodes.filter(node => node.id !== nodeId));
      setHoveredNode(null);
      setDeletingNodes(prev => {
        const updated = new Set(prev);
        updated.delete(nodeId);
        return updated;
      });
    }, 300); // Match this timing with the CSS animation duration
  };

  // Add this new handler for label changes
  const handleLabelChange = (nodeId, newValue) => {
    setNodes(nodes.map(node =>
      node.id === nodeId ? { ...node, label: newValue } : node
    ));
  };

  const handleZoomIn = () => {
    setScale(prevScale => {
      const newScale = Math.min(4, prevScale + 0.1);
      
      // Get the viewport dimensions
      const viewportWidth = graphAreaRef.current.clientWidth;
      const viewportHeight = graphAreaRef.current.clientHeight;
      
      // Calculate the center point of the viewport
      const centerX = viewportWidth / 2;
      const centerY = viewportHeight / 2;
      
      // Adjust the offset to maintain the center point
      setOffset(prevOffset => ({
        x: centerX - (centerX - prevOffset.x) * (newScale / prevScale),
        y: centerY - (centerY - prevOffset.y) * (newScale / prevScale)
      }));
      
      return newScale;
    });
  };

  const handleZoomOut = () => {
    setScale(prevScale => {
      const newScale = Math.max(0.1, prevScale - 0.1);
      
      // Get the viewport dimensions
      const viewportWidth = graphAreaRef.current.clientWidth;
      const viewportHeight = graphAreaRef.current.clientHeight;
      
      // Calculate the center point of the viewport
      const centerX = viewportWidth / 2;
      const centerY = viewportHeight / 2;
      
      // Adjust the offset to maintain the center point
      setOffset(prevOffset => ({
        x: centerX - (centerX - prevOffset.x) * (newScale / prevScale),
        y: centerY - (centerY - prevOffset.y) * (newScale / prevScale)
      }));
      
      return newScale;
    });
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
    <div className="graph-visualizer">
      <div className="graph-container" onClick={handleClickOutside}>
        <div className="graph-controls">
          <button className="graph-back-btn" onClick={onBack}>
            Back to Home
          </button>
        </div>
        <div 
          className="graph-area" 
          ref={graphAreaRef}
          onDragOver={(e) => e.preventDefault()}
          onClick={handleGraphAreaClick}
          onMouseDown={handleCanvasDragStart}
          onMouseMove={(e) => {
            if (isDraggingNode) {
              handleNodeMouseMove(e, draggedNode);
            } else {
              handleCanvasDrag(e);
            }
          }}
          onMouseUp={(e) => {
            if (isDraggingNode) {
              handleNodeMouseUp(e);
            } else {
              handleCanvasDragEnd();
            }
          }}
          onMouseLeave={(e) => {
            if (isDraggingNode) {
              handleNodeMouseUp(e);
            } else {
              handleCanvasDragEnd();
            }
          }}
          style={{
            cursor: isDraggingCanvas ? 'grabbing' : 'default'
          }}
        >
          <div className="graph-content" style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: '0 0'
          }}>
            {connections.map((connection, index) => {
              const fromNode = nodes.find(node => node.id === connection.from);
              const toNode = nodes.find(node => node.id === connection.to);
              if (!fromNode || !toNode) return null;

              const lineProps = calculateLineProperties(fromNode, toNode);

              return (
                <div
                  key={`connection-${index}`}
                  className="graph-connection-line"
                  style={{
                    left: `${lineProps.left}px`,
                    top: `${lineProps.top}px`,
                    width: `${lineProps.width}px`,
                    transform: lineProps.transform,
                  }}
                >
                  <div className="graph-arrow-head" />
                </div>
              );
            })}
            {nodes.map((node) => (
              <div
                key={node.id}
                className="graph-node-wrapper"
                style={{
                  left: `${node.position.x + NODE_RADIUS}px`,
                  top: `${node.position.y + NODE_RADIUS}px`
                }}
                onMouseMove={(e) => handleNodeMouseMove(e, node.id)}
                onMouseLeave={() => {
                  setAddButtonPosition(null);
                  setHoveredNode(null);
                }}
                onContextMenu={(e) => handleContextMenu(e, node.id)}
              >
                <div
                  className={`graph-node ${
                    newNodeId === node.id ? 'graph-appear' : ''
                  } ${
                    deletingNodes.has(node.id) ? 'graph-delete' : ''
                  } ${
                    hoveredNode === node.id ? 'graph-node-hovered' : ''
                  }`}
                  onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                  style={{
                    left: `-${NODE_RADIUS}px`,
                    top: `-${NODE_RADIUS}px`,
                    cursor: isDraggingNode && draggedNode === node.id ? 'grabbing' : 'default'
                  }}
                >
                  <input
                    type="text"
                    value={node.label}
                    onChange={(e) => handleLabelChange(node.id, e.target.value)}
                    className="graph-node-input"
                    onClick={(e) => e.stopPropagation()}
                    placeholder="?"
                  />
                  {hoveredNode === node.id && (
                    <button 
                      className="graph-delete-node-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteNode(node.id);
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
                {hoveredNode === node.id && addButtonPosition && (
                  <button 
                    className="graph-add-node-btn"
                    style={{
                      left: `${addButtonPosition.x - node.position.x - NODE_RADIUS}px`,
                      top: `${addButtonPosition.y - node.position.y - NODE_RADIUS}px`,
                      position: 'absolute'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      addNodeAtAngle(node, cursorAngle);
                    }}
                  >
                    +
                  </button>
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
                {connections
                  .filter(conn => conn.from === rightClickMenu.nodeId)
                  .map(conn => (
                    <button
                      key={conn.to}
                      onClick={() => handleSwitchNodes(rightClickMenu.nodeId, conn.to)}
                    >
                      Switch ({nodes.find(n => n.id === rightClickMenu.nodeId)?.label || '?'}) with connected node ({nodes.find(n => n.id === conn.to)?.label || '?'})
                    </button>
                  ))
                }
                {connections
                  .filter(conn => conn.to === rightClickMenu.nodeId)
                  .map(conn => (
                    <button
                      key={conn.from}
                      onClick={() => handleSwitchNodes(rightClickMenu.nodeId, conn.from)}
                    >
                      Switch ({nodes.find(n => n.id === rightClickMenu.nodeId)?.label || '?'}) with connected node ({nodes.find(n => n.id === conn.from)?.label || '?'})
                    </button>
                  ))
                }
              </div>
            )}
          </div>
          <div className="graph-zoom-controls">
            <button className="graph-zoom-btn" onClick={handleZoomIn} title="Zoom In">+</button>
            <div className="graph-zoom-level">{Math.round(scale * 100)}%</div>
            <button className="graph-zoom-btn" onClick={handleZoomOut} title="Zoom Out">−</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GraphVisualizer;
