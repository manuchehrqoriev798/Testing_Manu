import React, { useState, useCallback, useEffect, useRef } from 'react';
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
import './CircularBufferNode.css';

// Custom Buffer Cell Node component
const BufferCellNode = ({ data }) => {
  return (
    <div 
      className={`${styles.bufferCell} 
                 ${data.isHead ? styles.headCell : ''} 
                 ${data.isTail ? styles.tailCell : ''} 
                 ${data.isEmpty ? styles.emptyCell : ''} 
                 ${data.isHighlighted ? styles.highlightedCell : ''}`}
    >
      {data.isHead && <div className="headIndicator">HEAD</div>}
      {data.isTail && <div className="tailIndicator">TAIL</div>}
      
      <div className="cellContent">
        {!data.isEmpty ? (
          <div className="cellValue">{data.value}</div>
        ) : (
          <div className="emptyIndicator">Empty</div>
        )}
      </div>
      <div className="cellIndex">{data.index}</div>
    </div>
  );
};

// Main content component
const CircularBufferNode = ({ onBack }) => {
  // Node types
  const nodeTypes = useRef({ bufferCell: BufferCellNode }).current;
  
  // State
  const [bufferSize, setBufferSize] = useState(8);
  const [buffer, setBuffer] = useState(new Array(bufferSize).fill(null));
  const [head, setHead] = useState(0);
  const [tail, setTail] = useState(0);
  const [count, setCount] = useState(0);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [message, setMessage] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isWrapped, setIsWrapped] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(null);
  
  // Helper function to show messages
  const showMessage = useCallback((text, duration = 3000) => {
    setMessage(text);
    setTimeout(() => setMessage(null), duration);
  }, []);
  
  // Sleep function for animations
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  
  // Handle node changes
  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  
  // Handle edge changes
  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );
  
  // Create buffer nodes arranged in a circle
  const createBufferNodes = useCallback(() => {
    const center = { x: 400, y: 300 };
    const radius = Math.min(center.x, center.y) - 100;
    const newNodes = [];
    const newEdges = [];
    
    // Create nodes in a circular arrangement
    for (let i = 0; i < bufferSize; i++) {
      // Calculate position on the circle
      const angle = (2 * Math.PI * i) / bufferSize - Math.PI / 2; // Start from top
      const x = center.x + radius * Math.cos(angle);
      const y = center.y + radius * Math.sin(angle);
      
      // Create node
      newNodes.push({
        id: `cell-${i}`,
        type: 'bufferCell',
        position: { x, y },
        data: {
          index: i,
          value: buffer[i],
          isEmpty: buffer[i] === null,
          isHead: i === head,
          isTail: i === tail,
          isHighlighted: i === highlightedIndex
        }
      });
      
      // Create edge to next node
      newEdges.push({
        id: `edge-${i}`,
        source: `cell-${i}`,
        target: `cell-${(i + 1) % bufferSize}`,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#888', strokeWidth: 2 }
      });
    }
    
    setNodes(newNodes);
    setEdges(newEdges);
  }, [buffer, bufferSize, head, tail, highlightedIndex]);
  
  // Initialize buffer display
  useEffect(() => {
    createBufferNodes();
  }, [createBufferNodes]);
  
  // Reset highlighted node after delay
  useEffect(() => {
    if (highlightedIndex !== null) {
      const timer = setTimeout(() => {
        setHighlightedIndex(null);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [highlightedIndex]);
  
  // Resize the buffer
  const resizeBuffer = useCallback(async (newSize) => {
    if (isAnimating) return;
    setIsAnimating(true);
    
    // Create new buffer of the requested size
    const newBuffer = new Array(newSize).fill(null);
    
    if (count > 0) {
      // Copy existing elements to new buffer
      let newCount = 0;
      let newHead = 0;
      
      for (let i = 0; i < count && i < newSize; i++) {
        const oldIndex = (head + i) % bufferSize;
        newBuffer[newHead + i] = buffer[oldIndex];
        newCount++;
      }
      
      setCount(newCount);
      setHead(0);
      setTail(newCount % newSize);
      
      if (newCount === newSize) {
        setIsWrapped(true);
      } else {
        setIsWrapped(false);
      }
    } else {
      // Buffer is empty, just reset head and tail
      setHead(0);
      setTail(0);
      setIsWrapped(false);
    }
    
    setBuffer(newBuffer);
    setBufferSize(newSize);
    
    await sleep(100); // Small delay for state to update
    setIsAnimating(false);
    
    showMessage(`Buffer resized to ${newSize} elements`);
  }, [buffer, bufferSize, count, head, isAnimating, showMessage]);
  
  // Enqueue an element
  const enqueue = useCallback(async (value) => {
    if (!value.trim()) {
      showMessage("Please enter a value to enqueue");
      return;
    }
    
    if (isAnimating) return;
    setIsAnimating(true);
    
    // Check if buffer is full
    if (count === bufferSize) {
      showMessage("Buffer is full! Cannot enqueue more elements.");
      setIsAnimating(false);
      return;
    }
    
    // Highlight the tail position
    setHighlightedIndex(tail);
    await sleep(500);
    
    // Add the item at the tail position
    const newBuffer = [...buffer];
    newBuffer[tail] = value;
    setBuffer(newBuffer);
    
    // Update tail position
    const newTail = (tail + 1) % bufferSize;
    setTail(newTail);
    
    // Update count
    const newCount = count + 1;
    setCount(newCount);
    
    // Check if buffer is now wrapped
    if (newTail === head) {
      setIsWrapped(true);
    }
    
    await sleep(500);
    setInputValue('');
    setIsAnimating(false);
    
    showMessage(`Enqueued "${value}" at position ${tail}`);
  }, [buffer, bufferSize, count, head, isAnimating, showMessage, tail]);
  
  // Dequeue an element
  const dequeue = useCallback(async () => {
    if (isAnimating) return;
    setIsAnimating(true);
    
    // Check if buffer is empty
    if (count === 0) {
      showMessage("Buffer is empty! Nothing to dequeue.");
      setIsAnimating(false);
      return;
    }
    
    // Highlight the head position
    setHighlightedIndex(head);
    await sleep(500);
    
    // Get the value at head
    const value = buffer[head];
    
    // Remove the item from head
    const newBuffer = [...buffer];
    newBuffer[head] = null;
    setBuffer(newBuffer);
    
    // Update head position
    const newHead = (head + 1) % bufferSize;
    setHead(newHead);
    
    // Update count
    const newCount = count - 1;
    setCount(newCount);
    
    // Check if buffer is no longer wrapped
    if (newCount === 0) {
      setIsWrapped(false);
    }
    
    await sleep(500);
    setIsAnimating(false);
    
    showMessage(`Dequeued "${value}" from position ${head}`);
  }, [buffer, bufferSize, count, head, isAnimating, showMessage]);
  
  // Clear the buffer
  const clearBuffer = useCallback(() => {
    if (isAnimating) return;
    
    setBuffer(new Array(bufferSize).fill(null));
    setHead(0);
    setTail(0);
    setCount(0);
    setIsWrapped(false);
    
    showMessage("Buffer cleared");
  }, [bufferSize, isAnimating, showMessage]);
  
  return (
    <div className="visualizer">
      {/* Message display */}
      {message && <div className="message">{message}</div>}
      
      {/* Controls */}
      <div className="controls">
        <button onClick={onBack} className="backBtn">
          Back
        </button>
        
        <form 
          className="inputForm"
          onSubmit={(e) => {
            e.preventDefault();
            enqueue(inputValue);
          }}
        >
          <input
            type="text"
            className="input"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Enter value"
            disabled={isAnimating || count === bufferSize}
          />
          <button 
            type="submit" 
            className="btn"
            disabled={isAnimating || count === bufferSize || !inputValue.trim()}
          >
            Enqueue
          </button>
        </form>
        
        <div className="buttonGroup">
          <button 
            onClick={dequeue} 
            className="btn"
            disabled={isAnimating || count === 0}
          >
            Dequeue
          </button>
          <button 
            onClick={clearBuffer} 
            className="btn"
            disabled={isAnimating || count === 0}
          >
            Clear
          </button>
        </div>
      </div>
      
      {/* Size controls */}
      <div className="sizeControls">
        <div className="sizeTitle">Buffer Size:</div>
        <div className="sizeButtons">
          <button 
            onClick={() => resizeBuffer(4)} 
            className={`${styles.sizeBtn} ${bufferSize === 4 ? styles.active : ''}`}
            disabled={isAnimating}
          >
            4
          </button>
          <button 
            onClick={() => resizeBuffer(8)} 
            className={`${styles.sizeBtn} ${bufferSize === 8 ? styles.active : ''}`}
            disabled={isAnimating}
          >
            8
          </button>
          <button 
            onClick={() => resizeBuffer(12)} 
            className={`${styles.sizeBtn} ${bufferSize === 12 ? styles.active : ''}`}
            disabled={isAnimating}
          >
            12
          </button>
        </div>
      </div>
      
      {/* Buffer info panel */}
      <div className="infoPanel">
        <h3>Circular Buffer</h3>
        <p>
          A circular buffer (also called a ring buffer) is a fixed-size buffer that works as if the memory is connected end-to-end.
        </p>
        <div className="bufferStats">
          <div><strong>Size:</strong> {bufferSize}</div>
          <div><strong>Elements:</strong> {count}/{bufferSize}</div>
          <div><strong>Head:</strong> {head}</div>
          <div><strong>Tail:</strong> {tail}</div>
          <div><strong>Status:</strong> {count === 0 ? 'Empty' : (count === bufferSize ? 'Full' : 'Partially Filled')}</div>
        </div>
      </div>
      
      {/* ReactFlow component */}
      <div className="flowContainer">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
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
const CircularBufferVisualizer = (props) => {
  return (
    <ReactFlowProvider>
      <CircularBufferVisualizerContent {...props} />
    </ReactFlowProvider>
  );
};

export default CircularBufferNode; 