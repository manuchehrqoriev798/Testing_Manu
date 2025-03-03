import React, { useState, useCallback } from 'react';
import ReactFlow, { ReactFlowProvider, Controls, Background, applyNodeChanges } from 'reactflow';
import 'reactflow/dist/style.css';
import styles from './styles.module.css';

// Constants for stack positioning
const STACK_X = 50;         // X-position of the stack
const STACK_BASE_Y = 100;   // Starting Y-position of the stack
const HEIGHT = 50;          // Height of each stack element plus spacing
const THRESHOLD = 100;      // Distance threshold for popping via drag

// Custom StackNode component
const StackNode = ({ data }) => {
  const { label, isHighlighted } = data;
  
  return (
    <div
      style={{
        width: 100,
        height: 40,
        background: isHighlighted ? '#ffdd57' : '#eee',
        border: isHighlighted ? '2px solid #ff8800' : '1px solid #333',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: data.isTop ? 'grab' : 'default',
        transition: 'all 0.3s ease',
        boxShadow: isHighlighted ? '0 0 10px rgba(255, 136, 0, 0.7)' : 'none',
      }}
    >
      {label}
    </div>
  );
};

// Main content component
const GraphVisualizerContent = ({ onBack }) => {
  const [nodes, setNodes] = useState([]);
  const [stackOrder, setStackOrder] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isDraggingTop, setIsDraggingTop] = useState(false);
  const [highlightedNodeId, setHighlightedNodeId] = useState(null);
  const [message, setMessage] = useState(null);

  // Push a new value onto the stack
  const pushToStack = useCallback((value) => {
    if (!value.trim()) return;
    const newNodeId = `stack-${Date.now()}`;
    const newNode = {
      id: newNodeId,
      type: 'stackNode',
      data: { label: value },
      position: { x: STACK_X, y: STACK_BASE_Y },
    };
    setNodes((nds) => [newNode, ...nds]);
    setStackOrder((order) => [newNodeId, ...order]);
    setInputValue('');
  }, []);

  // Pop the top element from the stack
  const popFromStack = useCallback(() => {
    if (stackOrder.length === 0) return;
    const topId = stackOrder[0];
    setNodes((nds) => nds.filter((node) => node.id !== topId));
    setStackOrder((order) => order.slice(1));
  }, [stackOrder]);

  // Show a message for a short time
  const showMessage = useCallback((text) => {
    setMessage(text);
    setTimeout(() => {
      setMessage(null);
    }, 2000);
  }, []);
  
  // Peek at the top element
  const peekStack = useCallback(() => {
    if (stackOrder.length === 0) {
      showMessage("Stack is empty - nothing to peek!");
      return;
    }
    const topId = stackOrder[0];
    setHighlightedNodeId(topId);
    showMessage(`Peek: ${nodes.find(n => n.id === topId)?.data.label}`);
    
    // Clear highlight after 1.5 seconds
    setTimeout(() => {
      setHighlightedNodeId(null);
    }, 1500);
  }, [stackOrder, nodes, showMessage]);
  
  // Clear the entire stack
  const clearStack = useCallback(() => {
    if (stackOrder.length === 0) {
      showMessage("Stack is already empty!");
      return;
    }
    setNodes([]);
    setStackOrder([]);
    showMessage("Stack cleared!");
  }, [stackOrder.length, showMessage]);
  
  // Check if the stack is empty
  const isEmptyStack = useCallback(() => {
    const isEmpty = stackOrder.length === 0;
    showMessage(isEmpty ? "Stack is empty" : "Stack is not empty");
  }, [stackOrder.length, showMessage]);
  
  // Get the size of the stack
  const getStackSize = useCallback(() => {
    showMessage(`Stack size: ${stackOrder.length}`);
  }, [stackOrder.length, showMessage]);

  // Handle node position changes during dragging
  const onNodesChange = useCallback((changes) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, []);

  // Start dragging the top node
  const onNodeDragStart = useCallback((event, node) => {
    if (node.id === stackOrder[0]) {
      setIsDraggingTop(true);
    }
  }, [stackOrder]);

  // Handle drag stop to decide removal or snap-back
  const onNodeDragStop = useCallback((event, node) => {
    if (node.id === stackOrder[0]) {
      setIsDraggingTop(false);
      const dx = node.position.x - STACK_X;
      if (Math.abs(dx) > THRESHOLD) {
        popFromStack();
      } else {
        setNodes((nds) =>
          nds.map((n) => {
            if (n.id === node.id) {
              return { ...n, position: { x: STACK_X, y: STACK_BASE_Y } };
            }
            return n;
          })
        );
      }
    }
  }, [stackOrder, popFromStack]);

  // Map stack order to ReactFlow nodes
  const flowNodes = stackOrder.map((nodeId, index) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return null;
    const isTop = index === 0;
    const isHighlighted = nodeId === highlightedNodeId;
    const position = isTop && isDraggingTop ? node.position : { x: STACK_X, y: STACK_BASE_Y + index * HEIGHT };
    return {
      ...node,
      position,
      draggable: isTop,
      data: {
        ...node.data,
        isTop,
        isHighlighted,
      },
    };
  }).filter(Boolean);

  return (
    <div className={styles.visualizer}>
      {/* Message display */}
      {message && <div className={styles.message}>{message}</div>}
      
      {/* Controls for stack interaction */}
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
        <button onClick={() => pushToStack(inputValue)} className={styles.btn}>
          Push
        </button>
        <button onClick={popFromStack} className={styles.btn}>
          Pop
        </button>
        <button onClick={peekStack} className={`${styles.btn} ${styles.peekBtn}`}>
          Peek
        </button>
        <button onClick={clearStack} className={`${styles.btn} ${styles.clearBtn}`}>
          Clear
        </button>
        <button onClick={isEmptyStack} className={`${styles.btn} ${styles.isEmptyBtn}`}>
          isEmpty
        </button>
        <button onClick={getStackSize} className={`${styles.btn} ${styles.sizeBtn}`}>
          Size
        </button>
      </div>

      {/* ReactFlow component taking full screen */}
      <div style={{ width: '100vw', height: '100vh' }}>
        <ReactFlow
          nodes={flowNodes}
          edges={[]}
          nodeTypes={{ stackNode: StackNode }}
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
const GraphVisualizer = (props) => {
  return (
    <ReactFlowProvider>
      <GraphVisualizerContent {...props} />
    </ReactFlowProvider>
  );
};

export default GraphVisualizer;