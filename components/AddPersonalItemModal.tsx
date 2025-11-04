import React from 'react';

const AddPersonalItemModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl text-center" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-semibold mb-2">Placeholder Modal</h2>
        <p className="text-gray-400 mb-4">This component's functionality is part of the main 'Add' screen.</p>
        <button 
            onClick={onClose}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
        >
            Close
        </button>
      </div>
    </div>
  );
};

export default AddPersonalItemModal;
