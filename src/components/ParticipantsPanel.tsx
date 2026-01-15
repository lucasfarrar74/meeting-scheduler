import { useState, useRef } from 'react';
import { useSchedule } from '../context/ScheduleContext';
import type { Supplier, Buyer, ContactPerson } from '../types';
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
  const [showSecondary, setShowSecondary] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Supplier form state
  const [companyName, setCompanyName] = useState('');
  const [primaryName, setPrimaryName] = useState('');
  const [primaryEmail, setPrimaryEmail] = useState('');
  const [primaryTitle, setPrimaryTitle] = useState('');
  const [secondaryName, setSecondaryName] = useState('');
  const [secondaryEmail, setSecondaryEmail] = useState('');
  const [secondaryTitle, setSecondaryTitle] = useState('');
  const [duration, setDuration] = useState(eventConfig?.defaultMeetingDuration || 15);

  // Buyer form state
  const [buyerName, setBuyerName] = useState('');
  const [buyerOrg, setBuyerOrg] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');

  const resetForm = () => {
    setCompanyName('');
    setPrimaryName('');
    setPrimaryEmail('');
    setPrimaryTitle('');
    setSecondaryName('');
    setSecondaryEmail('');
    setSecondaryTitle('');
    setDuration(eventConfig?.defaultMeetingDuration || 15);
    setBuyerName('');
    setBuyerOrg('');
    setBuyerEmail('');
    setShowSecondary(false);
    setShowForm(false);
  };

  const handleAddSupplier = () => {
    if (!companyName || !primaryName) return;

    const primaryContact: ContactPerson = {
      name: primaryName,
      email: primaryEmail || undefined,
      title: primaryTitle || undefined,
    };

    const secondaryContact: ContactPerson | undefined =
      secondaryName
        ? {
            name: secondaryName,
            email: secondaryEmail || undefined,
            title: secondaryTitle || undefined,
          }
        : undefined;

    const supplier: Supplier = {
      id: generateId(),
      companyName,
      primaryContact,
      secondaryContact,
      meetingDuration: duration,
      preference: 'all',
      preferenceList: [],
    };

    addSupplier(supplier);
    resetForm();
  };

  const handleAddBuyer = () => {
    if (!buyerName) return;

    const buyer: Buyer = {
      id: generateId(),
      name: buyerName,
      organization: buyerOrg,
      email: buyerEmail || undefined,
    };

    addBuyer(buyer);
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
          // CSV format: company, contact1_name, contact1_email, contact1_title, contact2_name, contact2_email, contact2_title, duration
          const parsed: Supplier[] = data
            .map(row => {
              const company = row.company || row.Company || row.companyName || row.organization || '';
              const contact1Name = row.contact1_name || row.name || row.Name || '';

              if (!company && !contact1Name) return null;

              const secondaryContact: ContactPerson | undefined =
                row.contact2_name
                  ? {
                      name: row.contact2_name,
                      email: row.contact2_email,
                      title: row.contact2_title,
                    }
                  : undefined;

              const supplier: Supplier = {
                id: generateId(),
                companyName: company || contact1Name,
                primaryContact: {
                  name: contact1Name || company,
                  email: row.contact1_email || row.email || row.Email,
                  title: row.contact1_title || row.title,
                },
                secondaryContact,
                meetingDuration:
                  Number(row.duration || row.Duration) ||
                  eventConfig?.defaultMeetingDuration ||
                  15,
                preference: 'all',
                preferenceList: [],
              };
              return supplier;
            })
            .filter((s): s is Supplier => s !== null);

          importSuppliers(parsed);
        } else {
          const parsed: Buyer[] = data
            .map(row => ({
              id: generateId(),
              name: row.name || row.Name || '',
              organization: row.organization || row.Organization || row.company || row.Company || '',
              email: row.email || row.Email || undefined,
            }))
            .filter(b => b.name);

          importBuyers(parsed);
        }

        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      },
    });
  };

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
              onClick={() => {
                setActiveList('suppliers');
                resetForm();
              }}
              className={`flex-1 px-4 py-3 text-sm font-medium ${
                activeList === 'suppliers'
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Suppliers ({suppliers.length})
            </button>
            <button
              onClick={() => {
                setActiveList('buyers');
                resetForm();
              }}
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

          {showForm && activeList === 'suppliers' && (
            <div className="mb-4 p-4 bg-gray-50 rounded-md space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    placeholder="Acme Corporation"
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Meeting Duration (min)
                  </label>
                  <input
                    type="number"
                    value={duration}
                    onChange={e => setDuration(Number(e.target.value))}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-700 mb-3">Primary Contact *</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    type="text"
                    value={primaryName}
                    onChange={e => setPrimaryName(e.target.value)}
                    placeholder="Name *"
                    className="border rounded px-3 py-2"
                  />
                  <input
                    type="email"
                    value={primaryEmail}
                    onChange={e => setPrimaryEmail(e.target.value)}
                    placeholder="Email"
                    className="border rounded px-3 py-2"
                  />
                  <input
                    type="text"
                    value={primaryTitle}
                    onChange={e => setPrimaryTitle(e.target.value)}
                    placeholder="Title (e.g., Sales Director)"
                    className="border rounded px-3 py-2"
                  />
                </div>
              </div>

              {!showSecondary ? (
                <button
                  onClick={() => setShowSecondary(true)}
                  className="text-blue-600 text-sm hover:underline"
                >
                  + Add Secondary Contact
                </button>
              ) : (
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium text-gray-700">Secondary Contact</h4>
                    <button
                      onClick={() => {
                        setShowSecondary(false);
                        setSecondaryName('');
                        setSecondaryEmail('');
                        setSecondaryTitle('');
                      }}
                      className="text-gray-500 text-sm hover:text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input
                      type="text"
                      value={secondaryName}
                      onChange={e => setSecondaryName(e.target.value)}
                      placeholder="Name"
                      className="border rounded px-3 py-2"
                    />
                    <input
                      type="email"
                      value={secondaryEmail}
                      onChange={e => setSecondaryEmail(e.target.value)}
                      placeholder="Email"
                      className="border rounded px-3 py-2"
                    />
                    <input
                      type="text"
                      value={secondaryTitle}
                      onChange={e => setSecondaryTitle(e.target.value)}
                      placeholder="Title"
                      className="border rounded px-3 py-2"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleAddSupplier}
                  disabled={!companyName || !primaryName}
                  className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-300 text-sm"
                >
                  Add Supplier
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

          {showForm && activeList === 'buyers' && (
            <div className="mb-4 p-4 bg-gray-50 rounded-md">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <input
                  type="text"
                  value={buyerName}
                  onChange={e => setBuyerName(e.target.value)}
                  placeholder="Name *"
                  className="border rounded px-3 py-2"
                />
                <input
                  type="text"
                  value={buyerOrg}
                  onChange={e => setBuyerOrg(e.target.value)}
                  placeholder="Organization"
                  className="border rounded px-3 py-2"
                />
                <input
                  type="email"
                  value={buyerEmail}
                  onChange={e => setBuyerEmail(e.target.value)}
                  placeholder="Email"
                  className="border rounded px-3 py-2"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddBuyer}
                  disabled={!buyerName}
                  className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-300 text-sm"
                >
                  Add Buyer
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

          {activeList === 'suppliers' ? (
            suppliers.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No suppliers added yet. Click "Add Supplier" or "Import CSV" above.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 font-medium">Company</th>
                      <th className="pb-2 font-medium">Primary Contact</th>
                      <th className="pb-2 font-medium">Secondary Contact</th>
                      <th className="pb-2 font-medium">Duration</th>
                      <th className="pb-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {suppliers.map(supplier => (
                      <tr key={supplier.id} className="border-b hover:bg-gray-50">
                        <td className="py-2 font-medium">{supplier.companyName}</td>
                        <td className="py-2">
                          <div>{supplier.primaryContact.name}</div>
                          {supplier.primaryContact.title && (
                            <div className="text-xs text-gray-500">
                              {supplier.primaryContact.title}
                            </div>
                          )}
                        </td>
                        <td className="py-2">
                          {supplier.secondaryContact ? (
                            <>
                              <div>{supplier.secondaryContact.name}</div>
                              {supplier.secondaryContact.title && (
                                <div className="text-xs text-gray-500">
                                  {supplier.secondaryContact.title}
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-2">{supplier.meetingDuration} min</td>
                        <td className="py-2">
                          <button
                            onClick={() => removeSupplier(supplier.id)}
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
            )
          ) : buyers.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No buyers added yet. Click "Add Buyer" or "Import CSV" above.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium">Name</th>
                    <th className="pb-2 font-medium">Organization</th>
                    <th className="pb-2 font-medium">Email</th>
                    <th className="pb-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {buyers.map(buyer => (
                    <tr key={buyer.id} className="border-b hover:bg-gray-50">
                      <td className="py-2">{buyer.name}</td>
                      <td className="py-2">{buyer.organization || '-'}</td>
                      <td className="py-2">{buyer.email || '-'}</td>
                      <td className="py-2">
                        <button
                          onClick={() => removeBuyer(buyer.id)}
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
        {activeList === 'suppliers' ? (
          <p className="text-blue-800 text-sm">
            Headers: <code className="bg-blue-100 px-1">company, contact1_name, contact1_email, contact1_title, contact2_name, contact2_email, contact2_title, duration</code>
          </p>
        ) : (
          <p className="text-blue-800 text-sm">
            Headers: <code className="bg-blue-100 px-1">name, organization, email</code>
          </p>
        )}
      </div>
    </div>
  );
}
