import React from 'react';
import styles from './styles.module.css';

const Button = ({ 
  children, 
  onClick, 
  variant = 'default', 
  size = 'medium',
  className = '',
  ...props 
}) => {
  return (
    <button
      className={`${styles.button} ${styles[variant]} ${styles[size]} ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
