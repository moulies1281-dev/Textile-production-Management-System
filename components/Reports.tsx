import React, { useState, useMemo } from 'react';
import { ProductionLog, Weaver, Loan, Design, RentalPayment, Repayment } from '../types';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { PrinterIcon, DownloadIcon, TrendingUpIcon, ReportIcon, FileOutputIcon } from './ui/Icons';
import DateInput from './ui/DateInput';
import DateRangePresetPicker from './ui/DateRangePresetPicker';
import SearchableSelect from './ui/SearchableSelect';

declare const XLSX: any;

interface ReportsProps {
  productionLogs: ProductionLog[];
  weavers: Weaver[];
  loans: Loan[];
  designs: Design[];
  rentalPayments: RentalPayment[];
  repayments: Repayment[];
}

// Helper to escape CSV fields
const escapeCsvField = (field: any): string => {
    const stringField = String(field ?? '');
    if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
        return `"${stringField.replace(/"/g, '""')}"`;
    }
    return stringField;
};

// Generic CSV download function
const downloadCsv = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
        alert("No data available to export.");
        return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => escapeCsvField(row[header])).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

// Generic XLSX download function
const downloadXlsx = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
        alert("No data available to export.");
        return;
    }
    if (typeof XLSX === 'undefined') {
        alert("Excel export library (XLSX) is not available. Please check the internet connection.");
        return;
    }
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
    XLSX.writeFile(workbook, filename);
};


const formatDate = (dateString: string | undefined): string => {
  if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString || '';
  const [year, month, day] = dateString.split('-');
  return `${month}/${day}/${year}`;
};

const formatDateTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return String(date);
  return `${d.toLocaleDateString('en-US')}, ${d.toLocaleTimeString('en-US')}`;
};

// FIX: Define a type for financial records to improve type safety in getFinancialExportData.
interface FinancialRecord {
    record_id: string;
    date: string;
    weaver_id: number | string;
    weaver_name: string;
    type: string;
    description: string;
    debit: number;
    credit: number;
}

