import { BankData } from '../App';

/**
 * Parses ED807 XML format from Central Bank of Russia
 * and converts it to BankData array
 */
export function parseED807XML(xmlContent: string): BankData[] {
  const parser = new DOMParser();
  let doc: Document;
  
  try {
    // Parse XML content
    doc = parser.parseFromString(xmlContent, 'text/xml');
    
    // Check for parsing errors
    const parserError = doc.querySelector('parsererror');
    if (parserError) {
      throw new Error('Failed to parse XML: ' + parserError.textContent);
    }
  } catch (error) {
    throw new Error(`XML parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Get namespace-aware elements
  const namespace = 'urn:cbr-ru:ed:v2.0';
  const entries = doc.getElementsByTagNameNS(namespace, 'BICDirectoryEntry');
  
  if (entries.length === 0) {
    // Try without namespace as fallback
    const entriesNoNS = doc.getElementsByTagName('BICDirectoryEntry');
    if (entriesNoNS.length === 0) {
      throw new Error('No BICDirectoryEntry elements found in XML');
    }
    return parseEntries(entriesNoNS);
  }
  
  return parseEntries(entries);
}

function parseEntries(entries: HTMLCollectionOf<Element>): BankData[] {
  const banks: BankData[] = [];
  let skippedCount = 0;
  
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    
    try {
      const bank = parseBankEntry(entry);
      if (bank) {
        banks.push(bank);
      } else {
        skippedCount++;
      }
    } catch (error) {
      // Skip invalid entries but continue processing
      skippedCount++;
      console.warn(`Skipping invalid bank entry at index ${i}:`, error);
    }
  }
  
  if (skippedCount > 0) {
    console.info(`Parsed ${banks.length} valid banks, skipped ${skippedCount} invalid entries`);
  }
  
  return banks;
}

function parseBankEntry(entry: Element): BankData | null {
  try {
    // Get BIC from attribute
    const bic = entry.getAttribute('BIC');
    if (!bic || bic.length !== 9 || !/^\d{9}$/.test(bic)) {
      return null; // Invalid BIC - must be exactly 9 digits
    }

    // Get ParticipantInfo element (try with namespace first, then without)
    let participantInfo: Element | null = null;
    try {
      participantInfo = entry.getElementsByTagNameNS('urn:cbr-ru:ed:v2.0', 'ParticipantInfo')[0] || null;
    } catch (e) {
      // Namespace lookup failed, try without namespace
    }
    
    if (!participantInfo) {
      participantInfo = entry.getElementsByTagName('ParticipantInfo')[0] || null;
    }
    
    if (!participantInfo) {
      return null; // Missing participant info
    }

    // Extract participant info attributes
    const name = participantInfo.getAttribute('NameP') || '';
    const zip = participantInfo.getAttribute('Ind') || '';
    const city = participantInfo.getAttribute('Nnp') || '';
    const address = participantInfo.getAttribute('Adr') || '';
    const registrationNumber = participantInfo.getAttribute('RegN') || undefined;

    // Validate required fields
    if (!name || name.trim() === '') {
      return null; // Name is required
    }

    // Get SWIFT code from SWBICS element
    let swift: string | undefined;
    let swbics: Element | null = null;
    
    try {
      swbics = entry.getElementsByTagNameNS('urn:cbr-ru:ed:v2.0', 'SWBICS')[0] || null;
    } catch (e) {
      // Namespace lookup failed
    }
    
    if (!swbics) {
      swbics = entry.getElementsByTagName('SWBICS')[0] || null;
    }
    
    if (swbics) {
      const swbic = swbics.getAttribute('SWBIC');
      if (swbic && swbic.trim()) {
        swift = swbic.trim();
      }
    }

    // Get correspondent account from Accounts element
    // Look for CRSA (Correspondent Account) type account
    let correspondentAccount = '';
    let accounts: HTMLCollectionOf<Element>;
    
    try {
      accounts = entry.getElementsByTagNameNS('urn:cbr-ru:ed:v2.0', 'Accounts');
      if (accounts.length === 0) {
        accounts = entry.getElementsByTagName('Accounts');
      }
    } catch (e) {
      accounts = entry.getElementsByTagName('Accounts');
    }
    
    for (let j = 0; j < accounts.length; j++) {
      const account = accounts[j];
      const accountType = account.getAttribute('RegulationAccountType');
      const accountNumber = account.getAttribute('Account');
      
      // Prefer CRSA (Correspondent Account) type
      if (accountType === 'CRSA' && accountNumber && accountNumber.trim()) {
        correspondentAccount = accountNumber.trim();
        break;
      }
      
      // Fallback to first account if no CRSA found
      if (!correspondentAccount && accountNumber && accountNumber.trim()) {
        correspondentAccount = accountNumber.trim();
      }
    }

    // Correspondent account is required
    if (!correspondentAccount || correspondentAccount.trim() === '') {
      return null;
    }

    return {
      bic,
      name: name.trim(),
      correspondentAccount: correspondentAccount.trim(),
      city: city.trim() || 'N/A',
      address: address.trim() || 'N/A',
      zip: zip.trim() || 'N/A',
      swift,
      registrationNumber,
    };
  } catch (error) {
    // Log error but don't throw - just skip this entry
    console.warn('Error parsing bank entry:', error);
    return null;
  }
}

