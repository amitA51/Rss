import React, { createContext, useReducer, useContext, useCallback, ReactNode, useRef } from 'react';

type ModalState = {
  [key: string]: {
    isOpen: boolean;
    payload?: any;
  };
};

type ModalAction =
  | { type: 'OPEN_MODAL'; payload: { key: string; payload?: any } }
  | { type: 'CLOSE_MODAL'; payload: { key: string } };

interface ModalContextType {
  modals: ModalState;
  openModal: (key: string, payload?: any) => void;
  closeModal: (key: string) => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

const modalReducer = (state: ModalState, action: ModalAction): ModalState => {
  switch (action.type) {
    case 'OPEN_MODAL':
      return {
        ...state,
        [action.payload.key]: { isOpen: true, payload: action.payload.payload },
      };
    case 'CLOSE_MODAL':
      // To allow for closing animations, we don't remove the key, just set isOpen to false
      const newState = { ...state };
      if (newState[action.payload.key]) {
        newState[action.payload.key] = { ...newState[action.payload.key], isOpen: false };
      }
      return newState;
    default:
      return state;
  }
};

export const ModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [modals, dispatch] = useReducer(modalReducer, {});
  const openModalsRef = useRef(new Set<string>());

  const openModal = useCallback((key: string, payload?: any) => {
    console.log(`openModal called: ${key}`);
    if (openModalsRef.current.has(key)) {
      console.log(`Modal already open: ${key}`);
      return;
    }
    openModalsRef.current.add(key);
    console.log(`Modal opened: ${key}`);
    dispatch({ type: 'OPEN_MODAL', payload: { key, payload } });
  }, []);

  const closeModal = useCallback((key: string) => {
    openModalsRef.current.delete(key);
    console.log(`Modal closed: ${key}`);
    dispatch({ type: 'CLOSE_MODAL', payload: { key } });
  }, []);

  return (
    <ModalContext.Provider value={{ modals, openModal, closeModal }}>
      {children}
    </ModalContext.Provider>
  );
};

export const useModal = (): ModalContextType => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};
