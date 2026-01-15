import { useSchedule } from '../context/ScheduleContext';
import { formatTime } from '../utils/timeUtils';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

export default function ExportPanel() {
  const {
    eventConfig,
    suppliers,
    buyers,
    meetings,
    timeSlots,
    exportToJSON,
    importFromJSON,
    resetAllData,
  } = useSchedule();

  const getBuyer = (id: string) => buyers.find(b => b.id === id);
  const getSupplier = (id: string) => suppliers.find(s => s.id === id);
  const getSlot = (id: string) => timeSlots.find(s => s.id === id);

  const meetingSlots = timeSlots.filter(s => !s.isBreak);
  const activeMeetings = meetings.filter(m => m.status !== 'cancelled');

  const exportSupplierPDF = () => {
    const doc = new jsPDF();
    let y = 20;

    doc.setFontSize(18);
    doc.text(eventConfig?.name || 'Meeting Schedule', 14, y);
    y += 10;

    doc.setFontSize(10);
    doc.text(`Date: ${eventConfig?.date}`, 14, y);
    y += 15;

    suppliers.forEach(supplier => {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(14);
      doc.text(supplier.companyName, 14, y);
      y += 6;
      doc.setFontSize(9);
      doc.text(`Contact: ${supplier.primaryContact.name}${supplier.primaryContact.email ? ` (${supplier.primaryContact.email})` : ''}`, 14, y);
      if (supplier.secondaryContact) {
        y += 4;
        doc.text(`Secondary: ${supplier.secondaryContact.name}${supplier.secondaryContact.email ? ` (${supplier.secondaryContact.email})` : ''}`, 14, y);
      }
      y += 6;

      doc.setFontSize(10);
      const supplierMeetings = activeMeetings.filter(m => m.supplierId === supplier.id);

      meetingSlots.forEach(slot => {
        const meeting = supplierMeetings.find(m => m.timeSlotId === slot.id);
        const buyer = meeting ? getBuyer(meeting.buyerId) : null;
        doc.text(`${formatTime(slot.startTime)}: ${buyer?.name || '-'}`, 20, y);
        y += 5;
      });

      y += 10;
    });

    doc.save('schedule-by-supplier.pdf');
  };

  const exportBuyerPDF = () => {
    const doc = new jsPDF();
    let y = 20;

    doc.setFontSize(18);
    doc.text(eventConfig?.name || 'Meeting Schedule', 14, y);
    y += 10;

    doc.setFontSize(10);
    doc.text(`Date: ${eventConfig?.date}`, 14, y);
    y += 15;

    buyers.forEach(buyer => {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(14);
      doc.text(`${buyer.name} (${buyer.organization})`, 14, y);
      y += 8;

      doc.setFontSize(10);
      const buyerMeetings = activeMeetings.filter(m => m.buyerId === buyer.id);

      meetingSlots.forEach(slot => {
        const meeting = buyerMeetings.find(m => m.timeSlotId === slot.id);
        const supplier = meeting ? getSupplier(meeting.supplierId) : null;
        doc.text(`${formatTime(slot.startTime)}: ${supplier?.companyName || '-'}`, 20, y);
        y += 5;
      });

      y += 10;
    });

    doc.save('schedule-by-buyer.pdf');
  };

  const exportMasterPDF = () => {
    const doc = new jsPDF('landscape');
    let y = 15;

    doc.setFontSize(16);
    doc.text(eventConfig?.name || 'Master Schedule', 14, y);
    y += 8;

    doc.setFontSize(8);
    doc.text(`Date: ${eventConfig?.date}`, 14, y);
    y += 10;

    // Headers
    const colWidth = (280 - 30) / suppliers.length;
    doc.text('Time', 14, y);
    suppliers.forEach((s, i) => {
      doc.text(s.companyName.substring(0, 12), 35 + i * colWidth, y);
    });
    y += 5;

    // Grid
    meetingSlots.forEach(slot => {
      if (y > 190) {
        doc.addPage('landscape');
        y = 15;
      }

      doc.text(formatTime(slot.startTime), 14, y);
      suppliers.forEach((supplier, i) => {
        const meeting = activeMeetings.find(
          m => m.supplierId === supplier.id && m.timeSlotId === slot.id
        );
        const buyer = meeting ? getBuyer(meeting.buyerId) : null;
        doc.text(buyer?.name?.substring(0, 12) || '-', 35 + i * colWidth, y);
      });
      y += 5;
    });

    doc.save('master-schedule.pdf');
  };

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Master grid sheet
    const gridData = [
      ['Time', ...suppliers.map(s => s.companyName)],
      ...meetingSlots.map(slot => [
        formatTime(slot.startTime),
        ...suppliers.map(supplier => {
          const meeting = activeMeetings.find(
            m => m.supplierId === supplier.id && m.timeSlotId === slot.id
          );
          return meeting ? getBuyer(meeting.buyerId)?.name || '' : '';
        }),
      ]),
    ];
    const gridSheet = XLSX.utils.aoa_to_sheet(gridData);
    XLSX.utils.book_append_sheet(wb, gridSheet, 'Master Grid');

    // Supplier sheets
    const supplierData = suppliers.map(supplier => {
      const supplierMeetings = activeMeetings.filter(m => m.supplierId === supplier.id);
      return [
        supplier.companyName,
        ...meetingSlots.map(slot => {
          const meeting = supplierMeetings.find(m => m.timeSlotId === slot.id);
          return meeting ? getBuyer(meeting.buyerId)?.name || '' : '';
        }),
      ];
    });
    const supplierSheet = XLSX.utils.aoa_to_sheet([
      ['Supplier', ...meetingSlots.map(s => formatTime(s.startTime))],
      ...supplierData,
    ]);
    XLSX.utils.book_append_sheet(wb, supplierSheet, 'By Supplier');

    // Buyer sheets
    const buyerData = buyers.map(buyer => {
      const buyerMeetings = activeMeetings.filter(m => m.buyerId === buyer.id);
      return [
        buyer.name,
        ...meetingSlots.map(slot => {
          const meeting = buyerMeetings.find(m => m.timeSlotId === slot.id);
          return meeting ? getSupplier(meeting.supplierId)?.companyName || '' : '';
        }),
      ];
    });
    const buyerSheet = XLSX.utils.aoa_to_sheet([
      ['Buyer', ...meetingSlots.map(s => formatTime(s.startTime))],
      ...buyerData,
    ]);
    XLSX.utils.book_append_sheet(wb, buyerSheet, 'By Buyer');

    // All meetings list
    const meetingsList = activeMeetings.map(m => {
      const slot = getSlot(m.timeSlotId);
      const supplier = getSupplier(m.supplierId);
      return {
        Time: slot ? formatTime(slot.startTime) : '',
        Supplier: supplier?.companyName || '',
        'Primary Contact': supplier?.primaryContact.name || '',
        'Primary Email': supplier?.primaryContact.email || '',
        'Secondary Contact': supplier?.secondaryContact?.name || '',
        'Secondary Email': supplier?.secondaryContact?.email || '',
        Buyer: getBuyer(m.buyerId)?.name || '',
        Status: m.status,
      };
    });
    const meetingsSheet = XLSX.utils.json_to_sheet(meetingsList);
    XLSX.utils.book_append_sheet(wb, meetingsSheet, 'All Meetings');

    XLSX.writeFile(wb, 'schedule.xlsx');
  };

  const handleExportJSON = () => {
    const json = exportToJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'schedule-backup.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      try {
        importFromJSON(event.target?.result as string);
        alert('Data imported successfully!');
      } catch {
        alert('Failed to import data. Invalid file format.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const hasSchedule = meetings.length > 0;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Export Schedule</h2>

        {!hasSchedule ? (
          <p className="text-gray-500">Generate a schedule first to enable exports.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={exportSupplierPDF}
              className="p-4 border-2 border-dashed rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <div className="text-2xl mb-2">📄</div>
              <div className="font-medium">Supplier Schedules</div>
              <div className="text-sm text-gray-500">PDF by supplier</div>
            </button>

            <button
              onClick={exportBuyerPDF}
              className="p-4 border-2 border-dashed rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <div className="text-2xl mb-2">📄</div>
              <div className="font-medium">Buyer Schedules</div>
              <div className="text-sm text-gray-500">PDF by buyer</div>
            </button>

            <button
              onClick={exportMasterPDF}
              className="p-4 border-2 border-dashed rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <div className="text-2xl mb-2">📊</div>
              <div className="font-medium">Master Grid</div>
              <div className="text-sm text-gray-500">PDF overview</div>
            </button>

            <button
              onClick={exportExcel}
              className="p-4 border-2 border-dashed rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
            >
              <div className="text-2xl mb-2">📗</div>
              <div className="font-medium">Excel Export</div>
              <div className="text-sm text-gray-500">All data in .xlsx</div>
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Backup & Restore</h2>
        <p className="text-sm text-gray-600 mb-4">
          Export your entire configuration (suppliers, buyers, preferences, schedule) as a JSON
          file. Use this to transfer data between devices or keep a backup.
        </p>

        <div className="flex gap-4">
          <button
            onClick={handleExportJSON}
            className="px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Export Backup (JSON)
          </button>

          <label className="px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200 cursor-pointer">
            Import Backup
            <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
          </label>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <h3 className="font-medium text-blue-900 mb-2">Print Tip</h3>
        <p className="text-blue-800 text-sm">
          You can also print directly from the Schedule tab. Use your browser's print function
          (Ctrl+P / Cmd+P) - the navigation will be hidden automatically.
        </p>
      </div>

      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-red-900 mb-2">Reset All Data</h2>
        <p className="text-sm text-red-700 mb-4">
          This will permanently delete all suppliers, buyers, preferences, and schedules.
          Consider exporting a backup first.
        </p>
        <button
          onClick={() => {
            if (window.confirm('Are you sure you want to delete ALL data? This cannot be undone.')) {
              resetAllData();
            }
          }}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          Reset All Data
        </button>
      </div>
    </div>
  );
}
