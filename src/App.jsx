import './App.css'
import { useState } from 'react'
import { ReactFlowProvider } from 'reactflow'

// Import visualizers from correct paths
import StackVisualizer from './components/visualizers/dataStructures/Stack'
import QueueVisualizer from './components/visualizers/dataStructures/Queue'
import LinkedListVisualizer from './components/visualizers/dataStructures/LinkedList'
import TreeVisualizer from './components/visualizers/dataStructures/Tree'
import GraphVisualizer from './components/visualizers/dataStructures/Graph'
import HeapVisualizer from './components/visualizers/dataStructures/Heap'

function App() {
  const [activeVisualizer, setActiveVisualizer] = useState(null)
  
  const handleBack = () => {
    setActiveVisualizer(null)
  }
  
  // Render main menu or selected visualizer
  return (
    <div className="App">
      <div style={{height: '100%', width: '100%'}}>
        {activeVisualizer === null && (
          <div className="visualizer-menu">
            <h1>Data Structure Visualizers</h1>
            <div className="visualizer-buttons">
              <button onClick={() => setActiveVisualizer('stack')}>Stack</button>
              <button onClick={() => setActiveVisualizer('queue')}>Queue</button>
              <button onClick={() => setActiveVisualizer('linkedlist')}>Linked List</button>
              <button onClick={() => setActiveVisualizer('tree')}>Tree</button>
              <button onClick={() => setActiveVisualizer('graph')}>Graph</button>
              <button onClick={() => setActiveVisualizer('heap')}>Heap</button>
            </div>
          </div>
        )}
        
        {activeVisualizer === 'stack' && <StackVisualizer onBack={handleBack} />}
        {activeVisualizer === 'queue' && <QueueVisualizer onBack={handleBack} />}
        {activeVisualizer === 'linkedlist' && <LinkedListVisualizer onBack={handleBack} />}
        {activeVisualizer === 'tree' && <TreeVisualizer onBack={handleBack} />}
        {activeVisualizer === 'graph' && <GraphVisualizer onBack={handleBack} />}
        {activeVisualizer === 'heap' && <HeapVisualizer onBack={handleBack} />}
      </div>
    </div>
  )
}

export default App
