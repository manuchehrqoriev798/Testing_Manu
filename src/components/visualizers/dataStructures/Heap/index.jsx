import React, { useState, useRef, useEffect } from 'react';
import styles from './styles.module.css';
import { ReactFlowProvider } from 'reactflow';

const HeapVisualizer = ({ onBack }) => {
  const [nodes, setNodes] = useState([]);
  const [heapType, setHeapType] = useState('max'); // 'max' or 'min'
  const [inputValue, setInputValue] = useState(''); // New state for input value
  const treeAreaRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const LEVEL_HEIGHT = 120;
  const [animatingNodes, setAnimatingNodes] = useState(new Set());
  const [isAnimating, setIsAnimating] = useState(false);

  // Add new state variables for array visualization
  const [arrayInputValue, setArrayInputValue] = useState('');
  const [activeIndex, setActiveIndex] = useState(null);
  const [comparingIndices, setComparingIndices] = useState([]);
  const [swappingIndices, setSwappingIndices] = useState([]);

  const heapify = (array, i, heapSize) => {
    const left = 2 * i + 1;
    const right = 2 * i + 2;
    let largest = i;

    if (heapType === 'max') {
      if (left < heapSize && parseInt(array[left].label) > parseInt(array[largest].label)) {
        largest = left;
      }
      if (right < heapSize && parseInt(array[right].label) > parseInt(array[largest].label)) {
        largest = right;
      }
    } else {
      if (left < heapSize && parseInt(array[left].label) < parseInt(array[largest].label)) {
        largest = left;
      }
      if (right < heapSize && parseInt(array[right].label) < parseInt(array[largest].label)) {
        largest = right;
      }
    }

    if (largest !== i) {
      // Swap values
      const temp = array[i].label;
      array[i].label = array[largest].label;
      array[largest].label = temp;
      
      heapify(array, largest, heapSize);
    }
  };

  const calculateNodePosition = (index) => {
    const level = Math.floor(Math.log2(index + 1));
    const position = index + 1 - Math.pow(2, level);
    const totalNodesInLevel = Math.pow(2, level);
    const levelWidth = 800;
    const x = (position + 0.5) * (levelWidth / totalNodesInLevel) - 25;
    const y = level * 100;
    return { x, y };
  };

  const sleep = (ms) => new Promise(resolve => {
    try {
      setTimeout(resolve, ms);
    } catch (error) {
      console.error('Sleep error:', error);
    }
  });

  const insertNode = async (value) => {
    try {
      if (isAnimating) return;
      setIsAnimating(true);

      const newNodes = [...nodes];
      const newNode = {
        id: Date.now().toString(),
        label: parseInt(value),
        position: calculateNodePosition(newNodes.length),
        state: 'inserting'
      };

      newNodes.push(newNode);
      setNodes([...newNodes]);
      await sleep(500);

      let currentIndex = newNodes.length - 1;
      while (currentIndex > 0) {
        const parentIndex = Math.floor((currentIndex - 1) / 2);
        if (compareNodes(newNodes[currentIndex].label, newNodes[parentIndex].label)) {
          setAnimatingNodes(new Set([currentIndex, parentIndex]));
          newNodes[currentIndex].state = 'comparing';
          newNodes[parentIndex].state = 'comparing';
          setNodes([...newNodes]);
          await sleep(500);

          const temp = newNodes[currentIndex].label;
          newNodes[currentIndex].label = newNodes[parentIndex].label;
          newNodes[parentIndex].label = temp;
          newNodes[currentIndex].state = 'swapping';
          newNodes[parentIndex].state = 'swapping';
          setNodes([...newNodes]);
          await sleep(500);

          newNodes[currentIndex].state = '';
          newNodes[parentIndex].state = '';
          currentIndex = parentIndex;
        } else {
          break;
        }
      }

      newNodes[currentIndex].state = '';
      setNodes([...newNodes]);
      setAnimatingNodes(new Set());
      setIsAnimating(false);
    } catch (error) {
      console.error('Insert error:', error);
      setIsAnimating(false);
      setAnimatingNodes(new Set());
    }
  };

  const deleteRoot = () => {
    if (nodes.length === 0) return;

    const newNodes = [...nodes];
    newNodes[0].label = newNodes[nodes.length - 1].label;
    newNodes.pop();
    
    heapify(newNodes, 0, newNodes.length);
    setNodes(newNodes);
  };

  const rebuildHeap = async () => {
    if (nodes.length <= 1) return;
    
    try {
      setIsAnimating(true);
      const newNodes = [...nodes];
      
      // Start from the last non-leaf node
      for (let i = Math.floor(nodes.length / 2) - 1; i >= 0; i--) {
        await heapifyWithAnimation(newNodes, i);
      }

      // Recalculate positions
      newNodes.forEach((node, index) => {
        node.position = calculateNodePosition(index);
        node.state = '';
      });
      
      setNodes([...newNodes]);
      setAnimatingNodes(new Set());
      setIsAnimating(false);
    } catch (error) {
      console.error('Rebuild heap error:', error);
      setIsAnimating(false);
      setAnimatingNodes(new Set());
    }
  };

  const heapifyWithAnimation = async (heap, index) => {
    try {
      const length = heap.length;
      let largest = index;
      const left = 2 * index + 1;
      const right = 2 * index + 2;

      // Compare with left child
      if (left < length) {
        setAnimatingNodes(new Set([largest, left]));
        heap[largest].state = 'comparing';
        heap[left].state = 'comparing';
        setNodes([...heap]);
        await sleep(500);

        if (compareNodes(heap[left].label, heap[largest].label)) {
          largest = left;
        }

        heap[largest].state = '';
        heap[left].state = '';
        setNodes([...heap]);
      }

      // Compare with right child
      if (right < length) {
        setAnimatingNodes(new Set([largest, right]));
        heap[largest].state = 'comparing';
        heap[right].state = 'comparing';
        setNodes([...heap]);
        await sleep(500);

        if (compareNodes(heap[right].label, heap[largest].label)) {
          largest = right;
        }

        heap[largest].state = '';
        heap[right].state = '';
        setNodes([...heap]);
      }

      if (largest !== index) {
        // Swap animation
        setAnimatingNodes(new Set([index, largest]));
        heap[index].state = 'swapping';
        heap[largest].state = 'swapping';
        setNodes([...heap]);
        await sleep(500);

        // Perform swap
        const temp = heap[index].label;
        heap[index].label = heap[largest].label;
        heap[largest].label = temp;

        heap[index].state = '';
        heap[largest].state = '';
        setNodes([...heap]);

        // Recursively heapify the affected subtree
        await heapifyWithAnimation(heap, largest);
      }
    } catch (error) {
      console.error('Heapify error:', error);
      setIsAnimating(false);
      setAnimatingNodes(new Set());
    }
  };

  const handleHeapTypeSwitch = async () => {
    if (isAnimating) return;
    const newType = heapType === 'max' ? 'min' : 'max';
    setHeapType(newType);
    await rebuildHeap();
  };

  const compareNodes = (a, b) => {
    const numA = parseInt(a);
    const numB = parseInt(b);
    if (heapType === 'max') {
      return numA > numB;
    }
    return numA < numB;
  };

  // Canvas drag handlers
  const handleCanvasDragStart = (e) => {
    setIsDraggingCanvas(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleCanvasDrag = (e) => {
    if (isDraggingCanvas) {
      setOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleCanvasDragEnd = () => {
    setIsDraggingCanvas(false);
  };

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

  const deleteNode = async (nodeIndex) => {
    if (isAnimating) return;
    setIsAnimating(true);

    const newNodes = [...nodes];
    
    // Highlight the node being deleted
    setAnimatingNodes(new Set([nodeIndex]));
    newNodes[nodeIndex].state = 'deleting';
    setNodes([...newNodes]);
    await sleep(500);

    // If it's a leaf node, simply remove it
    if (nodeIndex === newNodes.length - 1) {
      newNodes.pop();
    } else {
      // Replace with the last node
      newNodes[nodeIndex].label = newNodes[newNodes.length - 1].label;
      newNodes[nodeIndex].state = 'inserting';
      setNodes([...newNodes]);
      await sleep(500);
      
      // Remove the last node
      newNodes.pop();
      
      // Heapify down from the replaced node
      await heapifyWithAnimation(newNodes, nodeIndex);
    }

    // Recalculate positions
    newNodes.forEach((node, index) => {
      node.position = calculateNodePosition(index);
      node.state = '';
    });

    setNodes([...newNodes]);
    setAnimatingNodes(new Set());
    setIsAnimating(false);
  };

  // Add array input handler
  const handleArrayInputChange = (e) => {
    // Allow only numbers and commas
    const value = e.target.value.replace(/[^0-9,]/g, '');
    setArrayInputValue(value);
  };

  // Add useEffect to rebuild heap when type changes
  useEffect(() => {
    rebuildHeap();
  }, [heapType]);

  return (
    <div className={styles.visualizer}>
      <div className={styles.container}>
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
        <div className={styles.heapArea} ref={treeAreaRef}>
          {nodes.map((node, index) => {
            const parentIndex = Math.floor((index - 1) / 2);
            if (index > 0) {
              const parent = nodes[parentIndex];
              return (
                <React.Fragment key={`connection-${node.id}`}>
                  <div
                    className={styles.line}
                    style={{
                      left: parent.position.x + 25,
                      top: parent.position.y + 25,
                      width: Math.sqrt(
                        Math.pow(node.position.x - parent.position.x, 2) +
                        Math.pow(node.position.y - parent.position.y, 2)
                      ),
                      transform: `rotate(${Math.atan2(
                        node.position.y - parent.position.y,
                        node.position.x - parent.position.x
                      )}rad)`
                    }}
                  />
                </React.Fragment>
              );
            }
            return null;
          })}
          {nodes.map((node, index) => (
            <div
              key={node.id}
              className={`${styles.node} ${node.state} ${
                animatingNodes.has(index) ? styles.comparing : ''
              }`}
              style={{
                left: node.position.x,
                top: node.position.y
              }}
            >
              {node.label}
              <button
                className={styles.btn}
                onClick={() => deleteNode(index)}
                title="Delete node"
              >
                ×
              </button>
            </div>
          ))}
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
                      node.state ? styles[node.state] : ''
                    } ${animatingNodes.has(index) ? styles.comparing : ''}`}
                  >
                    {node.label}
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