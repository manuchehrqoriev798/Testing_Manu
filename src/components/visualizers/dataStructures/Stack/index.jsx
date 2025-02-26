import React, { useState, useRef } from 'react';
import styles from './styles.module.css';

const StackVisualizer = ({ onBack }) => {
  const [stack, setStack] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');
  const stackRef = useRef(null);
  const MAX_STACK_SIZE = 10;

  const push = (value) => {
    if (stack.length >= MAX_STACK_SIZE) {
      setError('Stack Overflow! Cannot push more elements.');
      return;
    }
    
    const newElement = {
      id: Date.now(),
      value: value,
      isNew: true
    };

    setStack(prevStack => [newElement, ...prevStack]);
    setInputValue('');
    setError('');

    // Remove the 'isNew' flag after animation
    setTimeout(() => {
      setStack(prevStack => 
        prevStack.map(item =>
          item.id === newElement.id ? { ...item, isNew: false } : item
        )
      );
    }, 300);
  };

  const pop = () => {
    if (stack.length === 0) {
      setError('Stack Underflow! Cannot pop from empty stack.');
      return;
    }

    // Mark top element as removing
    setStack(prevStack =>
      prevStack.map((item, index) =>
        index === 0 ? { ...item, isRemoving: true } : item
      )
    );

    // Remove the element after animation
    setTimeout(() => {
      setStack(prevStack => prevStack.slice(1));
      setError('');
    }, 300);
  };

  const peek = () => {
    if (stack.length === 0) {
      setError('Stack is empty! Cannot peek.');
      return;
    }

    // Mark top element as peeking
    setStack(prevStack =>
      prevStack.map((item, index) =>
        index === 0 ? { ...item, isPeeking: true } : item
      )
    );

    // Remove the peeking effect after a delay
    setTimeout(() => {
      setStack(prevStack =>
        prevStack.map(item => ({ ...item, isPeeking: false }))
      );
    }, 1000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim()) {
      push(inputValue.trim());
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
            Push
          </button>
        </form>
        <button onClick={pop} className={styles.btn}>
          Pop
        </button>
        <button onClick={peek} className={styles.btn}>
          Peek
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.container} ref={stackRef}>
        <div className={styles.label}>Top of Stack</div>
        <div className={styles.elements}>
          {stack.map((item, index) => (
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
        </div>
        <div className={styles.base}></div>
      </div>
    </div>
  );
};

export default StackVisualizer; 