import React, { useState, useRef, useEffect, useCallback } from 'react';
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

// Custom Heap Node component
const HeapNode = ({ data }) => {
  return (
    <div
      className={`${styles.node} ${data.state ? styles[data.state] : ''} ${
        data.isAnimating ? styles.comparing : ''
      }`}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      {data.label}
      {data.isRemovable && (
        <button
          className={styles.deleteBtn}
          onClick={data.onDelete}
          title="Delete node"
        >
          ×
        </button>
      )}
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
};

const HeapVisualizer = ({ onBack }) => {
  // Use useRef to keep nodeTypes consistent across renders
  const nodeTypes = useRef({
    heapNode: HeapNode
  }).current;
  
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [heapType, setHeapType] = useState('max'); // 'max' or 'min'
  const [inputValue, setInputValue] = useState(''); // State for input value
  const [isAnimating, setIsAnimating] = useState(false);
  const [animatingNodes, setAnimatingNodes] = useState(new Set());
  
  // Array representation
  const [arrayInputValue, setArrayInputValue] = useState('');
  const [activeIndex, setActiveIndex] = useState(null);
  const [comparingIndices, setComparingIndices] = useState([]);
  const [swappingIndices, setSwappingIndices] = useState([]);

  // Convert heap node data to ReactFlow format
  const calculateNodePosition = (index) => {
    const level = Math.floor(Math.log2(index + 1));
    const position = index + 1 - Math.pow(2, level);
    const totalNodesInLevel = Math.pow(2, level);
    const levelWidth = 800;
    const x = (position + 0.5) * (levelWidth / totalNodesInLevel) - 25;
    const y = level * 120;
    return { x, y };
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

  // Create edges between nodes based on parent-child relationships
  const updateEdges = useCallback((heapArray) => {
    const newEdges = [];
    
    heapArray.forEach((_, index) => {
      const leftChildIndex = 2 * index + 1;
      const rightChildIndex = 2 * index + 2;
      
      if (leftChildIndex < heapArray.length) {
        newEdges.push({
          id: `edge-${index}-${leftChildIndex}`,
          source: `node-${index}`,
          target: `node-${leftChildIndex}`,
          type: 'smoothstep',
          animated: false,
        });
      }
      
      if (rightChildIndex < heapArray.length) {
        newEdges.push({
          id: `edge-${index}-${rightChildIndex}`,
          source: `node-${index}`,
          target: `node-${rightChildIndex}`,
          type: 'smoothstep',
          animated: false,
        });
      }
    });
    
    setEdges(newEdges);
  }, []);

  // Compare nodes based on heap type
  const compareNodes = (a, b) => {
    const numA = parseInt(a);
    const numB = parseInt(b);
    if (heapType === 'max') {
      return numA > numB;
    }
    return numA < numB;
  };

  // Insert a new node with animation
  const insertNode = async (value) => {
    try {
      if (isAnimating) return;
      setIsAnimating(true);

      // Create nodes array for the ReactFlow representation
      const existingHeapData = nodes.map(node => ({ label: node.data.label }));
      const newHeapData = [...existingHeapData, { label: parseInt(value) }];
      
      // Create the new node
      const newNodeId = `node-${existingHeapData.length}`;
      const newPosition = calculateNodePosition(existingHeapData.length);
      
      // Add the new node to ReactFlow nodes
      const newNode = {
        id: newNodeId,
        type: 'heapNode',
        position: newPosition,
        data: { 
          label: parseInt(value),
          state: 'inserting',
          isAnimating: false,
          isRemovable: true,
          onDelete: () => deleteNode(existingHeapData.length)
        }
      };
      
      // Create a completely new array of nodes to avoid reference issues
      const updatedNodes = [...nodes, newNode];
      setNodes(updatedNodes);
      
      // Wait for the node to be added to the DOM
      await sleep(300);
      
      // Update edges after the node is added
      updateEdges(newHeapData);
      
      // Wait for the edges to be rendered
      await sleep(500);

      // Now start the heapify process with the updated nodes
      let currentIndex = newHeapData.length - 1;
      let currentNodes = [...updatedNodes];
      
      while (currentIndex > 0) {
        const parentIndex = Math.floor((currentIndex - 1) / 2);
        
        if (compareNodes(newHeapData[currentIndex].label, newHeapData[parentIndex].label)) {
          setAnimatingNodes(new Set([currentIndex, parentIndex]));
          
          // Update node states for animation - create a fresh copy
          const animatingNodes = currentNodes.map((node, idx) => {
            if (idx === currentIndex || idx === parentIndex) {
              return {
                ...node,
                data: {
                  ...node.data,
                  state: 'comparing',
                  isAnimating: true
                }
              };
            }
            return {...node}; // Return a new object for each node
          });
          
          setNodes(animatingNodes);
          currentNodes = animatingNodes;
          
          await sleep(500);

          // Swap values
          const temp = newHeapData[currentIndex].label;
          newHeapData[currentIndex].label = newHeapData[parentIndex].label;
          newHeapData[parentIndex].label = temp;
          
          // Update nodes after swap - create a fresh copy again
          const swappedNodes = currentNodes.map((node, idx) => {
            if (idx === currentIndex) {
              return {
                ...node,
                data: {
                  ...node.data,
                  label: newHeapData[currentIndex].label,
                  state: 'swapping'
                }
              };
            }
            if (idx === parentIndex) {
              return {
                ...node,
                data: {
                  ...node.data,
                  label: newHeapData[parentIndex].label,
                  state: 'swapping'
                }
              };
            }
            return {...node}; // Return a new object for each node
          });
          
          setNodes(swappedNodes);
          currentNodes = swappedNodes;
          
          await sleep(500);

          // Reset animation states - create a fresh copy again
          const resetNodes = currentNodes.map((node, idx) => {
            if (idx === currentIndex || idx === parentIndex) {
              return {
                ...node,
                data: {
                  ...node.data,
                  state: '',
                  isAnimating: false
                }
              };
            }
            return {...node}; // Return a new object for each node
          });
          
          setNodes(resetNodes);
          currentNodes = resetNodes;
          
          currentIndex = parentIndex;
        } else {
          break;
        }
      }

      // Final cleanup - create a fresh copy one last time
      const finalNodes = currentNodes.map((node) => {
        return {
          ...node,
          data: {
            ...node.data,
            state: '',
            isAnimating: false,
            isRemovable: true,
            onDelete: () => deleteNode(parseInt(node.id.split('-')[1]))
          }
        };
      });
      
      setNodes(finalNodes);
      updateEdges(newHeapData);
      setAnimatingNodes(new Set());
      setIsAnimating(false);
    } catch (error) {
      console.error('Insert error:', error);
      setIsAnimating(false);
      setAnimatingNodes(new Set());
    }
  };

  // Heapify with animation
  const heapifyWithAnimation = async (heap, index) => {
    try {
      const length = heap.length;
      let largest = index;
      const left = 2 * index + 1;
      const right = 2 * index + 2;

      // Compare with left child
      if (left < length) {
        setAnimatingNodes(new Set([largest, left]));
        
        // Update node states for animation
        const updatedNodes = nodes.map((node, idx) => {
          if (idx === largest || idx === left) {
            return {
              ...node,
              data: {
                ...node.data,
                state: 'comparing',
                isAnimating: true
              }
            };
          }
          return node;
        });
        
        setNodes(updatedNodes);
        await sleep(500);

        if (compareNodes(heap[left].label, heap[largest].label)) {
          largest = left;
        }

        // Reset animation
        const resetNodes = updatedNodes.map((node, idx) => {
          if (idx === largest || idx === left) {
            return {
              ...node,
              data: {
                ...node.data,
                state: '',
                isAnimating: false
              }
            };
          }
          return node;
        });
        
        setNodes(resetNodes);
      }

      // Compare with right child
      if (right < length) {
        setAnimatingNodes(new Set([largest, right]));
        
        // Update node states for animation
        const updatedNodes = nodes.map((node, idx) => {
          if (idx === largest || idx === right) {
            return {
              ...node,
              data: {
                ...node.data,
                state: 'comparing',
                isAnimating: true
              }
            };
          }
          return node;
        });
        
        setNodes(updatedNodes);
        await sleep(500);

        if (compareNodes(heap[right].label, heap[largest].label)) {
          largest = right;
        }

        // Reset animation
        const resetNodes = updatedNodes.map((node, idx) => {
          if (idx === largest || idx === right) {
            return {
              ...node,
              data: {
                ...node.data,
                state: '',
                isAnimating: false
              }
            };
          }
          return node;
        });
        
        setNodes(resetNodes);
      }

      if (largest !== index) {
        // Swap animation
        setAnimatingNodes(new Set([index, largest]));
        
        // Update node states for swap animation
        const swapNodes = nodes.map((node, idx) => {
          if (idx === index || idx === largest) {
            return {
              ...node,
              data: {
                ...node.data,
                state: 'swapping',
                isAnimating: true
              }
            };
          }
          return node;
        });
        
        setNodes(swapNodes);
        await sleep(500);

        // Perform swap
        const temp = heap[index].label;
        heap[index].label = heap[largest].label;
        heap[largest].label = temp;

        // Update nodes with new values
        const updatedNodes = swapNodes.map((node, idx) => {
          if (idx === index) {
            return {
              ...node,
              data: {
                ...node.data,
                label: heap[index].label,
                state: '',
                isAnimating: false
              }
            };
          }
          if (idx === largest) {
            return {
              ...node,
              data: {
                ...node.data,
                label: heap[largest].label,
                state: '',
                isAnimating: false
              }
            };
          }
          return node;
        });
        
        setNodes(updatedNodes);

        // Recursively heapify the affected subtree
        await heapifyWithAnimation(heap, largest);
      }
    } catch (error) {
      console.error('Heapify error:', error);
      setIsAnimating(false);
      setAnimatingNodes(new Set());
    }
  };

  // Delete a node
  const deleteNode = async (nodeIndex) => {
    if (isAnimating) return;
    setIsAnimating(true);

    try {
      // Get heap data from nodes
      const heapData = nodes.map(node => ({ label: node.data.label }));
      
      // Highlight the node being deleted
      setAnimatingNodes(new Set([nodeIndex]));
      
      const updatedNodes = [...nodes];
      updatedNodes[nodeIndex] = {
        ...updatedNodes[nodeIndex],
        data: {
          ...updatedNodes[nodeIndex].data,
          state: 'deleting',
          isAnimating: true
        }
      };
      
      setNodes(updatedNodes);
      await sleep(500);

      // If it's a leaf node, simply remove it
      if (nodeIndex === heapData.length - 1) {
        heapData.pop();
        setNodes(nodes.filter((_, idx) => idx !== nodeIndex));
      } else {
        // Replace with the last node
        heapData[nodeIndex].label = heapData[heapData.length - 1].label;
        heapData.pop();
        
        // Update node with new value
        const replacedNodes = [...nodes.slice(0, -1)];
        replacedNodes[nodeIndex] = {
          ...replacedNodes[nodeIndex],
          data: {
            ...replacedNodes[nodeIndex].data,
            label: heapData[nodeIndex].label,
            state: 'inserting',
            isAnimating: true
          }
        };
        
        setNodes(replacedNodes);
        await sleep(500);
        
        // Heapify down from the replaced node
        await heapifyWithAnimation(heapData, nodeIndex);
      }

      // Convert heap data back to ReactFlow nodes
      const finalNodes = heapData.map((item, idx) => {
        const position = calculateNodePosition(idx);
        return {
          id: `node-${idx}`,
          type: 'heapNode',
          position,
          data: {
            label: item.label,
            state: '',
            isAnimating: false,
            isRemovable: true,
            onDelete: () => deleteNode(idx)
          }
        };
      });
      
      setNodes(finalNodes);
      updateEdges(heapData);
      setAnimatingNodes(new Set());
      setIsAnimating(false);
    } catch (error) {
      console.error('Delete node error:', error);
      setIsAnimating(false);
      setAnimatingNodes(new Set());
    }
  };

  // Rebuild heap when type changes
  const rebuildHeap = async () => {
    if (nodes.length <= 1) return;
    
    try {
      setIsAnimating(true);
      // Extract heap data from nodes
      const heapData = nodes.map(node => ({ label: node.data.label }));
      
      // Start from the last non-leaf node
      for (let i = Math.floor(heapData.length / 2) - 1; i >= 0; i--) {
        await heapifyWithAnimation(heapData, i);
      }

      // Update nodes with final data
      const finalNodes = heapData.map((item, idx) => {
        const position = calculateNodePosition(idx);
        return {
          id: `node-${idx}`,
          type: 'heapNode',
          position,
          data: {
            label: item.label,
            state: '',
            isAnimating: false,
            isRemovable: true,
            onDelete: () => deleteNode(idx)
          }
        };
      });
      
      setNodes(finalNodes);
      updateEdges(heapData);
      setAnimatingNodes(new Set());
      setIsAnimating(false);
    } catch (error) {
      console.error('Rebuild heap error:', error);
      setIsAnimating(false);
      setAnimatingNodes(new Set());
    }
  };

  // Switch heap type
  const handleHeapTypeSwitch = async () => {
    if (isAnimating) return;
    const newType = heapType === 'max' ? 'min' : 'max';
    setHeapType(newType);
    await rebuildHeap();
  };

  // Handle form submission for inserting new nodes
  const handleInputSubmit = (e) => {
    e.preventDefault();
    const value = parseInt(inputValue);
    if (isNaN(value)) {
      alert('Please enter a valid number');
      return;
    }
    
    insertNode(value);
    setInputValue(''); // Clear input after insertion
  };

  // Update edges when nodes change
  useEffect(() => {
    if (nodes.length > 0) {
      const heapData = nodes.map(node => ({ label: node.data.label }));
      updateEdges(heapData);
    }
  }, [nodes, updateEdges]);

  // Rebuild heap when type changes
  useEffect(() => {
    rebuildHeap();
  }, [heapType]);

  return (
    <div className={styles.visualizer}>
      <div className={styles.controls}>
        <button className={styles.btn} onClick={onBack}>
          Back
        </button>
        <button 
          className={styles.btn}
          onClick={handleHeapTypeSwitch}
          disabled={isAnimating}
        >
          Switch to {heapType === 'max' ? 'Min' : 'Max'} Heap
        </button>
        <form onSubmit={handleInputSubmit}>
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
        </form>
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

      {/* Array Visualization */}
      <div className={styles.arraySection}>
        <div className={styles.arrayLabel}>Heap Array Representation</div>
        <div className={styles.arrayVisualization}>
          <div className={styles.arrayContainer}>
            {nodes.length > 0 ? (
              nodes.map((node, index) => (
                <div 
                  key={`array-${node.id}`}
                  className={`${styles.arrayNode} ${
                    node.data.state ? styles[node.data.state] : ''
                  } ${node.data.isAnimating ? styles.comparing : ''}`}
                >
                  {node.data.label}
                  <div className={styles.arrayIndex}>{index}</div>
                </div>
              ))
            ) : (
              <div className={styles.emptyMessage}>
                Heap is empty. Add some numbers!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function WrappedHeapVisualizer(props) {
  return (
    <ReactFlowProvider>
      <HeapVisualizer {...props} />
    </ReactFlowProvider>
  );
} 