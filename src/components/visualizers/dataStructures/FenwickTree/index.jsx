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
import styles from './styles.module.css';

// Custom Fenwick Tree Node component
const FenwickTreeNode = ({ data }) => {
  return (
    <div className={`${styles.treeNode} ${data.state ? styles[data.state] : ''}`}>
      <Handle type="target" position={Position.Top} style={{ visibility: data.isRoot ? 'hidden' : 'visible' }} />
      <div className={styles.nodeContent}>
        <div className={styles.indexLabel}>
          Index: {data.index}
        </div>
        <div className={styles.value}>
          Value: {data.value}
        </div>
        <div className={styles.binaryIndex}>
          Binary: {data.binaryIndex}
        </div>
        <div className={styles.responsibility}>
          Range: {data.rangeStart} to {data.index}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

// Main Fenwick Tree visualizer component
const FenwickTreeVisualizerContent = ({ onBack }) => {
  // Node types registration
  const nodeTypes = useRef({ fenwickNode: FenwickTreeNode }).current;
  
  // State
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [array, setArray] = useState([]);
  const [fenwickArray, setFenwickArray] = useState([]);
  const [inputArray, setInputArray] = useState('');
  const [prefixSumIndex, setPrefixSumIndex] = useState('');
  const [updateIndex, setUpdateIndex] = useState('');
  const [updateValue, setUpdateValue] = useState('');
  const [message, setMessage] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showInternalArray, setShowInternalArray] = useState(false);
  
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
  
  // Highlight nodes for visualization
  const highlightNode = useCallback(async (index, state) => {
    setNodes(currentNodes => 
      currentNodes.map(node => {
        if (node.data.index === index) {
          return {
            ...node,
            data: {
              ...node.data,
              state: state
            }
          };
        }
        return node;
      })
    );
    await sleep(800);
  }, []);
  
  // Reset node highlighting
  const resetHighlights = useCallback(async () => {
    setNodes(currentNodes => 
      currentNodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          state: null
        }
      }))
    );
    await sleep(300);
  }, []);
  
  // Convert index to binary string representation
  const toBinary = (num, padLength = 8) => {
    return num.toString(2).padStart(padLength, '0');
  };
  
  // Calculate the least significant bit position
  const lsb = (index) => {
    return index & -index;
  };
  
  // Calculate the range start for a given index in the Fenwick tree
  const calculateRangeStart = (index) => {
    return index - lsb(index) + 1;
  };
  
  // Initialize Fenwick Tree from an array
  const initFenwickTree = (inputArr) => {
    const n = inputArr.length;
    const fenwick = new Array(n + 1).fill(0);
    
    // Build the Fenwick tree
    for (let i = 0; i < n; i++) {
      updateFenwickTree(fenwick, i, inputArr[i], false);
    }
    
    return fenwick;
  };
  
  // Update Fenwick Tree at a specific index
  const updateFenwickTree = (fenwick, index, value, isUpdate = true) => {
    const n = fenwick.length;
    index = index + 1; // Convert to 1-based indexing
    
    // If this is an update, add the value difference
    const delta = isUpdate ? value : value;
    
    // Update all responsible positions
    while (index < n) {
      fenwick[index] += delta;
      index += lsb(index);
    }
    
    return fenwick;
  };
  
  // Query prefix sum up to index
  const queryFenwickTree = async (index) => {
    if (isAnimating) return;
    setIsAnimating(true);
    
    try {
      if (index < 0 || index >= array.length) {
        showMessage(`Index must be between 0 and ${array.length - 1}`, 3000);
        return;
      }
      
      await resetHighlights();
      
      let i = parseInt(index) + 1; // Convert to 1-based indexing
      let sum = 0;
      
      // Animation to show the traversal
      showMessage(`Calculating prefix sum up to index ${index}...`);
      
      while (i > 0) {
        sum += fenwickArray[i];
        await highlightNode(i, 'querying');
        i -= lsb(i);
      }
      
      showMessage(`Prefix sum up to index ${index} is ${sum}`, 3000);
    } catch (error) {
      console.error("Error querying Fenwick tree:", error);
      showMessage("Error querying Fenwick tree", 3000);
    } finally {
      setIsAnimating(false);
      setTimeout(resetHighlights, 3000);
    }
  };
  
  // Update a value in the Fenwick Tree
  const updateFenwickValue = async () => {
    if (isAnimating) return;
    setIsAnimating(true);
    
    try {
      const index = parseInt(updateIndex);
      const value = parseInt(updateValue);
      
      if (isNaN(index) || isNaN(value)) {
        showMessage("Please enter valid numbers", 3000);
        return;
      }
      
      if (index < 0 || index >= array.length) {
        showMessage(`Index must be between 0 and ${array.length - 1}`, 3000);
        return;
      }
      
      await resetHighlights();
      
      // Calculate the difference from current value
      const oldValue = array[index];
      const delta = value - oldValue;
      
      // Update original array
      const newArray = [...array];
      newArray[index] = value;
      setArray(newArray);
      
      // Animation for update
      showMessage(`Updating index ${index} from ${oldValue} to ${value}...`);
      
      let i = index + 1; // Convert to 1-based indexing
      const newFenwick = [...fenwickArray];
      
      while (i < fenwickArray.length) {
        newFenwick[i] += delta;
        await highlightNode(i, 'updating');
        i += lsb(i);
      }
      
      setFenwickArray(newFenwick);
      showMessage(`Updated index ${index} to ${value}`, 3000);
      
      // Update visualization
      createFenwickTreeLayout(newArray, newFenwick);
    } catch (error) {
      console.error("Error updating Fenwick tree:", error);
      showMessage("Error updating Fenwick tree", 3000);
    } finally {
      setIsAnimating(false);
      setTimeout(resetHighlights, 3000);
    }
  };
  
  // Create a Fenwick Tree from the input
  const createFenwickTree = () => {
    if (isAnimating) return;
    
    try {
      let newArray = [];
      
      if (inputArray.trim() === '') {
        showMessage("Please enter values for the array", 3000);
        return;
      }
      
      // Parse input array
      try {
        newArray = inputArray.split(',').map(item => {
          const num = parseInt(item.trim());
          if (isNaN(num)) throw new Error("Invalid number");
          return num;
        });
      } catch (error) {
        showMessage("Please enter comma-separated numbers", 3000);
        return;
      }
      
      if (newArray.length === 0) {
        showMessage("Array cannot be empty", 3000);
        return;
      }
      
      if (newArray.length > 30) {
        showMessage("Please use 30 or fewer elements for better visualization", 3000);
        return;
      }
      
      // Initialize the Fenwick Tree
      const fenwick = initFenwickTree(newArray);
      
      // Update state
      setArray(newArray);
      setFenwickArray(fenwick);
      
      // Create visualization
      createFenwickTreeLayout(newArray, fenwick);
      
      showMessage("Fenwick Tree created successfully", 3000);
    } catch (error) {
      console.error("Error creating Fenwick tree:", error);
      showMessage("Error creating Fenwick tree", 3000);
    }
  };
  
  // Generate a random array
  const generateRandomArray = () => {
    if (isAnimating) return;
    
    const length = Math.floor(Math.random() * 10) + 5; // Random length between 5 and 14
    const randomArray = Array.from({ length }, () => Math.floor(Math.random() * 20));
    
    setInputArray(randomArray.join(', '));
    // Don't automatically create tree, let the user do it
  };
  
  // Clear the current tree
  const clearTree = () => {
    if (isAnimating) return;
    
    setArray([]);
    setFenwickArray([]);
    setNodes([]);
    setEdges([]);
    setInputArray('');
    setPrefixSumIndex('');
    setUpdateIndex('');
    setUpdateValue('');
    showMessage("Fenwick Tree cleared", 2000);
  };
  
  // Generate the visual layout of the Fenwick tree
  const createFenwickTreeLayout = (originalArray, fenwick) => {
    if (!fenwick || fenwick.length <= 1) {
      setNodes([]);
      setEdges([]);
      return;
    }
    
    const treeNodes = [];
    const treeEdges = [];
    const levelHeight = 100;
    const nodeWidth = 170;
    const maxBinaryDigits = Math.max(1, Math.floor(Math.log2(fenwick.length - 1)) + 1);
    
    // Calculate the max width needed based on the number of nodes at the bottom level
    const bottomLevelWidth = (fenwick.length - 1) * nodeWidth;
    
    for (let i = 1; i < fenwick.length; i++) {
      const binaryRep = toBinary(i, maxBinaryDigits);
      const rangeStart = calculateRangeStart(i);
      
      // Calculate position of the node
      // We'll position nodes based on the values they're responsible for
      const x = (i - 1) * nodeWidth;
      const y = 0; // All nodes at same level initially
      
      treeNodes.push({
        id: `node-${i}`,
        type: 'fenwickNode',
        position: { x, y },
        data: {
          index: i,
          value: fenwick[i],
          binaryIndex: binaryRep,
          rangeStart: rangeStart,
          isRoot: i === 1,
          state: null
        }
      });
      
      // Add edges to visualize connections in traversal
      if (i > 1) {
        // Connect based on the tree traversal pattern
        const parentIndex = i - lsb(i);
        if (parentIndex >= 1) {
          treeEdges.push({
            id: `edge-${parentIndex}-${i}`,
            source: `node-${parentIndex}`,
            target: `node-${i}`,
            type: 'smoothstep'
          });
        }
      }
    }
    
    setNodes(treeNodes);
    setEdges(treeEdges);
  };
  
  return (
    <div className={styles.visualizer}>
      <button onClick={onBack} className={styles.backButton}>Back</button>
      
      {message && (
        <div className={styles.message}>{message}</div>
      )}
      
      <div className={styles.controls}>
        <div className={styles.inputForm}>
          <input
            type="text"
            value={inputArray}
            onChange={(e) => setInputArray(e.target.value)}
            placeholder="Enter comma-separated numbers"
            className={styles.input}
            disabled={isAnimating}
          />
          <button 
            onClick={createFenwickTree} 
            className={styles.btn}
            disabled={isAnimating}
          >
            Create Fenwick Tree
          </button>
          <button 
            onClick={generateRandomArray} 
            className={styles.btn}
            disabled={isAnimating}
          >
            Random Array
          </button>
          <button 
            onClick={clearTree} 
            className={styles.btn}
            disabled={isAnimating}
          >
            Clear
          </button>
        </div>
      </div>
      
      <div className={styles.operationControls}>
        <div className={styles.queryForm}>
          <h4>Prefix Sum Query</h4>
          <div className={styles.inputGroup}>
            <input
              type="number"
              value={prefixSumIndex}
              onChange={(e) => setPrefixSumIndex(e.target.value)}
              placeholder="Index"
              className={styles.smallInput}
              min="0"
              max={array.length > 0 ? array.length - 1 : 0}
              disabled={isAnimating || array.length === 0}
            />
            <button 
              onClick={() => queryFenwickTree(prefixSumIndex)} 
              className={styles.btn}
              disabled={isAnimating || array.length === 0}
            >
              Query Sum
            </button>
          </div>
        </div>
        
        <div className={styles.updateForm}>
          <h4>Update Value</h4>
          <div className={styles.inputGroup}>
            <input
              type="number"
              value={updateIndex}
              onChange={(e) => setUpdateIndex(e.target.value)}
              placeholder="Index"
              className={styles.smallInput}
              min="0"
              max={array.length > 0 ? array.length - 1 : 0}
              disabled={isAnimating || array.length === 0}
            />
            <input
              type="number"
              value={updateValue}
              onChange={(e) => setUpdateValue(e.target.value)}
              placeholder="New value"
              className={styles.smallInput}
              disabled={isAnimating || array.length === 0}
            />
            <button 
              onClick={updateFenwickValue} 
              className={styles.btn}
              disabled={isAnimating || array.length === 0}
            >
              Update
            </button>
          </div>
        </div>
        
        <div className={styles.displayToggle}>
          <label className={styles.toggleLabel}>
            <input
              type="checkbox"
              checked={showInternalArray}
              onChange={() => setShowInternalArray(!showInternalArray)}
              disabled={isAnimating}
            />
            Show Fenwick Array
          </label>
        </div>
      </div>
      
      {/* Array visualization */}
      <div className={styles.arrayContainer}>
        <div className={styles.arraySection}>
          <h4>Original Array</h4>
          <div className={styles.array}>
            {array.map((value, index) => (
              <div key={index} className={styles.arrayItem}>
                <div className={styles.arrayIndex}>{index}</div>
                <div className={styles.arrayValue}>{value}</div>
              </div>
            ))}
          </div>
        </div>
        
        {showInternalArray && (
          <div className={styles.arraySection}>
            <h4>Fenwick Array (1-indexed)</h4>
            <div className={styles.array}>
              {fenwickArray.map((value, index) => (
                index > 0 && (
                  <div key={index} className={styles.arrayItem}>
                    <div className={styles.arrayIndex}>{index}</div>
                    <div className={styles.arrayValue}>{value}</div>
                  </div>
                )
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Info Panel */}
      <div className={styles.infoPanel}>
        <h3>Fenwick Tree Visualizer</h3>
        <p>
          Also known as Binary Indexed Tree (BIT), Fenwick Trees provide efficient 
          prefix sum calculations and updates in O(log n) time.
        </p>
        <div className={styles.bitExplanation}>
          <h4>How It Works:</h4>
          <p>Each index is responsible for a range of elements determined by its binary representation.</p>
          <p>The least significant bit (LSB) determines how many elements an index covers.</p>
        </div>
        <div className={styles.legend}>
          <div>
            <span className={`${styles.legendItem} ${styles.default}`}></span>
            <span>Normal Node</span>
          </div>
          <div>
            <span className={`${styles.legendItem} ${styles.querying}`}></span>
            <span>Querying</span>
          </div>
          <div>
            <span className={`${styles.legendItem} ${styles.updating}`}></span>
            <span>Updating</span>
          </div>
        </div>
      </div>
      
      {/* ReactFlow component */}
      <div className={styles.flowContainer}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
          minZoom={0.2}
          maxZoom={4}
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
};

// Wrap in ReactFlowProvider
const FenwickTreeVisualizer = (props) => {
  return (
    <ReactFlowProvider>
      <FenwickTreeVisualizerContent {...props} />
    </ReactFlowProvider>
  );
};

export default FenwickTreeVisualizer; 