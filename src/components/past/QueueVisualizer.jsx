import React, { useState } from 'react';
import './queueVisualizer.css';

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

    const firstElement = { ...queue[0], isRemoving: true };
    setQueue(prevQueue => [firstElement, ...prevQueue.slice(1)]);

    setTimeout(() => {
      setQueue(prevQueue => prevQueue.slice(1));
      setError('');
    }, 300);
  };

  const peek = () => {
    if (queue.length === 0) {
      setError('Queue is empty!');
      return;
    }

    setQueue(prevQueue =>
      prevQueue.map((item, index) =>
        index === 0 ? { ...item, isPeeking: true } : item
      )
    );

    setTimeout(() => {
      setQueue(prevQueue =>
        prevQueue.map(item => ({ ...item, isPeeking: false }))
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
    <div className="queue-visualizer">
      <div className="queue-controls">
        <button className="queue-back-btn" onClick={onBack}>
          Back to Home
        </button>
        <form onSubmit={handleSubmit} className="queue-input-form">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Enter value"
            className="queue-input"
          />
          <button type="submit" className="queue-btn enqueue-btn">
            Enqueue
          </button>
        </form>
        <button onClick={dequeue} className="queue-btn dequeue-btn">
          Dequeue
        </button>
        <button onClick={peek} className="queue-btn peek-btn">
          Peek
        </button>
      </div>

      {error && <div className="queue-error">{error}</div>}

      <div className="queue-container">
        <div className="queue-labels">
          <div className="queue-front-label">Front</div>
          <div className="queue-rear-label">Rear</div>
        </div>
        <div className="queue-elements">
          {queue.map((item, index) => (
            <div
              key={item.id}
              className={`queue-element ${item.isNew ? 'new' : ''} 
                ${item.isRemoving ? 'removing' : ''} 
                ${item.isPeeking ? 'peeking' : ''}`}
            >
              <span className="queue-element-value">{item.value}</span>
              <span className="queue-element-index">{index}</span>
            </div>
          ))}
          {queue.length === 0 && (
            <div className="queue-empty">Queue is empty</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QueueVisualizer; 