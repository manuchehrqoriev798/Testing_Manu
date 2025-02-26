import React, { useState } from 'react';
import styles from './styles.module.css';

const QueueVisualizer = ({ onBack }) => {
  const [queue, setQueue] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');
  const MAX_QUEUE_SIZE = 10;

  const enqueue = (value) => {
    if (queue.length >= MAX_QUEUE_SIZE) {
      setError('Queue is full! Cannot enqueue more elements.');
      return;
    }

    const newElement = {
      id: Date.now(),
      value: value,
      isNew: true
    };

    setQueue(prevQueue => [...prevQueue, newElement]);
    setInputValue('');
    setError('');

    // Remove the 'isNew' flag after animation
    setTimeout(() => {
      setQueue(prevQueue =>
        prevQueue.map(item =>
          item.id === newElement.id ? { ...item, isNew: false } : item
        )
      );
    }, 300);
  };

  const dequeue = () => {
    if (queue.length === 0) {
      setError('Queue is empty! Cannot dequeue.');
      return;
    }

    // Mark first element as removing
    setQueue(prevQueue =>
      prevQueue.map((item, index) =>
        index === 0 ? { ...item, isRemoving: true } : item
      )
    );

    // Remove the element after animation
    setTimeout(() => {
      setQueue(prevQueue => prevQueue.slice(1));
      setError('');
    }, 300);
  };

  const peek = () => {
    if (queue.length === 0) {
      setError('Queue is empty! Cannot peek.');
      return;
    }

    // Mark first element as peeking
    setQueue(prevQueue =>
      prevQueue.map((item, index) =>
        index === 0 ? { ...item, isPeeking: true } : item
      )
    );

    // Remove peeking effect after animation
    setTimeout(() => {
      setQueue(prevQueue =>
        prevQueue.map(item =>
          item.isPeeking ? { ...item, isPeeking: false } : item
        )
      );
    }, 1000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim()) {
      enqueue(inputValue.trim());
    }
  };

  return (
    <div className={styles.visualizer}>
      <div className={styles.controls}>
        <button onClick={onBack} className={styles.btn}>
          Back
        </button>
        <form onSubmit={handleSubmit} className={styles.inputForm}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Enter value"
            className={styles.input}
          />
          <button type="submit" className={styles.btn}>
            Enqueue
          </button>
        </form>
        <button onClick={dequeue} className={styles.btn}>
          Dequeue
        </button>
        <button onClick={peek} className={styles.btn}>
          Peek
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.container}>
        <div className={styles.labels}>
          <div className={styles.label}>Front</div>
          <div className={styles.label}>Rear</div>
        </div>
        <div className={styles.elements}>
          {queue.map((item, index) => (
            <div
              key={item.id}
              className={`${styles.element} ${item.isNew ? styles.new : ''} 
                ${item.isRemoving ? styles.removing : ''} 
                ${item.isPeeking ? styles.peeking : ''}`}
            >
              <span className={styles.value}>{item.value}</span>
              <span className={styles.index}>{index}</span>
            </div>
          ))}
          {queue.length === 0 && (
            <div className={styles.empty}>Queue is empty</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QueueVisualizer; 