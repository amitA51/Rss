import React, { Suspense, lazy } from 'react';
import { useModal } from '../state/ModalContext';

// Lazy load the Roadmap screen to keep initial bundle small
const RoadmapScreen = lazy(() => import('./details/RoadmapDetails'));

const ModalRoot: React.FC = () => {
  const { modals, closeModal } = useModal();

  return (
    <>
      {Object.entries(modals).map(([key, { isOpen, payload }]) => {
        if (!isOpen) return null;
        
        switch (key) {
          case 'roadmapScreen':
            return (
              <Suspense fallback={<div />} key={key}>
                <RoadmapScreen
                  item={payload.item}
                  onUpdate={payload.onUpdate}
                  onDelete={payload.onDelete}
                  onClose={() => closeModal(key)}
                />
              </Suspense>
            );
          // Add other modals here if needed in the future
          // case 'anotherModal':
          //   return <AnotherModalComponent {...payload} onClose={() => closeModal(key)} />;
          default:
            return null;
        }
      })}
    </>
  );
};

export default ModalRoot;
