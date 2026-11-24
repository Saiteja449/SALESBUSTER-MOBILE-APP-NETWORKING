/**
 * Real-Time Voice Entity Extractor
 * Parses live real-time speech transcripts into structured lead details:
 * - Phone numbers (literal digits, contiguous spoken numbers, Indian Hindi & Telugu spoken digits, chunked numbers)
 * - Attendee Name (English, Hindi, and Telugu self-introduction and correction patterns)
 * - Company / Organization (strict cue-based patterns, never bare 'with' or 'from my team')
 * - Designation / Job Title
 * Includes strict Anti-Self shields for host sales rep and host organization.
 * Last valid candidates win so later corrections are honored.
 */

// Spoken number word dictionary covering English, Hindi, and Telugu
const NUMBER_WORDS = {
  // English
  zero: '0',
  oh: '0',
  one: '1',
  two: '2',
  three: '3',
  four: '4',
  five: '5',
  six: '6',
  seven: '7',
  eight: '8',
  nine: '9',
  // Hindi
  shunya: '0',
  ek: '1',
  do: '2',
  teen: '3',
  char: '4',
  chaar: '4',
  paanch: '5',
  panch: '5',
  chhah: '6',
  che: '6',
  chhe: '6',
  saat: '7',
  aath: '8',
  nau: '9',
  // Telugu
  sunna: '0',
  okati: '1',
  vokati: '1',
  rendu: '2',
  moodu: '3',
  naalugu: '4',
  nalugu: '4',
  aidu: '5',
  aayidu: '5',
  ayidu: '5',
  aaru: '6',
  yedu: '7',
  eedu: '7',
  enimidi: '8',
  tommidi: '9',
};

/**
 * Comprehensive Geographic Locations Dictionary (Indian Major Cities, States & Global Regions)
 * Crucial guardrail to prevent locations from being misidentified as Company Names or Personal Names
 * (e.g. "I am Rahul from Mumbai", "coming from Bangalore", "based in Delhi").
 */
export const GEOGRAPHIC_LOCATIONS = new Set([
  // Major Indian Cities & Tech Hubs
  'delhi', 'new delhi', 'mumbai', 'bombay', 'bangalore', 'bengaluru', 'hyderabad', 'secunderabad',
  'chennai', 'madras', 'kolkata', 'calcutta', 'pune', 'ahmedabad', 'surat', 'jaipur', 'lucknow',
  'kanpur', 'nagpur', 'indore', 'thane', 'bhopal', 'visakhapatnam', 'vizag', 'pimpri', 'chinchwad',
  'patna', 'vadodara', 'baroda', 'ghaziabad', 'ludhiana', 'agra', 'nashik', 'faridabad', 'meerut',
  'rajkot', 'kalyan', 'dombivli', 'vasai', 'virar', 'varanasi', 'srinagar', 'aurangabad',
  'chhatrapati sambhaji nagar', 'dhanbad', 'amritsar', 'navi mumbai', 'allahabad', 'prayagraj',
  'ranchi', 'howrah', 'coimbatore', 'jabalpur', 'gwalior', 'vijayawada', 'jodhpur', 'madurai',
  'raipur', 'kota', 'chandigarh', 'guwahati', 'solapur', 'hubli', 'dharwad', 'mysore', 'mysuru',
  'tiruchirappalli', 'trichy', 'bareilly', 'aligarh', 'tiruppur', 'gurgaon', 'gurugram',
  'moradabad', 'jalandhar', 'bhubaneswar', 'salem', 'warangal', 'jalgaon', 'guntur', 'bikaner',
  'noida', 'greater noida', 'firozabad', 'cuttack', 'bhavnagar', 'dehradun', 'durgapur', 'asansol',
  'nanded', 'kolhapur', 'ajmer', 'gulbarga', 'kalaburagi', 'jamnagar', 'ujjain', 'loni', 'siliguri',
  'jhansi', 'ulhasnagar', 'nellore', 'jammu', 'sangli', 'belgaum', 'belagavi', 'mangalore', 'mangaluru',
  'ambattur', 'tirunelveli', 'malegaon', 'gaya', 'jalna', 'udaipur', 'maheshtala', 'tirupati',
  'karnal', 'panipat', 'rohtak', 'sonipat', 'mathura', 'shimla', 'haridwar', 'rishikesh', 'goa',
  'panaji', 'mohali', 'panchkula', 'secunderabad', 'hitec city', 'whitefield', 'electronic city',
  // Indian States & Territories
  'kerala', 'tamil nadu', 'andhra pradesh', 'telangana', 'karnataka', 'maharashtra', 'gujarat',
  'rajasthan', 'punjab', 'haryana', 'uttar pradesh', 'madhya pradesh', 'west bengal', 'bihar',
  'odisha', 'orissa', 'assam', 'uttarakhand', 'himachal pradesh', 'jharkhand', 'chhattisgarh',
  // Global Cities, Countries & Regions
  'india', 'dubai', 'uae', 'singapore', 'london', 'uk', 'usa', 'united states', 'canada',
  'australia', 'germany', 'france', 'america', 'europe', 'asia'
]);

/**
 * Phonetic typo corrections for speech recognition of Indian & common names
 */
export const NAME_SPELLING_CORRECTIONS = {
  shrma: 'Sharma',
  sharmaa: 'Sharma',
  sursh: 'Suresh',
  sures: 'Suresh',
  sooresh: 'Suresh',
  ramesh: 'Ramesh',
  rames: 'Ramesh',
  rajesh: 'Rajesh',
  rajes: 'Rajesh',
  priya: 'Priya',
  priyaa: 'Priya',
  venkt: 'Venkat',
  venktesh: 'Venkatesh',
  venkatesh: 'Venkatesh',
  reddi: 'Reddy',
  patil: 'Patil',
  gupt: 'Gupta',
  kumr: 'Kumar',
  vrma: 'Verma',
  vrmaa: 'Verma',
  choudary: 'Choudhary',
  chowdary: 'Choudhary',
  choudhary: 'Choudhary',
  karthik: 'Karthik',
  kartik: 'Karthik',
  abhisek: 'Abhishek',
  abhishek: 'Abhishek',
  deepk: 'Deepak',
  dinas: 'Dinesh',
  dinesh: 'Dinesh',
  mukes: 'Mukesh',
  mukesh: 'Mukesh',
  vikram: 'Vikram',
  adity: 'Aditya',
  aditya: 'Aditya',
  pradeeep: 'Pradeep',
  pradeep: 'Pradeep',
  santhosh: 'Santosh',
  santosh: 'Santosh',
  nares: 'Naresh',
  naresh: 'Naresh',
  ganes: 'Ganesh',
  ganesh: 'Ganesh',
  haris: 'Harish',
  harish: 'Harish',
  mahes: 'Mahesh',
  mahesh: 'Mahesh',
  sunil: 'Sunil',
  anil: 'Anil',
  rohit: 'Rohit',
  sachin: 'Sachin',
  ajay: 'Ajay',
  nitin: 'Nitin',
  pankaj: 'Pankaj',
  ashok: 'Ashok',
  pooja: 'Pooja',
  neha: 'Neha',
  swati: 'Swati',
  divya: 'Divya',
  anjali: 'Anjali',
  sneha: 'Sneha',
  manoj: 'Manoj',
  sanjay: 'Sanjay',
};

/**
 * Company proper noun & canonical brand spelling corrections
 */
export const COMPANY_SPELLING_CORRECTIONS = {
  'info cis': 'Infosys',
  infosis: 'Infosys',
  infosys: 'Infosys',
  cognizant: 'Cognizant',
  cognizant: 'Cognizant',
  tcs: 'TCS',
  't.c.s.': 'TCS',
  wipro: 'Wipro',
  'tech mahindra': 'Tech Mahindra',
  'tech mahendra': 'Tech Mahindra',
  hcl: 'HCL',
  accenture: 'Accenture',
  reliance: 'Reliance',
  'tata motors': 'Tata Motors',
  tata: 'Tata',
  'ace web academy': 'Ace Web Academy',
  'ace web academi': 'Ace Web Academy',
  'aceweb academy': 'Ace Web Academy',
  bajaj: 'Bajaj',
  mahindra: 'Mahindra',
  godrej: 'Godrej',
  adani: 'Adani',
  airtel: 'Airtel',
  jio: 'Jio',
  hdfc: 'HDFC',
  icici: 'ICICI',
  sbi: 'SBI',
};

/**
 * Designation & professional title spelling corrections
 */
