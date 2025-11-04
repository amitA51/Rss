import React, { useState, useCallback } from 'react';

interface ContextMenuState<T> {
  isOpen: boolean;
  x: number;
  y: number;
  item: T | null;
}

export const useContextMenu = <T,>() => {
  const [contextMenu, setContextMenu] = useState<ContextMenuState<T>>({
    isOpen: false,
    x: 0,
    y: 0,
    item: null,
  });

  const handleContextMenu = useCallback((event: React.MouseEvent, item: T) => {
    event.preventDefault();
    setContextMenu({
      isOpen: true,
      x: event.clientX,
      y: event.clientY,
      item: item,
    });
  }, []);

  const closeContextMenu = useCallback(() => {
    if (contextMenu.isOpen) {
        setContextMenu(prevState => ({ ...prevState, isOpen: false }));
    }
  }, [contextMenu.isOpen]);

  return { contextMenu, handleContextMenu, closeContextMenu };
};