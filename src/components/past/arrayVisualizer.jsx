import {useState, useEffect} from 'react'
import './arrayvisualizer.css'
import React from 'react'

export default function ArrayVisualizer(){
    const [array, setArray] = useState([]);
    const [position, setPosition] = useState({x:0, y:0});
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({x:0, y:0});
    const [draggedIndex, setDraggedIndex] = useState(null);
    const [editingIndex, setEditingIndex] = useState(null);
    const [inputValue, setInputValue] = useState('');

    const generateColor = (index) => {
        const goldenRatio = 0.618033988749895;
        const hue = (index * goldenRatio * 360) % 360;
        return `hsl(${hue}, 100%, 80%)`;
    }
    
    const addElement = () => {
        setArray([...array, array.length + 1])
    };

    const removeElement = (index, e) => {
        e.stopPropagation();
        console.log("Click detected on index:", index);
        console.log("Current array before removal:", array);
        
        const element = document.querySelectorAll('.array-box')[index];
        console.log("Found element:", element);
        element.classList.add('removing');
        console.log("Added removing class");
        
        setTimeout(() => {
            console.log("Timeout executing for index:", index);
            console.log("Array before filter:", array);
            element.classList.remove('removing');
            setArray(array.filter((_, i) => i !== index));
            console.log("Array after filter:", array.filter((_, i) => i !== index));
        }, 300);


    };

    const handleMouseDown = (e) => {
        // Don't initiate window drag if we're dragging an array element
        if (e.target.classList.contains('array-box')) {
            return;
        }
        
        setIsDragging(true);
        setDragStart({
            x: e.clientX - position.x,
            y: e.clientY - position.y
        });
    };

    const handleMouseMove = (e) => {
        if (isDragging){
            const newX = e.clientX - dragStart.x;
            const newY = e.clientY - dragStart.y;

            const elementWidth = 400;
            const elementHeight = 200;
            
            
            setPosition({
                x: Math.max(0, Math.min(window.innerWidth - elementWidth, newX)),
                y: Math.max(0, Math.min(window.innerHeight - elementHeight, newY))
            });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    }

    const handleDragStart = (e, index) => {
        e.stopPropagation();
        setDraggedIndex(index);
        e.target.classList.add('dragging');
    };

    const handleDragOver = (e, index) => {
        e.preventDefault();
        if (draggedIndex === null) return;
        
        // Reorder array
        const newArray = [...array];
        const draggedItem = newArray[draggedIndex];
        newArray.splice(draggedIndex, 1);
        newArray.splice(index, 0, draggedItem);
        
        setArray(newArray);
        setDraggedIndex(index);
    };

    const handleDragEnd = (e) => {
        e.target.classList.remove('dragging');
        setDraggedIndex(null);

        // Check if dropped outside the array container
        const arrayContainer = document.querySelector('.array-container');
        const rect = arrayContainer.getBoundingClientRect();
        
        if (
            e.clientX < rect.left || 
            e.clientX > rect.right || 
            e.clientY < rect.top || 
            e.clientY > rect.bottom
        ) {
            // Remove the dragged element
            setArray(array.filter((_, i) => i !== draggedIndex));
        }
    };

    const insertElement = (index) => {
        setEditingIndex(index + 1);
        setInputValue('');
        const newArray = [...array];
        newArray.splice(index + 1, 0, '');  // Add empty placeholder
        setArray(newArray);
    };

    const handleInputSubmit = (e) => {
        if (e.key === 'Enter' && inputValue.trim() !== '') {
            const newArray = [...array];
            newArray[editingIndex] = Number(inputValue);
            setArray(newArray);
            setEditingIndex(null);
            setInputValue('');
        }
    };

    useEffect(() => {
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);


        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        }
    }, [isDragging, dragStart]);


    return (
        <>
            <div className='window' 
                style={{
                    transform: `translate(${position.x}px, ${position.y}px)`,
                    position: 'absolute',
                    cursor: isDragging ? 'grabbing' : 'grab',
                    userSelect: 'none',
                }}
                onMouseDown={handleMouseDown}
            >
                <div className='array-container'>
                    <div className='array-boxes'>
                        {array.map((value, index) => (
                            <React.Fragment key={index}>
                                <div 
                                    className='array-box' 
                                    
                                    draggable="true"
                                    onDragStart={(e) => handleDragStart(e, index)}
                                    onDragOver={(e) => handleDragOver(e, index)}
                                    onDragEnd={handleDragEnd}
                                    style={{backgroundColor: generateColor(index)}}
                                >
                                    {editingIndex === index ? (
                                        <input
                                            type="number"
                                            value={inputValue}
                                            onChange={(e) => setInputValue(e.target.value)}
                                            onKeyDown={handleInputSubmit}
                                            autoFocus
                                        />
                                    ) : value}
                                </div>
                                <div className="insert-point">
                                    <button 
                                        className="insert-button" 
                                        onClick={() => insertElement(index)}
                                    >
                                        +
                                    </button>
                                </div>
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            </div>
            <button onClick={addElement}>Add Element</button>
        </>
    )


}