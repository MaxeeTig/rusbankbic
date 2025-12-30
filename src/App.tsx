import { useState, useEffect } from 'react';
import { BankLookup } from './components/BankLookup';
import { Settings } from './components/Settings';
import { Database, Settings as SettingsIcon } from 'lucide-react';

export interface BankData {
  bic: string;
  name: string;
  correspondentAccount: string;
  city: string;
  address: string;
  zip: string;
  phone?: string;
  swift?: string;
  registrationNumber?: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'lookup' | 'settings'>('lookup');
  const [banks, setBanks] = useState<BankData[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    // Load banks from localStorage on mount
    const storedBanks = localStorage.getItem('russianBanks');
    const storedDate = localStorage.getItem('banksLastUpdated');
    
    if (storedBanks) {
      setBanks(JSON.parse(storedBanks));
    }
    if (storedDate) {
      setLastUpdated(storedDate);
    }
  }, []);

  const updateBanks = (newBanks: BankData[]) => {
    setBanks(newBanks);
    const now = new Date().toISOString();
    setLastUpdated(now);
    localStorage.setItem('russianBanks', JSON.stringify(newBanks));
    localStorage.setItem('banksLastUpdated', now);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Database className="w-8 h-8 text-indigo-600" />
            <h1 className="text-indigo-900">Russian Banks Directory</h1>
          </div>
          <p className="text-gray-600">BIC validation and bank information lookup</p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm mb-6 p-1 inline-flex gap-1">
          <button
            onClick={() => setActiveTab('lookup')}
            className={`px-6 py-3 rounded-md transition-all flex items-center gap-2 ${
              activeTab === 'lookup'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Database className="w-4 h-4" />
            BIC Lookup
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-6 py-3 rounded-md transition-all flex items-center gap-2 ${
              activeTab === 'settings'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <SettingsIcon className="w-4 h-4" />
            Settings
          </button>
        </div>

        {/* Status Bar */}
        {lastUpdated && (
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Database Status</p>
              <p className="text-gray-900">
                {banks.length} banks loaded
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Last Updated</p>
              <p className="text-gray-900">
                {new Date(lastUpdated).toLocaleDateString('ru-RU', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>
        )}

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-md p-6">
          {activeTab === 'lookup' ? (
            <BankLookup banks={banks} />
          ) : (
            <Settings banks={banks} onUpdateBanks={updateBanks} />
          )}
        </div>
      </div>
    </div>
  );
}
