import React, { useState, useRef, useEffect, useCallback } from 'react';
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

// Custom BST Node component
const BSTNode = ({ data }) => {
  return (
    <div
      className={`${styles.node} ${data.state ? styles[data.state] : ''}`}
    >
      <Handle type="target" position={Position.Top} />
      <div className={styles.nodeValue}>{data.value}</div>
      <Handle type="source" position={Position.Bottom} id="left" className={styles.handleLeft} />
      <Handle type="source" position={Position.Bottom} id="right" className={styles.handleRight} />
    </div>
  );
};

// Main BST visualizer component
const BSTVisualizerContent = ({ onBack }) => {
  // Node types registration
  const nodeTypes = useRef({ bstNode: BSTNode }).current;
  
  // State
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [message, setMessage] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [treeRoot, setTreeRoot] = useState(null);
  
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
  
  // Calculate node positions based on tree structure
  const calculateNodePositions = useCallback((root, x = 300, y = 100, horizontalSpacing = 150) => {
    if (!root) return;
    
    // Set the position for the current node
    root.position = { x, y };
    
    // Calculate positions for child nodes
    if (root.left) {
      calculateNodePositions(
        root.left, 
        x - horizontalSpacing / (y / 100), 
        y + 100, 
        horizontalSpacing
      );
    }
    
    if (root.right) {
      calculateNodePositions(
        root.right, 
        x + horizontalSpacing / (y / 100), 
        y + 100, 
        horizontalSpacing
      );
    }
  }, []);
  
  // Convert tree structure to ReactFlow nodes and edges
  const generateNodesAndEdges = useCallback(() => {
    if (!treeRoot) {
      setNodes([]);
      setEdges([]);
      return;
    }
    
    // Calculate positions first
    calculateNodePositions(treeRoot);
    
    const newNodes = [];
    const newEdges = [];
    
    // Helper function to traverse the tree
    const traverse = (node) => {
      if (!node) return;
      
      newNodes.push({
        id: node.id,
        type: 'bstNode',
        position: node.position,
        data: { 
          value: node.value,
          state: node.state
        }
      });
      
      if (node.left) {
        newEdges.push({
          id: `${node.id}-${node.left.id}`,
          source: node.id,
          target: node.left.id,
          sourceHandle: 'left',
          type: 'smoothstep',
          animated: node.leftEdgeAnimated,
        });
        traverse(node.left);
      }
      
      if (node.right) {
        newEdges.push({
          id: `${node.id}-${node.right.id}`,
          source: node.id,
          target: node.right.id,
          sourceHandle: 'right',
          type: 'smoothstep',
          animated: node.rightEdgeAnimated,
        });
        traverse(node.right);
      }
    };
    
    traverse(treeRoot);
    
    setNodes(newNodes);
    setEdges(newEdges);
  }, [treeRoot, calculateNodePositions]);
  
  // Update visualization whenever the tree changes
  useEffect(() => {
    generateNodesAndEdges();
  }, [treeRoot, generateNodesAndEdges]);
  
  // Create a new node
  const createNode = useCallback((value) => {
    return {
      id: `node_${value}_${Date.now()}`,
      value,
      left: null,
      right: null,
      state: null,
      leftEdgeAnimated: false,
      rightEdgeAnimated: false
    };
  }, []);
  
  // Insert a value into the BST
  const insertValue = useCallback(async (value) => {
    if (isAnimating) return;
    setIsAnimating(true);
    
    const newValue = parseInt(value, 10);
    if (isNaN(newValue)) {
      showMessage("Please enter a valid number");
      setIsAnimating(false);
      return;
    }
    
    // Create a new node
    const newNode = createNode(newValue);
    
    // If tree is empty, set the new node as root
    if (!treeRoot) {
      setTreeRoot(newNode);
      setIsAnimating(false);
      return;
    }
    
    // Clone the current tree to avoid direct state mutations
    const clonedRoot = JSON.parse(JSON.stringify(treeRoot));
    
    // Helper function to insert into the tree with animation
    const insertWithAnimation = async (node, newNode) => {
      // Reset previous animations
      node.state = null;
      node.leftEdgeAnimated = false;
      node.rightEdgeAnimated = false;
      
      // Highlight current node
      node.state = 'visiting';
      setTreeRoot({...clonedRoot});
      await sleep(800);
      
      if (newNode.value < node.value) {
        // Insert to the left
        node.leftEdgeAnimated = true;
        setTreeRoot({...clonedRoot});
        await sleep(500);
        
        if (!node.left) {
          // Found position, insert here
          node.left = newNode;
          node.state = null;
          node.leftEdgeAnimated = false;
          setTreeRoot({...clonedRoot});
        } else {
          // Continue down the left subtree
          node.state = null;
          node.leftEdgeAnimated = false;
          setTreeRoot({...clonedRoot});
          await insertWithAnimation(node.left, newNode);
        }
      } else if (newNode.value > node.value) {
        // Insert to the right
        node.rightEdgeAnimated = true;
        setTreeRoot({...clonedRoot});
        await sleep(500);
        
        if (!node.right) {
          // Found position, insert here
          node.right = newNode;
          node.state = null;
          node.rightEdgeAnimated = false;
          setTreeRoot({...clonedRoot});
        } else {
          // Continue down the right subtree
          node.state = null;
          node.rightEdgeAnimated = false;
          setTreeRoot({...clonedRoot});
          await insertWithAnimation(node.right, newNode);
        }
      } else {
        // Duplicate value, show message
        node.state = 'error';
        setTreeRoot({...clonedRoot});
        await sleep(800);
        node.state = null;
        setTreeRoot({...clonedRoot});
        showMessage("Value already exists in the tree");
      }
    };
    
    await insertWithAnimation(clonedRoot, newNode);
    setIsAnimating(false);
  }, [treeRoot, isAnimating, showMessage, createNode]);
  
  // Search for a value in the BST
  const searchForValue = useCallback(async (value) => {
    if (isAnimating) return;
    setIsAnimating(true);
    
    const searchVal = parseInt(value, 10);
    if (isNaN(searchVal)) {
      showMessage("Please enter a valid number");
      setIsAnimating(false);
      return;
    }
    
    if (!treeRoot) {
      showMessage("Tree is empty");
      setIsAnimating(false);
      return;
    }
    
    // Clone the current tree to avoid direct state mutations
    const clonedRoot = JSON.parse(JSON.stringify(treeRoot));
    
    // Helper function to search the tree with animation
    const searchWithAnimation = async (node, value) => {
      if (!node) {
        showMessage(`Value ${value} not found in the tree`);
        return false;
      }
      
      // Reset previous animations
      node.state = null;
      node.leftEdgeAnimated = false;
      node.rightEdgeAnimated = false;
      
      // Highlight current node
      node.state = 'visiting';
      setTreeRoot({...clonedRoot});
      await sleep(800);
      
      if (value === node.value) {
        // Found the value
        node.state = 'success';
        setTreeRoot({...clonedRoot});
        await sleep(1000);
        node.state = null;
        setTreeRoot({...clonedRoot});
        showMessage(`Value ${value} found in the tree`);
        return true;
      } else if (value < node.value) {
        // Search in the left subtree
        node.state = null;
        node.leftEdgeAnimated = true;
        setTreeRoot({...clonedRoot});
        await sleep(500);
        node.leftEdgeAnimated = false;
        return searchWithAnimation(node.left, value);
      } else {
        // Search in the right subtree
        node.state = null;
        node.rightEdgeAnimated = true;
        setTreeRoot({...clonedRoot});
        await sleep(500);
        node.rightEdgeAnimated = false;
        return searchWithAnimation(node.right, value);
      }
    };
    
    await searchWithAnimation(clonedRoot, searchVal);
    setIsAnimating(false);
  }, [treeRoot, isAnimating, showMessage]);
  
  // Delete a value from the BST
  const deleteValue = useCallback(async (value) => {
    if (isAnimating) return;
    setIsAnimating(true);
    
    const deleteVal = parseInt(value, 10);
    if (isNaN(deleteVal)) {
      showMessage("Please enter a valid number");
      setIsAnimating(false);
      return;
    }
    
    if (!treeRoot) {
      showMessage("Tree is empty");
      setIsAnimating(false);
      return;
    }
    
    // Clone the current tree to avoid direct state mutations
    const clonedRoot = JSON.parse(JSON.stringify(treeRoot));
    
    // Helper function to find the minimum value node in a subtree
    const findMinValueNode = (node) => {
      let current = node;
      while (current.left !== null) {
        current = current.left;
      }
      return current;
    };
    
    // Helper function to delete a node with animation
    const deleteWithAnimation = async (node, value, parent = null, isLeftChild = null) => {
      if (!node) {
        showMessage(`Value ${value} not found in the tree`);
        return null;
      }
      
      // Reset previous animations
      node.state = null;
      node.leftEdgeAnimated = false;
      node.rightEdgeAnimated = false;
      
      // Highlight current node
      node.state = 'visiting';
      setTreeRoot({...clonedRoot});
      await sleep(800);
      
      if (value < node.value) {
        // Delete from left subtree
        node.leftEdgeAnimated = true;
        setTreeRoot({...clonedRoot});
        await sleep(500);
        node.state = null;
        node.leftEdgeAnimated = false;
        node.left = await deleteWithAnimation(node.left, value, node, true);
        return node;
      } else if (value > node.value) {
        // Delete from right subtree
        node.rightEdgeAnimated = true;
        setTreeRoot({...clonedRoot});
        await sleep(500);
        node.state = null;
        node.rightEdgeAnimated = false;
        node.right = await deleteWithAnimation(node.right, value, node, false);
        return node;
      } else {
        // Node found, highlight it for deletion
        node.state = 'error';
        setTreeRoot({...clonedRoot});
        await sleep(800);
        
        // Case 1: No child or one child
        if (!node.left) {
          if (!parent) {
            setTreeRoot(node.right);
            return node.right;
          }
          
          if (isLeftChild) {
            parent.left = node.right;
          } else {
            parent.right = node.right;
          }
          setTreeRoot({...clonedRoot});
          await sleep(500);
          return node.right;
        } else if (!node.right) {
          if (!parent) {
            setTreeRoot(node.left);
            return node.left;
          }
          
          if (isLeftChild) {
            parent.left = node.left;
          } else {
            parent.right = node.left;
          }
          setTreeRoot({...clonedRoot});
          await sleep(500);
          return node.left;
        }
        
        // Case 2: Node with two children
        // Find the inorder successor (smallest in the right subtree)
        const successor = findMinValueNode(node.right);
        
        // Highlight successor
        successor.state = 'success';
        setTreeRoot({...clonedRoot});
        await sleep(800);
        
        // Replace node value with successor value
        node.value = successor.value;
        node.state = 'success';
        successor.state = null;
        setTreeRoot({...clonedRoot});
        await sleep(800);
        
        // Delete the successor
        node.state = null;
        node.right = await deleteWithAnimation(node.right, successor.value, node, false);
        return node;
      }
    };
    
    const newRoot = await deleteWithAnimation(clonedRoot, deleteVal);
    if (newRoot !== clonedRoot) {
      setTreeRoot(newRoot);
    }
    
    setIsAnimating(false);
  }, [treeRoot, isAnimating, showMessage]);
  
  // Clear the tree
  const clearTree = useCallback(() => {
    setTreeRoot(null);
    setNodes([]);
    setEdges([]);
  }, []);
  
  // Handle form submission
  const handleInsertSubmit = useCallback((e) => {
    e.preventDefault();
    insertValue(inputValue);
    setInputValue('');
  }, [inputValue, insertValue]);
  
  // Handle search submission
  const handleSearchSubmit = useCallback((e) => {
    e.preventDefault();
    searchForValue(searchValue);
    setSearchValue('');
  }, [searchValue, searchForValue]);
  
  // Handle delete submission
  const handleDeleteSubmit = useCallback((e) => {
    e.preventDefault();
    deleteValue(inputValue);
    setInputValue('');
  }, [inputValue, deleteValue]);
  
  return (
    <div className={styles.visualizer}>
      {message && <div className={styles.message}>{message}</div>}
      
      <div className={styles.controls}>
        <button 
          onClick={onBack} 
          className={styles.backButton}
        >
          Back
        </button>
        
        <form onSubmit={handleInsertSubmit} className={styles.inputForm}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Enter a number"
            className={styles.input}
            disabled={isAnimating}
          />
          <button 
            type="submit" 
            className={styles.btn}
            disabled={isAnimating}
          >
            Insert
          </button>
          <button 
            type="button" 
            onClick={handleDeleteSubmit}
            className={styles.btn}
            disabled={isAnimating}
          >
            Delete
          </button>
        </form>
        
        <form onSubmit={handleSearchSubmit} className={styles.searchForm}>
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search value"
            className={styles.input}
            disabled={isAnimating}
          />
          <button 
            type="submit" 
            className={styles.btn}
            disabled={isAnimating}
          >
            Search
          </button>
        </form>
        
        <button 
          onClick={clearTree} 
          className={`${styles.btn} ${styles.clearBtn}`}
          disabled={isAnimating}
        >
          Clear Tree
        </button>
      </div>
      
      <div className={styles.infoPanel}>
        <h3>Binary Search Tree (BST)</h3>
        <p>
          A binary search tree is a binary tree data structure where each node has at most two children, and
          for each node, all values in the left subtree are less than the node's value, and all values in the right
          subtree are greater than the node's value.
        </p>
        <div className={styles.complexity}>
          <div><strong>Search:</strong> O(log n) average, O(n) worst</div>
          <div><strong>Insert:</strong> O(log n) average, O(n) worst</div>
          <div><strong>Delete:</strong> O(log n) average, O(n) worst</div>
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
const BSTVisualizer = (props) => {
  return (
    <ReactFlowProvider>
      <BSTVisualizerContent {...props} />
    </ReactFlowProvider>
  );
};

export default BSTVisualizer; 