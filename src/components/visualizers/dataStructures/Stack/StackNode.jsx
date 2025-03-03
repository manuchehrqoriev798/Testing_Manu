import React, { useState, useCallback, useMemo, memo } from 'react';
import ReactFlow, { ReactFlowProvider, Controls, Background } from 'reactflow';
import 'reactflow/dist/style.css';
import styles from './StackNode.module.css';

// Constants for stack positioning
const HEIGHT = 60;          // Increased height for more spacing
const THRESHOLD = 100;      // Distance threshold for popping via drag

// Stack Element Node Component
export const StackElementNode = memo(({ data }) => {
  return (
    <div className={`${styles.stackNode} ${data.isHighlighted ? styles.highlighted : ''}`}>
      {data.label}
    </div>
  );
});

// Stack Base Node Component
export const StackBase = ({ data }) => {
  return (
    <div 
      className={`${styles.stackBase} ${data.isSelected ? styles.selectedStackBase : ''}`}
      onClick={() => data.onClick && data.onClick()}
    >
      <div className={styles.stackLabelNode}>
        {data.name || 'Stack Base'}
      </div>
    </div>
  );
};

// Stack Controls Component
export const StackControls = ({
  stack,
  onPush,
  onPop,
  onPeek,
  onClear,
  onIsEmpty,
  onSize,
  showStackControls,
  setShowStackControls,
  onDeleteStack
}) => {
  const [inputValue, setInputValue] = useState('');

  const handlePush = () => {
    if (inputValue.trim()) {
      onPush(stack, inputValue);
      setInputValue('');
    }
  };

  return (
    <div className={styles.stackControls} style={{ display: showStackControls ? 'block' : 'none' }}>
      <div className={styles.stackHeader}>
        {`Stack ${stack.split('-')[1]}`}
        <button
          className={styles.deleteStackBtn}
          onClick={() => setShowStackControls(false)}
          title="Hide Controls"
        >
          ×
        </button>
      </div>

      <div className={styles.inputGroup}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className={styles.input}
          placeholder="Enter value..."
        />
      </div>

      <div className={styles.buttonGroup}>
        <button onClick={handlePush} className={styles.btn}>Push</button>
        <button onClick={() => onPop(stack)} className={styles.btn}>Pop</button>
        <button onClick={() => onPeek(stack)} className={`${styles.btn} ${styles.peekBtn}`}>Peek</button>
        <button onClick={() => onClear(stack)} className={`${styles.btn} ${styles.clearBtn}`}>Clear</button>
        <button onClick={() => onIsEmpty(stack)} className={`${styles.btn} ${styles.isEmptyBtn}`}>Is Empty</button>
        <button onClick={() => onSize(stack)} className={`${styles.btn} ${styles.sizeBtn}`}>Size</button>
      </div>
      <button
        onClick={() => {
          onDeleteStack(stack);
          setShowStackControls(false);
        }}
        className={`${styles.btn} ${styles.clearBtn}`}
        style={{ marginTop: '10px', width: '100%' }}
      >
        Delete Stack
      </button>
    </div>
  );
};

// Stack Node Types
export const stackNodeTypes = {
  stackElement: StackElementNode,
  stackBase: StackBase
};

