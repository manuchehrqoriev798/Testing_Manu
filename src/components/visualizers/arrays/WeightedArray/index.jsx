import {useState, useEffect} from 'react'
import './arrayVisualizerWeighted.css'
import React from 'react'

export default function ArrayVisualizerWeighted(){
    const [array, setArray] = useState([1,2,3,4,5,5,6]);

    const [draggedIndex, setDraggedIndex] = useState(null);
    const [editingIndex, setEditingIndex] = useState(null);
    const [inputValue, setInputValue] = useState('');
    const [hoveredInsertPoint, setHoveredInsertPoint] = useState(null);
   
    const [baseWidth, setBaseWidth] = useState(10);
    const [lastIndex, setLastIndex] = useState(null);

    const [isDragging, setIsDragging] = useState(false);

    const MAX_HEIGHT = 300; // maximum height in pixels
    const BASE_HEIGHT = 50; // minimum height for any bar

    const getHarmonizedColor = (index, total) => {
        const goldenRatio = 0.618033988749895;
        const hue = (index * goldenRatio * 360) % 360;
        return `hsl(${hue}, 85%, 65%)`;
    };
    
    
    const removeElement = (index, e) => {
        e.stopPropagation();
        console.log("Click detected on index:", index);
        console.log("Current array before removal:", array);
        
        const element = document.querySelectorAll('.array-box-weighted')[index];
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

  


    const handleDragStart = (e, index) => {
        e.stopPropagation();
        setDraggedIndex(index);
        
        const box = e.target;
        box.classList.add('being-dragged');
        
        // Delay setting opacity to ensure the drag image is created first
        requestAnimationFrame(() => {
            box.style.opacity = '0';
        });
    };

    const handleDragOver = (e, index) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('index:', index);
        setLastIndex(index)
       
        if (draggedIndex === null) return;

        // Get all array boxes
        const boxes = document.querySelectorAll('.array-box-weighted');
        
        // Clear previous shifts
        boxes.forEach(box => {
            box.classList.remove('shift-right', 'shift-left');
        });

        // Apply shifts based on dragged element position
        if (draggedIndex !== index) {
            if (draggedIndex < index) {
                // Dragging from left to right
                boxes.forEach((box, i) => {
                    if (i > draggedIndex && i <= index) {
                        box.classList.add('shift-left');
                    }
                });
            } else {
                // Dragging from right to left
                boxes.forEach((box, i) => {
                    if (i >= index && i < draggedIndex) {
                        box.classList.add('shift-right');
                    }
                });
            }
        }
    };

    const handleDragEnd = (e,index) => {
        e.stopPropagation();
        
        if (draggedIndex !== null) {
            const boxes = document.querySelectorAll('.array-box-weighted');
            let targetIndex = draggedIndex;
            
            boxes[draggedIndex].classList.remove('being-dragged');
            boxes[draggedIndex].style.opacity = '1';
            
            console.log('Starting handleDragEnd. Initial draggedIndex:', draggedIndex);
            
            // Find the boundary between left-shifted and right-shifted elements
           targetIndex = lastIndex;

           const arrayContainer = document.querySelector('.array-container-weighted');
           const mouseX = event.clientX;
           const mouseY = event.clientY;
           const containerRect = arrayContainer.getBoundingClientRect();
           
           const isOutsideContainer = 
               mouseX < containerRect.left || 
               mouseX > containerRect.right ||
               mouseY < containerRect.top || 
               mouseY > containerRect.bottom;
               
           if (isOutsideContainer) {
               console.log('Element dragged outside container - removing');
               setArray(array.filter((_, index) => index !== lastIndex));
               
           } else {
            
            // Reorder the array if the position changed
            if (targetIndex !== draggedIndex) {
                
                const newArray = [...array];
                const [draggedItem] = newArray.splice(draggedIndex, 1);
                newArray.splice(targetIndex, 0, draggedItem);
                setArray(newArray);
                console.log('New array:', newArray);
            } else {
                console.log('No reordering needed');
            }
            
            // Clear all shifts and restore opacity
            boxes.forEach(box => {
                box.classList.remove('shift-right', 'shift-left', 'being-dragged');
                box.style.opacity = '1';
            });
            
            setDraggedIndex(null);
        }
    }
    };

    const insertElement = (index) => {
        // For the first insert point
        if (index === 0) {
            setEditingIndex(0);
            setInputValue('');
            const newArray = [...array];
            newArray.splice(0, 0, '');  // Insert at beginning
            setArray(newArray);
            return;
        }

        // For all other insert points
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

    const handleInputChange = (e) => {
        const value = e.target.value;
        setInputValue(value);
        // Adjust input width based on content
        e.target.style.width = `${Math.max(value.length * 15, 30)}px`;
    };

    // New handler to remove the empty element when input loses focus
    const handleInputBlur = () => {
        // If the input is empty even after trimming whitespace,
        // remove the element at the editingIndex
        if (!inputValue.trim()) {
            setArray((prevArray) => prevArray.filter((_, i) => i !== editingIndex));
        }
        // End editing regardless of whether there was input
        setEditingIndex(null);
        setInputValue('');
    };

  

    useEffect(() => {
        const calculateWidth = () => {
            const insertPointWidth = 10; // Width of each insert point
            const boxWidth = 50; // Width of each array box
            const numInsertPoints = array.length + 1; // Total insert points (including first one)
            const numBoxes = Math.max(array.length, 3);
            
            // // Calculate base width
            const baseWidth = (numInsertPoints * insertPointWidth) + (numBoxes * boxWidth);
            setBaseWidth(baseWidth);

            
            
            // Store in state to use in render

            const container = document.querySelector('.array-container-weighted');
            if (container) {
                console.log("array-container --base-width:", 
                    window.getComputedStyle(container).getPropertyValue('--base-width')
                );
            }

        };

        calculateWidth();
    }, [baseWidth, array]); // Recalculate when array changes

    const normalizeHeight = (value) => {
        const maxValue = Math.max(Math.max(...array), 1);
        const normalizedValue = (value / maxValue) * (MAX_HEIGHT - BASE_HEIGHT) + BASE_HEIGHT;
        return `${normalizedValue}px`;
    };

    return (
        <>
            <div className='window-weighted'
                onMouseDown={e => e.stopPropagation()} 
            >
                <div 
                    className='array-container-weighted'
                    style={{ '--base-width': baseWidth }}
                >
                    <div className="array-name-weighted">Weighted Array</div>
                   
                    
                    <div className='array-boxes-weighted nodrag'>
                        <div 
                            className="insert-point-weighted"
                            onMouseEnter={() => setHoveredInsertPoint(0)}
                            onMouseLeave={() => setHoveredInsertPoint(null)}
                            style={{
                                height: normalizeHeight(array[0] || 0),  // Just use the first element's height
                                alignSelf: 'flex-end'
                            }}
                        >
                            <button 
                                className="insert-button-weighted" 
                                onClick={() => {insertElement(0);}}
                            >
                                +
                            </button>
                        </div>
                        
                        {array.map((value, index) => (
                            <React.Fragment key={index}>
                                <div 
                                    className={`array-box-weighted ${hoveredInsertPoint !== null ? 
                                        (index < hoveredInsertPoint ? 'before-insert' : 'after-insert') 
                                        : ''}`}
                                    draggable="true"
                                    onDragStart={(e) => handleDragStart(e, index)}
                                    onDragOver={(e) => handleDragOver(e, index)}
                                    onDragEnd={(e) => handleDragEnd(e, index)}
                                    style={{
                                        backgroundColor: getHarmonizedColor(index, array.length), 
                                        height: normalizeHeight(array[index]),
                                        width: '50px',
                                        alignSelf: 'flex-end',
                                       
                                        
                                    }}
                                        
                                >
                                    <div className="array-box-index" style={{alignSelf: 'flex-end'}}>{index}</div>
                                    <div className="array-box-value">
                                    {editingIndex === index ? (
                                        <input
                                            type="number"
                                            value={inputValue}
                                            onChange={handleInputChange}
                                            onKeyDown={handleInputSubmit}
                                            autoFocus
                                            onBlur={handleInputBlur}
                                            style={{ width: `${Math.max(inputValue.length * 15, 50)}px` }}
                                        />
                                    ) : value}
                                    </div>
                                </div>
                                <div 
                                    className="insert-point-weighted"
                                    onMouseEnter={() => setHoveredInsertPoint(index + 1)}
                                    onMouseLeave={() => setHoveredInsertPoint(null)}
                                    style={{
                                        height: normalizeHeight(
                                            index === array.length - 1 
                                                ? array[index] // If it's the last element, use its height
                                                : Math.min(array[index], array[index + 1])
                                        ),
                                        alignSelf: 'flex-end'
                                    }}
                                >
                                    <button 
                                        className="insert-button-weighted" 
                                        onClick={() => {insertElement(index); }}
                                    >
                                        +
                                    </button>
                                </div>
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            </div>
           
        </>
    )


}