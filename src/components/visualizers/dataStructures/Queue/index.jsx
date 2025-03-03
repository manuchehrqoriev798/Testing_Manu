import React, { useState, useCallback } from 'react';
import ReactFlow, { ReactFlowProvider, Controls, Background, applyNodeChanges } from 'reactflow';
import 'reactflow/dist/style.css';
import styles from './styles.module.css';

// Constants for queue positioning
const QUEUE_X_START = 100;  // Starting X-position of the queue
const QUEUE_Y = 300;        // Y-position of the queue
const WIDTH = 120;          // Width of each queue element plus spacing
const THRESHOLD = 100;      // Distance threshold for dequeuing via drag

// Custom QueueNode component
const QueueNode = ({ data }) => {
  const { label, isHighlighted } = data;
  
  return (
    <div
      style={{
        width: 100,
        height: 40,
        background: isHighlighted ? '#e3f2fd' : '#eee',
        border: isHighlighted ? '2px solid #2196F3' : '1px solid #333',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: data.isFront ? 'grab' : 'default',
        transition: 'all 0.3s ease',
        boxShadow: isHighlighted ? '0 0 10px rgba(33, 150, 243, 0.7)' : 'none',
      }}
    >
      {label}
    </div>
  );
};

// Main content component
const QueueVisualizerContent = ({ onBack }) => {
  const [nodes, setNodes] = useState([]);
  const [queueOrder, setQueueOrder] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isDraggingFront, setIsDraggingFront] = useState(false);
  const [highlightedNodeId, setHighlightedNodeId] = useState(null);
  const [message, setMessage] = useState(null);
  const MAX_QUEUE_SIZE = 10;

  // Enqueue a new value
  const enqueue = useCallback((value) => {
    if (!value.trim()) return;
    
    if (queueOrder.length >= MAX_QUEUE_SIZE) {
      showMessage("Queue is full! Cannot enqueue more elements.");
      return;
    }
    
    const newNodeId = `queue-${Date.now()}`;
    const newNode = {
      id: newNodeId,
      type: 'queueNode',
      data: { label: value },
      position: { x: QUEUE_X_START + queueOrder.length * WIDTH, y: QUEUE_Y },
    };
    
    setNodes((nds) => [...nds, newNode]);
    setQueueOrder((order) => [...order, newNodeId]);
    setInputValue('');
  }, [queueOrder.length]);

  // Dequeue the front element
  const dequeue = useCallback(() => {
    if (queueOrder.length === 0) {
      showMessage("Queue is empty! Cannot dequeue.");
      return;
    }
    
    const frontId = queueOrder[0];
    setNodes((nds) => nds.filter((node) => node.id !== frontId));
    setQueueOrder((order) => order.slice(1));
  }, [queueOrder]);

  // Show a message for a short time
  const showMessage = useCallback((text) => {
    setMessage(text);
    setTimeout(() => {
      setMessage(null);
    }, 2000);
  }, []);
  
  // Peek at the front element
  const peekQueue = useCallback(() => {
    if (queueOrder.length === 0) {
      showMessage("Queue is empty - nothing to peek!");
      return;
    }
    
    const frontId = queueOrder[0];
    setHighlightedNodeId(frontId);
    showMessage(`Peek: ${nodes.find(n => n.id === frontId)?.data.label}`);
    
    // Clear highlight after 1.5 seconds
    setTimeout(() => {
      setHighlightedNodeId(null);
    }, 1500);
  }, [queueOrder, nodes, showMessage]);
  
  // Clear the entire queue
  const clearQueue = useCallback(() => {
    if (queueOrder.length === 0) {
      showMessage("Queue is already empty!");
      return;
    }
    
    setNodes([]);
    setQueueOrder([]);
    showMessage("Queue cleared!");
  }, [queueOrder.length, showMessage]);
  
  // Check if the queue is empty
  const isEmptyQueue = useCallback(() => {
    const isEmpty = queueOrder.length === 0;
    showMessage(isEmpty ? "Queue is empty" : "Queue is not empty");
  }, [queueOrder.length, showMessage]);
  
  // Get the size of the queue
  const getQueueSize = useCallback(() => {
    showMessage(`Queue size: ${queueOrder.length}`);
  }, [queueOrder.length, showMessage]);

  // Handle node position changes during dragging
  const onNodesChange = useCallback((changes) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, []);

  // Start dragging the front node
  const onNodeDragStart = useCallback((event, node) => {
    if (node.id === queueOrder[0]) {
      setIsDraggingFront(true);
    }
  }, [queueOrder]);

  // Handle drag stop to decide removal or snap-back
  const onNodeDragStop = useCallback((event, node) => {
    if (node.id === queueOrder[0]) {
      setIsDraggingFront(false);
      const dy = node.position.y - QUEUE_Y;
      if (Math.abs(dy) > THRESHOLD) {
        dequeue();
      } else {
        setNodes((nds) =>
          nds.map((n) => {
            if (n.id === node.id) {
              return { ...n, position: { x: QUEUE_X_START, y: QUEUE_Y } };
            }
            return n;
          })
        );
      }
    }
  }, [queueOrder, dequeue]);

  // Map queue order to ReactFlow nodes
  const flowNodes = queueOrder.map((nodeId, index) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return null;
    
    const isFront = index === 0;
    const isHighlighted = nodeId === highlightedNodeId;
    const position = isFront && isDraggingFront 
      ? node.position 
      : { x: QUEUE_X_START + index * WIDTH, y: QUEUE_Y };
    
    return {
      ...node,
      position,
      draggable: isFront,
      data: {
        ...node.data,
        isFront,
        isHighlighted,
      },
    };
  }).filter(Boolean);

  return (
    <div className={styles.visualizer}>
      {/* Message display */}
      {message && <div className={styles.message}>{message}</div>}
      
      {/* Controls for queue interaction */}
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
        <button onClick={() => enqueue(inputValue)} className={styles.btn}>
          Enqueue
        </button>
        <button onClick={dequeue} className={styles.btn}>
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

      {/* ReactFlow component */}
      <div style={{ width: '100vw', height: '100vh' }}>
        <ReactFlow
          nodes={flowNodes}
          edges={[]}
          nodeTypes={{ queueNode: QueueNode }}
          onNodesChange={onNodesChange}
          onNodeDragStart={onNodeDragStart}
          onNodeDragStop={onNodeDragStop}
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

export default QueueVisualizer; 
