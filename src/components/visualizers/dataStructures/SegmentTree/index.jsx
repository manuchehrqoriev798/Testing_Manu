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

// Custom Segment Tree Node component
const SegmentTreeNode = ({ data }) => {
  return (
    <div className={`${styles.treeNode} ${data.state ? styles[data.state] : ''}`}>
      <Handle type="target" position={Position.Top} style={{ visibility: data.isRoot ? 'hidden' : 'visible' }} />
      <div className={styles.nodeContent}>
        <div className={styles.rangeLabel}>
          [{data.rangeStart}, {data.rangeEnd}]
        </div>
        <div className={styles.value}>
          {data.value !== undefined ? data.value : '?'}
        </div>
        <div className={styles.operation}>
          {data.operation}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

// Main Segment Tree visualizer component
const SegmentTreeVisualizerContent = ({ onBack }) => {
  // Node types registration
  const nodeTypes = useRef({ segmentNode: SegmentTreeNode }).current;
  
  // State
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [array, setArray] = useState([]);
  const [inputArray, setInputArray] = useState('');
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [updateIndex, setUpdateIndex] = useState('');
  const [updateValueInput, setUpdateValueInput] = useState('');
  const [message, setMessage] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [operation, setOperation] = useState('sum'); // 'sum', 'min', 'max'
  
  // Segment Tree root
  const segmentTree = useRef(null);
  const nextId = useRef(0);
  
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
  const highlightNode = useCallback(async (nodeId, state) => {
    setNodes(currentNodes => 
      currentNodes.map(node => {
        if (node.id === nodeId) {
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
  
  // Build segment tree (recursive)
  const buildSegmentTree = useCallback((arr, node, start, end, operation) => {
    if (start === end) {
      node.value = arr[start];
      return node.value;
    }
  
    const mid = Math.floor((start + end) / 2);
    const leftNodeId = `node-${nextId.current++}`;
    const rightNodeId = `node-${nextId.current++}`;
  
    // Create left and right children
    const leftNode = {
      id: leftNodeId,
      rangeStart: start,
      rangeEnd: mid,
      operation: operation,
      children: []
    };
  
    const rightNode = {
      id: rightNodeId,
      rangeStart: mid + 1,
      rangeEnd: end,
      operation: operation,
      children: []
    };
  
    // Add children to current node
    node.children.push(leftNode);
    node.children.push(rightNode);
  
    // Recursively build left and right subtrees
    const leftVal = buildSegmentTree(arr, leftNode, start, mid, operation);
    const rightVal = buildSegmentTree(arr, rightNode, mid + 1, end, operation);
  
    // Calculate current node value based on operation
    if (operation === 'sum') {
      node.value = leftVal + rightVal;
    } else if (operation === 'min') {
      node.value = Math.min(leftVal, rightVal);
    } else if (operation === 'max') {
      node.value = Math.max(leftVal, rightVal);
    }
  
    return node.value;
  }, []);
  
  // Create segment tree from input array
  const createSegmentTree = useCallback(async () => {
    if (isAnimating) return;
  
    try {
      setIsAnimating(true);
      await resetHighlights();
  
      // Parse input array if provided, otherwise use current array
      let inputArr = array;
      if (inputArray.trim()) {
        inputArr = inputArray.split(',').map(item => {
          const num = Number(item.trim());
          if (isNaN(num)) throw new Error('Invalid input: array must contain only numbers');
          return num;
        });
        setArray(inputArr);
      }
  
      if (inputArr.length === 0) {
        showMessage('Please provide at least one number');
        setIsAnimating(false);
        return;
      }
  
      // Reset tree
      nextId.current = 0;
      const rootNodeId = `node-${nextId.current++}`;
      
      // Create root node
      const root = {
        id: rootNodeId,
        rangeStart: 0,
        rangeEnd: inputArr.length - 1,
        operation: operation,
        children: []
      };
  
      // Build the tree
      buildSegmentTree(inputArr, root, 0, inputArr.length - 1, operation);
      segmentTree.current = root;
  
      // Convert tree to ReactFlow format
      const { nodes: treeNodes, edges: treeEdges } = convertToReactFlow(root);
      
      setNodes(treeNodes);
      setEdges(treeEdges);
      
      showMessage(`Segment Tree created with operation: ${operation}`);
    } catch (error) {
      showMessage(error.message);
    } finally {
      setIsAnimating(false);
    }
  }, [isAnimating, array, inputArray, operation, buildSegmentTree, resetHighlights, showMessage]);
  
  // Convert segment tree to ReactFlow format
  const convertToReactFlow = useCallback((root) => {
    const nodes = [];
    const edges = [];
    const queue = [{ node: root, x: 0, y: 0, level: 0 }];
    
    // Level-order traversal to position nodes
    const levelWidths = new Map();
    
    while (queue.length > 0) {
      const { node, x, y, level } = queue.shift();
      
      // Track position at each level
      if (!levelWidths.has(level)) {
        levelWidths.set(level, 0);
      } else {
        levelWidths.set(level, levelWidths.get(level) + 1);
      }
      
      // Create ReactFlow node
      nodes.push({
        id: node.id,
        position: { x: x * 220, y: level * 120 },
        data: {
          value: node.value,
          rangeStart: node.rangeStart,
          rangeEnd: node.rangeEnd,
          operation: node.operation,
          isRoot: level === 0
        },
        type: 'segmentNode'
      });
      
      // Process children
      if (node.children && node.children.length > 0) {
        let childIndex = 0;
        for (const child of node.children) {
          // Add edge
          edges.push({
            id: `edge-${node.id}-${child.id}`,
            source: node.id,
            target: child.id
          });
          
          // Add child to queue
          const childX = x + (childIndex === 0 ? -1 : 1);
          queue.push({
            node: child,
            x: childX,
            y: y + 1,
            level: level + 1
          });
          
          childIndex++;
        }
      }
    }
    
    return { nodes, edges };
  }, []);
  
  // Random array generator
  const generateRandomArray = useCallback(() => {
    if (isAnimating) return;
    
    const length = Math.floor(Math.random() * 8) + 3; // 3 to 10 elements
    const randomArray = Array.from({ length }, () => Math.floor(Math.random() * 100));
    
    setArray(randomArray);
    setInputArray(randomArray.join(', '));
  }, [isAnimating]);
  
  // Range query on segment tree
  const queryRange = useCallback(async () => {
    if (!segmentTree.current) {
      showMessage('Please create a segment tree first');
      return;
    }
    
    if (isAnimating) return;
    
    setIsAnimating(true);
    await resetHighlights();
    
    try {
      const start = parseInt(rangeStart);
      const end = parseInt(rangeEnd);
      
      if (isNaN(start) || isNaN(end)) {
        showMessage('Please enter valid range values');
        setIsAnimating(false);
        return;
      }
      
      if (start < 0 || end >= array.length || start > end) {
        showMessage(`Range must be between 0 and ${array.length - 1}`);
        setIsAnimating(false);
        return;
      }
      
      let result = null;
      
      // Recursive query function
      const queryRecursive = async (nodeId, nodeStart, nodeEnd) => {
        await highlightNode(nodeId, 'visiting');
        
        // If current segment is completely inside query range
        if (nodeStart >= start && nodeEnd <= end) {
          await highlightNode(nodeId, 'contained');
          
          // Get the node value
          const node = nodes.find(n => n.id === nodeId);
          return node.data.value;
        }
        
        // If current segment is completely outside query range
        if (nodeEnd < start || nodeStart > end) {
          await highlightNode(nodeId, 'outside');
          return operation === 'sum' ? 0 : 
                 operation === 'min' ? Infinity : 
                 -Infinity;
        }
        
        // If current segment is partially inside query range
        await highlightNode(nodeId, 'partial');
        
        // Find children nodes
        const parentNode = nodes.find(n => n.id === nodeId);
        const children = edges
          .filter(edge => edge.source === nodeId)
          .map(edge => edge.target);
          
        if (children.length === 0) {
          return parentNode.data.value;
        }
        
        const leftNode = nodes.find(n => n.id === children[0]);
        const rightNode = nodes.find(n => n.id === children[1]);
        
        // Query left and right children
        const leftResult = await queryRecursive(
          leftNode.id, 
          leftNode.data.rangeStart, 
          leftNode.data.rangeEnd
        );
        
        const rightResult = await queryRecursive(
          rightNode.id, 
          rightNode.data.rangeStart, 
          rightNode.data.rangeEnd
        );
        
        // Combine results based on operation
        if (operation === 'sum') {
          return leftResult + rightResult;
        } else if (operation === 'min') {
          return Math.min(leftResult, rightResult);
        } else if (operation === 'max') {
          return Math.max(leftResult, rightResult);
        }
      };
      
      result = await queryRecursive(segmentTree.current.id, 0, array.length - 1);
      
      showMessage(`Range [${start}, ${end}] ${operation} = ${result}`);
    } catch (error) {
      showMessage(error.message);
    } finally {
      setIsAnimating(false);
    }
  }, [segmentTree, isAnimating, rangeStart, rangeEnd, array.length, resetHighlights, highlightNode, nodes, edges, operation, showMessage]);
  
  // Update a value in the segment tree
  const handleUpdateValue = useCallback(async () => {
    if (!segmentTree.current) {
      showMessage('Please create a segment tree first');
      return;
    }
    
    if (isAnimating) return;
    
    setIsAnimating(true);
    await resetHighlights();
    
    try {
      const index = parseInt(updateIndex);
      const newValue = parseInt(updateValueInput);
      
      if (isNaN(index) || isNaN(newValue)) {
        showMessage('Please enter valid index and value');
        setIsAnimating(false);
        return;
      }
      
      if (index < 0 || index >= array.length) {
        showMessage(`Index must be between 0 and ${array.length - 1}`);
        setIsAnimating(false);
        return;
      }
      
      // Update the original array
      const newArray = [...array];
      newArray[index] = newValue;
      setArray(newArray);
      
      // Recursive update function
      const updateRecursive = async (nodeId, nodeStart, nodeEnd) => {
        await highlightNode(nodeId, 'visiting');
        
        // Leaf node that matches the index
        if (nodeStart === nodeEnd && nodeStart === index) {
          await highlightNode(nodeId, 'updated');
          
          // Update the node value
          setNodes(currentNodes => 
            currentNodes.map(node => {
              if (node.id === nodeId) {
                return {
                  ...node,
                  data: {
                    ...node.data,
                    value: newValue
                  }
                };
              }
              return node;
            })
          );
          
          return newValue;
        }
        
        // If index is outside the range of this node
        if (index < nodeStart || index > nodeEnd) {
          await highlightNode(nodeId, 'outside');
          
          // Get current node value (unchanged)
          const node = nodes.find(n => n.id === nodeId);
          return node.data.value;
        }
        
        // Find children nodes
        const children = edges
          .filter(edge => edge.source === nodeId)
          .map(edge => edge.target);
          
        const leftNode = nodes.find(n => n.id === children[0]);
        const rightNode = nodes.find(n => n.id === children[1]);
        
        // Recursively update left or right child
        let leftResult, rightResult;
        
        if (index <= leftNode.data.rangeEnd) {
          leftResult = await updateRecursive(
            leftNode.id, 
            leftNode.data.rangeStart, 
            leftNode.data.rangeEnd
          );
          
          // Get current right value (unchanged)
          rightResult = rightNode.data.value;
        } else {
          // Get current left value (unchanged)
          leftResult = leftNode.data.value;
          
          rightResult = await updateRecursive(
            rightNode.id, 
            rightNode.data.rangeStart, 
            rightNode.data.rangeEnd
          );
        }
        
        // Recalculate current node value
        let newNodeValue;
        if (operation === 'sum') {
          newNodeValue = leftResult + rightResult;
        } else if (operation === 'min') {
          newNodeValue = Math.min(leftResult, rightResult);
        } else if (operation === 'max') {
          newNodeValue = Math.max(leftResult, rightResult);
        }
        
        await highlightNode(nodeId, 'recalculated');
        
        // Update the node value
        setNodes(currentNodes => 
          currentNodes.map(node => {
            if (node.id === nodeId) {
              return {
                ...node,
                data: {
                  ...node.data,
                  value: newNodeValue
                }
              };
            }
            return node;
          })
        );
        
        return newNodeValue;
      };
      
      await updateRecursive(segmentTree.current.id, 0, array.length - 1);
      
      showMessage(`Updated index ${index} to value ${newValue}`);
    } catch (error) {
      showMessage(error.message);
    } finally {
      setIsAnimating(false);
    }
  }, [segmentTree, isAnimating, updateIndex, updateValueInput, array, resetHighlights, highlightNode, nodes, edges, operation, showMessage]);
  
  return (
    <div className={styles.visualizer}>
      <button className={styles.backButton} onClick={onBack}>
        Back
      </button>
      
      <div className={styles.controls}>
        <div>
          <input
            type="text"
            value={inputArray}
            onChange={(e) => setInputArray(e.target.value)}
            placeholder="Enter comma-separated numbers"
            className={styles.input}
            disabled={isAnimating}
          />
          <button 
            onClick={createSegmentTree} 
            className={styles.btn}
            disabled={isAnimating}
          >
            Create Segment Tree
          </button>
          <button 
            onClick={generateRandomArray} 
            className={styles.btn}
            disabled={isAnimating}
          >
            Random Array
          </button>
        </div>
        
        <div className={styles.operationSelect}>
          <label htmlFor="operation">Operation:</label>
          <select 
            id="operation" 
            value={operation} 
            onChange={(e) => setOperation(e.target.value)}
            className={styles.select}
            disabled={isAnimating}
          >
            <option value="sum">Sum</option>
            <option value="min">Minimum</option>
            <option value="max">Maximum</option>
          </select>
        </div>
      </div>
      
      <div className={styles.queryControls}>
        <div className={styles.inputGroup}>
          <label>Range Query:</label>
          <input
            type="number"
            value={rangeStart}
            onChange={(e) => setRangeStart(e.target.value)}
            placeholder="Start"
            className={styles.smallInput}
            min="0"
            max={array.length > 0 ? array.length - 1 : 0}
            disabled={isAnimating}
          />
          <input
            type="number"
            value={rangeEnd}
            onChange={(e) => setRangeEnd(e.target.value)}
            placeholder="End"
            className={styles.smallInput}
            min="0"
            max={array.length > 0 ? array.length - 1 : 0}
            disabled={isAnimating}
          />
          <button 
            onClick={queryRange} 
            className={styles.btn}
            disabled={isAnimating || array.length === 0}
          >
            Query
          </button>
        </div>
        
        <div className={styles.inputGroup}>
          <label>Update Value:</label>
          <input
            type="number"
            value={updateIndex}
            onChange={(e) => setUpdateIndex(e.target.value)}
            placeholder="Index"
            className={styles.smallInput}
            min="0"
            max={array.length > 0 ? array.length - 1 : 0}
            disabled={isAnimating}
          />
          <input
            type="number"
            value={updateValueInput}
            onChange={(e) => setUpdateValueInput(e.target.value)}
            placeholder="New value"
            className={styles.smallInput}
            disabled={isAnimating}
          />
          <button 
            onClick={handleUpdateValue} 
            className={styles.btn}
            disabled={isAnimating || array.length === 0}
          >
            Update
          </button>
        </div>
      </div>
      
      {/* Array visualization */}
      <div className={styles.arrayContainer}>
        <h4>Input Array</h4>
        <div className={styles.array}>
          {array.map((value, index) => (
            <div key={index} className={styles.arrayItem}>
              <div className={styles.arrayIndex}>{index}</div>
              <div className={styles.arrayValue}>{value}</div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Info Panel */}
      <div className={styles.infoPanel}>
        <h3>Segment Tree Visualizer</h3>
        <p>
          Segment Trees allow efficient range queries and updates on arrays.
          Each node represents a segment of the array with its computed value 
          ({operation === 'sum' ? 'sum' : operation === 'min' ? 'minimum' : 'maximum'}).
        </p>
        <div className={styles.legend}>
          <div>
            <span className={`${styles.legendItem} ${styles.default}`}></span>
            <span>Normal Node</span>
          </div>
          <div>
            <span className={`${styles.legendItem} ${styles.visiting}`}></span>
            <span>Visiting</span>
          </div>
          <div>
            <span className={`${styles.legendItem} ${styles.contained}`}></span>
            <span>Fully Contained</span>
          </div>
          <div>
            <span className={`${styles.legendItem} ${styles.partial}`}></span>
            <span>Partially Contained</span>
          </div>
          <div>
            <span className={`${styles.legendItem} ${styles.outside}`}></span>
            <span>Outside Range</span>
          </div>
          <div>
            <span className={`${styles.legendItem} ${styles.updated}`}></span>
            <span>Updated</span>
          </div>
          <div>
            <span className={`${styles.legendItem} ${styles.recalculated}`}></span>
            <span>Recalculated</span>
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
const SegmentTreeVisualizer = (props) => {
  return (
    <ReactFlowProvider>
      <SegmentTreeVisualizerContent {...props} />
    </ReactFlowProvider>
  );
};

export default SegmentTreeVisualizer; 