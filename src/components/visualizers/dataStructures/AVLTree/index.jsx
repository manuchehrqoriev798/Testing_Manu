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

// Custom AVL Tree Node component
const AVLTreeNode = ({ data }) => {
  return (
    <div 
      className={`${styles.treeNode} ${data.state ? styles[data.state] : ''}`}
    >
      <Handle type="target" position={Position.Top} style={{ visibility: data.isRoot ? 'hidden' : 'visible' }} />
      <div className={styles.nodeContent}>
        <div className={styles.value}>{data.value}</div>
        <div className={styles.heightInfo}>
          <span className={styles.height}>H: {data.height}</span>
          <span className={`${styles.balance} ${Math.abs(data.balanceFactor) > 1 ? styles.unbalanced : ''}`}>
            BF: {data.balanceFactor}
          </span>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

// Main AVL Tree visualizer component
const AVLTreeVisualizerContent = ({ onBack }) => {
  // Node types registration
  const nodeTypes = useRef({ avlNode: AVLTreeNode }).current;
  
  // State
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [message, setMessage] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [history, setHistory] = useState([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);
  
  // AVL Tree node class
  class AVLNode {
    constructor(value) {
      this.value = value;
      this.left = null;
      this.right = null;
      this.height = 1;
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
  
  // Get height of a node (handles null nodes)
  const getHeight = (node) => {
    if (node === null) return 0;
    return node.height;
  };
  
  // Calculate balance factor of a node
  const getBalanceFactor = (node) => {
    if (node === null) return 0;
    return getHeight(node.left) - getHeight(node.right);
  };
  
  // Update height of a node
  const updateHeight = (node) => {
    if (node === null) return;
    node.height = Math.max(getHeight(node.left), getHeight(node.right)) + 1;
  };
  
  // Right rotation
  const rightRotate = async (y, animate = true) => {
    if (animate) {
      await highlightNodes([y.value, y.left.value], 'rotating');
    }
    
    const x = y.left;
    const T2 = x.right;
    
    // Perform rotation
    x.right = y;
    y.left = T2;
    
    // Update heights
    updateHeight(y);
    updateHeight(x);
    
    if (animate) {
      // Update the visual representation after rotation
      generateTreeLayout(root);
      await sleep(800);
      await resetHighlights();
    }
    
    return x;
  };
  
  // Left rotation
  const leftRotate = async (x, animate = true) => {
    if (animate) {
      await highlightNodes([x.value, x.right.value], 'rotating');
    }
    
    const y = x.right;
    const T2 = y.left;
    
    // Perform rotation
    y.left = x;
    x.right = T2;
    
    // Update heights
    updateHeight(x);
    updateHeight(y);
    
    if (animate) {
      // Update the visual representation after rotation
      generateTreeLayout(root);
      await sleep(800);
      await resetHighlights();
    }
    
    return y;
  };
  
  // Balance the tree
  const balanceNode = async (node, value, animate = true) => {
    if (node === null) return null;
    
    // Get the balance factor
    const balanceFactor = getBalanceFactor(node);
    
    // Left Left Case
    if (balanceFactor > 1 && getBalanceFactor(node.left) >= 0) {
      if (animate) {
        showMessage(`Right rotation at node ${node.value}`);
        await sleep(500);
      }
      return await rightRotate(node, animate);
    }
    
    // Left Right Case
    if (balanceFactor > 1 && getBalanceFactor(node.left) < 0) {
      if (animate) {
        showMessage(`Left-Right rotation at node ${node.value}`);
        await sleep(500);
      }
      node.left = await leftRotate(node.left, animate);
      return await rightRotate(node, animate);
    }
    
    // Right Right Case
    if (balanceFactor < -1 && getBalanceFactor(node.right) <= 0) {
      if (animate) {
        showMessage(`Left rotation at node ${node.value}`);
        await sleep(500);
      }
      return await leftRotate(node, animate);
    }
    
    // Right Left Case
    if (balanceFactor < -1 && getBalanceFactor(node.right) > 0) {
      if (animate) {
        showMessage(`Right-Left rotation at node ${node.value}`);
        await sleep(500);
      }
      node.right = await rightRotate(node.right, animate);
      return await leftRotate(node, animate);
    }
    
    return node;
  };
  
  // Insert a node
  const insertNode = async (node, value, animate = true) => {
    // Base case: Empty tree or reached a leaf
    if (node === null) {
      return new AVLNode(value);
    }
    
    // Highlight current node during traversal
    if (animate) {
      await highlightNodes([node.value], 'visiting');
      await sleep(500);
    }
    
    // Recursive insertion
    if (value < node.value) {
      node.left = await insertNode(node.left, value, animate);
    } else if (value > node.value) {
      node.right = await insertNode(node.right, value, animate);
    } else {
      // Duplicate values not allowed
      if (animate) {
        showMessage(`Value ${value} already exists in the tree`);
        await resetHighlights();
      }
      return node;
    }
    
    // Update height of current node
    updateHeight(node);
    
    // Check if node needs to be balanced
    return await balanceNode(node, value, animate);
  };
  
  // Delete a node
  const deleteNode = async (node, value, animate = true) => {
    // Base case
    if (node === null) {
      if (animate) {
        showMessage(`Value ${value} not found in the tree`);
      }
      return null;
    }
    
    // Highlight current node during traversal
    if (animate) {
      await highlightNodes([node.value], 'visiting');
      await sleep(500);
    }
    
    // Recursive deletion
    if (value < node.value) {
      node.left = await deleteNode(node.left, value, animate);
    } else if (value > node.value) {
      node.right = await deleteNode(node.right, value, animate);
    } else {
      // Node to be deleted found
      
      // Case 1: Leaf node
      if (node.left === null && node.right === null) {
        if (animate) {
          await highlightNodes([node.value], 'deleting');
          await sleep(500);
        }
        return null;
      }
      
      // Case 2: Node with only one child
      if (node.left === null) {
        if (animate) {
          await highlightNodes([node.value, node.right.value], 'deleting');
          await sleep(500);
        }
        return node.right;
      }
      if (node.right === null) {
        if (animate) {
          await highlightNodes([node.value, node.left.value], 'deleting');
          await sleep(500);
        }
        return node.left;
      }
      
      // Case 3: Node with two children
      if (animate) {
        await highlightNodes([node.value], 'deleting');
        await sleep(500);
      }
      
      // Find the inorder successor (smallest in right subtree)
      let successor = node.right;
      while (successor.left !== null) {
        if (animate) {
          await highlightNodes([successor.value], 'visiting');
          await sleep(300);
        }
        successor = successor.left;
      }
      
      if (animate) {
        await highlightNodes([successor.value], 'selected');
        showMessage(`Replacing ${node.value} with inorder successor ${successor.value}`);
        await sleep(800);
      }
      
      // Copy successor value to current node
      node.value = successor.value;
      
      // Delete the successor
      node.right = await deleteNode(node.right, successor.value, animate);
    }
    
    // Update height
    updateHeight(node);
    
    // Balance the tree
    return await balanceNode(node, value, animate);
  };
  
  // Search for a node
  const searchNode = async (node, value) => {
    if (isAnimating) return;
    setIsAnimating(true);
    
    try {
      if (node === null) {
        showMessage(`Value ${value} not found in the tree`);
        return;
      }
      
      let current = node;
      while (current !== null) {
        await highlightNodes([current.value], 'visiting');
        await sleep(800);
        
        if (current.value === value) {
          await highlightNodes([current.value], 'found');
          showMessage(`Value ${value} found in the tree!`);
          await sleep(1500);
          break;
        } else if (value < current.value) {
          current = current.left;
        } else {
          current = current.right;
        }
      }
      
      if (current === null) {
        showMessage(`Value ${value} not found in the tree`);
      }
      
      await resetHighlights();
    } finally {
      setIsAnimating(false);
    }
  };
  
  // Generate visual layout for the tree
  const generateTreeLayout = useCallback((root) => {
    if (!root) {
      setNodes([]);
      setEdges([]);
      return;
    }
    
    const newNodes = [];
    const newEdges = [];
    
    // Function to calculate node positions using a level-order traversal
    const calculateNodePositions = () => {
      const queue = [];
      const nodePositions = new Map();
      
      // Root node is positioned at the top center
      root.x = 0;
      root.y = 0;
      root.level = 0;
      queue.push(root);
      
      while (queue.length > 0) {
        const node = queue.shift();
        const horizontalSpacing = 80 / (Math.pow(2, node.level) / 4 + 1);
        
        if (node.left) {
          node.left.level = node.level + 1;
          node.left.x = node.x - horizontalSpacing;
          node.left.y = node.y + 100;
          queue.push(node.left);
        }
        
        if (node.right) {
          node.right.level = node.level + 1;
          node.right.x = node.x + horizontalSpacing;
          node.right.y = node.y + 100;
          queue.push(node.right);
        }
        
        nodePositions.set(node, { x: node.x + 300, y: node.y + 50 });
      }
      
      return nodePositions;
    };
    
    // Calculate positions for all nodes
    const nodePositions = calculateNodePositions();
    
    // Create nodes and edges
    const nodeMap = new Map();
    
    // Function to traverse the tree and create nodes
    const traverseTree = (node, parentId = null) => {
      if (!node) return;
      
      const id = `node-${node.value}`;
      nodeMap.set(node.value, id);
      
      const position = nodePositions.get(node);
      
      // Create the node
      newNodes.push({
        id,
        type: 'avlNode',
        position,
        data: {
          value: node.value,
          height: node.height,
          balanceFactor: getBalanceFactor(node),
          isRoot: parentId === null,
          state: node.state || 'default'
        }
      });
      
      // Create edge from parent to this node
      if (parentId) {
        newEdges.push({
          id: `edge-${parentId}-${id}`,
          source: parentId,
          target: id,
          type: 'smoothstep',
          animated: false
        });
      }
      
      // Process children
      traverseTree(node.left, id);
      traverseTree(node.right, id);
    };
    
    traverseTree(root);
    
    setNodes(newNodes);
    setEdges(newEdges);
  }, []);
  
  // Function to update node states for highlighting
  const highlightNodes = async (nodeValues, state) => {
    setNodes(currentNodes => 
      currentNodes.map(node => {
        const value = node.data.value;
        if (nodeValues.includes(value)) {
          return {
            ...node,
            data: {
              ...node.data,
              state
            }
          };
        }
        return node;
      })
    );
    await sleep(100); // Small delay to ensure state update
  };
  
  // Reset all highlights
  const resetHighlights = async () => {
    setNodes(currentNodes => 
      currentNodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          state: 'default'
        }
      }))
    );
    await sleep(100);
  };
  
  // Save current tree state to history
  const saveToHistory = useCallback(() => {
    // Create a deep copy of the root
    const copyTree = (node) => {
      if (node === null) return null;
      
      const newNode = new AVLNode(node.value);
      newNode.height = node.height;
      newNode.left = copyTree(node.left);
      newNode.right = copyTree(node.right);
      
      return newNode;
    };
    
    const rootCopy = copyTree(root);
    
    // Remove any future states if we're in the middle of history
    const newHistory = history.slice(0, currentHistoryIndex + 1);
    newHistory.push(rootCopy);
    
    // Limit history size to prevent memory issues
    if (newHistory.length > 20) {
      newHistory.shift();
    }
    
    setHistory(newHistory);
    setCurrentHistoryIndex(newHistory.length - 1);
  }, [history, currentHistoryIndex, root]);
  
  // Handle insertions
  const handleInsert = useCallback(async () => {
    if (isAnimating) return;
    
    const value = Number(inputValue);
    if (isNaN(value)) {
      showMessage("Please enter a valid number");
      return;
    }
    
    setIsAnimating(true);
    try {
      root = await insertNode(root, value);
      generateTreeLayout(root);
      
      // Save to history after successful insertion
      saveToHistory();
      
      setInputValue('');
    } finally {
      setIsAnimating(false);
    }
  }, [inputValue, isAnimating, generateTreeLayout, showMessage, saveToHistory]);
  
  // Handle deletions
  const handleDelete = useCallback(async () => {
    if (isAnimating) return;
    
    const value = Number(inputValue);
    if (isNaN(value)) {
      showMessage("Please enter a valid number");
      return;
    }
    
    setIsAnimating(true);
    try {
      root = await deleteNode(root, value);
      generateTreeLayout(root);
      
      // Save to history after successful deletion
      saveToHistory();
      
      setInputValue('');
    } finally {
      setIsAnimating(false);
    }
  }, [inputValue, isAnimating, generateTreeLayout, showMessage, saveToHistory]);
  
  // Handle search
  const handleSearch = useCallback(() => {
    if (isAnimating) return;
    
    const value = Number(inputValue);
    if (isNaN(value)) {
      showMessage("Please enter a valid number");
      return;
    }
    
    searchNode(root, value);
  }, [inputValue, isAnimating, showMessage]);
  
  // Generate a random tree
  const generateRandomTree = useCallback(async () => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    try {
      // Clear existing tree
      root = null;
      
      // Generate 10 random values between 1-100
      const values = Array.from({ length: 10 }, () => Math.floor(Math.random() * 100) + 1);
      
      // Insert each value
      for (const value of values) {
        root = await insertNode(root, value, false);
      }
      
      generateTreeLayout(root);
      
      // Save to history
      saveToHistory();
      
      showMessage("Generated random AVL tree");
    } finally {
      setIsAnimating(false);
    }
  }, [isAnimating, generateTreeLayout, showMessage, saveToHistory]);
  
  // Clear the tree
  const clearTree = useCallback(() => {
    if (isAnimating) return;
    
    root = null;
    generateTreeLayout(root);
    
    // Save to history
    saveToHistory();
    
    showMessage("Tree cleared");
  }, [isAnimating, generateTreeLayout, showMessage, saveToHistory]);
  
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
    <div className={styles.visualizer}>
      {message && <div className={styles.message}>{message}</div>}
      
      {/* Controls */}
      <div className={styles.controls}>
        <button onClick={onBack} className={styles.btn}>
          Back
        </button>
        
        <div className={styles.inputForm}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Enter a number"
            className={styles.input}
            disabled={isAnimating}
          />
          <button 
            onClick={handleInsert} 
            className={styles.btn}
            disabled={isAnimating}
          >
            Insert
          </button>
          <button 
            onClick={handleDelete} 
            className={styles.btn}
            disabled={isAnimating}
          >
            Delete
          </button>
          <button 
            onClick={handleSearch} 
            className={styles.btn}
            disabled={isAnimating}
          >
            Search
          </button>
        </div>
        
        <div className={styles.operationButtons}>
          <button 
            onClick={generateRandomTree} 
            className={styles.btn}
            disabled={isAnimating}
          >
            Random Tree
          </button>
          <button 
            onClick={clearTree} 
            className={styles.btn}
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
      <div className={styles.infoPanel}>
        <h3>AVL Tree Visualizer</h3>
        <p>
          AVL trees are self-balancing binary search trees where the height difference 
          between left and right subtrees cannot exceed 1 for any node.
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
            <span className={`${styles.legendItem} ${styles.found}`}></span>
            <span>Found</span>
          </div>
          <div>
            <span className={`${styles.legendItem} ${styles.rotating}`}></span>
            <span>Rotating</span>
          </div>
          <div>
            <span className={`${styles.legendItem} ${styles.deleting}`}></span>
            <span>Deleting</span>
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
const AVLTreeVisualizer = (props) => {
  return (
    <ReactFlowProvider>
      <AVLTreeVisualizerContent {...props} />
    </ReactFlowProvider>
  );
};

export default AVLTreeVisualizer; 