// Hook to manage stack operations
export const useStackOperations = () => {
  const [stacks, setStacks] = useState([
    {
      id: 'stack-1',
      name: 'Stack 1',
      elements: [],
      position: { x: 200, y: 300 },
      baseY: 300
    }
  ]);
  const [selectedStackId, setSelectedStackId] = useState('stack-1');
  const [showStackControls, setShowStackControls] = useState(true);
  const [highlightedElements, setHighlightedElements] = useState(new Set());

  // Stack operations
  const handleAddStack = useCallback(() => {
    const newStackId = `stack-${stacks.length + 1}`;
    const newStack = {
      id: newStackId,
      name: `Stack ${stacks.length + 1}`,
      elements: [],
      position: { x: 200 + (stacks.length * 150), y: 300 },
      baseY: 300
    };

    setStacks(prevStacks => [...prevStacks, newStack]);
    setSelectedStackId(newStackId);
  }, [stacks.length]);

  const handleStackSelect = useCallback((stackId) => {
    setSelectedStackId(stackId);
    setShowStackControls(true);
  }, []);

  const handlePushToStack = useCallback((stackId, value) => {
    if (!value.trim()) return;
    
    setStacks(prevStacks => 
      prevStacks.map(stack => {
        if (stack.id === stackId) {
          return {
            ...stack,
            elements: [...stack.elements, value]
          };
        }
        return stack;
      })
    );
  }, []);

  const handlePopFromStack = useCallback((stackId) => {
    setStacks(prevStacks => 
      prevStacks.map(stack => {
        if (stack.id === stackId && stack.elements.length > 0) {
          const poppedValue = stack.elements[stack.elements.length - 1];
          return {
            ...stack,
            elements: stack.elements.slice(0, -1)
          };
        }
        return stack;
      })
    );
  }, []);

  const handlePeekStack = useCallback((stackId) => {
    const stack = stacks.find(s => s.id === stackId);
    if (stack && stack.elements.length > 0) {
      const topElement = stack.elements[stack.elements.length - 1];
      setHighlightedElements(new Set([`${stackId}-${stack.elements.length - 1}`]));
      setTimeout(() => setHighlightedElements(new Set()), 1500);
      return topElement;
    }
    return null;
  }, [stacks]);

  const handleClearStack = useCallback((stackId) => {
    setStacks(prevStacks => 
      prevStacks.map(stack => {
        if (stack.id === stackId) {
          return {
            ...stack,
            elements: []
          };
        }
        return stack;
      })
    );
  }, []);

  const handleDeleteStack = useCallback((stackId) => {
    setStacks(prevStacks => prevStacks.filter(stack => stack.id !== stackId));
    if (selectedStackId === stackId) {
      setSelectedStackId(null);
      setShowStackControls(false);
    }
  }, [selectedStackId]);

  const handleIsEmptyStack = useCallback((stackId) => {
    const stack = stacks.find(s => s.id === stackId);
    if (stack) {
      const isEmpty = stack.elements.length === 0;
      return isEmpty;
    }
    return true;
  }, [stacks]);

  const handleSizeStack = useCallback((stackId) => {
    const stack = stacks.find(s => s.id === stackId);
    if (stack) {
      const size = stack.elements.length;
      return size;
    }
    return 0;
  }, [stacks]);

  const handleDeleteStackVisualizer = useCallback((stackId) => {
    setStacks(prevStacks => prevStacks.filter(stack => stack.id !== stackId));
    setShowStackControls(false);
    setSelectedStackId(null);
  }, []);

  const handleStackDrag = useCallback((stackId, x, y) => {
    setStacks(prevStacks => prevStacks.map(stack => {
      if (stack.id === stackId) {
        return {
          ...stack,
          position: { x, y },
          baseY: y
        };
      }
      return stack;
    }));
  }, []);

  const handleUpdateStackPosition = useCallback((stackId, x, y) => {
    setStacks(prevStacks => prevStacks.map(stack => {
      if (stack.id === stackId) {
        return {
          ...stack,
          position: { x, y },
          baseY: y
        };
      }
      return stack;
    }));
  }, []);

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    if (active && over) {
      const { x, y } = over.rect;
      handleUpdateStackPosition(active.id, x, y);
    }
  }, [handleUpdateStackPosition]);

  // Add handler for node drag
  const handleNodeDrag = useCallback((event, node) => {
    const stackId = node.data.stackId;
    setStacks(prevStacks => 
      prevStacks.map(stack => {
        if (stack.id === stackId) {
          return {
            ...stack,
            position: { x: node.position.x, y: node.position.y }
          };
        }
        return stack;
      })
    );
  }, []);

  // Generate nodes for ReactFlow
  const stackNodes = useMemo(() => {
    return stacks.flatMap(stack => {
      const elementNodes = stack.elements.map((element, index) => ({
        id: `${stack.id}-${index}`,
        type: 'stackNode',
        data: { 
          label: element.value,
          isHighlighted: highlightedElements.has(`${stack.id}-${index}`)
        },
        position: { 
          x: stack.position.x, 
          y: stack.position.y - ((index + 1) * HEIGHT) 
        },
        draggable: false // Elements should not be draggable
      }));

      // Base node (draggable)
      const baseNode = {
        id: `${stack.id}-base`,
        type: 'stackBase',
        data: { 
          stackId: stack.id,
          name: `Stack ${stack.id.split('-')[1]}`,
          isSelected: stack.id === selectedStackId,
          onClick: () => handleStackSelect(stack.id)
        },
        position: stack.position,
        draggable: true // Make base draggable
      };

      return [...elementNodes, baseNode];
    });
  }, [stacks, selectedStackId, highlightedElements, handleStackSelect]);

  return {
    stacks,
    selectedStackId,
    showStackControls,
    setShowStackControls,
    stackNodes,
    handleAddStack,
    handleStackSelect,
    handlePushToStack,
    handlePopFromStack,
    handlePeekStack,
    handleClearStack,
    handleDeleteStack,
    handleIsEmptyStack,
    handleSizeStack,
    handleDeleteStackVisualizer,
    handleStackDrag,
    handleDragEnd,
    handleUpdateStackPosition,
    handleNodeDrag,
  };
};

