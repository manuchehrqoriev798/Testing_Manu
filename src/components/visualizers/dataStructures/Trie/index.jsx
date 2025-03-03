import React, { useState, useCallback, useEffect, useRef } from 'react';
import ReactFlow, { 
  ReactFlowProvider, 
  Controls, 
  Background, 
  applyNodeChanges,
  MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import styles from './styles.module.css';

// Custom TrieNode component
const TrieNode = ({ data }) => {
  const { label, isWord, isHighlighted } = data;
  
  return (
    <div className={`${styles.trieNode} ${isWord ? styles.wordNode : ''} ${isHighlighted ? styles.highlighted : ''}`}>
      <div className={styles.nodeLabel}>{label}</div>
      {isWord && <div className={styles.wordIndicator}>✓</div>}
    </div>
  );
};

// Main content component
const TrieVisualizerContent = ({ onBack }) => {
  // Define nodeTypes OUTSIDE the component render function
  const nodeTypes = useRef({ trieNode: TrieNode }).current;
  
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [message, setMessage] = useState(null);
  const [highlightedNodeId, setHighlightedNodeId] = useState(null);
  const [highlightedPath, setHighlightedPath] = useState([]);
  const [trie, setTrie] = useState(() => createNewTrie());
  
  // Create a new trie data structure
  function createNewTrie() {
    return {
      root: { children: {}, isWord: false, id: 'root' },
      nodeCount: 1
    };
  }
  
  // Show message with auto-dismiss
  const showMessage = useCallback((text, duration = 2000) => {
    setMessage(text);
    setTimeout(() => setMessage(null), duration);
  }, []);
  
  // Insert a word into the trie
  const insertWord = useCallback((word) => {
    if (!word.trim()) {
      showMessage("Please enter a word to insert");
      return;
    }
    
    const normalizedWord = word.trim().toLowerCase();
    setTrie(prevTrie => {
      const newTrie = JSON.parse(JSON.stringify(prevTrie));
      let current = newTrie.root;
      const path = ['root'];
      
      for (let i = 0; i < normalizedWord.length; i++) {
        const char = normalizedWord[i];
        if (!current.children[char]) {
          const newNodeId = `node-${newTrie.nodeCount}`;
          newTrie.nodeCount++;
          current.children[char] = {
            char,
            id: newNodeId,
            children: {},
            isWord: false
          };
          path.push(newNodeId);
        } else {
          path.push(current.children[char].id);
        }
        current = current.children[char];
      }
      
      // Mark the last node as a word
      current.isWord = true;
      
      // Highlight the insertion path
      setHighlightedPath(path);
      setTimeout(() => setHighlightedPath([]), 2000);
      
      return newTrie;
    });
    
    setInputValue('');
    showMessage(`Inserted "${normalizedWord}" into the trie`);
  }, [showMessage]);
  
  // Search for a word or prefix in the trie
  const searchTrie = useCallback((word, isPrefix = false) => {
    if (!word.trim()) {
      showMessage(`Please enter a ${isPrefix ? 'prefix' : 'word'} to search`);
      return false;
    }
    
    const normalizedWord = word.trim().toLowerCase();
    let current = trie.root;
    const path = ['root'];
    
    for (let i = 0; i < normalizedWord.length; i++) {
      const char = normalizedWord[i];
      if (!current.children[char]) {
        showMessage(`"${normalizedWord}" not found in the trie`);
        return false;
      }
      current = current.children[char];
      path.push(current.id);
    }
    
    // For word search, check if it's marked as a word
    if (!isPrefix && !current.isWord) {
      showMessage(`"${normalizedWord}" is a prefix but not a complete word in the trie`);
      return false;
    }
    
    // Highlight the search path
    setHighlightedPath(path);
    setTimeout(() => setHighlightedPath([]), 2000);
    
    showMessage(`${isPrefix ? 'Prefix' : 'Word'} "${normalizedWord}" found in the trie`);
    return true;
  }, [trie, showMessage]);
  
  // Delete a word from the trie
  const deleteWord = useCallback((word) => {
    if (!word.trim()) {
      showMessage("Please enter a word to delete");
      return;
    }
    
    const normalizedWord = word.trim().toLowerCase();
    
    // First check if the word exists
    if (!searchTrie(normalizedWord, false)) {
      return;
    }
    
    setTrie(prevTrie => {
      const newTrie = JSON.parse(JSON.stringify(prevTrie));
      
      // Helper function to delete nodes recursively
      const deleteHelper = (node, word, index) => {
        // Base case: end of word
        if (index === word.length) {
          node.isWord = false;
          return Object.keys(node.children).length === 0;
        }
        
        const char = word[index];
        
        // If character doesn't exist, word is not in trie
        if (!node.children[char]) return false;
        
        // Recursively delete
        const shouldDeleteChild = deleteHelper(node.children[char], word, index + 1);
        
        // Delete the child if needed
        if (shouldDeleteChild) {
          delete node.children[char];
        }
        
        // Return true if this node should also be deleted
        return Object.keys(node.children).length === 0 && !node.isWord;
      };
      
      deleteHelper(newTrie.root, normalizedWord, 0);
      return newTrie;
    });
    
    showMessage(`Deleted "${normalizedWord}" from the trie`);
    setSearchValue('');
  }, [searchTrie, showMessage]);
  
  // Generate nodes and edges from the trie data structure
  const generateGraph = useCallback(() => {
    const newNodes = [];
    const newEdges = [];
    
    // Helper function to traverse the trie recursively
    const traverseTrie = (node, x, y, level, parent = null) => {
      const nodeWidth = 80; // width of node + spacing
      const verticalSpacing = 100; // vertical spacing between levels
      
      const childKeys = Object.keys(node.children);
      const nodeId = node.id;
      
      // Create node
      newNodes.push({
        id: nodeId,
        type: 'trieNode',
        data: { 
          label: node === trie.root ? 'Root' : node.char,
          isWord: node.isWord,
          isHighlighted: highlightedPath.includes(nodeId)
        },
        position: { x, y }
      });
      
      // Create edge from parent
      if (parent) {
        newEdges.push({
          id: `e-${parent}-${nodeId}`,
          source: parent,
          target: nodeId,
          type: 'default',
          markerEnd: {
            type: MarkerType.ArrowClosed,
          },
          style: { 
            stroke: highlightedPath.includes(parent) && highlightedPath.includes(nodeId) 
              ? '#ff9800' 
              : '#888',
            strokeWidth: highlightedPath.includes(parent) && highlightedPath.includes(nodeId) 
              ? 3 
              : 1
          }
        });
      }
      
      // Calculate width needed for all children
      const totalWidth = Math.max(childKeys.length * nodeWidth, nodeWidth);
      const startX = x - totalWidth / 2 + nodeWidth / 2;
      
      // Recursively add all children
      childKeys.forEach((key, index) => {
        const childX = startX + index * nodeWidth;
        const childY = y + verticalSpacing;
        traverseTrie(node.children[key], childX, childY, level + 1, nodeId);
      });
    };
    
    // Start traversal from root
    traverseTrie(trie.root, 300, 50, 0);
    
    setNodes(newNodes);
    setEdges(newEdges);
  }, [trie, highlightedPath]);
  
  // Generate the graph when trie or highlighted path changes
  useEffect(() => {
    generateGraph();
  }, [trie, highlightedPath, generateGraph]);
  
  // Handle node changes (e.g., dragging)
  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  
  // Search form submit
  const handleSearchSubmit = useCallback((e) => {
    e.preventDefault();
    searchTrie(searchValue, false);
  }, [searchValue, searchTrie]);
  
  // Prefix search form submit
  const handlePrefixSubmit = useCallback((e) => {
    e.preventDefault();
    searchTrie(searchValue, true);
  }, [searchValue, searchTrie]);
  
  // Insert form submit
  const handleInsertSubmit = useCallback((e) => {
    e.preventDefault();
    insertWord(inputValue);
  }, [inputValue, insertWord]);
  
  // Delete form submit
  const handleDeleteSubmit = useCallback((e) => {
    e.preventDefault();
    deleteWord(searchValue);
  }, [searchValue, deleteWord]);
  
  // Clear the trie
  const clearTrie = useCallback(() => {
    setTrie(createNewTrie());
    showMessage("Trie cleared");
  }, [showMessage]);
  
  return (
    <div className={styles.visualizer}>
      {/* Message display */}
      {message && <div className={styles.message}>{message}</div>}
      
      {/* Controls for trie interaction */}
      <div className={styles.controls}>
        <button onClick={onBack} className={styles.btn}>
          Back
        </button>
        
        {/* Insert Form */}
        <form onSubmit={handleInsertSubmit} className={styles.inputForm}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Enter word to insert"
            className={styles.input}
          />
          <button type="submit" className={styles.btn}>
            Insert
          </button>
        </form>
        
        {/* Search/Delete Form */}
        <form className={styles.searchForm}>
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Enter word to search/delete"
            className={styles.input}
          />
          <div className={styles.searchButtons}>
            <button type="button" onClick={handleSearchSubmit} className={styles.btn}>
              Search Word
            </button>
            <button type="button" onClick={handlePrefixSubmit} className={styles.btn}>
              Search Prefix
            </button>
            <button type="button" onClick={handleDeleteSubmit} className={styles.btn}>
              Delete Word
            </button>
          </div>
        </form>
        
        <button onClick={clearTrie} className={`${styles.btn} ${styles.clearBtn}`}>
          Clear Trie
        </button>
      </div>

      {/* Trie Information */}
      <div className={styles.trieInfo}>
        <h3>Trie Visualizer</h3>
        <p>
          A trie is a tree-like data structure used to store a dynamic set of strings.
          Words with common prefixes share nodes in the tree.
        </p>
        <ul className={styles.legend}>
          <li><span className={styles.rootNode}></span> Root Node</li>
          <li><span className={styles.regularNode}></span> Character Node</li>
          <li><span className={styles.wordNode}></span> Word Ending</li>
          <li><span className={styles.highlightedPath}></span> Highlighted Path</li>
        </ul>
      </div>

      {/* ReactFlow component */}
      <div className={styles.flowContainer}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
};

// Wrap in ReactFlowProvider
const TrieVisualizer = (props) => {
  return (
    <ReactFlowProvider>
      <TrieVisualizerContent {...props} />
    </ReactFlowProvider>
  );
};

export default TrieVisualizer; 