const Reports: React.FC<ReportsProps> = ({ productionLogs, weavers, loans, designs, rentalPayments, repayments }) => {
  const [activeTab, setActiveTab] = useState('generator');
  const [reportType, setReportType] = useState('salary');
  const [selectedWeaverId, setSelectedWeaverId] = useState<string>('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [designStatusFilter, setDesignStatusFilter] = useState<'Active' | 'Completed' | 'All'>('All');
  const [loanStatusFilter, setLoanStatusFilter] = useState<'All' | 'Pending' | 'Paid'>('All');
  const [deductLoans, setDeductLoans] = useState(true);
  const [deductLoomRentals, setDeductLoomRentals] = useState(true);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDateRange(prev => ({...prev, [e.target.name]: e.target.value}));
  };
  
  const handleRangeChange = (range: { start: string; end: string }) => {
    setDateRange(range);
  };

  const handlePrint = () => window.print();
  const getHtml2Canvas = () => (window as any).html2canvas;
  
  const handleDownloadPDF = () => {
    const element = document.getElementById('print-area');
    if (!element) return;
    const html2canvas = getHtml2Canvas();
    if (!html2canvas) return alert("PDF library failed to load.");
    
    html2canvas(element, { scale: 2, backgroundColor: '#ffffff' }).then((canvas: any) => {
      const imgData = canvas.toDataURL('image/png');
      const { jsPDF } = (window as any).jspdf;
      const pdf = new jsPDF({ orientation: activeTab === 'analytics' ? 'l' : 'p', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const ratio = canvasWidth / canvasHeight;
      const width = pdfWidth - 20;
      let height = width / ratio;

      if (height > pdfHeight - 20) {
        height = pdfHeight - 20;
      }
      
      pdf.addImage(imgData, 'PNG', 10, 10, width, height);
      
      pdf.save(`Report-${activeTab === 'analytics' ? 'Analytics': reportType}-${dateRange.start}.pdf`);
    });
  };

  const parseDate = (dateString: string | undefined) => {
    if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return null;
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const filteredProduction = useMemo(() => {
    const start = parseDate(dateRange.start);
    const end = parseDate(dateRange.end);
    if (end) end.setHours(23, 59, 59, 999);
    
    return productionLogs.flatMap(log => {
      const logDate = parseDate(log.date);
      if (!logDate) return [];

      if ((start && logDate < start) || (end && logDate > end)) return [];

      const weaver = weavers.find(w => w.id === log.weaverId);
      if (!weaver) return [];
      
      const items = log.items.filter(item => {
        if (designStatusFilter === 'All') return true;
        const allocation = weaver.designAllocations.find(a => a.designId === item.designId);
        return allocation?.status === designStatusFilter;
      });

      if (items.length === 0) return [];
      return [{ ...log, items }];
    });
  }, [productionLogs, weavers, dateRange, designStatusFilter]);
  
  // Memoized data for reports
  const productionSummaryData = useMemo(() => {
    if (activeTab !== 'generator' || reportType !== 'production' || !dateRange.start || !dateRange.end) return null;
    return filteredProduction.flatMap(log => {
        const weaverName = weavers.find(w => w.id === log.weaverId)?.name || 'N/A';
        const totalItemsInLog = log.items.reduce((sum, i) => sum + i.quantity, 0);
        return log.items.map(item => {
            const designName = designs.find(d => d.id === item.designId)?.name || 'N/A';
            const totalYarn = (log.yarnIssued.warp || 0) + (log.yarnIssued.weft || 0);
            const yarnPerItem = totalItemsInLog > 0 ? totalYarn / totalItemsInLog : 0;
            return {
                date: log.date, weaverName, designName, color: item.color, quantity: item.quantity,
                yarn: yarnPerItem * item.quantity,
            };
        });
    }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filteredProduction, weavers, designs, dateRange, activeTab, reportType]);
  
  const deliveryReportData = useMemo(() => {
    if (activeTab !== 'generator' || reportType !== 'delivery' || !dateRange.start || !dateRange.end) return null;
    const relevantLogs = selectedWeaverId
        ? filteredProduction.filter(log => log.weaverId === parseInt(selectedWeaverId))
        : filteredProduction;
    return relevantLogs.map(log => ({
        date: log.date, weaverName: weavers.find(w => w.id === log.weaverId)?.name || 'N/A',
        totalQuantity: log.items.reduce((sum, item) => sum + item.quantity, 0), logId: log.id,
    }));
  }, [filteredProduction, selectedWeaverId, weavers, dateRange, activeTab, reportType]);
  
  const yarnReportData = useMemo(() => {
    if (activeTab !== 'generator' || reportType !== 'yarn' || !dateRange.start || !dateRange.end) return null;
    // FIX: Explicitly type the accumulator for the reduce function to resolve type inference issues.
    // FIX: Explicitly typed the accumulator for the reduce function to resolve type inference issues.
    const usageByWeaver = filteredProduction.reduce<Record<string, { warp: number; weft: number; quantity: number }>>((acc, log) => {
        const weaverName = weavers.find(w => w.id === log.weaverId)?.name || 'N/A';
        if (!acc[weaverName]) acc[weaverName] = { warp: 0, weft: 0, quantity: 0 };
        acc[weaverName].warp += log.yarnIssued.warp || 0;
        acc[weaverName].weft += log.yarnIssued.weft || 0;
        acc[weaverName].quantity += log.items.reduce((sum, i) => sum + i.quantity, 0);
        return acc;
    }, {});
    return Object.entries(usageByWeaver).map(([weaverName, { warp, weft, quantity }]) => ({ weaverName, quantity, warp, weft, total: warp + weft }));
  }, [filteredProduction, weavers, dateRange, activeTab, reportType]);

  const loanReportData = useMemo(() => {
    if (activeTab !== 'generator' || reportType !== 'loans') return null;
    const start = parseDate(dateRange.start);
    const end = parseDate(dateRange.end);
    if(end) end.setHours(23, 59, 59, 999);

    const loansWithDetails = loans.map(loan => {
        const totalPaid = repayments.filter(r => r.loanId === loan.id).reduce((sum, r) => sum + r.amount, 0);
        const outstanding = loan.amount - totalPaid;
        const status: 'Paid' | 'Pending' = outstanding <= 0 ? 'Paid' : 'Pending';
        return { ...loan, totalPaid, outstanding, status };
    });
    return loansWithDetails.filter(loan => {
        const weaverMatch = !selectedWeaverId || loan.weaverId === parseInt(selectedWeaverId);
        const statusMatch = loanStatusFilter === 'All' || loan.status === loanStatusFilter;
        const issueDate = parseDate(loan.issueDate);
        if (!issueDate) return false;
        const dateMatch = !start || issueDate >= start;
        const dateEndMatch = !end || issueDate <= end;
        return weaverMatch && statusMatch && dateMatch && dateEndMatch;
    }).map(loan => ({ weaverName: weavers.find(w => w.id === loan.weaverId)?.name || 'N/A', ...loan }));
  }, [loans, repayments, weavers, selectedWeaverId, loanStatusFilter, dateRange, activeTab, reportType]);

  const rentalReportData = useMemo(() => {
    if (activeTab !== 'generator' || reportType !== 'rentals' || !dateRange.start || !dateRange.end) return null;
    
    const start = parseDate(dateRange.start);
    const end = parseDate(dateRange.end);
    if(end) end.setHours(23, 59, 59, 999);

    return rentalPayments.filter(p => {
        const paymentDate = parseDate(p.date);
        if(!paymentDate || !start || !end) return false;
        const weaverMatch = !selectedWeaverId || p.weaverId === parseInt(selectedWeaverId);
        return paymentDate >= start && paymentDate <= end && weaverMatch;
    }).map(p => ({ date: p.date, weaverName: weavers.find(w => w.id === p.weaverId)?.name || 'N/A', amount: p.amount, }))
    .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [rentalPayments, weavers, selectedWeaverId, dateRange, activeTab, reportType]);

  const designSummaryData = useMemo(() => {
    if (activeTab !== 'generator' || reportType !== 'designSummary' || !dateRange.start || !dateRange.end) return null;
    const productionByDesign = filteredProduction.flatMap(log => log.items).reduce<Record<string, number>>((acc, item) => {
        const designName = designs.find(d => d.id === item.designId)?.name || 'N/A';
        if (!acc[designName]) acc[designName] = 0;
        acc[designName] += item.quantity;
        return acc;
    }, {});
    return Object.entries(productionByDesign).map(([designName, totalQuantity]) => ({ designName, totalQuantity }))
    .sort((a,b) => b.totalQuantity - a.totalQuantity);
  }, [filteredProduction, designs, dateRange, activeTab, reportType]);

  // Analytics Data
  const weaverPerformanceData = useMemo(() => {
    if (activeTab !== 'analytics' || !dateRange.start || !dateRange.end) return [];
    const performance = filteredProduction.reduce<Record<string, number>>((acc, log) => {
        const weaverName = weavers.find(w => w.id === log.weaverId)?.name || 'N/A';
        const totalQuantity = log.items.reduce((sum, item) => sum + item.quantity, 0);
        acc[weaverName] = (acc[weaverName] || 0) + totalQuantity;
        return acc;
    }, {});
    return Object.entries(performance).map(([name, production]) => ({ name, production })).sort((a,b) => b.production - a.production);
  }, [filteredProduction, weavers, dateRange, activeTab]);

  const loanProgressData = useMemo(() => {
    if (activeTab !== 'analytics') return [];
    return loans.map(loan => {
        const weaverName = weavers.find(w => w.id === loan.weaverId)?.name || 'N/A';
        const totalPaid = repayments.filter(r => r.loanId === loan.id).reduce((sum, r) => sum + r.amount, 0);
        return { name: `${weaverName} (ID ${loan.id})`, Paid: totalPaid, Outstanding: Math.max(0, loan.amount - totalPaid) };
    });
  }, [loans, repayments, weavers, activeTab]);

  // Data preparation for exports
  const getProductionExportData = () => {
    return productionLogs.flatMap(log => {
        const weaver = weavers.find(w => w.id === log.weaverId);
        return log.items.map(item => {
            const design = designs.find(d => d.id === item.designId);
            return {
                log_id: log.id,
                date: log.date,
                weaver_id: log.weaverId,
                weaver_name: weaver?.name || 'N/A',
                design_id: item.designId,
                design_name: design?.name || 'N/A',
                color: item.color,
                quantity: item.quantity,
                yarn_issued_warp_kg: log.yarnIssued.warp ?? 0,
                yarn_issued_weft_kg: log.yarnIssued.weft ?? 0,
            };
        });
    });
  };

  const getWeaverExportData = () => {
      return weavers.map(weaver => {
          const activeDesigns = weaver.designAllocations
              .filter(da => da.status === 'Active')
              .map(da => designs.find(d => d.id === da.designId)?.name)
              .filter(Boolean)
              .join('; ');

          return {
              id: weaver.id,
              name: weaver.name,
              contact: weaver.contact,
              join_date: weaver.joinDate,
              loom_number: weaver.loomNumber,
              loom_type: weaver.loomType,
              wage_type: weaver.wageType,
              rate: weaver.rate,
              rental_cost: weaver.rentalCost ?? 'N/A',
              rental_period: weaver.rentalPeriod ?? 'N/A',
              active_designs: activeDesigns,
          };
      });
  };

  const getFinancialExportData = () => {
      // FIX: Changed allRecords from any[] to FinancialRecord[] for type safety, which resolves TS inference issues.
      // FIX: Changed allRecords from any[] to FinancialRecord[] for type safety, which resolves TS inference issues.
      const allRecords: FinancialRecord[] = [];
      loans.forEach(loan => {
          allRecords.push({
              record_id: `loan-${loan.id}`,
              date: loan.issueDate,
              weaver_id: loan.weaverId,
              weaver_name: weavers.find(w => w.id === loan.weaverId)?.name || 'N/A',
              type: 'Loan Issued',
              description: `Loan issued (ID: ${loan.id})`,
              debit: loan.amount,
              credit: 0,
          });
      });
      repayments.forEach(repayment => {
          const loan = loans.find(l => l.id === repayment.loanId);
          allRecords.push({
              record_id: `repayment-${repayment.id}`,
              date: repayment.date,
              weaver_id: loan?.weaverId || 'N/A',
              weaver_name: weavers.find(w => w.id === loan?.weaverId)?.name || 'N/A',
              type: 'Loan Repayment',
              description: `Repayment for Loan ID ${repayment.loanId}`,
              debit: 0,
              credit: repayment.amount,
          });
      });
      rentalPayments.forEach(payment => {
          allRecords.push({
              record_id: `rental-${payment.id}`,
              date: payment.date,
              weaver_id: payment.weaverId,
              weaver_name: weavers.find(w => w.id === payment.weaverId)?.name || 'N/A',
              type: 'Rental Payment',
              description: 'Loom rental payment',
              debit: 0,
              credit: payment.amount,
          });
      });
      // FIX: The arithmetic error was likely due to ambiguous types from `any[]`. Strong typing resolves this.
      allRecords.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      return allRecords;
  };

  // Render Functions
  const renderSalaryReport = () => {
    if (reportType !== 'salary' || !selectedWeaverId || !dateRange.start || !dateRange.end) {
        return <div className="p-8 text-center text-gray-500 dark:text-gray-400">Please select a weaver and a date range to generate a salary slip.</div>;
    }
    const weaver = weavers.find(w => w.id === parseInt(selectedWeaverId));
    if (!weaver) return <div className="p-8 text-center text-gray-500 dark:text-gray-400">Weaver not found.</div>;

    const start = parseDate(dateRange.start);
    const end = parseDate(dateRange.end);
    if(end) end.setHours(23, 59, 59, 999);

    const productionInDateRange = filteredProduction.filter(log => log.weaverId === weaver.id);
    const earnings = productionInDateRange.flatMap(log => log.items.map(item => {
        const design = designs.find(d => d.id === item.designId);
        const rate = design?.defaultRate ?? weaver.rate;
        return { date: log.date, designName: design?.name || 'Unknown', color: item.color, quantity: item.quantity, rate: rate, amount: item.quantity * rate };
    }));
    const totalEarnings = earnings.reduce((sum, item) => sum + item.amount, 0);

    const loanRepaymentsInRange = repayments.filter(r => {
        const loan = loans.find(l => l.id === r.loanId); if (!loan || loan.weaverId !== weaver.id) return false;
        const paymentDate = parseDate(r.date);
        if(!paymentDate || !start || !end) return false;
        return paymentDate >= start && paymentDate <= end;
    });
    const totalLoanDeduction = deductLoans ? loanRepaymentsInRange.reduce((sum, r) => sum + r.amount, 0) : 0;
    const rentalPaymentsInRange = rentalPayments.filter(p => {
        if (p.weaverId !== weaver.id) return false;
        const paymentDate = parseDate(p.date);
        if(!paymentDate || !start || !end) return false;
        return paymentDate >= start && paymentDate <= end;
    });
    const totalRentalDeduction = deductLoomRentals ? rentalPaymentsInRange.reduce((sum, p) => sum + p.amount, 0) : 0;
    const totalDeductions = totalLoanDeduction + totalRentalDeduction;
    const netSalary = totalEarnings - totalDeductions;
    
    const allDeductions = [];
    if (deductLoans) {
        loanRepaymentsInRange.forEach(r => allDeductions.push({ key: `loan-${r.id}`, label: `Loan Repayment on ${formatDate(r.date)}`, amount: r.amount }));
    }
    if (deductLoomRentals) {
        rentalPaymentsInRange.forEach(p => allDeductions.push({ key: `rental-${p.id}`, label: `Loom Rental on ${formatDate(p.date)}`, amount: p.amount }));
    }

    return (
        <div id="print-area" className="bg-white dark:bg-gray-900 p-8 rounded-lg shadow-md mt-6 text-black dark:text-white">
             <div className="flex justify-between items-start border-b dark:border-gray-700 pb-4 mb-4"><h1 className="text-2xl font-bold text-primary-600 dark:text-primary-400">RC Tex</h1><div className="text-right"><h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">{weaver.name}</h2><p className="text-gray-700 dark:text-gray-300">{formatDate(dateRange.start)} to {formatDate(dateRange.end)}</p><p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Generated: {formatDateTime(new Date())}</p></div></div>
            <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">Earnings</h3>
            <table className="w-full text-sm mb-6"><thead><tr className="border-b dark:border-gray-700"><th className="p-2 text-right text-gray-600 dark:text-gray-400 font-semibold">S.No.</th><th className="p-2 text-left text-gray-600 dark:text-gray-400 font-semibold">Date</th><th className="p-2 text-left text-gray-600 dark:text-gray-400 font-semibold">Design</th><th className="p-2 text-right text-gray-600 dark:text-gray-400 font-semibold">Qty</th><th className="p-2 text-right text-gray-600 dark:text-gray-400 font-semibold">Rate</th><th className="p-2 text-right text-gray-600 dark:text-gray-400 font-semibold">Amount</th></tr></thead><tbody>{earnings.map((item, i) => (<tr key={i} className="border-b dark:border-gray-700"><td className="p-2 text-gray-800 dark:text-gray-200 text-right">{i + 1}</td><td className="p-2 text-gray-800 dark:text-gray-200">{formatDate(item.date)}</td><td className="p-2 text-gray-800 dark:text-gray-200">{item.designName} ({item.color})</td><td className="p-2 text-right text-gray-800 dark:text-gray-200">{item.quantity}</td><td className="p-2 text-right text-gray-800 dark:text-gray-200">₹{item.rate.toFixed(2)}</td><td className="p-2 text-right text-gray-800 dark:text-gray-200">₹{item.amount.toFixed(2)}</td></tr>))}</tbody><tfoot><tr className="font-semibold"><td colSpan={5} className="p-2 text-right text-gray-900 dark:text-gray-100">Total Earnings</td><td className="p-2 text-right text-gray-900 dark:text-gray-100">₹{totalEarnings.toFixed(2)}</td></tr></tfoot></table>
            { (totalDeductions > 0) && <><h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">Deductions</h3><table className="w-full text-sm mb-6"><thead><tr className="border-b dark:border-gray-700"><th className="p-2 text-right text-gray-600 dark:text-gray-400 font-semibold">S.No.</th><th className="p-2 text-left text-gray-600 dark:text-gray-400 font-semibold">Description</th><th className="p-2 text-right text-gray-600 dark:text-gray-400 font-semibold">Amount</th></tr></thead><tbody>{allDeductions.map((ded, i) => (<tr key={ded.key} className="border-b dark:border-gray-700"><td className="p-2 text-gray-800 dark:text-gray-200 text-right">{i+1}</td><td className="p-2 text-gray-800 dark:text-gray-200">{ded.label}</td><td className="p-2 text-right text-gray-800 dark:text-gray-200">₹{ded.amount.toFixed(2)}</td></tr>))}</tbody><tfoot><tr className="font-semibold"><td colSpan={2} className="p-2 text-right text-gray-900 dark:text-gray-100">Total Deductions</td><td className="p-2 text-right text-gray-900 dark:text-gray-100">₹{totalDeductions.toFixed(2)}</td></tr></tfoot></table></>}
            <div className="text-right mt-6 pt-4 border-t dark:border-gray-700"><p className="text-lg font-bold text-gray-900 dark:text-gray-100">Net Salary: <span className="text-primary-600 dark:text-primary-400">₹{netSalary.toFixed(2)}</span></p></div>
        </div>
    );
  };
  const renderGenericReport = (title: string, headers: string[], data: any[][], footers: string[]) => {
    const numericHeaders = ['S.No.', 'Amount', 'Paid', 'Outstanding', 'Quantity', 'Rate', 'Qty', 'Warp', 'Weft', 'Total', 'Yarn'];
    return (
    <div id="print-area" className="bg-white dark:bg-gray-900 p-8 rounded-lg shadow-md mt-6 text-black dark:text-white">
        <div className="flex justify-between items-start border-b dark:border-gray-700 pb-4 mb-4"><div><h1 className="text-2xl font-bold text-primary-600 dark:text-primary-400">RC Tex</h1><p className="text-gray-800 dark:text-gray-200">{title}</p></div><div className="text-right"><h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Report</h2><p className="text-gray-700 dark:text-gray-300">{formatDate(dateRange.start)} to {dateRange.end ? formatDate(dateRange.end) : 'Today'}</p><p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Generated: {formatDateTime(new Date())}</p></div></div>
        <table className="w-full text-sm"><thead><tr className="border-b dark:border-gray-700">{headers.map((h, i) => <th key={i} className={`p-2 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold ${numericHeaders.some(t => h.includes(t)) ? 'text-right' : 'text-left'}`}>{h}</th>)}</tr></thead><tbody>{data.map((row, i) => <tr key={i} className="border-b dark:border-gray-700">{row.map((cell, j) => <td key={j} className={`p-2 text-gray-800 dark:text-gray-200 ${typeof cell === 'number' || (headers[j] && numericHeaders.some(t => headers[j].includes(t))) ? 'text-right' : 'text-left'}`}>{typeof cell === 'number' ? cell.toLocaleString() : cell}</td>)}</tr>)}</tbody>{footers.length > 0 && <tfoot><tr className="border-t dark:border-gray-700 font-semibold">{footers.map((f, i) => <td key={i} className={`p-2 text-gray-900 dark:text-gray-100 ${footers.length < headers.length ? 'text-right' : (i > 0 ? 'text-right' : 'text-left')}`} colSpan={footers.length === headers.length ? 1 : (i === 0 ? headers.length - footers.length + 1: 1)}>{f}</td>)}</tr></tfoot>}</table>
    </div>
  )};
  const renderAnalytics = () => (
    <div id="print-area" className="space-y-6 mt-6">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">Weaver Performance ({dateRange.start && formatDate(dateRange.start)} - {dateRange.end && formatDate(dateRange.end)})</h3>
                {weaverPerformanceData.length > 0 ? <ResponsiveContainer width="100%" height={400}><BarChart data={weaverPerformanceData} layout="vertical" margin={{ top: 5, right: 20, left: 60, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="hsl(215 20% 65% / 0.3)" /><XAxis type="number" tick={{ fill: 'hsl(215 25% 65%)' }} /><YAxis type="category" dataKey="name" width={100} interval={0} tick={{ fill: 'hsl(215 25% 65%)' }} /><Tooltip contentStyle={{ backgroundColor: 'hsl(215 28% 17%)', border: '1px solid hsl(215 20% 65% / 0.3)' }} cursor={{fill: 'rgba(255,255,255,0.1)'}} /><Legend wrapperStyle={{ color: 'hsl(215 25% 65%)' }} /><Bar dataKey="production" fill="#8884d8" name="Total Pieces" /></BarChart></ResponsiveContainer> : <p className="text-center text-gray-500 dark:text-gray-400 pt-16">No production data in selected range.</p>}
            </div>
             <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">Loan Repayment Progress</h3>
                {loanProgressData.length > 0 ? <ResponsiveContainer width="100%" height={400}><BarChart data={loanProgressData} layout="vertical" stackOffset="expand"><CartesianGrid strokeDasharray="3 3" stroke="hsl(215 20% 65% / 0.3)" /><XAxis type="number" hide tick={{ fill: 'hsl(215 25% 65%)' }}/><YAxis type="category" dataKey="name" width={120} interval={0} tick={{ fill: 'hsl(215 25% 65%)' }} /><Tooltip formatter={(value, name, props) => `₹${props.payload[name].toLocaleString()}`} contentStyle={{ backgroundColor: 'hsl(215 28% 17%)', border: '1px solid hsl(215 20% 65% / 0.3)' }}/><Legend wrapperStyle={{ color: 'hsl(215 25% 65%)' }} /><Bar dataKey="Paid" stackId="a" fill="#82ca9d" /><Bar dataKey="Outstanding" stackId="a" fill="#ffc658" /></BarChart></ResponsiveContainer> : <p className="text-center text-gray-500 dark:text-gray-400 pt-16">No loan data available.</p>}
            </div>
        </div>
    </div>
  );
  
  return (
    <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md print:hidden">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Reports & Analytics</h2>
                <div className="flex items-center gap-2">
                    <button onClick={handlePrint} className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover flex items-center gap-2"><PrinterIcon className="w-5 h-5"/> Print</button>
                    <button onClick={handleDownloadPDF} className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 flex items-center gap-2"><DownloadIcon className="w-5 h-5"/> Download PDF</button>
                </div>
            </div>
            
            <div className="border-b border-gray-200 dark:border-gray-700 mb-4">
                <nav className="-mb-px flex space-x-6">
                    <button onClick={() => setActiveTab('generator')} className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'generator' ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'}`}><ReportIcon className="w-5 h-5"/> Report Generator</button>
                    <button onClick={() => setActiveTab('analytics')} className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'analytics' ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'}`}><TrendingUpIcon className="w-5 h-5"/> Analytics</button>
                    <button onClick={() => setActiveTab('export')} className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'export' ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'}`}><FileOutputIcon className="w-5 h-5"/> Data Export</button>
                </nav>
            </div>

            {activeTab === 'generator' && <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Start Date</label><DateInput name="start" value={dateRange.start} onChange={handleDateChange} className="w-full p-2 border dark:border-gray-600 rounded-md"/></div>
                    <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">End Date</label><DateInput name="end" value={dateRange.end} onChange={handleDateChange} className="w-full p-2 border dark:border-gray-600 rounded-md"/></div>
                    <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Quick Select</label><DateRangePresetPicker onRangeChange={handleRangeChange} /></div>
                    <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Report Type</label>
                        <select value={reportType} onChange={e => setReportType(e.target.value)} className="w-full p-2 border dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 h-10">
                            <option value="salary">Salary Slip</option>
                            <option value="production">Production Summary</option>
                            <option value="yarn">Yarn Usage</option>
                            <option value="delivery">Delivery Report</option>
                            <option value="loans">Loan Summary</option>
                            <option value="rentals">Rental Payments</option>
                            <option value="designSummary">Design-wise Summary</option>
                        </select>
                    </div>
                </div>
                 {['salary', 'delivery', 'loans', 'rentals'].includes(reportType) && 
                    <div className="mt-4"><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Weaver (Optional)</label><SearchableSelect options={weavers.map(w => ({value: w.id, label: w.name}))} value={selectedWeaverId} onChange={(v) => setSelectedWeaverId(v as string)} placeholder="All Weavers"/></div>}
                {reportType === 'loans' && 
                    <div className="mt-4"><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Loan Status</label><select value={loanStatusFilter} onChange={e => setLoanStatusFilter(e.target.value as any)} className="w-full p-2 border dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 h-10"><option value="All">All</option><option value="Pending">Pending</option><option value="Paid">Paid</option></select></div>}
                {reportType === 'salary' && (
                    <div className="mt-4 space-x-4"><label className="inline-flex items-center"><input type="checkbox" checked={deductLoans} onChange={e => setDeductLoans(e.target.checked)} className="form-checkbox"/><span className="ml-2 text-gray-800 dark:text-gray-200">Deduct Loans</span></label><label className="inline-flex items-center"><input type="checkbox" checked={deductLoomRentals} onChange={e => setDeductLoomRentals(e.target.checked)} className="form-checkbox"/><span className="ml-2 text-gray-800 dark:text-gray-200">Deduct Rentals</span></label></div>
                )}
            </>}
        </div>

        {activeTab === 'generator' && reportType === 'salary' && renderSalaryReport()}
        {activeTab === 'generator' && reportType === 'production' && productionSummaryData && renderGenericReport('Production Summary', ['S.No.', 'Date', 'Weaver', 'Design', 'Color', 'Quantity', 'Est. Yarn (kg)'], productionSummaryData.map((d, i) => [i + 1, formatDate(d.date), d.weaverName, d.designName, d.color, d.quantity, d.yarn.toFixed(2)]), ['Total Quantity', '', '', '', '', productionSummaryData.reduce((s, d) => s + d.quantity, 0).toLocaleString(), productionSummaryData.reduce((s,d) => s + d.yarn, 0).toFixed(2)])}
        {activeTab === 'generator' && reportType === 'yarn' && yarnReportData && renderGenericReport('Yarn Usage by Weaver', ['S.No.', 'Weaver', 'Total Quantity', 'Warp (kg)', 'Weft (kg)', 'Total (kg)'], yarnReportData.map((d, i) => [i + 1, d.weaverName, d.quantity, d.warp.toFixed(2), d.weft.toFixed(2), d.total.toFixed(2)]), ['Total', '', yarnReportData.reduce((s, d) => s + d.quantity, 0), yarnReportData.reduce((s,d) => s + d.warp, 0).toFixed(2), yarnReportData.reduce((s,d) => s + d.weft, 0).toFixed(2), yarnReportData.reduce((s,d) => s + d.total, 0).toFixed(2)])}
        {activeTab === 'generator' && reportType === 'delivery' && deliveryReportData && renderGenericReport('Delivery Report', ['S.No.', 'Date', 'Weaver', 'Total Quantity', 'Log ID'], deliveryReportData.map((d, i) => [i + 1, formatDate(d.date), d.weaverName, d.totalQuantity, d.logId]), ['Total Quantity', '', '', deliveryReportData.reduce((s,d)=> s + d.totalQuantity, 0).toLocaleString(), ''])}
        {activeTab === 'generator' && reportType === 'loans' && loanReportData && (() => {
            const totalAmount = loanReportData.reduce((s, l) => s + l.amount, 0);
            const totalPaid = loanReportData.reduce((s, l) => s + l.totalPaid, 0);
            const totalOutstanding = loanReportData.reduce((s, l) => s + l.outstanding, 0);
            return renderGenericReport('Loan Summary', ['S.No.', 'Weaver', 'Issue Date', 'Amount', 'Paid', 'Outstanding', 'Status'], loanReportData.map((l, i) => [i + 1, l.weaverName, formatDate(l.issueDate), `₹${l.amount.toLocaleString()}`, `₹${l.totalPaid.toLocaleString()}`, `₹${l.outstanding.toLocaleString()}`, l.status]), ['Total', '', '', `₹${totalAmount.toLocaleString()}`, `₹${totalPaid.toLocaleString()}`, `₹${totalOutstanding.toLocaleString()}`, '']);
        })()}
        {activeTab === 'generator' && reportType === 'rentals' && rentalReportData && renderGenericReport('Rental Payments', ['S.No.', 'Date', 'Weaver', 'Amount'], rentalReportData.map((p, i) => [i + 1, formatDate(p.date), p.weaverName, `₹${p.amount.toLocaleString()}`]), ['Total', '', '', `₹${rentalReportData.reduce((s, p) => s + p.amount, 0).toLocaleString()}`])}
        {activeTab === 'generator' && reportType === 'designSummary' && designSummaryData && renderGenericReport('Design-wise Production Summary', ['S.No.', 'Design Name', 'Total Quantity Produced'], designSummaryData.map((d, i) => [i + 1, d.designName, d.totalQuantity]), ['Total Quantity', '', designSummaryData.reduce((s,d) => s + d.totalQuantity, 0)])}
        
        {activeTab === 'analytics' && renderAnalytics()}
        
        {activeTab === 'export' && (
             <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mt-6">
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4 border-b dark:border-gray-700 pb-2">Data Export</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Download complete raw data for production, weavers, or financials in CSV or Excel format.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border dark:border-gray-600">
                        <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">Production Logs</h4>
                        <div className="flex flex-col sm:flex-row gap-2">
                           <button onClick={() => downloadCsv(getProductionExportData(), `production-logs-${new Date().toISOString().split('T')[0]}.csv`)} className="w-full flex-1 text-sm flex items-center justify-center gap-2 px-3 py-2 bg-white dark:bg-gray-600 dark:text-gray-200 border border-gray-300 dark:border-gray-500 rounded-md hover:bg-gray-100 dark:hover:bg-gray-500 transition-colors">Export CSV</button>
                           <button onClick={() => downloadXlsx(getProductionExportData(), `production-logs-${new Date().toISOString().split('T')[0]}.xlsx`)} className="w-full flex-1 text-sm flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors">Export Excel</button>
                        </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border dark:border-gray-600">
                         <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">Weaver Data</h4>
                         <div className="flex flex-col sm:flex-row gap-2">
                            <button onClick={() => downloadCsv(getWeaverExportData(), `weaver-data-${new Date().toISOString().split('T')[0]}.csv`)} className="w-full flex-1 text-sm flex items-center justify-center gap-2 px-3 py-2 bg-white dark:bg-gray-600 dark:text-gray-200 border border-gray-300 dark:border-gray-500 rounded-md hover:bg-gray-100 dark:hover:bg-gray-500 transition-colors">Export CSV</button>
                            <button onClick={() => downloadXlsx(getWeaverExportData(), `weaver-data-${new Date().toISOString().split('T')[0]}.xlsx`)} className="w-full flex-1 text-sm flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors">Export Excel</button>
                         </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border dark:border-gray-600">
                         <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">Financial Records</h4>
                         <div className="flex flex-col sm:flex-row gap-2">
                            <button onClick={() => downloadCsv(getFinancialExportData(), `financial-records-${new Date().toISOString().split('T')[0]}.csv`)} className="w-full flex-1 text-sm flex items-center justify-center gap-2 px-3 py-2 bg-white dark:bg-gray-600 dark:text-gray-200 border border-gray-300 dark:border-gray-500 rounded-md hover:bg-gray-100 dark:hover:bg-gray-500 transition-colors">Export CSV</button>
                            <button onClick={() => downloadXlsx(getFinancialExportData(), `financial-records-${new Date().toISOString().split('T')[0]}.xlsx`)} className="w-full flex-1 text-sm flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors">Export Excel</button>
                         </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default Reports;