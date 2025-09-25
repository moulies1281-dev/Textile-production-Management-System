import React, { useState } from 'react';
import { PlusIcon, FilePlusIcon, WeaverIcon, DollarSignIcon, CloseIcon } from './ui/Icons';

interface FloatingActionButtonProps {
    setActiveView: (view: string) => void;
}

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({ setActiveView }) => {
    const [isOpen, setIsOpen] = useState(false);

    const handleActionClick = (view: string) => {
        // In a real app, this would open a specific "add" modal.
        // For now, it will navigate to the relevant page.
        // A more advanced implementation could use a global state to open the add modal directly.
        setActiveView(view);
        setIsOpen(false);
    };

    const actionItems = [
        { label: 'Add Production', icon: <FilePlusIcon className="w-5 h-5 text-white" />, action: () => handleActionClick('production'), color: 'bg-green-500' },
        { label: 'Add Weaver', icon: <WeaverIcon className="w-5 h-5 text-white" />, action: () => handleActionClick('weavers'), color: 'bg-blue-500' },
        { label: 'Add Loan', icon: <DollarSignIcon className="w-5 h-5 text-white" />, action: () => handleActionClick('finance'), color: 'bg-yellow-500' },
    ];

    return (
        <div className="fixed bottom-20 right-6 z-20">
            {isOpen && (
                <div className="flex flex-col items-center mb-4 space-y-3">
                    {actionItems.map((item, index) => (
                        <div key={item.label} className="flex items-center justify-end w-full group">
                            <span className="mr-3 px-3 py-1 bg-gray-700 dark:bg-gray-900 text-white text-xs font-semibold rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                                {item.label}
                            </span>
                             <button
                                onClick={item.action}
                                className={`w-12 h-12 rounded-full ${item.color} flex items-center justify-center shadow-md hover:scale-110 transition-transform`}
                                style={{ transitionDelay: `${index * 50}ms`}}
                            >
                                {item.icon}
                            </button>
                        </div>
                    ))}
                </div>
            )}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center text-white shadow-lg transform hover:scale-110 transition-all duration-200"
                aria-label="Add new item"
            >
                <div className={`transition-transform duration-300 ${isOpen ? 'rotate-45' : 'rotate-0'}`}>
                    <PlusIcon className="w-8 h-8"/>
                </div>
            </button>
        </div>
    );
};

export default FloatingActionButton;