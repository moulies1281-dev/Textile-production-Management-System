import React, { useMemo } from 'react';
import { UserRole, Theme } from '../types';
import { 
    CloseIcon, PaletteIcon, HistoryIcon, SettingsIcon, LogoutIcon, SunIcon, MoonIcon
} from './ui/Icons';

interface DrawerMenuProps {
  userRole: UserRole;
  activeView: string;
  setActiveView: (view: string) => void;
  isOpen: boolean;
  setOpen: (isOpen: boolean) => void;
  setUserRole: (role: UserRole) => void;
  theme: Theme;
  toggleTheme: () => void;
}

const NavItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center w-full p-3 my-1 text-base font-medium rounded-lg transition-colors duration-200 group ${
      isActive
        ? 'bg-primary-500 text-white shadow-sm'
        : 'text-gray-600 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-gray-700 hover:text-primary-600 dark:hover:text-primary-300'
    }`}
  >
    {icon}
    <span className="ml-4">{label}</span>
  </button>
);


const DrawerMenu: React.FC<DrawerMenuProps> = ({ userRole, activeView, setActiveView, isOpen, setOpen, setUserRole, theme, toggleTheme }) => {

  const handleNavClick = (view: string) => {
    setActiveView(view);
    setOpen(false);
  };
  
  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setUserRole(e.target.value as UserRole);
  };

  const allNavItems = [
    { view: 'designs', label: 'Design Management', icon: <PaletteIcon className="w-6 h-6 flex-shrink-0" />, roles: [UserRole.Admin, UserRole.Supervisor] },
    { view: 'history', label: 'History', icon: <HistoryIcon className="w-6 h-6 flex-shrink-0" />, roles: [UserRole.Admin, UserRole.Finance, UserRole.Supervisor] },
    { view: 'admin', label: 'Settings', icon: <SettingsIcon className="w-6 h-6 flex-shrink-0" />, roles: [UserRole.Admin] },
  ];

  const navItems = useMemo(() => {
    return allNavItems.filter(item => item.roles.includes(userRole));
  }, [userRole]);

  return (
    <>
        {/* Mobile Overlay */}
        <div className={`fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setOpen(false)}></div>
        
        {/* Drawer */}
        <aside
        className={`bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 flex flex-col fixed inset-y-0 left-0 transform ${isOpen ? "translate-x-0" : "-translate-x-full"} 
                   transition-transform duration-300 ease-in-out z-40 shadow-lg w-72`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 h-16 shrink-0 border-b dark:border-gray-700">
              <a href="#" className="text-2xl font-bold text-primary-600">
                RC Tex
              </a>
              <button onClick={() => setOpen(false)} className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
                  <CloseIcon className="w-6 h-6" />
              </button>
          </div>

          {/* Nav Items */}
          <nav className="flex-grow px-4 py-4 space-y-1 overflow-y-auto">
              {navItems.map(item => (
                  <NavItem
                      key={item.view}
                      icon={item.icon}
                      label={item.label}
                      isActive={activeView === item.view}
                      onClick={() => handleNavClick(item.view)}
                  />
              ))}
          </nav>

          {/* Footer / Role Selector */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4 shrink-0 space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400 block">Theme</label>
                  <button onClick={toggleTheme} className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                      {theme === 'light' ? <MoonIcon className="w-5 h-5"/> : <SunIcon className="w-5 h-5"/>}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">User Role</label>
                <select
                  value={userRole}
                  onChange={handleRoleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700"
                >
                <option value={UserRole.Admin}>Admin</option>
                <option value={UserRole.Finance}>Finance</option>
                <option value={UserRole.Supervisor}>Supervisor</option>
                </select>
              </div>
              <NavItem
                  icon={<LogoutIcon className="w-6 h-6 flex-shrink-0" />}
                  label="Logout"
                  isActive={false}
                  onClick={() => console.log('Logout clicked')}
              />
          </div>
        </aside>
    </>
  );
};

export default DrawerMenu;