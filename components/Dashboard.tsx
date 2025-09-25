import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ProductionLog } from '../types';
import { BellIcon, AlertTriangleIcon, FilePlusIcon, ReportIcon, WeaverIcon, TrendingUpIcon, DollarSignIcon } from './ui/Icons';

interface DashboardProps {
  stats: {
    dailyProduction: number;
    activeWeavers: number;
    yarnStock: number;
    pendingLoans: number;
    rentalLooms: number;
  };
  alerts: { type: string, severity: 'info' | 'warning' | 'error', message: string, key: string }[];
  setActiveView: (view: string) => void;
  productionLogs: ProductionLog[];
}

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode }> = ({ title, value, icon }) => (
  <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md flex items-center space-x-4">
    <div className="bg-primary-50 dark:bg-primary-900/50 p-3 rounded-full">
      {icon}
    </div>
    <div>
      <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{value}</p>
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
    </div>
  </div>
);


const AlertsCard: React.FC<{ alerts: DashboardProps['alerts'] }> = ({ alerts }) => {
    const severityMap = {
        info: { icon: <BellIcon className="w-5 h-5 text-blue-500"/>, style: 'bg-blue-50 border-blue-400 dark:bg-blue-900/50 dark:border-blue-700' },
        warning: { icon: <AlertTriangleIcon className="w-5 h-5 text-yellow-500"/>, style: 'bg-yellow-50 border-yellow-400 dark:bg-yellow-900/50 dark:border-yellow-700' },
        error: { icon: <AlertTriangleIcon className="w-5 h-5 text-red-500"/>, style: 'bg-red-50 border-red-400 dark:bg-red-900/50 dark:border-red-700' },
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
            <div className="flex items-center mb-4">
                <BellIcon className="w-6 h-6 text-gray-400 mr-3"/>
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Notifications & Alerts</h3>
            </div>
            {alerts.length === 0 ? (
                <div className="flex-grow flex items-center justify-center py-8">
                    <p className="text-gray-500 dark:text-gray-400">No new alerts.</p>
                </div>
            ) : (
                <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                    {alerts.map(alert => (
                        <div key={alert.key} className={`flex items-start p-3 rounded-lg border-l-4 ${severityMap[alert.severity].style}`}>
                            <div className="flex-shrink-0 mr-3 mt-0.5">{severityMap[alert.severity].icon}</div>
                            <p className="text-sm text-gray-700 dark:text-gray-300">{alert.message}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const QuickActionsCard: React.FC<{ setActiveView: (view: string) => void }> = ({ setActiveView }) => {
    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">Quick Actions</h3>
            <div className="space-y-3">
                <button 
                    onClick={() => setActiveView('production')}
                    className="w-full flex items-center justify-center px-4 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-all duration-200 transform hover:scale-105 shadow-sm hover:shadow-lg"
                >
                    <FilePlusIcon className="w-5 h-5 mr-2" />
                    <span>Add Production Log</span>
                </button>
                <button 
                    onClick={() => setActiveView('reports')}
                    className="w-full flex items-center justify-center px-4 py-3 bg-accent text-white rounded-lg hover:bg-accent-hover transition-all duration-200 transform hover:scale-105 shadow-sm hover:shadow-lg"
                >
                    <ReportIcon className="w-5 h-5 mr-2" />
                    <span>Generate Salary Report</span>
                </button>
            </div>
        </div>
    )
};

const formatDate = (date: Date): string => {
    const day = String(date.getDate());
    const month = date.toLocaleString('default', { month: 'short' });
    return `${day} ${month}`;
};


const Dashboard: React.FC<DashboardProps> = ({ stats, alerts, setActiveView, productionLogs }) => {

  const productionTrendData = React.useMemo(() => {
    const trend = new Map<string, number>();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        trend.set(formatDate(date), 0);
    }

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6);

    productionLogs.forEach(log => {
        const [year, month, day] = log.date.split('-').map(Number);
        const logDate = new Date(year, month - 1, day);

        if (logDate >= sevenDaysAgo && logDate <= today) {
            const dateString = formatDate(logDate);
            if (trend.has(dateString)) {
                const dailyTotal = log.items.reduce((sum, item) => sum + item.quantity, 0);
                trend.set(dateString, (trend.get(dateString) || 0) + dailyTotal);
            }
        }
    });

    return Array.from(trend, ([date, production]) => ({ date, production }));
  }, [productionLogs]);

  const materialUsageData = React.useMemo(() => {
    const usage = productionLogs.slice(0, 30).reduce((acc, log) => {
        acc.warp += log.yarnIssued.warp || 0;
        acc.weft += log.yarnIssued.weft || 0;
        return acc;
    }, { warp: 0, weft: 0 });
    return [{ name: 'Warp Yarn', value: parseFloat(usage.warp.toFixed(2)) }, { name: 'Weft Yarn', value: parseFloat(usage.weft.toFixed(2)) }];
  }, [productionLogs]);
  
  const COLORS = ['#0088FE', '#00C49F'];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Daily Production" value={stats.dailyProduction.toLocaleString()} icon={<TrendingUpIcon className="w-6 h-6 text-primary-600"/>} />
        <StatCard title="Active Weavers" value={stats.activeWeavers} icon={<WeaverIcon className="w-6 h-6 text-primary-600"/>} />
        <StatCard title="Pending Loans" value={`₹${stats.pendingLoans.toLocaleString()}`} icon={<DollarSignIcon className="w-6 h-6 text-primary-600"/>} />
        <StatCard title="Rental Looms" value={stats.rentalLooms} icon={<FilePlusIcon className="w-6 h-6 text-primary-600"/>} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">Weekly Production Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={productionTrendData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 20% 65% / 0.3)" />
              <XAxis dataKey="date" tick={{ fill: 'hsl(215 25% 65%)' }} />
              <YAxis tick={{ fill: 'hsl(215 25% 65%)' }} />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(215 28% 17%)', border: '1px solid hsl(215 20% 65% / 0.3)' }} />
              <Legend wrapperStyle={{ color: 'hsl(215 25% 65%)' }} />
              <Line type="monotone" dataKey="production" stroke="#8884d8" strokeWidth={2} activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-6">
            <QuickActionsCard setActiveView={setActiveView} />
        </div>
      </div>
      
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
              <AlertsCard alerts={alerts} />
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">Material Usage (30d)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={materialUsageData} cx="50%" cy="50%" labelLine={false} outerRadius={80} fill="#8884d8" dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${((Number(percent) || 0) * 100).toFixed(0)}%`}>
                  {materialUsageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value} kg`} contentStyle={{ backgroundColor: 'hsl(215 28% 17%)', border: '1px solid hsl(215 20% 65% / 0.3)' }}/>
                <Legend wrapperStyle={{ color: 'hsl(215 25% 65%)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
       </div>
    </div>
  );
};

export default Dashboard;