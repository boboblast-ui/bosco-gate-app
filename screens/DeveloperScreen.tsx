import React, { useState, useEffect } from 'react';
import { dbService } from '../services/db';
import { User, DeveloperConfig } from '../types';

interface DeveloperScreenProps {
  user: User;
}

type Tab = 'Gateway' | 'Rules' | 'Flags';

const TABS: Tab[] = ['Gateway', 'Rules', 'Flags'];

export const DeveloperScreen: React.FC<DeveloperScreenProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<Tab>('Gateway');
  const [config, setConfig] = useState<DeveloperConfig | null>(null);

  useEffect(() => { dbService.getDeveloperConfig().then(setConfig); }, []);

  const handleChange = (section: keyof DeveloperConfig, key: string, value: any) => {
    if (!config) return;
    const newConfig = { ...config, [section]: { ...config[section], [key]: value } };
    setConfig(newConfig);
    dbService.setDeveloperConfig(newConfig); // Auto-save on change
  };

  const renderContent = () => {
    if (!config) return null;
    switch (activeTab) {
      case 'Gateway':
        return (
          <div className="space-y-4">
             <div className="glass-panel rounded-xl">
                <div className="flex items-center p-3 justify-between">
                    <label className="text-white">Provider</label>
                    <select
                        value={config.gateway.provider}
                        onChange={(e) => handleChange('gateway', 'provider', e.target.value)}
                        className="bg-transparent text-white/60 text-right border-none focus:outline-none"
                    >
                        <option className="text-black" value="MOCK">Mock</option>
                        <option className="text-black" value="TWILIO">Twilio</option>
                    </select>
                </div>
             </div>
             <div className="glass-panel rounded-xl">
                <div className="p-3">
                    <label className="text-white">API Key</label>
                    <input type="password" value={config.gateway.apiKey} onChange={e => handleChange('gateway', 'apiKey', e.target.value)} className="w-full bg-transparent text-right text-white/60 focus:outline-none"/>
                </div>
             </div>
          </div>
        );
      default:
        return (
          <div className="text-center py-20">
            <p className="text-white/50">{activeTab} settings.</p>
          </div>
        );
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-4xl font-bold text-white mb-6 drop-shadow-md">Developer</h1>
      
      <div className="glass-panel p-1 rounded-lg flex items-center mb-6">
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