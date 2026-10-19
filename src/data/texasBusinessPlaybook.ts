export interface PlaybookStep {
  step: number;
  title: string;
  detail: string;
}

export interface PlaybookModule {
  id: 'carpentry' | 'bar' | 'foodtruck' | 'llc' | 'banking' | 'wealth';
  category: string;
  title: string;
  badge: string;
  summary: string;
  keySteps: PlaybookStep[];
  regulations: string[];
  capitalAndCosts: string[];
  proTips: string[];
}

export interface ChecklistItem {
  id: string;
  category: 'llc' | 'banking' | 'carpentry' | 'foodtruck' | 'bar' | 'wealth';
  label: string;
  detail: string;
}

export const PLAYBOOK_MODULES: PlaybookModule[] = [
  {
    id: 'carpentry',
    category: 'carpentry',
    title: 'Custom Carpentry & Woodworking Business',
    badge: 'Texas LLC • Woodworking',
    summary: 'Turn high-end craftsmanship, cabinetry, finish trim, and custom builds into a scalable Texas business with commercial trade accounts and 50% upfront deposits.',
    keySteps: [
      {
        step: 1,
        title: 'Texas LLC Setup (Form 205)',
        detail: 'File Certificate of Formation with the Texas Secretary of State ($300). Choose a distinct trade name and secure your free IRS EIN in 5 minutes at irs.gov.',
      },
      {
        step: 2,
        title: 'Texas Sales & Use Tax Permit',
        detail: 'In Texas, new residential construction labor is non-taxable, but residential repair/remodeling labor and fabricated furniture sales require a Texas Sales Tax permit from the Comptroller.',
      },
      {
        step: 3,
        title: 'Commercial Tool & General Liability Insurance',
        detail: 'Obtain $1M/$2M Commercial General Liability insurance (~$75–$120/mo) plus Inland Marine / Tool Floater coverage to protect table saws, trailers, and shop tools from job site theft.',
      },
      {
        step: 4,
        title: 'Open Trade Supplier Accounts (Net-30)',
        detail: 'Open Commercial Pro accounts at local Dallas/Texas lumber yards (Central Hardwoods, Houston Hardwoods) and Home Depot Pro / Lowe\'s Pro with Net-30 invoicing to build business credit.',
      },
      {
        step: 5,
        title: 'The 50% Upfront Deposit Rule',
        detail: 'Never start sawing wood or ordering materials without a written contract and a 50% deposit that covers 100% of raw materials and shop consumables.',
      },
    ],
    regulations: [
      'No statewide general contractor license in Texas, but city contractor registration is required in Dallas, Fort Worth, Arlington, and Plano.',
      'Texas Construction Trust Fund Act (Property Code Ch. 162) requires payments received on construction projects to be held in trust for subcontractors and material suppliers.',
      'Workers\' Compensation is optional for private Texas employers, but commercial clients will mandate proof of Commercial General Liability.',
    ],
    capitalAndCosts: [
      'Texas LLC Filing: $300 state fee (one-time)',
      'General Liability & Tool Floater: $75–$140/month',
      'Initial Shop Equipment & Trailer: $3,500–$10,000',
      'Raw Lumber & Hardware Working Capital: $2,500–$5,000',
    ],
    proTips: [
      'Take high-definition before & after photos of every mantle, custom table, and trim job to build your digital portfolio.',
      'Specialize in custom finish work where profit margins are 40–60%, rather than competing on low-bid framing.',
      'Always use written Change Orders signed by the homeowner before cutting extra custom pieces.',
    ],
  },
  {
    id: 'bar',
    category: 'bar',
    title: 'Texas Bar & Lounge Ownership (TABC & Local Codes)',
    badge: 'TABC Permitted • Hospitality',
    summary: 'Master Texas Alcoholic Beverage Commission (TABC) permits, pour cost discipline, 300-ft distance restrictions, and high-margin night economy operations.',
    keySteps: [
      {
        step: 1,
        title: 'TABC Licensing (Mixed Beverage MB Permit)',
        detail: 'Apply through TABC AIMS portal for an MB permit ($3,000 state fee for 2-year license) for liquor, beer, and wine, or a BG permit if only serving beer and wine.',
      },
      {
        step: 2,
        title: 'Local Wet/Dry Verification',
        detail: 'Before signing a commercial lease, verify that the city and county precinct allows on-premise alcohol sales with the City Secretary and County Clerk.',
      },
      {
        step: 3,
        title: '60-Day Outdoor Public Notice Sign',
        detail: 'Texas law mandates posting an outdoor notification sign in front of the proposed location for 60 consecutive days prior to permit issuance.',
      },
      {
        step: 4,
        title: 'Church & School 300-Ft Distance Rule',
        detail: 'Texas ABC § 109.33 strictly prohibits alcohol sales within 300 feet of a church, public/private school, or hospital (cities can extend to 1,000 ft for schools).',
      },
      {
        step: 5,
        title: 'Dram Shop Act & Liquor Liability Insurance',
        detail: 'Under the Texas Dram Shop Act, bars can be held liable for over-serving patrons. Secure a $1M Liquor Liability policy and mandate 100% TABC seller-server certifications.',
      },
    ],
    regulations: [
      'All bartenders, managers, and door staff must be TABC Seller-Server certified before serving alcohol.',
      'Monthly Taxes: Texas Mixed Beverage Gross Receipts Tax (6.7%) and Mixed Beverage Sales Tax (8.25%) filed monthly with the Comptroller.',
      'Hours of Sale: Standard hours 7:00 AM – 12:00 AM Mon-Sat, 12:00 PM – 12:00 AM Sun. Late Hours permit extends sales to 2:00 AM in approved counties/cities.',
    ],
    capitalAndCosts: [
      'TABC 2-Year MB Permit: $3,000 state fee + ~$1,500 local fees',
      'Liquor Liability Insurance: $2,500–$5,500/year',
      'Initial Liquor & Draft Beer Inventory: $8,000–$15,000',
      'Buildout / Bar Takeover: $30,000–$90,000 (seek 2nd-generation bar spaces)',
    ],
    proTips: [
      'Target Pour Cost: Keep overall pour cost under 18–20% (Draft beer 15%, well liquor 12%, craft cocktails 18%).',
      'Use Toast POS with digital scale integration to catch bartender over-pouring and shrinkage instantly.',
      'Offer zero-proof mocktails and specialty bar snacks—they carry 80%+ profit margins with zero liquor tax.',
    ],
  },
  {
    id: 'foodtruck',
    category: 'foodtruck',
    title: 'Food Truck Operations & Texas Health Code',
    badge: 'Mobile Food Unit (MFU) • Health Code',
    summary: 'Step-by-step compliance with Texas Food Establishment Rules (TFER), certified commissary kitchen agreements, plumbing specs, and profitable mobile catering.',
    keySteps: [
      {
        step: 1,
        title: 'Texas DSHS & City MFU Health Permit',
        detail: 'Register as a Mobile Food Unit (MFU) with the Dallas Department of Code Compliance / Consumer Health or Dallas County Health and Human Services.',
      },
      {
        step: 2,
        title: 'Mandatory Signed Commissary Agreement',
        detail: 'Texas law REQUIRES a signed contract with an approved, licensed commercial commissary kitchen for daily wastewater dumping, fresh water refills, and grease disposal.',
      },
      {
        step: 3,
        title: 'Plumbing & Sinks Hardware Requirements',
        detail: 'Must feature a 3-compartment sink with double drainboards for wash/rinse/sanitize, PLUS a separate dedicated handwashing sink with hot (100°F+) and cold running water.',
      },
      {
        step: 4,
        title: 'Fresh & Wastewater Tank Capacities',
        detail: 'Texas health code requires a potable fresh water tank (minimum 30 gallons) and a gray wastewater tank that is at least 15% larger than the fresh tank (minimum 35 gallons).',
      },
      {
        step: 5,
        title: 'Fire Marshal Inspection & Ansul Hood',
        detail: 'If cooking with grease or fryers, Texas fire code requires a Type 1 commercial hood with automatic fire suppression (Ansul system), Class K fire extinguisher, and a Texas Railroad Commission propane certification sticker.',
      },
    ],
    regulations: [
      'Texas Food Establishment Rules (25 TAC §228) mandate strict hot holding at 135°F+ and cold holding at 41°F or below.',
      'At least one Certified Food Protection Manager (CFM) on staff, and all other handlers must possess an accredited Texas Food Handler card.',
      'Daily Commissary Log: Maintain written, time-stamped logs showing daily commissary visits for health inspectors upon inspection.',
    ],
    capitalAndCosts: [
      'Equipped Trailer / Truck: $25,000–$60,000',
      'Commissary Kitchen Lease: $400–$900/month',
      'City Health Permit & Fire Inspection: $450–$800/year',
      'Food Cost Target: 28–32% of retail price',
    ],
    proTips: [
      'Focus on high-margin catering (weddings, corporate campuses, private parties) where 100% of revenue is guaranteed before firing up the truck.',
      'Streamline menu to 5–6 high-speed items to keep customer ticket turnaround times under 3 minutes.',
      'Invest in a quiet commercial inverter generator (Honda/Predator) to avoid noise complaints and event rejections.',
    ],
  },
  {
    id: 'llc',
    category: 'llc',
    title: 'Texas LLC Formation & Asset Protection Fortress',
    badge: 'Legal Entity • Texas SOS',
    summary: 'Legally form, structure, and maintain a bulletproof Texas Limited Liability Company with zero personal liability and maximum tax efficiency.',
    keySteps: [
      {
        step: 1,
        title: 'File Form 205 (Certificate of Formation)',
        detail: 'File online via Texas Secretary of State SOSDirect ($300 state fee). Name must contain "Limited Liability Company", "LLC", or "L.L.C." and be unique in Texas.',
      },
      {
        step: 2,
        title: 'Appoint Registered Agent',
        detail: 'Must appoint a registered agent with a physical street address in Texas (not a P.O. Box) available during regular business hours to receive legal process.',
      },
      {
        step: 3,
        title: 'Get Free Federal EIN from IRS.gov',
        detail: 'Obtain your Employer Identification Number immediately online on irs.gov for $0. Never pay an agency or third-party service.',
      },
      {
        step: 4,
        title: 'Draft Custom Operating Agreement',
        detail: 'Draft an internal Operating Agreement establishing Member-Managed structure, banking authority, capital contributions, and family succession provisions.',
      },
      {
        step: 5,
        title: 'Annual Texas Franchise Tax (No Tax Due)',
        detail: 'Texas has no corporate income tax. If gross revenue is under the exemption threshold (~$2.47M), you owe $0, but you MUST file Form 05-163 No Tax Due Report by May 15th.',
      },
    ],
    regulations: [
      'Texas Business Organizations Code (BOC) Chapter 101 shields personal home, personal cars, and bank accounts from business lawsuits.',
      'Never Co-Mingle: Paying personal expenses from business checking pierces the corporate veil and destroys personal liability protection.',
      'All agreements, leases, and contracts must be signed: "Russell Holdings LLC, By: Grayson Russell, Managing Member".',
    ],
    capitalAndCosts: [
      'Texas Form 205 SOS Fee: $300 (one-time)',
      'IRS EIN: $0 (Free on irs.gov)',
      'Texas Franchise Tax: $0 (for revenues under $2.47M)',
      'Registered Agent: $0 (self) or $50–$100/yr (privacy service)',
    ],
    proTips: [
      'Use a Series LLC in Texas if operating multiple ventures (Series A for Carpentry, Series B for Food Truck) to separate debts and liabilities under one filing.',
      'Keep copies of filed Certificate of Formation, EIN Letter (CP 575), and Operating Agreement in a physical binder for bank and vendor visits.',
    ],
  },
  {
    id: 'banking',
    category: 'banking',
    title: 'Banks, Business Accounts & Business Credit Building',
    badge: 'Capital & Credit • Tier 1-3',
    summary: 'Open commercial checking accounts, build an 80+ PAYDEX business credit rating without personal guarantee, and tap Texas lending programs.',
    keySteps: [
      {
        step: 1,
        title: 'Open Texas Business Checking',
        detail: 'Visit Frost Bank, Chase Business, or a local credit union with approved Form 205, IRS EIN letter, Operating Agreement, and two photo IDs.',
      },
      {
        step: 2,
        title: 'Separate Tax & Profit Sub-Accounts',
        detail: 'Open three accounts: Primary Operating Checking, Texas Sales Tax / Payroll Reserve, and Business Profit Retention (Savings).',
      },
      {
        step: 3,
        title: 'Register D-U-N-S Number with Dun & Bradstreet',
        detail: 'Request your free 9-digit D-U-N-S number from D&B online so your business credit file is established and tracked.',
      },
      {
        step: 4,
        title: 'Tier 1 Net-30 Vendor Accounts',
        detail: 'Open Net-30 trade accounts with Uline, Grainger, Quill, and The CEO Creative. Buy routine packaging/safety supplies and pay by Day 10 to trigger an 80+ PAYDEX score.',
      },
      {
        step: 5,
        title: 'Tier 2 & 3 Store Cards & Unsecured Lines',
        detail: 'Graduate to Home Depot Commercial Pro, Shell/Exxon fleet fuel cards, and revolving commercial lines of credit ($10k–$50k).',
      },
    ],
    regulations: [
      'Texas Finance Code governs commercial lending and banking disclosures.',
      'Sales Tax Hold: Always keep sales tax collected in a separate account; spending state tax collections is a criminal offense in Texas.',
      'Maintain an active Texas Franchise Tax "Right to Transact Business" status on the Comptroller website so banks keep commercial lines active.',
    ],
    capitalAndCosts: [
      'Bank Account Opening Deposit: $50–$100',
      'Net-30 Supplies Budget: $150–$300 (routine shop supplies)',
      'D-U-N-S Number: $0 (free from Dun & Bradstreet)',
    ],
    proTips: [
      'Always pay vendor Net-30 invoices within 10 to 15 days of invoice date—D&B gives top scores to companies that pay early.',
      'Check LiftFund Texas (liftfund.com) and PeopleFund for Texas small business microloans ($5,000–$50,000) with flexible credit criteria.',
    ],
  },
  {
    id: 'wealth',
    category: 'wealth',
    title: 'Generational Wealth & Holding Company Blueprint',
    badge: 'Generational Wealth • Dynasty',
    summary: 'Turn active business profits into cash-flowing real estate, holding companies, and protected assets that stay in the family for generations.',
    keySteps: [
      {
        step: 1,
        title: 'The Parent Holding Company Structure',
        detail: 'Create Russell Holdings LLC as the top-level parent entity. The holding company owns the assets, tools, intellectual property, and real estate, leasing them to operating businesses.',
      },
      {
        step: 2,
        title: 'The Profit First Allocation Blueprint',
        detail: 'Allocate every business dollar: 50% Operations, 15% Taxes, 15% Business Retained Earnings / Reinvestment, and 20% Owner\'s Pay into wealth-building accounts.',
      },
      {
        step: 3,
        title: 'Reinvest in Texas Real Estate',
        detail: 'Channel business cash flow into cash-flowing commercial workshop space, residential duplexes, or Dallas rental property under a dedicated real estate LLC.',
      },
      {
        step: 4,
        title: 'Establish a Revocable Living Family Trust',
        detail: 'Transfer LLC equity and real estate deeds into a private family trust so assets pass automatically to family heirs without going through expensive Texas probate court.',
      },
      {
        step: 5,
        title: 'Life Insurance / Infinite Banking Foundation',
        detail: 'Establish cash-value whole life insurance on key family leaders to protect the businesses and create a private family credit facility.',
      },
    ],
    regulations: [
      'Texas Homestead Protection (Property Code § 41.001) protects primary residences from seizure by most civil judgment creditors.',
      'Texas Estates Code allows streamlined probate, but holding assets in a Living Trust bypasses public probate records completely.',
      'Texas Community Property laws: Keep business entity formation documents and capital contributions clearly documented.',
    ],
    capitalAndCosts: [
      'Holding Company Formation: $300',
      'Estate & Trust Planning Legal Counsel: $1,200–$2,500',
      'First Real Estate Down Payment Reserve: $15,000–$35,000',
    ],
    proTips: [
      'Generational wealth is not measured by the revenue you generate; it is measured by the cash-flowing assets that outlive you.',
      'Never sell your core workshop or commercial real estate; borrow against equity to acquire more assets.',
    ],
  },
];

