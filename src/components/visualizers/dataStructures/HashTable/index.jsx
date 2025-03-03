import React, { useState, useRef, useCallback, useEffect } from 'react';
import styles from './styles.module.css';
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

// Custom Bucket Node component
const BucketNode = ({ data }) => {
  return (
    <div 
      className={`${styles.bucketNode} ${data.isHighlighted ? styles.highlighted : ''}`}
    >
      <div className={styles.bucketIndex}>{data.index}</div>
      <div className={styles.bucketItems}>
        {data.items.length > 0 ? (
          data.items.map((item, idx) => (
            <div 
              key={idx} 
              className={`${styles.bucketItem} ${item.state ? styles[item.state] : ''}`}
              onClick={() => data.onItemClick && data.onItemClick(item.key)}
            >
              <span className={styles.itemKey}>{item.key}</span>
              <span className={styles.itemValue}>{item.value}</span>
              <button 
                className={styles.deleteBtn} 
                onClick={(e) => {
                  e.stopPropagation();
                  data.onDeleteItem(item.key);
                }}
                title="Delete item"
              >
                ×
              </button>
            </div>
          ))
        ) : (
          <div className={styles.emptyBucket}>Empty</div>
        )}
      </div>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
};

// Custom Hash Function Node
const HashFunctionNode = ({ data }) => {
  return (
    <div className={styles.hashFunctionNode}>
      <div className={styles.hashFunctionTitle}>Hash Function</div>
      <div className={styles.hashFunctionFormula}>
        h(key) = key % {data.tableSize}
      </div>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
};

// Main Hash Table Visualizer component
const HashTableVisualizer = ({ onBack }) => {
  const [tableSize, setTableSize] = useState(7); // Prime number for better distribution
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [keyInput, setKeyInput] = useState('');
  const [valueInput, setValueInput] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const [highlightedBucket, setHighlightedBucket] = useState(null);
  const [hashTable, setHashTable] = useState(Array(tableSize).fill().map(() => []));
  
  // Define node types for ReactFlow
  const nodeTypes = useRef({
    bucketNode: BucketNode,
    hashFunctionNode: HashFunctionNode
  }).current;

  // Hash function
  const hashFunction = (key) => {
    if (typeof key === 'string') {
      // Simple string hash
      let hash = 0;
      for (let i = 0; i < key.length; i++) {
        hash = (hash * 31 + key.charCodeAt(i)) % tableSize;
      }
      return hash;
    } else if (typeof key === 'number') {
      return key % tableSize;
    }
    return 0;
  };

  // Sleep function for animations
  const sleep = (ms) => new Promise(resolve => {
    try {
      setTimeout(resolve, ms);
    } catch (error) {
      console.error('Sleep error:', error);
    }
  });
  
  // Handle ReactFlow node changes
  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  // Handle ReactFlow edge changes
  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  // Calculate node positions for visualization
  const updateVisualization = useCallback(() => {
    const hashFunctionNode = {
      id: 'hash-function',
      type: 'hashFunctionNode',
      position: { x: 400, y: 50 },
      data: { tableSize }
    };
    
    const bucketNodes = hashTable.map((bucket, index) => ({
      id: `bucket-${index}`,
      type: 'bucketNode',
      position: { x: (index * 150) + 50, y: 200 },
      data: {
        index,
        items: bucket,
        isHighlighted: index === highlightedBucket,
        onDeleteItem: (key) => handleDelete(key),
        onItemClick: (key) => highlightItem(key)
      }
    }));
    
    const newEdges = hashTable.map((_, index) => ({
      id: `edge-hash-to-${index}`,
      source: 'hash-function',
      target: `bucket-${index}`,
      type: 'smoothstep',
      animated: index === highlightedBucket,
      style: { stroke: index === highlightedBucket ? '#FF5722' : '#B8B8B8', strokeWidth: index === highlightedBucket ? 2 : 1 }
    }));
    
    setNodes([hashFunctionNode, ...bucketNodes]);
    setEdges(newEdges);
  }, [hashTable, tableSize, highlightedBucket]);
  
  // Insert a key-value pair
  const handleInsert = async (e) => {
    e.preventDefault();
    if (isAnimating) return;
    setIsAnimating(true);
    
    try {
      let key = keyInput.trim();
      const value = valueInput.trim();
      
      if (key === '' || value === '') {
        alert('Please enter both key and value');
        setIsAnimating(false);
        return;
      }
      
      // Try to convert to number if possible
      const numKey = Number(key);
      if (!isNaN(numKey) && key !== '') {
        key = numKey;
      }
      
      const hash = hashFunction(key);
      setHighlightedBucket(hash);
      
      // Check if key already exists in the bucket
      const bucket = [...hashTable[hash]];
      const existingIndex = bucket.findIndex(item => item.key === key);
      
      // Create a copy of the hash table
      const newHashTable = [...hashTable];
      
      if (existingIndex >= 0) {
        // Update existing key
        const newBucket = [...bucket];
        newBucket[existingIndex] = {
          ...newBucket[existingIndex],
          value,
          state: 'updating'
        };
        newHashTable[hash] = newBucket;
        setHashTable(newHashTable);
        updateVisualization();
        await sleep(1000);
        
        // Reset state
        newHashTable[hash][existingIndex].state = '';
      } else {
        // Insert new key-value pair
        const newBucket = [...bucket, { key, value, state: 'inserting' }];
        newHashTable[hash] = newBucket;
        setHashTable(newHashTable);
        updateVisualization();
        await sleep(1000);
        
        // Reset state
        newHashTable[hash][newBucket.length - 1].state = '';
      }
      
      setHashTable(newHashTable);
      setKeyInput('');
      setValueInput('');
      setHighlightedBucket(null);
    } catch (error) {
      console.error('Insert error:', error);
    } finally {
      setIsAnimating(false);
    }
  };
  
  // Delete a key-value pair
  const handleDelete = async (key) => {
    if (isAnimating) return;
    setIsAnimating(true);
    
    try {
      const hash = hashFunction(key);
      setHighlightedBucket(hash);
      
      // Create a copy of the hash table
      const newHashTable = [...hashTable];
      const bucket = [...newHashTable[hash]];
      
      // Find the item to delete
      const itemIndex = bucket.findIndex(item => item.key === key);
      
      if (itemIndex >= 0) {
        // Mark item for deletion
        bucket[itemIndex] = {
          ...bucket[itemIndex],
          state: 'deleting'
        };
        newHashTable[hash] = bucket;
        setHashTable(newHashTable);
        updateVisualization();
        await sleep(1000);
        
        // Remove the item
        bucket.splice(itemIndex, 1);
        newHashTable[hash] = bucket;
        setHashTable(newHashTable);
        updateVisualization();
      }
      
      setHighlightedBucket(null);
    } catch (error) {
      console.error('Delete error:', error);
    } finally {
      setIsAnimating(false);
    }
  };
  
  // Search for a key
  const handleSearch = async (e) => {
    e.preventDefault();
    if (isAnimating) return;
    setIsAnimating(true);
    
    try {
      let key = searchInput.trim();
      
      if (key === '') {
        alert('Please enter a key to search');
        setIsAnimating(false);
        return;
      }
      
      // Try to convert to number if possible
      const numKey = Number(key);
      if (!isNaN(numKey) && key !== '') {
        key = numKey;
      }
      
      const hash = hashFunction(key);
      setHighlightedBucket(hash);
      
      // Create a copy of the hash table
      const newHashTable = [...hashTable];
      const bucket = [...newHashTable[hash]];
      
      // Find the item
      const itemIndex = bucket.findIndex(item => item.key === key);
      
      if (itemIndex >= 0) {
        // Highlight the found item
        bucket[itemIndex] = {
          ...bucket[itemIndex],
          state: 'found'
        };
        newHashTable[hash] = bucket;
        setHashTable(newHashTable);
        updateVisualization();
        await sleep(2000);
        
        // Reset state
        bucket[itemIndex] = {
          ...bucket[itemIndex],
          state: ''
        };
        newHashTable[hash] = bucket;
        setHashTable(newHashTable);
      } else {
        // Item not found
        alert(`Key "${key}" not found in the hash table`);
      }
      
      setSearchInput('');
      setHighlightedBucket(null);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsAnimating(false);
    }
  };
  
  // Highlight a specific item by key
  const highlightItem = async (key) => {
    if (isAnimating) return;
    setIsAnimating(true);
    
    try {
      const hash = hashFunction(key);
      setHighlightedBucket(hash);
      
      // Create a copy of the hash table
      const newHashTable = [...hashTable];
      const bucket = [...newHashTable[hash]];
      
      // Find the item
      const itemIndex = bucket.findIndex(item => item.key === key);
      
      if (itemIndex >= 0) {
        // Highlight the item
        bucket[itemIndex] = {
          ...bucket[itemIndex],
          state: 'highlighting'
        };
        newHashTable[hash] = bucket;
        setHashTable(newHashTable);
        updateVisualization();
        await sleep(1000);
        
        // Reset state
        bucket[itemIndex] = {
          ...bucket[itemIndex],
          state: ''
        };
        newHashTable[hash] = bucket;
        setHashTable(newHashTable);
      }
      
      setHighlightedBucket(null);
    } catch (error) {
      console.error('Highlight error:', error);
    } finally {
      setIsAnimating(false);
    }
  };
  
  // Resize the hash table
  const handleResizeTable = async (newSize) => {
    if (isAnimating) return;
    setIsAnimating(true);
    
    try {
      // Create new hash table with new size
      const newHashTable = Array(newSize).fill().map(() => []);
      
      // Rehash all existing items
      for (let bucket of hashTable) {
        for (let item of bucket) {
          const newHash = item.key % newSize;
          newHashTable[newHash].push({ ...item, state: 'inserting' });
        }
      }
      
      setTableSize(newSize);
      setHashTable(newHashTable);
      updateVisualization();
      await sleep(1000);
      
      // Reset all states
      const finalHashTable = newHashTable.map(bucket => 
        bucket.map(item => ({ ...item, state: '' }))
      );
      setHashTable(finalHashTable);
    } catch (error) {
      console.error('Resize error:', error);
    } finally {
      setIsAnimating(false);
    }
  };
  
  // Update visualization when hash table or highlighting changes
  useEffect(() => {
    updateVisualization();
  }, [hashTable, highlightedBucket, updateVisualization]);
  
  return (
    <div className={styles.visualizer}>
      <div className={styles.controls}>
        <button className={styles.btn} onClick={onBack}>
          Back
        </button>
        
        <form onSubmit={handleInsert} className={styles.form}>
          <input
            type="text"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder="Key"
            className={styles.input}
            disabled={isAnimating}
          />
          <input
            type="text"
            value={valueInput}
            onChange={(e) => setValueInput(e.target.value)}
            placeholder="Value"
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
        
        <form onSubmit={handleSearch} className={styles.form}>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search Key"
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
        
        <div className={styles.resizeControls}>
          <button
            className={styles.btn}
            onClick={() => handleResizeTable(5)}
            disabled={isAnimating || tableSize === 5}
          >
            Size: 5
          </button>
          <button
            className={styles.btn}
            onClick={() => handleResizeTable(7)}
            disabled={isAnimating || tableSize === 7}
          >
            Size: 7
          </button>
          <button
            className={styles.btn}
            onClick={() => handleResizeTable(11)}
            disabled={isAnimating || tableSize === 11}
          >
            Size: 11
          </button>
        </div>
      </div>
      
      <div className={styles.flowContainer}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.1}
          maxZoom={4}
          defaultEdgeOptions={{
            type: 'smoothstep',
            animated: false
          }}
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
      
      <div className={styles.infoSection}>
        <div className={styles.infoBox}>
          <h3>Hash Table Information</h3>
          <p>Size: {tableSize}</p>
          <p>Load Factor: {(hashTable.reduce((sum, bucket) => sum + bucket.length, 0) / tableSize).toFixed(2)}</p>
          <p>Collision Resolution: Chaining</p>
        </div>
        <div className={styles.collisionBox}>
          <h3>Collisions</h3>
          <p>Total Buckets with Collisions: {hashTable.filter(bucket => bucket.length > 1).length}</p>
          <p>Max Chain Length: {Math.max(...hashTable.map(bucket => bucket.length))}</p>
        </div>
      </div>
    </div>
  );
};

export default function WrappedHashTableVisualizer(props) {
  return (
    <ReactFlowProvider>
      <HashTableVisualizer {...props} />
    </ReactFlowProvider>
  );
} 