import React, { useMemo } from 'react';
import { UserRole } from '../types';
import { HomeIcon, WeaverIcon, ProductionIcon, DollarSignIcon, ReportIcon } from './ui/Icons';

interface BottomNavBarProps {
    activeView: string;
    setActiveView: (view: string) => void;
    userRole: UserRole;
}

const NavItem: React.FC<{
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
    onClick: () => void;
}> = ({ icon, label, isActive, onClick }) => (
    <button onClick={onClick} className={`flex flex-col items-center justify-center w-full pt-2 pb-1 transition-colors duration-200 ${isActive ? 'text-primary-600' : 'text-gray-500 dark:text-gray-400 hover:text-primary-500'}`}>
        {icon}
        <span className={`text-xs mt-1 font-medium ${isActive ? 'font-bold' : ''}`}>{label}</span>
    </button>
);


const BottomNavBar: React.FC<BottomNavBarProps> = ({ activeView, setActiveView, userRole }) => {
    
    const navItemsList = [
        { view: 'dashboard', label: 'Home', icon: <HomeIcon className="w-6 h-6" />, roles: [UserRole.Admin, UserRole.Finance, UserRole.Supervisor] },
        { view: 'production', label: 'Production', icon: <ProductionIcon className="w-6 h-6" />, roles: [UserRole.Admin, UserRole.Supervisor] },
        { view: 'finance', label: 'Finance', icon: <DollarSignIcon className="w-6 h-6" />, roles: [UserRole.Admin, UserRole.Finance] },
        { view: 'reports', label: 'Reports', icon: <ReportIcon className="w-6 h-6" />, roles: [UserRole.Admin, UserRole.Finance] },
        { view: 'weavers', label: 'Weavers', icon: <WeaverIcon className="w-6 h-6" />, roles: [UserRole.Admin, UserRole.Supervisor] },
    ];
    
    const accessibleNavItems = useMemo(() => {
        return navItemsList.filter(item => item.roles.includes(userRole));
    }, [userRole]);

    return (
        <div className="fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg z-20 flex justify-around">
            {accessibleNavItems.map(item => (
                <NavItem 
                    key={item.view}
                    icon={item.icon}
                    label={item.label}
                    isActive={activeView === item.view}
                    onClick={() => setActiveView(item.view)}
                />
            ))}
        </div>
    );
};

export default BottomNavBar;