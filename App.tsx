import React, { useState, useMemo, useEffect } from 'react';
import { UserRole, Weaver, ProductionLog, Loan, Design, Repayment, RentalPayment, AuditLog, Theme } from './types';
import { initialProductionLogs, initialLoans, initialDesigns, initialRepayments, initialRentalPayments } from './constants';
import DrawerMenu from './components/DrawerMenu';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import WeaverManagement from './components/WeaverManagement';
import ProductionTracking from './components/ProductionTracking';
import Reports from './components/Reports';
import DesignManagement from './components/DesignManagement';
import FinanceManagement from './components/FinanceManagement';
import History from './components/History';
import AdminSettings from './components/AdminSettings';
import BottomNavBar from './components/BottomNavBar';
import FloatingActionButton from './components/FloatingActionButton';
import PasscodeScreen from './components/PasscodeScreen';

const AccessDenied: React.FC = () => (
    <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h2>
        <p className="text-gray-600 dark:text-gray-400">You do not have the required permissions to view this page.</p>
    </div>
);


const App: React.FC = () => {
  const [activeView, setActiveView] = useState('dashboard');
  const [userRole, setUserRole] = useState<UserRole>(UserRole.Admin);
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  
  const [weavers, setWeavers] = useState<Weaver[]>([]);
  const [productionLogs, setProductionLogs] = useState<ProductionLog[]>(initialProductionLogs);
  const [loans, setLoans] = useState<Loan[]>(initialLoans);
  const [designs, setDesigns] = useState<Design[]>(initialDesigns);
  const [repayments, setRepayments] = useState<Repayment[]>(initialRepayments);
  const [rentalPayments, setRentalPayments] = useState<RentalPayment[]>(initialRentalPayments);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showSyncNotification, setShowSyncNotification] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('theme') as Theme) || 'light');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