export const CHECKLIST_ITEMS: ChecklistItem[] = [
  {
    id: 'tx-llc-1',
    category: 'llc',
    label: 'File Texas LLC Form 205 ($300 state fee)',
    detail: 'Certificate of Formation filed online with Texas Secretary of State SOSDirect portal.',
  },
  {
    id: 'tx-llc-2',
    category: 'llc',
    label: 'Obtain Free Federal EIN from IRS.gov',
    detail: 'Employer Identification Number issued instantly online for tax and banking purposes.',
  },
  {
    id: 'tx-llc-3',
    category: 'llc',
    label: 'Draft & Sign LLC Operating Agreement',
    detail: 'Member-Managed agreement establishing ownership, banking authority, and succession.',
  },
  {
    id: 'tx-bank-1',
    category: 'banking',
    label: 'Open Business Checking at Frost Bank or Texas Bank',
    detail: 'Commercial account separated from personal funds with Certificate of Formation and EIN.',
  },
  {
    id: 'tx-bank-2',
    category: 'banking',
    label: 'Open Sales Tax & Payroll Reserve Sub-Account',
    detail: 'Dedicated account to hold state sales tax collections and tax obligations separately.',
  },
  {
    id: 'tx-credit-1',
    category: 'banking',
    label: 'Obtain Free 9-Digit D-U-N-S Number',
    detail: 'Register company with Dun & Bradstreet to begin building business credit profile.',
  },
  {
    id: 'tx-credit-2',
    category: 'banking',
    label: 'Establish 3 Net-30 Vendor Accounts (Uline/Grainger/Quill)',
    detail: 'Buy routine shop supplies and pay within 10 days to achieve an 80+ PAYDEX rating.',
  },
  {
    id: 'tx-carp-1',
    category: 'carpentry',
    label: 'Secure Commercial General Liability ($1M/$2M) & Tool Floater',
    detail: 'Policy protecting against jobsite property damage and tool theft from vehicle or shop.',
  },
  {
    id: 'tx-carp-2',
    category: 'carpentry',
    label: 'Set Up Home Depot Pro & Local Lumber Yard Trade Credit',
    detail: 'Access commercial volume pricing and Net-30 billing for lumber, sheet goods, and hardware.',
  },
  {
    id: 'tx-carp-3',
    category: 'carpentry',
    label: 'Implement 50% Upfront Deposit Contract Policy',
    detail: 'Never start cutting or order wood without 50% deposit covering 100% of raw materials.',
  },
  {
    id: 'tx-truck-1',
    category: 'foodtruck',
    label: 'Pass Texas Certified Food Protection Manager (CFM) Exam',
    detail: 'State-accredited food manager certification required for all Texas mobile food establishments.',
  },
  {
    id: 'tx-truck-2',
    category: 'foodtruck',
    label: 'Execute Signed Commercial Commissary Kitchen Agreement',
    detail: 'Mandatory licensed commissary in Dallas area for daily water, grease, and waste dumping.',
  },
  {
    id: 'tx-truck-3',
    category: 'foodtruck',
    label: 'Verify Truck Plumbing: 3-Compartment + Handwash Sinks',
    detail: 'Hot water 100°F+, 30-gallon fresh potable tank, and 35+ gallon wastewater tank.',
  },
  {
    id: 'tx-truck-4',
    category: 'foodtruck',
    label: 'Install Type 1 Ansul Hood & Class K Fire Extinguisher',
    detail: 'Automatic fire suppression system and RRC propane inspection sticker for fire marshal signoff.',
  },
  {
    id: 'tx-truck-5',
    category: 'foodtruck',
    label: 'Obtain City of Dallas / Dallas County MFU Health Permit',
    detail: 'Final physical inspection sticker by Dallas Consumer Health for lawful street operation.',
  },
  {
    id: 'tx-bar-1',
    category: 'bar',
    label: 'Verify Location Zoning & 300-Ft Church/School Distance Rule',
    detail: 'Ensure proposed commercial space is 300+ feet away from any church, school, or hospital.',
  },
  {
    id: 'tx-bar-2',
    category: 'bar',
    label: 'Confirm Precinct is Certified "Wet" for On-Premise Sales',
    detail: 'Verification with City Secretary and County Clerk for on-premise mixed beverage sales.',
  },
  {
    id: 'tx-bar-3',
    category: 'bar',
    label: 'Post TABC 60-Day Outdoor Notification Sign',
    detail: 'Public notification signage required by Texas law for 60 consecutive days prior to license.',
  },
  {
    id: 'tx-bar-4',
    category: 'bar',
    label: 'Apply for TABC Mixed Beverage (MB) Permit via AIMS',
    detail: 'State application ($3,000 for 2 years) for lawful on-premise liquor, beer, and wine service.',
  },
  {
    id: 'tx-bar-5',
    category: 'bar',
    label: 'Obtain Liquor Liability Insurance & Mandate TABC Certifications',
    detail: 'Dram Shop protection policy and seller-server certifications for all bartenders and security.',
  },
  {
    id: 'tx-wealth-1',
    category: 'wealth',
    label: 'Establish Parent Holding Company ("Russell Holdings LLC")',
    detail: 'Top-level asset holding entity to isolate operating liabilities and hold business equity.',
  },
  {
    id: 'tx-wealth-2',
    category: 'wealth',
    label: 'Implement Profit First Cash Flow Architecture',
    detail: '50% Operations, 15% Taxes, 15% Retained Profit, and 20% Owner Wealth reinvestment.',
  },
];

