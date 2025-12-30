import { useState, useRef } from 'react';
import { Download, Upload, RefreshCw, FileJson, AlertCircle, CheckCircle, Database, FileCode } from 'lucide-react';
import { BankData } from '../App';
import { parseED807XML } from '../utils/xmlParser';
import { convertWindows1251ToUTF8 } from '../utils/encoding';

interface SettingsProps {
  banks: BankData[];
  onUpdateBanks: (banks: BankData[]) => void;
}

export function Settings({ banks, onUpdateBanks }: SettingsProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Central Bank of Russia data sources
  // Note: Direct API access may be limited due to CORS restrictions
  // Users should download ED807 XML files manually from:
  // - https://www.cbr.ru/vfs/mcirabis/BIK/ (official BIK directory)
  // - https://www.cbr.ru/eng/statistics/?PrtId=lic (licensing information)
  // The ED807 XML format is the standard format for bank directory data

  const handleFetchFromAPI = async () => {
    setLoading(true);
    setMessage(null);

    try {
      // Attempt to fetch from CBR - this may fail due to CORS
      // The CBR typically requires manual download of ED807 XML files
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
      
      // Try common CBR endpoints (may not work due to CORS)
      const possibleUrls = [
        `https://www.cbr.ru/vfs/mcirabis/BIK/ED807_${dateStr}.xml`,
        `https://www.cbr.ru/vfs/mcirabis/BIK/ED807_full.xml`,
        'https://www.cbr.ru/vfs/mcirabis/BIK/ED807.xml'
      ];

      let lastError: Error | null = null;
      
      for (const url of possibleUrls) {
        try {
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Accept': 'application/xml, text/xml, */*'
            }
          });

          if (response.ok) {
            const xmlContent = await response.text();
            const parsedBanks = parseED807XML(xmlContent);
            
            if (parsedBanks.length > 0) {
              onUpdateBanks(parsedBanks);
              setMessage({
                type: 'success',
                text: `Successfully loaded ${parsedBanks.length} banks from CBR API.`
              });
              setLoading(false);
              return;
            }
          }
        } catch (error) {
          lastError = error instanceof Error ? error : new Error('Unknown error');
          // Continue to next URL
        }
      }

      // If all URLs failed, provide instructions
      throw new Error(
        'Direct API access is not available due to CORS restrictions. ' +
        'Please download the ED807 XML file manually from the Central Bank of Russia website ' +
        '(https://www.cbr.ru/vfs/mcirabis/BIK/) and upload it using the file upload option.'
      );
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to fetch data from Central Bank API. Please try uploading a file instead.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setMessage(null);

    // Show progress for large files
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > 5) {
      setMessage({
        type: 'success',
        text: `Processing large file (${fileSizeMB.toFixed(1)} MB). This may take a moment...`
      });
    }

    const reader = new FileReader();
    
    // For XML files, read as ArrayBuffer to handle Windows-1251 encoding
    if (file.name.endsWith('.xml') || file.name.endsWith('.XML')) {
      reader.onload = (e) => {
        try {
          const buffer = e.target?.result as ArrayBuffer;
          // Convert Windows-1251 to UTF-8
          const content = convertWindows1251ToUTF8(buffer);
          
          // Parse ED807 XML format
          let parsedBanks: BankData[];
          try {
            parsedBanks = parseED807XML(content);
          } catch (xmlError) {
            throw new Error(
              `XML parsing failed: ${xmlError instanceof Error ? xmlError.message : 'Unknown error'}. ` +
              'Please ensure the file is a valid ED807 XML format from Central Bank of Russia.'
            );
          }

          // Validate and process banks
          processParsedBanks(parsedBanks);
        } catch (error) {
          handleParseError(error);
        }
      };
      
      reader.readAsArrayBuffer(file);
    } else {
      // For JSON/CSV, read as text (UTF-8)
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          let parsedBanks: BankData[];

          if (file.name.endsWith('.json')) {
            parsedBanks = JSON.parse(content);
          } else if (file.name.endsWith('.csv')) {
            parsedBanks = parseCSV(content);
          } else {
            throw new Error('Unsupported file format. Please use XML (ED807), JSON, or CSV.');
          }

          // Validate and process banks
          processParsedBanks(parsedBanks);
        } catch (error) {
          handleParseError(error);
        }
      };
      
      reader.readAsText(file, 'UTF-8');
    }
    
    reader.onerror = () => {
      setMessage({
        type: 'error',
        text: 'Failed to read file. Please ensure the file is not corrupted.'
      });
      setLoading(false);
    };
  };

  const processParsedBanks = (parsedBanks: BankData[]) => {
    // Validate the data structure
    if (!Array.isArray(parsedBanks) || parsedBanks.length === 0) {
      throw new Error('Invalid data format. Expected an array of bank records.');
    }

    // Basic validation of required fields
    const invalidBanks = parsedBanks.filter(bank => 
      !bank.bic || !bank.name || !bank.correspondentAccount
    );

    if (invalidBanks.length > 0) {
      console.warn(`Filtered out ${invalidBanks.length} invalid bank entries`);
      // Filter out invalid entries
      parsedBanks = parsedBanks.filter(bank => 
        bank.bic && bank.name && bank.correspondentAccount
      );
    }

    if (parsedBanks.length === 0) {
      throw new Error('No valid bank records found in file. Please check the file format.');
    }

    // Debug: Log first bank name to verify encoding
    if (parsedBanks.length > 0) {
      console.log('Sample bank name after parsing:', parsedBanks[0].name);
      console.log('Sample bank name char codes:', Array.from(parsedBanks[0].name).map(c => c.charCodeAt(0)));
    }

    onUpdateBanks(parsedBanks);
    setMessage({
      type: 'success',
      text: `Successfully loaded ${parsedBanks.length} banks from file.`
    });
    setLoading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleParseError = (error: unknown) => {
    setMessage({
      type: 'error',
      text: error instanceof Error ? error.message : 'Failed to parse file.'
    });
    setLoading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClearStorage = () => {
    if (confirm('Are you sure you want to clear all stored bank data? This cannot be undone.')) {
      localStorage.removeItem('russianBanks');
      localStorage.removeItem('banksLastUpdated');
      onUpdateBanks([]);
      setMessage({
        type: 'success',
        text: 'Local storage cleared. Please upload a new file.'
      });
    }
  };

  const parseCSV = (csv: string): BankData[] => {
    const lines = csv.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim());
    
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const bank: any = {};
      
      headers.forEach((header, index) => {
        bank[header] = values[index] || '';
      });
      
      return bank as BankData;
    });
  };

  const handleExportData = () => {
    const dataStr = JSON.stringify(banks, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `russian-banks-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setMessage({
      type: 'success',
      text: 'Database exported successfully.'
    });
  };

  const handleLoadSampleData = () => {
    const sampleBanks: BankData[] = [
      {
        bic: '044525225',
        name: 'ПАО Сбербанк',
        correspondentAccount: '30101810400000000225',
        city: 'Москва',
        address: 'г. Москва, ул. Вавилова, д. 19',
        zip: '117997',
        phone: '+7 (495) 500-55-50',
        swift: 'SABRRUMM',
        registrationNumber: '1481'
      },
      {
        bic: '044525974',
        name: 'ПАО Банк ВТБ',
        correspondentAccount: '30101810700000000974',
        city: 'Санкт-Петербург',
        address: 'г. Санкт-Петербург, ул. Большая Морская, д. 29',
        zip: '190000',
        phone: '+7 (812) 329-23-23',
        swift: 'VTBRRUM2',
        registrationNumber: '1000'
      },
      {
        bic: '044525593',
        name: 'АО ГПБ (Газпромбанк)',
        correspondentAccount: '30101810200000000593',
        city: 'Москва',
        address: 'г. Москва, ул. Наметкина, д. 16, корп. 1',
        zip: '117420',
        phone: '+7 (495) 913-74-74',
        swift: 'GAZPRUMM',
        registrationNumber: '354'
      },
      {
        bic: '044525823',
        name: 'АО Альфа-Банк',
        correspondentAccount: '30101810200000000823',
        city: 'Москва',
        address: 'г. Москва, ул. Каланчевская, д. 27',
        zip: '107078',
        phone: '+7 (495) 788-88-78',
        swift: 'ALFARUMM',
        registrationNumber: '1326'
      },
      {
        bic: '044525555',
        name: 'АО ЮниКредит Банк',
        correspondentAccount: '30101810300000000555',
        city: 'Москва',
        address: 'г. Москва, Пресненская наб., д. 9, стр. 1',
        zip: '123112',
        phone: '+7 (495) 258-72-00',
        swift: 'IMBKRUMM',
        registrationNumber: '1'
      }
    ];

    onUpdateBanks(sampleBanks);
    setMessage({
      type: 'success',
      text: `Loaded ${sampleBanks.length} sample banks for demonstration.`
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-gray-900 mb-2">Database Management</h2>
        <p className="text-gray-600 mb-6">
          Update the banks database from Central Bank of Russia or upload your own file
        </p>
      </div>

      {/* Message Display */}
      {message && (
        <div
          className={`p-4 rounded-lg flex items-start gap-3 ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          )}
          <p className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
            {message.text}
          </p>
        </div>
      )}

      {/* Current Database Stats */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg p-6 border border-indigo-100">
        <div className="flex items-center gap-3 mb-3">
          <Database className="w-6 h-6 text-indigo-600" />
          <h3 className="text-gray-900">Current Database</h3>
        </div>
        <p className="text-gray-600">
          {banks.length > 0 
            ? `${banks.length} banks currently loaded in local storage` 
            : 'No banks loaded. Please fetch or upload data.'}
        </p>
      </div>

      {/* Update Methods */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Fetch from API */}
        <div className="border border-gray-200 rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <RefreshCw className="w-5 h-5 text-indigo-600" />
            <h3 className="text-gray-900">Fetch from CBR API</h3>
          </div>
          <p className="text-sm text-gray-600">
            Download the latest bank data from the Central Bank of Russia
          </p>
          <button
            onClick={handleFetchFromAPI}
            disabled={loading}
            className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Fetching...
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                Fetch Latest Data
              </>
            )}
          </button>
          <p className="text-xs text-gray-500">
            Note: Requires internet connection
          </p>
        </div>

        {/* Upload File */}
        <div className="border border-gray-200 rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <FileCode className="w-5 h-5 text-indigo-600" />
            <h3 className="text-gray-900">Upload File</h3>
          </div>
          <p className="text-sm text-gray-600">
            Upload an ED807 XML file from Central Bank of Russia, or JSON/CSV file with bank data
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xml,.XML,.json,.csv"
            onChange={handleFileUpload}
            className="hidden"
            disabled={loading}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                Choose File
              </>
            )}
          </button>
          <p className="text-xs text-gray-500">
            Supported formats: ED807 XML (recommended), JSON, CSV
          </p>
        </div>
      </div>

      {/* Additional Actions */}
      <div className="border-t border-gray-200 pt-6 space-y-4">
        <h3 className="text-gray-900">Additional Actions</h3>
        
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExportData}
            disabled={banks.length === 0}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export Current Data
          </button>

          <button
            onClick={handleLoadSampleData}
            className="px-4 py-2 border border-indigo-300 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors flex items-center gap-2"
          >
            <Database className="w-4 h-4" />
            Load Sample Data
          </button>

          <button
            onClick={handleClearStorage}
            className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4" />
            Clear Storage
          </button>
        </div>
      </div>

      {/* Data Format Documentation */}
      <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
        <h3 className="text-gray-900 mb-3">Data Sources & Format</h3>
        
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">ED807 XML Format (Recommended)</h4>
          <p className="text-sm text-gray-600 mb-2">
            Download ED807 XML files directly from the Central Bank of Russia:
          </p>
          <ul className="text-xs text-gray-600 list-disc list-inside mb-2 space-y-1">
            <li>Official BIK Directory: <a href="https://www.cbr.ru/vfs/mcirabis/BIK/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">https://www.cbr.ru/vfs/mcirabis/BIK/</a></li>
            <li>Files are typically named: <code className="bg-gray-200 px-1 rounded">ED807_YYYYMMDD.xml</code> or <code className="bg-gray-200 px-1 rounded">ED807_full.xml</code></li>
          </ul>
        </div>

        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">JSON Format</h4>
          <p className="text-sm text-gray-600 mb-2">
            For JSON files, use the following structure:
          </p>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded text-xs overflow-x-auto">
{`[
  {
    "bic": "044525225",
    "name": "ПАО Сбербанк",
    "correspondentAccount": "30101810400000000225",
    "city": "Москва",
    "address": "г. Москва, ул. Вавилова, д. 19",
    "zip": "117997",
    "phone": "+7 (495) 500-55-50",
    "swift": "SABRRUMM",
    "registrationNumber": "1481"
  }
]`}
          </pre>
        </div>

        <p className="text-xs text-gray-500 mt-3">
          <strong>Required fields:</strong> bic (9 digits), name, correspondentAccount. Other fields are optional.
        </p>
      </div>
    </div>
  );
}
