# Offline Bank List App

An offline-first web application for managing and validating Russian bank information using BIC (Bank Identification Code) lookup. The application loads bank data from Central Bank of Russia ED807 XML files and stores it locally in the browser.

## Features

- **ED807 XML Support**: Parse official Central Bank of Russia ED807 XML format files
- **Windows-1251 Encoding**: Automatic conversion from Windows-1251 to UTF-8 for proper Cyrillic character display
- **BIC Validation**: Validate 9-digit Bank Identification Codes
- **Bank Lookup**: Search and display detailed bank information by BIC
- **Local Storage**: All data stored in browser localStorage for offline access
- **Manual Updates**: Upload XML, JSON, or CSV files to update the bank database
- **Data Export**: Export current bank database as JSON

## Technology Stack

- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **Radix UI** components

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd rusbankbic
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:3000`

## Usage

### Loading Bank Data

#### Option 1: Upload ED807 XML File (Recommended)

1. Download the latest ED807 XML file from Central Bank of Russia:
   - Official BIK Directory: https://www.cbr.ru/vfs/mcirabis/BIK/
   - Files are typically named: `ED807_YYYYMMDD.xml` or `ED807_full.xml`

2. Go to the **Settings** tab in the application

3. Click **"Choose File"** and select your ED807 XML file

4. The application will automatically:
   - Detect Windows-1251 encoding
   - Convert to UTF-8
   - Parse the XML structure
   - Extract bank information
   - Store in localStorage

#### Option 2: Upload JSON/CSV File

1. Prepare a JSON or CSV file with bank data (see Data Format section)

2. Go to the **Settings** tab

3. Click **"Choose File"** and select your file

#### Option 3: Load Sample Data

1. Go to the **Settings** tab

2. Click **"Load Sample Data"** to load 5 sample banks for testing

### Searching for Banks

1. Go to the **BIC Lookup** tab

2. Enter a 9-digit BIC code (e.g., `044525225`)

3. Click **"Search"** or press Enter

4. View the bank details including:
   - Bank Name
   - BIC
   - Correspondent Account
   - City
   - Address
   - Postal Code
   - SWIFT Code (if available)
   - Registration Number (if available)

### Managing Data

- **Export Data**: Click "Export Current Data" in Settings to download the current database as JSON
- **Clear Storage**: Click "Clear Storage" in Settings to remove all stored bank data
- **View Status**: Check the status bar to see how many banks are loaded and when they were last updated

## Data Format

### ED807 XML Format

The application automatically parses ED807 XML files from Central Bank of Russia. The XML structure includes:

- `<BICDirectoryEntry>` - Each bank entry
  - `BIC` attribute - 9-digit Bank Identification Code
  - `<ParticipantInfo>` - Bank information
    - `NameP` - Bank name (Russian)
    - `Ind` - Postal code
    - `Nnp` - City name
    - `Adr` - Address
    - `RegN` - Registration number
  - `<SWBICS>` - SWIFT code information
    - `SWBIC` - SWIFT code
  - `<Accounts>` - Account information
    - `Account` - Correspondent account number
    - `RegulationAccountType` - Account type (CRSA preferred)

### JSON Format

For manual JSON uploads, use this structure:

```json
[
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
]
```

**Required fields**: `bic`, `name`, `correspondentAccount`
**Optional fields**: `city`, `address`, `zip`, `phone`, `swift`, `registrationNumber`

## Implementation Details

### XML Parsing

The application uses browser-native `DOMParser` API to parse ED807 XML files:

- **Namespace Support**: Handles `urn:cbr-ru:ed:v2.0` namespace with fallback to non-namespace parsing
- **Data Extraction**: Extracts bank information from XML attributes and elements
- **Validation**: Validates BIC format (exactly 9 digits) and required fields
- **Error Handling**: Skips invalid entries and continues processing

### Encoding Conversion

ED807 XML files from Central Bank of Russia are encoded in Windows-1251. The application includes:

- **Automatic Detection**: Detects Windows-1251 encoding from XML declaration
- **Manual Conversion**: Complete Windows-1251 to Unicode mapping table for Cyrillic characters
- **UTF-8 Output**: Converts all text to UTF-8 for proper browser display

### Data Storage

- **localStorage**: All bank data stored in browser localStorage
- **Persistence**: Data persists across browser sessions
- **Keys Used**:
  - `russianBanks` - Array of bank objects
  - `banksLastUpdated` - ISO timestamp of last update

### File Structure

```
src/
├── App.tsx                 # Main application component
├── components/
│   ├── BankLookup.tsx      # BIC search and display component
│   ├── Settings.tsx        # File upload and data management
│   └── ui/                 # Reusable UI components
├── utils/
│   ├── xmlParser.ts        # ED807 XML parsing logic
│   └── encoding.ts         # Windows-1251 to UTF-8 conversion
└── main.tsx                # Application entry point
```

## Building for Production

```bash
npm run build
```

The built files will be in the `build` directory.

## Browser Compatibility

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

Requires modern browser support for:
- ES6+ JavaScript features
- FileReader API
- DOMParser API
- localStorage API

## Troubleshooting

### Encoding Issues

If bank names display as "��� ��������":

1. Clear localStorage using the "Clear Storage" button
2. Re-upload the XML file
3. Check browser console for encoding conversion logs

### File Upload Fails

- Ensure the file is a valid ED807 XML format
- Check file size (very large files may take time to process)
- Verify file encoding is Windows-1251

### No Banks Found

- Verify the XML file contains `<BICDirectoryEntry>` elements
- Check that banks have required fields: BIC, name, correspondent account
- Review browser console for parsing errors

## Data Sources

- **Central Bank of Russia**: https://www.cbr.ru/vfs/mcirabis/BIK/
- **Official BIK Directory**: Contains latest ED807 XML files
- **Update Frequency**: Files are typically updated daily

## License

This project is private and proprietary.

## Development

Original project design: https://www.figma.com/design/e0rC4yajEUNml5PQu6EcKk/Offline-Bank-List-App
