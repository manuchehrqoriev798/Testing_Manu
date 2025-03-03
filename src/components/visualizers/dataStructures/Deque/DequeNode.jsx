import React, { useState, useCallback, useMemo, memo } from 'react';
import ReactFlow, { ReactFlowProvider, Controls, Background } from 'reactflow';
import 'reactflow/dist/style.css';
import styles from './DequeNode.module.css';

// Constants for deque positioning
const WIDTH = 80;
const DEQUE_Y = 300;

// Deque Element Node Component
export const DequeElementNode = memo(({ data }) => {
  return (
    <div className={`${styles.dequeNode} ${data.isHighlighted ? styles.highlighted : ''}`}>
      {data.label}
    </div>
  );
});

// Deque Base Node Component
export const DequeBase = ({ data }) => {
  return (
    <div 
      className={`${styles.dequeBase} ${data.isSelected ? styles.selectedDequeBase : ''}`}
      onClick={() => data.onClick && data.onClick()}
    >
      <div className={styles.dequeLabelNode}>
        {data.name || 'Deque Base'}
      </div>
    </div>
  );
};

// Export DequeControls component
export const DequeControls = ({
  deque,
  onAddFirst,
  onAddLast,
  onRemoveFirst,
  onRemoveLast,
  onPeekFirst,
  onPeekLast,
  onClear,
  onIsEmpty,
  onSize,
  showDequeControls,
  setShowDequeControls,
  onDeleteDeque
}) => {
  // ... DequeControls implementation ...
};

// Export node types
export const dequeNodeTypes = {
  dequeElement: DequeElementNode,
  dequeBase: DequeBase
};

// Hook for managing deque operations
export const useDequeOperations = () => {
  const [deques, setDeques] = useState([
    {
      id: 'deque-1',
      name: 'Deque 1',
      elements: [],
      position: { x: 200, y: DEQUE_Y }
    }
  ]);
  const [selectedDequeId, setSelectedDequeId] = useState('deque-1');
  const [showDequeControls, setShowDequeControls] = useState(true);
  const [highlightedElements, setHighlightedElements] = useState(new Set());
  const [message, setMessage] = useState('');

  // Helper function to show temporary messages
  const showMessage = useCallback((text, duration = 2000) => {
    setMessage(text);
    setTimeout(() => setMessage(''), duration);
  }, []);

  // Define all handler functions first
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
      position: { x: 200 + (deques.length * 150), y: DEQUE_Y }
    };

    setDeques(prevDeques => [...prevDeques, newDeque]);
    setSelectedDequeId(newDequeId);
  }, [deques.length]);

  // Create deque nodes
  const dequeNodes = useMemo(() => {
    return deques.flatMap(deque => {
      const elementNodes = deque.elements.map((element, index) => ({
        id: `${deque.id}-element-${index}`,
        type: 'dequeNode',
        position: {
          x: deque.position.x + (index * WIDTH),
          y: deque.position.y
        },
        data: {
          label: element,
          dequeId: deque.id,
          isHighlighted: highlightedElements.has(`${deque.id}-${index}`)
        },
        draggable: false
      }));

      const baseNode = {
        id: `${deque.id}-base`,
        type: 'dequeBase',
        position: deque.position,
        data: {
          dequeId: deque.id,
          name: `Deque ${deque.id.split('-')[1]}`,
          isSelected: deque.id === selectedDequeId,
          onClick: () => handleDequeSelect(deque.id)
        },
        draggable: true
      };

      return [...elementNodes, baseNode];
    });
  }, [deques, selectedDequeId, highlightedElements, handleDequeSelect]);

  return {
    deques,
    selectedDequeId,
    showDequeControls,
    setShowDequeControls,
    message,
    dequeNodes,
    handleAddDeque,
    handleDequeSelect,
    // ... other handlers ...
  };
};

// Main content component
const DequeVisualizerContent = ({ onBack }) => {
  const {
    deques,
    selectedDequeId,
    showDequeControls,
    message,
    dequeNodes,
    handleAddDeque,
    handleDequeSelect,
    // ... other handlers ...
  } = useDequeOperations();

  // Define nodeTypes outside the render cycle
  const nodeTypes = useMemo(() => ({
    dequeNode: DequeElementNode,
    dequeBase: DequeBase,
  }), []);

  return (
    <div className={styles.dequeVisualizerContent}>
      <ReactFlow
        nodes={dequeNodes}
        edges={[]}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background variant="dots" gap={12} size={1} />
        <Controls />
      </ReactFlow>
      {showDequeControls && selectedDequeId && (
        <DequeControls
          dequeId={selectedDequeId}
          // ... control props ...
        />
      )}
    </div>
  );
};

// Wrap in ReactFlowProvider
const DequeNode = (props) => {
  return (
    <ReactFlowProvider>
      <DequeVisualizerContent {...props} />
    </ReactFlowProvider>
  );
};

export default DequeNode; 