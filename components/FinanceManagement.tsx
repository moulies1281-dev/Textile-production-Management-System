import React, { useState, useMemo } from 'react';
import { Loan, Weaver, UserRole, Repayment, RentalPayment } from '../types';
import { ChevronDownIcon, EditIcon, TrashIcon, SearchIcon } from './ui/Icons';
import DateInput from './ui/DateInput';

interface FinanceManagementProps {
  loans: Loan[];
  setLoans: React.Dispatch<React.SetStateAction<Loan[]>>;
  repayments: Repayment[];
  setRepayments: React.Dispatch<React.SetStateAction<Repayment[]>>;
  rentalPayments: RentalPayment[];
  setRentalPayments: React.Dispatch<React.SetStateAction<RentalPayment[]>>;
  weavers: Weaver[];
  userRole: UserRole;
  logAction: (action: 'Created' | 'Updated' | 'Deleted', module: string, details: string) => void;
}

// Helper function to format YYYY-MM-DD strings to MM/DD/YYYY
const formatDate = (dateString: string): string => {
  if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString;
  const [year, month, day] = dateString.split('-');
  return `${month}/${day}/${year}`;
};

const FinanceManagement: React.FC<FinanceManagementProps> = ({ loans, setLoans, repayments, setRepayments, rentalPayments, setRentalPayments, weavers, userRole, logAction }) => {
  const [activeTab, setActiveTab] = useState('loans');
  const [isLoanModalOpen, setLoanModalOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [loanFormData, setLoanFormData] = useState({ weaverId: '', amount: '', issueDate: new Date().toISOString().split('T')[0] });
  
  const [isRepaymentModalOpen, setRepaymentModalOpen] = useState(false);
  const [currentLoanForRepayment, setCurrentLoanForRepayment] = useState<Loan | null>(null);
  const [editingRepayment, setEditingRepayment] = useState<Repayment | null>(null);
  const [repaymentFormData, setRepaymentFormData] = useState({ amount: '', date: new Date().toISOString().split('T')[0] });

  const [isRentalPaymentModalOpen, setRentalPaymentModalOpen] = useState(false);
  const [currentWeaverForRental, setCurrentWeaverForRental] = useState<Weaver | null>(null);
  const [editingRentalPayment, setEditingRentalPayment] = useState<RentalPayment | null>(null);
  const [rentalPaymentFormData, setRentalPaymentFormData] = useState({ amount: '', date: new Date().toISOString().split('T')[0] });

  const [expandedLoanId, setExpandedLoanId] = useState<number | null>(null);
  const [expandedWeaverId, setExpandedWeaverId] = useState<number | null>(null);
  
  const [loanFilters, setLoanFilters] = useState({ searchTerm: '', status: 'All' });
  const [rentalSearchTerm, setRentalSearchTerm] = useState('');

  const isAllowedToEdit = userRole === UserRole.Admin || userRole === UserRole.Finance;

  const rentalWeavers = useMemo(() => weavers.filter(w => w.loomType === 'Rental'), [weavers]);
  
  const filteredLoansWithDetails = useMemo(() => {
    return loans.map(loan => {
      const relatedRepayments = repayments.filter(r => r.loanId === loan.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const totalPaid = relatedRepayments.reduce((sum, r) => sum + r.amount, 0);
      const outstanding = loan.amount - totalPaid;
      const status: 'Paid' | 'Pending' = outstanding <= 0 ? 'Paid' : 'Pending';
      return { ...loan, repayments: relatedRepayments, totalPaid, outstanding, status };
    })
    .filter(loan => {
        const weaver = weavers.find(w => w.id === loan.weaverId);
        const searchTermLower = loanFilters.searchTerm.toLowerCase();
        
        const statusMatch = loanFilters.status === 'All' || loan.status === loanFilters.status;
        const searchMatch = !searchTermLower || (weaver && weaver.name.toLowerCase().includes(searchTermLower));

        return statusMatch && searchMatch;
    })
    .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
  }, [loans, repayments, weavers, loanFilters]);

  const filteredRentalWeavers = useMemo(() => {
    if (!rentalSearchTerm) {
        return rentalWeavers;
    }
    const searchTermLower = rentalSearchTerm.toLowerCase();
    return rentalWeavers.filter(weaver => weaver.name.toLowerCase().includes(searchTermLower));
  }, [rentalWeavers, rentalSearchTerm]);


  // Loan Modal and Handlers
  const handleOpenLoanModal = (loan: Loan | null = null) => {
    setEditingLoan(loan);
    setLoanFormData({
        weaverId: loan ? String(loan.weaverId) : '',
        amount: loan ? String(loan.amount) : '',
        issueDate: loan ? loan.issueDate : new Date().toISOString().split('T')[0]
    });
    setLoanModalOpen(true);
  };
  
  const handleLoanFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setLoanFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleLoanFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setLoanFormData(prev => ({...prev, [e.target.name]: e.target.value}));
  };

  const handleLoanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const weaverName = weavers.find(w => w.id === parseInt(loanFormData.weaverId))?.name || 'N/A';
    if (editingLoan) {
        setLoans(loans.map(l => l.id === editingLoan.id ? {...l, weaverId: parseInt(loanFormData.weaverId), amount: parseFloat(loanFormData.amount), issueDate: loanFormData.issueDate} : l));
        logAction('Updated', 'Finance - Loans', `Updated loan ID ${editingLoan.id} for ${weaverName} to ₹${loanFormData.amount}.`);
    } else {
        const newLoan: Loan = { id: Date.now(), weaverId: parseInt(loanFormData.weaverId), amount: parseFloat(loanFormData.amount), issueDate: loanFormData.issueDate, status: 'Pending' };
        setLoans([newLoan, ...loans]);
        logAction('Created', 'Finance - Loans', `Created new loan of ₹${loanFormData.amount} for ${weaverName}.`);
    }
    setLoanModalOpen(false);
  };
  const handleDeleteLoan = (loanId: number) => {
    if (window.confirm('Are you sure you want to delete this loan? This will also delete all its repayments.')) {
        const loanToDelete = loans.find(l => l.id === loanId);
        const weaverName = weavers.find(w => w.id === loanToDelete?.weaverId)?.name || 'N/A';
        setLoans(loans.filter(l => l.id !== loanId));
        setRepayments(repayments.filter(r => r.loanId !== loanId));
        logAction('Deleted', 'Finance - Loans', `Deleted loan ID ${loanId} (₹${loanToDelete?.amount}) for ${weaverName}.`);
    }
  };

  // Repayment Modal and Handlers
  const handleOpenRepaymentModal = (loan: Loan, repayment: Repayment | null = null) => {
    setCurrentLoanForRepayment(loan);
    setEditingRepayment(repayment);
    setRepaymentFormData({
        amount: repayment ? String(repayment.amount) : '',
        date: repayment ? repayment.date : new Date().toISOString().split('T')[0]
    });
    setRepaymentModalOpen(true);
  };

  const handleRepaymentFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRepaymentFormData(prev => ({...prev, [e.target.name]: e.target.value}));
  };

  const handleRepaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentLoanForRepayment) return;
    const weaverName = weavers.find(w => w.id === currentLoanForRepayment.weaverId)?.name || 'N/A';
    if (editingRepayment) {
        setRepayments(repayments.map(r => r.id === editingRepayment.id ? {...r, amount: parseFloat(repaymentFormData.amount), date: repaymentFormData.date} : r));
        logAction('Updated', 'Finance - Repayments', `Updated repayment for ${weaverName} to ₹${repaymentFormData.amount}.`);
    } else {
        const newRepayment: Repayment = { id: Date.now(), loanId: currentLoanForRepayment.id, amount: parseFloat(repaymentFormData.amount), date: repaymentFormData.date };
        setRepayments([newRepayment, ...repayments]);
        logAction('Created', 'Finance - Repayments', `Added repayment of ₹${repaymentFormData.amount} for ${weaverName}.`);
    }
    setRepaymentModalOpen(false);
  };
  const handleDeleteRepayment = (repaymentId: number) => {
    if (window.confirm('Are you sure you want to delete this repayment?')) {
        const repaymentToDelete = repayments.find(r => r.id === repaymentId);
        const loan = loans.find(l => l.id === repaymentToDelete?.loanId);
        const weaverName = weavers.find(w => w.id === loan?.weaverId)?.name || 'N/A';
        setRepayments(repayments.filter(r => r.id !== repaymentId));
        logAction('Deleted', 'Finance - Repayments', `Deleted repayment of ₹${repaymentToDelete?.amount} for ${weaverName}.`);
    }
  };

  // Rental Payment Modal and Handlers
  const handleOpenRentalPaymentModal = (weaver: Weaver, payment: RentalPayment | null = null) => {
    setCurrentWeaverForRental(weaver);
    setEditingRentalPayment(payment);
    setRentalPaymentFormData({
        amount: payment ? String(payment.amount) : '',
        date: payment ? payment.date : new Date().toISOString().split('T')[0]
    });
    setRentalPaymentModalOpen(true);
  };
  
  const handleRentalPaymentFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRentalPaymentFormData(prev => ({...prev, [e.target.name]: e.target.value}));
  };

  const handleRentalPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWeaverForRental) return;
    if (editingRentalPayment) {
        setRentalPayments(rentalPayments.map(p => p.id === editingRentalPayment.id ? {...p, amount: parseFloat(rentalPaymentFormData.amount), date: rentalPaymentFormData.date} : p));
        logAction('Updated', 'Finance - Rentals', `Updated rental payment for ${currentWeaverForRental.name} to ₹${rentalPaymentFormData.amount}.`);
    } else {
        const newPayment: RentalPayment = { id: Date.now(), weaverId: currentWeaverForRental.id, amount: parseFloat(rentalPaymentFormData.amount), date: rentalPaymentFormData.date };
        setRentalPayments([newPayment, ...rentalPayments]);
        logAction('Created', 'Finance - Rentals', `Logged rental payment of ₹${rentalPaymentFormData.amount} for ${currentWeaverForRental.name}.`);
    }
    setRentalPaymentModalOpen(false);
  };
  const handleDeleteRentalPayment = (paymentId: number) => {
    if (window.confirm('Are you sure you want to delete this rental payment?')) {
        const paymentToDelete = rentalPayments.find(p => p.id === paymentId);
        const weaverName = weavers.find(w => w.id === paymentToDelete?.weaverId)?.name || 'N/A';
        setRentalPayments(rentalPayments.filter(p => p.id !== paymentId));
        logAction('Deleted', 'Finance - Rentals', `Deleted rental payment of ₹${paymentToDelete?.amount} for ${weaverName}.`);
    }
  };


  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Finance Management</h2>
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-6">
            <button onClick={() => setActiveTab('loans')} className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'loans' ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'}`}>Loans</button>
            <button onClick={() => setActiveTab('rentals')} className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'rentals' ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'}`}>Loom Rentals</button>
          </nav>
        </div>

        {activeTab === 'loans' && (
          <div className="mt-6">
            <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Loan History</h3>
                <div className="w-full md:w-auto flex flex-col sm:flex-row items-center gap-2">
                    <div className="relative w-full sm:w-64">
                        <input
                            type="text"
                            name="searchTerm"
                            placeholder="Search by weaver..."
                            value={loanFilters.searchTerm}
                            onChange={handleLoanFilterChange}
                            className="w-full p-2 pl-10 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 h-10"
                        />
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    </div>
                    <select
                        name="status"
                        value={loanFilters.status}
                        onChange={handleLoanFilterChange}
                        className="w-full sm:w-auto p-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 h-10"
                    >
                        <option value="All">All Status</option>
                        <option value="Pending">Pending</option>
                        <option value="Paid">Paid</option>
                    </select>
                    {isAllowedToEdit && <button onClick={() => handleOpenLoanModal()} className="w-full sm:w-auto px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 h-10">Add Loan</button>}
                </div>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredLoansWithDetails.map(loan => (
                <div key={loan.id} className="py-4">
                  <div className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-10 md:col-span-3">
                      <p className="font-medium text-gray-900 dark:text-white">{weavers.find(w => w.id === loan.weaverId)?.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Issued: {formatDate(loan.issueDate)}</p>
                    </div>
                    <div className="col-span-4 md:col-span-2 text-sm"><p className="text-gray-500 dark:text-gray-400">Total Loan</p><p className="font-medium text-gray-800 dark:text-gray-200">₹{loan.amount.toLocaleString()}</p></div>
                    <div className="col-span-4 md:col-span-2 text-sm"><p className="text-gray-500 dark:text-gray-400">Outstanding</p><p className="font-medium text-red-600">₹{loan.outstanding.toLocaleString()}</p></div>
                    <div className="col-span-4 md:col-span-2 text-sm"><p className="text-gray-500 dark:text-gray-400">Paid</p><p className="font-medium text-green-600">₹{loan.totalPaid.toLocaleString()}</p></div>
                    <div className="col-span-8 md:col-span-2"><span className={`px-2 py-1 text-xs font-medium rounded-full ${loan.status === 'Paid' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'}`}>{loan.status}</span></div>
                    <div className="col-span-4 md:col-span-1 flex justify-end items-center gap-1">
                        {isAllowedToEdit && <button onClick={() => handleOpenLoanModal(loan)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-primary-600"><EditIcon className="w-4 h-4" /></button>}
                        <button onClick={() => setExpandedLoanId(expandedLoanId === loan.id ? null : loan.id)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"><ChevronDownIcon className={`w-5 h-5 text-gray-500 transition-transform ${expandedLoanId === loan.id ? 'rotate-180' : ''}`} /></button>
                    </div>
                  </div>
                  {expandedLoanId === loan.id && (
                    <div className="mt-4 ml-4 pl-4 border-l-2 border-gray-200 dark:border-gray-600">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-md font-semibold text-gray-600 dark:text-gray-300">Repayment History</h4>
                        {isAllowedToEdit && loan.status === 'Pending' && <button onClick={() => handleOpenRepaymentModal(loan)} className="px-3 py-1 bg-accent text-white rounded-md hover:bg-accent-hover text-sm">Add Repayment</button>}
                      </div>
                      {loan.repayments.length > 0 ? (
                        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400 mt-2">
                          <thead className="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-700"><tr><th className="px-4 py-2">Date</th><th className="px-4 py-2 text-right">Amount Paid</th>{isAllowedToEdit && <th className="px-4 py-2 text-right">Actions</th>}</tr></thead>
                          <tbody>{loan.repayments.map(rp => <tr key={rp.id} className="border-b dark:border-gray-600"><td className="px-4 py-2">{formatDate(rp.date)}</td><td className="px-4 py-2 text-right">₹{rp.amount.toLocaleString()}</td>{isAllowedToEdit && <td className="px-4 py-2 text-right"><button onClick={() => handleOpenRepaymentModal(loan, rp)} className="p-1 text-gray-500 hover:text-primary-600"><EditIcon className="w-4 h-4"/></button><button onClick={()=> handleDeleteRepayment(rp.id)} className="p-1 text-gray-500 hover:text-red-600"><TrashIcon className="w-4 h-4"/></button></td>}</tr>)}</tbody>
                        </table>
                      ) : <p className="text-sm text-gray-500 dark:text-gray-400 italic mt-2">No repayments recorded.</p>}
                      {isAllowedToEdit && <div className="mt-4"><button onClick={() => handleDeleteLoan(loan.id)} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"><TrashIcon className="w-3 h-3" /> Delete Entire Loan</button></div>}
                    </div>
                  )}
                </div>
              ))}
              {filteredLoansWithDetails.length === 0 && (
                <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                    <p>No loans match the current filters.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'rentals' && (
          <div className="mt-6">
            <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Loom Rental Payments</h3>
                <div className="relative w-full md:w-72">
                    <input
                        type="text"
                        placeholder="Search by weaver..."
                        value={rentalSearchTerm}
                        onChange={(e) => setRentalSearchTerm(e.target.value)}
                        className="w-full p-2 pl-10 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                    />
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredRentalWeavers.map(weaver => {
                  const payments = rentalPayments.filter(p => p.weaverId === weaver.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                  return (
                    <div key={weaver.id} className="py-4">
                        <div className="grid grid-cols-12 gap-4 items-center">
                            <div className="col-span-11 md:col-span-5"><p className="font-medium text-gray-900 dark:text-white">{weaver.name}</p><p className="text-sm text-gray-500 dark:text-gray-400">Loom #{weaver.loomNumber}</p></div>
                            <div className="col-span-6 md:col-span-3 text-sm"><p className="text-gray-500 dark:text-gray-400">Rental Cost</p><p className="font-medium text-gray-800 dark:text-gray-200">₹{weaver.rentalCost?.toLocaleString()} / {weaver.rentalPeriod}</p></div>
                            <div className="col-span-6 md:col-span-3 text-sm"><p className="text-gray-500 dark:text-gray-400">Total Paid</p><p className="font-medium text-green-600">₹{payments.reduce((s,p) => s + p.amount, 0).toLocaleString()}</p></div>
                            <div className="col-span-1 flex justify-end"><button onClick={() => setExpandedWeaverId(expandedWeaverId === weaver.id ? null : weaver.id)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"><ChevronDownIcon className={`w-5 h-5 text-gray-500 transition-transform ${expandedWeaverId === weaver.id ? 'rotate-180' : ''}`} /></button></div>
                        </div>
                        {expandedWeaverId === weaver.id && (
                            <div className="mt-4 ml-4 pl-4 border-l-2 border-gray-200 dark:border-gray-600">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="text-md font-semibold text-gray-600 dark:text-gray-300">Payment History</h4>
                                    {isAllowedToEdit && <button onClick={() => handleOpenRentalPaymentModal(weaver)} className="px-3 py-1 bg-accent text-white rounded-md hover:bg-accent-hover text-sm">Log Payment</button>}
                                </div>
                                {payments.length > 0 ? (
                                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400 mt-2">
                                        <thead className="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-700"><tr><th className="px-4 py-2">Date</th><th className="px-4 py-2 text-right">Amount Paid</th>{isAllowedToEdit && <th className="px-4 py-2 text-right">Actions</th>}</tr></thead>
                                        <tbody>{payments.map(p => <tr key={p.id} className="border-b dark:border-gray-600"><td className="px-4 py-2">{formatDate(p.date)}</td><td className="px-4 py-2 text-right">₹{p.amount.toLocaleString()}</td>{isAllowedToEdit && <td className="px-4 py-2 text-right"><button onClick={()=> handleOpenRentalPaymentModal(weaver, p)} className="p-1 text-gray-500 hover:text-primary-600"><EditIcon className="w-4 h-4"/></button><button onClick={()=> handleDeleteRentalPayment(p.id)} className="p-1 text-gray-500 hover:text-red-600"><TrashIcon className="w-4 h-4"/></button></td>}</tr>)}</tbody>
                                    </table>
                                ) : <p className="text-sm text-gray-500 dark:text-gray-400 italic mt-2">No rental payments recorded.</p>}
                            </div>
                        )}
                    </div>
                  );
              })}
              {filteredRentalWeavers.length === 0 && (
                <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                    <p>No weavers match the current search term.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

       {isLoanModalOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center"><div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md m-4"><h3 className="text-lg font-semibold mb-4 dark:text-gray-200">{editingLoan ? 'Edit Loan' : 'Add New Loan'}</h3><form onSubmit={handleLoanSubmit} className="space-y-4"><select name="weaverId" value={loanFormData.weaverId} onChange={handleLoanFormChange} className="w-full p-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200" required><option value="">Select Weaver</option>{weavers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select><input type="number" name="amount" value={loanFormData.amount} onChange={handleLoanFormChange} placeholder="Amount" className="w-full p-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200" required min="1" /><DateInput name="issueDate" value={loanFormData.issueDate} onChange={handleLoanFormChange} className="w-full p-2 border dark:border-gray-600 rounded" required /><div className="flex justify-end space-x-2"><button type="button" onClick={() => setLoanModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">Cancel</button><button type="submit" className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600">Save Loan</button></div></form></div></div>}
       {isRepaymentModalOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center"><div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md m-4"><h3 className="text-lg font-semibold mb-1 dark:text-gray-200">{editingRepayment ? 'Edit Repayment' : 'Add Repayment'}</h3><p className="text-sm text-gray-600 dark:text-gray-400 mb-4">For loan to {weavers.find(w=>w.id === currentLoanForRepayment?.weaverId)?.name}</p><form onSubmit={handleRepaymentSubmit} className="space-y-4"><input type="number" name="amount" value={repaymentFormData.amount} onChange={handleRepaymentFormChange} placeholder="Repayment Amount" className="w-full p-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200" required min="1" max={filteredLoansWithDetails.find(l => l.id === currentLoanForRepayment?.id)?.outstanding + (editingRepayment?.amount || 0)}/><DateInput name="date" value={repaymentFormData.date} onChange={handleRepaymentFormChange} className="w-full p-2 border dark:border-gray-600 rounded" required/><div className="flex justify-end space-x-2"><button type="button" onClick={() => setRepaymentModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">Cancel</button><button type="submit" className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600">Save Repayment</button></div></form></div></div>}
       {isRentalPaymentModalOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center"><div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md m-4"><h3 className="text-lg font-semibold mb-1 dark:text-gray-200">{editingRentalPayment ? 'Edit' : 'Log'} Rental Payment</h3><p className="text-sm text-gray-600 dark:text-gray-400 mb-4">For {currentWeaverForRental?.name}</p><form onSubmit={handleRentalPaymentSubmit} className="space-y-4"><input type="number" name="amount" value={rentalPaymentFormData.amount} onChange={handleRentalPaymentFormChange} placeholder="Payment Amount" className="w-full p-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200" required min="1"/><DateInput name="date" value={rentalPaymentFormData.date} onChange={handleRentalPaymentFormChange} className="w-full p-2 border dark:border-gray-600 rounded" required/><div className="flex justify-end space-x-2"><button type="button" onClick={() => setRentalPaymentModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">Cancel</button><button type="submit" className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600">Save Payment</button></div></form></div></div>}
    </div>
  );
};

export default FinanceManagement;