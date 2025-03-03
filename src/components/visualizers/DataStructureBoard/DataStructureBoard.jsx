import React, { useState, useCallback, useMemo } from 'react';
import ReactFlow, { Background, Controls } from 'reactflow';
import 'reactflow/dist/style.css';
import styles from './dataStructureBoard.module.css';
import { 
  StackElementNode,
  StackBase,
  StackControls, 
  useStackOperations 
} from '../dataStructures/Stack/StackNode';
import { 
  DequeElementNode,
  DequeBase,
  DequeControls, 
  useDequeOperations 
} from '../dataStructures/Deque/DequeNode';
import { ErrorBoundary } from 'react-error-boundary';

// Define nodeTypes outside of component
const nodeTypes = {
  stackNode: StackElementNode,
  stackBase: StackBase,
  dequeNode: DequeElementNode,
  dequeBase: DequeBase
};

const ErrorFallback = ({ error }) => {
  return (
    <div role="alert">
      <p>Something went wrong:</p>
      <pre>{error.message}</pre>
    </div>
  );
};

const DataStructureBoard = () => {
  const [selectedStructure, setSelectedStructure] = useState(null);
  
  const {
    stacks,
    selectedStackId,
    showStackControls,
    stackNodes,
    setShowStackControls,
    handleAddStack,
    handleStackSelect,
    handlePushToStack,
    handlePopFromStack,
    handlePeekStack,
    handleClearStack,
    handleDeleteStack,
    handleIsEmptyStack,
    handleSizeStack,
    handleNodeDrag,
  } = useStackOperations();

  const {
    deques,
    selectedDequeId,
    showDequeControls,
    dequeNodes,
    setShowDequeControls,
    handleAddDeque,
    handleDequeSelect,
    handleAddFirst,
    handleAddLast,
    handleRemoveFirst,
    handleRemoveLast,
    handlePeekFirst,
    handlePeekLast,
    handleClearDeque,
    handleDeleteDeque,
    handleIsEmptyDeque,
    handleSizeDeque,
  } = useDequeOperations();

  const onNodeClick = useCallback((event, node) => {
    if (node.type === 'stackBase') {
      handleStackSelect(node.data.stackId);
      setSelectedStructure('stack');
    } else if (node.type === 'dequeBase') {
      handleDequeSelect(node.data.dequeId);
      setSelectedStructure('deque');
    }
  }, [handleStackSelect, handleDequeSelect]);

  const onNodeDragStop = useCallback((event, node) => {
    if (node.type === 'stackBase') {
      handleNodeDrag(event, node);
    }
  }, [handleNodeDrag]);

  // Combine all nodes
  const nodes = useMemo(() => {
    return [...stackNodes, ...dequeNodes];
  }, [stackNodes, dequeNodes]);

  return (
    <div className={styles['data-structure-board']}>
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <ReactFlow
          nodes={nodes}
          edges={[]}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          onNodeDragStop={onNodeDragStop}
          fitView
        >
          <Background variant="dots" gap={12} size={1} />
          <Controls />
        </ReactFlow>
        
        {/* Controls wrapper with higher z-index */}
        <div className={styles.wrapper}>
          {selectedStructure === 'stack' && selectedStackId && (
            <StackControls
              stack={selectedStackId}
              onPush={handlePushToStack}
              onPop={handlePopFromStack}
              onPeek={handlePeekStack}
              onClear={handleClearStack}
              onIsEmpty={handleIsEmptyStack}
              onSize={handleSizeStack}
              showStackControls={showStackControls}
              setShowStackControls={setShowStackControls}
              onDeleteStack={handleDeleteStack}
            />
          )}
          
          {selectedStructure === 'deque' && selectedDequeId && (
            <DequeControls
              deque={selectedDequeId}
              onAddFirst={handleAddFirst}
              onAddLast={handleAddLast}
              onRemoveFirst={handleRemoveFirst}
              onRemoveLast={handleRemoveLast}
              onPeekFirst={handlePeekFirst}
              onPeekLast={handlePeekLast}
              onClear={handleClearDeque}
              onIsEmpty={handleIsEmptyDeque}
              onSize={handleSizeDeque}
              showDequeControls={showDequeControls}
              setShowDequeControls={setShowDequeControls}
              onDeleteDeque={handleDeleteDeque}
            />
          )}
        </div>

        <div className={styles.addButtons}>
          <button onClick={handleAddStack}>Add Stack</button>
          <button onClick={handleAddDeque}>Add Deque</button>
        </div>
      </ErrorBoundary>
    </div>
  );
};

export default DataStructureBoard;
