import React, { useState, useRef, useCallback, useEffect } from 'react';
import './HashTableNode.css';
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
      <div className="bucketIndex">{data.index}</div>
      <div className="bucketItems">
        {data.items.length > 0 ? (
          data.items.map((item, idx) => (
            <div 
              key={idx} 
              className={`${styles.bucketItem} ${item.state ? styles[item.state] : ''}`}
              onClick={() => data.onItemClick && data.onItemClick(item.key)}
            >
              <span className="itemKey">{item.key}</span>
              <span className="itemValue">{item.value}</span>
              {data.collisionStrategy === 'chaining' && (
                <button 
                  className="deleteBtn" 
                  onClick={(e) => {
                    e.stopPropagation();
                    data.onDeleteItem(item.key);
                  }}
                  title="Delete item"
                >
                  ×
                </button>
              )}
            </div>
          ))
        ) : (
          <div className="emptyBucket">Empty</div>
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
    <div className="hashFunctionNode">
      <div className="hashFunctionTitle">Hash Function</div>
      <div className="hashFunctionFormula">
        h(key) = key % {data.tableSize}
      </div>
      <div className="collisionStrategy">
        Strategy: <span>{data.collisionStrategy === 'chaining' ? 'Chaining' : 'Linear Probing'}</span>
      </div>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
};

// Main Hash Table Visualizer component
const HashTableNode = ({ onBack }) => {
  const [tableSize, setTableSize] = useState(7); // Prime number for better distribution
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [keyInput, setKeyInput] = useState('');
  const [valueInput, setValueInput] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const [highlightedBucket, setHighlightedBucket] = useState(null);
  const [collisionStrategy, setCollisionStrategy] = useState('chaining'); // 'chaining' or 'openAddressing'
  const [hashTable, setHashTable] = useState(Array(tableSize).fill().map(() => []));
  const [probeSequence, setProbeSequence] = useState([]);
  
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
      data: { 
        tableSize,
        collisionStrategy
      }
    };
    
    const bucketNodes = hashTable.map((bucket, index) => ({
      id: `bucket-${index}`,
      type: 'bucketNode',
      position: { x: (index * 150) + 50, y: 200 },
      data: {
        index,
        items: bucket,
        isHighlighted: highlightedBucket === index || probeSequence.includes(index),
        onDeleteItem: (key) => handleDelete(key),
        onItemClick: (key) => highlightItem(key),
        collisionStrategy
      }
    }));
    
    const newEdges = hashTable.map((_, index) => ({
      id: `edge-hash-to-${index}`,
      source: 'hash-function',
      target: `bucket-${index}`,
      type: 'smoothstep',
      animated: index === highlightedBucket || probeSequence.includes(index),
      style: { 
        stroke: index === highlightedBucket ? '#FF5722' : 
                probeSequence.includes(index) ? '#9C27B0' : '#B8B8B8', 
        strokeWidth: (index === highlightedBucket || probeSequence.includes(index)) ? 2 : 1 
      }
    }));
    
    setNodes([hashFunctionNode, ...bucketNodes]);
    setEdges(newEdges);
  }, [hashTable, tableSize, highlightedBucket, probeSequence, collisionStrategy]);
  
  // Find appropriate bucket for open addressing
  const findBucketOpenAddressing = async (key, value, isSearchOperation = false) => {
    const initialHash = hashFunction(key);
    let currentIndex = initialHash;
    const probeIndices = [currentIndex];
    setProbeSequence(probeIndices);
    setHighlightedBucket(currentIndex);
    
    // Check if key already exists
    if (hashTable[currentIndex].length > 0 && hashTable[currentIndex][0].key === key) {
      return { bucketIndex: currentIndex, isExisting: true, probeSequence: probeIndices };
    }
    
    // Linear probing
    let count = 0;
    while (
      hashTable[currentIndex].length > 0 && 
      hashTable[currentIndex][0].key !== key && 
      count < tableSize
    ) {
      // For search operation, if we find an empty slot before finding the key, it doesn't exist
      if (isSearchOperation && hashTable[currentIndex].length === 0) {
        return { bucketIndex: -1, isExisting: false, probeSequence: probeIndices };
      }
      
      currentIndex = (currentIndex + 1) % tableSize;
      count++;
      
      // Add to probe sequence for visualization
      probeIndices.push(currentIndex);
      setProbeSequence([...probeIndices]);
      setHighlightedBucket(currentIndex);
      
      // Delay for animation
      if (!isSearchOperation) await sleep(500);
      
      // If we found the key during probing
      if (hashTable[currentIndex].length > 0 && hashTable[currentIndex][0].key === key) {
        return { bucketIndex: currentIndex, isExisting: true, probeSequence: probeIndices };
      }
    }
    
    // If we didn't find the key but need an empty slot (for insert)
    if (!isSearchOperation && count < tableSize) {
      return { bucketIndex: currentIndex, isExisting: false, probeSequence: probeIndices };
    }
    
    // If the table is full or key not found
    return { bucketIndex: isSearchOperation ? -1 : -1, isExisting: false, probeSequence: probeIndices };
  };
  
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
      
      // Create a copy of the hash table
      const newHashTable = [...hashTable];
      
      if (collisionStrategy === 'chaining') {
        // Chaining strategy
        const hash = hashFunction(key);
        setHighlightedBucket(hash);
        
        // Check if key already exists in the bucket
        const bucket = [...newHashTable[hash]];
        const existingIndex = bucket.findIndex(item => item.key === key);
        
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
      } else {
        // Open Addressing strategy (Linear Probing)
        const { bucketIndex, isExisting, probeSequence } = await findBucketOpenAddressing(key, value);
        
        if (bucketIndex === -1) {
          alert('Hash table is full! Please increase the size or delete some items.');
          setProbeSequence([]);
          setHighlightedBucket(null);
          setIsAnimating(false);
          return;
        }
        
        if (isExisting) {
          // Update existing key
          newHashTable[bucketIndex] = [{ 
            key, 
            value, 
            state: 'updating'
          }];
        } else {
          // Insert new key-value pair
          newHashTable[bucketIndex] = [{ 
            key, 
            value, 
            state: 'inserting'
          }];
        }
        
        setHashTable(newHashTable);
        updateVisualization();
        await sleep(1000);
        
        // Reset state
        newHashTable[bucketIndex] = [{ 
          key, 
          value, 
          state: ''
        }];
      }
      
      setHashTable(newHashTable);
      setKeyInput('');
      setValueInput('');
      setHighlightedBucket(null);
      setProbeSequence([]);
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
      // Create a copy of the hash table
      const newHashTable = [...hashTable];
      
      if (collisionStrategy === 'chaining') {
        // Chaining strategy
        const hash = hashFunction(key);
        setHighlightedBucket(hash);
        
        const bucket = [...newHashTable[hash]];
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
      } else {
        // Open Addressing strategy (Linear Probing)
        // For open addressing, deletion is more complex due to the need for tombstones
        // For simplicity, we'll just mark the item as deleted with a special state
        const { bucketIndex, isExisting } = await findBucketOpenAddressing(key, null, true);
        
        if (bucketIndex !== -1 && isExisting) {
          // Mark as deleted but keep a tombstone
          newHashTable[bucketIndex] = [{ 
            key: "DELETED", 
            value: "", 
            state: 'deleting',
            isTombstone: true
          }];
          setHashTable(newHashTable);
          updateVisualization();
          await sleep(1000);
          
          // After animation, clear the bucket
          newHashTable[bucketIndex] = [];
          setHashTable(newHashTable);
          updateVisualization();
        } else {
          alert(`Key "${key}" not found in the hash table`);
        }
      }
      
      setHighlightedBucket(null);
      setProbeSequence([]);
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
      
      // Create a copy of the hash table
      const newHashTable = [...hashTable];
      
      if (collisionStrategy === 'chaining') {
        // Chaining strategy
        const hash = hashFunction(key);
        setHighlightedBucket(hash);
        
        const bucket = [...newHashTable[hash]];
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
      } else {
        // Open Addressing strategy (Linear Probing)
        const { bucketIndex, isExisting } = await findBucketOpenAddressing(key, null, true);
        
        if (bucketIndex !== -1 && isExisting) {
          // Highlight the found item
          newHashTable[bucketIndex] = [{ 
            ...newHashTable[bucketIndex][0],
            state: 'found'
          }];
          setHashTable(newHashTable);
          updateVisualization();
          await sleep(2000);
          
          // Reset state
          newHashTable[bucketIndex] = [{ 
            ...newHashTable[bucketIndex][0],
            state: ''
          }];
          setHashTable(newHashTable);
        } else {
          // Item not found
          alert(`Key "${key}" not found in the hash table`);
        }
      }
      
      setSearchInput('');
      setHighlightedBucket(null);
      setProbeSequence([]);
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
      if (collisionStrategy === 'chaining') {
        // Chaining approach
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
      } else {
        // For open addressing - highlight the bucket directly
        const { bucketIndex } = await findBucketOpenAddressing(key, null, true);
        
        if (bucketIndex !== -1) {
          // Create a copy of the hash table
          const newHashTable = [...hashTable];
          
          // Highlight the item
          newHashTable[bucketIndex] = [{
            ...newHashTable[bucketIndex][0],
            state: 'highlighting'
          }];
          setHashTable(newHashTable);
          updateVisualization();
          await sleep(1000);
          
          // Reset state
          newHashTable[bucketIndex] = [{
            ...newHashTable[bucketIndex][0],
            state: ''
          }];
          setHashTable(newHashTable);
        }
      }
      
      setHighlightedBucket(null);
      setProbeSequence([]);
    } catch (error) {
      console.error('Highlight error:', error);
    } finally {
      setIsAnimating(false);
    }
  };
  
  // Toggle collision resolution strategy
  const handleToggleStrategy = async () => {
    if (isAnimating) return;
    setIsAnimating(true);
    
    try {
      const newStrategy = collisionStrategy === 'chaining' ? 'openAddressing' : 'chaining';
      
      // Create a new empty hash table
      const newHashTable = Array(tableSize).fill().map(() => []);
      setHashTable(newHashTable);
      
      // Set the new strategy
      setCollisionStrategy(newStrategy);
      
      // Update visualization
      updateVisualization();
      
      setHighlightedBucket(null);
      setProbeSequence([]);
    } catch (error) {
      console.error('Toggle strategy error:', error);
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
      
      // For simplicity, we'll just clear the table when resizing
      setTableSize(newSize);
      setHashTable(newHashTable);
      updateVisualization();

      setHighlightedBucket(null);
      setProbeSequence([]);
    } catch (error) {
      console.error('Resize error:', error);
    } finally {
      setIsAnimating(false);
    }
  };
  
  // Update visualization when hash table or highlighting changes
  useEffect(() => {
    updateVisualization();
  }, [hashTable, highlightedBucket, probeSequence, collisionStrategy, updateVisualization]);
  
  // Calculate load factor
  const calculateLoadFactor = () => {
    if (collisionStrategy === 'chaining') {
      return (hashTable.reduce((sum, bucket) => sum + bucket.length, 0) / tableSize).toFixed(2);
    } else {
      // For open addressing, count non-empty buckets
      return (hashTable.filter(bucket => bucket.length > 0).length / tableSize).toFixed(2);
    }
  };
  
  // Calculate collision statistics
  const calculateCollisionStats = () => {
    if (collisionStrategy === 'chaining') {
      return {
        bucketsWithCollisions: hashTable.filter(bucket => bucket.length > 1).length,
        maxChainLength: Math.max(...hashTable.map(bucket => bucket.length))
      };
    } else {
      // For open addressing, we'd need to track actual insertions with probing
      // This is a simplified estimate
      const itemCount = hashTable.filter(bucket => bucket.length > 0).length;
      return {
        probeOperations: itemCount > 0 ? probeSequence.length : 0,
        loadFactor: calculateLoadFactor()
      };
    }
  };
  
  const collisionStats = calculateCollisionStats();
  
  return (
    <div className="visualizer">
      <div className="controls">
        <button className="btn" onClick={onBack}>
          Back
        </button>
        
        <button
          className="btnStrategy"
          onClick={handleToggleStrategy}
          disabled={isAnimating}
        >
          Switch to {collisionStrategy === 'chaining' ? 'Open Addressing' : 'Chaining'}
        </button>
        
        <form onSubmit={handleInsert} className="form">
          <input
            type="text"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder="Key"
            className="input"
            disabled={isAnimating}
          />
          <input
            type="text"
            value={valueInput}
            onChange={(e) => setValueInput(e.target.value)}
            placeholder="Value"
            className="input"
            disabled={isAnimating}
          />
          <button
            type="submit"
            className="btn"
            disabled={isAnimating}
          >
            Insert
          </button>
        </form>
        
        <form onSubmit={handleSearch} className="form">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search Key"
            className="input"
            disabled={isAnimating}
          />
          <button
            type="submit"
            className="btn"
            disabled={isAnimating}
          >
            Search
          </button>
        </form>
        
        <div className="resizeControls">
          <button
            className="btn"
            onClick={() => handleResizeTable(5)}
            disabled={isAnimating || tableSize === 5}
          >
            Size: 5
          </button>
          <button
            className="btn"
            onClick={() => handleResizeTable(7)}
            disabled={isAnimating || tableSize === 7}
          >
            Size: 7
          </button>
          <button
            className="btn"
            onClick={() => handleResizeTable(11)}
            disabled={isAnimating || tableSize === 11}
          >
            Size: 11
          </button>
        </div>
      </div>
      
      <div className="flowContainer">
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
      
      <div className="infoSection">
        <div className="infoBox">
          <h3>Hash Table Information</h3>
          <p>Size: {tableSize}</p>
          <p>Load Factor: {calculateLoadFactor()}</p>
          <p>Collision Resolution: {collisionStrategy === 'chaining' ? 'Chaining' : 'Linear Probing'}</p>
        </div>
        <div className="collisionBox">
          <h3>Collision Statistics</h3>
          {collisionStrategy === 'chaining' ? (
            <>
              <p>Buckets with Collisions: {collisionStats.bucketsWithCollisions}</p>
              <p>Max Chain Length: {collisionStats.maxChainLength}</p>
            </>
          ) : (
            <>
              <p>Probe Operations: {probeSequence.length}</p>
              <p>Current Probe Sequence: [{probeSequence.join(', ')}]</p>
            </>
          )}
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