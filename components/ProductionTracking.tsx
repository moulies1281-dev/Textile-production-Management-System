import React, { useState, useMemo, useEffect } from 'react';
import { ProductionLog, Weaver, Design, UserRole, ProductionLogItem } from '../types';
import { PrinterIcon, DownloadIcon, EditIcon, TrashIcon, ChevronDownIcon, ShareIcon, QrCodeIcon, CloseIcon } from './ui/Icons';
import SearchableSelect from './ui/SearchableSelect';
import DateInput from './ui/DateInput';
import DateRangePresetPicker from './ui/DateRangePresetPicker';
import QRScanner from './ui/QRScanner';

interface ProductionTrackingProps {
  productionLogs: ProductionLog[];
  setProductionLogs: React.Dispatch<React.SetStateAction<ProductionLog[]>>;
  weavers: Weaver[];
  designs: Design[];
  userRole: UserRole;
  logAction: (action: 'Created' | 'Updated' | 'Deleted', module: string, details: string) => void;
}

const formatDate = (dateString: string): string => {
  if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString;
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
};

const formatDateTime = (date: Date): string => {
    return `${date.toLocaleDateString('en-GB')}, ${date.toLocaleTimeString('en-US')}`;
};

type LogFormItem = { designId: number; designName: string; color: string; quantity: string };

