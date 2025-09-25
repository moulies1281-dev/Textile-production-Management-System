import React from 'react';

interface DateInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: string; // Expects value in YYYY-MM-DD format
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const formatDateToDisplay = (dateString: string): string => {
  if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return '';
  const [year, month, day] = dateString.split('-');
  return `${month}/${day}/${year}`;
};

const DateInput: React.FC<DateInputProps> = ({ value, onChange, className, ...props }) => {
  // This approach uses a styled div to display the formatted date,
  // with a transparent native date input layered on top.
  // This ensures a consistent "DD/MM/YYYY" display format while using the native date picker.
  return (
    <div className="relative">
      {/* This is the visible, styled element. It takes its styling from props. */}
      <div className={`flex items-center bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 ${className}`}>
        {value ? (
          <span>{formatDateToDisplay(value)}</span>
        ) : (
          <span className="text-gray-500 dark:text-gray-400">{props.placeholder || 'mm/dd/yyyy'}</span>
        )}
      </div>

      {/* This is the actual date input, made invisible and positioned over the div. */}
      <input
        type="date"
        value={value || ''}
        onChange={onChange}
        className="absolute inset-0 w-full h-full cursor-pointer bg-transparent text-transparent"
        style={{ colorScheme: 'light' }}
        {...props}
      />
    </div>
  );
};

export default DateInput;