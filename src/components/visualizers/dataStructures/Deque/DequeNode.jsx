import React, { useState, useCallback, useMemo, memo } from 'react';
import ReactFlow, { ReactFlowProvider, Controls, Background, useReactFlow } from 'reactflow';
import 'reactflow/dist/style.css';
import styles from './DequeNode.module.css'; // Ensure this CSS module exists

// Constants for deque positioning
const WIDTH = 80;
const DEQUE_Y = 300;

// Define and export DequeElementNode component
export const DequeElementNode = memo(({ data }) => (
  <div className={`${styles.dequeNode} ${data.isHighlighted ? styles.highlighted : ''}`}>
    {data.label}
  </div>
));

// Define and export DequeBase component
export const DequeBase = memo(({ data }) => (
  <div 
    className={`${styles.dequeBase} ${data.isSelected ? styles.selectedDequeBase : ''}`}
    onClick={() => data.onClick && data.onClick()}
  >
    <div className={styles.dequeBase} />
    <div className={styles.dequeLabelNode}>
      {data.name || 'Deque'}
    </div>
  </div>
));

// Define and memoize nodeTypes at the module level
export const nodeTypes = {
  dequeNode: DequeElementNode,
  dequeBase: DequeBase
};

// Deque Controls Component
export const DequeControls = memo(({
  dequeId = '',
  showDequeControls,
  setShowDequeControls,
  onAddFirst,
  onAddLast,
  onRemoveFirst,
  onRemoveLast,
  onPeekFirst,
  onPeekLast,
  onClear,
  onDelete
}) => {
  const [inputValue, setInputValue] = useState('');

  const handleClose = () => {
    setShowDequeControls(false);
  };

  const handleDelete = () => {
    if (dequeId) {
      onDelete?.(dequeId);
    }
  };

  const handleClear = () => {
    if (dequeId) {
      onClear?.(dequeId);
    }
  };

  const handleAddFirst = () => {
    if (inputValue.trim()) {
      onAddFirst?.(inputValue.trim());
      setInputValue('');
    }
  };

  const handleAddLast = () => {
    if (inputValue.trim()) {
      onAddLast?.(inputValue.trim());
      setInputValue('');
    }
  };

  return (
    <div className={styles.dequeControls} style={{ display: showDequeControls ? 'block' : 'none' }}>
      <div className={styles.dequeHeader}>
        <span>{dequeId ? `Deque ${dequeId.split('-')[1]}` : 'Deque'}</span>
        <button
          className={styles.closeButton}
          onClick={handleClose}
          aria-label="Close"
        >
          ×
        </button>
      </div>
      <div className={styles.inputGroup}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Enter value..."
          className={styles.input}
        />
      </div>
      <div className={styles.buttonGroup}>
        <button onClick={handleAddFirst} className={`${styles.btn} ${styles.addBtn}`}>Add First</button>
        <button onClick={handleAddLast} className={`${styles.btn} ${styles.addBtn}`}>Add Last</button>
        <button onClick={onRemoveFirst} className={`${styles.btn} ${styles.removeBtn}`}>Remove First</button>
        <button onClick={onRemoveLast} className={`${styles.btn} ${styles.removeBtn}`}>Remove Last</button>
        <button onClick={onPeekFirst} className={`${styles.btn} ${styles.peekBtn}`}>Peek First</button>
        <button onClick={onPeekLast} className={`${styles.btn} ${styles.peekBtn}`}>Peek Last</button>
        <button onClick={handleClear} className={`${styles.btn} ${styles.clearBtn}`}>Clear</button>
      </div>
      <button
        onClick={handleDelete}
        className={`${styles.btn} ${styles.deleteBtn}`}
        style={{ marginTop: '10px', width: '100%' }}
      >
        Delete Deque
      </button>
    </div>
  );
});

