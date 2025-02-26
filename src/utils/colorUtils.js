// Color palette for data structures
export const COLORS = {
  primary: '#61fbc0',
  secondary: '#4287f5',
  highlight: '#f7df1e',
  error: '#ff6b6b',
  success: '#4caf50',
  neutral: '#e0e0e0',
  text: '#333333',
};

// Generate harmonized colors for arrays
export const getHarmonizedColor = (index, total) => {
  const hue = (index / total) * 360;
  return `hsl(${hue}, 70%, 65%)`;
};

// Get color for data structure states
export const getStateColor = (state) => {
  switch (state) {
    case 'active': return COLORS.highlight;
    case 'comparing': return COLORS.secondary;
    case 'swapping': return COLORS.success;
    case 'error': return COLORS.error;
    default: return COLORS.neutral;
  }
};