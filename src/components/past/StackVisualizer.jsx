import React, { useState, useRef } from 'react';
import './stackVisualizer.css';

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

    const topElement = { ...stack[0], isRemoving: true };
    setStack(prevStack => [topElement, ...prevStack.slice(1)]);

    setTimeout(() => {
      setStack(prevStack => prevStack.slice(1));
      setError('');
    }, 300);
  };

  const peek = () => {
    if (stack.length === 0) {
      setError('Stack is empty!');
      return;
    }
    
    const topElement = stack[0];
    setStack(prevStack => 
      prevStack.map((item, index) => 
        index === 0 ? { ...item, isPeeking: true } : item
      )
    );

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
    <div className="stack-visualizer">
      <div className="stack-controls">
        <button className="stack-back-btn" onClick={onBack}>
          Back to Home
        </button>
        <form onSubmit={handleSubmit} className="stack-input-form">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Enter value"
            className="stack-input"
          />
          <button type="submit" className="stack-btn push-btn">
            Push
          </button>
        </form>
        <button onClick={pop} className="stack-btn pop-btn">
          Pop
        </button>
        <button onClick={peek} className="stack-btn peek-btn">
          Peek
        </button>
      </div>

      {error && <div className="stack-error">{error}</div>}

      <div className="stack-container" ref={stackRef}>
        <div className="stack-label">Top of Stack</div>
        <div className="stack-elements">
          {stack.map((item, index) => (
            <div
              key={item.id}
              className={`stack-element ${item.isNew ? 'new' : ''} 
                ${item.isRemoving ? 'removing' : ''} 
                ${item.isPeeking ? 'peeking' : ''}`}
            >
              <span className="stack-element-value">{item.value}</span>
              <span className="stack-element-index">{index}</span>
            </div>
          ))}
        </div>
        <div className="stack-base"></div>
      </div>
    </div>
  );
};

export default StackVisualizer; 