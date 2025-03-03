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

// Custom Node component for Suffix Tree
const SuffixTreeNode = ({ data }) => {
  return (
    <div 
      className={`${styles.treeNode} ${data.isLeaf ? styles.leafNode : ''} ${data.isHighlighted ? styles.highlighted : ''}`}
    >
      <Handle type="target" position={Position.Top} />
      <div className={styles.nodeContent}>
        <div className={styles.label}>{data.label}</div>
        {data.suffixIndex !== undefined && (
          <div className={styles.suffixIndex}>Suffix: {data.suffixIndex}</div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

// Custom Node component for Suffix Array
const SuffixArrayNode = ({ data }) => {
  return (
    <div 
      className={`${styles.arrayNode} ${data.isHighlighted ? styles.highlighted : ''}`}
    >
      <div className={styles.indexLabel}>{data.index}</div>
      <div className={styles.arrayContent}>
        <div className={styles.suffixPos}>Position: {data.suffixPos}</div>
        <div className={styles.suffixText}>{data.suffixText}</div>
      </div>
    </div>
  );
};

// Main Suffix Tree/Array visualizer component
const SuffixTreeVisualizerContent = ({ onBack }) => {
  // Node types registration
  const nodeTypes = useRef({
    treeNode: SuffixTreeNode,
    arrayNode: SuffixArrayNode,
  }).current;
  
  // State
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [inputString, setInputString] = useState('');
  const [searchPattern, setSearchPattern] = useState('');
  const [currentString, setCurrentString] = useState('');
  const [message, setMessage] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [visualizationType, setVisualizationType] = useState('tree'); // 'tree' or 'array'
  const [highlightedPath, setHighlightedPath] = useState([]);
  
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
  
  // Reset highlighted nodes
  const resetHighlights = useCallback(() => {
    setNodes(currentNodes => 
      currentNodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          isHighlighted: false
        }
      }))
    );
    setHighlightedPath([]);
  }, []);
  
  // Build a Suffix Tree (simplified for visualization)
  const buildSuffixTree = useCallback((str) => {
    if (!str) return { root: null, nodes: [], edges: [] };
    
    const root = { id: 'root', children: [], label: 'Root', suffixIndex: undefined };
    const nodes = [{ id: 'root', type: 'treeNode', position: { x: 300, y: 50 }, data: { label: 'Root', isLeaf: false } }];
    const edges = [];
    
    // Create suffixes and add them to the tree
    for (let i = 0; i < str.length; i++) {
      const suffix = str.substring(i) + '$';
      let currentNode = root;
      let depth = 0;
      
      for (let j = 0; j < suffix.length; j++) {
        const char = suffix[j];
        const existingChild = currentNode.children.find(child => child.label.startsWith(char));
        
        if (!existingChild) {
          // Create new node for this character
          const newNodeId = `node-${nodes.length}`;
          const label = suffix.substring(j);
          const newNode = { 
            id: newNodeId, 
            label, 
            children: [], 
            suffixIndex: i,
            parentId: currentNode.id
          };
          
          currentNode.children.push(newNode);
          
          // Add node to visualization
          nodes.push({
            id: newNodeId,
            type: 'treeNode',
            position: { 
              x: 150 + (nodes.length * 120) % 600, 
              y: 120 + (depth + 1) * 100 
            },
            data: {
              label,
              isLeaf: true,
              suffixIndex: i
            }
          });
          
          // Add edge to visualization
          edges.push({
            id: `edge-${currentNode.id}-${newNodeId}`,
            source: currentNode.id,
            target: newNodeId,
            animated: false,
            style: { stroke: '#555' }
          });
          
          break;
        } else {
          // Navigate to existing child
          currentNode = existingChild;
          depth++;
        }
      }
    }
    
    // Adjust node positions for better visualization
    const organizeTree = (rootId, startX, width, depth = 0) => {
      const node = nodes.find(n => n.id === rootId);
      if (!node) return;
      
      const childEdges = edges.filter(e => e.source === rootId);
      const childIds = childEdges.map(e => e.target);
      
      if (childIds.length === 0) return;
      
      const segmentWidth = width / childIds.length;
      
      childIds.forEach((childId, index) => {
        const childNode = nodes.find(n => n.id === childId);
        if (childNode) {
          childNode.position.x = startX + index * segmentWidth + segmentWidth / 2;
          childNode.position.y = 120 + (depth + 1) * 100;
          
          organizeTree(childId, startX + index * segmentWidth, segmentWidth, depth + 1);
        }
      });
    };
    
    organizeTree('root', 0, 800);
    
    return { root, nodes, edges };
  }, []);
  
  // Build a Suffix Array
  const buildSuffixArray = useCallback((str) => {
    if (!str) return { suffixArray: [], nodes: [], edges: [] };
    
    // Generate all suffixes with their starting positions
    const suffixes = [];
    for (let i = 0; i < str.length; i++) {
      suffixes.push({
        index: i,
        suffix: str.substring(i)
      });
    }
    
    // Sort suffixes lexicographically
    suffixes.sort((a, b) => a.suffix.localeCompare(b.suffix));
    
    // Create visualization nodes
    const nodes = suffixes.map((suffix, idx) => ({
      id: `node-${idx}`,
      type: 'arrayNode',
      position: { x: 300, y: 80 + idx * 80 },
      data: {
        index: idx,
        suffixPos: suffix.index,
        suffixText: suffix.suffix,
        isHighlighted: false
      }
    }));
    
    return { 
      suffixArray: suffixes.map(s => s.index),
      nodes,
      edges: [] // No edges in suffix array visualization
    };
  }, []);
  
  // Set the input string and build the visualization
  const setAndVisualize = useCallback(async (str) => {
    if (!str.trim()) {
      showMessage("Please enter a string");
      return;
    }
    
    if (isAnimating) return;
    setIsAnimating(true);
    
    try {
      // Reset any existing visualization
      resetHighlights();
      
      setCurrentString(str);
      
      if (visualizationType === 'tree') {
        // Build and visualize suffix tree
        const { nodes: treeNodes, edges: treeEdges } = buildSuffixTree(str);
        
        // Set nodes and edges with animation
        setNodes([]);
        setEdges([]);
        
        await sleep(300);
        
        // Add nodes one by one
        for (const node of treeNodes) {
          setNodes(current => [...current, node]);
          await sleep(150);
        }
        
        // Add edges one by one
        for (const edge of treeEdges) {
          setEdges(current => [...current, edge]);
          await sleep(100);
        }
        
        showMessage(`Suffix Tree built for "${str}"`);
      } else {
        // Build and visualize suffix array
        const { nodes: arrayNodes } = buildSuffixArray(str);
        
        // Set nodes with animation
        setNodes([]);
        setEdges([]);
        
        await sleep(300);
        
        // Add nodes one by one
        for (const node of arrayNodes) {
          setNodes(current => [...current, node]);
          await sleep(150);
        }
        
        showMessage(`Suffix Array built for "${str}"`);
      }
      
      setInputString('');
    } catch (error) {
      console.error("Error building visualization:", error);
      showMessage("An error occurred while building the visualization");
    } finally {
      setIsAnimating(false);
    }
  }, [visualizationType, buildSuffixTree, buildSuffixArray, showMessage, resetHighlights, isAnimating]);
  
  // Search for a pattern in the visualization
  const searchInVisualization = useCallback(async (pattern) => {
    if (!pattern.trim()) {
      showMessage("Please enter a pattern to search");
      return;
    }
    
    if (!currentString) {
      showMessage("Please build a suffix tree/array first");
      return;
    }
    
    if (isAnimating) return;
    setIsAnimating(true);
    
    try {
      // Reset any existing highlights
      resetHighlights();
      
      if (visualizationType === 'tree') {
        // Search in suffix tree
        const highlightedIds = [];
        let currentNodeId = 'root';
        let found = true;
        
        // Highlight the root
        setNodes(nodes => nodes.map(node => 
          node.id === currentNodeId 
            ? { ...node, data: { ...node.data, isHighlighted: true } } 
            : node
        ));
        highlightedIds.push(currentNodeId);
        
        await sleep(500);
        
        // Try to follow the pattern in the tree
        for (let i = 0; i < pattern.length && found; i++) {
          const currentChar = pattern[i];
          found = false;
          
          // Find edges from current node
          const outgoingEdges = edges.filter(e => e.source === currentNodeId);
          
          for (const edge of outgoingEdges) {
            const targetNode = nodes.find(n => n.id === edge.target);
            if (targetNode && targetNode.data.label.startsWith(currentChar)) {
              // Found matching edge, highlight it
              setEdges(edges => edges.map(e => 
                e.id === edge.id 
                  ? { ...e, animated: true, style: { ...e.style, stroke: '#4CAF50', strokeWidth: 3 } }
                  : e
              ));
              
              // Highlight the target node
              setNodes(nodes => nodes.map(node => 
                node.id === targetNode.id 
                  ? { ...node, data: { ...node.data, isHighlighted: true } } 
                  : node
              ));
              
              highlightedIds.push(targetNode.id);
              currentNodeId = targetNode.id;
              found = true;
              await sleep(700);
              break;
            }
          }
        }
        
        setHighlightedPath(highlightedIds);
        
        if (found) {
          showMessage(`Pattern "${pattern}" found in the suffix tree`);
        } else {
          showMessage(`Pattern "${pattern}" not found in the suffix tree`);
          
          // Reset highlights after a delay
          await sleep(1500);
          resetHighlights();
        }
      } else {
        // Search in suffix array (binary search simulation)
        const suffixArray = nodes.map(node => ({
          index: node.data.index,
          suffixPos: node.data.suffixPos,
          suffixText: node.data.suffixText
        }));
        
        let left = 0;
        let right = suffixArray.length - 1;
        let found = false;
        
        // Highlight nodes during binary search
        while (left <= right) {
          // Reset previous highlights
          setNodes(nodes => nodes.map(node => ({
            ...node,
            data: { ...node.data, isHighlighted: false }
          })));
          
          const mid = Math.floor((left + right) / 2);
          
          // Highlight current middle node
          setNodes(nodes => nodes.map((node, idx) => 
            idx === mid 
              ? { ...node, data: { ...node.data, isHighlighted: true } } 
              : node
          ));
          
          await sleep(700);
          
          const suffix = suffixArray[mid].suffixText;
          
          // Check if the pattern matches the current suffix
          if (suffix.startsWith(pattern)) {
            found = true;
            break;
          }
          
          // Adjust search range
          if (pattern < suffix) {
            right = mid - 1;
          } else {
            left = mid + 1;
          }
        }
        
        if (found) {
          showMessage(`Pattern "${pattern}" found in the suffix array`);
        } else {
          showMessage(`Pattern "${pattern}" not found in the suffix array`);
          
          // Reset highlights after a delay
          await sleep(1500);
          resetHighlights();
        }
      }
      
      setSearchPattern('');
    } catch (error) {
      console.error("Error searching:", error);
      showMessage("An error occurred during search");
    } finally {
      setIsAnimating(false);
    }
  }, [currentString, visualizationType, edges, nodes, resetHighlights, showMessage, isAnimating]);
  
  // Switch visualization type
  const switchVisualizationType = useCallback(() => {
    if (isAnimating) return;
    
    const newType = visualizationType === 'tree' ? 'array' : 'tree';
    setVisualizationType(newType);
    
    if (currentString) {
      // Rebuild visualization with the new type
      setAndVisualize(currentString);
    }
  }, [visualizationType, currentString, setAndVisualize, isAnimating]);
  
  // Handle form submissions
  const handleInputSubmit = useCallback((e) => {
    e.preventDefault();
    setAndVisualize(inputString);
  }, [inputString, setAndVisualize]);
  
  const handleSearchSubmit = useCallback((e) => {
    e.preventDefault();
    searchInVisualization(searchPattern);
  }, [searchPattern, searchInVisualization]);
  
  // Components return
  return (
    <div className={styles.visualizer}>
      {/* Message display */}
      {message && <div className={styles.message}>{message}</div>}
      
      {/* Controls */}
      <div className={styles.controls}>
        <button onClick={onBack} className={styles.btn}>
          Back
        </button>
        
        <form onSubmit={handleInputSubmit} className={styles.inputForm}>
          <input
            type="text"
            value={inputString}
            onChange={(e) => setInputString(e.target.value)}
            placeholder="Enter string to build suffix structure"
            className={styles.input}
            disabled={isAnimating}
          />
          <button 
            type="submit" 
            className={styles.btn}
            disabled={isAnimating}
          >
            Build {visualizationType === 'tree' ? 'Suffix Tree' : 'Suffix Array'}
          </button>
        </form>
        
        <form onSubmit={handleSearchSubmit} className={styles.inputForm}>
          <input
            type="text"
            value={searchPattern}
            onChange={(e) => setSearchPattern(e.target.value)}
            placeholder="Enter pattern to search"
            className={styles.input}
            disabled={isAnimating || !currentString}
          />
          <button 
            type="submit" 
            className={styles.btn}
            disabled={isAnimating || !currentString}
          >
            Search
          </button>
        </form>
        
        <button
          onClick={switchVisualizationType}
          className={`${styles.btn} ${styles.switchBtn}`}
          disabled={isAnimating}
        >
          Switch to {visualizationType === 'tree' ? 'Suffix Array' : 'Suffix Tree'}
        </button>
      </div>
      
      {/* Info Panel */}
      <div className={styles.infoPanel}>
        <h3>{visualizationType === 'tree' ? 'Suffix Tree' : 'Suffix Array'} Visualizer</h3>
        <p>
          {visualizationType === 'tree' 
            ? 'A Suffix Tree is a compressed trie containing all the suffixes of the given text as their keys and positions in the text as their values.'
            : 'A Suffix Array is a sorted array of all suffixes of a string, used for efficient substring search.'
          }
        </p>
        
        {currentString && (
          <div className={styles.currentString}>
            <strong>Current String:</strong> {currentString}
          </div>
        )}
        
        <div className={styles.legend}>
          <div>
            <span className={`${styles.legendItem} ${visualizationType === 'tree' ? styles.treeNode : styles.arrayNode}`}></span>
            <span>Regular Node</span>
          </div>
          <div>
            <span className={`${styles.legendItem} ${visualizationType === 'tree' ? styles.leafNode : ''}`}></span>
            <span>{visualizationType === 'tree' ? 'Leaf Node (Suffix End)' : ''}</span>
          </div>
          <div>
            <span className={`${styles.legendItem} ${styles.highlighted}`}></span>
            <span>Highlighted Node</span>
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
const SuffixTreeVisualizer = (props) => {
  return (
    <ReactFlowProvider>
      <SuffixTreeVisualizerContent {...props} />
    </ReactFlowProvider>
  );
};

export default SuffixTreeVisualizer; 