export interface HealthCodeRule {
  title: string;
  category: 'foodtruck' | 'bar' | 'general';
  code: string;
  requirement: string;
  criticalDetail: string;
}

export const TEXAS_HEALTH_CODES: HealthCodeRule[] = [
  {
    title: 'Dedicated Handwashing Sinks',
    category: 'general',
    code: '25 TAC § 228.147',
    requirement: 'Hot running water minimum 100°F (38°C), liquid soap, and disposable paper towels.',
    criticalDetail: 'Strictly dedicated to handwashing. NEVER dump mop water, rinse dishes, or prep food in hand sinks. Signage required: "Employees Must Wash Hands".',
  },
  {
    title: '3-Compartment Sink Sanitation Protocol',
    category: 'general',
    code: '25 TAC § 228.115',
    requirement: 'Wash (110°F+ soapy water) → Rinse (clean warm water) → Sanitize → Air Dry.',
    criticalDetail: 'Sink 3 sanitizer immersion: 50–100 PPM Chlorine (bleach) for 30–60 secs, or 200 PPM Quaternary Ammonia. Must test with chemical test strips daily. Towel drying is prohibited!',
  },
  {
    title: 'Temperature Danger Zone (TCS Foods)',
    category: 'general',
    code: '25 TAC § 228.71',
    requirement: 'Cold holding 41°F or below. Hot holding 135°F or above.',
    criticalDetail: 'Reheating cooked foods must reach 165°F within 2 hours. Rapid cooling: 135°F to 70°F within 2 hours, then to 41°F within 4 hours. Keep calibrated digital probe thermometer on hand.',
  },
  {
    title: 'Mobile Food Unit Commissary Contract',
    category: 'foodtruck',
    code: '25 TAC § 228.221',
    requirement: 'Mandatory daily reporting to a state-licensed commercial commissary kitchen.',
    criticalDetail: 'Texas law requires daily trip logs to an approved commissary for potable water fills, wastewater discharge, grease disposal, and dry food storage. Health inspectors verify logs upon unannounced inspections.',
  },
  {
    title: 'Water Holding Tank Ratios for Food Trucks',
    category: 'foodtruck',
    code: '25 TAC § 228.149',
    requirement: 'Fresh potable water tank minimum 30 gallons; wastewater tank minimum 15% larger (35+ gallons).',
    criticalDetail: 'Wastewater tank must be permanently mounted, sloped to drain, and equipped with a quick-disconnect coupling. Fresh water fill hose must be food-grade (never standard garden hose).',
  },
  {
    title: 'Fire Suppression & Hood Ventilation',
    category: 'foodtruck',
    code: 'NFPA 96 & Texas Fire Code',
    requirement: 'Type 1 commercial hood with automatic Ansul fire suppression system over grease fryers/grills.',
    criticalDetail: 'Class K fire extinguisher required within 10 feet of fryers. Class 2A:10B:C fire extinguisher required on board. Semi-annual inspection tag required by certified fire technician.',
  },
  {
    title: 'Ice Machine Sanitation & Ice Scoops',
    category: 'bar',
    code: '25 TAC § 228.68',
    requirement: 'Ice is classified as food. Ice machines must be dismantled and sanitized every 30 days.',
    criticalDetail: 'Store ice scoop in a clean, sanitized holder outside the ice bin with handle up. Never leave scoop buried in ice or use glass cups to scoop ice (chips break invisibly into ice).',
  },
  {
    title: 'Draft Beer Line Cleaning Standard',
    category: 'bar',
    code: 'Texas TABC & Health Code',
    requirement: 'Beer draught lines must be recirculated with caustic cleaner every 14 days.',
    criticalDetail: 'Prevents buildup of beer stone (calcium oxalate), wild yeast, and bacteria that spoil draft taste and cause bacterial contamination. Faucets and couplers soaked and brushed weekly.',
  },
  {
    title: 'Certified Food Protection Manager (CFM)',
    category: 'general',
    code: '25 TAC § 228.33',
    requirement: 'At least 1 full-time Certified Food Manager (CFM) on staff per establishment.',
    criticalDetail: 'Pass Texas DSHS-accredited CFM exam (valid 5 years). All other employees who handle food, drinks, or bar garnishes must complete an accredited Texas Food Handler course within 30 days of hire.',
  },
];

