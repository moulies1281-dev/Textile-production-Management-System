import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, CalendarIcon } from './Icons';

interface DateRangePresetPickerProps {
    onRangeChange: (range: { start: string; end: string }) => void;
}

const formatDate = (date: Date) => date.toISOString().split('T')[0];

const getDatePresets = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

    const startOfYear = new Date(today.getFullYear(), 0, 1);
    const endOfYear = new Date(today.getFullYear(), 11, 31);
    
    const startOfLastYear = new Date(today.getFullYear() - 1, 0, 1);
    const endOfLastYear = new Date(today.getFullYear() - 1, 11, 31);

    return {
        'Today': { start: formatDate(today), end: formatDate(today) },
        'Yesterday': { start: formatDate(yesterday), end: formatDate(yesterday) },
        'This Week': { start: formatDate(startOfWeek), end: formatDate(endOfWeek) },
        'This Month': { start: formatDate(startOfMonth), end: formatDate(endOfMonth) },
        'Last Month': { start: formatDate(startOfLastMonth), end: formatDate(endOfLastMonth) },
        'This Year': { start: formatDate(startOfYear), end: formatDate(endOfYear) },
        'Last Year': { start: formatDate(startOfLastYear), end: formatDate(endOfLastYear) },
    };
};

const DateRangePresetPicker: React.FC<DateRangePresetPickerProps> = ({ onRangeChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const presets = getDatePresets();
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
          if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
            setIsOpen(false);
          }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);


    const handleSelect = (preset: keyof typeof presets) => {
        onRangeChange(presets[preset]);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={wrapperRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full h-10 px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm flex items-center justify-between text-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
                <CalendarIcon className="w-5 h-5 mr-2 text-gray-400" />
                <span>Quick Select</span>
                <ChevronDownIcon className={`w-5 h-5 ml-2 -mr-1 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div
                    className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10"
                    role="menu"
                >
                    <div className="py-1" role="none">
                        {Object.keys(presets).map((preset) => (
                            <button
                                key={preset}
                                onClick={() => handleSelect(preset as keyof typeof presets)}
                                className="text-gray-700 block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                                role="menuitem"
                            >
                                {preset}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DateRangePresetPicker;
