import React, { useState, useEffect } from 'react';
import { MenuIcon } from './ui/Icons';

interface HeaderProps {
  toggleDrawer: () => void;
  isOnline: boolean;
  activeView: string;
}

const Header: React.FC<HeaderProps> = ({ toggleDrawer, isOnline, activeView }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = currentTime.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const formattedTime = currentTime.toLocaleTimeString();

  const viewTitles: { [key: string]: string } = {
    dashboard: 'Dashboard',
    weavers: 'Weaver Management',
    production: 'Production Tracking',
    finance: 'Finance Management',
    reports: 'Reports',
    designs: 'Design Management',
    history: 'Activity History',
    admin: 'Admin Settings',
  };
  
  const title = viewTitles[activeView] || 'RC Tex';

  return (
    <header className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b dark:border-gray-700 shadow-sm sticky top-0 z-20 h-16 shrink-0">
      <div className="flex items-center">
        <button onClick={toggleDrawer} className="text-gray-500 dark:text-gray-400 focus:outline-none mr-4">
          <MenuIcon className="w-6 h-6" />
        </button>
        <div>
            <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-200 capitalize">{title}</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">{formattedDate} - {formattedTime}</p>
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs transition-colors duration-300 ${isOnline ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'}`}>
            <span className={`h-2 w-2 rounded-full transition-colors duration-300 ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span className="font-medium">{isOnline ? 'Online' : 'Offline'}</span>
        </div>
        <div className="w-9 h-9 bg-primary-500 rounded-full flex items-center justify-center text-white font-bold text-base">
          A
        </div>
      </div>
    </header>
  );
};

export default Header;