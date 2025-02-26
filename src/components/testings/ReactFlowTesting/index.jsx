import ReactFlow, { 
  Controls, 
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from 'reactflow'
import { useState } from 'react'
import styles from './styles.module.css'

// Define node types outside the component
const HorizontalNode = ({ data }) => (
  <div style={{
    width: '200px',
    height: '80px',
    border: '1px solid #777',
    borderRadius: '5px',
    padding: '10px',
    background: 'white'
  }}>
    {data.label}
  </div>
);

const VerticalNode = ({ data, id }) => {
  const [showArrow, setShowArrow] = useState(false);

  const handleClick = () => {
    const newNodeId = `${id}-${Date.now()}`;
    const newNode = {
      id: newNodeId,
      type: 'verticalNode',
      position: { x: data.position.x + 200, y: data.position.y },
      data: { 
        label: 'New Vertical Box',
        position: { x: data.position.x + 200, y: data.position.y }
      },
      draggable: true
    };

    const newEdge = {
      id: `${id}-${newNodeId}`,
      source: id,
      target: newNodeId,
      type: 'default'
    };

    data.onAdd(newNode, newEdge);
  };

  return (
    <div 
      style={{
        position: 'relative',
        width: '100px',
        height: '160px',
        border: '1px solid #777',
        borderRadius: '5px',
        padding: '10px',
        background: 'white'
      }}
      onMouseEnter={() => setShowArrow(true)}
      onMouseLeave={() => setShowArrow(false)}
    >
      {data.label}
      {showArrow && (
        <div 
          onClick={handleClick}
          style={{
            position: 'absolute',
            right: '-30px',
            top: '50%',
            transform: 'translateY(-50%)',
            cursor: 'pointer',
            fontSize: '24px'
          }}
        >
          →
        </div>
      )}
    </div>
  );
};

const TriangleNode = ({ data }) => (
  <div style={{
    position: 'relative',
    width: '0',
    height: '0',
    borderLeft: '50px solid transparent',
    borderRight: '50px solid transparent',
    borderBottom: '100px solid #777',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  }}>
    <div style={{
      position: 'absolute',
      top: '50px',
      color: 'white',
      width: '100px',
      textAlign: 'center'
    }}>
      {data.label}
    </div>
  </div>
);

// Define nodeTypes object outside the component
const nodeTypes = {
  horizontalNode: HorizontalNode,
  verticalNode: VerticalNode,
  triangleNode: TriangleNode
};

const ReactFlowTesting = () => {
  const [position, setPosition] = useState(100);

  const initialNodes = [
    {
      id: '1',
      type: 'horizontalNode',
      position: { x: 100, y: 100 },
      data: { label: 'Horizontal Rectangle' },
      draggable: true
    },
    {
      id: '2',
      type: 'verticalNode',
      position: { x: 400, y: 100 },
      data: { 
        label: 'Vertical Rectangle',
        position: { x: 400, y: 100 },
        onAdd: null
      },
      draggable: true
    },
    {
      id: '3',
      type: 'triangleNode',
      position: { x: position, y: 300 },
      data: { label: 'Triangle' },
      draggable: true
    }
  ];

  const initialEdges = [];

  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);

  const nodesWithCallback = nodes.map(node => ({
    ...node,
    position: node.id === '3' ? { x: position, y: 300 } : node.position,
    data: {
      ...node.data,
      position: node.position,
      onAdd: (newNode, newEdge) => {
        setNodes(nds => [...nds, newNode]);
        setEdges(eds => [...eds, newEdge]);
      }
    }
  }));

  const onNodesChange = (changes) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
  };

  const onEdgesChange = (changes) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
  };

  const handleIncrement = () => {
    setPosition(prev => prev + 50);
  };

  return (
    <div>
      <button 
        onClick={handleIncrement}
        style={{
          margin: '10px',
          padding: '8px 16px',
          backgroundColor: '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Move Triangle Right
      </button>
      <div style={{ width: '100%', height: '500px' }}>
        <ReactFlow
          nodes={nodesWithCallback}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
};

export default ReactFlowTesting
