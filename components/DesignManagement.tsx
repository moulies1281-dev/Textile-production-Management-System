import React, { useState, useMemo } from 'react';
import { Design, UserRole } from '../types';
import { SearchIcon, EditIcon, TrashIcon } from './ui/Icons';

interface DesignManagementProps {
  designs: Design[];
  setDesigns: React.Dispatch<React.SetStateAction<Design[]>>;
  userRole: UserRole;
  logAction: (action: 'Created' | 'Updated' | 'Deleted', module: string, details: string) => void;
}

const DesignManagement: React.FC<DesignManagementProps> = ({ designs, setDesigns, userRole, logAction }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDesign, setEditingDesign] = useState<Design | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState<Omit<Design, 'id'>>({
    name: '',
    towelSize: 'M',
    defaultRate: 0,
    image: '',
  });

  const filteredDesigns = useMemo(() =>
    designs.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase())),
    [designs, searchTerm]
  );

  const handleOpenModal = (design: Design | null = null) => {
    setEditingDesign(design);
    if (design) {
      setFormData({
        name: design.name,
        towelSize: design.towelSize,
        defaultRate: design.defaultRate,
        image: design.image || '',
      });
    } else {
      setFormData({ name: '', towelSize: 'M', defaultRate: 0, image: '' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingDesign(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'defaultRate' ? parseFloat(value) : value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingDesign) {
      // Online-only for editing for simplicity
      const oldDesign = designs.find(d => d.id === editingDesign.id);
      const updatedDesign = { ...editingDesign, ...formData };
      setDesigns(designs.map(d => d.id === editingDesign.id ? updatedDesign : d));

      const changes = Object.entries(formData)
        .filter(([key, value]) => oldDesign && String(value) !== String(oldDesign[key as keyof Design]))
        .map(([key, value]) => `${key}: '${oldDesign![key as keyof Design]}' to '${value}'`)
        .join(', ');
      logAction('Updated', 'Designs', `Updated design ${formData.name}. Changes: ${changes || 'No changes detected'}.`);
    } else {
      // Handle offline creation
      const newDesign = { id: Date.now(), ...formData };
      if (navigator.onLine) {
          setDesigns([...designs, newDesign]);
          logAction('Created', 'Designs', `Created design: ${newDesign.name}`);
      } else {
          const queue = JSON.parse(localStorage.getItem('design-queue') || '[]');
          queue.push(newDesign);
          localStorage.setItem('design-queue', JSON.stringify(queue));
          alert("You are offline. Your new design has been saved locally and will be synced when you reconnect.");
      }
    }
    handleCloseModal();
  };
  
  const handleDelete = (designToDelete: Design) => {
    if (window.confirm(`Are you sure you want to delete the design "${designToDelete.name}"?`)) {
        setDesigns(designs.filter(d => d.id !== designToDelete.id));
        logAction('Deleted', 'Designs', `Deleted design: ${designToDelete.name} (ID: ${designToDelete.id})`);
    }
  };

  const isAdmin = userRole === UserRole.Admin;

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Design Management</h2>
        <div className="w-full md:w-auto flex items-center gap-4">
          <div className="relative w-full md:w-64">
            <input
              type="text"
              placeholder="Search by name..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full p-2 pl-10 border rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 dark:border-gray-600"
            />
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          </div>
          {isAdmin && (
            <button onClick={() => handleOpenModal()} className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors whitespace-nowrap">
              Add Design
            </button>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredDesigns.map(design => (
              <div key={design.id} className="bg-white dark:bg-gray-700 border dark:border-gray-600 rounded-lg shadow-md overflow-hidden flex flex-col">
                  <img src={design.image || 'https://placehold.co/400x400/e2e8f0/475569?text=No+Image'} alt={design.name} className="w-full h-48 object-cover"/>
                  <div className="p-4 flex-grow flex flex-col">
                      <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-lg">{design.name}</h3>
                      <div className="flex justify-between items-center mt-2 text-sm text-gray-600 dark:text-gray-400">
                          <span>Size: <span className="font-medium text-gray-800 dark:text-gray-200">{design.towelSize}</span></span>
                          <span>Rate: <span className="font-medium text-gray-800 dark:text-gray-200">₹{design.defaultRate.toFixed(2)}</span></span>
                      </div>
                  </div>
                  {isAdmin && (
                    <div className="p-2 bg-gray-50 dark:bg-gray-800/50 border-t dark:border-gray-600 flex justify-end gap-2">
                        <button onClick={() => handleOpenModal(design)} className="text-primary-600 hover:text-primary-800 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600"><EditIcon className="w-5 h-5" /></button>
                        <button onClick={() => handleDelete(design)} className="text-red-600 hover:text-red-800 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600"><TrashIcon className="w-5 h-5" /></button>
                    </div>
                  )}
              </div>
          ))}
      </div>


      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md m-4">
            <h3 className="text-lg font-semibold mb-4 dark:text-gray-200">{editingDesign ? 'Edit Design' : 'Add New Design'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Design Name" className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 dark:border-gray-600" required />
              <input type="text" name="image" value={formData.image} onChange={handleChange} placeholder="Image URL" className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 dark:border-gray-600" />
              <select name="towelSize" value={formData.towelSize} onChange={handleChange} className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 dark:border-gray-600">
                <option value="S">Small (S)</option>
                <option value="M">Medium (M)</option>
                <option value="L">Large (L)</option>
                <option value="XL">Extra Large (XL)</option>
              </select>
              <input type="number" name="defaultRate" value={formData.defaultRate} onChange={handleChange} placeholder="Default Rate" className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 dark:border-gray-600" required step="0.01" />
              <div className="flex justify-end space-x-2">
                <button type="button" onClick={handleCloseModal} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DesignManagement;