// Custom Hook for Deque Operations
export const useDequeOperations = () => {
  const [deques, setDeques] = useState([
    {
      id: 'deque-1',
      name: 'Deque 1',
      elements: [],
      position: { x: 200, y: 450 }
    }
  ]);
  
  const [selectedDequeId, setSelectedDequeId] = useState(null);
  const [showDequeControls, setShowDequeControls] = useState(false);
  const [highlightedElements, setHighlightedElements] = useState(new Set());
  const [message, setMessage] = useState('');

  const showMessage = useCallback((text, duration = 2000) => {
    setMessage(text);
    setTimeout(() => setMessage(''), duration);
  }, []);

  const handleClear = useCallback((dequeId) => {
    if (!dequeId) return;
    
    setDeques(prevDeques =>
      prevDeques.map(deque =>
        deque.id === dequeId
          ? { ...deque, elements: [] }
          : deque
      )
    );
    
    setHighlightedElements(new Set());
    showMessage('Deque cleared');
  }, [showMessage]);

  const handleDeleteDeque = useCallback((dequeId) => {
    setDeques(prevDeques => prevDeques.filter(deque => deque.id !== dequeId));
    setSelectedDequeId(null);
    setShowDequeControls(false);
    showMessage('Deque deleted');
  }, [showMessage]);

  const handleAddFirst = useCallback((value) => {
    setDeques(prevDeques => 
      prevDeques.map(deque => 
        deque.id === selectedDequeId
          ? { ...deque, elements: [value, ...deque.elements] }
          : deque
      )
    );
    showMessage(`Added ${value} to front of deque`);
  }, [selectedDequeId, showMessage]);

  const handleAddLast = useCallback((value) => {
    setDeques(prevDeques => 
      prevDeques.map(deque => 
        deque.id === selectedDequeId
          ? { ...deque, elements: [...deque.elements, value] }
          : deque
      )
    );
    showMessage(`Added ${value} to end of deque`);
  }, [selectedDequeId, showMessage]);

  const handleRemoveFirst = useCallback(() => {
    setDeques(prevDeques => 
      prevDeques.map(deque => {
        if (deque.id === selectedDequeId && deque.elements.length > 0) {
          const [first, ...rest] = deque.elements;
          showMessage(`Removed ${first} from front of deque`);
          return { ...deque, elements: rest };
        }
        return deque;
      })
    );
  }, [selectedDequeId, showMessage]);

  const handleRemoveLast = useCallback(() => {
    setDeques(prevDeques => 
      prevDeques.map(deque => {
        if (deque.id === selectedDequeId && deque.elements.length > 0) {
          const last = deque.elements[deque.elements.length - 1];
          showMessage(`Removed ${last} from end of deque`);
          return { ...deque, elements: deque.elements.slice(0, -1) };
        }
        return deque;
      })
    );
  }, [selectedDequeId, showMessage]);

  const handlePeekFirst = useCallback(() => {
    const deque = deques.find(d => d.id === selectedDequeId);
    if (deque && deque.elements.length > 0) {
      const firstElement = deque.elements[0];
      showMessage(`Front element is ${firstElement}`);
      setHighlightedElements(new Set([`${selectedDequeId}-0`]));
      setTimeout(() => setHighlightedElements(new Set()), 2000);
    }
  }, [deques, selectedDequeId, showMessage]);

  const handlePeekLast = useCallback(() => {
    const deque = deques.find(d => d.id === selectedDequeId);
    if (deque && deque.elements.length > 0) {
      const lastIndex = deque.elements.length - 1;
      const lastElement = deque.elements[lastIndex];
      showMessage(`Last element is ${lastElement}`);
      setHighlightedElements(new Set([`${selectedDequeId}-${lastIndex}`]));
      setTimeout(() => setHighlightedElements(new Set()), 2000);
    }
  }, [deques, selectedDequeId, showMessage]);

  const handleNodeDrag = useCallback((event, node) => {
    if (node.type === 'group') {
      setDeques(prevDeques =>
        prevDeques.map(deque =>
          deque.id === node.data.dequeId
            ? { ...deque, position: node.position }
            : deque
        )
      );
    }
  }, []);

  const handleDequeSelect = useCallback((dequeId) => {
    setSelectedDequeId(dequeId);
    setShowDequeControls(true);
  }, []);

  const handleAddDeque = useCallback(() => {
    const newDequeId = `deque-${deques.length + 1}`;
    const newDeque = {
      id: newDequeId,
      name: `Deque ${deques.length + 1}`,
      elements: [],
      position: { x: 200 + (deques.length * 150), y: 450 },
      baseY: 450
    };
    setDeques(prevDeques => [...prevDeques, newDeque]);
    setSelectedDequeId(newDequeId);
  }, [deques.length]);

  const dequeNodes = useMemo(() => {
    return deques.map(deque => {
      const elements = deque.elements || []; // Add fallback for empty elements
      const nodeWidth = 60;
      const nodeGap = 20;
      const totalWidth = elements.length * (nodeWidth + nodeGap);
      const baseX = deque.position.x;
      const baseY = deque.position.y;
      const startX = baseX - totalWidth / 2;

      const elementNodes = elements.map((element, index) => ({
        id: `${deque.id}-${index}`,
        type: 'dequeNode',
        position: { 
          x: startX + index * (nodeWidth + nodeGap),
          y: baseY 
        },
        data: {
          label: element,
          isHighlighted: highlightedElements.has(`${deque.id}-${index}`),
          dequeId: deque.id
        },
        draggable: false,
        parentNode: deque.id,
        extent: 'parent',
        style: { zIndex: 10 }
      }));

      return [
        {
          id: deque.id,
          type: 'group',
          position: deque.position,
          data: { dequeId: deque.id },
          style: {
            width: Math.max(totalWidth + nodeGap * 2, 140),
            height: 100,
            background: 'transparent',
            border: 'none',
            zIndex: 1
          },
          draggable: true,
          selectable: false,
          dragHandle: '.dequeLabelNode'
        },
        ...elementNodes,
        {
          id: `${deque.id}-base`,
          type: 'dequeBase',
          position: { 
            x: baseX - 70,
            y: baseY + 40
          },
          data: {
            name: deque.name,
            onClick: () => handleDequeSelect(deque.id),
            isSelected: selectedDequeId === deque.id,
            dequeId: deque.id
          },
          draggable: false,
          parentNode: deque.id,
          extent: 'parent',
          style: { zIndex: 5 }
        }
      ];
    }).flat();
  }, [deques, handleDequeSelect, selectedDequeId, highlightedElements]);

  return {
    deques,
    selectedDequeId,
    showDequeControls,
    setShowDequeControls,
    message,
    dequeNodes,
    handleAddDeque,
    handleDequeSelect,
    handleNodeDrag,
    handleAddFirst,
    handleAddLast,
    handleRemoveFirst,
    handleRemoveLast,
    handlePeekFirst,
    handlePeekLast,
    handleClear,
    handleDeleteDeque,
    highlightedElements
  };
};

