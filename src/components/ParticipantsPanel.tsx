import { useState, useRef } from 'react';
import { useSchedule } from '../context/ScheduleContext';
import type { Supplier, Buyer } from '../types';
import { generateId } from '../utils/timeUtils';
import Papa from 'papaparse';

export default function ParticipantsPanel() {
  const {
    suppliers,
    buyers,
    eventConfig,
    addSupplier,
    removeSupplier,
    addBuyer,
    removeBuyer,
    importSuppliers,
    importBuyers,
  } = useSchedule();

  const [activeList, setActiveList] = useState<'suppliers' | 'buyers'>('suppliers');
  const [showForm, setShowForm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formOrg, setFormOrg] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formDuration, setFormDuration] = useState(eventConfig?.defaultMeetingDuration || 15);

  const resetForm = () => {
    setFormName('');
    setFormOrg('');
    setFormEmail('');
    setFormDuration(eventConfig?.defaultMeetingDuration || 15);
    setShowForm(false);
  };

  const handleAddParticipant = () => {
    if (!formName) return;

    if (activeList === 'suppliers') {
      const supplier: Supplier = {
        id: generateId(),
        name: formName,
        organization: formOrg,
        email: formEmail || undefined,
        meetingDuration: formDuration,
        preference: 'all',
        preferenceList: [],
      };
      addSupplier(supplier);
    } else {
      const buyer: Buyer = {
        id: generateId(),
        name: formName,
        organization: formOrg,
        email: formEmail || undefined,
      };
      addBuyer(buyer);
    }
    resetForm();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: result => {
        const data = result.data as Record<string, string>[];

        if (activeList === 'suppliers') {
          const parsed: Supplier[] = data.map(row => ({
            id: generateId(),
            name: row.name || row.Name || '',
            organization: row.organization || row.Organization || row.company || row.Company || '',
            email: row.email || row.Email || undefined,
            meetingDuration: Number(row.duration || row.Duration) || eventConfig?.defaultMeetingDuration || 15,
            preference: 'all' as const,
            preferenceList: [],
          })).filter(s => s.name);
          importSuppliers(parsed);
        } else {
          const parsed: Buyer[] = data.map(row => ({
            id: generateId(),
            name: row.name || row.Name || '',
            organization: row.organization || row.Organization || row.company || row.Company || '',
            email: row.email || row.Email || undefined,
          })).filter(b => b.name);
          importBuyers(parsed);
        }

        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      },
    });
  };

  const currentList = activeList === 'suppliers' ? suppliers : buyers;

  return (
    <div className="space-y-6">
      {!eventConfig && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <p className="text-yellow-800 text-sm">
            Please configure the event first in the "Event Setup" tab.
          </p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="border-b">
          <div className="flex">
            <button
              onClick={() => setActiveList('suppliers')}
              className={`flex-1 px-4 py-3 text-sm font-medium ${
                activeList === 'suppliers'
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Suppliers ({suppliers.length})
            </button>
            <button
              onClick={() => setActiveList('buyers')}
              className={`flex-1 px-4 py-3 text-sm font-medium ${
                activeList === 'buyers'
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Buyers ({buyers.length})
            </button>
          </div>
        </div>

        <div className="p-4">
          <div className="flex gap-3 mb-4">
            <button
              onClick={() => setShowForm(true)}
              className="px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
            >
              + Add {activeList === 'suppliers' ? 'Supplier' : 'Buyer'}
            </button>
            <label className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm cursor-pointer">
              Import CSV
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {showForm && (
            <div className="mb-4 p-4 bg-gray-50 rounded-md">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="Name *"
                  className="border rounded px-3 py-2"
                />
                <input
                  type="text"
                  value={formOrg}
                  onChange={e => setFormOrg(e.target.value)}
                  placeholder="Organization"
                  className="border rounded px-3 py-2"
                />
                <input
                  type="email"
                  value={formEmail}
                  onChange={e => setFormEmail(e.target.value)}
                  placeholder="Email"
                  className="border rounded px-3 py-2"
                />
                {activeList === 'suppliers' && (
                  <input
                    type="number"
                    value={formDuration}
                    onChange={e => setFormDuration(Number(e.target.value))}
                    placeholder="Duration (min)"
                    className="border rounded px-3 py-2"
                  />
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddParticipant}
                  disabled={!formName}
                  className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-300 text-sm"
                >
                  Add
                </button>
                <button
                  onClick={resetForm}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {currentList.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No {activeList} added yet. Click "Add" or "Import CSV" above.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium">Name</th>
                    <th className="pb-2 font-medium">Organization</th>
                    <th className="pb-2 font-medium">Email</th>
                    {activeList === 'suppliers' && <th className="pb-2 font-medium">Duration</th>}
                    <th className="pb-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {currentList.map(item => (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      <td className="py-2">{item.name}</td>
                      <td className="py-2">{item.organization}</td>
                      <td className="py-2">{item.email || '-'}</td>
                      {activeList === 'suppliers' && (
                        <td className="py-2">{(item as Supplier).meetingDuration} min</td>
                      )}
                      <td className="py-2">
                        <button
                          onClick={() =>
                            activeList === 'suppliers'
                              ? removeSupplier(item.id)
                              : removeBuyer(item.id)
                          }
                          className="text-red-500 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <h3 className="font-medium text-blue-900 mb-2">CSV Format</h3>
        <p className="text-blue-800 text-sm">
          Your CSV should have headers: <code className="bg-blue-100 px-1">name, organization, email</code>
          {activeList === 'suppliers' && (
            <span>
              , <code className="bg-blue-100 px-1">duration</code> (optional)
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
