import React, { useState, useCallback, useMemo } from 'react';
import ReactFlow, { ReactFlowProvider, Controls, Background } from 'reactflow';
import 'reactflow/dist/style.css';
import styles from './styles.module.css';

// Constants for stack positioning
const HEIGHT = 60;          // Increased height for more spacing
const THRESHOLD = 100;      // Distance threshold for popping via drag

// Define a more visually appealing StackNode component
const StackNode = ({ data }) => {
  return (
    <div
      className={`${styles.stackNode} ${data.isHighlighted ? styles.highlighted : ''}`}
      data-stack={data.stackId}
    >
      <div className={styles.stackNodeContent}>
        <span className={styles.stackNodeValue}>{data.label}</span>
        {data.isTop && <div className={styles.topIndicator}>TOP</div>}
      </div>
    </div>
  );
};

// Create nodeTypes object outside of component
const nodeTypes = { stackNode: StackNode };

// Main Stack Visualizer Component
const StackVisualizerContent = ({ onBack }) => {
  // State for multiple stacks
  const [stacks, setStacks] = useState([
    {
      id: 'stack-1',
      name: 'Stack 1',
      elements: [],
      position: { x: 200, y: 300 },
      baseY: 300
    }
  ]);
  
  // Add state to track which stack is currently selected
  const [selectedStackId, setSelectedStackId] = useState('stack-1');
  
  const [message, setMessage] = useState(null);
  
  // Helper function to show messages
  const showMessage = useCallback((text, duration = 2000) => {
    setMessage(text);
    setTimeout(() => setMessage(null), duration);
  }, []);
  
  // Create combined nodes for all stacks
  const allNodes = useMemo(() => {
    return stacks.flatMap(stack => {
      // Create stack elements (growing upward)
      const elementNodes = stack.elements.map((item, index) => ({
        id: `${stack.id}-node-${item.id}`,
        type: 'stackNode',
        data: { 
          label: item.value, 
          isHighlighted: item.isHighlighted,
          isTop: index === 0,
          stackId: stack.id
        },
        position: { 
          x: stack.position.x, 
          y: stack.position.y - ((stack.elements.length - index) * HEIGHT)
        },
        draggable: index === 0,
        // Add styling directly to node
        style: {
          transition: 'all 0.3s ease',
        }
      }));
      
      // Add a more visually appealing base platform for the stack
      const baseNode = {
        id: `${stack.id}-base`,
        type: 'default',
        data: { 
          label: '',
          // Add custom data for event handling
          stackId: stack.id,
          onClick: () => setSelectedStackId(stack.id)
        },
        position: { 
          x: stack.position.x, 
          y: stack.position.y 
        },
        draggable: false,
        style: {
          width: '140px',
          height: '12px',
          background: `linear-gradient(90deg, #2c3e50, #4a6491)`,
          borderRadius: '6px',
          transform: 'translateX(-20px)',
          boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
          cursor: 'pointer', // Add pointer cursor to indicate clickability
          border: stack.id === selectedStackId ? '2px solid #f39c12' : 'none', // Highlight selected stack
        },
      };
      
      // Create a more stylish stack label node
      const labelNode = {
        id: `${stack.id}-label`,
        type: 'default',
        data: { 
          label: stack.name,
          // Add custom data for event handling
          stackId: stack.id,
          onClick: () => setSelectedStackId(stack.id)
        },
        position: { 
          x: stack.position.x, 
          y: stack.position.y + 25
        },
        draggable: false,
        style: {
          background: 'transparent',
          border: 'none',
          fontSize: '16px',
          fontWeight: 'bold',
          color: stack.id === selectedStackId ? '#f39c12' : '#2c3e50', // Highlight selected stack
          width: '100px',
          textAlign: 'center',
          textShadow: '1px 1px 2px rgba(255,255,255,0.7)',
          cursor: 'pointer', // Add pointer cursor
        }
      };
      
      return [...elementNodes, baseNode, labelNode];
    });
  }, [stacks, selectedStackId]);
  
  // Push operation
  const pushToStack = useCallback((stackId, value) => {
    if (!value.trim()) return;
    
    setStacks(prevStacks => 
      prevStacks.map(stack => {
        if (stack.id === stackId) {
          return {
            ...stack,
            elements: [
              { id: Date.now(), value: value, isHighlighted: false },
              ...stack.elements
            ]
          };
        }
        return stack;
      })
    );
    
    showMessage(`Pushed "${value}" to ${stackId}`);
  }, [showMessage]);
  
  // Pop operation
  const popFromStack = useCallback((stackId) => {
    setStacks(prevStacks => 
      prevStacks.map(stack => {
        if (stack.id === stackId) {
          if (stack.elements.length === 0) {
            showMessage("Cannot pop from empty stack");
            return stack;
          }
          
          const poppedValue = stack.elements[0].value;
          showMessage(`Popped "${poppedValue}" from ${stackId}`);
          
          return {
            ...stack,
            elements: stack.elements.slice(1)
          };
        }
        return stack;
      })
    );
  }, [showMessage]);
  
  // Peek operation
  const peekStack = useCallback((stackId) => {
    const stack = stacks.find(s => s.id === stackId);
    if (!stack || stack.elements.length === 0) {
      showMessage("Cannot peek empty stack");
      return;
    }
    
    setStacks(prevStacks => 
      prevStacks.map(s => {
        if (s.id === stackId) {
          return {
            ...s,
            elements: s.elements.map((el, idx) => 
              idx === 0 ? { ...el, isHighlighted: true } : el
            )
          };
        }
        return s;
      })
    );
    
    showMessage(`Peek: "${stack.elements[0].value}"`);
    
    setTimeout(() => {
      setStacks(prevStacks => 
        prevStacks.map(s => {
          if (s.id === stackId) {
            return {
              ...s,
              elements: s.elements.map(el => ({ ...el, isHighlighted: false }))
            };
          }
          return s;
        })
      );
    }, 2000);
  }, [stacks, showMessage]);
  
  // Clear operation
  const clearStack = useCallback((stackId) => {
    setStacks(prevStacks => 
      prevStacks.map(stack => {
        if (stack.id === stackId) {
          return { ...stack, elements: [] };
        }
        return stack;
      })
    );
    
    showMessage(`Cleared ${stackId}`);
  }, [showMessage]);
  
  // isEmpty operation
  const isEmptyStack = useCallback((stackId) => {
    const stack = stacks.find(s => s.id === stackId);
    if (!stack) return;
    
    const isEmpty = stack.elements.length === 0;
    showMessage(`isEmpty: ${isEmpty}`);
  }, [stacks, showMessage]);
  
  // Size operation
  const getStackSize = useCallback((stackId) => {
    const stack = stacks.find(s => s.id === stackId);
    if (!stack) return;
    
    showMessage(`Size: ${stack.elements.length}`);
  }, [stacks, showMessage]);
  
  // Delete a stack
  const deleteStack = useCallback((stackId) => {
    setStacks(prevStacks => prevStacks.filter(stack => stack.id !== stackId));
    
    // If we're deleting the currently selected stack, select another one
    if (selectedStackId === stackId) {
      setSelectedStackId(stacks.find(stack => stack.id !== stackId)?.id || null);
    }
    
    showMessage(`Deleted ${stackId}`);
  }, [stacks, selectedStackId, showMessage]);
  
  // Add a new stack with offset position
  const addNewStack = useCallback(() => {
    const newStackId = `stack-${stacks.length + 1}`;
    const newStack = {
      id: newStackId,
      name: `Stack ${stacks.length + 1}`,
      elements: [],
      position: { x: 200 + (stacks.length * 150), y: 300 },
      baseY: 300
    };
    
    setStacks(prevStacks => [...prevStacks, newStack]);
    // Select the newly created stack
    setSelectedStackId(newStackId);
    
    showMessage(`Added new stack: ${newStack.name}`);
  }, [stacks, showMessage]);
  
  // Control panel for stack operations - only show for selected stack
  const StackControls = React.memo(({ stack }) => {
    const [inputValue, setInputValue] = useState('');
    
    // Only render if this is the selected stack
    if (stack.id !== selectedStackId) {
      return null;
    }
    
    return (
      <div 
        className={styles.stackWrapper}
        style={{ 
          right: '20px',
          top: '100px'
        }}
      >
        <button 
          className={styles.deleteStackBtn} 
          onClick={() => deleteStack(stack.id)}
        >
          ×
        </button>
        
        <div className={styles.stackHeader}>{stack.name}</div>
        
        <div className={styles.stackControls}>
          <div className={styles.inputGroup}>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Enter value"
              className={styles.input}
            />
            <button 
              onClick={() => {
                pushToStack(stack.id, inputValue);
                setInputValue('');
              }} 
              className={styles.btn}
            >
              Push
            </button>
          </div>
          <div className={styles.buttonGroup}>
            <button onClick={() => popFromStack(stack.id)} className={styles.btn}>
              Pop
            </button>
            <button onClick={() => peekStack(stack.id)} className={`${styles.btn} ${styles.peekBtn}`}>
              Peek
            </button>
            <button onClick={() => clearStack(stack.id)} className={`${styles.btn} ${styles.clearBtn}`}>
              Clear
            </button>
            <button onClick={() => isEmptyStack(stack.id)} className={`${styles.btn} ${styles.isEmptyBtn}`}>
              Is Empty?
            </button>
            <button onClick={() => getStackSize(stack.id)} className={`${styles.btn} ${styles.sizeBtn}`}>
              Size
            </button>
          </div>
        </div>
      </div>
    );
  });
  
  // Add custom click handler for ReactFlow nodes
  const onNodeClick = useCallback((_, node) => {
    // If the node has a stackId, select that stack
    if (node.data?.stackId) {
      setSelectedStackId(node.data.stackId);
    }
    
    // If the node has a custom onClick handler, call it
    if (typeof node.data?.onClick === 'function') {
      node.data.onClick();
    }
  }, []);
  
  return (
    <div className={styles.visualizer}>
      <div className={styles.globalControls}>
        <button onClick={onBack} className={styles.backBtn}>
          Back
        </button>
        <button onClick={addNewStack} className={styles.addStackBtn}>
          Add New Stack
        </button>
      </div>
      
      {message && <div className={styles.message}>{message}</div>}
      
      <div className={styles.flowContainer}>
        <ReactFlow
          nodes={allNodes}
          edges={[]}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          onNodeDragStop={(_, node) => {
            const stackId = node.data.stackId;
            const stack = stacks.find(s => s.id === stackId);
            
            if (stack && node.data.isTop) {
              const yPos = node.position.y;
              const baseY = stack.position.y;
              if (Math.abs(yPos - baseY) > THRESHOLD) {
                popFromStack(stackId);
              }
            }
          }}
          fitView
          style={{ width: '100%', height: '100%' }}
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
      
      {stacks.map(stack => (
        <StackControls key={stack.id} stack={stack} />
      ))}
    </div>
  );
};

// Wrap in ReactFlowProvider
const StackVisualizer = (props) => {
  return (
    <ReactFlowProvider>
      <StackVisualizerContent {...props} />
    </ReactFlowProvider>
  );
};

export default StackVisualizer;