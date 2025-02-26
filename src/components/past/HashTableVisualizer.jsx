import React, { useState, useEffect } from 'react';
import './hashTableVisualizer.css';

const HashTableVisualizer = ({ onBack }) => {
  const [table, setTable] = useState([]);
  const [inputKey, setInputKey] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [message, setMessage] = useState('');
  const [animatingIndices, setAnimatingIndices] = useState([]);
  const [collisionMethod, setCollisionMethod] = useState('chaining');
  const [probeSequence, setProbeSequence] = useState([]);
  const [loadFactor, setLoadFactor] = useState(0);
  const TABLE_SIZE = 10;

  useEffect(() => {
    initializeTable();
  }, []);

  const handleCollisionMethodChange = (newMethod) => {
    const currentData = collectTableData();
    setCollisionMethod(newMethod);
    
    const newTable = Array(TABLE_SIZE).fill(null).map(() => 
      newMethod === 'chaining' ? [] : null
    );

    // Create a map to keep track of the latest value for each key
    const latestValues = new Map();
    currentData.forEach(({ key, value }) => {
      latestValues.set(key, value);
    });

    // Now insert only the latest value for each key
    latestValues.forEach((value, key) => {
      if (newMethod === 'chaining') {
        const index = hash(key);
        newTable[index].push({ key, value });
      } else {
        let index = hash(key);
        while (newTable[index] && !newTable[index].deleted) {
          index = (index + 1) % TABLE_SIZE;
        }
        newTable[index] = { key, value };
      }
    });

    setTable(newTable);
    setLoadFactor(calculateLoadFactor(newTable));
    setMessage(`Switched to ${newMethod} collision resolution`);
  };

  const collectTableData = () => {
    const data = [];
    if (collisionMethod === 'chaining') {
      table.forEach(chain => {
        chain.forEach(item => {
          data.push({ key: item.key, value: item.value });
        });
      });
    } else {
      table.forEach(item => {
        if (item && !item.deleted) {
          data.push({ key: item.key, value: item.value });
        }
      });
    }
    return data;
  };

  const initializeTable = () => {
    const initialTable = Array(TABLE_SIZE).fill(null).map(() => 
      collisionMethod === 'chaining' ? [] : null
    );
    setTable(initialTable);
    setLoadFactor(0);
    setProbeSequence([]);
  };

  const calculateLoadFactor = (newTable) => {
    if (collisionMethod === 'chaining') {
      const totalItems = newTable.reduce((sum, chain) => {
        return sum + (chain ? chain.length : 0);
      }, 0);
      return (totalItems / TABLE_SIZE).toFixed(2);
    } else {
      const occupiedSlots = newTable.filter(slot => slot && !slot.deleted).length;
      return (occupiedSlots / TABLE_SIZE).toFixed(2);
    }
  };

  const hash = (key) => {
    let total = 0;
    for (let i = 0; i < key.length; i++) {
      total = (total * 31 + key.charCodeAt(i)) >>> 0;
    }
    return total % TABLE_SIZE;
  };

  const findNextEmpty = (startIndex, currentTable) => {
    let index = startIndex;
    const probing = [startIndex];
    let attempts = 0;

    while (attempts < TABLE_SIZE) {
      if (!currentTable[index] || currentTable[index].deleted) {
        return { index, probing };
      }
      attempts++;
      index = (index + 1) % TABLE_SIZE;
      probing.push(index);
    }
    return { index: null, probing };
  };

  const insert = async () => {
    if (!inputKey || !inputValue) {
      setMessage('Please enter both key and value');
      return;
    }

    const initialIndex = hash(inputKey);
    const newTable = [...table];

    if (collisionMethod === 'chaining') {
      setAnimatingIndices([initialIndex]);
      const chain = [...newTable[initialIndex]];
      const existingPairIndex = chain.findIndex(pair => pair.key === inputKey);

      if (existingPairIndex !== -1) {
        chain[existingPairIndex] = {
          key: inputKey,
          value: inputValue,
          isNew: true
        };
        setMessage(`Updated key "${inputKey}" at index ${initialIndex}`);
      } else {
        chain.push({
          key: inputKey,
          value: inputValue,
          isNew: true
        });
        setMessage(`Inserted at index ${initialIndex} (chain length: ${chain.length})`);
      }
      newTable[initialIndex] = chain;
    } else {
      let index = initialIndex;
      const probing = [initialIndex];
      let attempts = 0;

      while (attempts < TABLE_SIZE) {
        if (!newTable[index] || newTable[index].deleted) {
          newTable[index] = {
            key: inputKey,
            value: inputValue,
            isNew: true
          };
          setMessage(`Inserted at index ${index} (probed ${attempts} time${attempts !== 1 ? 's' : ''})`);
          break;
        }
        attempts++;
        index = (index + 1) % TABLE_SIZE;
        probing.push(index);

        if (attempts === TABLE_SIZE) {
          setMessage('Hash table is full!');
          return;
        }
      }

      setProbeSequence(probing);
      setAnimatingIndices(probing);
    }

    setTable(newTable);
    setLoadFactor(calculateLoadFactor(newTable));
    setInputKey('');
    setInputValue('');

    setTimeout(() => {
      setAnimatingIndices([]);
      setProbeSequence([]);
      const clearedTable = newTable.map(cell => {
        if (collisionMethod === 'chaining') {
          return cell.map(item => ({ ...item, isNew: false }));
        } else {
          return cell ? { ...cell, isNew: false } : null;
        }
      });
      setTable(clearedTable);
    }, 500);
  };

  const search = async () => {
    if (!inputKey) {
      setMessage('Please enter a key to search');
      return;
    }

    const initialIndex = hash(inputKey);
    setAnimatingIndices([initialIndex]);

    if (collisionMethod === 'chaining') {
      const chain = table[initialIndex];
      const found = chain.find(pair => pair.key === inputKey);

      if (found) {
        setMessage(`Found: ${found.key} → ${found.value}`);
      } else {
        setMessage(`Key "${inputKey}" not found`);
      }
    } else {
      let index = initialIndex;
      const probing = [initialIndex];
      let attempts = 0;

      while (attempts < TABLE_SIZE) {
        if (!table[index]) {
          setProbeSequence(probing);
          setMessage(`Key "${inputKey}" not found`);
          break;
        }
        if (table[index].key === inputKey && !table[index].deleted) {
          setProbeSequence(probing);
          setMessage(`Found: ${table[index].key} → ${table[index].value}`);
          break;
        }
        attempts++;
        index = (index + 1) % TABLE_SIZE;
        probing.push(index);
      }
      setAnimatingIndices(probing);
    }

    setTimeout(() => {
      setAnimatingIndices([]);
      setProbeSequence([]);
    }, 1000);
  };

  const deleteKey = async () => {
    if (!inputKey) {
      setMessage('Please enter a key to delete');
      return;
    }

    const initialIndex = hash(inputKey);
    const newTable = [...table];

    if (collisionMethod === 'chaining') {
      setAnimatingIndices([initialIndex]);
      const chain = newTable[initialIndex];
      const existingPairIndex = chain.findIndex(pair => pair.key === inputKey);

      if (existingPairIndex !== -1) {
        chain.splice(existingPairIndex, 1);
        setMessage(`Deleted key "${inputKey}"`);
      } else {
        setMessage(`Key "${inputKey}" not found`);
      }
    } else {
      let index = initialIndex;
      const probing = [initialIndex];
      let attempts = 0;

      while (attempts < TABLE_SIZE) {
        if (!newTable[index]) {
          setMessage(`Key "${inputKey}" not found`);
          break;
        }
        if (newTable[index].key === inputKey && !newTable[index].deleted) {
          newTable[index] = { deleted: true };
          setMessage(`Deleted key "${inputKey}"`);
          break;
        }
        attempts++;
        index = (index + 1) % TABLE_SIZE;
        probing.push(index);
      }
      setProbeSequence(probing);
      setAnimatingIndices(probing);
    }

    setTable(newTable);
    setLoadFactor(calculateLoadFactor(newTable));
    setInputKey('');

    setTimeout(() => {
      setAnimatingIndices([]);
      setProbeSequence([]);
    }, 1000);
  };

  return (
    <div className="hashtable-container">
      <div className="hashtable-header">
        <button className="hashtable-back-btn" onClick={onBack}>
          <span>←</span> Back to Home
        </button>
        <h2>Hash Table Visualizer</h2>
        <div className="hashtable-stats">
          <div className="hashtable-stat-item">
            <span className="hashtable-stat-label">Load Factor:</span>
            <span className="hashtable-stat-value">{loadFactor}</span>
          </div>
          <div className="hashtable-stat-item">
            <span className="hashtable-stat-label">Table Size:</span>
            <span className="hashtable-stat-value">{TABLE_SIZE}</span>
          </div>
        </div>
      </div>

      <div className="hashtable-controls">
        <div className="hashtable-method-selector">
          <h3>Collision Resolution Method</h3>
          <div className="hashtable-method-options">
            <label className={`hashtable-method-option ${collisionMethod === 'chaining' ? 'selected' : ''}`}>
              <input
                type="radio"
                value="chaining"
                checked={collisionMethod === 'chaining'}
                onChange={(e) => handleCollisionMethodChange(e.target.value)}
              />
              <div className="hashtable-method-content">
                <span className="hashtable-method-name">Chaining</span>
              </div>
            </label>
            <label className={`hashtable-method-option ${collisionMethod === 'linear' ? 'selected' : ''}`}>
              <input
                type="radio"
                value="linear"
                checked={collisionMethod === 'linear'}
                onChange={(e) => handleCollisionMethodChange(e.target.value)}
              />
              <div className="hashtable-method-content">
                <span className="hashtable-method-name">Linear Probing</span>
              </div>
            </label>
          </div>
        </div>

        <div className="hashtable-input-section">
          <div className="hashtable-input-group">
            <input
              type="text"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              placeholder="Enter key"
              className="hashtable-key-input"
            />
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Enter value"
              className="hashtable-value-input"
            />
          </div>
          <div className="hashtable-button-group">
            <button onClick={insert} className="hashtable-insert-btn">Insert</button>
            <button onClick={search} className="hashtable-search-btn">Search</button>
            <button onClick={deleteKey} className="hashtable-delete-btn">Delete</button>
          </div>
        </div>

        <div className="hashtable-message-box">
          {message}
        </div>
      </div>

      <div className="hashtable-table">
        {table.map((cell, index) => (
          <div 
            key={index} 
            className={`hashtable-row ${
              animatingIndices.includes(index) ? 'animating' : ''
            } ${
              probeSequence.includes(index) ? 'probing' : ''
            }`}
          >
            <div className="hashtable-index">
              <div className="hashtable-bucket-number">{index}</div>
              <div className="hashtable-hash-info">hash = {index}</div>
            </div>
            <div className="hashtable-cell">
              {collisionMethod === 'chaining' ? (
                <div className="hashtable-chain">
                  {cell.map((pair, chainIndex) => (
                    <div 
                      key={chainIndex} 
                      className={`hashtable-pair ${pair.isNew ? 'new' : ''}`}
                    >
                      <span className="hashtable-key">{pair.key}</span>
                      <span className="hashtable-arrow">→</span>
                      <span className="hashtable-value">{pair.value}</span>
                      {chainIndex < cell.length - 1 && (
                        <div className="hashtable-pointer">→</div>
                      )}
                    </div>
                  ))}
                  {cell.length === 0 && <div className="hashtable-empty">Empty</div>}
                </div>
              ) : (
                <div className="hashtable-linear-cell">
                  {cell ? (
                    <div className={`hashtable-bucket ${cell.isNew ? 'new' : ''}`}>
                      {cell.deleted ? (
                        <div className="hashtable-tombstone">Deleted</div>
                      ) : (
                        <>
                          <span className="hashtable-key">{cell.key}</span>
                          <span className="hashtable-arrow">→</span>
                          <span className="hashtable-value">{cell.value}</span>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="hashtable-empty">Empty</div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HashTableVisualizer;