// Main Stack Visualizer Component
const StackVisualizerContent = ({ onBack, onAddStack }) => {
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

  // Track which stack is currently selected
  const [selectedStackId, setSelectedStackId] = useState('stack-1');

  const [message, setMessage] = useState(null);

  // Helper function to show temporary messages
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
        style: {
          transition: 'all 0.3s ease',
        }
      }));

      // Add a visually appealing base platform for the stack
      const baseNode = {
        id: `${stack.id}-base`,
        type: 'stackBase',
        data: { 
          stackId: stack.id,
          name: stack.name,
          isSelected: stack.id === selectedStackId,
          onClick: () => setSelectedStackId(stack.id)
        },
        position: {
          x: stack.position.x,
          y: stack.position.y
        },
        draggable: true,
        className: 'react-flow__node react-flow__node-default selectable',
        style: {
          zIndex: 0,
          transform: 'translateX(-20px)',
          pointerEvents: 'all',
          visibility: 'visible',
          width: '140px',
          height: '12px',
          background: 'linear-gradient(90deg, rgb(44, 62, 80), rgb(74, 100, 145))',
          borderRadius: '6px',
          boxShadow: 'rgba(0, 0, 0, 0.2) 0px 4px 8px',
          cursor: 'pointer',
          border: stack.id === selectedStackId ? '2px solid #f39c12' : 'none',
        },
      };

      // Create a stylish stack label node
      const labelNode = {
        id: `${stack.id}-label`,
        type: 'default',
        data: {
          label: stack.name,
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
          color: stack.id === selectedStackId ? '#f39c12' : '#2c3e50',
          width: '100px',
          textAlign: 'center',
          textShadow: '1px 1px 2px rgba(255,255,255,0.7)',
          cursor: 'pointer',
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

    showMessage(`Peeked value: ${stack.elements[stack.elements.length - 1].value}`);
  }, [stacks]);

  const {
    stacks: stackOperationsStacks,
    selectedStackId: stackOperationsSelectedStackId,
    showStackControls: stackOperationsShowStackControls,
    highlightedElements: stackOperationsHighlightedElements,
    stackNodes: stackOperationsStackNodes,
    setShowStackControls: stackOperationsSetShowStackControls,
    handleAddStack: stackOperationsHandleAddStack,
    handleStackSelect: stackOperationsHandleStackSelect,
    handlePushToStack: stackOperationsHandlePushToStack,
    handlePopFromStack: stackOperationsHandlePopFromStack,
    handlePeekStack: stackOperationsHandlePeekStack,
    handleClearStack: stackOperationsHandleClearStack,
    handleDeleteStack: stackOperationsHandleDeleteStack,
    handleIsEmptyStack: stackOperationsHandleIsEmptyStack,
    handleSizeStack: stackOperationsHandleSizeStack,
    handleDeleteStackVisualizer: stackOperationsHandleDeleteStackVisualizer,
    handleStackDrag,
    handleDragEnd,
    handleUpdateStackPosition,
    handleNodeDrag,
  } = useStackOperations();

  // Define nodeTypes outside or memoize inside your component
  const nodeTypes = useMemo(() => ({
    stackElement: StackElementNode,
    stackBase: StackBase,
  }), []);

  return (
    <div className={styles.stackVisualizerContent}>
      <StackControls
        stack={selectedStackId}
        onPush={pushToStack}
        onPop={popFromStack}
        onPeek={peekStack}
        onClear={() => {}}
        onIsEmpty={stackOperationsHandleIsEmptyStack}
        onSize={stackOperationsHandleSizeStack}
        showStackControls={stackOperationsShowStackControls}
        setShowStackControls={stackOperationsSetShowStackControls}
        onDeleteStack={stackOperationsHandleDeleteStack}
      />
    </div>
  );
};