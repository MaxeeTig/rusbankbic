import { useState } from 'react';
import { Search, Building2, MapPin, Phone, CreditCard, Hash } from 'lucide-react';
import { BankData } from '../App';

interface BankLookupProps {
  banks: BankData[];
}

export function BankLookup({ banks }: BankLookupProps) {
  const [bic, setBic] = useState('');
  const [foundBank, setFoundBank] = useState<BankData | null>(null);
  const [error, setError] = useState<string>('');

  const validateBIC = (value: string): boolean => {
    // BIC in Russia is 9 digits
    const bicRegex = /^\d{9}$/;
    return bicRegex.test(value);
  };

  const handleSearch = () => {
    setError('');
    setFoundBank(null);

    if (!bic) {
      setError('Please enter a BIC');
      return;
    }

    if (!validateBIC(bic)) {
      setError('Invalid BIC format. BIC must be 9 digits.');
      return;
    }

    const bank = banks.find(b => b.bic === bic);
    
    if (bank) {
      setFoundBank(bank);
    } else {
      setError('Bank not found. Please update the database in Settings.');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-gray-900 mb-2">Search by BIC</h2>
        <p className="text-gray-600 mb-6">
          Enter a 9-digit Bank Identification Code to retrieve bank information
        </p>

        {/* Search Input */}
        <div className="flex gap-3">
          <div className="flex-1">
            <input
              type="text"
              value={bic}
              onChange={(e) => setBic(e.target.value.replace(/\D/g, '').slice(0, 9))}
              onKeyPress={handleKeyPress}
              placeholder="Enter 9-digit BIC (e.g., 044525225)"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              maxLength={9}
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <Search className="w-5 h-5" />
            Search
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}
      </div>

      {/* Bank Details */}
      {foundBank && (
        <div className="border border-gray-200 rounded-lg p-6 space-y-4 bg-gradient-to-br from-indigo-50 to-blue-50">
          <div className="flex items-center gap-3 mb-4">
            <Building2 className="w-6 h-6 text-indigo-600" />
            <h3 className="text-gray-900">Bank Details</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-gray-600">Bank Name</p>
              <p className="text-gray-900">{foundBank.name}</p>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-gray-600 flex items-center gap-1">
                <CreditCard className="w-4 h-4" />
                BIC
              </p>
              <p className="text-gray-900">{foundBank.bic}</p>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-gray-600">Correspondent Account</p>
              <p className="text-gray-900">{foundBank.correspondentAccount}</p>
            </div>

            {foundBank.registrationNumber && (
              <div className="space-y-1">
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <Hash className="w-4 h-4" />
                  Registration Number
                </p>
                <p className="text-gray-900">{foundBank.registrationNumber}</p>
              </div>
            )}

            <div className="space-y-1">
              <p className="text-sm text-gray-600 flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                City
              </p>
              <p className="text-gray-900">{foundBank.city}</p>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-gray-600">Postal Code</p>
              <p className="text-gray-900">{foundBank.zip}</p>
            </div>

            <div className="space-y-1 md:col-span-2">
              <p className="text-sm text-gray-600">Address</p>
              <p className="text-gray-900">{foundBank.address}</p>
            </div>

            {foundBank.phone && (
              <div className="space-y-1">
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <Phone className="w-4 h-4" />
                  Phone
                </p>
                <p className="text-gray-900">{foundBank.phone}</p>
              </div>
            )}

            {foundBank.swift && (
              <div className="space-y-1">
                <p className="text-sm text-gray-600">SWIFT Code</p>
                <p className="text-gray-900">{foundBank.swift}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Help Section */}
      {!foundBank && !error && (
        <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
          <h3 className="text-gray-900 mb-3">About BIC</h3>
          <p className="text-gray-600 mb-4">
            The Bank Identification Code (BIC) is a unique 9-digit code assigned to each bank by the Central Bank of Russia.
          </p>
          <div className="space-y-2">
            <p className="text-sm text-gray-600">Example BICs:</p>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              <li>044525225 - Sberbank of Russia</li>
              <li>044525974 - VTB Bank</li>
              <li>044525593 - Gazprombank</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