const ProductionTracking: React.FC<ProductionTrackingProps> = ({ productionLogs, setProductionLogs, weavers, designs, userRole, logAction }) => {
  const [filters, setFilters] = useState({ dateStart: '', dateEnd: '', weaverId: '', designId: '', status: 'All' });
  const [showChalanModal, setShowChalanModal] = useState<ProductionLog | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<ProductionLog | null>(null);
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  
  // Form State
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formWeaverId, setFormWeaverId] = useState('');
  const [formYarn, setFormYarn] = useState({ warp: '', weft: ''});
  const [formLogItems, setFormLogItems] = useState<LogFormItem[]>([]);

  const isAllowedToEdit = userRole === UserRole.Admin || userRole === UserRole.Supervisor;
  const weaverOptions = useMemo(() => weavers.map(w => ({ value: w.id, label: w.name })), [weavers]);
  const designOptions = useMemo(() => designs.map(d => ({ value: d.id, label: d.name })), [designs]);
  const canShare = useMemo(() => navigator.share && navigator.canShare, []);

  useEffect(() => {
    if (!formWeaverId) { setFormLogItems([]); return; }
    const weaver = weavers.find(w => w.id === parseInt(formWeaverId));
    if (!weaver) { setFormLogItems([]); return; }
    
    if (editingLog && String(editingLog.weaverId) === formWeaverId) {
        const items = editingLog.items.map(item => ({
            designId: item.designId,
            designName: designs.find(d=>d.id === item.designId)?.name || 'Unknown',
            color: item.color,
            quantity: String(item.quantity)
        }));
        setFormLogItems(items);
    } else {
        const activeAllocations = weaver.designAllocations.filter(a => a.status === 'Active');
        const items: LogFormItem[] = activeAllocations.flatMap(alloc => {
            const design = designs.find(d => d.id === alloc.designId);
            return alloc.colors.map(color => ({
                designId: alloc.designId,
                designName: design?.name || 'Unknown',
                color,
                quantity: ''
            }));
        });
        setFormLogItems(items);
    }
  }, [formWeaverId, weavers, designs, editingLog]);
  

  const handleFilterChange = (name: string, value: string | number) => setFilters(prev => ({ ...prev, [name]: value }));
  const handleFilterDateChange = (e: React.ChangeEvent<HTMLInputElement>) => setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleRangeChange = (range: { start: string; end: string }) => {
    setFilters(prev => ({ ...prev, dateStart: range.start, dateEnd: range.end }));
  };

  const getLogStatus = (log: ProductionLog) => {
    const weaver = weavers.find(w => w.id === log.weaverId);
    if (!weaver || !weaver.designAllocations || log.items.length === 0) {
        return { text: 'Unknown', className: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' };
    }

    const itemStatuses = log.items.map(item => {
        const alloc = weaver.designAllocations.find(a => a.designId === item.designId);
        return alloc?.status;
    });

    if (itemStatuses.every(s => s === 'Completed')) {
        return { text: 'Completed', className: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' };
    }

    if (itemStatuses.some(s => s === 'Active')) {
        return { text: 'Ongoing', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300' };
    }
    
    return { text: 'Archived', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' };
  };

  const filteredLogs = useMemo(() => {
    return productionLogs.filter(log => {
      const logDate = new Date(log.date);
      const start = filters.dateStart ? new Date(filters.dateStart) : null;
      const end = filters.dateEnd ? new Date(filters.dateEnd) : null;
      
      const statusMatch = () => {
        if (filters.status === 'All') return true;
        const weaver = weavers.find(w => w.id === log.weaverId);
        if (!weaver) return false;
        
        if (filters.status === 'Active') { // Ongoing
            return log.items.some(item => {
                const alloc = weaver.designAllocations.find(a => a.designId === item.designId);
                return alloc?.status === 'Active';
            });
        }
        if (filters.status === 'Completed') {
            return log.items.length > 0 && log.items.every(item => {
                const alloc = weaver.designAllocations.find(a => a.designId === item.designId);
                return alloc?.status === 'Completed';
            });
        }
        return true;
      };

      return (
        (!start || logDate >= start) &&
        (!end || logDate <= end) &&
        (!filters.weaverId || log.weaverId === parseInt(filters.weaverId)) &&
        (!filters.designId || log.items.some(item => item.designId === parseInt(filters.designId))) &&
        statusMatch()
      );
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [productionLogs, filters, weavers]);

  const handleOpenModal = (log: ProductionLog | null = null) => {
    setEditingLog(log);
    if (log) {
        setFormDate(log.date);
        setFormWeaverId(String(log.weaverId));
        setFormYarn({ warp: String(log.yarnIssued.warp || ''), weft: String(log.yarnIssued.weft || '') });
    } else {
        setFormDate(new Date().toISOString().split('T')[0]);
        setFormWeaverId('');
        setFormYarn({ warp: '', weft: '' });
        setFormLogItems([]);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingLog(null);
  };

  const handleLogItemChange = (index: number, quantity: string) => {
    const newItems = [...formLogItems];
    newItems[index].quantity = quantity;
    setFormLogItems(newItems);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const weaverName = weavers.find(w => w.id === parseInt(formWeaverId))?.name || 'N/A';
    
    const itemsToLog: ProductionLogItem[] = formLogItems
        .filter(item => parseInt(item.quantity) > 0)
        .map(item => ({
            designId: item.designId,
            color: item.color,
            quantity: parseInt(item.quantity)
        }));

    if (itemsToLog.length === 0) {
        alert("Please enter a quantity for at least one item.");
        return;
    }

    const totalQuantity = itemsToLog.reduce((sum, item) => sum + item.quantity, 0);

    const logData = {
        date: formDate,
        weaverId: parseInt(formWeaverId),
        items: itemsToLog,
        yarnIssued: {
            warp: formYarn.warp ? parseFloat(formYarn.warp) : undefined,
            weft: formYarn.weft ? parseFloat(formYarn.weft) : undefined,
        },
    };

    if (editingLog) {
        const updatedLog = { ...editingLog, ...logData };
        setProductionLogs(productionLogs.map(log => log.id === editingLog.id ? updatedLog : log));
        logAction('Updated', 'Production', `Updated log ID ${editingLog.id} for weaver ${weaverName}.`);
    } else {
        const newLog: ProductionLog = { id: Date.now(), ...logData };
        setProductionLogs([newLog, ...productionLogs]);
        logAction('Created', 'Production', `Added new log for ${weaverName} - ${totalQuantity} total pcs.`);
        setShowChalanModal(newLog);
    }
    handleCloseModal();
  };

  const handleDelete = (logToDelete: ProductionLog) => {
    if (window.confirm(`Are you sure you want to delete this production log?`)) {
        setProductionLogs(productionLogs.filter(log => log.id !== logToDelete.id));
        const weaverName = weavers.find(w => w.id === logToDelete.weaverId)?.name || 'N/A';
        logAction('Deleted', 'Production', `Deleted log ID ${logToDelete.id} for weaver ${weaverName}.`);
    }
  };

  const handleQrScanSuccess = (decodedText: string) => {
    setIsScannerOpen(false);
    try {
        let weaverId: string | null = null;
        
        try { // Try parsing as JSON first
            const data = JSON.parse(decodedText);
            if (data.type === 'weaver' && data.id) {
                weaverId = String(data.id);
            }
        } catch (e) { // Fallback to string parsing
            const parts = decodedText.split(':');
            if (parts.length === 2 && (parts[0] === 'weaver-id' || parts[0] === 'weaver_id')) {
                weaverId = parts[1];
            }
        }
        
        if (weaverId) {
            const weaverExists = weavers.some(w => String(w.id) === weaverId);
            if (weaverExists) {
                handleOpenModal(); // Open an empty modal
                setFormWeaverId(weaverId); // Pre-fill the weaver
            } else {
                alert(`Weaver with ID ${weaverId} not found.`);
            }
        } else {
            alert('Invalid QR code format. Expected format is JSON `{"type":"weaver","id":1}` or string `weaver-id:1`.');
        }
    } catch (error) {
        console.error("Error processing QR code:", error);
        alert("Could not process the QR code.");
    }
  };
  
  const handlePrint = () => window.print();
  const getHtml2Canvas = () => (window as any).html2canvas;

  const handleDownloadPDF = () => {
    if (!showChalanModal) return;
    const element = document.getElementById('print-area');
    if (!element) return;
    const html2canvas = getHtml2Canvas();
    if (!html2canvas) return alert("PDF library failed to load.");
    
    html2canvas(element, { scale: 2 }).then((canvas: any) => {
        const imgData = canvas.toDataURL('image/png');
        const { jsPDF } = (window as any).jspdf;
        const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        pdf.addImage(imgData, 'PNG', 10, 10, pdfWidth - 20, 0);
        pdf.save(`Chalan-${showChalanModal.id}-${showChalanModal.date}.pdf`);
    });
  };

  const handleShare = async () => {
    if (!canShare || !showChalanModal) return;
    const element = document.getElementById('print-area');
    if (!element) return;

    setIsSharing(true);
    try {
        const html2canvas = getHtml2Canvas();
        const canvas = await html2canvas(element, { scale: 2 });
        // FIX: Add generic type to Promise to correctly type `blob`
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
        
        if (!blob) {
            throw new Error('Could not create image blob.');
        }

        const file = new File([blob], `Chalan-${showChalanModal.id}.png`, { type: 'image/png' });

        if (navigator.canShare({ files: [file] })) {
            await navigator.share({
                files: [file],
                title: 'Production Chalan',
                text: `Here is the production chalan for ${weavers.find(w => w.id === showChalanModal.weaverId)?.name} on ${formatDate(showChalanModal.date)}.`,
            });
        } else {
            alert("Sharing files is not supported on this browser/device.");
        }
    } catch (error) {
        console.error("Share failed:", error);
        alert("Could not share the chalan.");
    } finally {
        setIsSharing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <div className="flex flex-col md:flex-row justify-between items-start mb-4 gap-4">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 shrink-0">Production Log</h2>
            {isAllowedToEdit && (
                <div className="md:hidden flex w-full gap-2">
                    <button onClick={() => setIsScannerOpen(true)} className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors whitespace-nowrap h-full flex items-center justify-center gap-2">
                        <QrCodeIcon className="w-5 h-5"/> Scan
                    </button>
                    <button onClick={() => handleOpenModal()} className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors whitespace-nowrap h-full">
                        Add New Log
                    </button>
                </div>
            )}
            <div className="w-full flex flex-col lg:flex-row items-stretch gap-2">
                <div className="flex-grow grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    <DateInput name="dateStart" value={filters.dateStart} onChange={handleFilterDateChange} className="p-2 border dark:border-gray-600 rounded-md text-sm w-full"/>
                    <DateInput name="dateEnd" value={filters.dateEnd} onChange={handleFilterDateChange} className="p-2 border dark:border-gray-600 rounded-md text-sm w-full"/>
                    <DateRangePresetPicker onRangeChange={handleRangeChange} />
                    <SearchableSelect options={weaverOptions} value={filters.weaverId} onChange={(v) => handleFilterChange('weaverId', v as string)} placeholder="All Weavers" />
                    <SearchableSelect options={designOptions} value={filters.designId} onChange={(v) => handleFilterChange('designId', v as string)} placeholder="All Designs" />
                    <select name="status" value={filters.status} onChange={(e) => handleFilterChange(e.target.name, e.target.value)} className="p-2 border rounded-md text-sm w-full bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 dark:border-gray-600 h-10">
                        <option value="All">All Status</option>
                        <option value="Active">Ongoing Works</option>
                        <option value="Completed">Completed Works</option>
                    </select>
                </div>
                {isAllowedToEdit && (
                    <div className="hidden md:flex items-stretch gap-2">
                        <button onClick={() => setIsScannerOpen(true)} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center justify-center gap-2 h-full">
                            <QrCodeIcon className="w-5 h-5"/> Scan
                        </button>
                        <button onClick={() => handleOpenModal()} className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors w-full lg:w-auto whitespace-nowrap h-full">
                            Add New Log
                        </button>
                    </div>
                )}
            </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700">
              <tr>
                <th scope="col" className="px-6 py-3">Date</th>
                <th scope="col" className="px-6 py-3">Weaver</th>
                <th scope="col" className="px-6 py-3">Status</th>
                <th scope="col" className="px-6 py-3 text-right">Total Quantity</th>
                <th scope="col" className="px-6 py-3 text-right">Warp (kg)</th>
                <th scope="col" className="px-6 py-3 text-right">Weft (kg)</th>
                <th scope="col" className="px-6 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map(log => {
                const totalQty = log.items.reduce((sum, i) => sum + i.quantity, 0);
                const status = getLogStatus(log);
                return (
                  <React.Fragment key={log.id}>
                    <tr className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                      <td className="px-6 py-4">{formatDate(log.date)}</td>
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{weavers.find(w => w.id === log.weaverId)?.name}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${status.className}`}>
                            {status.text}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">{totalQty}</td>
                      <td className="px-6 py-4 text-right">{log.yarnIssued.warp || 'N/A'}</td>
                      <td className="px-6 py-4 text-right">{log.yarnIssued.weft || 'N/A'}</td>
                      <td className="px-6 py-4 flex items-center justify-center gap-2">
                        {isAllowedToEdit && <>
                          <button onClick={() => handleOpenModal(log)} className="text-primary-600 hover:text-primary-800 p-1"><EditIcon className="w-5 h-5"/></button>
                          <button onClick={() => handleDelete(log)} className="text-red-600 hover:text-red-800 p-1"><TrashIcon className="w-5 h-5"/></button>
                        </>}
                        <button onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)} className="p-1"><ChevronDownIcon className={`w-5 h-5 text-gray-500 transition-transform ${expandedLogId === log.id ? 'rotate-180' : ''}`} /></button>
                      </td>
                    </tr>
                    {expandedLogId === log.id && (
                        <tr>
                            <td colSpan={7} className="p-4 bg-gray-50 dark:bg-gray-800/50">
                                <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-2">Log Details:</h4>
                                <table className="w-full text-xs bg-white dark:bg-gray-700">
                                    <thead className="bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300">
                                        <tr>
                                            <th className="p-2 text-left font-medium">Design</th>
                                            <th className="p-2 text-left font-medium">Color</th>
                                            <th className="p-2 text-right font-medium">Quantity</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-gray-800 dark:text-gray-200">
                                        {log.items.map((item, idx) => (
                                            <tr key={idx} className="border-b dark:border-gray-600">
                                                <td className="p-2">{designs.find(d => d.id === item.designId)?.name}</td>
                                                <td className="p-2">{item.color}</td>
                                                <td className="p-2 text-right">{item.quantity}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </td>
                        </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl flex flex-col max-h-[90vh]">
                <h3 className="text-lg font-semibold p-6 shrink-0 border-b dark:border-gray-700 dark:text-gray-200">{editingLog ? 'Edit Production Log' : 'Add New Log'}</h3>
                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Date</label>
                            <DateInput name="date" value={formDate} onChange={e => setFormDate(e.target.value)} className="w-full p-2 border dark:border-gray-600 rounded-md" required />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Weaver</label>
                            <SearchableSelect options={weaverOptions} value={formWeaverId} onChange={(v) => setFormWeaverId(v as string)} placeholder="Select Weaver" />
                        </div>
                    </div>
                    {formWeaverId && (
                        <div>
                            <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Production Items</label>
                            {formLogItems.length > 0 ? (
                                <div className="border dark:border-gray-600 rounded-md">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 dark:bg-gray-700/50 text-left"><tr className="border-b dark:border-gray-600"><th className="p-2 font-medium">Design</th><th className="p-2 font-medium">Color</th><th className="p-2 font-medium w-32">Quantity</th></tr></thead>
                                        <tbody>
                                        {formLogItems.map((item, index) => (
                                            <tr key={`${item.designId}-${item.color}`} className="border-b dark:border-gray-600">
                                                <td className="p-2 text-gray-800 dark:text-gray-200">{item.designName}</td>
                                                <td className="p-2 text-gray-600 dark:text-gray-400">{item.color}</td>
                                                <td className="p-2"><input type="number" value={item.quantity} onChange={(e) => handleLogItemChange(index, e.target.value)} placeholder="pcs" className="w-full p-1 border rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 dark:border-gray-600" min="0"/></td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : <p className="text-sm text-gray-500 dark:text-gray-400 italic p-4 border dark:border-gray-600 rounded-md">No active designs allocated to this weaver.</p>}
                        </div>
                    )}
                     <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Yarn Issued (Optional, in kg)</label>
                        <div className="flex space-x-2">
                            <input type="number" value={formYarn.warp} onChange={e => setFormYarn(p=>({...p, warp:e.target.value}))} placeholder="Warp" className="p-2 border rounded-md w-1/2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 dark:border-gray-600" step="0.01"/>
                            <input type="number" value={formYarn.weft} onChange={e => setFormYarn(p=>({...p, weft:e.target.value}))} placeholder="Weft" className="p-2 border rounded-md w-1/2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 dark:border-gray-600" step="0.01"/>
                        </div>
                    </div>
                </form>
                <div className="flex justify-end space-x-2 p-6 border-t dark:border-gray-700 shrink-0">
                    <button type="button" onClick={handleCloseModal} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">Cancel</button>
                    <button type="submit" form="log-form" onClick={handleSubmit} className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600">Save</button>
                </div>
            </div>
        </div>
      )}

      {showChalanModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4 print:p-0 print:bg-white">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl">
                <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center print:hidden">
                    <h3 className="text-lg font-semibold dark:text-gray-200">Production Chalan</h3>
                    <button onClick={() => setShowChalanModal(null)} className="text-gray-500 dark:text-gray-400 text-3xl">&times;</button>
                </div>
                <div id="print-area" className="p-8 bg-white text-black">
                     <header className="flex justify-between items-start border-b-2 border-gray-800 pb-4 mb-6">
                        <div className="text-2xl font-bold text-primary-600">RC Tex</div>
                        <div className="text-right">
                            <h2 className="text-3xl font-bold uppercase text-gray-700">Chalan</h2>
                            <p className="text-sm text-gray-500">Log ID: #{showChalanModal.id}</p>
                        </div>
                     </header>
                     <div className="grid grid-cols-2 gap-4 mb-8">
                        <div>
                            <p className="text-sm font-semibold text-gray-600">Weaver:</p>
                            <p className="font-bold text-gray-800">{weavers.find(w => w.id === showChalanModal.weaverId)?.name}</p>
                        </div>
                        <div className="text-right">
                           <p className="text-sm font-semibold text-gray-600">Date:</p>
                           <p className="font-bold text-gray-800">{formatDate(showChalanModal.date)}</p>
                        </div>
                     </div>
                     <table className="w-full text-sm mb-8">
                         <thead className="bg-gray-100">
                             <tr>
                                 <th className="p-2 text-left font-semibold text-gray-600">#</th>
                                 <th className="p-2 text-left font-semibold text-gray-600">Design</th>
                                 <th className="p-2 text-left font-semibold text-gray-600">Color</th>
                                 <th className="p-2 text-right font-semibold text-gray-600">Quantity</th>
                             </tr>
                         </thead>
                         <tbody className="divide-y">
                             {showChalanModal.items.map((item, idx) => (
                                 <tr key={idx}>
                                     <td className="p-2 text-gray-500">{idx + 1}</td>
                                     <td className="p-2 text-gray-800">{designs.find(d => d.id === item.designId)?.name}</td>
                                     <td className="p-2 text-gray-800">{item.color}</td>
                                     <td className="p-2 text-right font-medium text-gray-800">{item.quantity} pcs</td>
                                 </tr>
                             ))}
                         </tbody>
                         <tfoot>
                             <tr className="bg-gray-100 font-bold">
                                 <td colSpan={3} className="p-2 text-right text-gray-700">Total Quantity</td>
                                 <td className="p-2 text-right text-gray-700">{showChalanModal.items.reduce((sum, i) => sum + i.quantity, 0)} pcs</td>
                             </tr>
                         </tfoot>
                     </table>
                     <footer className="text-center text-xs text-gray-500 mt-12 pt-4 border-t">
                        <p>Generated on: {formatDateTime(new Date())}</p>
                        <p>RC Tex Production Management System</p>
                     </footer>
                </div>
                 <div className="p-4 bg-gray-50 dark:bg-gray-700 flex justify-end space-x-3 print:hidden">
                    {canShare && <button onClick={handleShare} disabled={isSharing} className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300"><ShareIcon className="w-5 h-5"/> {isSharing ? 'Sharing...' : 'Share'}</button>}
                    <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover"><PrinterIcon className="w-5 h-5" /> Print</button>
                    <button onClick={handleDownloadPDF} className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"><DownloadIcon className="w-5 h-5" /> Download PDF</button>
                 </div>
            </div>
        </div>
      )}

      {isScannerOpen && (
        <QRScanner 
            onScanSuccess={handleQrScanSuccess}
            onClose={() => setIsScannerOpen(false)}
        />
      )}

    </div>
  );
};

export default ProductionTracking;