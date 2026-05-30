import { useState } from 'react';

export default function TextBox({
  label,
  placeholder = "Type here...",
  value: externalValue,
  onChange,
  className = "",
  disabled = false,
}) {
  
  const [internalValue, setInternalValue] = useState("");

  const isControlled = externalValue !== undefined;
  const value = isControlled ? externalValue : internalValue;

  const handleChange = (e) => {
    const newValue = e.target.value;
    
    if (!isControlled) {
      setInternalValue(newValue);
    }
    
    onChange?.(newValue);
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      
      <textarea
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`
          w-full px-4 py-3 
          bg-indigo-100 
          border border-indigo-200
          rounded-2xl 
          shadow-md 
          focus:outline-none 
          focus:ring-2 
          focus:ring-indigo-500 
          focus:border-transparent
          transition-all duration-200
          placeholder:text-indigo-400
          ${disabled ? 'opacity-60 cursor-not-allowed' : ''}
          ${className}
        `}
      />
    </div>
  );
}