export const DESIGNATION_CORRECTIONS = {
  manger: 'Manager',
  managr: 'Manager',
  directer: 'Director',
  dirctor: 'Director',
  foundr: 'Founder',
  enginr: 'Engineer',
  enginear: 'Engineer',
  devloper: 'Developer',
  develepor: 'Developer',
  archtect: 'Architect',
  architech: 'Architect',
  executiv: 'Executive',
  coordnator: 'Coordinator',
  superviser: 'Supervisor',
  ownr: 'Owner',
  propritor: 'Proprietor',
  proprietor: 'Proprietor',
  consultent: 'Consultant',
  conslutant: 'Consultant',
  spcialist: 'Specialist',
  adminstrator: 'Administrator',
  technition: 'Technician',
  ceo: 'CEO',
  cto: 'CTO',
  coo: 'COO',
  cfo: 'CFO',
  cmo: 'CMO',
  cro: 'CRO',
  cio: 'CIO',
  cpo: 'CPO',
  cso: 'CSO',
  vp: 'VP',
  hr: 'HR',
  gm: 'GM',
  md: 'Managing Director',
};

/**
 * Redacts phone numbers for diagnostic logging to avoid exposing sensitive PII.
 */
export function redactPhone(phone = '') {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length < 4) return '***';
  return `${digits.slice(0, 2)}****${digits.slice(-4)}`;
}

/**
 * Normalizes spoken number words (e.g. "nine eight four eight", "double nine", "triple five", "do teen")
 * into continuous digit strings.
 */
export function normalizeSpokenNumbers(text = '') {
  if (!text) return '';

  let normalized = text.toLowerCase();

  // Handle "double <digit>" and "triple <digit>"
  const digitWords = Object.keys(NUMBER_WORDS).join('|');
  const doubleRegex = new RegExp(`\\b(?:double|dubble)\\s+(${digitWords})\\b`, 'gi');
  normalized = normalized.replace(doubleRegex, (_, digit) => `${digit} ${digit}`);

  const tripleRegex = new RegExp(`\\b(?:triple)\\s+(${digitWords})\\b`, 'gi');
  normalized = normalized.replace(tripleRegex, (_, digit) => `${digit} ${digit} ${digit}`);

  // Convert individual number words to digits
  const wordRegex = new RegExp(`\\b(${digitWords})\\b`, 'gi');
  normalized = normalized.replace(wordRegex, (match) => NUMBER_WORDS[match.toLowerCase()] || match);

  return normalized;
}

/**
 * Extracts a valid 10-digit Indian phone number from text containing digits or spoken words.
 * Supports continuous digits as well as numbers spoken in chunks (e.g. "98765 43210", "987 654 3210").
 * Excludes years, OTPs, or meeting timestamps.
 * When multiple numbers are spoken (e.g. attendee corrects number), the LAST valid candidate wins.
 */
export function extractPhoneNumber(text = '', repPhone = '') {
  if (!text) return '';

  const normalized = normalizeSpokenNumbers(text);
  const cleanRepPhone = String(repPhone || '').replace(/\D/g, '').slice(-10);

  // 1. Look for contiguous digit runs, allowing optional hyphens/spaces between digits
  const candidateMatches = normalized.match(/(?:\+?91[\s-]?)?[0]?[6-9](?:[\s-]?\d){9}\b/g) || [];
  const validCandidates = [];

  for (const match of candidateMatches) {
    let digits = match.replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('0')) {
      digits = digits.slice(1);
    } else if (digits.length === 12 && digits.startsWith('91')) {
      digits = digits.slice(2);
    }
    if (digits.length === 10 && /^[6-9]\d{9}$/.test(digits)) {
      if (cleanRepPhone && digits === cleanRepPhone) {
        continue; // Anti-self shield
      }
      validCandidates.push(digits);
    }
  }

  if (validCandidates.length > 0) {
    return validCandidates[validCandidates.length - 1];
  }

  // 2. Fallback: Support chunked phone numbers (e.g. "98765... 43210" or "98480, 12345" separated by punctuation/words)
  const digitClusters = normalized.match(/\b\d{2,10}\b/g) || [];
  for (let i = 0; i < digitClusters.length; i++) {
    let combined = '';
    for (let j = i; j < digitClusters.length; j++) {
      combined += digitClusters[j];
      if (combined.length === 10) {
        if (/^[6-9]\d{9}$/.test(combined) && combined !== cleanRepPhone) {
          validCandidates.push(combined);
        }
        break;
      } else if (combined.length === 11 && combined.startsWith('0')) {
        const c10 = combined.slice(1);
        if (/^[6-9]\d{9}$/.test(c10) && c10 !== cleanRepPhone) {
          validCandidates.push(c10);
        }
        break;
      } else if (combined.length === 12 && combined.startsWith('91')) {
        const c10 = combined.slice(2);
        if (/^[6-9]\d{9}$/.test(c10) && c10 !== cleanRepPhone) {
          validCandidates.push(c10);
        }
        break;
      } else if (combined.length > 12) {
        break;
      }
    }
  }

  if (validCandidates.length > 0) {
    return validCandidates[validCandidates.length - 1];
  }

  // 3. Fallback: Support partial phone numbers (at least 6 digits and up to 9 digits)
  // Check for digits near phone keyword cues first
  const keywordMatch = normalized.match(
    /(?:phone|mobile|number|num|contact|call|whatsapp|ph|no)[^\d]{0,20}(?:\+?91[\s-]?)?[0]?(\d[\d\s-]{4,12}\d)/i,
  );
  if (keywordMatch) {
    const rawPartial = (keywordMatch[1] || '').replace(/\D/g, '');
    let clean = rawPartial;
    if (clean.length === 12 && clean.startsWith('91')) clean = clean.slice(2);
    else if (clean.length === 11 && clean.startsWith('0')) clean = clean.slice(1);
    if (clean.length >= 6 && clean !== cleanRepPhone) {
      return clean.length > 10 ? clean.slice(-10) : clean;
    }
  }

  // Check standalone chunked or contiguous digit clusters combining to >= 6 and < 10 digits
  for (let i = 0; i < digitClusters.length; i++) {
    let combined = '';
    for (let j = i; j < digitClusters.length; j++) {
      combined += digitClusters[j];
      if (combined.length >= 6 && combined.length < 10 && combined !== cleanRepPhone) {
        validCandidates.push(combined);
      } else if (combined.length >= 10) {
        break;
      }
    }
  }

  // Also check contiguous partial matches (e.g. 6 to 9 digits)
  const partialRuns = normalized.match(/\b\d{6,9}\b/g) || [];
  for (const run of partialRuns) {
    if (run !== cleanRepPhone) {
      validCandidates.push(run);
    }
  }

  return validCandidates[validCandidates.length - 1] || '';
}

/**
 * Corporate Brands and Entity Keywords Dictionary
 * Strictly guards against company names ever leaking into the person name field.
 */
export const CORPORATE_BRANDS = new Set([
  'infosys', 'tcs', 'wipro', 'cognizant', 'accenture', 'hcl', 'reliance', 'tata',
  'bajaj', 'mahindra', 'godrej', 'adani', 'airtel', 'jio', 'hdfc',
  'icici', 'sbi', 'google', 'microsoft', 'amazon', 'apple', 'meta', 'netflix',
  'uber', 'ola', 'zomato', 'swiggy', 'paytm', 'flipkart', 'deloitte', 'ey',
  'kpmg', 'pwc', 'capgemini', 'oracle', 'sap', 'cisco', 'intel', 'ibm', 'samsung',
  'sony', 'lg', 'hyundai', 'maruti', 'suzuki', 'toyota', 'honda', 'hero', 'itc',
  'l&t', 'larsen', 'toubro', 'apex', 'vertex', 'zenith', 'acme', 'birla', 'vedanta',
  'apollo', 'fortis', 'bosch', 'siemens', 'dell', 'hp', 'lenovo', 'asus', 'salesforce',
  'zoho', 'freshworks', 'zepto', 'blinkit', 'phonepe', 'cred', 'razorpay', 'zerodha',
  'groww', 'nykaa', 'meesho', 'oyo', 'redbus', 'rapido', 'lenskart', 'boat', 'titan',
  'voltas', 'trent', 'vistara', 'indigo', 'spicejet', 'ace web academy'
]);

export const COMPANY_KEYWORD_REGEX = /\b(?:pvt|ltd|limited|private|llp|inc|incorporated|corp|corporation|technologies|technology|tech|solutions|enterprises|enterprise|industries|industry|services|service|consulting|consultancy|group|agency|logistics|infotech|software|softwares|holdings|automobiles|motors|textiles|pharmaceuticals|pharma|labs|systems|traders|trading|ventures|international|global|media|studio|works|builders|developers|associates|finance|capital|power|energy|steel|digital|retail|infra|infrastructure|hospital|hospitals|healthcare|diagnostics|hotels|resorts|realty|properties|foods|beverages|chem|chemicals|automotive|communications|telecom|broadband|network|networks|biotech|creatives|design|marketing|academy)\b/i;

/**
 * Checks if a string represents an organization, business, or company brand rather than an individual person's name.
 */
