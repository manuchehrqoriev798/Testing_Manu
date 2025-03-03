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

// Custom Bit Node component
const BitNode = ({ data }) => {
  return (
    <div className={`${styles.bitNode} ${data.isSet ? styles.setBit : styles.unsetBit}`}>
      <div className={styles.nodeIndex}>{data.index}</div>
      <div className={styles.nodeValue}>{data.isSet ? '1' : '0'}</div>
      {data.isHighlighted && (
        <div className={styles.highlightRing} style={{ backgroundColor: data.highlightColor }}></div>
      )}
    </div>
  );
};

// Custom Hash Function Node
const HashFunctionNode = ({ data }) => {
  return (
    <div className={styles.hashNode}>
      <Handle type="target" position={Position.Top} />
      <div className={styles.hashFunction}>
        <div className={styles.hashTitle}>Hash Function {data.index}</div>
        <div className={styles.hashFormula}>h{data.index}(x) = {data.formula}</div>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

// Main Bloom Filter visualizer component
const BloomFilterVisualizerContent = ({ onBack }) => {
  // Node types registration
  const nodeTypes = useRef({
    bit: BitNode,
    hash: HashFunctionNode,
  }).current;
  
  // State
  const [filterSize, setFilterSize] = useState(16);
  const [numHashFunctions, setNumHashFunctions] = useState(3);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [bloomFilter, setBloomFilter] = useState(new Array(filterSize).fill(false));
  const [message, setMessage] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [falsePositiveProbability, setFalsePositiveProbability] = useState(0);
  const [itemsAdded, setItemsAdded] = useState([]);
  
  // Hash functions (simple ones for visualization)
  const hashFunctions = [
    (str) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = (hash * 31 + str.charCodeAt(i)) % filterSize;
      }
      return hash;
    },
    (str) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = (hash * 37 + str.charCodeAt(i)) % filterSize;
      }
      return hash;
    },
    (str) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = (hash * 41 + str.charCodeAt(i)) % filterSize;
      }
      return hash;
    },
    (str) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = (hash * 43 + str.charCodeAt(i)) % filterSize;
      }
      return hash;
    },
    (str) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = (hash * 47 + str.charCodeAt(i)) % filterSize;
      }
      return hash;
    }
  ];
  
  // Helper function to show messages
  const showMessage = useCallback((text, duration = 3000) => {
    setMessage(text);
    setTimeout(() => setMessage(null), duration);
  }, []);
  
  // Sleep function for animations
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  
  // Calculate false positive probability
  const calculateFalsePositiveProbability = useCallback(() => {
    const n = itemsAdded.length; // Number of items added
    const m = filterSize; // Size of bit array
    const k = numHashFunctions; // Number of hash functions
    
    if (n === 0) return 0;
    
    // Calculate probability that any bit is still 0 after inserting n items
    const bitProbability = Math.pow(1 - 1/m, k * n);
    
    // Probability of false positive is (1 - probability that at least one bit is 0)^k
    const probability = Math.pow(1 - bitProbability, k);
    
    return Math.min(1, probability);
  }, [filterSize, numHashFunctions, itemsAdded.length]);
  
  // Handle nodes changes
  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  
  // Handle edges changes
  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );
  
  // Reset all highlights
  const resetHighlights = useCallback(() => {
    setNodes(nodes => nodes.map(node => {
      if (node.type === 'bit') {
        return {
          ...node,
          data: {
            ...node.data,
            isHighlighted: false
          }
        };
      }
      return node;
    }));
  }, []);
  
  // Add an item to the bloom filter
  const addItem = useCallback(async (item) => {
    if (!item.trim()) {
      showMessage("Please enter a value to add");
      return;
    }
    
    if (isAnimating) return;
    setIsAnimating(true);
    
    try {
      // Create a copy of the current bloom filter
      const newFilter = [...bloomFilter];
      const hashResults = [];
      
      // Reset any highlights
      await resetHighlights();
      
      // Apply each hash function and set the bits
      for (let i = 0; i < numHashFunctions; i++) {
        const hashValue = hashFunctions[i](item);
        hashResults.push(hashValue);
        
        // Highlight the hash function node
        setNodes(nodes => nodes.map(node => {
          if (node.type === 'hash' && node.data.index === i) {
            return {
              ...node,
              style: { ...node.style, borderColor: '#4CAF50', backgroundColor: '#E8F5E9' }
            };
          }
          return node;
        }));
        
        await sleep(500);
        
        // Highlight the bit node
        setNodes(nodes => nodes.map(node => {
          if (node.type === 'bit' && node.data.index === hashValue) {
            return {
              ...node,
              data: {
                ...node.data,
                isHighlighted: true,
                highlightColor: '#4CAF50'
              }
            };
          }
          return node;
        }));
        
        await sleep(500);
        
        // Set the bit
        newFilter[hashValue] = true;
        
        // Update the bit node
        setNodes(nodes => nodes.map(node => {
          if (node.type === 'bit' && node.data.index === hashValue) {
            return {
              ...node,
              data: {
                ...node.data,
                isSet: true
              }
            };
          }
          return node;
        }));
        
        await sleep(500);
      }
      
      // Reset hash function highlights
      setNodes(nodes => nodes.map(node => {
        if (node.type === 'hash') {
          return {
            ...node,
            style: { ...node.style, borderColor: '#E0E0E0', backgroundColor: 'white' }
          };
        }
        return node;
      }));
      
      // Update the bloom filter
      setBloomFilter(newFilter);
      
      // Add item to the list of added items if not already there
      if (!itemsAdded.includes(item)) {
        setItemsAdded([...itemsAdded, item]);
      }
      
      showMessage(`Added "${item}" to the bloom filter`);
      setInputValue('');
      
      // Update the false positive probability
      setFalsePositiveProbability(calculateFalsePositiveProbability());
      
      await sleep(500);
      
      // Reset all highlights
      resetHighlights();
    } catch (error) {
      console.error("Error adding item:", error);
      showMessage("An error occurred while adding the item");
    } finally {
      setIsAnimating(false);
    }
  }, [bloomFilter, numHashFunctions, hashFunctions, resetHighlights, showMessage, calculateFalsePositiveProbability, itemsAdded, isAnimating]);
  
  // Check if an item is in the bloom filter
  const checkItem = useCallback(async (item) => {
    if (!item.trim()) {
      showMessage("Please enter a value to check");
      return;
    }
    
    if (isAnimating) return;
    setIsAnimating(true);
    
    try {
      // Reset any highlights
      await resetHighlights();
      
      let mayBeInSet = true;
      
      // Apply each hash function and check the bits
      for (let i = 0; i < numHashFunctions; i++) {
        const hashValue = hashFunctions[i](item);
        
        // Highlight the hash function node
        setNodes(nodes => nodes.map(node => {
          if (node.type === 'hash' && node.data.index === i) {
            return {
              ...node,
              style: { ...node.style, borderColor: '#2196F3', backgroundColor: '#E3F2FD' }
            };
          }
          return node;
        }));
        
        await sleep(500);
        
        // Highlight the bit node
        setNodes(nodes => nodes.map(node => {
          if (node.type === 'bit' && node.data.index === hashValue) {
            return {
              ...node,
              data: {
                ...node.data,
                isHighlighted: true,
                highlightColor: bloomFilter[hashValue] ? '#2196F3' : '#F44336'
              }
            };
          }
          return node;
        }));
        
        await sleep(500);
        
        // Check if the bit is set
        if (!bloomFilter[hashValue]) {
          mayBeInSet = false;
          break;
        }
      }
      
      // Show message based on result
      if (mayBeInSet) {
        if (itemsAdded.includes(item)) {
          showMessage(`"${item}" is definitely in the bloom filter`);
        } else {
          showMessage(`"${item}" might be in the bloom filter (false positive)`);
        }
      } else {
        showMessage(`"${item}" is definitely not in the bloom filter`);
      }
      
      // Reset hash function highlights
      setNodes(nodes => nodes.map(node => {
        if (node.type === 'hash') {
          return {
            ...node,
            style: { ...node.style, borderColor: '#E0E0E0', backgroundColor: 'white' }
          };
        }
        return node;
      }));
      
      await sleep(500);
      
      // Reset all highlights
      resetHighlights();
    } catch (error) {
      console.error("Error checking item:", error);
      showMessage("An error occurred while checking the item");
    } finally {
      setIsAnimating(false);
    }
  }, [bloomFilter, numHashFunctions, hashFunctions, resetHighlights, showMessage, itemsAdded, isAnimating]);
  
  // Clear the bloom filter
  const clearFilter = useCallback(() => {
    if (isAnimating) return;
    
    // Reset the bloom filter
    setBloomFilter(new Array(filterSize).fill(false));
    
    // Reset bit nodes
    setNodes(nodes => nodes.map(node => {
      if (node.type === 'bit') {
        return {
          ...node,
          data: {
            ...node.data,
            isSet: false,
            isHighlighted: false
          }
        };
      }
      return node;
    }));
    
    setItemsAdded([]);
    setFalsePositiveProbability(0);
    showMessage("Bloom filter cleared");
  }, [filterSize, isAnimating, showMessage]);
  
  // Resize the bloom filter
  const resizeFilter = useCallback((newSize) => {
    if (isAnimating) return;
    
    setFilterSize(newSize);
    setBloomFilter(new Array(newSize).fill(false));
    setItemsAdded([]);
    setFalsePositiveProbability(0);
    showMessage(`Bloom filter resized to ${newSize} bits`);
  }, [isAnimating, showMessage]);
  
  // Change the number of hash functions
  const changeHashFunctions = useCallback((newCount) => {
    if (isAnimating || newCount > 5) return;
    
    setNumHashFunctions(newCount);
    setBloomFilter(new Array(filterSize).fill(false));
    setItemsAdded([]);
    setFalsePositiveProbability(0);
    showMessage(`Number of hash functions changed to ${newCount}`);
  }, [isAnimating, filterSize, showMessage]);
  
  // Initialize or update the visualization
  const updateVisualization = useCallback(() => {
    // Create bit nodes
    const bitNodes = Array.from({ length: filterSize }, (_, index) => ({
      id: `bit-${index}`,
      type: 'bit',
      position: { 
        x: 50 + (index % (Math.ceil(Math.sqrt(filterSize)))) * 80, 
        y: 250 + Math.floor(index / Math.ceil(Math.sqrt(filterSize))) * 80 
      },
      data: {
        index,
        isSet: bloomFilter[index],
        isHighlighted: false
      }
    }));
    
    // Create hash function nodes
    const hashNodes = Array.from({ length: numHashFunctions }, (_, index) => ({
      id: `hash-${index}`,
      type: 'hash',
      position: { x: 80 + index * 200, y: 80 },
      data: {
        index,
        formula: `(sum(char_code * ${31 + index * 6}) % ${filterSize})`
      },
      style: { borderColor: '#E0E0E0', backgroundColor: 'white' }
    }));
    
    // Combine all nodes
    setNodes([...bitNodes, ...hashNodes]);
    
    // We don't need edges for this visualization
    setEdges([]);
  }, [filterSize, numHashFunctions, bloomFilter]);
  
  // Update visualization when state changes
  useEffect(() => {
    updateVisualization();
  }, [updateVisualization]);
  
  // Handle form submissions
  const handleAddSubmit = useCallback((e) => {
    e.preventDefault();
    addItem(inputValue);
  }, [inputValue, addItem]);
  
  const handleCheckSubmit = useCallback((e) => {
    e.preventDefault();
    checkItem(searchValue);
  }, [searchValue, checkItem]);
  
  return (
    <div className={styles.visualizer}>
      {/* Message display */}
      {message && <div className={styles.message}>{message}</div>}
      
      {/* Controls */}
      <div className={styles.controls}>
        <button onClick={onBack} className={styles.btn}>
          Back
        </button>
        
        <form onSubmit={handleAddSubmit} className={styles.inputForm}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Enter value to add"
            className={styles.input}
            disabled={isAnimating}
          />
          <button 
            type="submit" 
            className={styles.btn}
            disabled={isAnimating}
          >
            Add Item
          </button>
        </form>
        
        <form onSubmit={handleCheckSubmit} className={styles.inputForm}>
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Enter value to check"
            className={styles.input}
            disabled={isAnimating}
          />
          <button 
            type="submit" 
            className={styles.btn}
            disabled={isAnimating}
          >
            Check Item
          </button>
        </form>
        
        <button 
          onClick={clearFilter} 
          className={styles.btn}
          disabled={isAnimating}
        >
          Clear Filter
        </button>
      </div>
      
      {/* Filter settings */}
      <div className={styles.settings}>
        <div className={styles.settingGroup}>
          <label>Filter Size:</label>
          <div className={styles.buttonGroup}>
            <button 
              onClick={() => resizeFilter(8)} 
              className={`${styles.btn} ${filterSize === 8 ? styles.active : ''}`}
              disabled={isAnimating}
            >
              8
            </button>
            <button 
              onClick={() => resizeFilter(16)} 
              className={`${styles.btn} ${filterSize === 16 ? styles.active : ''}`}
              disabled={isAnimating}
            >
              16
            </button>
            <button 
              onClick={() => resizeFilter(32)} 
              className={`${styles.btn} ${filterSize === 32 ? styles.active : ''}`}
              disabled={isAnimating}
            >
              32
            </button>
          </div>
        </div>
        
        <div className={styles.settingGroup}>
          <label>Hash Functions:</label>
          <div className={styles.buttonGroup}>
            <button 
              onClick={() => changeHashFunctions(2)} 
              className={`${styles.btn} ${numHashFunctions === 2 ? styles.active : ''}`}
              disabled={isAnimating}
            >
              2
            </button>
            <button 
              onClick={() => changeHashFunctions(3)} 
              className={`${styles.btn} ${numHashFunctions === 3 ? styles.active : ''}`}
              disabled={isAnimating}
            >
              3
            </button>
            <button 
              onClick={() => changeHashFunctions(4)} 
              className={`${styles.btn} ${numHashFunctions === 4 ? styles.active : ''}`}
              disabled={isAnimating}
            >
              4
            </button>
          </div>
        </div>
      </div>
      
      {/* Bloom Filter Information */}
      <div className={styles.infoPanel}>
        <h3>Bloom Filter Visualizer</h3>
        <p>
          A Bloom filter is a space-efficient probabilistic data structure that tells you, 
          with some probability, whether an element is in a set.
        </p>
        <div className={styles.stats}>
          <div>
            <strong>Items Added:</strong> {itemsAdded.length}
          </div>
          <div>
            <strong>Bits Set:</strong> {bloomFilter.filter(Boolean).length} / {filterSize}
          </div>
          <div>
            <strong>Fill Ratio:</strong> {Math.round((bloomFilter.filter(Boolean).length / filterSize) * 100)}%
          </div>
          <div>
            <strong>False Positive Rate:</strong> {(falsePositiveProbability * 100).toFixed(2)}%
          </div>
        </div>
        {itemsAdded.length > 0 && (
          <div className={styles.itemsList}>
            <strong>Items in Filter:</strong>
            <div className={styles.items}>
              {itemsAdded.map((item, index) => (
                <span key={index} className={styles.item}>{item}</span>
              ))}
            </div>
          </div>
        )}
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
const BloomFilterVisualizer = (props) => {
  return (
    <ReactFlowProvider>
      <BloomFilterVisualizerContent {...props} />
    </ReactFlowProvider>
  );
};

export default BloomFilterVisualizer; 