import React, { useState, useMemo } from 'react';
import { AuditLog, UserRole } from '../types';
import { SearchIcon } from './ui/Icons';

interface HistoryProps {
  auditLogs: AuditLog[];
}

const History: React.FC<HistoryProps> = ({ auditLogs }) => {
    const [filters, setFilters] = useState({
        module: '',
        action: '',
        user: '',
        searchTerm: '',
    });

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const filteredLogs = useMemo(() => {
        return auditLogs.filter(log => {
            const searchTermLower = filters.searchTerm.toLowerCase();
            return (
                (filters.module === '' || log.module === filters.module) &&
                (filters.action === '' || log.action === filters.action) &&
                (filters.user === '' || log.user === filters.user) &&
                (searchTermLower === '' || log.details.toLowerCase().includes(searchTermLower))
            );
        });
    }, [auditLogs, filters]);

    const uniqueModules = useMemo(() => [...new Set(auditLogs.map(log => log.module))], [auditLogs]);

    const ActionBadge: React.FC<{ action: string }> = ({ action }) => {
        const colors: { [key: string]: string } = {
            Created: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
            Updated: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
            Deleted: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
        };
        return <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[action] || 'bg-gray-100 text-gray-800'}`}>{action}</span>;
    };

    const formatTimestamp = (isoString: string): string => {
        const date = new Date(isoString);
        return date.toLocaleString('en-US', {
            dateStyle: 'medium',
            timeStyle: 'short',
        });
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Activity History</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border dark:border-gray-700">
                <div className="relative w-full lg:col-span-2">
                    <input
                        type="text"
                        name="searchTerm"
                        placeholder="Search details..."
                        value={filters.searchTerm}
                        onChange={handleFilterChange}
                        className="w-full p-2 pl-10 border rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 dark:border-gray-600"
                    />
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>
                <select name="module" value={filters.module} onChange={handleFilterChange} className="w-full p-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 dark:border-gray-600">
                    <option value="">All Modules</option>
                    {uniqueModules.map(module => <option key={module} value={module}>{module}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-2">
                    <select name="action" value={filters.action} onChange={handleFilterChange} className="w-full p-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 dark:border-gray-600">
                        <option value="">All Actions</option>
                        <option value="Created">Created</option>
                        <option value="Updated">Updated</option>
                        <option value="Deleted">Deleted</option>
                    </select>
                    <select name="user" value={filters.user} onChange={handleFilterChange} className="w-full p-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 dark:border-gray-600">
                        <option value="">All Users</option>
                        <option value={UserRole.Admin}>Admin</option>
                        <option value={UserRole.Finance}>Finance</option>
                        <option value={UserRole.Supervisor}>Supervisor</option>
                    </select>
                </div>
            </div>
            
            <div className="relative pl-8">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700"></div>
                {filteredLogs.length > 0 ? filteredLogs.map(log => (
                    <div key={log.id} className="relative mb-8">
                        <div className="absolute -left-[22px] top-1.5 w-4 h-4 bg-primary-500 rounded-full border-4 border-white dark:border-gray-800"></div>
                        <div className="ml-4 bg-white dark:bg-gray-700/50 border dark:border-gray-700 rounded-lg shadow-sm p-4">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2">
                                <div className="flex items-center gap-3">
                                    <ActionBadge action={log.action} />
                                    <span className="font-semibold text-gray-700 dark:text-gray-300">{log.module}</span>
                                </div>
                                <span className="text-xs text-gray-500 dark:text-gray-400 mt-2 sm:mt-0">{formatTimestamp(log.timestamp)}</span>
                            </div>
                            <p className="text-sm text-gray-800 dark:text-gray-200 mb-1">{log.details}</p>
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium capitalize">by {log.user}</span>
                        </div>
                    </div>
                )) : (
                    <div className="text-center py-10 text-gray-500 dark:text-gray-400 ml-4">No history records found.</div>
                )}
            </div>
        </div>
    );
};

export default History;