import React, { useState, useRef, useEffect } from 'react';
import './heapVisualizer.css';

const HeapVisualizer = ({ onBack }) => {
  const [nodes, setNodes] = useState([]);
  const [heapType, setHeapType] = useState('max'); // 'max' or 'min'
  const [inputValue, setInputValue] = useState(''); // New state for input value
  const treeAreaRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const LEVEL_HEIGHT = 120;
  const [animatingNodes, setAnimatingNodes] = useState(new Set());
  const [isAnimating, setIsAnimating] = useState(false);

  // Add new state variables for array visualization
  const [arrayInputValue, setArrayInputValue] = useState('');
  const [activeIndex, setActiveIndex] = useState(null);
  const [comparingIndices, setComparingIndices] = useState([]);
  const [swappingIndices, setSwappingIndices] = useState([]);

  const heapify = (array, i, heapSize) => {
    const left = 2 * i + 1;
    const right = 2 * i + 2;
    let largest = i;

    if (heapType === 'max') {
      if (left < heapSize && parseInt(array[left].label) > parseInt(array[largest].label)) {
        largest = left;
      }
      if (right < heapSize && parseInt(array[right].label) > parseInt(array[largest].label)) {
        largest = right;
      }
    } else {
      if (left < heapSize && parseInt(array[left].label) < parseInt(array[largest].label)) {
        largest = left;
      }
      if (right < heapSize && parseInt(array[right].label) < parseInt(array[largest].label)) {
        largest = right;
      }
    }

    if (largest !== i) {
      // Swap values
      const temp = array[i].label;
      array[i].label = array[largest].label;
      array[largest].label = temp;
      
      heapify(array, largest, heapSize);
    }
  };

  const calculateNodePosition = (index) => {
    const level = Math.floor(Math.log2(index + 1));
    const offset = index - Math.pow(2, level) + 1;
    const totalNodesInLevel = Math.pow(2, level);
    const horizontalSpacing = window.innerWidth / (totalNodesInLevel + 1);
    
    return {
      x: (offset + 1) * horizontalSpacing,
      y: level * LEVEL_HEIGHT + 100
    };
  };

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const insertNode = async (value) => {
    if (isAnimating) return;
    setIsAnimating(true);

    const newNodeIndex = nodes.length;
    const position = calculateNodePosition(newNodeIndex);

    const newNode = {
      id: `node-${newNodeIndex + 1}`,
      label: value.toString(),
      position: position,
      state: 'inserting'
    };

    const newNodes = [...nodes, newNode];
    setNodes(newNodes);
    
    // Wait for insertion animation
    await sleep(500);

    // Heapify up with animation
    let current = newNodeIndex;
    while (current > 0) {
      const parentIndex = Math.floor((current - 1) / 2);
      
      // Highlight nodes being compared
      setAnimatingNodes(new Set([current, parentIndex]));
      await sleep(1000);

      const shouldSwap = heapType === 'max' 
        ? parseInt(newNodes[current].label) > parseInt(newNodes[parentIndex].label)
        : parseInt(newNodes[current].label) < parseInt(newNodes[parentIndex].label);

      if (shouldSwap) {
        // Update nodes state to show swapping animation
        newNodes[current].state = 'swapping';
        newNodes[parentIndex].state = 'swapping';
        setNodes([...newNodes]);
        await sleep(500);

        // Swap labels
        const temp = newNodes[current].label;
        newNodes[current].label = newNodes[parentIndex].label;
        newNodes[parentIndex].label = temp;
        
        // Reset state
        newNodes[current].state = '';
        newNodes[parentIndex].state = '';
        setNodes([...newNodes]);
        
        current = parentIndex;
      } else {
        break;
      }
    }

    // Clear animations
    setAnimatingNodes(new Set());
    setIsAnimating(false);

    // Recalculate all node positions
    newNodes.forEach((node, index) => {
      node.position = calculateNodePosition(index);
      node.state = '';
    });

    setNodes([...newNodes]);
  };

  const deleteRoot = () => {
    if (nodes.length === 0) return;

    const newNodes = [...nodes];
    newNodes[0].label = newNodes[nodes.length - 1].label;
    newNodes.pop();
    
    heapify(newNodes, 0, newNodes.length);
    setNodes(newNodes);
  };

  const rebuildHeap = async () => {
    if (nodes.length <= 1) return;
    
    const newNodes = [...nodes];
    // Start from the last non-leaf node
    for (let i = Math.floor(nodes.length / 2) - 1; i >= 0; i--) {
      // Highlight current node being processed
      setAnimatingNodes(new Set([i]));
      await sleep(500);

      let largest = i;
      const left = 2 * i + 1;
      const right = 2 * i + 2;

      // Compare with children
      if (left < nodes.length) {
        setAnimatingNodes(new Set([i, left]));
        await sleep(500);
        
        if (heapType === 'max') {
          if (parseInt(newNodes[left].label) > parseInt(newNodes[largest].label)) {
            largest = left;
          }
        } else {
          if (parseInt(newNodes[left].label) < parseInt(newNodes[largest].label)) {
            largest = left;
          }
        }
      }

      if (right < nodes.length) {
        setAnimatingNodes(new Set([largest, right]));
        await sleep(500);
        
        if (heapType === 'max') {
          if (parseInt(newNodes[right].label) > parseInt(newNodes[largest].label)) {
            largest = right;
          }
        } else {
          if (parseInt(newNodes[right].label) < parseInt(newNodes[largest].label)) {
            largest = right;
          }
        }
      }

      if (largest !== i) {
        // Show swapping animation
        newNodes[i].state = 'swapping';
        newNodes[largest].state = 'swapping';
        setNodes([...newNodes]);
        await sleep(500);

        // Swap values
        const temp = newNodes[i].label;
        newNodes[i].label = newNodes[largest].label;
        newNodes[largest].label = temp;

        // Reset state
        newNodes[i].state = '';
        newNodes[largest].state = '';
        setNodes([...newNodes]);
        
        // Recursively heapify the affected subtree
        await heapifyWithAnimation(newNodes, largest, heapType);
      }
    }

    // Clear animations
    setAnimatingNodes(new Set());
    
    // Recalculate positions
    newNodes.forEach((node, index) => {
      node.position = calculateNodePosition(index);
      node.state = '';
    });
    
    setNodes([...newNodes]);
  };

  const heapifyWithAnimation = async (array, i, currentHeapType) => {
    const heapSize = array.length;
    const left = 2 * i + 1;
    const right = 2 * i + 2;
    let largest = i;

    if (left < heapSize) {
      setAnimatingNodes(new Set([i, left]));
      await sleep(500);
      
      if (currentHeapType === 'max') {
        if (parseInt(array[left].label) > parseInt(array[largest].label)) {
          largest = left;
        }
      } else {
        if (parseInt(array[left].label) < parseInt(array[largest].label)) {
          largest = left;
        }
      }
    }

    if (right < heapSize) {
      setAnimatingNodes(new Set([largest, right]));
      await sleep(500);
      
      if (currentHeapType === 'max') {
        if (parseInt(array[right].label) > parseInt(array[largest].label)) {
          largest = right;
        }
      } else {
        if (parseInt(array[right].label) < parseInt(array[largest].label)) {
          largest = right;
        }
      }
    }

    if (largest !== i) {
      array[i].state = 'swapping';
      array[largest].state = 'swapping';
      setNodes([...array]);
      await sleep(500);

      const temp = array[i].label;
      array[i].label = array[largest].label;
      array[largest].label = temp;

      array[i].state = '';
      array[largest].state = '';
      setNodes([...array]);

      await heapifyWithAnimation(array, largest, currentHeapType);
    }
  };

  const handleHeapTypeSwitch = async () => {
    if (isAnimating) return;
    setIsAnimating(true);
    
    // Store the new heap type
    const newHeapType = heapType === 'max' ? 'min' : 'max';
    
    // Create a copy of nodes
    const newNodes = [...nodes];
    
    // Update heap type
    setHeapType(newHeapType);
    
    // Start from the last non-leaf node
    for (let i = Math.floor(newNodes.length / 2) - 1; i >= 0; i--) {
      setAnimatingNodes(new Set([i]));
      await sleep(500);

      let largest = i;
      const left = 2 * i + 1;
      const right = 2 * i + 2;

      if (left < newNodes.length) {
        setAnimatingNodes(new Set([i, left]));
        await sleep(500);
        
        if (newHeapType === 'max') {
          if (parseInt(newNodes[left].label) > parseInt(newNodes[largest].label)) {
            largest = left;
          }
        } else {
          if (parseInt(newNodes[left].label) < parseInt(newNodes[largest].label)) {
            largest = left;
          }
        }
      }

      if (right < newNodes.length) {
        setAnimatingNodes(new Set([largest, right]));
        await sleep(500);
        
        if (newHeapType === 'max') {
          if (parseInt(newNodes[right].label) > parseInt(newNodes[largest].label)) {
            largest = right;
          }
        } else {
          if (parseInt(newNodes[right].label) < parseInt(newNodes[largest].label)) {
            largest = right;
          }
        }
      }

      if (largest !== i) {
        newNodes[i].state = 'swapping';
        newNodes[largest].state = 'swapping';
        setNodes([...newNodes]);
        await sleep(500);

        const temp = newNodes[i].label;
        newNodes[i].label = newNodes[largest].label;
        newNodes[largest].label = temp;

        newNodes[i].state = '';
        newNodes[largest].state = '';
        setNodes([...newNodes]);
        
        // Use the new heap type here
        await heapifyWithAnimation(newNodes, largest, newHeapType);
      }
    }

    setAnimatingNodes(new Set());
    
    newNodes.forEach((node, index) => {
      node.position = calculateNodePosition(index);
      node.state = '';
    });
    
    setNodes([...newNodes]);
    setIsAnimating(false);
  };

  // Canvas drag handlers
  const handleCanvasDragStart = (e) => {
    setIsDraggingCanvas(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
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

  const handleInsert = (e) => {
    e.preventDefault(); // Prevent form submission
    if (inputValue.trim() === '') return;
    
    const value = parseInt(inputValue);
    if (isNaN(value)) {
      alert('Please enter a valid number');
      return;
    }
    
    insertNode(value);
    setInputValue(''); // Clear input after insertion
  };

  const deleteNode = async (nodeIndex) => {
    if (isAnimating) return;
    setIsAnimating(true);

    const newNodes = [...nodes];
    
    // Highlight the node being deleted
    setAnimatingNodes(new Set([nodeIndex]));
    newNodes[nodeIndex].state = 'deleting';
    setNodes([...newNodes]);
    await sleep(500);

    // If it's a leaf node, simply remove it
    if (nodeIndex === newNodes.length - 1) {
      newNodes.pop();
    } else {
      // Replace with the last node
      newNodes[nodeIndex].label = newNodes[newNodes.length - 1].label;
      newNodes[nodeIndex].state = 'inserting';
      setNodes([...newNodes]);
      await sleep(500);
      
      // Remove the last node
      newNodes.pop();
      
      // Heapify down from the replaced node
      await heapifyWithAnimation(newNodes, nodeIndex, heapType);
    }

    // Recalculate positions
    newNodes.forEach((node, index) => {
      node.position = calculateNodePosition(index);
      node.state = '';
    });

    setNodes([...newNodes]);
    setAnimatingNodes(new Set());
    setIsAnimating(false);
  };

  // Add array input handler
  const handleArrayInputChange = (e) => {
    // Allow only numbers and commas
    const value = e.target.value.replace(/[^0-9,]/g, '');
    setArrayInputValue(value);
  };

  // Remove or modify the useEffect that initializes the root node
  useEffect(() => {
    // Initialize with empty nodes array instead of default root node
    setNodes([]);
  }, []);

  return (
    <div className="heap-visualizer">
      <div className="heap-controls">
        <button className="heap-back-btn" onClick={onBack}>
          Back to Home
        </button>
        <button 
          className="heap-type-btn"
          onClick={handleHeapTypeSwitch}
        >
          Current: {heapType === 'max' ? 'Max' : 'Min'} Heap
        </button>
        <form onSubmit={handleInsert} className="heap-insert-form">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Enter value"
            className="heap-input"
          />
          <button type="submit" className="heap-action-btn">
            Insert
          </button>
        </form>
      </div>

      {/* Array visualization section */}
      <div className="heap-array-visualization">
        <div className="heap-array-container">
          {nodes.map((node, index) => (
            <div
              key={`array-${index}`}
              className={`heap-array-node ${
                animatingNodes.has(index) ? 'comparing' : ''
              } ${node.state}`}
            >
              <span className="heap-array-value">{node.label}</span>
              <span className="heap-array-index">{index}</span>
              <button
                className="delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteNode(index);
                }}
                title="Delete node"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="heap-area"
        ref={treeAreaRef}
        onMouseDown={handleCanvasDragStart}
        onMouseMove={handleCanvasDrag}
        onMouseUp={handleCanvasDragEnd}
        onMouseLeave={handleCanvasDragEnd}
      >
        <div className="heap-content" style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`
        }}>
          {nodes.map((node, index) => {
            const parentIndex = Math.floor((index - 1) / 2);
            if (index > 0) {
              const parent = nodes[parentIndex];
              return (
                <React.Fragment key={`connection-${node.id}`}>
                  <div
                    className="heap-connection"
                    style={{
                      left: parent.position.x + 25,
                      top: parent.position.y + 25,
                      width: Math.sqrt(
                        Math.pow(node.position.x - parent.position.x, 2) +
                        Math.pow(node.position.y - parent.position.y, 2)
                      ),
                      transform: `rotate(${Math.atan2(
                        node.position.y - parent.position.y,
                        node.position.x - parent.position.x
                      )}rad)`
                    }}
                  />
                </React.Fragment>
              );
            }
            return null;
          })}
          {nodes.map((node, index) => (
            <div
              key={node.id}
              className={`heap-node ${node.state} ${
                animatingNodes.has(nodes.indexOf(node)) ? 'comparing' : ''
              }`}
              style={{
                left: node.position.x,
                top: node.position.y
              }}
            >
              {node.label}
              <button
                className="delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteNode(index);
                }}
                title="Delete node"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HeapVisualizer; 