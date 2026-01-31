import React, { useState } from 'react';
import { Lock, Activity, Shield, FileSpreadsheet } from 'lucide-react';
import { User } from '../types';
import { dbService } from '../services/db';
import Papa from 'papaparse';

interface AdminScreenProps {
  user: User;
  isLockdown: boolean;
  onToggleLockdown: () => void;
}

type Tab = 'Overview' | 'Activity' | 'Security';

const TABS: Tab[] = ['Overview', 'Activity', 'Security'];

export const AdminScreen: React.FC<AdminScreenProps> = ({ user, isLockdown, onToggleLockdown }) => {
  const [activeTab, setActiveTab] = useState<Tab>('Overview');

  const handleExportData = async () => {
      const allVisitors = await dbService.getAllVisitors();
      if (allVisitors.length === 0) {
          alert("No data available to export.");
          return;
      }
      
      const csvData = allVisitors.map(v => ({
        PassID: v.passId,
        Name: v.name,
        Mobile: v.mobile,
        Type: v.visitorType,
        Host: v.hostName,
        Student: v.studentName || 'N/A',
        Class: v.studentClass || 'N/A',
        Section: v.studentSection || 'N/A',
        InTime: new Date(v.checkInTime).toLocaleString(),
        OutTime: v.checkOutTime ? new Date(v.checkOutTime).toLocaleString() : 'Active',
        Status: v.status
      }));

      const csv = Papa.unparse(csvData);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Full_Visitor_Export_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'Overview':
          return (
              <div className="mt-6 space-y-4">
                  <div className="glass-panel p-6 rounded-2xl">
                      <h3 className="text-white font-bold text-lg mb-2">Data Management</h3>
                      <p className="text-white/60 text-sm mb-6">Download complete visitor history for records.</p>
                      <button 
                        onClick={handleExportData}
                        className="w-full bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl flex items-center justify-center gap-3 ios-press transition-colors border border-white/10"
                      >
                          <FileSpreadsheet size={20} className="text-green-400" />
                          <span className="font-semibold">Download Full Excel Report</span>
                      </button>
                  </div>
              </div>
          );
      case 'Security':
        return (
          <div className="mt-6">
            <div className="glass-panel rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-white font-semibold">Emergency Lockdown</p>
                <p className="text-sm text-white/60">
                  {isLockdown ? 'Stops all entries immediately.' : 'Allow new entries.'}
                </p>
              </div>
              <button
                onClick={onToggleLockdown}
                className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 ${isLockdown ? 'bg-red-500' : 'bg-white/10'}`}
              >
                <div className={`w-6 h-6 bg-white rounded-full shadow transition-transform duration-300 ${isLockdown ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>
        );
      default:
        return (
          <div className="text-center py-20">
            <p className="text-white/50">{activeTab} screen content.</p>
          </div>
        );
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-4xl font-bold text-white mb-6 drop-shadow-md">Admin Panel</h1>
      
      <div className="glass-panel p-1 rounded-lg flex items-center mb-4">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 text-center py-2 text-sm font-semibold rounded-md transition-all ${
              activeTab === tab ? 'bg-white/10 text-white shadow backdrop-blur-sm' : 'text-white/50'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      
      {renderContent()}
    </div>
  );
};