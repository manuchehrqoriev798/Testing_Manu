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
import './RedBlackTreeNode.css';

// Custom Red-Black Tree Node component
const RedBlackNode = ({ data }) => {
  return (
    <div 
      className={`${styles.treeNode} ${data.color === 'red' ? styles.redNode : styles.blackNode} ${data.state ? styles[data.state] : ''}`}
    >
      <Handle type="target" position={Position.Top} style={{ visibility: data.isRoot ? 'hidden' : 'visible' }} />
      <div className="nodeContent">
        <div className="value">{data.value}</div>
        <div className="colorIndicator">{data.color}</div>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

// Main Red-Black Tree visualizer component
const RedBlackTreeNode = ({ onBack }) => {
  // Node types registration
  const nodeTypes = useRef({ rbNode: RedBlackNode }).current;
  
  // State
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [message, setMessage] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [history, setHistory] = useState([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);
  
  // Red-Black Tree node class
  class RBNode {
    constructor(value) {
      this.value = value;
      this.left = null;
      this.right = null;
      this.parent = null;
      this.color = 'red'; // New nodes are red by default
    }
  }
  
  let root = useRef(null).current;
  const nextId = useRef(0);
  const NIL = { value: 'NIL', color: 'black', left: null, right: null, parent: null };
  
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
  const highlightNodes = useCallback(async (nodeValues, state) => {
    setNodes(currentNodes => 
      currentNodes.map(node => {
        if (nodeValues.includes(node.data.value)) {
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
  
  // Generate tree layout for visualization
  const generateTreeLayout = useCallback((rootNode) => {
    if (!rootNode) {
      setNodes([]);
      setEdges([]);
      return;
    }
    
    const treeNodes = [];
    const treeEdges = [];
    nextId.current = 0;
    
    // Queue for level order traversal
    const queue = [{
      node: rootNode,
      x: 0,
      y: 0,
      level: 0,
      parent: null,
      isLeft: false
    }];
    
    // Process each node in the tree
    while (queue.length > 0) {
      const { node, x, y, level, parent, isLeft } = queue.shift();
      
      if (!node || node === NIL) continue;
      
      const nodeId = `node-${nextId.current++}`;
      
      // Create the node
      treeNodes.push({
        id: nodeId,
        type: 'rbNode',
        position: { x: x * 100, y: y * 100 },
        data: {
          value: node.value,
          color: node.color,
          isRoot: parent === null,
          state: null
        }
      });
      
      // Create edge to parent
      if (parent) {
        treeEdges.push({
          id: `edge-${parent}-${nodeId}`,
          source: parent,
          target: nodeId,
          style: { stroke: '#333' }
        });
      }
      
      // Add children to queue
      if (node.left) {
        queue.push({
          node: node.left,
          x: x - 2 / (level + 1),
          y: y + 1,
          level: level + 1,
          parent: nodeId,
          isLeft: true
        });
      }
      
      if (node.right) {
        queue.push({
          node: node.right,
          x: x + 2 / (level + 1),
          y: y + 1,
          level: level + 1,
          parent: nodeId,
          isLeft: false
        });
      }
    }
    
    setNodes(treeNodes);
    setEdges(treeEdges);
  }, []);
  
  // Left rotation for rebalancing
  const leftRotate = async (x, animate = true) => {
    if (!x.right) return x;
    
    if (animate) {
      await highlightNodes([x.value, x.right.value], 'rotating');
    }
    
    const y = x.right;
    
    // Set y's left subtree as x's right subtree
    x.right = y.left;
    if (y.left !== null) {
      y.left.parent = x;
    }
    
    // Link x's parent to y
    y.parent = x.parent;
    if (x.parent === null) {
      root = y;
    } else if (x === x.parent.left) {
      x.parent.left = y;
    } else {
      x.parent.right = y;
    }
    
    // Put x on y's left
    y.left = x;
    x.parent = y;
    
    if (animate) {
      generateTreeLayout(root);
      await sleep(800);
      await resetHighlights();
    }
    
    return y;
  };
  
  // Right rotation for rebalancing
  const rightRotate = async (y, animate = true) => {
    if (!y.left) return y;
    
    if (animate) {
      await highlightNodes([y.value, y.left.value], 'rotating');
    }
    
    const x = y.left;
    
    // Set x's right subtree as y's left subtree
    y.left = x.right;
    if (x.right !== null) {
      x.right.parent = y;
    }
    
    // Link y's parent to x
    x.parent = y.parent;
    if (y.parent === null) {
      root = x;
    } else if (y === y.parent.left) {
      y.parent.left = x;
    } else {
      y.parent.right = x;
    }
    
    // Put y on x's right
    x.right = y;
    y.parent = x;
    
    if (animate) {
      generateTreeLayout(root);
      await sleep(800);
      await resetHighlights();
    }
    
    return x;
  };
  
  // Fix Red-Black Tree properties after insertion
  const fixInsert = async (node) => {
    let current = node;
    
    while (current !== root && current.parent.color === 'red') {
      // If parent is a left child
      if (current.parent === current.parent.parent.left) {
        const uncle = current.parent.parent.right;
        
        // Case 1: Uncle is red - recolor
        if (uncle && uncle.color === 'red') {
          await highlightNodes([current.value, current.parent.value, uncle.value], 'recoloring');
          current.parent.color = 'black';
          uncle.color = 'black';
          current.parent.parent.color = 'red';
          current = current.parent.parent;
          generateTreeLayout(root);
          await sleep(800);
        } else {
          // Case 2: Uncle is black, current is a right child - left rotation
          if (current === current.parent.right) {
            current = current.parent;
            await leftRotate(current);
          }
          
          // Case 3: Uncle is black, current is a left child - right rotation
          await highlightNodes([current.parent.value, current.parent.parent.value], 'recoloring');
          current.parent.color = 'black';
          current.parent.parent.color = 'red';
          await rightRotate(current.parent.parent);
        }
      } 
      // If parent is a right child (symmetric)
      else {
        const uncle = current.parent.parent.left;
        
        // Case 1: Uncle is red - recolor
        if (uncle && uncle.color === 'red') {
          await highlightNodes([current.value, current.parent.value, uncle.value], 'recoloring');
          current.parent.color = 'black';
          uncle.color = 'black';
          current.parent.parent.color = 'red';
          current = current.parent.parent;
          generateTreeLayout(root);
          await sleep(800);
        } else {
          // Case 2: Uncle is black, current is a left child - right rotation
          if (current === current.parent.left) {
            current = current.parent;
            await rightRotate(current);
          }
          
          // Case 3: Uncle is black, current is a right child - left rotation
          await highlightNodes([current.parent.value, current.parent.parent.value], 'recoloring');
          current.parent.color = 'black';
          current.parent.parent.color = 'red';
          await leftRotate(current.parent.parent);
        }
      }
    }
    
    // Ensure root is black
    root.color = 'black';
    generateTreeLayout(root);
    await resetHighlights();
  };
  
  // Insert a new node
  const insert = async (value) => {
    const newNode = new RBNode(value);
    
    // If tree is empty
    if (!root) {
      root = newNode;
      root.color = 'black'; // Root must be black
      generateTreeLayout(root);
      return;
    }
    
    // Find the correct position to insert
    let current = root;
    let parent = null;
    
    while (current !== null) {
      await highlightNodes([current.value], 'visiting');
      parent = current;
      
      if (value < current.value) {
        current = current.left;
      } else if (value > current.value) {
        current = current.right;
      } else {
        await resetHighlights();
        return; // Value already exists
      }
    }
    
    // Set parent of new node
    newNode.parent = parent;
    
    // Insert new node
    if (value < parent.value) {
      parent.left = newNode;
    } else {
      parent.right = newNode;
    }
    
    // Show the new node
    generateTreeLayout(root);
    await highlightNodes([newNode.value], 'inserted');
    
    // Fix the tree if the red-black property is violated
    if (parent !== root) {
      await fixInsert(newNode);
    }
    
    // Final layout after all operations
    generateTreeLayout(root);
  };
  
  // Search for a value in the tree
  const search = async (value) => {
    let current = root;
    
    while (current !== null) {
      await highlightNodes([current.value], 'visiting');
      
      if (value === current.value) {
        await highlightNodes([current.value], 'found');
        return current;
      } else if (value < current.value) {
        current = current.left;
      } else {
        current = current.right;
      }
    }
    
    await resetHighlights();
    return null;
  };
  
  // Deep clone a tree for history
  const cloneTree = (node, parent = null) => {
    if (!node) return null;
    
    const newNode = new RBNode(node.value);
    newNode.color = node.color;
    newNode.parent = parent;
    newNode.left = cloneTree(node.left, newNode);
    newNode.right = cloneTree(node.right, newNode);
    
    return newNode;
  };
  
  // Save current tree state to history
  const saveToHistory = useCallback(() => {
    // Clone the current tree
    const clonedRoot = cloneTree(root);
    
    // Remove future states if we're in the middle of history
    const newHistory = history.slice(0, currentHistoryIndex + 1);
    newHistory.push(clonedRoot);
    
    setHistory(newHistory);
    setCurrentHistoryIndex(newHistory.length - 1);
  }, [history, currentHistoryIndex, root]);
  
  // Generate a random tree for demonstration
  const generateRandomTree = useCallback(async () => {
    if (isAnimating) return;
    setIsAnimating(true);
    
    root = null;
    generateTreeLayout(root);
    
    const size = Math.floor(Math.random() * 8) + 5; // 5-12 nodes
    const values = new Set();
    
    while (values.size < size) {
      values.add(Math.floor(Math.random() * 100));
    }
    
    for (const value of values) {
      await insert(value);
      await sleep(300);
    }
    
    saveToHistory();
    setIsAnimating(false);
  }, [isAnimating, insert, saveToHistory]);
  
  // Clear the tree
  const clearTree = useCallback(() => {
    if (isAnimating) return;
    
    root = null;
    generateTreeLayout(root);
    saveToHistory();
  }, [isAnimating, generateTreeLayout, saveToHistory]);
  
  // Handle insert button click
  const handleInsert = useCallback(async () => {
    if (isAnimating) return;
    
    const value = parseInt(inputValue);
    if (isNaN(value)) {
      showMessage("Please enter a valid number");
      return;
    }
    
    setIsAnimating(true);
    await insert(value);
    setInputValue('');
    saveToHistory();
    setIsAnimating(false);
  }, [inputValue, isAnimating, insert, showMessage, saveToHistory]);
  
  // Handle search button click
  const handleSearch = useCallback(async () => {
    if (isAnimating) return;
    
    const value = parseInt(inputValue);
    if (isNaN(value)) {
      showMessage("Please enter a valid number");
      return;
    }
    
    setIsAnimating(true);
    const found = await search(value);
    
    if (!found) {
      showMessage(`${value} not found in the tree`);
    }
    
    setInputValue('');
    setIsAnimating(false);
  }, [inputValue, isAnimating, search, showMessage]);
  
  // Undo action
  const undo = useCallback(() => {
    if (isAnimating || currentHistoryIndex <= 0) return;
    
    const prevIndex = currentHistoryIndex - 1;
    root = history[prevIndex];
    setCurrentHistoryIndex(prevIndex);
    
    generateTreeLayout(root);
  }, [history, currentHistoryIndex, isAnimating, generateTreeLayout]);
  
  // Redo action
  const redo = useCallback(() => {
    if (isAnimating || currentHistoryIndex >= history.length - 1) return;
    
    const nextIndex = currentHistoryIndex + 1;
    root = history[nextIndex];
    setCurrentHistoryIndex(nextIndex);
    
    generateTreeLayout(root);
  }, [history, currentHistoryIndex, isAnimating, generateTreeLayout]);
  
  // Initialize with an empty tree
  useEffect(() => {
    if (history.length === 0) {
      saveToHistory();
    }
  }, [saveToHistory, history.length]);
  
  return (
    <div className="visualizer">
      {message && <div className="message">{message}</div>}
      
      {/* Controls */}
      <div className="controls">
        <button onClick={onBack} className="btn">
          Back
        </button>
        
        <div className="inputForm">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Enter a number"
            className="input"
            disabled={isAnimating}
          />
          <button 
            onClick={handleInsert} 
            className="btn"
            disabled={isAnimating}
          >
            Insert
          </button>
          <button 
            onClick={handleSearch} 
            className="btn"
            disabled={isAnimating}
          >
            Search
          </button>
        </div>
        
        <div className="operationButtons">
          <button 
            onClick={generateRandomTree} 
            className="btn"
            disabled={isAnimating}
          >
            Random Tree
          </button>
          <button 
            onClick={clearTree} 
            className="btn"
            disabled={isAnimating}
          >
            Clear
          </button>
          <button 
            onClick={undo} 
            className={`${styles.btn} ${styles.historyBtn}`}
            disabled={isAnimating || currentHistoryIndex <= 0}
          >
            Undo
          </button>
          <button 
            onClick={redo} 
            className={`${styles.btn} ${styles.historyBtn}`}
            disabled={isAnimating || currentHistoryIndex >= history.length - 1}
          >
            Redo
          </button>
        </div>
      </div>
      
      {/* Info Panel */}
      <div className="infoPanel">
        <h3>Red-Black Tree Visualizer</h3>
        <p>
          Red-Black trees are self-balancing binary search trees where each node has 
          a color (red or black) that helps maintain balance through specific rules.
        </p>
        <div className="rbRules">
          <h4>Red-Black Tree Rules:</h4>
          <ol className="rulesList">
            <li>Every node is either red or black</li>
            <li>The root is black</li>
            <li>All leaf nodes (NIL) are black</li>
            <li>If a node is red, both its children are black</li>
            <li>Every path from root to leaf has the same number of black nodes</li>
          </ol>
        </div>
        <div className="legend">
          <div>
            <span className={`${styles.legendItem} ${styles.redNode}`}></span>
            <span>Red Node</span>
          </div>
          <div>
            <span className={`${styles.legendItem} ${styles.blackNode}`}></span>
            <span>Black Node</span>
          </div>
          <div>
            <span className={`${styles.legendItem} ${styles.visiting}`}></span>
            <span>Visiting</span>
          </div>
          <div>
            <span className={`${styles.legendItem} ${styles.recoloring}`}></span>
            <span>Recoloring</span>
          </div>
          <div>
            <span className={`${styles.legendItem} ${styles.rotating}`}></span>
            <span>Rotating</span>
          </div>
          <div>
            <span className={`${styles.legendItem} ${styles.found}`}></span>
            <span>Found</span>
          </div>
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
const RedBlackTreeVisualizer = (props) => {
  return (
    <ReactFlowProvider>
      <RedBlackTreeVisualizerContent {...props} />
    </ReactFlowProvider>
  );
};

export default RedBlackTreeNode; 