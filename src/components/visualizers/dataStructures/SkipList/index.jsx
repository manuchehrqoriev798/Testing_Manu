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

// Custom Skip List Node component
const SkipListNode = ({ data }) => {
  return (
    <div className={`${styles.skipNode} ${data.state ? styles[data.state] : ''}`}>
      <Handle type="target" position={Position.Left} />
      <div className={styles.nodeLabel}>{data.label}</div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
};

// Main content component
const SkipListVisualizerContent = ({ onBack }) => {
  // Define nodeTypes OUTSIDE the component render function
  const nodeTypes = useRef({ skipNode: SkipListNode }).current;
  
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [message, setMessage] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [skipList, setSkipList] = useState({ head: null, maxLevel: 4 });
  const [highlightedPath, setHighlightedPath] = useState([]);
  
  // Constants for node placement
  const NODE_WIDTH = 60;
  const LEVEL_HEIGHT = 80;
  const NODE_X_START = 80;
  
  // Helper function to show messages
  const showMessage = useCallback((text, duration = 2000) => {
    setMessage(text);
    setTimeout(() => setMessage(null), duration);
  }, []);
  
  // Sleep function for animations
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  
  // Create a new Skip List
  const createNewSkipList = useCallback(() => {
    // Create header nodes for all levels
    const head = { value: -Infinity, next: Array(4).fill(null) };
    return { head, maxLevel: 4 };
  }, []);
  
  // Calculate random level for new node (with p = 0.5)
  const randomLevel = useCallback(() => {
    let level = 0;
    const maxLevel = skipList.maxLevel;
    
    while (Math.random() < 0.5 && level < maxLevel - 1) {
      level++;
    }
    
    return level;
  }, [skipList.maxLevel]);
  
  // Handle node changes from ReactFlow
  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  
  // Handle edge changes from ReactFlow
  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );
  
  // Insert a value into the skip list
  const insertValue = useCallback(async (value) => {
    if (isAnimating) return;
    setIsAnimating(true);
    
    try {
      const numValue = parseInt(value);
      if (isNaN(numValue)) {
        showMessage("Please enter a valid number");
        setIsAnimating(false);
        return;
      }
      
      // Create a new skip list if we don't have one
      if (!skipList.head) {
        setSkipList(createNewSkipList());
        setIsAnimating(false);
        return;
      }
      
      // Clone the skip list to avoid direct mutations
      const newSkipList = JSON.parse(JSON.stringify(skipList));
      const { head, maxLevel } = newSkipList;
      
      // Track the path for visualization
      const updatePath = [];
      
      // Array to store the update pointers at each level
      const update = Array(maxLevel).fill(null);
      
      // Start at the head node at the highest level
      let current = head;
      
      // Traverse the skip list from the highest level to the lowest
      for (let i = maxLevel - 1; i >= 0; i--) {
        // Move forward at the current level as far as possible
        while (current.next[i] && current.next[i].value < numValue) {
          current = current.next[i];
          updatePath.push({ id: `node-${current.value}-${i}` });
        }
        // Store the node at this level where we need to make changes
        update[i] = current;
      }
      
      // Move to the lowest level
      current = current.next[0];
      
      // Check if we're updating an existing node
      if (current && current.value === numValue) {
        showMessage(`Value ${numValue} already exists in the skip list`);
        setHighlightedPath(updatePath);
        setTimeout(() => setHighlightedPath([]), 2000);
        setIsAnimating(false);
        return;
      }
      
      // Create a new node with a random level
      const nodeLevel = randomLevel();
      const newNode = {
        value: numValue,
        next: Array(nodeLevel + 1).fill(null)
      };
      
      // Update the pointers at each level
      for (let i = 0; i <= nodeLevel; i++) {
        newNode.next[i] = update[i].next[i];
        update[i].next[i] = newNode;
        
        // Add new node to visualization path
        updatePath.push({ id: `node-${numValue}-${i}` });
        
        // Delay for animation effect
        await sleep(300);
      }
      
      setSkipList(newSkipList);
      setHighlightedPath(updatePath);
      
      // Reset highlight after delay
      setTimeout(() => setHighlightedPath([]), 2000);
      showMessage(`Inserted ${numValue} into the skip list`);
    } catch (error) {
      console.error('Insert error:', error);
      showMessage('Error inserting value');
    } finally {
      setInputValue('');
      setIsAnimating(false);
    }
  }, [isAnimating, skipList, createNewSkipList, randomLevel, showMessage]);
  
  // Search for a value in the skip list
  const searchForValue = useCallback(async (value) => {
    if (isAnimating) return;
    setIsAnimating(true);
    
    try {
      const numValue = parseInt(value);
      if (isNaN(numValue)) {
        showMessage("Please enter a valid number");
        setIsAnimating(false);
        return;
      }
      
      if (!skipList.head) {
        showMessage("Skip list is empty");
        setIsAnimating(false);
        return;
      }
      
      const { head, maxLevel } = skipList;
      let current = head;
      
      // Track the search path for visualization
      const searchPath = [];
      
      // Start at the highest level
      for (let i = maxLevel - 1; i >= 0; i--) {
        while (current.next[i] && current.next[i].value < numValue) {
          current = current.next[i];
          searchPath.push({ id: `node-${current.value}-${i}` });
          
          // Delay for visualization
          await sleep(300);
        }
      }
      
      // Move to the next node at the lowest level
      current = current.next[0];
      
      // Check if we found the value
      if (current && current.value === numValue) {
        // Add the found node to the search path
        for (let i = 0; i < maxLevel && i < current.next.length; i++) {
          searchPath.push({ id: `node-${current.value}-${i}` });
        }
        
        setHighlightedPath(searchPath);
        showMessage(`Found ${numValue} in the skip list!`);
      } else {
        setHighlightedPath(searchPath);
        showMessage(`${numValue} not found in the skip list`);
      }
      
      // Reset highlight after delay
      setTimeout(() => setHighlightedPath([]), 2000);
    } catch (error) {
      console.error('Search error:', error);
      showMessage('Error searching for value');
    } finally {
      setSearchValue('');
      setIsAnimating(false);
    }
  }, [isAnimating, skipList, showMessage]);
  
  // Delete a value from the skip list
  const deleteValue = useCallback(async (value) => {
    if (isAnimating) return;
    setIsAnimating(true);
    
    try {
      const numValue = parseInt(value);
      if (isNaN(numValue)) {
        showMessage("Please enter a valid number");
        setIsAnimating(false);
        return;
      }
      
      if (!skipList.head) {
        showMessage("Skip list is empty");
        setIsAnimating(false);
        return;
      }
      
      // Clone the skip list
      const newSkipList = JSON.parse(JSON.stringify(skipList));
      const { head, maxLevel } = newSkipList;
      
      // Track path for visualization
      const deletePath = [];
      
      // Array to store update pointers
      const update = Array(maxLevel).fill(null);
      
      let current = head;
      
      // Find the position to delete
      for (let i = maxLevel - 1; i >= 0; i--) {
        while (current.next[i] && current.next[i].value < numValue) {
          current = current.next[i];
          deletePath.push({ id: `node-${current.value}-${i}` });
          
          // Delay for visualization
          await sleep(300);
        }
        update[i] = current;
      }
      
      // Move to the target node
      current = current.next[0];
      
      // Check if we found the node to delete
      if (current && current.value === numValue) {
        // Add the node to be deleted to the path
        for (let i = 0; i < maxLevel && i < current.next.length; i++) {
          deletePath.push({ id: `node-${current.value}-${i}`, state: 'deleting' });
        }
        
        // Update all relevant pointers
        for (let i = 0; i < maxLevel; i++) {
          if (update[i].next[i] && update[i].next[i].value === numValue) {
            update[i].next[i] = update[i].next[i].next[i];
            
            // Add visual delay
            await sleep(300);
          }
        }
        
        setSkipList(newSkipList);
        setHighlightedPath(deletePath);
        showMessage(`Deleted ${numValue} from the skip list`);
      } else {
        setHighlightedPath(deletePath);
        showMessage(`${numValue} not found in the skip list`);
      }
      
      // Reset highlight after delay
      setTimeout(() => setHighlightedPath([]), 2000);
    } catch (error) {
      console.error('Delete error:', error);
      showMessage('Error deleting value');
    } finally {
      setSearchValue('');
      setIsAnimating(false);
    }
  }, [isAnimating, skipList, showMessage]);
  
  // Clear the skip list
  const clearSkipList = useCallback(() => {
    setSkipList(createNewSkipList());
    showMessage("Skip list cleared");
  }, [createNewSkipList, showMessage]);
  
  // Generate visualization nodes and edges from the skip list
  const updateVisualization = useCallback(() => {
    if (!skipList.head) return;
    
    const newNodes = [];
    const newEdges = [];
    const { head, maxLevel } = skipList;
    
    // Add the head node at all levels
    for (let i = 0; i < maxLevel; i++) {
      newNodes.push({
        id: `node-${head.value}-${i}`,
        type: 'skipNode',
        position: { x: NODE_X_START, y: (maxLevel - 1 - i) * LEVEL_HEIGHT },
        data: { 
          label: 'HEAD',
          state: highlightedPath.some(node => node.id === `node-${head.value}-${i}`) 
                 ? 'highlighted' 
                 : '',
          level: i
        }
      });
    }
    
    // Create a map to track x-positions of nodes
    const nodePositions = { [head.value]: NODE_X_START };
    
    // For each level, add nodes and edges
    for (let level = 0; level < maxLevel; level++) {
      let current = head;
      let prevNodeId = `node-${head.value}-${level}`;
      let xPosition = NODE_X_START;
      
      while (current.next[level]) {
        current = current.next[level];
        
        // Calculate or reuse x-position
        if (!nodePositions[current.value]) {
          xPosition += NODE_WIDTH * 2;
          nodePositions[current.value] = xPosition;
        } else {
          xPosition = nodePositions[current.value];
        }
        
        const currentNodeId = `node-${current.value}-${level}`;
        
        // Add the node if it doesn't exist yet
        if (!newNodes.some(node => node.id === currentNodeId)) {
          newNodes.push({
            id: currentNodeId,
            type: 'skipNode',
            position: { 
              x: xPosition, 
              y: (maxLevel - 1 - level) * LEVEL_HEIGHT 
            },
            data: { 
              label: current.value,
              state: highlightedPath.some(node => node.id === currentNodeId && node.state) 
                     ? node.state 
                     : highlightedPath.some(node => node.id === currentNodeId) 
                     ? 'highlighted' 
                     : '',
              level
            }
          });
        }
        
        // Add the edge
        newEdges.push({
          id: `edge-${prevNodeId}-${currentNodeId}`,
          source: prevNodeId,
          target: currentNodeId,
          type: 'smoothstep',
          animated: highlightedPath.some(node => 
            node.id === prevNodeId || node.id === currentNodeId
          ),
          style: {
            stroke: highlightedPath.some(node => 
              node.id === prevNodeId || node.id === currentNodeId
            ) ? '#FF5722' : '#B8B8B8'
          }
        });
        
        prevNodeId = currentNodeId;
      }
    }
    
    // Add vertical edges to connect nodes at different levels
    for (let i = 0; i < maxLevel - 1; i++) {
      let current = head;
      
      // Add vertical edge for head node
      newEdges.push({
        id: `vedge-${head.value}-${i}`,
        source: `node-${head.value}-${i}`,
        target: `node-${head.value}-${i+1}`,
        type: 'straight',
        style: { stroke: '#ccc', strokeDasharray: '5,5' }
      });
      
      // Add vertical edges for all other nodes
      while (current.next[i]) {
        current = current.next[i];
        
        if (current.next[i+1]) {
          newEdges.push({
            id: `vedge-${current.value}-${i}`,
            source: `node-${current.value}-${i}`,
            target: `node-${current.value}-${i+1}`,
            type: 'straight',
            style: { stroke: '#ccc', strokeDasharray: '5,5' }
          });
        }
      }
    }
    
    setNodes(newNodes);
    setEdges(newEdges);
  }, [skipList, highlightedPath]);
  
  // Update visualization when the skip list changes
  useEffect(() => {
    updateVisualization();
  }, [skipList, highlightedPath, updateVisualization]);
  
  // Handle form submission for insert
  const handleInsertSubmit = useCallback((e) => {
    e.preventDefault();
    insertValue(inputValue);
  }, [inputValue, insertValue]);
  
  // Handle form submission for search
  const handleSearchSubmit = useCallback(() => {
    if (!searchValue.trim()) {
      showMessage("Please enter a value to search");
      return;
    }
    
    searchForValue(searchValue);
  }, [searchValue, searchForValue]);
  
  // Handle form submission for delete
  const handleDeleteSubmit = useCallback((e) => {
    e.preventDefault();
    deleteValue(searchValue);
  }, [searchValue, deleteValue]);
  
  return (
    <div className={styles.visualizer}>
      {/* Message display */}
      {message && <div className={styles.message}>{message}</div>}
      
      {/* Controls for skip list interaction */}
      <div className={styles.controls}>
        <button onClick={onBack} className={styles.btn}>
          Back
        </button>
        
        {/* Insert Form */}
        <form onSubmit={handleInsertSubmit} className={styles.inputForm}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Enter value to insert"
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
        </form>
        
        {/* Search/Delete Form */}
        <form className={styles.searchForm}>
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Enter value to search/delete"
            className={styles.input}
            disabled={isAnimating}
          />
          <div className={styles.buttonGroup}>
            <button 
              type="button" 
              onClick={handleSearchSubmit}
              className={styles.btn}
              disabled={isAnimating}
            >
              Search
            </button>
            <button 
              type="button" 
              onClick={handleDeleteSubmit}
              className={styles.btn}
              disabled={isAnimating}
            >
              Delete
            </button>
            <button 
              type="button" 
              onClick={clearSkipList}
              className={styles.btn}
              disabled={isAnimating}
            >
              Clear
            </button>
          </div>
        </form>
      </div>
      
      {/* Skip List Information */}
      <div className={styles.skipListInfo}>
        <h3>Skip List Visualizer</h3>
        <p>
          A skip list is a probabilistic data structure that allows for fast search 
          within an ordered sequence of elements. It's built in layers where the 
          bottom layer is a linked list containing all elements, and upper layers 
          act as "express lanes" for faster traversal.
        </p>
        <ul className={styles.legend}>
          <li><span className={styles.regularNode}></span> Regular Node</li>
          <li><span className={styles.highlightedNode}></span> Highlighted Node</li>
          <li><span className={styles.deletingNode}></span> Deleting Node</li>
        </ul>
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
          attributionPosition="bottom-right"
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
};

// Wrap in ReactFlowProvider
const SkipListVisualizer = (props) => {
  return (
    <ReactFlowProvider>
      <SkipListVisualizerContent {...props} />
    </ReactFlowProvider>
  );
};

export default SkipListVisualizer; 