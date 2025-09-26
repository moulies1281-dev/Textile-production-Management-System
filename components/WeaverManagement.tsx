import React, { useState, useMemo } from 'react';
import { Weaver, UserRole, Design, WeaverDesignAllocation } from '../types';
import { SearchIcon, EditIcon, TrashIcon, CloseIcon } from './ui/Icons';
import SearchableSelect from './ui/SearchableSelect';

interface WeaverManagementProps {
  weavers: Weaver[];
  setWeavers: React.Dispatch<React.SetStateAction<Weaver[]>>;
  designs: Design[];
  userRole: UserRole;
  logAction: (action: 'Created' | 'Updated' | 'Deleted', module: string, details: string) => void;
}

const WeaverManagement: React.FC<WeaverManagementProps> = ({ weavers, setWeavers, designs, userRole, logAction }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWeaver, setEditingWeaver] = useState<Weaver | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [copyData, setCopyData] = useState<{fromWeaverId: string, toWeaverId: string}>({fromWeaverId: '', toWeaverId: ''});

  const [formData, setFormData] = useState<Omit<Weaver, 'id'>>({
    name: '', contact: '', joinDate: new Date().toISOString().split('T')[0], loomNumber: 0,
    loomType: 'Own', wageType: 'Per_Piece', rate: 0, rentalCost: 0, rentalPeriod: 'Weekly',
    designAllocations: []
  });

  const filteredWeavers = useMemo(() => 
    weavers.filter(w => w.name.toLowerCase().includes(searchTerm.toLowerCase())),
    [weavers, searchTerm]
  );

  const handleOpenModal = (weaver: Weaver | null = null) => {
    setEditingWeaver(weaver);
    if (weaver) {
      setFormData({
        ...weaver,
        rentalCost: weaver.rentalCost || 0,
        rentalPeriod: weaver.rentalPeriod || 'Weekly',
        designAllocations: weaver.designAllocations ? [...weaver.designAllocations.map(a => ({...a, colors: [...a.colors]}))] : [],
      });
    } else {
      setFormData({
        name: '', contact: '', joinDate: new Date().toISOString().split('T')[0],
        loomNumber: 0, loomType: 'Own', wageType: 'Per_Piece', rate: 0,
        rentalCost: 0, rentalPeriod: 'Weekly', designAllocations: []
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingWeaver(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const isNumeric = ['loomNumber', 'rate', 'rentalCost'].includes(name);
    setFormData(prev => ({ ...prev, [name]: isNumeric ? parseFloat(value) : value }));
  };
  
  // Design Allocation Handlers
  const handleAddDesignAllocation = () => {
    const newAllocation: WeaverDesignAllocation = { allocationId: Date.now(), designId: 0, colors: [], status: 'Active' };
    setFormData(prev => ({ ...prev, designAllocations: [...prev.designAllocations, newAllocation] }));
  };
  const handleAllocationChange = (index: number, field: keyof WeaverDesignAllocation, value: any) => {
    const newAllocations = [...formData.designAllocations];
    (newAllocations[index] as any)[field] = value;
    setFormData(prev => ({ ...prev, designAllocations: newAllocations }));
  };
  const handleColorChange = (allocIndex: number, newColors: string[]) => {
      const newAllocations = [...formData.designAllocations];
      newAllocations[allocIndex].colors = newColors;
      setFormData(prev => ({...prev, designAllocations: newAllocations}));
  };
  const handleRemoveAllocation = (index: number) => {
    setFormData(prev => ({ ...prev, designAllocations: prev.designAllocations.filter((_, i) => i !== index) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  const finalFormData = { ...formData };
  if (finalFormData.loomType === 'Own') {
    finalFormData.rentalCost = undefined;
    finalFormData.rentalPeriod = undefined;
  }

  if (editingWeaver) {
    alert('Updating weavers is not yet implemented.');
    handleCloseModal();
    return;
  }
  
  try {
    // We now send the POST request to the SAME URL we use for reading data.
    const response = await fetch('/.netlify/functions/supabase/weavers', { // <-- THIS URL IS THE ONLY CHANGE
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(finalFormData),
    });

    if (!response.ok) {
      throw new Error('Failed to save the weaver');
    }

    const newWeaverFromDB = await response.json();
    
    // The app will simply re-fetch the whole list to show the new weaver,
    // so we can just close the modal. For a faster UI, we can add it manually.
    // Let's add the newly created weaver to our state to see it instantly.
    // We need to translate the response from snake_case to camelCase
    const newWeaverForState = {
        id: newWeaverFromDB.id,
        createdAt: newWeaverFromDB.created_at,
        name: newWeaverFromDB.name,
        contact: newWeaverFromDB.contact,
        joinDate: newWeaverFromDB.join_date,
        loomNumber: newWeaverFromDB.loom_number,
        loomType: newWeaverFromDB.loom_type,
        wageType: newWeaverFromDB.wage_type,
        rate: newWeaverFromDB.rate,
        rentalCost: newWeaverFromDB.rental_cost,
        rentalPeriod: newWeaverFromDB.rental_period,
        designAllocations: newWeaverFromDB.design_allocations
    };

    setWeavers(currentWeavers => [...currentWeavers, newWeaverForState]);
    logAction('Created', 'Weavers', `Created weaver: ${newWeaverFromDB.name}`);

  } catch (error) {
    console.error('Error submitting weaver:', error);
    alert('Could not save the weaver. Please try again.');
  }

  handleCloseModal();
};
  
  const handleDelete = (weaverToDelete: Weaver) => {
    if (window.confirm(`Are you sure you want to delete ${weaverToDelete.name}?`)) {
        setWeavers(weavers.filter(w => w.id !== weaverToDelete.id));
        logAction('Deleted', 'Weavers', `Deleted weaver: ${weaverToDelete.name} (ID: ${weaverToDelete.id})`);
    }
  };

  const handleCopyAllocations = () => {
      if (!copyData.fromWeaverId || !copyData.toWeaverId) {
          alert("Please select both a source and a destination weaver.");
          return;
      }
      const fromWeaver = weavers.find(w => w.id === parseInt(copyData.fromWeaverId));
      if (!fromWeaver) {
          alert("Source weaver not found.");
          return;
      }
      setWeavers(prev => prev.map(w => {
          if (w.id === parseInt(copyData.toWeaverId)) {
              return { ...w, designAllocations: fromWeaver.designAllocations };
          }
          return w;
      }));
      const toWeaver = weavers.find(w => w.id === parseInt(copyData.toWeaverId));
      logAction('Updated', 'Weavers', `Copied design allocation from ${fromWeaver.name} to ${toWeaver?.name}.`);
      setIsCopyModalOpen(false);
      setCopyData({ fromWeaverId: '', toWeaverId: '' });
  };
  
  const isAdmin = userRole === UserRole.Admin;

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Weaver Management</h2>
        <div className="w-full md:w-auto flex items-center gap-2">
            <div className="relative w-full md:w-64">
                <input type="text" placeholder="Search by name..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full p-2 pl-10 border rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 dark:border-gray-600"/>
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
            {isAdmin && ( <>
                <button onClick={() => setIsCopyModalOpen(true)} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors whitespace-nowrap">Copy Allocation</button>
                <button onClick={() => handleOpenModal()} className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors whitespace-nowrap">Add Weaver</button>
            </>)}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700">
            <tr>
              <th scope="col" className="px-6 py-3">Name</th>
              <th scope="col" className="px-6 py-3">Contact</th>
              <th scope="col" className="px-6 py-3">Loom No.</th>
              <th scope="col" className="px-6 py-3">Loom Type</th>
              <th scope="col" className="px-6 py-3">Wage/Rate</th>
              <th scope="col" className="px-6 py-3">Active Designs</th>
              <th scope="col" className="px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredWeavers.map(weaver => (
              <tr key={weaver.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{weaver.name}</td>
                <td className="px-6 py-4">{weaver.contact}</td>
                <td className="px-6 py-4">{weaver.loomNumber}</td>
                <td className="px-6 py-4"><span className={`px-2 py-1 text-xs font-medium rounded-full ${weaver.loomType === 'Rental' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' : 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'}`}>{weaver.loomType} {weaver.loomType === 'Rental' && `(₹${weaver.rentalCost}/${weaver.rentalPeriod?.slice(0,2)})`}</span></td>
                <td className="px-6 py-4">{weaver.wageType === 'Per_Piece' ? `₹${weaver.rate}/pc` : `₹${weaver.rate}/day`}</td>
                <td className="px-6 py-4">{weaver.designAllocations?.filter(da => da.status === 'Active').length || 0}</td>
                <td className="px-6 py-4">
                  {isAdmin ? (
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleOpenModal(weaver)} className="text-primary-600 hover:text-primary-800 p-1"><EditIcon className="w-5 h-5" /></button>
                      <button onClick={() => handleDelete(weaver)} className="text-red-600 hover:text-red-800 p-1"><TrashIcon className="w-5 h-5" /></button>
                    </div>
                  ) : <span className="text-xs text-gray-400">No actions</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-4xl max-h-[90vh] flex flex-col">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200 shrink-0">{editingWeaver ? 'Edit Weaver' : 'Add New Weaver'}</h3>
            <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto pr-2 space-y-6">
                
                <div>
                  <h4 className="text-md font-semibold text-gray-700 dark:text-gray-300 mb-3">Weaver Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Name" className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 dark:border-gray-600" required/>
                      <input type="text" name="contact" value={formData.contact} onChange={handleChange} placeholder="Contact" className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 dark:border-gray-600" required/>
                      <input type="number" name="loomNumber" value={formData.loomNumber} onChange={handleChange} placeholder="Loom Number" className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 dark:border-gray-600" required/>
                      <select name="loomType" value={formData.loomType} onChange={handleChange} className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 dark:border-gray-600">
                        <option value="Own">Own</option>
                        <option value="Rental">Rental</option>
                      </select>
                      <select name="wageType" value={formData.wageType} onChange={handleChange} className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 dark:border-gray-600">
                        <option value="Per_Piece">Per Piece</option>
                        <option value="Fixed">Fixed</option>
                      </select>
                      <input type="number" name="rate" value={formData.rate} onChange={handleChange} placeholder="Rate" className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 dark:border-gray-600" required step="0.01"/>
                      {formData.loomType === 'Rental' && (
                        <div className="md:col-span-2 grid grid-cols-2 gap-4">
                            <input type="number" name="rentalCost" value={formData.rentalCost || ''} onChange={handleChange} placeholder="Rental Cost" className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 dark:border-gray-600" required/>
                            <select name="rentalPeriod" value={formData.rentalPeriod || 'Weekly'} onChange={handleChange} className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 dark:border-gray-600">
                                <option value="Weekly">Weekly</option>
                                <option value="Monthly">Monthly</option>
                            </select>
                        </div>
                      )}
                  </div>
                </div>

                <div>
                    <h4 className="text-md font-semibold text-gray-700 dark:text-gray-300 mb-3">Design Allocations</h4>
                    <div className="space-y-3">
                    {formData.designAllocations.map((alloc, index) => (
                        <div key={alloc.allocationId} className="grid grid-cols-12 gap-2 items-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
                        <div className="col-span-12 md:col-span-4"><SearchableSelect options={designs.map(d=>({value:d.id, label: d.name}))} value={alloc.designId} onChange={(val) => handleAllocationChange(index, 'designId', val)} placeholder="Select Design" /></div>
                        <div className="col-span-12 md:col-span-5"><ColorInput colors={alloc.colors} setColors={(newColors) => handleColorChange(index, newColors)} /></div>
                        <div className="col-span-8 md:col-span-2"><select value={alloc.status} onChange={(e) => handleAllocationChange(index, 'status', e.target.value)} className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 dark:border-gray-600 text-sm"><option value="Active">Active</option><option value="Completed">Completed</option></select></div>
                        <div className="col-span-4 md:col-span-1 text-right"><button type="button" onClick={() => handleRemoveAllocation(index)} className="text-red-500 hover:text-red-700 p-2"><TrashIcon className="w-5 h-5"/></button></div>
                        </div>
                    ))}
                    <button type="button" onClick={handleAddDesignAllocation} className="w-full px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 transition-colors">Add Design</button>
                    </div>
                </div>
            </form>
            <div className="flex justify-end space-x-2 pt-4 shrink-0">
              <button type="button" onClick={handleCloseModal} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">Cancel</button>
              <button type="submit" form="weaver-form" onClick={handleSubmit} className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600">Save</button>
            </div>
          </div>
        </div>
      )}

      {isCopyModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md m-4 space-y-4">
                <h3 className="text-lg font-semibold dark:text-gray-200">Copy Design Allocation</h3>
                <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Copy From</label>
                    <SearchableSelect options={weavers.map(w => ({value: w.id, label: w.name}))} value={copyData.fromWeaverId} onChange={(v) => setCopyData(p => ({...p, fromWeaverId: v as string}))} placeholder="Select source weaver" />
                </div>
                <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Copy To</label>
                    <SearchableSelect options={weavers.map(w => ({value: w.id, label: w.name}))} value={copyData.toWeaverId} onChange={(v) => setCopyData(p => ({...p, toWeaverId: v as string}))} placeholder="Select destination weaver" />
                </div>
                 <div className="flex justify-end space-x-2">
                    <button type="button" onClick={() => setIsCopyModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">Cancel</button>
                    <button type="button" onClick={handleCopyAllocations} className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600">Copy</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

const ColorInput: React.FC<{colors: string[], setColors: (colors: string[])=>void}> = ({ colors, setColors }) => {
    const [inputValue, setInputValue] = useState('');
    const addColor = () => {
        if (inputValue && !colors.includes(inputValue)) {
            setColors([...colors, inputValue]);
            setInputValue('');
        }
    };
    const removeColor = (colorToRemove: string) => {
        setColors(colors.filter(c => c !== colorToRemove));
    };
    return (
        <div>
            <div className="flex">
                <input type="text" value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addColor())} placeholder="Add color..." className="p-2 border rounded-l-md w-full text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 dark:border-gray-600"/>
                <button type="button" onClick={addColor} className="px-3 bg-gray-200 dark:bg-gray-600 border border-l-0 dark:border-gray-600 rounded-r-md text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500 text-sm">Add</button>
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
                {colors.map(color => (
                    <span key={color} className="flex items-center bg-primary-100 text-primary-800 dark:bg-primary-900/50 dark:text-primary-300 text-xs font-medium px-2 py-0.5 rounded-full">
                        {color}
                        <button type="button" onClick={() => removeColor(color)} className="ml-1 text-primary-600 hover:text-primary-800 dark:text-primary-300 dark:hover:text-primary-100"><CloseIcon className="w-3 h-3"/></button>
                    </span>
                ))}
            </div>
        </div>
    );
};

export default WeaverManagement;
