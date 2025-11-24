import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

interface SortableItemProps<T> {
  id: string;
  item: T;
  children: (item: T, isDragging: boolean) => React.ReactNode;
}

function SortableItem<T>({ id, item, children }: SortableItemProps<T>) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        position: 'relative',
        boxShadow: isDragging
          ? '0 8px 16px rgba(0, 0, 0, 0.15)'
          : 'none',
        zIndex: isDragging ? 1000 : 1,
      }}
    >
      <div
        {...attributes}
        {...listeners}
        style={{
          position: 'absolute',
          left: '0.5rem',
          top: '50%',
          transform: 'translateY(-50%)',
          cursor: 'grab',
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          padding: '0.25rem',
          zIndex: 10,
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
        }}
      >
        <GripVertical size={16} />
      </div>
      <div style={{ paddingLeft: '2rem' }}>
        {children(item, isDragging)}
      </div>
    </div>
  );
}

interface SortableListProps<T> {
  items: T[];
  onReorder: (items: T[]) => void;
  getItemId: (item: T) => string;
  children: (item: T, isDragging: boolean) => React.ReactNode;
  strategy?: typeof verticalListSortingStrategy;
}

export function SortableList<T>({
  items,
  onReorder,
  getItemId,
  children,
  strategy = verticalListSortingStrategy,
}: SortableListProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => getItemId(item) === active.id);
      const newIndex = items.findIndex((item) => getItemId(item) === over.id);

      const newItems = arrayMove(items, oldIndex, newIndex);
      onReorder(newItems);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items.map(getItemId)} strategy={strategy}>
        {items.map((item) => (
          <SortableItem
            key={getItemId(item)}
            id={getItemId(item)}
            item={item}
          >
            {children}
          </SortableItem>
        ))}
      </SortableContext>
    </DndContext>
  );
}

