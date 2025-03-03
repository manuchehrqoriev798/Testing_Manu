import React, { useState, useCallback, useRef } from 'react';
import styles from './styles.module.css';

// Main Stack Visualizer Component
const StackVisualizer = ({ onBack }) => {
  // State for multiple stacks
  const [stacks, setStacks] = useState([
    {
      id: 'stack-1',
      name: 'Stack 1',
      elements: []
    }
  ]);

  // Track which stack is currently selected
  const [selectedStackId, setSelectedStackId] = useState('stack-1');
  const [message, setMessage] = useState(null);
  const dragItem = useRef(null);

  // Helper function to show temporary messages
  const showMessage = useCallback((text, duration = 2000) => {
    setMessage(text);
    setTimeout(() => setMessage(null), duration);
  }, []);

  // Push operation
  const pushToStack = useCallback((stackId, value) => {
    if (!value.trim()) return;

    setStacks(prevStacks =>
      prevStacks.map(stack => {
        if (stack.id === stackId) {
          return {
            ...stack,
            elements: [
              ...stack.elements,
              { id: Date.now(), value: value, isHighlighted: false }
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

          const poppedValue = stack.elements[stack.elements.length - 1].value;
          showMessage(`Popped "${poppedValue}" from ${stackId}`);

          return {
            ...stack,
            elements: stack.elements.slice(0, -1)
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

    const topIndex = stack.elements.length - 1;

    setStacks(prevStacks =>
      prevStacks.map(s => {
        if (s.id === stackId) {
          return {
            ...s,
            elements: s.elements.map((el, idx) =>
              idx === topIndex ? { ...el, isHighlighted: true } : el
            )
          };
        }
        return s;
      })
    );

    showMessage(`Peek: "${stack.elements[topIndex].value}"`);

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
    if (stacks.length <= 1) {
      showMessage("Cannot delete the only stack");
      return;
    }
    
    setStacks(prevStacks => prevStacks.filter(stack => stack.id !== stackId));

    if (selectedStackId === stackId) {
      setSelectedStackId(stacks.find(stack => stack.id !== stackId)?.id || null);
    }

    showMessage(`Deleted ${stackId}`);
  }, [stacks, selectedStackId, showMessage]);

  // Add a new stack
  const addNewStack = useCallback(() => {
    const newStackId = `stack-${stacks.length + 1}`;
    const newStack = {
      id: newStackId,
      name: `Stack ${stacks.length + 1}`,
      elements: []
    };

    setStacks(prevStacks => [...prevStacks, newStack]);
    setSelectedStackId(newStackId);

    showMessage(`Added new stack: ${newStack.name}`);
  }, [stacks, showMessage]);

  // Handler for dragging top stack item (for pop operation)
  const handleDragStart = useCallback((e, stackId, itemId) => {
    dragItem.current = { stackId, itemId };
    e.target.classList.add(styles.dragging);
  }, []);
  
  const handleDragEnd = useCallback((e) => {
    // If dragged far enough vertically, pop the item
    if (dragItem.current && Math.abs(e.clientY - e.target.getBoundingClientRect().top) > 100) {
      popFromStack(dragItem.current.stackId);
    }
    
    e.target.classList.remove(styles.dragging);
    dragItem.current = null;
  }, [popFromStack]);

  // Control panel for stack operations
  const StackControls = React.memo(({ stack }) => {
    const [inputValue, setInputValue] = useState('');

    return (
      <div className={`${styles.stackControls} ${stack.id === selectedStackId ? styles.activeControls : ''}`}>
        <div className={styles.stackHeader}>
          {stack.name}
          {stacks.length > 1 && (
            <button
              className={styles.deleteStackBtn}
              onClick={() => deleteStack(stack.id)}
            >
              ×
            </button>
          )}
        </div>
        
        <div className={styles.controlsContent}>
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

      <div className={styles.stacksContainer}>
        {stacks.map(stack => (
          <div 
            key={stack.id}
            className={`${styles.stackWrapper} ${stack.id === selectedStackId ? styles.selectedStack : ''}`}
            onClick={() => setSelectedStackId(stack.id)}
          >
            <div className={styles.stackElements}>
              {stack.elements.map((item, index) => (
                <div
                  key={item.id}
                  className={`${styles.stackNode} ${item.isHighlighted ? styles.highlighted : ''}`}
                  data-stack={stack.id}
                  draggable={index === stack.elements.length - 1}
                  onDragStart={index === stack.elements.length - 1 ? (e) => handleDragStart(e, stack.id, item.id) : null}
                  onDragEnd={index === stack.elements.length - 1 ? handleDragEnd : null}
                >
                  <span className={styles.stackNodeValue}>{item.value}</span>
                  {index === stack.elements.length - 1 && <div className={styles.topIndicator}>TOP</div>}
                </div>
              ))}
              
              {stack.elements.length === 0 && (
                <div className={styles.emptyIndicator}>Empty</div>
              )}
            </div>
            
            <div className={styles.stackBase}>
              <span className={styles.stackLabel}>{stack.name}</span>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.controlsContainer}>
        {stacks
          .filter(stack => stack.id === selectedStackId)
          .map(stack => (
            <StackControls key={stack.id} stack={stack} />
          ))}
      </div>
    </div>
  );
};

export default StackVisualizer;