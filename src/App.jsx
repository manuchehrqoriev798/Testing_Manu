import './App.css'
import { ReactFlowProvider } from 'reactflow'
import DataStructureBoard from './components/visualizers/DataStructureBoard/DataStructureBoard'

function App() {
  return (
    <div className="App">
      <div style={{height: '100%', width: '100%'}}>
        <ReactFlowProvider>
          <DataStructureBoard />
        </ReactFlowProvider>
      </div>
    </div>
  )
}

export default App