export interface TexasBankingStep {
  tier: string;
  title: string;
  description: string;
  actionItems: string[];
}

export const TEXAS_BANKING_GUIDE: TexasBankingStep[] = [
  {
    tier: 'Foundation',
    title: 'Texas Commercial Bank Account Setup',
    description: 'Open a dedicated commercial checking account with Frost Bank, Chase Business, or Texas Regional Bank.',
    actionItems: [
      'Bring Texas SOS Form 205 (Certificate of Formation stamped approved).',
      'Bring IRS EIN confirmation letter (Form CP 575 or 147C).',
      'Bring executed LLC Operating Agreement showing Grayson Russell as Managing Member.',
      'Deposit $100 opening funds strictly from initial member capital contribution.',
    ],
  },
  {
    tier: 'Structure',
    title: 'The 3-Account Money Management Fortress',
    description: 'Never mix operating funds with tax or retained earnings. Open 3 distinct accounts.',
    actionItems: [
      'Account 1 - Operating Checking: Daily expenses, inventory, vendor payments, and client receipts.',
      'Account 2 - Texas Sales Tax & Franchise Reserve: Transfer 8.25% of all taxable sales immediately. NEVER touch this money—it belongs to the State of Texas Comptroller.',
      'Account 3 - Profit First & Holding Reserve: Transfer 15–20% of net profits weekly for future real estate, holding company investments, and emergency reserves.',
    ],
  },
  {
    tier: 'Tier 1 Credit',
    title: 'Dun & Bradstreet (D-U-N-S) & Net-30 Vendors',
    description: 'Build your corporate credit profile without using your personal Social Security Number.',
    actionItems: [
      'Register free 9-digit D-U-N-S number on dnb.com (select free 30-day processing).',
      'Open Net-30 trade accounts with Uline (boxes/shop safety), Grainger (hardware/tools), Quill (office/forms), and The CEO Creative.',
      'Purchase $50–$100 of routine supplies each month on 30-day terms.',
      'GOLDEN RULE: Pay invoices on Day 10 (early). This generates a maximum 80+ PAYDEX credit score!',
    ],
  },
  {
    tier: 'Tier 2 Credit',
    title: 'Retail Store & Fleet Cards (No Personal Guarantee)',
    description: 'Once 3–5 Net-30 trade lines report to Dun & Bradstreet, apply for commercial revolving store credit.',
    actionItems: [
      'Home Depot Commercial Pro Account: 5% discount, volume lumber pricing, and 60-day terms for carpentry projects.',
      'Lowe\'s Commercial Services: Net-30 and revolving pro accounts.',
      'WEX / Shell Commercial Fleet Fuel Card: Fuel purchases for food truck and carpentry work trucks reporting to Experian Commercial.',
      'Sam\'s Club / Costco Business Credit: Commercial bulk food purchasing for bar and food truck.',
    ],
  },
  {
    tier: 'Tier 3 Capital',
    title: 'Commercial Lines of Credit & Texas Lenders',
    description: 'Tap local Texas economic development funds and commercial working capital facilities.',
    actionItems: [
      'LiftFund Texas (liftfund.com): Texas-based non-profit community lender offering $5,000–$50,000 small business microloans with favorable credit underwriting.',
      'PeopleFund (peoplefund.org): Dallas/Texas CDFI providing working capital, equipment financing, and financial education.',
      'Frost Bank Commercial Line of Credit: $25,000–$100,000 revolving credit line based on 12 months of solid business bank deposits.',
      'SBA 7(a) & 504 Express Loans: Federal small business loans for commercial equipment, food trailers, and workshop real estate purchases.',
    ],
  },
];
