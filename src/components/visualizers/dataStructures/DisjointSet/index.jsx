import React, { useState, useCallback, useEffect, useRef } from 'react';
import ReactFlow, { 
  ReactFlowProvider, 
  Controls, 
  Background, 
  applyNodeChanges,
  applyEdgeChanges,
  Position,
  Handle
} from 'reactflow';
import 'reactflow/dist/style.css';
import styles from './styles.module.css';

// Custom SetNode component
const SetNode = ({ data }) => {
  const { value, parent, rank, isHighlighted, isRoot } = data;
  
  return (
    <div 
      className={`${styles.setNode} 
        ${isHighlighted ? styles.highlighted : ''} 
        ${isRoot ? styles.rootNode : ''}`}
    >
      <Handle type="target" position={Position.Top} />
      <div className={styles.nodeContent}>
        <div className={styles.nodeValue}>{value}</div>
        <div className={styles.nodeInfo}>
          <div className={styles.nodeParent}>p: {parent}</div>
          <div className={styles.nodeRank}>r: {rank}</div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

// Main DisjointSet visualizer component
const DisjointSetVisualizerContent = ({ onBack }) => {
  // Define nodeTypes outside the component render function
  const nodeTypes = useRef({ setNode: SetNode }).current;
  
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [firstValue, setFirstValue] = useState('');
  const [secondValue, setSecondValue] = useState('');
  const [message, setMessage] = useState(null);
  const [highlightedNodes, setHighlightedNodes] = useState(new Set());
  const [disjointSet, setDisjointSet] = useState({});
  const [animationInProgress, setAnimationInProgress] = useState(false);
  
  // Sleep function for animations
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  
  // Show message with auto-dismiss
  const showMessage = useCallback((text, duration = 2000) => {
    setMessage(text);
    setTimeout(() => setMessage(null), duration);
  }, []);
  
  // Create a new element in the disjoint set
  const makeSet = useCallback((value) => {
    if (!value.trim()) {
      showMessage("Please enter a value");
      return;
    }
    
    const val = value.trim();
    
    if (disjointSet[val] !== undefined) {
      showMessage(`Element ${val} already exists`);
      return;
    }
    
    setDisjointSet(prev => {
      const newSet = { ...prev };
      newSet[val] = {
        parent: val,
        rank: 0
      };
      return newSet;
    });
    
    setInputValue('');
    showMessage(`Created set with element ${val}`);
  }, [disjointSet, showMessage]);
  
  // Find the representative (root) of a set
  const findSet = useCallback(async (value, animate = true) => {
    if (!value.trim() || disjointSet[value.trim()] === undefined) {
      showMessage(`Element ${value} does not exist`);
      return null;
    }
    
    const val = value.trim();
    let current = val;
    const path = [current];
    
    if (animate) {
      setHighlightedNodes(new Set([current]));
      await sleep(700);
    }
    
    // Find the root
    while (disjointSet[current].parent !== current) {
      current = disjointSet[current].parent;
      path.push(current);
      
      if (animate) {
        setHighlightedNodes(new Set(path));
        await sleep(700);
      }
    }
    
    // Path compression
    if (path.length > 2) {
      const root = current;
      setDisjointSet(prev => {
        const newSet = { ...prev };
        for (let i = 0; i < path.length - 1; i++) {
          newSet[path[i]] = {
            ...newSet[path[i]],
            parent: root
          };
        }
        return newSet;
      });
      
      if (animate) {
        showMessage(`Path compression: setting parent of all nodes to root ${root}`);
        await sleep(1000);
      }
    }
    
    if (animate) {
      showMessage(`Found representative: ${current}`);
      setTimeout(() => setHighlightedNodes(new Set()), 1500);
    }
    
    return current;
  }, [disjointSet, showMessage]);
  
  // Union two sets
  const unionSets = useCallback(async (value1, value2) => {
    if (animationInProgress) return;
    setAnimationInProgress(true);
    
    try {
      if (!value1.trim() || !value2.trim()) {
        showMessage("Please enter both values");
        return;
      }
      
      const val1 = value1.trim();
      const val2 = value2.trim();
      
      if (disjointSet[val1] === undefined) {
        showMessage(`Element ${val1} does not exist`);
        return;
      }
      
      if (disjointSet[val2] === undefined) {
        showMessage(`Element ${val2} does not exist`);
        return;
      }
      
      showMessage(`Finding representatives for ${val1} and ${val2}...`);
      const root1 = await findSet(val1, true);
      const root2 = await findSet(val2, true);
      
      if (root1 === root2) {
        showMessage(`Elements ${val1} and ${val2} are already in the same set`);
        return;
      }
      
      // Union by rank
      setDisjointSet(prev => {
        const newSet = { ...prev };
        if (newSet[root1].rank < newSet[root2].rank) {
          newSet[root1].parent = root2;
          showMessage(`Union by rank: ${root1} -> ${root2}`);
        } else if (newSet[root1].rank > newSet[root2].rank) {
          newSet[root2].parent = root1;
          showMessage(`Union by rank: ${root2} -> ${root1}`);
        } else {
          newSet[root2].parent = root1;
          newSet[root1].rank += 1;
          showMessage(`Union by rank: ${root2} -> ${root1}, increasing rank of ${root1}`);
        }
        return newSet;
      });
      
      setFirstValue('');
      setSecondValue('');
      
    } finally {
      setTimeout(() => {
        setHighlightedNodes(new Set());
        setAnimationInProgress(false);
      }, 1500);
    }
  }, [disjointSet, findSet, showMessage, animationInProgress]);
  
  // Update the visualization when disjointSet changes
  useEffect(() => {
    const updateVisualization = () => {
      const elements = Object.keys(disjointSet);
      if (elements.length === 0) {
        setNodes([]);
        setEdges([]);
        return;
      }
      
      // Group nodes by their parent
      const nodesByParent = {};
      elements.forEach(element => {
        const parent = disjointSet[element].parent;
        if (!nodesByParent[parent]) {
          nodesByParent[parent] = [];
        }
        nodesByParent[parent].push(element);
      });
      
      // Create nodes
      const newNodes = [];
      const roots = Object.keys(nodesByParent);
      
      // Position calculations
      const HORIZONTAL_SPACING = 200;
      const VERTICAL_SPACING = 120;
      
      // Place roots
      roots.forEach((root, i) => {
        const rootX = (i * HORIZONTAL_SPACING) + 100;
        const rootY = 100;
        
        newNodes.push({
          id: root,
          type: 'setNode',
          position: { x: rootX, y: rootY },
          data: {
            value: root,
            parent: disjointSet[root].parent,
            rank: disjointSet[root].rank,
            isHighlighted: highlightedNodes.has(root),
            isRoot: disjointSet[root].parent === root
          }
        });
        
        // Place children of this root
        nodesByParent[root].forEach((element, j) => {
          if (element !== root) {
            const childX = rootX + ((j - nodesByParent[root].length / 2) * 80);
            const childY = rootY + VERTICAL_SPACING;
            
            newNodes.push({
              id: element,
              type: 'setNode',
              position: { x: childX, y: childY },
              data: {
                value: element,
                parent: disjointSet[element].parent,
                rank: disjointSet[element].rank,
                isHighlighted: highlightedNodes.has(element),
                isRoot: false
              }
            });
          }
        });
      });
      
      // Create edges
      const newEdges = [];
      elements.forEach(element => {
        const parent = disjointSet[element].parent;
        if (element !== parent) {
          newEdges.push({
            id: `${element}-${parent}`,
            source: element,
            target: parent,
            animated: highlightedNodes.has(element) && highlightedNodes.has(parent),
            style: { stroke: highlightedNodes.has(element) ? '#ff6b6b' : '#555' }
          });
        }
      });
      
      setNodes(newNodes);
      setEdges(newEdges);
    };
    
    updateVisualization();
  }, [disjointSet, highlightedNodes]);
  
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
  
  // Form submit handlers
  const handleMakeSetSubmit = useCallback((e) => {
    e.preventDefault();
    makeSet(inputValue);
  }, [inputValue, makeSet]);
  
  const handleFindSetSubmit = useCallback((e) => {
    e.preventDefault();
    findSet(inputValue);
  }, [inputValue, findSet]);
  
  const handleUnionSubmit = useCallback((e) => {
    e.preventDefault();
    unionSets(firstValue, secondValue);
  }, [firstValue, secondValue, unionSets]);
  
  return (
    <div className={styles.visualizer}>
      {/* Message display */}
      {message && <div className={styles.message}>{message}</div>}
      
      {/* Controls for disjoint set interaction */}
      <div className={styles.controls}>
        <button onClick={onBack} className={styles.btn}>
          Back
        </button>
        
        {/* Make Set Form */}
        <form onSubmit={handleMakeSetSubmit} className={styles.inputForm}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Enter value"
            className={styles.input}
            disabled={animationInProgress}
          />
          <button 
            type="submit" 
            className={styles.btn}
            disabled={animationInProgress}
          >
            Make Set
          </button>
        </form>
        
        {/* Find Set Form */}
        <form onSubmit={handleFindSetSubmit} className={styles.inputForm}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Enter value"
            className={styles.input}
            disabled={animationInProgress}
          />
          <button 
            type="submit" 
            className={styles.btn}
            disabled={animationInProgress}
          >
            Find Set
          </button>
        </form>
        
        {/* Union Form */}
        <form onSubmit={handleUnionSubmit} className={styles.unionForm}>
          <input
            type="text"
            value={firstValue}
            onChange={(e) => setFirstValue(e.target.value)}
            placeholder="First value"
            className={styles.input}
            disabled={animationInProgress}
          />
          <input
            type="text"
            value={secondValue}
            onChange={(e) => setSecondValue(e.target.value)}
            placeholder="Second value"
            className={styles.input}
            disabled={animationInProgress}
          />
          <button 
            type="submit" 
            className={styles.btn}
            disabled={animationInProgress}
          >
            Union
          </button>
        </form>
      </div>
      
      {/* Disjoint Set Information */}
      <div className={styles.setInfo}>
        <h3>Disjoint Set (Union-Find)</h3>
        <p>
          A data structure that tracks elements partitioned into non-overlapping subsets.
          It supports two main operations: Find (determine which subset an element belongs to)
          and Union (join two subsets into a single subset).
        </p>
        <ul className={styles.legend}>
          <li><span className={styles.rootNodeLegend}></span> Root Node</li>
          <li><span className={styles.regularNodeLegend}></span> Child Node</li>
          <li><span className={styles.highlightedNodeLegend}></span> Highlighted Node</li>
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
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
};

// Wrap in ReactFlowProvider
const DisjointSetVisualizer = (props) => {
  return (
    <ReactFlowProvider>
      <DisjointSetVisualizerContent {...props} />
    </ReactFlowProvider>
  );
};

export default DisjointSetVisualizer; 