import React from 'react';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ checked, onChange, id }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.checked);
  };

  return (
    <label htmlFor={id} className="flex items-center cursor-pointer">
      <div className="relative">
        <input 
          id={id} 
          type="checkbox" 
          className="sr-only" 
          checked={checked} 
          onChange={handleChange} 
        />
        <div className={`block w-12 h-6 rounded-full transition-colors duration-300 ease-in-out ${checked ? 'bg-[var(--accent-start)]' : 'bg-[var(--bg-secondary)]'}`}></div>
        <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 ease-in-out ${checked ? 'translate-x-6' : 'translate-x-0'}`}></div>
      </div>
    </label>
  );
};

export default ToggleSwitch;