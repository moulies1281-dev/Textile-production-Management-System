import React, { useState, useRef } from 'react';
import { ShieldIcon, DownloadIcon, UploadCloudIcon } from './ui/Icons';
import { Weaver, ProductionLog, Loan, Design, Repayment, RentalPayment } from '../types';

interface AdminSettingsProps {
    weavers: Weaver[];
    productionLogs: ProductionLog[];
    loans: Loan[];
    designs: Design[];
    repayments: Repayment[];
    rentalPayments: RentalPayment[];
}

const AdminSettings: React.FC<AdminSettingsProps> = ({ weavers, productionLogs, loans, designs, repayments, rentalPayments }) => {
  const [isBackupLoading, setIsBackupLoading] = useState(false);
  const [isRestoreModalOpen, setRestoreModalOpen] = useState<Backup | null>(null);
  const [restoreConfirmText, setRestoreConfirmText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const lastBackupStatus = {
    date: new Date(new Date().setDate(new Date().getDate() - 1)),
    status: 'Success',
  };

  type Backup = { version: number; date: Date; size: string; by: string; };
  const backupHistory: Backup[] = Array.from({ length: 5 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (i + 1) * 2);
    return {
        version: 30 - i,
        date: d,
        size: `${(Math.random() * (25 - 5) + 5).toFixed(2)} MB`,
        by: i % 2 === 0 ? 'Automated' : 'Admin',
    };
  });
  
  const handleDownloadJson = (data: any, filename: string) => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(data, null, 2)
    )}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = filename;
    link.click();
    link.remove();
  };

  const handleBackupNow = () => {
    setIsBackupLoading(true);
    // In a real app, this would be an API call. Here we just simulate it.
    // As an example, we'll just download the weavers data.
    handleDownloadJson({weavers, productionLogs, loans, designs, repayments, rentalPayments}, `rc-tex-full-backup-${new Date().toISOString().split('T')[0]}.json`);
    setTimeout(() => {
        setIsBackupLoading(false);
        alert('Manual backup completed successfully!');
    }, 1500);
  };

  const handleRestore = () => {
    if (restoreConfirmText !== 'RESTORE' || !isRestoreModalOpen) {
        alert('Please type RESTORE to confirm.');
        return;
    }
    alert(`Restoring from backup version ${isRestoreModalOpen.version}...`);
    setRestoreModalOpen(null);
    setRestoreConfirmText('');
  };
  
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (window.confirm(`Are you sure you want to upload and restore from "${file.name}"? This action cannot be undone.`)) {
          alert(`Uploading ${file.name} for disaster recovery...`);
      }
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <ShieldIcon className="w-6 h-6 text-primary-600" />
            <span>Disaster Recovery & Backup</span>
        </h2>
      </div>

      {/* Backup Process */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4 border-b dark:border-gray-700 pb-2">Backup Management</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center mb-6">
            <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Last Backup Status</p>
                <div className="flex items-center gap-2 mt-1">
                    <span className={`h-3 w-3 rounded-full ${lastBackupStatus.status === 'Success' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    <span className="text-gray-800 dark:text-gray-300">{lastBackupStatus.date.toLocaleString()} ({lastBackupStatus.status})</span>
                </div>
            </div>
            <button
                onClick={handleBackupNow}
                disabled={isBackupLoading}
                className="w-full px-4 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:bg-primary-300 flex items-center justify-center"
            >
                {isBackupLoading ? 'Backing up...' : 'Backup All Data Now'}
            </button>
        </div>
        <h4 className="text-md font-semibold text-gray-600 dark:text-gray-400 mb-3">Section-wise Backup</h4>
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <button onClick={() => handleDownloadJson(productionLogs, 'production.json')} className="p-4 bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium">Download Production JSON</button>
            <button onClick={() => handleDownloadJson(weavers, 'weavers.json')} className="p-4 bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium">Download Weavers JSON</button>
            <button onClick={() => handleDownloadJson({loans, repayments, rentalPayments}, 'financials.json')} className="p-4 bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium">Download Financials JSON</button>
        </div>
      </div>

      {/* Restore Process */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4 border-b dark:border-gray-700 pb-2">Restore from Backup</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Select a backup version to restore the system state. Current data created after the backup time will be archived.</p>
        <div className="overflow-x-auto border dark:border-gray-700 rounded-lg">
            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                <thead className="text-xs text-gray-700 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700"><tr><th className="px-6 py-3">Version</th><th className="px-6 py-3">Date</th><th className="px-6 py-3">Size</th><th className="px-6 py-3">Triggered By</th><th className="px-6 py-3 text-right">Action</th></tr></thead>
                <tbody>
                    {backupHistory.map(backup => (
                        <tr key={backup.version} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                            <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">v{backup.version}</td>
                            <td className="px-6 py-4">{backup.date.toLocaleString()}</td>
                            <td className="px-6 py-4">{backup.size}</td>
                            <td className="px-6 py-4">{backup.by}</td>
                            <td className="px-6 py-4 text-right"><button onClick={() => setRestoreModalOpen(backup)} className="font-medium text-red-600 hover:underline">Restore</button></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>

      {/* Disaster Recovery */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border-2 border-dashed border-red-300 dark:border-red-700">
        <h3 className="text-lg font-semibold text-red-700 mb-4 border-b border-red-200 dark:border-red-800 pb-2">Disaster Mode Recovery</h3>
        <p className="text-sm text-red-600 dark:text-red-400 mb-4">If the system is completely down and inaccessible, you can manually upload a backup file here to restore the application state. Use this as a last resort.</p>
        <div className="mt-4">
            <input type="file" accept=".json" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
            <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex justify-center items-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
                <UploadCloudIcon className="w-6 h-6" />
                <span>Upload Manual Backup File (.json)</span>
            </button>
        </div>
      </div>
      
      {isRestoreModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg m-4 text-center">
                <h3 className="text-xl font-bold text-red-700 mb-2">Confirm Restore</h3>
                <p className="text-gray-700 dark:text-gray-300 mb-4">You are about to restore the system to the state from:</p>
                <p className="font-semibold text-primary-600 bg-primary-50 dark:bg-primary-900/50 dark:text-primary-300 p-2 rounded-md mb-4">{isRestoreModalOpen.date.toLocaleString()} (v{isRestoreModalOpen.version})</p>
                <p className="text-sm text-red-600 dark:text-red-400 mb-4">This action is irreversible and will overwrite current data. To proceed, please type <strong className="font-mono">RESTORE</strong> in the box below.</p>
                <input
                    type="text"
                    value={restoreConfirmText}
                    onChange={(e) => setRestoreConfirmText(e.target.value)}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md text-center font-mono bg-white dark:bg-gray-700"
                    placeholder="RESTORE"
                />
                <div className="flex justify-center space-x-4 mt-6">
                    <button onClick={() => setRestoreModalOpen(null)} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">Cancel</button>
                    <button
                        onClick={handleRestore}
                        disabled={restoreConfirmText !== 'RESTORE'}
                        className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed"
                    >
                        Confirm & Restore
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default AdminSettings;