export function isLikelyCompanyName(val = '') {
  if (!val || typeof val !== 'string') return false;
  const clean = val.trim().toLowerCase();
  if (clean.length < 2) return false;

  // 1. Exact match in corporate brands
  if (CORPORATE_BRANDS.has(clean)) return true;

  // 2. Contains any company keyword regex (ltd, pvt, tech, solutions, etc.)
  if (COMPANY_KEYWORD_REGEX.test(clean)) return true;

  // 3. Multi-word check: if any word token is a known corporate brand (e.g. "Tata Motors", "Reliance Retail", "Google Cloud", "Adani Power")
  const tokens = clean.split(/[\s&,-]+/).filter(Boolean);
  for (const token of tokens) {
    if (CORPORATE_BRANDS.has(token)) return true;
    if (COMPANY_KEYWORD_REGEX.test(token)) return true;
  }

  return false;
}

/**
 * Conversational, filler, and domain words that must NEVER be extracted as a person's name.
 */
export const INVALID_NAME_WORDS = new Set([
  // Verbs & conversational state
  'interested', 'looking', 'planning', 'here', 'there', 'visiting', 'calling', 'speaking',
  'buying', 'searching', 'trying', 'wanting', 'checking', 'wondering', 'glad', 'happy',
  'good', 'fine', 'very', 'so', 'also', 'attending', 'coming', 'having', 'running',
  'managing', 'handling', 'heading', 'leading', 'working', 'going', 'discussing', 'asking',
  'talking', 'meeting', 'exploring', 'representing', 'based', 'located', 'new', 'ready',
  'sorry', 'actually', 'just', 'now', 'back', 'around', 'sure', 'waiting', 'wishing',
  'thinking', 'seeing', 'sending', 'giving', 'doing', 'saying', 'sharing', 'taking',
  'using', 'needing', 'making', 'finding', 'offering', 'providing', 'inquiring', 'enquired',
  'enquiring', 'pleased', 'excited', 'available', 'free', 'unable', 'not', 'from', 'with',
  'about', 'into', 'over', 'under', 'only', 'really', 'already', 'still', 'always',
  // Domain, event, and business terms
  'lead', 'contact', 'customer', 'client', 'visitor', 'guest', 'participant', 'attendee',
  'user', 'buyer', 'seller', 'dealer', 'vendor', 'distributor', 'supplier', 'retailer',
  'company', 'firm', 'business', 'store', 'shop', 'brand', 'office', 'agency', 'organization',
  'team', 'staff', 'booth', 'stall', 'event', 'product', 'service', 'software', 'app',
  'solution', 'price', 'pricing', 'discount', 'cost', 'quotation', 'brochure', 'catalog',
  'details', 'info', 'information', 'enquiry', 'query', 'question', 'feedback', 'message',
  'card', 'visiting', 'note', 'notes', 'summary', 'phone', 'mobile', 'number', 'call',
  'whatsapp', 'email', 'website', 'online', 'demo', 'presentation', 'quotation', 'brochures',
  // Stop words & particles
  'the', 'a', 'an', 'and', 'or', 'for', 'at', 'in', 'of', 'on', 'to', 'as', 'by', 'is', 'am',
  'hai', 'peru', 'ni', 'andi', 'garu', 'sir', 'madam',
]);

const NON_PERSON_NAME_TERMS = new Set([
  ...INVALID_NAME_WORDS,
  'ceo', 'cto', 'coo', 'cfo', 'cmo', 'cro', 'cio', 'cpo', 'cso', 'vp', 'director',
  'manager', 'owner', 'founder', 'partner', 'proprietor', 'consultant', 'head', 'lead',
  'engineer', 'developer', 'architect', 'designer', 'analyst', 'specialist', 'executive',
  'officer', 'representative', 'associate', 'coordinator', 'administrator', 'assistant',
  'intern', 'trainee', 'president', 'supervisor', 'doctor', 'advocate', 'lawyer', 'employee',
  'staff', 'sales', 'marketing', 'operations', 'procurement', 'purchase', 'finance', 'legal',
]);

