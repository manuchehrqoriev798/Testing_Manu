import React from "react"
import {useState} from "react"
import ArrayVisualizer from "./multiplearrayVisualizer"

export default function ArraysManager (){
    const [arrays, setArrays] = useState({
        1: [1,2,3,4,5],
      });
    
      const [variables, setVariables] = useState({
        1: ''
      });
    
      const [nextId, setNextId] = useState(2);
    
      const addNewArray = () => {
        setArrays(prev => ({
          ...prev, [nextId]: [1,2,3,4,5]
        }));
        setNextId(prev => prev + 1);
      }
    
      const updateArray = (id, newArray) => {
        setArrays(prev => ({
          ...prev, 
          [id]: newArray
        }));
      };
    
      const updateVariable = (id, newValue) => {
        setVariables(prev => ({
          ...prev,
          [id]: newValue
        }));
      };
      
      const [globalDragSourceId, setGlobalDragSourceId] = useState(null);
      const [globalDraggedValue, setGlobalDraggedValue] = useState(null);
      const [globalDraggedIndex, setGlobalDraggedIndex] = useState(null);
      const [elementHasBeenDragged, setElementHasBeenDragged] = useState(false);
      const [globalLastIndex, setGlobalLastIndex] = useState(null);
      
    
    
      return (
        <>
            {Object.entries(arrays).map(([id, array]) => (
                <ArrayVisualizer 
                key={id}
                id={id}
                array={array}
                updateArray={updateArray}
                allArrays={arrays}
                globalDragSourceId={globalDragSourceId}
                setGlobalDragSourceId={setGlobalDragSourceId}
                globalDraggedValue={globalDraggedValue}
                setGlobalDraggedValue={setGlobalDraggedValue}
                globalDraggedIndex={globalDraggedIndex}
                setGlobalDraggedIndex={setGlobalDraggedIndex}
                elementHasBeenDragged={elementHasBeenDragged}
                setElementHasBeenDragged={setElementHasBeenDragged}
                globalLastIndex={globalLastIndex}
                setGlobalLastIndex={setGlobalLastIndex}
                />
            ))}
            <button 
                onClick={addNewArray}
                style={{
                    position: 'fixed',
                    bottom: '20px',
                    right: '20px',
                    backgroundColor: '#61fbc0',
                    padding: '15px 30px',
                    borderRadius: '8px',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
                }}
            >
                Add New Array
            </button>
        </>
    )
 }