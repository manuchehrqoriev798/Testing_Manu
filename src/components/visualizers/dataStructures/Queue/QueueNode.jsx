import React, { useState, useCallback, useEffect, useRef } from 'react';
import ReactFlow, { 
  ReactFlowProvider, 
  Controls, 
  Background, 
  applyNodeChanges,
} from 'reactflow';
import 'reactflow/dist/style.css';
import './QueueNode.css';

// Constants for queue positioning
const QUEUE_X_START = 100;  // Starting X-position of the queue
const QUEUE_Y = 300;        // Y-position of the queue
const WIDTH = 120;          // Width of each queue element plus spacing
const VERTICAL_THRESHOLD = 100;  // Distance threshold for vertical movement
const HORIZONTAL_THRESHOLD = 100;  // Distance threshold for horizontal movement

// Custom QueueNode component
const QueueNode = ({ data }) => {
  const { label, priority, isHighlighted, queueType } = data;
  
  return (
    <div
      className={`${styles.queueNode} ${isHighlighted ? styles.highlighted : ''}`}
    >
      <div className="nodeLabel">{label}</div>
      {queueType === 'priority' && (
        <div className="priorityBadge">
          {priority}
        </div>
      )}
    </div>
  );
};

// Main content component
const QueueNode = ({ onBack }) => {
  // Define nodeTypes OUTSIDE the component render function
  const nodeTypes = useRef({ queueNode: QueueNode }).current;
  
  const [nodes, setNodes] = useState([]);
  const [queueOrder, setQueueOrder] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [priorityValue, setPriorityValue] = useState(1);
  const [highlightedNodeId, setHighlightedNodeId] = useState(null);
  const [message, setMessage] = useState(null);
  const [queueType, setQueueType] = useState('regular'); // 'regular' or 'priority'
  const [priorityOrder, setPriorityOrder] = useState('highest'); // 'highest' or 'lowest'
  const draggedNodeRef = useRef(null);
  const originalPositionsRef = useRef({});
  const MAX_QUEUE_SIZE = 10;

  // Enqueue a new value
  const enqueue = useCallback((value, priority = 1) => {
    if (!value.trim()) return;
    
    if (queueOrder.length >= MAX_QUEUE_SIZE) {
      showMessage("Queue is full! Cannot enqueue more elements.");
      return;
    }
    
    const newNodeId = `queue-${Date.now()}`;
    const newNode = {
      id: newNodeId,
      type: 'queueNode',
      data: { 
        label: value, 
        priority: parseInt(priority) || 1,
        queueType
      },
      position: { x: QUEUE_X_START + queueOrder.length * WIDTH, y: QUEUE_Y },
      draggable: true, // Make all nodes draggable
    };
    
    setNodes((nds) => [...nds, newNode]);
    setQueueOrder((order) => [...order, newNodeId]);
    setInputValue('');
    
    if (queueType === 'priority') {
      setPriorityValue(1); // Reset priority input
    }
    
    // Reposition all nodes to maintain straight line
    setTimeout(repositionNodes, 10);
    
  }, [queueOrder.length, queueType]);

  // Remove a specific node from the queue
  const removeNode = useCallback((nodeId) => {
    if (!nodeId || !queueOrder.includes(nodeId)) return;
    
    // Highlight the node being removed
    setHighlightedNodeId(nodeId);
    
    // Remove after a short delay for visual effect
    setTimeout(() => {
      setQueueOrder(order => order.filter(id => id !== nodeId));
      setNodes(nds => nds.filter(node => node.id !== nodeId));
      setHighlightedNodeId(null);
      
      // Reposition remaining nodes
      setTimeout(repositionNodes, 10);
    }, 500);
    
    showMessage(`Removed element from the queue.`);
  }, [queueOrder]);

  // Reposition all nodes in a straight line
  const repositionNodes = useCallback(() => {
    setNodes(currentNodes => {
      // Sort nodes according to queue order
      const sortedNodes = [...currentNodes].sort((a, b) => {
        const indexA = queueOrder.indexOf(a.id);
        const indexB = queueOrder.indexOf(b.id);
        return indexA - indexB;
      });
      
      // Update positions
      return sortedNodes.map((node, index) => ({
        ...node,
        position: { x: QUEUE_X_START + index * WIDTH, y: QUEUE_Y }
      }));
    });
  }, [queueOrder]);

  // Dequeue based on queue type
  const dequeue = useCallback(() => {
    if (queueOrder.length === 0) {
      showMessage("Queue is empty! Cannot dequeue.");
      return;
    }
    
    let nodeIdToRemove;
    
    if (queueType === 'regular') {
      // For regular queue, remove from the front
      nodeIdToRemove = queueOrder[0];
    } else {
      // For priority queue, find highest/lowest priority item
      let targetPriority = priorityOrder === 'highest' ? -Infinity : Infinity;
      let targetNodeId = null;
      
      nodes.forEach((node) => {
        if (queueOrder.includes(node.id)) {
          const nodePriority = node.data.priority;
          if ((priorityOrder === 'highest' && nodePriority > targetPriority) ||
              (priorityOrder === 'lowest' && nodePriority < targetPriority)) {
            targetPriority = nodePriority;
            targetNodeId = node.id;
          }
        }
      });
      
      nodeIdToRemove = targetNodeId;
    }
    
    removeNode(nodeIdToRemove);
    
  }, [queueOrder, nodes, queueType, priorityOrder, removeNode]);

  // Make all nodes draggable
  const updateAllNodesDraggable = useCallback(() => {
    setNodes(currentNodes => 
      currentNodes.map(node => ({
        ...node,
        draggable: true
      }))
    );
  }, []);

  // Handle node changes from ReactFlow
  const onNodesChange = useCallback((changes) => {
    // Apply changes and get updated nodes
    const updatedNodes = applyNodeChanges(changes, nodes);
    
    // Process each change
    changes.forEach(change => {
      if (change.type === 'position' && change.dragging) {
        // Store original position when drag starts
        if (!originalPositionsRef.current[change.id]) {
          const node = nodes.find(n => n.id === change.id);
          if (node) {
            originalPositionsRef.current[change.id] = { ...node.position };
            draggedNodeRef.current = change.id;
          }
        }
      }
      
      if (change.type === 'position' && !change.dragging && draggedNodeRef.current === change.id) {
        // When drag ends, check if node should be removed
        const node = updatedNodes.find(n => n.id === change.id);
        const originalPos = originalPositionsRef.current[change.id];
        
        if (node && originalPos) {
          const dx = Math.abs(node.position.x - originalPos.x);
          const dy = Math.abs(node.position.y - originalPos.y);
          
          if (dx > HORIZONTAL_THRESHOLD || dy > VERTICAL_THRESHOLD) {
            // If dragged far enough, remove the node
            removeNode(change.id);
          } else {
            // Otherwise, reposition all nodes (including the dragged one)
            setTimeout(repositionNodes, 10);
          }
          
          // Clean up references
          delete originalPositionsRef.current[change.id];
          draggedNodeRef.current = null;
        }
      }
    });
    
    setNodes(updatedNodes);
  }, [nodes, removeNode, repositionNodes]);

  // Display message with auto-hide
  const showMessage = useCallback((text, duration = 2000) => {
    setMessage(text);
    setTimeout(() => setMessage(null), duration);
  }, []);

  // Peek at the front element of the queue
  const peekQueue = useCallback(() => {
    if (queueOrder.length === 0) {
      showMessage("Queue is empty! Nothing to peek at.");
      return;
    }
    
    let peekNodeId;
    
    if (queueType === 'regular') {
      // For regular queue, peek at the front
      peekNodeId = queueOrder[0];
    } else {
      // For priority queue, peek at highest/lowest priority
      let targetPriority = priorityOrder === 'highest' ? -Infinity : Infinity;
      let targetNodeId = null;
      
      nodes.forEach((node) => {
        if (queueOrder.includes(node.id)) {
          const nodePriority = node.data.priority;
          if ((priorityOrder === 'highest' && nodePriority > targetPriority) ||
              (priorityOrder === 'lowest' && nodePriority < targetPriority)) {
            targetPriority = nodePriority;
            targetNodeId = node.id;
          }
        }
      });
      
      peekNodeId = targetNodeId;
    }
    
    // Highlight the peeked node
    setHighlightedNodeId(peekNodeId);
    
    // Get node data for message
    const peekNode = nodes.find(node => node.id === peekNodeId);
    if (peekNode) {
      const message = queueType === 'priority' 
        ? `Front element: ${peekNode.data.label} (Priority: ${peekNode.data.priority})`
        : `Front element: ${peekNode.data.label}`;
      
      showMessage(message, 1500);
      
      // Remove highlight after delay
      setTimeout(() => setHighlightedNodeId(null), 1500);
    }
  }, [queueOrder, nodes, queueType, priorityOrder, showMessage]);

  // Clear the entire queue
  const clearQueue = useCallback(() => {
    setQueueOrder([]);
    setNodes([]);
    showMessage("Queue cleared.");
  }, [showMessage]);

  // Check if queue is empty
  const isEmptyQueue = useCallback(() => {
    const isEmpty = queueOrder.length === 0;
    showMessage(`Queue is ${isEmpty ? 'empty' : 'not empty'}.`);
  }, [queueOrder.length, showMessage]);

  // Get the size of the queue
  const getQueueSize = useCallback(() => {
    showMessage(`Queue size: ${queueOrder.length}`);
  }, [queueOrder.length, showMessage]);

  // Toggle between regular queue and priority queue
  const toggleQueueType = useCallback(() => {
    setQueueType(currentType => currentType === 'regular' ? 'priority' : 'regular');
    clearQueue();
    showMessage(`Switched to ${queueType === 'regular' ? 'Priority Queue' : 'Regular Queue'}.`);
  }, [queueType, clearQueue, showMessage]);

  // Toggle between highest and lowest priority first (for priority queue)
  const togglePriorityOrder = useCallback(() => {
    setPriorityOrder(current => current === 'highest' ? 'lowest' : 'highest');
    showMessage(`Now dequeuing ${priorityOrder === 'highest' ? 'lowest' : 'highest'} priority first.`);
  }, [priorityOrder, showMessage]);

  // Handle submit event for adding new elements
  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    if (inputValue.trim()) {
      enqueue(inputValue, priorityValue);
    }
  }, [inputValue, priorityValue, enqueue]);

  // Update node data when highlights change
  useEffect(() => {
    setNodes(nds => 
      nds.map(node => {
        return {
          ...node,
          data: {
            ...node.data,
            isHighlighted: node.id === highlightedNodeId,
            queueType
          }
        };
      })
    );
  }, [highlightedNodeId, queueType]);

  // Update all nodes to be draggable when queue changes
  useEffect(() => {
    updateAllNodesDraggable();
  }, [queueOrder, updateAllNodesDraggable]);
  
  // Ensure nodes are correctly positioned after any relevant state changes
  useEffect(() => {
    repositionNodes();
  }, [queueOrder.length, repositionNodes]);

  return (
    <div className="visualizer">
      {/* Message display */}
      {message && <div className="message">{message}</div>}
      
      {/* Controls for queue interaction */}
      <div className="controls">
        <button onClick={onBack} className="btn">
          Back
        </button>
        
        {/* Queue Type Toggle */}
        <button onClick={toggleQueueType} className={`${styles.btn} ${styles.typeBtn}`}>
          Switch to {queueType === 'regular' ? 'Priority Queue' : 'Regular Queue'}
        </button>
        
        {/* Priority Order Toggle (only for priority queue) */}
        {queueType === 'priority' && (
          <button onClick={togglePriorityOrder} className={`${styles.btn} ${styles.orderBtn}`}>
            {priorityOrder === 'highest' ? 'Highest Priority First' : 'Lowest Priority First'}
          </button>
        )}
        
        {/* Enqueue Form */}
        <form onSubmit={handleSubmit} className="inputForm">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Enter value"
            className="input"
          />
          
          {queueType === 'priority' && (
            <input
              type="number"
              min="1"
              value={priorityValue}
              onChange={(e) => setPriorityValue(e.target.value)}
              placeholder="Priority"
              className="input"
            />
          )}
          
          <button type="submit" className="btn">
            Enqueue
          </button>
        </form>
        
        {/* Queue Operations */}
        <div className="operationButtons">
          <button onClick={dequeue} className={`${styles.btn} ${styles.dequeueBtn}`}>
            Dequeue
          </button>
          <button onClick={peekQueue} className={`${styles.btn} ${styles.peekBtn}`}>
            Peek
          </button>
          <button onClick={clearQueue} className={`${styles.btn} ${styles.clearBtn}`}>
            Clear
          </button>
          <button onClick={isEmptyQueue} className={`${styles.btn} ${styles.isEmptyBtn}`}>
            isEmpty
          </button>
          <button onClick={getQueueSize} className={`${styles.btn} ${styles.sizeBtn}`}>
            Size
          </button>
        </div>
      </div>

      {/* Queue Type Information */}
      <div className="queueInfo">
        <h3>{queueType === 'regular' ? 'Regular Queue (FIFO)' : 'Priority Queue'}</h3>
        <p>
          {queueType === 'regular' 
            ? "Elements are dequeued in the same order they were enqueued (First In, First Out)." 
            : `Elements with ${priorityOrder === 'highest' ? 'higher' : 'lower'} priority values are dequeued first.`}
        </p>
        <p className="dragTip">
          <span className="dragTipIcon">↔️</span>
          Drag any element away from the queue to remove it!
        </p>
      </div>

      {/* ReactFlow component */}
      <div className="flowContainer">
        <ReactFlow
          nodes={nodes.filter(node => queueOrder.includes(node.id))}
          edges={[]}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
};

// Wrap in ReactFlowProvider
const QueueVisualizer = (props) => {
  return (
    <ReactFlowProvider>
      <QueueVisualizerContent {...props} />
    </ReactFlowProvider>
  );
};

export default QueueNode; 
