import './App.css'
import { useState } from 'react'
import { ReactFlowProvider } from 'reactflow'

// Import visualizers from correct paths
import StackVisualizer from './components/visualizers/dataStructures/Stack'
import QueueVisualizer from './components/visualizers/dataStructures/Queue'
import DequeVisualizer from './components/visualizers/dataStructures/Deque'
import LinkedListVisualizer from './components/visualizers/dataStructures/LinkedList'
import DoublyLinkedListVisualizer from './components/visualizers/dataStructures/DoublyLinkedList'
import TreeVisualizer from './components/visualizers/dataStructures/Tree'
import GraphVisualizer from './components/visualizers/dataStructures/Graph'
import HeapVisualizer from './components/visualizers/dataStructures/Heap'
import HashTableVisualizer from './components/visualizers/dataStructures/HashTable'
import SkipListVisualizer from './components/visualizers/dataStructures/SkipList'
import TrieVisualizer from './components/visualizers/dataStructures/Trie'
import BloomFilterVisualizer from './components/visualizers/dataStructures/BloomFilter'
import CircularBufferVisualizer from './components/visualizers/dataStructures/CircularBuffer'
import SuffixTreeArrayVisualizer from './components/visualizers/dataStructures/SuffixTreeArray'

// Tree type visualizers
import BSTVisualizer from './components/visualizers/dataStructures/BST'
import AVLTreeVisualizer from './components/visualizers/dataStructures/AVLTree'
import RedBlackTreeVisualizer from './components/visualizers/dataStructures/RedBlackTree'
import BTreeVisualizer from './components/visualizers/dataStructures/BTree'
import SegmentTreeVisualizer from './components/visualizers/dataStructures/SegmentTree'
import FenwickTreeVisualizer from './components/visualizers/dataStructures/FenwickTree'

function App() {
  const [activeVisualizer, setActiveVisualizer] = useState(null)
  const [activeTreeType, setActiveTreeType] = useState(null)
  
  const handleBack = () => {
    if (activeTreeType) {
      setActiveTreeType(null)
    } else {
      setActiveVisualizer(null)
    }
  }
  
  // Render main menu or selected visualizer
  return (
    <div className="App">
      <div style={{height: '100%', width: '100%'}}>
        {activeVisualizer === null && (
          <div className="visualizer-menu">
            <h1>Data Structure Visualizers</h1>
            <div className="visualizer-buttons">
              <button onClick={() => setActiveVisualizer('queue')}>Queue</button>
              <button onClick={() => setActiveVisualizer('deque')}>Deque</button>
              <button onClick={() => setActiveVisualizer('linkedlist')}>Linked List</button>
              <button onClick={() => setActiveVisualizer('doublylinkedlist')}>Doubly Linked List</button>
              <button onClick={() => setActiveVisualizer('tree')}>Tree</button>
              <button onClick={() => setActiveVisualizer('treetypes')}>Tree Types</button>
              <button onClick={() => setActiveVisualizer('stack')}>Stack</button>
              <button onClick={() => setActiveVisualizer('graph')}>Graph</button>
              <button onClick={() => setActiveVisualizer('heap')}>Heap</button>
              <button onClick={() => setActiveVisualizer('hashtable')}>Hash Table</button>
              <button onClick={() => setActiveVisualizer('skiplist')}>Skip List</button>
              <button onClick={() => setActiveVisualizer('trie')}>Trie</button>
              <button onClick={() => setActiveVisualizer('bloomfilter')}>Bloom Filter</button>
              <button onClick={() => setActiveVisualizer('circularbuffer')}>Circular Buffer</button>
              <button onClick={() => setActiveVisualizer('suffixtreearray')}>Suffix Tree/Array</button>
            </div>
          </div>
        )}
        
        {/* Tree types submenu */}
        {activeVisualizer === 'treetypes' && activeTreeType === null && (
          <div className="visualizer-menu">
            <button onClick={handleBack} className="back-button">Back</button>
            <h1>Tree Type Visualizers</h1>
            <div className="visualizer-buttons">
              <button onClick={() => setActiveTreeType('bst')}>Binary Search Tree (BST)</button>
              <button onClick={() => setActiveTreeType('avl')}>AVL Tree</button>
              <button onClick={() => setActiveTreeType('redblack')}>Red-Black Tree</button>
              <button onClick={() => setActiveTreeType('btree')}>B-Tree</button>
              <button onClick={() => setActiveTreeType('segment')}>Segment Tree</button>
              <button onClick={() => setActiveTreeType('fenwick')}>Fenwick Tree (Binary Indexed Tree)</button>
            </div>
          </div>
        )}
        
        {/* Main visualizers */}
        {activeVisualizer === 'queue' && <QueueVisualizer onBack={handleBack} />}
        {activeVisualizer === 'deque' && <DequeVisualizer onBack={handleBack} />}
        {activeVisualizer === 'linkedlist' && <LinkedListVisualizer onBack={handleBack} />}
        {activeVisualizer === 'doublylinkedlist' && <DoublyLinkedListVisualizer onBack={handleBack} />}
        {activeVisualizer === 'tree' && <TreeVisualizer onBack={handleBack} />}
        {activeVisualizer === 'stack' && <StackVisualizer onBack={handleBack} />}
        {activeVisualizer === 'graph' && <GraphVisualizer onBack={handleBack} />}
        {activeVisualizer === 'heap' && <HeapVisualizer onBack={handleBack} />}
        {activeVisualizer === 'hashtable' && <HashTableVisualizer onBack={handleBack} />}
        {activeVisualizer === 'skiplist' && <SkipListVisualizer onBack={handleBack} />}
        {activeVisualizer === 'trie' && <TrieVisualizer onBack={handleBack} />}
        {activeVisualizer === 'bloomfilter' && <BloomFilterVisualizer onBack={handleBack} />}
        {activeVisualizer === 'circularbuffer' && <CircularBufferVisualizer onBack={handleBack} />}
        {activeVisualizer === 'suffixtreearray' && <SuffixTreeArrayVisualizer onBack={handleBack} />}
        
        {/* Tree Types visualizers */}
        {activeVisualizer === 'treetypes' && activeTreeType === 'bst' && <BSTVisualizer onBack={handleBack} />}
        {activeVisualizer === 'treetypes' && activeTreeType === 'avl' && <AVLTreeVisualizer onBack={handleBack} />}
        {activeVisualizer === 'treetypes' && activeTreeType === 'redblack' && <RedBlackTreeVisualizer onBack={handleBack} />}
        {activeVisualizer === 'treetypes' && activeTreeType === 'btree' && <BTreeVisualizer onBack={handleBack} />}
        {activeVisualizer === 'treetypes' && activeTreeType === 'segment' && <SegmentTreeVisualizer onBack={handleBack} />}
        {activeVisualizer === 'treetypes' && activeTreeType === 'fenwick' && <FenwickTreeVisualizer onBack={handleBack} />}
      </div>
    </div>
  )
}

export default App
