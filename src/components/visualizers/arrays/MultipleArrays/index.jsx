import {useState, useEffect} from 'react'
import './multiplearrayvisualizer.css'
import React from 'react'

let lastKnownX = 0;
let lastKnownY = 0;

export default function MultipleArrayVisualizer({id = Math.random(), globalDragSourceId, setGlobalDragSourceId, globalDraggedValue, setGlobalDraggedValue, globalDraggedIndex, setGlobalDraggedIndex, elementHasBeenDragged, setElementHasBeenDragged, globalLastIndex, setGlobalLastIndex, array, updateArray, allArrays}){
    const getInitialArray = () => {
        const length = Math.floor(Math.random() * 10) + 1;
        return Array.from({ length }, () => Math.floor(Math.random() * 9) + 1); // Random values 1-9
    }
   
    const [position, setPosition] = useState({x:0, y:0});
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({x:0, y:0});
    const [draggedIndex, setDraggedIndex] = useState(null);
    const [editingIndex, setEditingIndex] = useState(null);
    const [inputValue, setInputValue] = useState('');
    const [hoveredInsertPoint, setHoveredInsertPoint] = useState(null);
   
    const [baseWidth, setBaseWidth] = useState(10);
    const [lastIndex, setLastIndex] = useState(null);


    const getHarmonizedColor = (index, total) => {
        const goldenRatio = 0.618033988749895;
        const hue = (index * goldenRatio * 360) % 360;
        return `hsl(${hue}, 85%, 65%)`;
    };
    
    const addElement = () => {
        updateArray(id, [...array, array.length + 1])
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
            
            element.classList.remove('removing');
            setArray(array.filter((_, i) => i !== index));
            
        }, 300);


    };

    const handleMouseDown = (e) => {
        // If the event originated from within an element that should not start a container drag, ignore it
        if (e.target.closest('.array-box') || e.target.closest('.insert-button')) {
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

    useEffect(()=>{
        console.log('Dragged index:', draggedIndex);
    }, [draggedIndex]);

    const handleMouseUp = () => {
        setIsDragging(false);
    }

    const handleDragStart = (e, index) => {
        
        setDraggedIndex(index);
        
        
        const box = e.target;
        box.classList.add('being-dragged');
        
        // Delay setting opacity to ensure the drag image is created first
        requestAnimationFrame(() => {
            box.style.opacity = '0';
        });
    };

    const handleDragOver = (e, index) => {
        lastKnownX = e.clientX;
        lastKnownY = e.clientY;
       
       
        setGlobalLastIndex(index)
       
        e.preventDefault();
        

        const arrayContainer = document.querySelector(`.array-container.array-container-${id}`);
        
            
        
        console.log("element has been dragged: ", elementHasBeenDragged);
        if (!elementHasBeenDragged) {
            
            setGlobalDragSourceId(id);
            setGlobalDraggedValue(array[draggedIndex]);
            setGlobalDraggedIndex(draggedIndex);
        }
        setElementHasBeenDragged(true);

      
        

        // Get only array boxes with this instance's ID
        const boxes = document.querySelectorAll(`.array-box-${id}`);
        
        boxes.forEach(box => {
            console.log('-----trying to shift-left------');
            box.classList.remove('shift-right', 'shift-left');
        });


      
        if (draggedIndex !== null){
            if (draggedIndex !== index) {
               
                if (draggedIndex < index) {
                    boxes.forEach((box, i) => {
                        if (i > draggedIndex && i <= index) {
                           
                            box.classList.add('shift-left');
                           
                        }
                    });
                } else {
                    boxes.forEach((box, i) => {
                        if (i >= index && i < draggedIndex) {
                            
                            box.classList.add('shift-right');
                        }
                    });
                }
            }
        } else if (globalDraggedIndex !== null) {
            const currentBox = boxes[index];
            const boxRect = currentBox.getBoundingClientRect();
            const boxMiddleX = boxRect.left + (boxRect.width / 2);
            
            if (lastKnownX > boxMiddleX) {
                // Mouse is to the right of the middle
                boxes.forEach((box, i) => {
                    if (i > index) {
                        console.log('-------------------------- trying to shift-right----------------------');
                        box.classList.add('shift-right');
                    }
                });
            } else {
                // Mouse is to the left of the middle
                boxes.forEach((box, i) => {
                    if (i >= index) {
                        box.classList.add('shift-right');
                        console.log('-----------------trying to shift right-----------------');
                    }
                });
            }
        }
    };

    const handleDragEnd = (event) => {
        console.log("dragging ended in array: ", id)
        let targetId = null;
        if (draggedIndex !== null || globalDraggedIndex !== null) {
            const boxes = document.querySelectorAll(`.array-box-${id}`);

            let targetIndex = globalLastIndex;
           
            
            boxes[draggedIndex].classList.remove('being-dragged');
            boxes[draggedIndex].style.opacity = '1';

            const elementUnderMouse = document.elementFromPoint(lastKnownX, lastKnownY);
            const targetContainer = elementUnderMouse?.closest('.array-container');
            
            console.log("targetContainer: ", targetContainer)
            if(targetContainer){
               // Debug the actual class name
                
                // Try both possible formats
                const match = targetContainer.className.match(/array-container-(\d+)/) || 
                                targetContainer.className.match(/array-container array-container-(\d+)/);

                targetId = match ? match[1] : null;
                
            }

            

            if (targetId){
               
                if (targetId === id){
                    console.log("changing the same array")
                    if (targetIndex !== draggedIndex) {
                
                        const newArray = [...array];
                        const [draggedItem] = newArray.splice(draggedIndex, 1);
                        newArray.splice(targetIndex, 0, draggedItem);
                        updateArray(id, newArray);
                       
                    } else {
                        console.log('No reordering needed');
                    }
                }else if (globalDraggedIndex !== null){
                    console.log("changing a different array")
                    const targetArray = allArrays[targetId];
                    console.log("targetArray: ", targetArray)
                    const targetIndex = globalLastIndex;
    
                    const newArray = [...targetArray];
                   
                   
                    newArray.splice(targetIndex, 0, globalDraggedValue);
                    updateArray(targetId, newArray);
    
                }
            }
            
            
            const arrayContainer = document.querySelector(`.array-container.array-container-${id}`);
            
            if (!arrayContainer) {
                return;  // Early return if container not found
            }

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
                updateArray(id, array.filter((_, index) => index !== globalDraggedIndex));
                setElementHasBeenDragged(false);
                
            } else {
            
            // Reorder the array if the position changed
           
            
            // Clear all shifts and restore opacity
            boxes.forEach(box => {
                box.classList.remove('shift-right', 'shift-left', 'being-dragged');
                box.style.opacity = '1';
            });
            
            setDraggedIndex(null);

            console.log("setting element has been dragged to false")
            setElementHasBeenDragged(false);
        }
    }
    };

    const insertElement = (index) => {

        const newArray = [...array];
        // For the first insert point
        if (index === 0) {
            setEditingIndex(0);
            setInputValue('');

            newArray.splice(0, 0, '');  // Insert at beginning
            updateArray(id, newArray);
            return;
        }

        if (array.length === 0){
            setEditingIndex(0);
            newArray.splice(index, 0, '')
        }else{

        // For all other insert points
        setEditingIndex(index + 1);
        setInputValue('');
        console.log("Array-----:", newArray)
        
        newArray.splice(index + 1, 0, '');  // Add empty placeholder
        updateArray(id, newArray);
        }
    };

    const handleInputSubmit = (e) => {
        if (e.key === 'Enter' && inputValue.trim() !== '') {
            const newArray = [...array];
            newArray[editingIndex] = Number(inputValue);
            updateArray(id, newArray);
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
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);


        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        }
    }, [isDragging, dragStart]);

    useEffect(() => {
        const calculateWidth = () => {
            const insertPointWidth = 10; // Width of each insert point
            const boxWidth = 50; // Width of each array box
            const numInsertPoints = array.length + 1; // Total insert points (including first one)
            const numBoxes = Math.max(array.length, 3);

            
            
            // // Calculate base width
            let baseWidth = (numInsertPoints * insertPointWidth) + (numBoxes * boxWidth);
            console.log("increasing base width")

            if (globalDraggedIndex !== null && globalDragSourceId !== id){
                baseWidth += boxWidth;
            }
            setBaseWidth(baseWidth);

            
            
            // Store in state to use in render

            const container = document.querySelector('.array-container');
            if (container) {
                console.log("array-container --base-width:", 
                    window.getComputedStyle(container).getPropertyValue('--base-width')
                );
            }

        };

        calculateWidth();
    }, [baseWidth, array, globalDraggedIndex]); // Recalculate when array changes

    return (
        <>
            <div className={`window window-${id}`}
                style={{
                    transform: `translate(${position.x}px, ${position.y}px)`,
                    position: 'absolute',
                    cursor: isDragging ? 'grabbing' : 'grab',
                    userSelect: 'none',
                }}
                onMouseDown={handleMouseDown}
            >
                <div 
                    className={`array-container array-container-${id}`}
                    style={{ '--base-width': baseWidth }}
                >
                    <div className="array-name">Array</div>
                    
                    <div className='array-boxes'>
                        <div 
                            className="insert-point"
                            onMouseEnter={() => setHoveredInsertPoint(0)}
                            onMouseLeave={() => setHoveredInsertPoint(null)}
                        >
                            <button 
                                className="insert-button" 
                                onClick={() => {insertElement(0);}}
                            >
                                +
                            </button>
                        </div>
                        
                        {array.map((value, index) => (
                            <React.Fragment key={index}>
                                <div 
                                    className={`array-box array-box-${id} ${hoveredInsertPoint !== null ? 
                                        (index < hoveredInsertPoint ? 'before-insert' : 'after-insert') 
                                        : ''}`}
                                    draggable="true"
                                    onDragStart={(e) => handleDragStart(e, index)}
                                    onDragOver={(e) => handleDragOver(e, index)}
                                    onDragEnd={(e) => handleDragEnd(e)}
                                    style={{backgroundColor: getHarmonizedColor(index, array.length)}}
                                >
                                    <div className="array-box-index">{index}</div>
                                    <div className="array-box-value">
                                    {editingIndex === index ? (
                                        <input
                                            type="number"
                                            value={inputValue}
                                            onChange={handleInputChange}
                                            onKeyDown={handleInputSubmit}
                                            autoFocus
                                            onBlur={handleInputBlur}
                                            style={{ width: `${Math.max(inputValue.length * 15, 30)}px` }}
                                        />
                                    ) : value}
                                    </div>
                                </div>
                                <div 
                                    className="insert-point"
                                    onMouseEnter={() => setHoveredInsertPoint(index + 1)}
                                    onMouseLeave={() => setHoveredInsertPoint(null)}
                                >
                                    <button 
                                        className="insert-button" 
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