// Main Deque Visualizer Component
const DequeVisualizerContent = ({ onBack }) => {
  const {
    deques,
    selectedDequeId,
    showDequeControls,
    setShowDequeControls,
    message,
    dequeNodes,
    handleAddDeque,
    handleNodeDrag,
    handleAddFirst,
    handleAddLast,
    handleRemoveFirst,
    handleRemoveLast,
    handlePeekFirst,
    handlePeekLast,
    handleClear,
    handleDeleteDeque,
    highlightedElements
  } = useDequeOperations();

  return (
    <div className={styles.dequeVisualizerContent}>
      <ReactFlow
        nodes={dequeNodes}
        edges={[]}
        nodeTypes={nodeTypes}
        fitView
        onNodeDragStop={handleNodeDrag}
      >
        <Background variant="dots" gap={12} size={1} />
        <Controls />
      </ReactFlow>
      {message && <div className={styles.message}>{message}</div>}
      {showDequeControls && selectedDequeId && deques.some(d => d.id === selectedDequeId) && (
        <DequeControls
          dequeId={selectedDequeId}
          showDequeControls={showDequeControls}
          setShowDequeControls={setShowDequeControls}
          onAddFirst={handleAddFirst}
          onAddLast={handleAddLast}
          onRemoveFirst={handleRemoveFirst}
          onRemoveLast={handleRemoveLast}
          onPeekFirst={handlePeekFirst}
          onPeekLast={handlePeekLast}
          onClear={handleClear}
          onDelete={handleDeleteDeque}
        />
      )}
      <button onClick={handleAddDeque} className={styles.addDequeBtn}>Add Deque</button>
    </div>
  );
};

// Wrap in ReactFlowProvider and export as default
const DequeVisualizer = (props) => (
  <ReactFlowProvider>
    <DequeVisualizerContent {...props} />
  </ReactFlowProvider>
);

export default DequeVisualizer;