import React, { useState, useCallback } from 'react';
import ReactFlow, { ReactFlowProvider, Controls, Background, applyNodeChanges } from 'reactflow';
import 'reactflow/dist/style.css';
import styles from './styles.module.css';

// Constants for deque positioning
const DEQUE_X_START = 100;  // Starting X-position of the deque
const DEQUE_Y = 300;        // Y-position of the deque
const WIDTH = 120;          // Width of each deque element plus spacing
const THRESHOLD = 100;      // Distance threshold for removing via drag

// Custom DequeNode component
const DequeNode = ({ data }) => {
  const { label, isHighlighted } = data;
  
  return (
    <div
      style={{
        width: 100,
        height: 40,
        background: isHighlighted ? '#fff3cd' : '#eee',
        border: isHighlighted ? '2px solid #ffc107' : '1px solid #333',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: data.isEnd ? 'grab' : 'default',
        transition: 'all 0.3s ease',
        boxShadow: isHighlighted ? '0 0 10px rgba(255, 193, 7, 0.7)' : 'none',
      }}
    >
      {label}
    </div>
  );
};

// Main content component
const DequeVisualizerContent = ({ onBack }) => {
  const [nodes, setNodes] = useState([]);
  const [dequeOrder, setDequeOrder] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isDraggingNode, setIsDraggingNode] = useState(false);
  const [draggingNodeId, setDraggingNodeId] = useState(null);
  const [highlightedNodeId, setHighlightedNodeId] = useState(null);
  const [message, setMessage] = useState(null);
  const MAX_DEQUE_SIZE = 10;

  // Add to front of deque
  const addFirst = useCallback((value) => {
    if (!value.trim()) return;
    
    if (dequeOrder.length >= MAX_DEQUE_SIZE) {
      showMessage("Deque is full! Cannot add more elements.");
      return;
    }
    
    const newNodeId = `deque-${Date.now()}`;
    const newNode = {
      id: newNodeId,
      type: 'dequeNode',
      data: { label: value },
      position: { x: DEQUE_X_START, y: DEQUE_Y },
    };
    
    setNodes((nds) => [newNode, ...nds]);
    setDequeOrder((order) => [newNodeId, ...order]);
    setInputValue('');
  }, [dequeOrder.length]);

  // Add to back of deque
  const addLast = useCallback((value) => {
    if (!value.trim()) return;
    
    if (dequeOrder.length >= MAX_DEQUE_SIZE) {
      showMessage("Deque is full! Cannot add more elements.");
      return;
    }
    
    const newNodeId = `deque-${Date.now()}`;
    const newNode = {
      id: newNodeId,
      type: 'dequeNode',
      data: { label: value },
      position: { x: DEQUE_X_START + dequeOrder.length * WIDTH, y: DEQUE_Y },
    };
    
    setNodes((nds) => [...nds, newNode]);
    setDequeOrder((order) => [...order, newNodeId]);
    setInputValue('');
  }, [dequeOrder.length]);

  // Remove from front of deque
  const removeFirst = useCallback(() => {
    if (dequeOrder.length === 0) {
      showMessage("Deque is empty! Cannot remove from front.");
      return;
    }
    
    const frontId = dequeOrder[0];
    setNodes((nds) => nds.filter((node) => node.id !== frontId));
    setDequeOrder((order) => order.slice(1));
  }, [dequeOrder]);

  // Remove from back of deque
  const removeLast = useCallback(() => {
    if (dequeOrder.length === 0) {
      showMessage("Deque is empty! Cannot remove from back.");
      return;
    }
    
    const backId = dequeOrder[dequeOrder.length - 1];
    setNodes((nds) => nds.filter((node) => node.id !== backId));
    setDequeOrder((order) => order.slice(0, -1));
  }, [dequeOrder]);

  // Show a message for a short time
  const showMessage = useCallback((text) => {
    setMessage(text);
    setTimeout(() => {
      setMessage(null);
    }, 2000);
  }, []);
  
  // Peek at the front element
  const peekFirst = useCallback(() => {
    if (dequeOrder.length === 0) {
      showMessage("Deque is empty - nothing to peek at front!");
      return;
    }
    
    const frontId = dequeOrder[0];
    setHighlightedNodeId(frontId);
    showMessage(`Peek front: ${nodes.find(n => n.id === frontId)?.data.label}`);
    
    // Clear highlight after 1.5 seconds
    setTimeout(() => {
      setHighlightedNodeId(null);
    }, 1500);
  }, [dequeOrder, nodes, showMessage]);
  
  // Peek at the back element
  const peekLast = useCallback(() => {
    if (dequeOrder.length === 0) {
      showMessage("Deque is empty - nothing to peek at back!");
      return;
    }
    
    const backId = dequeOrder[dequeOrder.length - 1];
    setHighlightedNodeId(backId);
    showMessage(`Peek back: ${nodes.find(n => n.id === backId)?.data.label}`);
    
    // Clear highlight after 1.5 seconds
    setTimeout(() => {
      setHighlightedNodeId(null);
    }, 1500);
  }, [dequeOrder, nodes, showMessage]);
  
  // Clear the entire deque
  const clearDeque = useCallback(() => {
    if (dequeOrder.length === 0) {
      showMessage("Deque is already empty!");
      return;
    }
    
    setNodes([]);
    setDequeOrder([]);
    showMessage("Deque cleared!");
  }, [dequeOrder.length, showMessage]);
  
  // Check if the deque is empty
  const isEmptyDeque = useCallback(() => {
    const isEmpty = dequeOrder.length === 0;
    showMessage(isEmpty ? "Deque is empty" : "Deque is not empty");
  }, [dequeOrder.length, showMessage]);
  
  // Get the size of the deque
  const getDequeSize = useCallback(() => {
    showMessage(`Deque size: ${dequeOrder.length}`);
  }, [dequeOrder.length, showMessage]);

  // Handle node position changes during dragging
  const onNodesChange = useCallback((changes) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, []);

  // Start dragging a node
  const onNodeDragStart = useCallback((event, node) => {
    const isFront = node.id === dequeOrder[0];
    const isBack = node.id === dequeOrder[dequeOrder.length - 1];
    
    if (isFront || isBack) {
      setIsDraggingNode(true);
      setDraggingNodeId(node.id);
    }
  }, [dequeOrder]);

  // Handle drag stop to decide removal or snap-back
  const onNodeDragStop = useCallback((event, node) => {
    const isFront = node.id === dequeOrder[0];
    const isBack = node.id === dequeOrder[dequeOrder.length - 1];
    
    setIsDraggingNode(false);
    setDraggingNodeId(null);
    
    if (isFront || isBack) {
      const dy = node.position.y - DEQUE_Y;
      
      if (Math.abs(dy) > THRESHOLD) {
        if (isFront) {
          removeFirst();
        } else if (isBack) {
          removeLast();
        }
      } else {
        // Snap back to original position
        setNodes((nds) =>
          nds.map((n) => {
            if (n.id === node.id) {
              const xPos = isFront 
                ? DEQUE_X_START 
                : DEQUE_X_START + (dequeOrder.length - 1) * WIDTH;
              
              return { ...n, position: { x: xPos, y: DEQUE_Y } };
            }
            return n;
          })
        );
      }
    }
  }, [dequeOrder, removeFirst, removeLast]);

  // Map deque order to ReactFlow nodes
  const flowNodes = dequeOrder.map((nodeId, index) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return null;
    
    const isFront = index === 0;
    const isBack = index === dequeOrder.length - 1;
    const isEnd = isFront || isBack;
    const isHighlighted = nodeId === highlightedNodeId;
    
    let position;
    if (isDraggingNode && nodeId === draggingNodeId) {
      position = node.position;
    } else {
      position = { x: DEQUE_X_START + index * WIDTH, y: DEQUE_Y };
    }
    
    return {
      ...node,
      position,
      draggable: isEnd,
      data: {
        ...node.data,
        isEnd,
        isFront,
        isBack,
        isHighlighted,
      },
    };
  }).filter(Boolean);

  return (
    <div className={styles.visualizer}>
      {/* Message display */}
      {message && <div className={styles.message}>{message}</div>}
      
      {/* Controls for deque interaction */}
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
        <button onClick={() => addFirst(inputValue)} className={`${styles.btn} ${styles.addFirstBtn}`}>
          Add First
        </button>
        <button onClick={() => addLast(inputValue)} className={`${styles.btn} ${styles.addLastBtn}`}>
          Add Last
        </button>
        <button onClick={removeFirst} className={`${styles.btn} ${styles.removeFirstBtn}`}>
          Remove First
        </button>
        <button onClick={removeLast} className={`${styles.btn} ${styles.removeLastBtn}`}>
          Remove Last
        </button>
        <button onClick={peekFirst} className={`${styles.btn} ${styles.peekFirstBtn}`}>
          Peek First
        </button>
        <button onClick={peekLast} className={`${styles.btn} ${styles.peekLastBtn}`}>
          Peek Last
        </button>
        <button onClick={clearDeque} className={`${styles.btn} ${styles.clearBtn}`}>
          Clear
        </button>
        <button onClick={isEmptyDeque} className={`${styles.btn} ${styles.isEmptyBtn}`}>
          isEmpty
        </button>
        <button onClick={getDequeSize} className={`${styles.btn} ${styles.sizeBtn}`}>
          Size
        </button>
      </div>

      {/* ReactFlow component */}
      <div style={{ width: '100vw', height: '100vh' }}>
        <ReactFlow
          nodes={flowNodes}
          edges={[]}
          nodeTypes={{ dequeNode: DequeNode }}
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
const DequeVisualizer = (props) => {
  return (
    <ReactFlowProvider>
      <DequeVisualizerContent {...props} />
    </ReactFlowProvider>
  );
};

export default DequeVisualizer; 