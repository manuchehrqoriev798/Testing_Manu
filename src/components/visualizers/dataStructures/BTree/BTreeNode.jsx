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
import './BTreeNode.css';

// Custom B-Tree Node component
const BNode = ({ data }) => {
  return (
    <div className={`${styles.bTreeNode} ${data.state ? styles[data.state] : ''}`}>
      <Handle type="target" position={Position.Top} style={{ visibility: data.isRoot ? 'hidden' : 'visible' }} />
      <div className="keysContainer">
        {data.keys.map((key, index) => (
          <div key={index} className={`${styles.keyItem} ${data.highlightedKeys?.includes(key) ? styles.highlighted : ''}`}>
            {key}
          </div>
        ))}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

// Main B-Tree visualizer component
const BTreeNode = ({ onBack }) => {
  // Node types registration
  const nodeTypes = useRef({ bTreeNode: BNode }).current;
  
  // State
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [message, setMessage] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [order, setOrder] = useState(3); // Default B-Tree order (m)
  const [history, setHistory] = useState([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);
  
  // B-Tree Node class
  class BTreeNodeClass {
    constructor(isLeaf = true) {
      this.keys = [];
      this.children = [];
      this.isLeaf = isLeaf;
    }
  }
  
  let root = useRef(null).current;
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
  const highlightNode = useCallback(async (nodeId, state, keys = []) => {
    setNodes(currentNodes => 
      currentNodes.map(node => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              state: state,
              highlightedKeys: keys
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
          state: null,
          highlightedKeys: []
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
    const nodeMap = new Map();
    nextId.current = 0;
    
    // Queue for level-order traversal
    const queue = [{
      node: rootNode,
      level: 0,
      index: 0,
      parent: null
    }];
    
    const levelNodes = [];
    
    // Process each node in the tree using level-order traversal
    while (queue.length > 0) {
      const { node, level, index, parent } = queue.shift();
      
      if (!levelNodes[level]) {
        levelNodes[level] = [];
      }
      
      const nodeId = `node-${nextId.current++}`;
      nodeMap.set(node, nodeId);
      
      // Create the node with all its keys
      const newNode = {
        id: nodeId,
        type: 'bTreeNode',
        position: { x: 0, y: level * 150 },
        data: {
          keys: [...node.keys],
          isRoot: parent === null,
          isLeaf: node.isLeaf,
          state: null,
          highlightedKeys: []
        }
      };
      
      levelNodes[level].push(newNode);
      treeNodes.push(newNode);
      
      // Create edge from parent to this node
      if (parent !== null) {
        const parentId = nodeMap.get(parent);
        treeEdges.push({
          id: `edge-${parentId}-${nodeId}`,
          source: parentId,
          target: nodeId,
          type: 'step'
        });
      }
      
      // Add children to queue
      for (let i = 0; i < node.children.length; i++) {
        queue.push({
          node: node.children[i],
          level: level + 1,
          index: levelNodes[level].length * node.children.length + i,
          parent: node
        });
      }
    }
    
    // Horizontally position nodes at each level
    levelNodes.forEach((level, levelIndex) => {
      const levelWidth = level.length * 200;
      const startX = -levelWidth / 2 + 100;
      
      level.forEach((node, nodeIndex) => {
        node.position.x = startX + nodeIndex * 200;
      });
    });
    
    setNodes(treeNodes);
    setEdges(treeEdges);
  }, []);
  
  // Find the appropriate position for a key in a node
  const findPos = (node, key) => {
    let pos = 0;
    while (pos < node.keys.length && node.keys[pos] < key) {
      pos++;
    }
    return pos;
  };
  
  // Split a child node when it's full
  const splitChild = async (parentNode, childIndex, childNode) => {
    // Create a new node which will store (t-1) keys of childNode
    const newNode = new BTreeNodeClass(childNode.isLeaf);
    const t = Math.floor(order / 2); // Minimum degree
    
    // Copy the last (t-1) keys of childNode to newNode
    for (let i = 0; i < t - 1; i++) {
      newNode.keys[i] = childNode.keys[i + t];
    }
    
    // Copy the last t children of childNode to newNode
    if (!childNode.isLeaf) {
      for (let i = 0; i < t; i++) {
        newNode.children[i] = childNode.children[i + t];
      }
    }
    
    // Reduce the number of keys in childNode
    childNode.keys.length = t - 1;
    
    // If childNode is not a leaf, adjust its children
    if (!childNode.isLeaf) {
      childNode.children.length = t;
    }
    
    // Insert a new child in parent
    parentNode.children.splice(childIndex + 1, 0, newNode);
    
    // Move middle key of childNode to parent
    const midKey = childNode.keys[t - 1];
    parentNode.keys.splice(childIndex, 0, midKey);
    
    // Update visualization
    generateTreeLayout(root);
    
    // Highlight the nodes involved in the split
    const parentId = `node-${nodes.findIndex(n => n.data.keys.join(',') === parentNode.keys.join(','))}`;
    await highlightNode(parentId, 'splitting');
    await resetHighlights();
  };
  
  // Insert a key into the B-Tree
  const insertNonFull = async (node, key) => {
    let i = node.keys.length - 1;
    
    const nodeId = `node-${nodes.findIndex(n => n.data.keys.join(',') === node.keys.join(','))}`;
    await highlightNode(nodeId, 'visiting');
    
    // If this is a leaf node
    if (node.isLeaf) {
      // Find the location of new key
      while (i >= 0 && node.keys[i] > key) {
        node.keys[i + 1] = node.keys[i];
        i--;
      }
      
      // Insert new key
      node.keys[i + 1] = key;
      await highlightNode(nodeId, 'inserted', [key]);
      await resetHighlights();
      generateTreeLayout(root);
    } else {
      // Find the child which will have the new key
      while (i >= 0 && node.keys[i] > key) {
        i--;
      }
      i++;
      
      // Check if the found child is full
      if (node.children[i].keys.length === order - 1) {
        // If the child is full, split it
        await splitChild(node, i, node.children[i]);
        
        // After split, the middle key of child is moved up
        // Determine which child to go into now
        if (node.keys[i] < key) {
          i++;
        }
      }
      
      // Recursive call for appropriate child
      await insertNonFull(node.children[i], key);
    }
  };
  
  // Main insert function
  const insert = async (key) => {
    // If tree is empty
    if (!root) {
      root = new BTreeNodeClass(true);
      root.keys[0] = key;
      generateTreeLayout(root);
      return;
    }
    
    // If root is full, create a new root
    if (root.keys.length === order - 1) {
      const newRoot = new BTreeNodeClass(false);
      newRoot.children[0] = root;
      await splitChild(newRoot, 0, root);
      root = newRoot;
      await insertNonFull(newRoot, key);
    } else {
      await insertNonFull(root, key);
    }
    
    generateTreeLayout(root);
  };
  
  // Search for a key in the B-Tree
  const search = async (node, key) => {
    if (!node) return false;
    
    const nodeId = `node-${nodes.findIndex(n => n.data.keys.join(',') === node.keys.join(','))}`;
    await highlightNode(nodeId, 'visiting');
    
    let i = 0;
    // Find the first key greater than or equal to key
    while (i < node.keys.length && key > node.keys[i]) {
      i++;
    }
    
    // If found, return true
    if (i < node.keys.length && key === node.keys[i]) {
      await highlightNode(nodeId, 'found', [key]);
      await sleep(1000);
      await resetHighlights();
      return true;
    }
    
    // If this is a leaf node
    if (node.isLeaf) {
      await resetHighlights();
      return false;
    }
    
    // Recur down to the appropriate child
    return await search(node.children[i], key);
  };
  
  // Handle insert button click
  const handleInsert = useCallback(async () => {
    const value = parseInt(inputValue, 10);
    
    if (isNaN(value)) {
      showMessage("Please enter a valid number");
      return;
    }
    
    setIsAnimating(true);
    await insert(value);
    saveToHistory();
    setInputValue('');
    setIsAnimating(false);
  }, [inputValue, isAnimating, insert, showMessage]);
  
  // Handle search button click
  const handleSearch = useCallback(async () => {
    const value = parseInt(inputValue, 10);
    
    if (isNaN(value)) {
      showMessage("Please enter a valid number");
      return;
    }
    
    setIsAnimating(true);
    const found = await search(root, value);
    
    if (found) {
      showMessage(`Found ${value} in the B-Tree`);
    } else {
      showMessage(`${value} not found in the B-Tree`);
    }
    
    setInputValue('');
    setIsAnimating(false);
  }, [inputValue, isAnimating, search, showMessage]);
  
  // Generate a random B-Tree
  const generateRandomTree = useCallback(async () => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    clearTree();
    
    const numNodes = Math.floor(Math.random() * 15) + 5;
    const values = new Set();
    
    while (values.size < numNodes) {
      values.add(Math.floor(Math.random() * 100));
    }
    
    const sortedValues = Array.from(values).sort((a, b) => a - b);
    
    for (const value of sortedValues) {
      await insert(value);
    }
    
    saveToHistory();
    setIsAnimating(false);
  }, [isAnimating, clearTree, insert, saveToHistory]);
  
  // Clear the B-Tree
  const clearTree = useCallback(() => {
    if (isAnimating) return;
    
    root = null;
    generateTreeLayout(root);
    saveToHistory();
  }, [isAnimating, generateTreeLayout]);
  
  // Save current tree state to history
  const saveToHistory = useCallback(() => {
    // Deep clone current tree for history
    const cloneNode = (node) => {
      if (!node) return null;
      
      const clonedNode = new BTreeNodeClass(node.isLeaf);
      clonedNode.keys = [...node.keys];
      clonedNode.children = node.children.map(child => cloneNode(child));
      
      return clonedNode;
    };
    
    const newHistory = history.slice(0, currentHistoryIndex + 1);
    newHistory.push(cloneNode(root));
    
    setHistory(newHistory);
    setCurrentHistoryIndex(newHistory.length - 1);
  }, [history, currentHistoryIndex, root]);
  
  // Undo function
  const undo = useCallback(() => {
    if (isAnimating || currentHistoryIndex <= 0) return;
    
    const prevIndex = currentHistoryIndex - 1;
    const prevState = history[prevIndex];
    
    // Deep clone to avoid reference issues
    const cloneNode = (node) => {
      if (!node) return null;
      
      const clonedNode = new BTreeNodeClass(node.isLeaf);
      clonedNode.keys = [...node.keys];
      clonedNode.children = node.children.map(child => cloneNode(child));
      
      return clonedNode;
    };
    
    root = cloneNode(prevState);
    setCurrentHistoryIndex(prevIndex);
    
    generateTreeLayout(root);
  }, [history, currentHistoryIndex, isAnimating, generateTreeLayout]);
  
  // Redo function
  const redo = useCallback(() => {
    if (isAnimating || currentHistoryIndex >= history.length - 1) return;
    
    const nextIndex = currentHistoryIndex + 1;
    const nextState = history[nextIndex];
    
    // Deep clone to avoid reference issues
    const cloneNode = (node) => {
      if (!node) return null;
      
      const clonedNode = new BTreeNodeClass(node.isLeaf);
      clonedNode.keys = [...node.keys];
      clonedNode.children = node.children.map(child => cloneNode(child));
      
      return clonedNode;
    };
    
    root = cloneNode(nextState);
    setCurrentHistoryIndex(nextIndex);
    
    generateTreeLayout(root);
  }, [history, currentHistoryIndex, isAnimating, generateTreeLayout]);
  
  // Handle order change
  const handleOrderChange = (e) => {
    const newOrder = parseInt(e.target.value, 10);
    if (newOrder >= 3) {
      setOrder(newOrder);
    }
  };
  
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
        
        <div className="settingGroup">
          <label htmlFor="order">Order (m):</label>
          <input
            id="order"
            type="number"
            min="3"
            value={order}
            onChange={handleOrderChange}
            className="numberInput"
            disabled={isAnimating || root}
          />
        </div>
        
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
        <h3>B-Tree Visualizer</h3>
        <p>
          B-Trees are self-balancing search trees with multiple keys per node. 
          They are designed to minimize disk access and are commonly used in databases 
          and file systems.
        </p>
        <div className="btProperties">
          <h4>B-Tree Properties (order {order}):</h4>
          <ul className="propertiesList">
            <li>All leaf nodes are at the same depth</li>
            <li>Each node can have at most {order-1} keys</li>
            <li>Each node (except root) has at least ⌈{order}/2⌉-1 keys</li>
            <li>All nodes have n keys and n+1 children (for non-leaf nodes)</li>
            <li>Keys within a node are stored in ascending order</li>
          </ul>
        </div>
        <div className="legend">
          <div>
            <span className={`${styles.legendItem} ${styles.default}`}></span>
            <span>Normal Node</span>
          </div>
          <div>
            <span className={`${styles.legendItem} ${styles.visiting}`}></span>
            <span>Visiting</span>
          </div>
          <div>
            <span className={`${styles.legendItem} ${styles.found}`}></span>
            <span>Found</span>
          </div>
          <div>
            <span className={`${styles.legendItem} ${styles.inserted}`}></span>
            <span>Inserted</span>
          </div>
          <div>
            <span className={`${styles.legendItem} ${styles.splitting}`}></span>
            <span>Splitting</span>
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
const BTreeVisualizer = (props) => {
  return (
    <ReactFlowProvider>
      <BTreeVisualizerContent {...props} />
    </ReactFlowProvider>
  );
};

export default BTreeNode; 