/** Accepts short person-shaped values; callers should also require explicit name context. */
export function isStrictPersonNameCandidate(value = '', context = {}) {
  if (typeof value !== 'string') return false;
  const candidate = value.trim().replace(/^(?:mr\.?|mrs\.?|ms\.?|miss|dr\.?|shri)\s+/i, '');
  if (!candidate || candidate.length < 2 || candidate.length > 70) return false;
  if (/[,;.!?\n]|\b(?:because|interested|looking|planning|discussing|needs|need|want|wants|from|with|working|based|located)\b/i.test(candidate)) return false;
  const tokens = candidate.split(/\s+/);
  if (tokens.length > 4 || tokens.some((token) => !/^[A-Za-z][A-Za-z'’-]{0,24}\.?$/.test(token))) return false;
  if (tokens.some((token) => {
    const word = token.toLowerCase().replace(/\.$/, '');
    return NON_PERSON_NAME_TERMS.has(word) || GEOGRAPHIC_LOCATIONS.has(word);
  })) return false;
  if (isLikelyCompanyName(candidate)) return false;
  const repName = String(context.user?.name || '').trim().toLowerCase();
  if (repName && (candidate.toLowerCase() === repName || candidate.toLowerCase().includes(repName))) return false;
  const repPhone = String(context.user?.phone || '').replace(/\D/g, '').slice(-10);
  if (repPhone && candidate.replace(/\D/g, '') === repPhone) return false;
  return true;
}

/**
 * Extracts attendee name from self-introduction or correction patterns.
 * Supports English, Hindi ("mera naam ... hai"), and Telugu ("naa peru ...", "nenu ... ni").
 * When multiple candidates appear (e.g. "I am Ramesh, sorry, Suresh"), the LAST valid candidate wins.
 * Strictly prevents conversational phrases, designations, locations, or companies from slipping into Name.
 */
export function extractName(text = '', repName = '') {
  if (!text) return '';

  const repNameLower = String(repName || '').toLowerCase().trim();

  // Common boundary and stop words
 const stopWords = new Set([
  'from', 'at', 'with', 'and', 'working', 'representing', 'company', 'my', 'our',
  'call', 'phone', 'mobile', 'here', 'speaking', 'calling', 'interested', 'looking',
  'the', 'a', 'an', 'as', 'sorry', 'actually', 'correction', 'hai', 'peru', 'ni', 'andi', 'garu', 'sir', 'madam',
  'ceo', 'cto', 'coo', 'cfo', 'vp', 'director', 'manager', 'owner', 'founder', 'partner',
  'consultant', 'head', 'lead', 'engineer', 'doctor', 'dr', 'mr', 'mrs', 'ms', 'miss',
  'of', 'for', 'in', 'based', 'located', 'joining', 'representative',
  // greetings, honorifics, fillers (new)
  'hi', 'hii', 'hello', 'hey', 'helo', 'namaste', 'namaskar', 'namaskaram', 'vanakkam',
  'good', 'morning', 'afternoon', 'evening', 'bhai', 'bhaiya', 'anna', 'annayya', 'akka',
  'ji', 'bro', 'boss', 'mam', 'speaking', 'thanks', 'thank', 'regards', 'cheers', 'it',
  'shri', 'sri', 'smt', 'er', 'pere', 'main', 'mai', 'mein', 'hum', 'hoon', 'hu'
]);

const companyIndicators = new Set([
  'company', 'firm', 'business', 'corp', 'corporation', 'inc', 'incorporated',
  'ltd', 'limited', 'pvt', 'private', 'technologies', 'technology', 'tech',
  'solutions', 'enterprises', 'enterprise', 'industries', 'industry', 'services',
  'consulting', 'group', 'agency', 'logistics', 'infotech', 'software', 'holdings',
  'automobiles', 'motors', 'textiles', 'pharmaceuticals', 'pharma', 'labs'
]);

const designationWords = new Set([
  'ceo', 'cto', 'coo', 'cfo', 'cmo', 'cro', 'cio', 'cpo', 'cso', 'vp',
  'director', 'manager', 'owner', 'founder', 'co-founder', 'partner', 'proprietor',
  'consultant', 'head', 'lead', 'engineer', 'developer', 'architect', 'designer',
  'analyst', 'specialist', 'executive', 'officer', 'representative', 'associate',
  'coordinator', 'administrator', 'admin', 'assistant', 'intern', 'trainee',
  'marketer', 'salesperson', 'coder', 'programmer', 'technician', 'accountant',
  'advisor', 'expert', 'president', 'supervisor', 'operator', 'instructor', 'trainer',
  'doctor', 'advocate', 'lawyer', 'staff', 'employee', 'worker', 'senior', 'junior',
  'software', 'hardware', 'frontend', 'backend', 'fullstack', 'devops', 'qa', 'tester',
  'sales', 'marketing', 'hr', 'operations', 'procurement', 'purchase', 'finance', 'legal',
  'role', 'designation', 'position', 'title', 'job'
]);

const introRegexes = [
  // ===== ORIGINAL PATTERNS (keep first so explicit intros win) =====

  // Standard intro: "my name is Rahul Sharma", "myself Rahul"
  /(?<!\b(?:company|firm|business|organization|org|brand|store|lead\s+company|client\s+company|role|designation|position|title)\s+)\b(?:my\s+name\s+is|myself)\s+([A-Za-z]+(?:\s+[A-Za-z]+){0,2})(?=[,.]|\s+(?:from|at|with|and|as|working|representing|company|role|my|our|call|phone|mobile|good|nice|pleasure|here|there|\.|$)|$)/gi,
  // "name is Rahul"
  /(?<!\b(?:company|firm|business|organization|org|brand|store|role|designation|position|title)\s+)\bname\s+is\s+([A-Za-z]+(?:\s+[A-Za-z]+){0,2})(?=[,.]|\s+(?:from|at|with|and|as|working|representing|company|role|my|our|call|phone|mobile|good|nice|pleasure|here|there|\.|$)|$)/gi,
  // "I am Rahul", "I'm Rahul", "this is Rahul" - strict negative lookahead to exclude conversational verbs, roles, locations
  /(?:i am|i'm|this is)\s+(?!(?:a|an|the|working|currently|not|just|in|at|interested|looking|planning|here|there|visiting|buying|calling|checking|searching|trying|wanting|wondering|glad|happy|fine|good|very|also|attending|coming|having|running|managing|handling|heading|leading|going|discussing|asking|talking|meeting|exploring|representing|based|located|new|ready|sorry|actually|now|sure|from|with)\b)([A-Za-z]+(?:\s+[A-Za-z]+){0,2})(?=[,.]|\s+(?:from|at|with|and|as|working|representing|company|role|my|our|call|phone|mobile|good|nice|pleasure|here|there|\.|$)|$)/gi,
  // "people call me Rahul Sharma", "call me Rahul"
  /(?:people\s+call\s+me|call\s+me|meet\s+my\s+colleague)\s+([A-Za-z]+(?:\s+[A-Za-z]+){0,2})(?=[,.]|\s+(?:from|at|with|and|as|working|representing|company|my|our|call|phone|mobile|good|nice|pleasure|here|there|\.|$)|$)/gi,
  // Dictation cues: "lead name Sunil", "customer name Rajesh"
  /(?:lead\s+name\s+is|lead\s+name|customer\s+name\s+is|customer\s+name|client\s+name\s+is|client\s+name|contact\s+name\s+is|contact\s+name)\s+([A-Za-z]+(?:\s+[A-Za-z]+){0,2})(?=[,.]|\s+(?:from|at|with|and|as|working|representing|company|my|our|call|phone|mobile|\.|$)|$)/gi,
  // Correction patterns: "sorry Suresh", "actually Suresh", "no Suresh"
  /(?:sorry|actually|correction|i mean|no)\s*[,]?\s*(?:i am|my name is|this is)?\s+([A-Za-z]+(?:\s+[A-Za-z]+){0,2})(?=[,.]|\s+(?:from|at|with|and|as|working|representing|company|my|our|call|phone|mobile|\.|$)|$)/gi,
  // Hindi patterns: "mera naam Rahul hai", "mera naam Rahul"
  /(?:mera naam|naam hai)\s+([A-Za-z]+(?:\s+[A-Za-z]+){0,2})(?:\s+hai)?(?=[,.]|\s+(?:from|aur|and|working|company|\.|$)|$)/gi,
  // Telugu patterns: "naa peru Ramesh", "nenu Ramesh ni"
  /(?:naa peru|na peru)\s+([A-Za-z]+(?:\s+[A-Za-z]+){0,2})(?=[,.]|\s+(?:from|mariyu|and|working|company|\.|$)|$)/gi,
  /(?:nenu)\s+([A-Za-z]+(?:\s+[A-Za-z]+){0,2})(?:\s*ni|\s+ni)?(?=[,.]|\s+(?:from|mariyu|and|working|company|\.|$)|$)/gi,

  // ===== NEW PATTERNS =====

  // Direct greeting + name: "hi rahul", "hello Rahul here", "good morning, Rahul garu"
  /\b(?:hi+|hello+|hey+|helo|namaste|namaskar|namaskaram|vanakkam|good\s+(?:morning|afternoon|evening))\s*[,!.]?\s+(?!(?:i|i'm|im|my|this|there|all|everyone|everybody|team|sir|madam|mam|ma'am|guys|friend|dear|how|what|who|can|could|please|is|are|am|the|a|an|good|thanks|thank|welcome|again|sorry|yes|no|ok|okay)\b)([A-Za-z]+(?:\s+[A-Za-z]+){0,2})(?=\s*[,.!?]|\s+(?:here|speaking|calling|from|at|with|and|this|is|how|garu|ji|sir|madam|mam|ma'am)\b|\s*$)/gi,

  // Name + speaking/here: "Rahul speaking", "Rahul here", "Rahul this side", "Rahul on the line"
  /\b([A-Za-z]+(?:\s+[A-Za-z]+)?)\s+(?:speaking|here|this\s+side|on\s+the\s+line|bol\s+raha\s+hu+|bol\s+rahi\s+hu+)\b/gi,

  // "it's Rahul", "it is Rahul"
  /\b(?:it'?s|it\s+is)\s+(?!(?:a|an|the|me|not|just|ok|okay|fine|good|time|about|going|really|so|my|our)\b)([A-Za-z]+(?:\s+[A-Za-z]+){0,2})(?=[,.!?]|\s+(?:from|at|with|and|here|speaking|calling)\b|\s*$)/gi,

  // Honorific before: "Mr. Rahul", "Dr Rahul Sharma", "Shri Rahul", "Smt Lakshmi"
  /\b(?:mr|mrs|ms|miss|dr|shri|sri|smt|er)\.?\s+([A-Za-z]+(?:\s+[A-Za-z]+){0,1})(?=[,.!?]|\s+(?:from|at|with|and|here|speaking|calling|garu|ji)\b|\s*$)/gi,

  // Honorific after: "Rahul garu", "Rahul ji", "Rahul bhai", "Rahul anna", "Rahul sir"
  /\b([A-Za-z]+(?:\s+[A-Za-z]+)?)\s+(?:garu|ji|bhai|bhaiya|anna|annayya|akka|sir|madam|mam|ma'am|bro|boss)\b/gi,

  // Other "call me" styles: "known as Rahul", "everyone calls me Rahul", "address me as Rahul"
  /(?:known\s+as|everyone\s+calls\s+me|they\s+call\s+me|you\s+can\s+call\s+me|address\s+me\s+as|call\s+me\s+as)\s+([A-Za-z]+(?:\s+[A-Za-z]+){0,2})(?=[,.!?]|\s+(?:from|at|with|and|as|working|company)\b|\s*$)/gi,

  // Sign-offs: "regards Rahul", "thanks, Rahul", "thank you Rahul"
  /(?:regards|warm\s+regards|best\s+regards|thanks|thank\s+you|cheers)\s*[,\-]?\s+([A-Za-z]+(?:\s+[A-Za-z]+){0,2})(?=[,.!?]|\s*$)/gi,

  // Hindi: "main Rahul hoon", "mai Rahul bol raha hu", "mujhe Rahul bolte hain"
  /(?:\bmain|\bmai|\bmein|\bhum|mujhe)\s+([A-Za-z]+(?:\s+[A-Za-z]+){0,1})\s+(?:hoon|hu+n?|hun|bol\s+raha|bol\s+rahi|bolte|kehte|kehte\s+hain|bulate)\b/gi,
  // Hindi: "naam Rahul hai"
  /\bnaam\s+([A-Za-z]+(?:\s+[A-Za-z]+){0,1})\s+hai\b/gi,

  // Telugu: "nannu Rahul antaru"
  /(?:nannu|nanu)\s+([A-Za-z]+(?:\s+[A-Za-z]+){0,1})\s+(?:antaru|antharu|pilustaru)\b/gi,
  // Telugu: "na pere Rahul"
  /\b(?:naa|na)\s+pere\s+([A-Za-z]+(?:\s+[A-Za-z]+){0,1})(?=[,.!?]|\s+(?:from|mariyu|and|working|company)\b|\s*$)/gi,

  // Dictation about the other party (capitalised names only):
  // "spoke to Rahul", "met Rahul", "meeting with Rahul", "follow up with Rahul"
  /(?:spoke\s+(?:to|with)|talked\s+(?:to|with)|talk\s+to|speak\s+(?:to|with)|met|called|meeting\s+with|follow(?:\s|-)?up\s+with|contact|connect\s+(?:me\s+)?(?:to|with)|ask\s+for|looking\s+for|is)\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,1})(?=[,.!?]|\s+(?:from|at|with|and|regarding|about|there|available)\b|\s*$)/g,
];

  const foundCandidates = [];

  for (const regex of introRegexes) {
    let match;
    while ((match = regex.exec(text)) !== null) {
      if (!match[1]) continue;

      const preText = text.slice(Math.max(0, match.index - 35), match.index).toLowerCase().trim();
      if (/\b(?:company|firm|business|organization|org|brand|store|lead\s+company|client\s+company|role|designation|position|title|job|working\s+as)$/i.test(preText)) {
        continue;
      }

      const rawTokens = match[1].trim().split(/\s+/);
      const tokens = [];
      for (const tok of rawTokens) {
        if (stopWords.has(tok.toLowerCase())) break;
        tokens.push(tok);
      }
      if (tokens.length === 0 || tokens.length > 3) continue;

      // Reject if any token is an invalid name word (conversational verbs, common nouns, fillers)
      if (tokens.some((t) => INVALID_NAME_WORDS.has(t.toLowerCase()))) {
        continue;
      }

      // Reject if any token is a company indicator
      if (tokens.some((t) => companyIndicators.has(t.toLowerCase()))) {
        continue;
      }

      // Reject if any token is a designation word
      if (tokens.some((t) => designationWords.has(t.toLowerCase()))) {
        continue;
      }

      // Reject if any token matches a geographic city/state name (cities are never personal names)
      if (tokens.some((t) => GEOGRAPHIC_LOCATIONS.has(t.toLowerCase()))) {
        continue;
      }

      // Ensure tokens are purely alphabetic and at least 2 chars (or 1 char initial)
      const isClean = tokens.every((t) => /^[A-Za-z]{2,25}$|^[A-Za-z]\.?$/.test(t));
      if (!isClean) continue;

      const candidate = tokens.join(' ');
      const candidateLower = candidate.toLowerCase();

      // STRICT COMPANY SHIELD: Reject if candidate is a corporate brand or contains company keywords
      if (isLikelyCompanyName(candidate)) {
        continue;
      }

      if (candidate.endsWith('...') || candidate.endsWith('..') || candidate.length < 2) {
        continue;
      }

      // Anti-self shield: Rep's own name
      if (repNameLower && repNameLower.length > 2 && (candidateLower === repNameLower || candidateLower.includes(repNameLower))) {
        continue;
      }

      // Title case formatting
      const formatted = tokens
        .map((w) => {
          const cleanW = w.replace(/\.$/, '');
          return cleanW.charAt(0).toUpperCase() + cleanW.slice(1).toLowerCase();
        })
        .join(' ');

      foundCandidates.push({ index: match.index, name: formatted });
    }
  }

  if (foundCandidates.length === 0) return '';

  foundCandidates.sort((a, b) => a.index - b.index);
  return foundCandidates[foundCandidates.length - 1].name;
}

/**
 * Extracts company or organization name.
 * Strictly requires explicit cues like "company is", "from <Capitalized phrase>", "working at".
 * Stops cleanly before designations or sentence endings.
 * When multiple candidates appear, the LAST valid candidate wins.
 */
export function extractCompanyName(text = '', orgName = '') {
  if (!text) return '';

  const orgNameLower = String(orgName || '').toLowerCase().trim();

  const ignoreWords = new Set([
    'here', 'there', 'us', 'today', 'now', 'yesterday', 'home', 'office',
    'my team', 'our team', 'the team', 'team', 'my staff', 'our staff', 'staff',
    'my partner', 'our partner', 'colleagues', 'my colleague', 'clients', 'talking',
    'lead', 'contact', 'customer', 'visitor', 'guest', 'meeting', 'booth', 'stall',
    'this', 'that', 'someone', 'anyone', 'people', 'good', 'nice', 'great', 'hello', 'hi',
    // Geographic names cannot be company names
    ...Array.from(GEOGRAPHIC_LOCATIONS),
  ]);

  const designationWords = new Set([
    'ceo', 'cto', 'coo', 'cfo', 'cmo', 'cro', 'cio', 'cpo', 'cso', 'vp',
    'director', 'manager', 'owner', 'founder', 'co-founder', 'partner', 'proprietor',
    'consultant', 'head', 'lead', 'engineer', 'developer', 'architect', 'designer',
    'analyst', 'specialist', 'executive', 'officer', 'representative', 'associate',
    'coordinator', 'administrator', 'admin', 'assistant', 'intern', 'trainee',
    'marketer', 'salesperson', 'coder', 'programmer', 'technician', 'accountant',
    'advisor', 'expert', 'president', 'supervisor', 'operator', 'instructor', 'trainer',
    'doctor', 'advocate', 'lawyer', 'staff', 'employee', 'worker', 'senior', 'junior',
    'software engineer', 'sales manager', 'project manager', 'product manager',
    'role', 'designation', 'position', 'title', 'job'
  ]);

  const companyPatterns = [
    // 1. Explicit declaration cues:
    /(?:(?:my|our|the)\s+)?(?:company\s+name\s+is|company\s+name|company\s+is|firm\s+name\s+is|firm\s+name|firm\s+is|business\s+name\s+is|business\s+name|business\s+is|organization\s+name\s+is|organization\s+is|org\s+name\s+is|store\s+name\s+is|store\s+is)\s*[:\-]?\s*([A-Za-z0-9&.\-\s]{2,45}?)(?=[.,!?:;]|\s+(?:and|as|we|i|i'm|my|our|you|he|she|who|which|phone|mobile|number|call|whatsapp|contact|email|role|designation|looking|interested|into|dealing|deals|makes|manufactures|provides|located|based|need|want|have)\b|$)/gi,

    // 2. Dictation cues: "lead company Infosys", "client company Infosys", "customer company Infosys"
    /(?:lead\s+company|client\s+company|customer\s+company|contact\s+company)\s*[:\-]?\s*([A-Za-z0-9&.\-\s]{2,45}?)(?=[.,!?:;]|\s+(?:and|as|we|i|i'm|my|our|phone|mobile|number|call|whatsapp|role|designation|looking|interested)\b|$)/gi,

    // 3. "company called [X]", "firm called [X]", "startup called [X]"
    /(?:company\s+called|firm\s+called|startup\s+called|brand\s+called|agency\s+called)\s*[:\-]?\s*([A-Za-z0-9&.\-\s]{2,45}?)(?=[.,!?:;]|\s+(?:and|as|we|i|i'm|my|our|phone|mobile|number|call|whatsapp|role|designation|looking|interested)\b|$)/gi,

    // 4. Role at company: "working at [X]", "working in [X]", "working with [X]", "representing [X]", "founder of [X]"
    /(?:working\s+(?:at|in|with)|representing|founder\s+of|co-founder\s+of|director\s+of|owner\s+of|partner\s+at)\s+([A-Za-z0-9&.\-\s]{2,45}?)(?=[.,!?:;]|\s+(?:and|as|we|i|i'm|my|our|phone|mobile|number|call|whatsapp|email|role|designation|looking|interested)\b|$)/gi,

    // 5. "we are from [X]" / "i am from [X]" / "coming from [X]" / "calling from [X]"
    /(?:we\s+are\s+from|i\s+am\s+from|i'm\s+from|coming\s+from|calling\s+from)\s+([A-Za-z0-9&.\-\s]{2,45}?)(?=[.,!?:;]|\s+(?:and|as|we|i|i'm|my|our|phone|mobile|number|call|whatsapp|email|role|designation|looking|interested)\b|$)/gi,

    // 6. "from <Company>" (e.g. "Rahul from Tata Motors")
    /(?:\bfrom)\s+([A-Z][A-Za-z0-9&.\-\s]{1,45}?)(?=[.,!?:;]|\s+(?:and|as|we|i|i'm|my|our|phone|mobile|number|call|whatsapp|email|role|designation|looking|interested)\b|$)/gi,

    // 7. Hindi cues: "hamari company [X]", "meri company [X]", "company ka naam [X]"
    /(?:hamari\s+company|hamaari\s+company|meri\s+company|company\s+ka\s+naam)\s*[:\-]?\s*([A-Za-z0-9&.\-\s]{2,45}?)(?=[.,!?:;]|\s+(?:hai|aur|and|phone|mobile|call)|$)/gi,

    // 8. Telugu cues: "maa company [X]", "ma company [X]", "maa business [X]"
    /(?:maa\s+company|ma\s+company|maa\s+business|ma\s+business)\s*[:\-]?\s*([A-Za-z0-9&.\-\s]{2,45}?)(?=[.,!?:;]|\s+(?:andi|and|phone|mobile|call)|$)/gi,
  ];

  const foundCandidates = [];

  for (const pattern of companyPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (!match[1]) continue;
      let candidate = match[1].trim().replace(/^[:\-\s]+|[,.!?:;\s]+$/g, '');
      if (candidate.length < 2) continue;
      const candidateLower = candidate.toLowerCase();

      // Skip words in ignoreWords, generic placeholders, or geographic city/state/country names
      if (ignoreWords.has(candidateLower)) continue;
      if (GEOGRAPHIC_LOCATIONS.has(candidateLower)) continue;

      // Skip if candidate is a job title / designation
      if (designationWords.has(candidateLower)) continue;

      if (candidateLower.startsWith('my ') || candidateLower.startsWith('our ') || candidateLower.startsWith('the ')) {
        const afterPronoun = candidateLower.replace(/^(my|our|the)\s+/, '');
        if (ignoreWords.has(afterPronoun) || afterPronoun === 'team' || afterPronoun === 'staff') {
          continue;
        }
      }

      // If candidate starts with "from " (e.g. "from Mumbai"), verify remainder
      if (candidateLower.startsWith('from ')) {
        const remainder = candidateLower.replace(/^from\s+/, '').trim();
        if (ignoreWords.has(remainder) || GEOGRAPHIC_LOCATIONS.has(remainder)) {
          continue;
        }
      }

      // Anti-self shield: Host organization
      if (orgNameLower && orgNameLower.length > 2 && (candidateLower === orgNameLower || candidateLower.includes(orgNameLower))) {
        continue;
      }

      let formatted = candidate
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');

      // Canonicalize common company legal abbreviations and business suffixes
      formatted = formatted
        .replace(/\b(?:Pvt\s*Ltd|Private\s*Limited|P\s*Ltd)\b/gi, 'Pvt Ltd')
        .replace(/\b(?:Ltd|Limited)\b/gi, 'Ltd')
        .replace(/\b(?:Llp)\b/gi, 'LLP')
        .replace(/\b(?:Technologies|Tech)\b/gi, 'Technologies')
        .replace(/\b(?:Solutions)\b/gi, 'Solutions')
        .replace(/\b(?:Enterprises|Enterprise)\b/gi, 'Enterprises')
        .replace(/\b(?:Industries|Industry)\b/gi, 'Industries')
        .replace(/\b(?:Services|Service)\b/gi, 'Services')
        .replace(/\b(?:Infotech)\b/gi, 'Infotech')
        .replace(/\b(?:Consulting|Consultancy)\b/gi, 'Consulting');

      foundCandidates.push({ index: match.index, company: formatted });
    }
  }

  if (foundCandidates.length === 0) {
    // Fallback: Check for known corporate brands or explicit company keywords/suffixes in text
    for (const brand of CORPORATE_BRANDS) {
      const brandRegex = new RegExp(`\\b${brand}\\b`, 'i');
      const bMatch = brandRegex.exec(text);
      if (bMatch) {
        if (!orgNameLower || (!bMatch[0].toLowerCase().includes(orgNameLower) && !orgNameLower.includes(bMatch[0].toLowerCase()))) {
          return bMatch[0].charAt(0).toUpperCase() + bMatch[0].slice(1).toLowerCase();
        }
      }
    }

    const suffixRegex = /\b([A-Z][A-Za-z0-9&.\-]+\s+(?:Pvt\s*Ltd|Private\s*Limited|Ltd|Limited|LLP|Technologies|Solutions|Enterprises|Industries|Services|Infotech|Motors|Systems|Consulting|Digital|Retail|Energy|Steel|Power))\b/i;
    const sMatch = suffixRegex.exec(text);
    if (sMatch && sMatch[1]) {
      return sMatch[1].trim();
    }
    return '';
  }

  foundCandidates.sort((a, b) => a.index - b.index);
  return foundCandidates[foundCandidates.length - 1].company;
}

/**
 * Extracts designation or professional title.
 */
export function extractDesignation(text = '') {
  if (!text) return '';

  const explicitPattern =
    /(?:currently\s+working\s+as|working\s+as|working\s+here\s+as|my\s+designation\s+is|designation\s+is|my\s+role\s+is|role\s+is|my\s+position\s+is|position\s+is|my\s+title\s+is|title\s+is|i\s+handle|employed\s+as|serving\s+as|i\s+am\s+the|i'm\s+the|i\s+am\s+a|i'm\s+a)\s*[:\-]?\s*([A-Za-z\s]{2,35}?)(?=[.,!?:;]|\s+(?:and|at|with|in|for|from|phone|mobile|number|call|email)\b|$)/gi;
  let explicitMatch;
  let lastExplicit = null;
  while ((explicitMatch = explicitPattern.exec(text)) !== null) {
    if (explicitMatch[1]) {
      const title = explicitMatch[1].trim();
      const titleLower = title.toLowerCase();
      if (
        title.length >= 2 &&
        !/^(here|with|from|working|company|firm|our|the|lead|visitor|guest)$/i.test(title) &&
        !GEOGRAPHIC_LOCATIONS.has(titleLower)
      ) {
        lastExplicit = title
          .split(/\s+/)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' ')
          .replace(/\bCeo\b/g, "CEO")
          .replace(/\bCto\b/g, "CTO")
          .replace(/\bCoo\b/g, "COO")
          .replace(/\bCfo\b/g, "CFO")
          .replace(/\bVp\b/g, "VP");
      }
    }
  }
  if (lastExplicit) return lastExplicit;

  const designationPatterns = [
    /\b(managing director|managing partner|business development manager|purchase head|purchasing head|marketing head|sales head|general manager|project manager|product manager|sales manager|operations manager|hr manager|vice president|co-founder|director|founder|owner|partner|proprietor|ceo|cto|coo|cfo|cmo|cro|cio|cpo|cso|vp|manager|consultant|architect|lead|developer|software engineer|engineer|designer|analyst|specialist|executive|coordinator|administrator|supervisor|accountant|advocate|lawyer|doctor)\b/gi,
  ];

  const foundCandidates = [];

  for (const pattern of designationPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (match[1]) {
        const title = match[1].trim();
        const formatted = title
          .split(/\s+/)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' ')
          .replace(/\bCeo\b/g, "CEO")
          .replace(/\bCto\b/g, "CTO")
          .replace(/\bCoo\b/g, "COO")
          .replace(/\bCfo\b/g, "CFO")
          .replace(/\bVp\b/g, "VP");
        foundCandidates.push({ index: match.index, designation: formatted });
      }
    }
  }

  if (foundCandidates.length === 0) return '';
  foundCandidates.sort((a, b) => a.index - b.index);
  return foundCandidates[foundCandidates.length - 1].designation;
}

/**
 * Extracts city/location from speech transcript matching GEOGRAPHIC_LOCATIONS.
 */
export function extractCity(text = '') {
  if (!text || typeof text !== 'string') return '';
  const lower = text.toLowerCase();

  // 1. Try cue-based matches first ("from Mumbai", "in Delhi", "based in Pune", "city is Hyderabad")
  for (const loc of GEOGRAPHIC_LOCATIONS) {
    const cueRegex = new RegExp(`(?:from|in|at|based in|living in|city(?:\\s+is)?|location(?:\\s+is)?)\\s+${loc}\\b`, 'i');
    if (cueRegex.test(lower)) {
      return loc
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
    }
  }

  // 2. Fallback to direct word match
  for (const loc of GEOGRAPHIC_LOCATIONS) {
    const wordRegex = new RegExp(`\\b${loc}\\b`, 'i');
    if (wordRegex.test(lower)) {
      return loc
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
    }
  }

  return '';
}

/**
 * Extracts an in-depth conversation discussion summary from spoken speech.
 * Filters out greetings, pure introductions, or phone number recitations.
 * Produces meaningful discussion points without hallucinating from empty conversation.
 */
export function extractDiscussionSummary(text = '') {
  if (!text) return '';
  const cleanedText = String(text)
    .replace(/\b(?:hello|hi|good morning|good afternoon|good evening|hey|welcome|thanks|thank you|pleasure meeting you)\b[,!\s]*/gi, ' ')
    .replace(/(?:phone|mobile|number|call|whatsapp|contact)(?:\s+(?:is|me|at|on))?[:\s]*\+?\d[\d\s\-]{8,15}\d/gi, ' ')
    .replace(/\b\d{10}\b/g, ' ')
    .replace(/\b(?:my name is|i am|this is|call me)\s+[A-Za-z]+(?:\s+[A-Za-z]+){0,2}[.,]?/gi, ' ');

  const sentences = cleanedText
    .split(/[.!?;]+/)
    .map((part) => part.replace(/\s+/g, ' ').trim())
    .filter((part) => {
      const words = part.split(' ').filter(Boolean);
      return words.length >= 4 && !/^(my number is|number is|phone is)$/i.test(part);
    });

  if (sentences.length === 0) return '';
  return sentences.join('. ').slice(0, 1000).trim();
}

/**
 * Polishes form field spellings and formatting across Name, Company, Designation, and Summary.
 * Corrects speech recognition phonetic errors (e.g. "shrma" -> "Sharma", "info cis" -> "Infosys",
 * "manger" -> "Manager"), normalizes acronyms (CEO, VP, LLP), and polishes sentence capitalization.
 */
export function polishFieldSpellings(fields = {}) {
  const { name = '', companyName = '', designation = '', summary = '' } = fields;

  let polishedName = String(name || '').trim();
  let polishedCompany = String(companyName || '').trim();
  let polishedDesignation = String(designation || '').trim();
  let polishedSummary = String(summary || '').trim();

  // 1. Polish Name
  if (polishedName) {
    if (!isStrictPersonNameCandidate(polishedName)) polishedName = '';
  }
  if (polishedName) {
    polishedName = polishedName.replace(/^(?:mr\.|mr|mrs\.|mrs|ms\.|ms|dr\.|dr|shri)\s+/i, '');
    const tokens = polishedName.split(/\s+/).filter(Boolean);
    polishedName = tokens
      .map((tok) => {
        const lower = tok.toLowerCase().replace(/[^a-z]/g, '');
        if (NAME_SPELLING_CORRECTIONS[lower]) {
          return NAME_SPELLING_CORRECTIONS[lower];
        }
        return tok.charAt(0).toUpperCase() + tok.slice(1).toLowerCase();
      })
      .join(' ');
  }

  // 2. Polish Company Name
  if (polishedCompany) {
    const lowerCompany = polishedCompany.toLowerCase();
    if (COMPANY_SPELLING_CORRECTIONS[lowerCompany]) {
      polishedCompany = COMPANY_SPELLING_CORRECTIONS[lowerCompany];
    } else {
      polishedCompany = polishedCompany
        .replace(/\b(?:pvt\s*ltd|private\s*limited|p\s*ltd|pvtltd)\b/gi, 'Pvt Ltd')
        .replace(/\b(?:ltd|limited)\b/gi, 'Ltd')
        .replace(/\b(?:llp)\b/gi, 'LLP')
        .replace(/\b(?:inc|incorporated)\b/gi, 'Inc.')
        .replace(/\b(?:corp|corporation)\b/gi, 'Corp')
        .replace(/\b(?:technologys|technoligies|tech)\b/gi, 'Technologies')
        .replace(/\b(?:solutns|soluctions)\b/gi, 'Solutions')
        .replace(/\b(?:enterprizes|enterpise)\b/gi, 'Enterprises')
        .replace(/\b(?:industris)\b/gi, 'Industries')
        .replace(/\b(?:servics)\b/gi, 'Services')
        .replace(/\b(?:infotck)\b/gi, 'Infotech')
        .replace(/\b(?:consultency|consultancy)\b/gi, 'Consulting')
        .replace(/\b(?:softwares)\b/gi, 'Software')
        .replace(/\b(?:systms)\b/gi, 'Systems');

      polishedCompany = polishedCompany
        .split(/\s+/)
        .map((w) => {
          if (/^(LLP|IT|AI|HR|Pvt|Ltd|Corp|Inc\.?)$/i.test(w)) {
            if (/^llp$/i.test(w)) return 'LLP';
            if (/^pvt$/i.test(w)) return 'Pvt';
            if (/^ltd$/i.test(w)) return 'Ltd';
            if (/^inc\.?$/i.test(w)) return 'Inc.';
            return w.toUpperCase();
          }
          const lower = w.toLowerCase();
          if (COMPANY_SPELLING_CORRECTIONS[lower]) {
            return COMPANY_SPELLING_CORRECTIONS[lower];
          }
          return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
        })
        .join(' ');
    }
  }

  // 3. Polish Designation
  if (polishedDesignation) {
    const lowerDesig = polishedDesignation.toLowerCase();
    if (DESIGNATION_CORRECTIONS[lowerDesig]) {
      polishedDesignation = DESIGNATION_CORRECTIONS[lowerDesig];
    } else {
      const words = polishedDesignation.split(/\s+/).filter(Boolean);
      polishedDesignation = words
        .map((w) => {
          const lower = w.toLowerCase().replace(/[^a-z0-9\-]/g, '');
          if (DESIGNATION_CORRECTIONS[lower]) {
            return DESIGNATION_CORRECTIONS[lower];
          }
          if (/^(ceo|cto|coo|cfo|cmo|cro|cio|cpo|cso|vp|gm|hr|it|qa|ui|ux|md)$/i.test(w)) {
            return w.toUpperCase();
          }
          if (/^(of|and|in|at|for|the)$/i.test(w)) {
            return w.toLowerCase();
          }
          return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
        })
        .join(' ');
    }
  }

  // 4. Polish Summary
  if (polishedSummary) {
    polishedSummary = polishedSummary
      .replace(/\s*([,.;:!?])\s*/g, '$1 ')
      .replace(/\s+/g, ' ')
      .trim();

    polishedSummary = polishedSummary.replace(/\bi\b/g, 'I');

    polishedSummary = polishedSummary.replace(/(^\s*|[.!?]\s+)([a-z])/g, (_, pre, letter) => {
      return pre + letter.toUpperCase();
    });
  }

  return {
    name: polishedName,
    companyName: polishedCompany,
    designation: polishedDesignation,
    summary: polishedSummary,
  };
}

/**
 * Normalizes any incoming extraction response (from Gemini tools, completion callbacks, or regex)
 * into a canonical response schema:
 * {
 *   name: { value: "...", confidence: ... },
 *   phone: { value: "...", confidence: ... },
 *   companyName: { value: "...", confidence: ... },
 *   designation: { value: "...", confidence: ... },
 *   summary: { value: "...", confidence: ... }
 * }
 */
export function normalizeExtractedContact(rawExtraction = {}, context = {}) {
  const { user, organization } = context;
  const repPhone = String(user?.phone || '').replace(/\D/g, '').slice(-10);
  const hostOrg = (organization?.name || user?.organizationName || 'SalesBuster').trim().toLowerCase();

  const normalized = {
    name: { value: '', confidence: 0 },
    phone: { value: '', confidence: 0 },
    companyName: { value: '', confidence: 0 },
    designation: { value: '', confidence: 0 },
    summary: { value: '', confidence: 0 },
  };

  if (!rawExtraction || typeof rawExtraction !== 'object') {
    return normalized;
  }

  // Nested contact object support (e.g. data.contact)
  const source = rawExtraction.contact && typeof rawExtraction.contact === 'object'
    ? { ...rawExtraction, ...rawExtraction.contact }
    : rawExtraction;

  const resolveAlias = (keys) => {
    for (const key of keys) {
      if (source[key] !== undefined && source[key] !== null) {
        const val = source[key];
        if (typeof val === 'object' && val !== null && 'value' in val) {
          if (val.value !== null && val.value !== undefined) {
            const s = String(val.value).trim();
            if (s) {
              return {
                value: s,
                confidence: typeof val.confidence === 'number' ? val.confidence : 0.95,
              };
            }
          }
        } else if (typeof val === 'string' || typeof val === 'number') {
          const s = String(val).trim();
          if (s) {
            return { value: s, confidence: 0.95 };
          }
        }
      }
    }
    return null;
  };

  // 1. Name
  const nameCandidate = resolveAlias(['name', 'customerName', 'contactName', 'personName']);
  if (nameCandidate && nameCandidate.value) {
    const val = nameCandidate.value;
    const hasEvidenceField = Object.prototype.hasOwnProperty.call(source, 'nameEvidence');
    const evidence = String(source.nameEvidence || '').trim();
    const normalizedEvidence = evidence.toLowerCase().replace(/\s+/g, ' ');
    const normalizedName = val.toLowerCase().replace(/\s+/g, ' ');
    const hasExplicitIntroCue = /\b(?:my name is|myself|name is|people call me|call me|i am|i'm|this is|mera naam|naam hai|naa peru|na peru|nenu|main|hum)\b/i.test(evidence);
    const nameEvidenceMatches = !hasEvidenceField || Boolean(
      normalizedEvidence && normalizedEvidence.includes(normalizedName) && hasExplicitIntroCue,
    );
    const isRecordedAudioName = Boolean(context.trustRecordedAudioName);
    const isPlaceholderName = /^(?:null|undefined|none|unknown|valued customer|customer|guest|n\/a)$/i.test(val);
    if (
      nameEvidenceMatches &&
      !isPlaceholderName &&
      (isRecordedAudioName || isStrictPersonNameCandidate(val, context))
    ) {
      normalized.name = {
        value: val,
        confidence: nameCandidate.confidence || 0.95,
      };
    }
  }

  // 2. Phone
  const phoneCandidate = resolveAlias([
    'phone',
    'mobile',
    'mobileNumber',
    'phoneNumber',
    'contactNumber',
    'spokenPhone',
  ]);
  if (phoneCandidate && phoneCandidate.value) {
    let digits = String(phoneCandidate.value).replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
    else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
    const cleanDigits = digits.length > 10 ? digits.slice(-10) : digits;
    if (cleanDigits.length >= 6 && cleanDigits !== repPhone) {
      normalized.phone = {
        value: cleanDigits,
        confidence:
          phoneCandidate.confidence ||
          (cleanDigits.length === 10 && /^[6-9]\d{9}$/.test(cleanDigits) ? 0.99 : 0.8),
      };
    }
  }

  // 3. Company
  const compCandidate = resolveAlias(['companyName', 'company', 'organization', 'organizationName']);
  if (compCandidate && compCandidate.value) {
    const val = compCandidate.value;
    const lower = val.toLowerCase();
    if (
      val.length >= 2 &&
      !/^(unknown|company|business|organization|firm|n\/a|none|null|undefined|my\s+company|our\s+company|my\s+team)$/i.test(val) &&
      !(hostOrg && hostOrg.length > 2 && (lower === hostOrg || lower.includes(hostOrg)))
    ) {
      normalized.companyName = {
        value: val,
        confidence: compCandidate.confidence || 0.95,
      };
    }
  }

  // 4. Designation
  const desigCandidate = resolveAlias(['designation', 'jobTitle', 'role', 'position']);
  if (desigCandidate && desigCandidate.value) {
    const val = desigCandidate.value;
    if (val.length >= 2 && !/^(unknown|role|designation|n\/a|none|null|undefined)$/i.test(val)) {
      normalized.designation = {
        value: val,
        confidence: desigCandidate.confidence || 0.92,
      };
    }
  }

  // 5. Summary
  let sumCandidate = resolveAlias(['summary', 'discussionSummary', 'detailedSummary', 'keyDiscussion']);
  if (!sumCandidate && source.summary && typeof source.summary === 'object' && source.summary.keyDiscussion) {
    sumCandidate = {
      value: String(source.summary.keyDiscussion).trim(),
      confidence: 0.90,
    };
  }
  if (sumCandidate && sumCandidate.value) {
    const val = sumCandidate.value;
    if (val.length >= 5 && !/^(null|undefined|none)$/i.test(val)) {
      normalized.summary = {
        value: val,
        confidence: sumCandidate.confidence || 0.90,
      };
    }
  }

  // Cross-field Disambiguation: A person's name cannot match or be contained in companyName
  if (
    !context.trustRecordedAudioName &&
    normalized.name.value &&
    normalized.companyName.value
  ) {
    const nLower = normalized.name.value.toLowerCase();
    const cLower = normalized.companyName.value.toLowerCase();
    if (nLower === cLower || cLower.includes(nLower) || nLower.includes(cLower) || isLikelyCompanyName(normalized.name.value)) {
      normalized.name = { value: '', confidence: 0 };
    }
  }

  return normalized;
}

/**
 * Merges existing form field records with incoming extraction.
 * Guarantees that:
 * - Manually edited fields are NEVER overwritten by AI.
 * - Valid values are not cleared by empty extractions.
 * - Final AI extractions can refine interim AI values.
 */
export function mergeContactData(currentFields = {}, incoming = {}, options = {}) {
  const merged = { ...currentFields };
  const incomingNorm = incoming.name?.confidence !== undefined
    ? incoming
    : normalizeExtractedContact(incoming, options.context || {});

  const fields = ['name', 'phone', 'companyName', 'designation', 'summary'];

  for (const field of fields) {
    const currentMeta = currentFields[field] || {
      value: typeof currentFields[field] === 'string' ? currentFields[field] : '',
      source: 'empty',
      confidence: 0,
      isManuallyEdited: false,
    };

    if (currentMeta.isManuallyEdited) {
      merged[field] = currentMeta;
      continue;
    }

    const inc = incomingNorm[field];
    if (!inc || !inc.value) {
      merged[field] = currentMeta;
      continue;
    }

    // STRICT COMPANY SHIELD: Never merge a company name or entity into the name field
    if (field === 'name') {
      if (!isStrictPersonNameCandidate(inc.value, options.context || {})) {
        console.log('[mergeContactData] Rejecting non-person or ambiguous value from name field:', inc.value);
        continue;
      }
      const existingComp = (merged.companyName?.value || '').toLowerCase();
      if (existingComp && (inc.value.toLowerCase() === existingComp || existingComp.includes(inc.value.toLowerCase()) || inc.value.toLowerCase().includes(existingComp))) {
        console.log('[mergeContactData] Rejecting company name from name field:', inc.value);
        continue;
      }
    }

    // Auto-clean name field if incoming companyName matches misassigned name
    if (field === 'companyName' && inc.value) {
      const existingName = (merged.name?.value || '').toLowerCase().trim();
      const incCompLower = inc.value.toLowerCase().trim();
      if (
        existingName &&
        !merged.name?.isManuallyEdited &&
        (existingName === incCompLower || incCompLower.includes(existingName) || existingName.includes(incCompLower) || isLikelyCompanyName(merged.name.value))
      ) {
        console.log('[mergeContactData] Purging misassigned company from name field:', merged.name.value);
        merged.name = { value: '', source: 'empty', confidence: 0, isManuallyEdited: false };
      }
    }

    const currentConf = currentMeta.confidence || 0;
    const incConf = inc.confidence || 0.5;

    // AI final > AI interim > regex fallback > empty
    if (
      !currentMeta.value ||
      incConf >= currentConf ||
      currentMeta.source === 'ai_interim' ||
      currentMeta.source === 'regex_fallback' ||
      options.source === 'ai_final'
    ) {
      merged[field] = {
        value: inc.value,
        source: options.source || 'ai_final',
        confidence: incConf,
        isManuallyEdited: false,
      };
    } else {
      merged[field] = currentMeta;
    }
  }

  return merged;
}

/**
 * High-level parser that analyzes an incoming real-time transcript stream
 * and returns newly detected fields. Validates all fields strictly.
 */
export function parseRealtimeTranscript(transcript = '', context = {}) {
  const { user, organization, currentFields = {} } = context;
  const repName = user?.name || '';
  const repPhone = user?.phone || '';
  const orgName = organization?.name || '';

  const updates = {};

  // 1. Phone Extraction
  if (!currentFields.phone || currentFields.isPhoneAiDetected) {
    const extractedPhone = extractPhoneNumber(transcript, repPhone);
    if (extractedPhone && extractedPhone.length >= 6 && extractedPhone !== currentFields.phone) {
      updates.phone = extractedPhone;
    }
  }

  // 2. Name Extraction
  if (!currentFields.name || currentFields.isNameAiDetected) {
    const extractedName = extractName(transcript, repName);
    const existingCompany = (currentFields.companyName || '').toLowerCase().trim();
    if (
      extractedName &&
      isStrictPersonNameCandidate(extractedName, { user }) &&
      extractedName !== currentFields.name &&
      !isLikelyCompanyName(extractedName) &&
      (!existingCompany || (extractedName.toLowerCase() !== existingCompany && !existingCompany.includes(extractedName.toLowerCase())))
    ) {
      updates.name = extractedName;
    }
  }

  // 3. Company Extraction
  if (!currentFields.companyName || currentFields.isCompanyAiDetected) {
    const extractedCompany = extractCompanyName(transcript, orgName);
    if (extractedCompany && extractedCompany !== currentFields.companyName) {
      updates.companyName =
        COMPANY_SPELLING_CORRECTIONS[extractedCompany.toLowerCase()] ||
        extractedCompany;
    }
  }

  // 4. Designation Extraction
  if (!currentFields.designation || currentFields.isDesignationAiDetected) {
    const extractedDesignation = extractDesignation(transcript);
    if (extractedDesignation && extractedDesignation !== currentFields.designation) {
      updates.designation = extractedDesignation;
    }
  }

  // 5. Discussion summary fallback
  if (!currentFields.summary || currentFields.isSummaryAiDetected) {
    const extractedSummary = extractDiscussionSummary(transcript);
    if (extractedSummary && extractedSummary !== currentFields.summary) {
      updates.summary = extractedSummary;
    }
  }

  // 6. Disambiguation: A person's name cannot be identical or related to company name
  const activeCompany = (updates.companyName || currentFields.companyName || '').toLowerCase().trim();
  if (updates.name) {
    const nameLower = updates.name.toLowerCase();
    if (isLikelyCompanyName(updates.name) || (activeCompany && (nameLower === activeCompany || activeCompany.includes(nameLower) || nameLower.includes(activeCompany)))) {
      if (!updates.companyName && (!currentFields.companyName || currentFields.isCompanyAiDetected)) {
        updates.companyName = updates.name;
      }
      delete updates.name;
    }
  }

  if (updates.name && updates.companyName) {
    const nameLower = updates.name.toLowerCase();
    const compLower = updates.companyName.toLowerCase();
    if (nameLower === compLower || compLower.includes(nameLower) || nameLower.includes(compLower)) {
      delete updates.name;
    }
  }

  // 7. Disambiguation: A person's name cannot be identical to role / designation
  if (updates.name && updates.designation) {
    const nameLower = updates.name.toLowerCase();
    const desigLower = updates.designation.toLowerCase();
    if (nameLower === desigLower) {
      delete updates.name;
    }
  }

  // 8. Disambiguation: A company name cannot be a geographic city or state
  if (updates.companyName && GEOGRAPHIC_LOCATIONS.has(updates.companyName.toLowerCase())) {
    delete updates.companyName;
  }

  // 9. Disambiguation: A person's name cannot be a geographic city or state
  if (updates.name && GEOGRAPHIC_LOCATIONS.has(updates.name.toLowerCase())) {
    delete updates.name;
  }

  // 10. Disambiguation: Company cannot be identical to designation
  if (updates.companyName && updates.designation) {
    const compLower = updates.companyName.toLowerCase();
    const desigLower = updates.designation.toLowerCase();
    if (compLower === desigLower) {
      delete updates.companyName;
    }
  }

  return updates;
}
