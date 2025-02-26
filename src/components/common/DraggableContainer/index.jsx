import React from 'react';
import useDraggable from '../../../hooks/useDraggable';
import styles from './styles.module.css';

const DraggableContainer = ({ children, className, style = {} }) => {
  const { position, isDragging, handleMouseDown } = useDraggable();
  
  return (
    <div
      className={`${styles.container} ${className || ''} ${isDragging ? styles.dragging : ''}`}
      style={{
        ...style,
        transform: `translate(${position.x}px, ${position.y}px)`,
        position: 'absolute',
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
      onMouseDown={handleMouseDown}
    >
      {children}
    </div>
  );
};

export default DraggableContainer;