useEffect(() => {
  // This is the code that will fetch your weavers from the database
  const fetchWeavers = async () => {
    try {
      // This special URL calls the function that the Netlify Integration created for us.
      // It specifically asks for the 'weavers' table.
      const response = await fetch('/.netlify/functions/supabase/weavers');

      if (!response.ok) {
        throw new Error('Failed to fetch weavers from the server');
      }

      const result = await response.json();
      
      // The integration sends the data inside a property called "data"
      // We take that list and update our app's state
      setWeavers(result.data);

    } catch (error) {
      // If something goes wrong, we'll see an error message in the browser's console
      console.error("Error fetching weavers:", error);
    }
  };

  // This line runs the fetchWeavers function as soon as the app loads
  fetchWeavers();
}, []); // The empty [] means this code only runs one time.
    
  useEffect(() => {
      const root = window.document.documentElement;
      if (theme === 'dark') {
          root.classList.add('dark');
      } else {
          root.classList.remove('dark');
      }
      localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      console.log('App is back online.');
      // Simulate syncing offline data
      const queuedDesigns = JSON.parse(localStorage.getItem('design-queue') || '[]');
      if (queuedDesigns.length > 0) {
        setDesigns(prevDesigns => [...prevDesigns, ...queuedDesigns]);
        localStorage.removeItem('design-queue');
        logAction('Created', 'Designs', `Synced ${queuedDesigns.length} offline designs.`);
        setShowSyncNotification(true);
        setTimeout(() => setShowSyncNotification(false), 5000);
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const logAction = (action: 'Created' | 'Updated' | 'Deleted', module: string, details: string) => {
    const newLog: AuditLog = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        user: userRole,
        action,
        module,
        details,
    };
    setAuditLogs(prevLogs => [newLog, ...prevLogs]);
  };

  const loansWithDetails = useMemo(() => {
    return loans.map(loan => {
      const relatedRepayments = repayments.filter(r => r.loanId === loan.id);
      const totalPaid = relatedRepayments.reduce((sum, r) => sum + r.amount, 0);
      const outstanding = loan.amount - totalPaid;
      return { ...loan, totalPaid, outstanding };
    });
  }, [loans, repayments]);

  const alerts = useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const alertsList: { type: string, severity: 'info' | 'warning' | 'error', message: string, key: string }[] = [];

    // Loan alerts
    loansWithDetails.forEach(loan => {
        if(loan.outstanding > 0 && loan.dueDate) {
            const dueDate = new Date(loan.dueDate);
            dueDate.setHours(0,0,0,0);
            const daysDiff = (dueDate.getTime() - today.getTime()) / (1000 * 3600 * 24);
            const weaver = weavers.find(w => w.id === loan.weaverId);
            if(daysDiff <= 7 && daysDiff >= 0) {
                alertsList.push({ type: 'loan_due', severity: 'warning', message: `Loan for ${weaver?.name} is due in ${Math.round(daysDiff)} days.`, key: `loan-${loan.id}` });
            } else if (daysDiff < 0) {
                alertsList.push({ type: 'loan_due', severity: 'error', message: `Loan for ${weaver?.name} is overdue by ${Math.abs(Math.round(daysDiff))} days.`, key: `loan-${loan.id}` });
            }
        }
    });

    // Rental alerts
    weavers.filter(w => w.loomType === 'Rental').forEach(weaver => {
        const lastPayment = rentalPayments.filter(p => p.weaverId === weaver.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        const periodDays = weaver.rentalPeriod === 'Weekly' ? 7 : 30;
        const lastPaymentDate = lastPayment ? new Date(lastPayment.date) : new Date(weaver.joinDate);
        const nextDueDate = new Date(lastPaymentDate);
        nextDueDate.setDate(lastPaymentDate.getDate() + periodDays);

        const daysDiff = Math.floor((nextDueDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
         if (daysDiff <= 3) {
             alertsList.push({ type: 'rental_due', severity: 'warning', message: `Loom rental for ${weaver.name} is due soon.`, key: `rental-${weaver.id}` });
         }
    });

    // Salary reminder
    if (today.getDate() >= 25) {
        alertsList.push({ type: 'salary', severity: 'info', message: 'Prepare for end-of-month salary payouts.', key: 'salary-reminder' });
    }

    return alertsList;
  }, [loansWithDetails, weavers, rentalPayments]);


  const dashboardData = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const dailyProduction = productionLogs.reduce((acc, log) => {
        if (log.date === today) {
            const totalItems = log.items.reduce((itemAcc, item) => itemAcc + item.quantity, 0);
            return acc + totalItems;
        }
        return acc;
    }, 0);
    const activeWeavers = new Set(productionLogs.filter(log => log.date === today).map(log => log.weaverId)).size;
    
    const pendingLoans = loansWithDetails.reduce((acc, loan) => loan.outstanding > 0 ? acc + loan.outstanding : acc, 0);

    return {
      dailyProduction,
      activeWeavers,
      yarnStock: 1250.5, // Mock data
      pendingLoans,
      rentalLooms: weavers.filter(w => w.loomType === 'Rental').length,
    };
  }, [productionLogs, loansWithDetails, weavers]);

  const renderContent = () => {
    const isFinance = userRole === UserRole.Admin || userRole === UserRole.Finance;
    const isSupervisor = userRole === UserRole.Admin || userRole === UserRole.Supervisor;
    const isAdmin = userRole === UserRole.Admin;

    switch (activeView) {
      case 'dashboard':
        return <Dashboard stats={dashboardData} alerts={alerts} setActiveView={setActiveView} productionLogs={productionLogs} />;
      case 'weavers':
        return <WeaverManagement weavers={weavers} setWeavers={setWeavers} designs={designs} userRole={userRole} logAction={logAction} />;
      case 'designs':
         return <DesignManagement designs={designs} setDesigns={setDesigns} userRole={userRole} logAction={logAction} />;
      case 'production':
        return isSupervisor ? <ProductionTracking 
                  productionLogs={productionLogs} 
                  setProductionLogs={setProductionLogs}
                  weavers={weavers} 
                  designs={designs}
                  userRole={userRole} 
                  logAction={logAction}
                /> : <AccessDenied />;
      case 'finance':
        return isFinance ? <FinanceManagement 
                  loans={loans}
                  setLoans={setLoans}
                  repayments={repayments}
                  setRepayments={setRepayments}
                  rentalPayments={rentalPayments}
                  setRentalPayments={setRentalPayments}
                  weavers={weavers}
                  userRole={userRole}
                  logAction={logAction}
                /> : <AccessDenied />;
      case 'reports':
        return <Reports 
                  productionLogs={productionLogs} 
                  weavers={weavers} 
                  loans={loans} 
                  designs={designs} 
                  rentalPayments={rentalPayments}
                  repayments={repayments}
                />;
      case 'history':
        return <History auditLogs={auditLogs} />;
      case 'admin':
        return isAdmin ? <AdminSettings weavers={weavers} productionLogs={productionLogs} loans={loans} designs={designs} repayments={repayments} rentalPayments={rentalPayments} /> : <AccessDenied />;
      default:
        return <Dashboard stats={dashboardData} alerts={alerts} setActiveView={setActiveView} productionLogs={productionLogs} />;
    }
  };

  if (!isAuthenticated) {
    return <PasscodeScreen onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900">
      <DrawerMenu 
        userRole={userRole} 
        activeView={activeView} 
        setActiveView={setActiveView} 
        isOpen={isDrawerOpen} 
        setOpen={setDrawerOpen} 
        setUserRole={setUserRole}
        theme={theme}
        toggleTheme={toggleTheme}
      />
      
      <Header 
        toggleDrawer={() => setDrawerOpen(!isDrawerOpen)}
        isOnline={isOnline}
        activeView={activeView}
      />
        
      <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-28">
        {showSyncNotification && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4 rounded-md shadow-md" role="alert">
              <p className="font-bold">Sync Complete</p>
              <p>Your offline data has been successfully synced.</p>
          </div>
        )}
        {renderContent()}
      </main>

      <FloatingActionButton setActiveView={setActiveView} />
      <BottomNavBar activeView={activeView} setActiveView={setActiveView} userRole={userRole} />
    </div>
  );
};

export default App;
