import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useReactFlow } from 'reactflow';
import './testingbox.css';

const initialItems = [
  { id: 'box-1', content: '1' },
  { id: 'box-2', content: '2' },
  { id: 'box-3', content: '3' },
  { id: 'box-4', content: '4' },
];

// A helper component to render the drag preview in a portal.
// It adjusts the computed style using the current zoom factor so that the preview
// has the same size and position as in the React Flow container.
const PortalDragItem = ({ provided, style, zoom, children }) => {
  const adjustedStyle = useMemo(() => {
    // Use an empty object if the style isn't provided
    let computedStyle = style || {};
    let newTransform = '';

    if (computedStyle.transform) {
      // Try matching a translate3d (common in some libraries)
      const translate3dRegex = /translate3d\(([-\d.]+)px,\s*([-\d.]+)px,\s*([-\d.]+)px\)/;
      let match = computedStyle.transform.match(translate3dRegex);

      if (match) {
        const x = parseFloat(match[1]);
        const y = parseFloat(match[2]);
        newTransform = `translate(${x / zoom}px, ${y / zoom}px) scale(${zoom})`;
      } else {
        // Fallback: try matching simple translate(xpx, ypx)
        const translateRegex = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/;
        match = computedStyle.transform.match(translateRegex);
        if (match) {
          const x = parseFloat(match[1]);
          const y = parseFloat(match[2]);
          newTransform = `translate(${x / zoom}px, ${y / zoom}px) scale(${zoom})`;
        } else {
          // If no recognizable translation is found, apply zoom scale only
          newTransform = `scale(${zoom})`;
        }
      }
    } else {
      newTransform = `scale(${zoom})`;
    }

    // Ensure the transform is applied from the top-left corner so scaling works as expected.
    return {
      ...computedStyle,
      transform: newTransform,
      transformOrigin: 'top left'
    };
  }, [style, zoom]);

  return createPortal(
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      style={adjustedStyle}
    >
      {children}
    </div>,
    document.body
  );
};

export default function TestingBox() {
  // Get the current zoom level from React Flow. Defaults to 1 if undefined.
  const { zoom = 1 } = useReactFlow();
  const [items, setItems] = useState(initialItems);

  function handleOnDragEnd(result) {
    if (!result.destination) return;

    const newItems = Array.from(items);
    const [reorderedItem] = newItems.splice(result.source.index, 1);
    newItems.splice(result.destination.index, 0, reorderedItem);

    setItems(newItems);
  }

  return (
    <div className="boxes-container">
      <DragDropContext onDragEnd={handleOnDragEnd}>
        <Droppable
          droppableId="boxes"
          direction="horizontal"
          // Using renderClone to customize the drag preview.
          renderClone={(provided, snapshot, rubric) => (
            <PortalDragItem
              provided={provided}
              style={provided.draggableProps.style}
              zoom={zoom}
            >
              <div className="box nodrag">
                {items[rubric.source.index].content}
              </div>
            </PortalDragItem>
          )}
        >
          {(provided) => (
            <div
              className="boxes nodrag"
              {...provided.droppableProps}
              ref={provided.innerRef}
            >
              {items.map(({ id, content }, index) => (
                <Draggable key={id} draggableId={id} index={index}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                    >
                      <div className="box nodrag">{content}</div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}