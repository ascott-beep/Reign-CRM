import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const NODE_ENV = process.env.NODE_ENV ?? "development";
const ALLOW_SEED_IN_PRODUCTION = process.env.ALLOW_SEED_IN_PRODUCTION === "true";
if (NODE_ENV === "production" && !ALLOW_SEED_IN_PRODUCTION) {
  console.error(
    "Refusing to seed: NODE_ENV=production and ALLOW_SEED_IN_PRODUCTION is not 'true'. " +
      "This seed script creates fictional demo data and demo login passwords, and must not run against production by accident.",
  );
  process.exit(1);
}

const SEED_PASSWORD = process.env.SEED_USER_PASSWORD ?? "ChangeMe123!";

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
function daysFromNow(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}
function monthsAgo(n: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d;
}

async function main() {
  console.log(`Seeding (NODE_ENV=${NODE_ENV})…`);

  // ---------------------------------------------------------------------
  // Workspace
  // ---------------------------------------------------------------------
  const workspace = await prisma.workspace.upsert({
    where: { slug: process.env.WORKSPACE_SLUG ?? "reign-partners" },
    update: {},
    create: {
      name: process.env.WORKSPACE_NAME ?? "Reign Partners",
      slug: process.env.WORKSPACE_SLUG ?? "reign-partners",
      defaultCurrency: process.env.WORKSPACE_DEFAULT_CURRENCY ?? "GBP",
      defaultTimezone: process.env.WORKSPACE_DEFAULT_TIMEZONE ?? "Europe/London",
      brandAccent: process.env.WORKSPACE_BRAND_ACCENT ?? "#1C2B4A",
    },
  });
  const wid = workspace.id;

  // ---------------------------------------------------------------------
  // Users
  // ---------------------------------------------------------------------
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 12);

  const adam = await prisma.user.upsert({
    where: { workspaceId_email: { workspaceId: wid, email: "adam@reign.partners" } },
    update: {},
    create: {
      workspaceId: wid,
      firstName: "Adam",
      lastName: "Whitfield",
      email: "adam@reign.partners",
      passwordHash,
      role: "ADMIN",
      timezone: "Europe/London",
    },
  });

  const yagmur = await prisma.user.upsert({
    where: { workspaceId_email: { workspaceId: wid, email: "yagmur@reign.partners" } },
    update: {},
    create: {
      workspaceId: wid,
      firstName: "Yagmur",
      lastName: "Demir",
      email: "yagmur@reign.partners",
      passwordHash,
      role: "STANDARD",
      timezone: "Europe/London",
    },
  });

  console.log(`Users ready. Demo password: ${SEED_PASSWORD}`);

  // ---------------------------------------------------------------------
  // Editable taxonomies
  // ---------------------------------------------------------------------
  async function seedLookup<T extends { name: string }>(
    model: { upsert: (args: any) => Promise<any> },
    uniqueField: string,
    rows: T[],
    extra: (row: T) => Record<string, unknown> = () => ({}),
  ) {
    const out: Record<string, any> = {};
    for (const [i, row] of rows.entries()) {
      out[row.name] = await model.upsert({
        where: { [uniqueField]: { workspaceId: wid, name: row.name } },
        update: {},
        create: { workspaceId: wid, name: row.name, displayOrder: i, ...extra(row) },
      });
    }
    return out;
  }

  const investorStrategies = await seedLookup(prisma.investorStrategy, "workspaceId_name", [
    { name: "Buyout" },
    { name: "Growth Equity" },
    { name: "Venture Capital" },
    { name: "Private Credit" },
    { name: "Infrastructure" },
    { name: "Real Estate" },
    { name: "Secondaries" },
    { name: "Fund of Funds" },
    { name: "Impact" },
    { name: "Family Office" },
    { name: "Corporate/Strategic Investor" },
    { name: "Other" },
  ]);

  const ownershipTypes = await seedLookup(prisma.ownershipType, "workspaceId_name", [
    { name: "PE-backed" },
    { name: "VC-backed" },
    { name: "Sponsor-backed, investor unknown" },
    { name: "Privately owned" },
    { name: "Family owned" },
    { name: "Publicly listed" },
    { name: "Corporate subsidiary" },
    { name: "Other" },
  ]);

  const sectorNames = [
    "Business Services",
    "Technology and Software",
    "Industrial and Manufacturing",
    "Consumer and Retail",
    "Healthcare and Life Sciences",
    "Financial Services",
    "Professional Services",
    "Logistics and Distribution",
    "Energy and Infrastructure",
    "Media and Communications",
    "Travel and Hospitality",
    "Other",
  ];
  const sectors: Record<string, any> = {};
  for (const [i, name] of sectorNames.entries()) {
    const existing = await prisma.sector.findFirst({ where: { workspaceId: wid, parentId: null, name } });
    sectors[name] = existing ?? (await prisma.sector.create({ data: { workspaceId: wid, name, displayOrder: i } }));
  }

  const practiceAreas = await seedLookup(prisma.practiceArea, "workspaceId_name", [
    { name: "Finance" },
    { name: "Commercial" },
    { name: "Technology and Data" },
    { name: "Transformation" },
    { name: "Other" },
  ]);

  const financeSpecialismNames = [
    "CFO / Finance Director",
    "VP Finance",
    "Head of Finance",
    "Financial Control",
    "FP&A",
    "Commercial Finance",
    "Business Control",
    "Finance Transformation",
    "Finance Systems / ERP",
    "M&A / Corporate Development",
    "Treasury",
    "Tax",
    "Transaction Services",
    "Interim Finance Leadership",
    "Other Finance",
  ];
  const specialisms: Record<string, any> = {};
  for (const [i, name] of financeSpecialismNames.entries()) {
    specialisms[name] = await prisma.functionalSpecialism.upsert({
      where: { workspaceId_name: { workspaceId: wid, name } },
      update: {},
      create: { workspaceId: wid, name, displayOrder: i, practiceAreaId: practiceAreas["Finance"].id },
    });
  }

  const tagDefs = [
    { name: "VIP", colorToken: "accent" },
    { name: "Warm Relationship", colorToken: "success" },
    { name: "Board Level", colorToken: "info" },
    { name: "Referral Source", colorToken: "info" },
    { name: "Needs Attention", colorToken: "warning" },
  ];
  const tags: Record<string, any> = {};
  for (const t of tagDefs) {
    tags[t.name] = await prisma.tag.upsert({
      where: { workspaceId_name: { workspaceId: wid, name: t.name } },
      update: {},
      create: { workspaceId: wid, name: t.name, colorToken: t.colorToken },
    });
  }

  // ---------------------------------------------------------------------
  // Organisations: Funds
  // ---------------------------------------------------------------------
  async function createOrg(data: Parameters<typeof prisma.organization.create>[0]["data"]) {
    return prisma.organization.create({ data });
  }

  const fundDefs = [
    {
      name: "Ashcombe Capital Partners",
      website: "ashcombecapital.com",
      strategy: "Buyout",
      hqCity: "London",
      hqCountryCode: "GB",
      aum: 2400000000,
      vintage: "Ashcombe Fund IV",
    },
    {
      name: "Solent Growth Partners",
      website: "solentgrowth.com",
      strategy: "Growth Equity",
      hqCity: "London",
      hqCountryCode: "GB",
      aum: 850000000,
      vintage: "Solent Growth Fund II",
    },
    {
      name: "Northgate Private Credit",
      website: "northgatecredit.com",
      strategy: "Private Credit",
      hqCity: "Edinburgh",
      hqCountryCode: "GB",
      aum: 1200000000,
      vintage: "Northgate Credit Fund III",
    },
    {
      name: "Meridian Capital Partners",
      website: "meridiancapital.com",
      strategy: "Buyout",
      hqCity: "New York",
      hqCountryCode: "US",
      aum: 3100000000,
      vintage: "Meridian Fund VI",
    },
  ];

  const funds: Record<string, any> = {};
  for (const f of fundDefs) {
    const org = await createOrg({
      workspaceId: wid,
      name: f.name,
      normalizedName: f.name.toLowerCase(),
      type: "PE_FUND",
      status: "ACTIVE_CLIENT",
      website: `https://www.${f.website}`,
      normalizedWebsiteDomain: f.website,
      linkedinUrl: `https://www.linkedin.com/company/${f.website.split(".")[0]}`,
      hqCity: f.hqCity,
      hqCountryCode: f.hqCountryCode,
      countriesOfOperation: ["GB", "US", "DE", "FR"],
      workingLanguages: ["English"],
      accountPriority: "PRIORITY",
      priorityScore: 7,
      aumAmount: f.aum,
      aumCurrency: "GBP",
      typicalMinEquityChequeAmount: 20000000,
      typicalMinEquityChequeCurrency: "GBP",
      typicalMaxEquityChequeAmount: 150000000,
      typicalMaxEquityChequeCurrency: "GBP",
      typicalMinCompanySize: 50,
      typicalMaxCompanySize: 1500,
      fundVintageOrCurrentFundName: f.vintage,
      fundNotes: `Long-standing Reign relationship; primary contact engaged on finance leadership searches across the ${f.name} portfolio.`,
      relationshipOwnerId: adam.id,
      source: "EXISTING_RELATIONSHIP",
      lastVerifiedAt: daysAgo(14),
      createdById: adam.id,
      investorStrategies: { create: [{ strategyId: investorStrategies[f.strategy].id }] },
    });
    funds[f.name] = org;
  }

  // ---------------------------------------------------------------------
  // Organisations: Portfolio companies
  // ---------------------------------------------------------------------
  const portfolioDefs = [
    {
      name: "Vantage Logistics Group",
      website: "vantagelogisticsgroup.com",
      sector: "Logistics and Distribution",
      classification: "PLATFORM",
      employees: [400, 600],
      investors: [{ fund: "Ashcombe Capital Partners", status: "CURRENT", lead: true, monthsAgo: 30 }],
    },
    {
      name: "Bracken Software Solutions",
      website: "brackensoftware.com",
      sector: "Technology and Software",
      classification: "PLATFORM",
      employees: [120, 200],
      investors: [{ fund: "Solent Growth Partners", status: "CURRENT", lead: true, monthsAgo: 14 }],
    },
    {
      name: "Harrow Industrial Coatings",
      website: "harrowcoatings.com",
      sector: "Industrial and Manufacturing",
      classification: "ADD_ON",
      employees: [250, 400],
      investors: [{ fund: "Ashcombe Capital Partners", status: "CURRENT", lead: true, monthsAgo: 44 }],
    },
    {
      name: "Kestrel Consumer Brands",
      website: "kestrelconsumer.com",
      sector: "Consumer and Retail",
      classification: "PLATFORM",
      employees: [300, 500],
      investors: [{ fund: "Solent Growth Partners", status: "CURRENT", lead: true, monthsAgo: 8 }],
    },
    {
      name: "Meritas Health Diagnostics",
      website: "meritashealth.com",
      sector: "Healthcare and Life Sciences",
      classification: "STANDALONE",
      employees: [180, 260],
      investors: [{ fund: "Northgate Private Credit", status: "CURRENT", lead: true, monthsAgo: 20 }],
    },
    {
      name: "Oakfield Professional Services",
      website: "oakfieldprofessional.com",
      sector: "Professional Services",
      classification: "PLATFORM",
      employees: [220, 350],
      investors: [
        { fund: "Ashcombe Capital Partners", status: "CURRENT", lead: true, monthsAgo: 16 },
        { fund: "Meridian Capital Partners", status: "CURRENT", lead: false, monthsAgo: 16 },
      ],
    },
    {
      name: "Pinnacle Energy Systems",
      website: "pinnacleenergysystems.com",
      sector: "Energy and Infrastructure",
      classification: "PLATFORM",
      employees: [150, 250],
      investors: [{ fund: "Solent Growth Partners", status: "CURRENT", lead: true, monthsAgo: 5 }],
    },
    {
      name: "Ridgeway Media Group",
      website: "ridgewaymedia.com",
      sector: "Media and Communications",
      classification: "STANDALONE",
      employees: [80, 140],
      investors: [{ fund: "Ashcombe Capital Partners", status: "EXITED", lead: true, monthsAgo: 60, exitMonthsAgo: 6 }],
    },
    {
      name: "Stonebridge Travel Group",
      website: "stonebridgetravel.com",
      sector: "Travel and Hospitality",
      classification: "CARVE_OUT",
      employees: [200, 320],
      investors: [{ fund: "Northgate Private Credit", status: "CURRENT", lead: true, monthsAgo: 10 }],
    },
  ] as const;

  const portfolioCos: Record<string, any> = {};
  for (const p of portfolioDefs) {
    const org = await createOrg({
      workspaceId: wid,
      name: p.name,
      normalizedName: p.name.toLowerCase(),
      type: "PORTFOLIO_COMPANY",
      status: "ACTIVE_CLIENT",
      website: `https://www.${p.website}`,
      normalizedWebsiteDomain: p.website,
      linkedinUrl: `https://www.linkedin.com/company/${p.website.split(".")[0]}`,
      hqCity: "London",
      hqCountryCode: "GB",
      countriesOfOperation: ["GB"],
      workingLanguages: ["English"],
      employeeCountMin: p.employees[0],
      employeeCountMax: p.employees[1],
      ownershipTypeId: ownershipTypes["PE-backed"].id,
      portfolioClassification: p.classification,
      businessModelSummary: `${p.name} operates a ${p.sector.toLowerCase()} business serving mid-market clients across the UK and Northern Europe.`,
      investmentThesisSummary: "Buy-and-build platform with a clear operational improvement and bolt-on acquisition thesis.",
      financeTeamSummary: "Lean finance function; historically under-invested relative to the growth plan.",
      hiringProcessSummary: "Hiring decisions typically run through the CEO with sponsor sign-off on senior appointments.",
      accountPriority: "PRIORITY",
      priorityScore: 6,
      relationshipOwnerId: yagmur.id,
      source: "FUND_INTRODUCTION",
      lastVerifiedAt: daysAgo(21),
      createdById: yagmur.id,
      sectors: { create: [{ sectorId: sectors[p.sector].id, isPrimary: true }] },
    });
    portfolioCos[p.name] = org;

    for (const inv of p.investors) {
      await prisma.organizationRelationship.create({
        data: {
          workspaceId: wid,
          sourceOrganizationId: funds[inv.fund].id,
          targetOrganizationId: org.id,
          type: inv.status === "EXITED" ? "FORMER_INVESTOR_IN" : "CURRENT_INVESTOR_IN",
          investmentStatus: inv.status as any,
          investmentDate: monthsAgo(inv.monthsAgo),
          exitDate: "exitMonthsAgo" in inv ? monthsAgo((inv as any).exitMonthsAgo) : null,
          isLeadInvestor: inv.lead,
          investmentAmount: 45000000,
          investmentCurrency: "GBP",
          investmentThesis: "Buy-and-build platform investment with identified value-creation levers.",
          createdById: adam.id,
        },
      });
    }

    if (p.investors.length > 1) {
      // Co-investor relationship between the two funds on Oakfield.
      const [firstInvestor, secondInvestor] = p.investors;
      await prisma.organizationRelationship.create({
        data: {
          workspaceId: wid,
          sourceOrganizationId: funds[firstInvestor!.fund].id,
          targetOrganizationId: funds[secondInvestor!.fund].id,
          type: "CO_INVESTOR_WITH",
          notes: `Co-invested alongside ${secondInvestor!.fund} in ${p.name}.`,
          createdById: adam.id,
        },
      });
    }
  }

  // Other organisations
  const adviserOrg = await createOrg({
    workspaceId: wid,
    name: "Camborne Search Advisory",
    normalizedName: "camborne search advisory",
    type: "ADVISER",
    status: "PROSPECT",
    website: "https://www.camborneadvisory.com",
    normalizedWebsiteDomain: "camborneadvisory.com",
    hqCity: "London",
    hqCountryCode: "GB",
    countriesOfOperation: ["GB"],
    accountPriority: "MONITOR",
    relationshipOwnerId: yagmur.id,
    source: "EVENT",
    createdById: yagmur.id,
  });

  await createOrg({
    workspaceId: wid,
    name: "Thistle Debt Advisory",
    normalizedName: "thistle debt advisory",
    type: "LENDER",
    status: "RESEARCH",
    website: "https://www.thistledebtadvisory.com",
    normalizedWebsiteDomain: "thistledebtadvisory.com",
    hqCity: "Edinburgh",
    hqCountryCode: "GB",
    countriesOfOperation: ["GB"],
    accountPriority: "UNSCORED",
    relationshipOwnerId: yagmur.id,
    source: "OTHER",
    createdById: yagmur.id,
  });

  // Duplicate-risk organisation for merge/detection testing (same domain, similar name).
  const duplicateOrg = await createOrg({
    workspaceId: wid,
    name: "Vantage Logistics Grp Ltd",
    normalizedName: "vantage logistics grp",
    type: "PORTFOLIO_COMPANY",
    status: "RESEARCH",
    website: "https://vantagelogisticsgroup.com",
    normalizedWebsiteDomain: "vantagelogisticsgroup.com",
    hqCity: "London",
    hqCountryCode: "GB",
    source: "OUTBOUND",
    createdById: yagmur.id,
  });
  void duplicateOrg;

  // ---------------------------------------------------------------------
  // People
  // ---------------------------------------------------------------------
  async function createPerson(data: Parameters<typeof prisma.person.create>[0]["data"]) {
    return prisma.person.create({ data });
  }

  // Fund investor contacts (INVESTOR / FUND_SPONSOR-ish)
  const fundContactDefs = [
    { first: "Charles", last: "Ashworth", fund: "Ashcombe Capital Partners", title: "Managing Partner" },
    { first: "Priya", last: "Kapoor", fund: "Ashcombe Capital Partners", title: "Operating Partner" },
    { first: "Fiona", last: "Douglas", fund: "Solent Growth Partners", title: "Partner" },
    { first: "Marcus", last: "Bell", fund: "Solent Growth Partners", title: "Principal" },
    { first: "Elena", last: "Vasquez", fund: "Northgate Private Credit", title: "Managing Director" },
    { first: "Tom", last: "Radcliffe", fund: "Northgate Private Credit", title: "Director" },
    { first: "James", last: "Sutter", fund: "Meridian Capital Partners", title: "Partner" },
    { first: "Lena", last: "Hoffmann", fund: "Meridian Capital Partners", title: "Operating Partner" },
  ];
  const fundContacts: Record<string, any> = {};
  for (const c of fundContactDefs) {
    const person = await createPerson({
      workspaceId: wid,
      firstName: c.first,
      lastName: c.last,
      primaryEmail: `${c.first.toLowerCase()}.${c.last.toLowerCase()}@${fundDefs.find((f) => f.name === c.fund)!.website}`,
      linkedinUrl: `https://www.linkedin.com/in/${c.first.toLowerCase()}-${c.last.toLowerCase()}`,
      city: "London",
      countryCode: "GB",
      languages: ["English"],
      personTypes: c.title.includes("Operating") ? ["INVESTOR", "OPERATING_PARTNER"] : ["INVESTOR"],
      relationshipStatus: "ACTIVE_RELATIONSHIP",
      relationshipOwnerId: adam.id,
      headlineOverride: `${c.title}, ${c.fund}`,
      source: "EXISTING_RELATIONSHIP",
      createdById: adam.id,
    });
    fundContacts[`${c.first} ${c.last}`] = person;
    await prisma.personOrganizationAssociation.create({
      data: {
        personId: person.id,
        organizationId: funds[c.fund].id,
        stakeholderRoles: c.title.includes("Managing") ? ["DECISION_MAKER", "FUND_SPONSOR"] : ["FUND_SPONSOR"],
        isCurrent: true,
        startDate: monthsAgo(36),
        isPrimaryContact: c.title.includes("Managing"),
      },
    });
  }

  // Portfolio company client contacts (CEO / CFO / HR) — CLIENT_CONTACT, some also OPERATING_PARTNER/TALENT_OR_HR
  const clientContactDefs = [
    { first: "Rebecca", last: "Nash", company: "Vantage Logistics Group", title: "Chief Executive Officer", role: "DECISION_MAKER" },
    { first: "Daniel", last: "Osei", company: "Vantage Logistics Group", title: "Group HR Director", role: "HR", talent: true },
    { first: "Sophie", last: "Callahan", company: "Bracken Software Solutions", title: "Chief Executive Officer", role: "DECISION_MAKER" },
    { first: "Harriet", last: "Voss", company: "Harrow Industrial Coatings", title: "Chief Executive Officer", role: "DECISION_MAKER" },
    { first: "Ola", last: "Nilsson", company: "Kestrel Consumer Brands", title: "Chief Operating Officer", role: "BUSINESS_SPONSOR" },
    { first: "Grace", last: "Ferreira", company: "Meritas Health Diagnostics", title: "Chief Executive Officer", role: "DECISION_MAKER" },
    { first: "Ben", last: "Okafor", company: "Oakfield Professional Services", title: "Chief Executive Officer", role: "DECISION_MAKER" },
    { first: "Isla", last: "Mackenzie", company: "Oakfield Professional Services", title: "People Director", role: "HR", talent: true },
    { first: "Ravi", last: "Chandra", company: "Pinnacle Energy Systems", title: "Chief Executive Officer", role: "DECISION_MAKER" },
    { first: "Nadia", last: "Hassan", company: "Stonebridge Travel Group", title: "Chief Executive Officer", role: "DECISION_MAKER" },
  ];
  const clientContacts: Record<string, any> = {};
  for (const c of clientContactDefs) {
    const companyWebsite = portfolioDefs.find((p) => p.name === c.company)!.website;
    const personTypes: any[] = ["CLIENT_CONTACT"];
    if (c.talent) personTypes.push("TALENT_OR_HR");
    const person = await createPerson({
      workspaceId: wid,
      firstName: c.first,
      lastName: c.last,
      primaryEmail: `${c.first.toLowerCase()}.${c.last.toLowerCase()}@${companyWebsite}`,
      linkedinUrl: `https://www.linkedin.com/in/${c.first.toLowerCase()}-${c.last.toLowerCase()}`,
      city: "London",
      countryCode: "GB",
      languages: ["English"],
      personTypes,
      relationshipStatus: "ACTIVE_RELATIONSHIP",
      relationshipOwnerId: yagmur.id,
      headlineOverride: `${c.title}, ${c.company}`,
      currentOrganizationOverrideId: portfolioCos[c.company].id,
      source: "FUND_INTRODUCTION",
      createdById: yagmur.id,
    });
    clientContacts[`${c.first} ${c.last}`] = person;
    await prisma.personOrganizationAssociation.create({
      data: {
        personId: person.id,
        organizationId: portfolioCos[c.company].id,
        stakeholderRoles: [c.role as any],
        isCurrent: true,
        startDate: monthsAgo(24),
        isPrimaryContact: c.role === "DECISION_MAKER",
      },
    });
  }

  // Referrer / adviser people
  const referrer = await createPerson({
    workspaceId: wid,
    firstName: "Oliver",
    lastName: "Pemberton",
    primaryEmail: "oliver.pemberton@camborneadvisory.com",
    city: "London",
    countryCode: "GB",
    languages: ["English"],
    personTypes: ["REFERRER", "ADVISER"],
    relationshipStatus: "ACTIVE_RELATIONSHIP",
    relationshipOwnerId: yagmur.id,
    headlineOverride: "Director, Camborne Search Advisory",
    currentOrganizationOverrideId: adviserOrg.id,
    source: "EVENT",
    createdById: yagmur.id,
  });
  await prisma.personOrganizationAssociation.create({
    data: {
      personId: referrer.id,
      organizationId: adviserOrg.id,
      stakeholderRoles: ["REFERRER"],
      isCurrent: true,
      startDate: monthsAgo(18),
    },
  });

  // ---------------------------------------------------------------------
  // Candidates (people + employment history + candidate profile)
  // ---------------------------------------------------------------------
  const candidateDefs = [
    {
      first: "Laura",
      last: "Bennett",
      title: "Chief Financial Officer",
      seniority: "BOARD_OR_C_SUITE",
      specialism: "CFO / Finance Director",
      employer: "Thornfield Packaging Ltd",
      status: "QUALIFIED",
      rating: "A_STRONG",
      base: 185000,
      peBacked: true,
    },
    {
      first: "Michael",
      last: "Tan",
      title: "Group Financial Controller",
      seniority: "HEAD_OF",
      specialism: "Financial Control",
      employer: "Brightwell Foods Group",
      status: "ENGAGED",
      rating: "A_STRONG",
      base: 130000,
      peBacked: true,
    },
    {
      first: "Amara",
      last: "Okonkwo",
      title: "VP Finance",
      seniority: "DIRECTOR_OR_VP",
      specialism: "VP Finance",
      employer: "Halcyon Digital Media",
      status: "OPEN_TO_MOVE",
      rating: "A_STRONG",
      base: 145000,
      peBacked: true,
    },
    {
      first: "David",
      last: "Krause",
      title: "Head of FP&A",
      seniority: "HEAD_OF",
      specialism: "FP&A",
      employer: "Chalfont Industrial Group",
      status: "PROSPECT",
      rating: "B_RELEVANT",
      base: 115000,
      peBacked: false,
    },
    {
      first: "Nisha",
      last: "Patel",
      title: "Commercial Finance Director",
      seniority: "DIRECTOR_OR_VP",
      specialism: "Commercial Finance",
      employer: "Ferrow Consumer Group",
      status: "QUALIFIED",
      rating: "A_STRONG",
      base: 155000,
      peBacked: true,
    },
    {
      first: "Sam",
      last: "Ogilvie",
      title: "Interim CFO",
      seniority: "CONSULTANT_OR_INTERIM",
      specialism: "Interim Finance Leadership",
      employer: "Various interim mandates",
      status: "OPEN_TO_MOVE",
      rating: "A_STRONG",
      base: 900,
      dayRate: true,
      peBacked: true,
    },
    {
      first: "Katarzyna",
      last: "Wysocki",
      title: "Head of M&A",
      seniority: "HEAD_OF",
      specialism: "M&A / Corporate Development",
      employer: "Redcliffe Capital Advisers",
      status: "CONTACTED",
      rating: "B_RELEVANT",
      base: 140000,
      peBacked: true,
    },
    {
      first: "Joseph",
      last: "Aina",
      title: "Finance Director",
      seniority: "DIRECTOR_OR_VP",
      specialism: "CFO / Finance Director",
      employer: "Milbrook Logistics Plc",
      status: "ENGAGED",
      rating: "A_STRONG",
      base: 150000,
      peBacked: false,
    },
    {
      first: "Chloe",
      last: "Fitzgerald",
      title: "Business Control Manager",
      seniority: "SENIOR_MANAGER",
      specialism: "Business Control",
      employer: "Northolt Engineering Group",
      status: "PROSPECT",
      rating: "C_UNQUALIFIED",
      base: 90000,
      peBacked: false,
    },
    {
      first: "Ahmed",
      last: "Farouk",
      title: "Finance Transformation Director",
      seniority: "DIRECTOR_OR_VP",
      specialism: "Finance Transformation",
      employer: "Solborne Health Group",
      status: "QUALIFIED",
      rating: "B_RELEVANT",
      base: 148000,
      peBacked: true,
    },
    {
      first: "Emily",
      last: "Sharpe",
      title: "Group Treasurer",
      seniority: "HEAD_OF",
      specialism: "Treasury",
      employer: "Wraxall Energy Holdings",
      status: "NOT_LOOKING",
      rating: "B_RELEVANT",
      base: 135000,
      peBacked: false,
    },
    {
      first: "Jonathan",
      last: "Marsh",
      title: "Transaction Services Director",
      seniority: "DIRECTOR_OR_VP",
      specialism: "Transaction Services",
      employer: "Ellerton Advisory Partners",
      status: "OUTREACH_PLANNED",
      rating: "NOT_RATED",
      base: 132000,
      peBacked: true,
    },
  ] as const;

  const candidates: Record<string, any> = {};
  for (const c of candidateDefs) {
    const person = await createPerson({
      workspaceId: wid,
      firstName: c.first,
      lastName: c.last,
      primaryEmail: `${c.first.toLowerCase()}.${c.last.toLowerCase()}@personalmail.example.com`,
      linkedinUrl: `https://www.linkedin.com/in/${c.first.toLowerCase()}-${c.last.toLowerCase()}`,
      city: "London",
      countryCode: "GB",
      languages: ["English"],
      personTypes: ["CANDIDATE"],
      relationshipStatus: "ENGAGED",
      relationshipOwnerId: yagmur.id,
      headlineOverride: `${c.title}, ${c.employer}`,
      source: "DATABASE",
      createdById: yagmur.id,
    });
    candidates[`${c.first} ${c.last}`] = person;

    await prisma.employmentHistory.create({
      data: {
        personId: person.id,
        employerNameFallback: c.employer,
        jobTitle: c.title,
        seniority: c.seniority as any,
        practiceAreaId: practiceAreas["Finance"].id,
        employmentType: "PERMANENT",
        startDate: monthsAgo(38),
        isCurrent: true,
        city: "London",
        countryCode: "GB",
        workArrangement: "HYBRID",
        responsibilities: `Leads the finance function at ${c.employer}, partnering with the executive team on strategy, reporting and commercial decision-making.`,
        peBackedDuringTenure: c.peBacked,
        functionalSpecialisms: { create: [{ specialismId: specialisms[c.specialism].id }] },
      },
    });

    await prisma.candidateProfile.create({
      data: {
        personId: person.id,
        status: c.status as any,
        rating: c.rating as any,
        seniorityValues: [c.seniority as any],
        totalYearsExperience: 14,
        currentBaseAmount: "dayRate" in c && c.dayRate ? null : c.base,
        currentBaseCurrency: "dayRate" in c && c.dayRate ? null : "GBP",
        currentDayRateAmount: "dayRate" in c && c.dayRate ? c.base : null,
        currentDayRateCurrency: "dayRate" in c && c.dayRate ? "GBP" : null,
        expectedBaseAmount: "dayRate" in c && c.dayRate ? null : Math.round(c.base * 1.08),
        expectedBaseCurrency: "dayRate" in c && c.dayRate ? null : "GBP",
        employmentPreferences: "dayRate" in c && c.dayRate ? ["INTERIM", "FRACTIONAL"] : ["PERMANENT"],
        noticePeriodValue: 3,
        noticePeriodUnit: "months",
        preferredCountries: ["GB"],
        workArrangementPreferences: ["HYBRID", "FLEXIBLE"],
        willRelocate: false,
        careerSummary: `${c.title} with a strong track record in ${c.peBacked ? "PE-backed" : "privately owned"} businesses, known for building high-performing finance teams and driving commercial value.`,
        motivation: "Seeking a platform-scale role with genuine equity upside and board exposure.",
        consentStatus: "GRANTED",
        legalBasis: "CONSENT",
        consentRequestedDate: monthsAgo(4),
        consentGrantedDate: monthsAgo(4),
        retentionReviewDate: daysFromNow(300),
        lastQualifiedAt: c.status === "QUALIFIED" || c.status === "ENGAGED" ? daysAgo(20) : null,
        qualifiedById: c.status === "QUALIFIED" || c.status === "ENGAGED" ? yagmur.id : null,
        practiceAreas: { create: [{ practiceAreaId: practiceAreas["Finance"].id }] },
        functionalSpecialisms: { create: [{ specialismId: specialisms[c.specialism].id }] },
        sectorExperience: { create: [{ sectorId: sectors["Business Services"].id }] },
      },
    });
  }

  // Duplicate-risk candidate for merge/detection testing (similar name, no email clash).
  const duplicatePerson = await createPerson({
    workspaceId: wid,
    firstName: "Laura",
    lastName: "Bennet",
    city: "London",
    countryCode: "GB",
    personTypes: ["CANDIDATE"],
    relationshipStatus: "RESEARCH_ONLY",
    headlineOverride: "CFO (possible duplicate of Laura Bennett)",
    source: "LINKEDIN",
    createdById: yagmur.id,
  });
  void duplicatePerson;

  console.log(`Created ${Object.keys(candidates).length} candidates, ${Object.keys(clientContacts).length + Object.keys(fundContacts).length} contacts.`);

  // ---------------------------------------------------------------------
  // Opportunities (one per stage, including WON -> converted to mandate)
  // ---------------------------------------------------------------------
  async function createOpportunity(data: Parameters<typeof prisma.opportunity.create>[0]["data"]) {
    const opp = await prisma.opportunity.create({ data });
    await prisma.opportunityStageHistory.create({
      data: {
        opportunityId: opp.id,
        toStage: opp.stage,
        changedById: (data.createdById as string) ?? adam.id,
        notes: "Opportunity created.",
      },
    });
    return opp;
  }

  const wonOpportunity = await createOpportunity({
    workspaceId: wid,
    name: "Vantage Logistics Group — CFO Search",
    hiringOrganizationId: portfolioCos["Vantage Logistics Group"].id,
    type: "RETAINED_SEARCH",
    stage: "WON",
    stageProbabilityDefault: 100,
    potentialRoleTitle: "Chief Financial Officer",
    practiceAreaId: practiceAreas["Finance"].id,
    source: "FUND_INTRODUCTION",
    sourcePersonId: fundContacts["Charles Ashworth"].id,
    leadContactPersonId: clientContacts["Rebecca Nash"].id,
    ownerId: adam.id,
    estimatedFeeAmount: 55500,
    estimatedFeeCurrency: "GBP",
    expectedDecisionDate: daysAgo(10),
    nextStepSummary: "Converted to mandate — see linked mandate for live pipeline.",
    closedAt: daysAgo(35),
    createdById: adam.id,
    relatedFunds: { create: [{ organizationId: funds["Ashcombe Capital Partners"].id }] },
    functionalSpecialisms: { create: [{ specialismId: specialisms["CFO / Finance Director"].id }] },
    stakeholders: {
      create: [
        { personId: clientContacts["Rebecca Nash"].id, role: "DECISION_MAKER" },
        { personId: fundContacts["Charles Ashworth"].id, role: "FUND_SPONSOR" },
      ],
    },
  });

  const opportunityStageDefs = [
    { stage: "SIGNAL_IDENTIFIED", company: "Stonebridge Travel Group", role: "VP Finance", contact: "Nadia Hassan", fund: "Northgate Private Credit" },
    { stage: "CONTACT_IDENTIFIED", company: "Pinnacle Energy Systems", role: "Head of FP&A", contact: "Ravi Chandra", fund: "Solent Growth Partners" },
    { stage: "CONTACTED", company: "Meritas Health Diagnostics", role: "Financial Controller", contact: "Grace Ferreira", fund: "Northgate Private Credit" },
    { stage: "DISCOVERY_ARRANGED", company: "Kestrel Consumer Brands", role: "Commercial Finance Director", contact: "Ola Nilsson", fund: "Solent Growth Partners" },
    {
      stage: "PROPOSAL_OR_TERMS",
      company: "Harrow Industrial Coatings",
      role: "Interim Finance Director",
      contact: "Harriet Voss",
      fund: "Ashcombe Capital Partners",
      isProbabilityOverridden: true,
      probabilityOverride: 75,
    },
    {
      stage: "LOST",
      company: "Bracken Software Solutions",
      role: "Head of Business Control",
      contact: "Sophie Callahan",
      fund: "Solent Growth Partners",
      lossReason: "INTERNAL_HIRE",
      lossExplanation: "Client promoted an internal candidate into the role before terms were signed.",
    },
    {
      stage: "ON_HOLD",
      company: "Oakfield Professional Services",
      role: "Head of Tax",
      contact: "Ben Okafor",
      fund: "Ashcombe Capital Partners",
      onHoldReason: "Budget for the role is under review following Q3 board meeting.",
    },
  ] as const;

  for (const o of opportunityStageDefs) {
    await createOpportunity({
      workspaceId: wid,
      name: `${o.company} — ${o.role}`,
      hiringOrganizationId: portfolioCos[o.company].id,
      type: "CONTINGENT",
      stage: o.stage,
      stageProbabilityDefault:
        { SIGNAL_IDENTIFIED: 5, CONTACT_IDENTIFIED: 10, CONTACTED: 15, DISCOVERY_ARRANGED: 25, QUALIFIED: 40, PROPOSAL_OR_TERMS: 65, WON: 100, LOST: 0, ON_HOLD: 25 }[o.stage],
      probabilityOverride: "probabilityOverride" in o ? o.probabilityOverride : null,
      isProbabilityOverridden: "isProbabilityOverridden" in o ? o.isProbabilityOverridden : false,
      potentialRoleTitle: o.role,
      practiceAreaId: practiceAreas["Finance"].id,
      source: "EXISTING_RELATIONSHIP",
      leadContactPersonId: clientContacts[o.contact].id,
      ownerId: yagmur.id,
      estimatedFeeAmount: 38000,
      estimatedFeeCurrency: "GBP",
      expectedDecisionDate: daysFromNow(30),
      nextStepSummary: "Awaiting client availability for discovery call.",
      lossReason: "lossReason" in o ? o.lossReason : null,
      lossExplanation: "lossExplanation" in o ? o.lossExplanation : null,
      onHoldReason: "onHoldReason" in o ? o.onHoldReason : null,
      closedAt: o.stage === "LOST" ? daysAgo(5) : null,
      createdById: yagmur.id,
      relatedFunds: { create: [{ organizationId: funds[o.fund].id }] },
    });
  }

  // ---------------------------------------------------------------------
  // Mandates
  // ---------------------------------------------------------------------
  async function createMandate(data: Parameters<typeof prisma.mandate.create>[0]["data"]) {
    const mandate = await prisma.mandate.create({ data });
    await prisma.mandateStatusHistory.create({
      data: {
        mandateId: mandate.id,
        toStatus: mandate.status,
        changedById: (data.createdById as string) ?? adam.id,
        notes: "Mandate opened.",
      },
    });
    return mandate;
  }

  const mandate1 = await createMandate({
    workspaceId: wid,
    reference: "R-2026-0001",
    title: "Chief Financial Officer",
    hiringOrganizationId: portfolioCos["Vantage Logistics Group"].id,
    sourceOpportunityId: wonOpportunity.id,
    status: "INTERVIEWING",
    priority: "CRITICAL",
    confidentiality: "OPEN",
    ownerId: adam.id,
    hiringManagerPersonId: clientContacts["Rebecca Nash"].id,
    internalTalentPersonId: clientContacts["Daniel Osei"].id,
    practiceAreaId: practiceAreas["Finance"].id,
    seniority: "BOARD_OR_C_SUITE",
    employmentType: "PERMANENT",
    numberOfHires: 1,
    city: "London",
    countryCode: "GB",
    workArrangement: "HYBRID",
    relocationSupport: false,
    visaSponsorship: false,
    roleSummary: "Lead the finance function through the next phase of buy-and-build growth, reporting to the CEO with direct board exposure.",
    businessContext: "The business has completed two bolt-on acquisitions in the last 18 months and needs a CFO who can professionalise reporting and lead further M&A.",
    requiredExperience: "Previous CFO or strong FD experience in a PE-backed, multi-site logistics or industrial business.",
    assessmentCriteria: "PE experience, M&A integration experience, gravitas with the investment committee.",
    minBaseAmount: 170000,
    maxBaseAmount: 195000,
    baseCurrency: "GBP",
    bonusInformation: "Up to 40% bonus plus meaningful equity participation.",
    equityInformation: "1.5–2.5% equity pool allocation subject to board approval.",
    engagementModel: "RETAINED",
    feeType: "PERCENTAGE_OF_TOTAL_CASH",
    feePercentage: 30,
    paymentTermsDays: 30,
    exclusivity: true,
    exclusivityExpiryDate: daysFromNow(60),
    guaranteeValue: 6,
    guaranteeUnit: "months",
    signedTerms: true,
    termsSignedDate: daysAgo(34),
    startDate: daysFromNow(75),
    targetLonglistDate: daysAgo(20),
    targetShortlistDate: daysAgo(5),
    targetCompletionDate: daysFromNow(45),
    createdById: adam.id,
    relatedFunds: { create: [{ organizationId: funds["Ashcombe Capital Partners"].id }] },
    functionalSpecialisms: { create: [{ specialismId: specialisms["CFO / Finance Director"].id }] },
    stakeholders: {
      create: [
        { personId: clientContacts["Rebecca Nash"].id, role: "DECISION_MAKER" },
        { personId: clientContacts["Daniel Osei"].id, role: "HR" },
        { personId: fundContacts["Charles Ashworth"].id, role: "FUND_SPONSOR" },
      ],
    },
    assignedUsers: { create: [{ userId: yagmur.id }] },
  });

  await prisma.opportunity.update({ where: { id: wonOpportunity.id }, data: { wonMandateId: mandate1.id } });

  const mandate2 = await createMandate({
    workspaceId: wid,
    reference: "R-2026-0002",
    title: "VP Finance",
    hiringOrganizationId: portfolioCos["Bracken Software Solutions"].id,
    status: "SEARCH_ACTIVE",
    priority: "HIGH",
    confidentiality: "OPEN",
    ownerId: yagmur.id,
    hiringManagerPersonId: clientContacts["Sophie Callahan"].id,
    practiceAreaId: practiceAreas["Finance"].id,
    seniority: "DIRECTOR_OR_VP",
    employmentType: "PERMANENT",
    numberOfHires: 1,
    city: "London",
    countryCode: "GB",
    workArrangement: "HYBRID",
    roleSummary: "Own financial planning and investor reporting for a fast-growing SaaS platform.",
    businessContext: "ARR has doubled in 18 months; the finance function needs to scale ahead of a future process.",
    minBaseAmount: 130000,
    maxBaseAmount: 150000,
    baseCurrency: "GBP",
    engagementModel: "EXCLUSIVE_CONTINGENT",
    feeType: "PERCENTAGE_OF_BASE",
    feePercentage: 25,
    paymentTermsDays: 30,
    exclusivity: true,
    exclusivityExpiryDate: daysFromNow(30),
    signedTerms: true,
    termsSignedDate: daysAgo(12),
    targetShortlistDate: daysFromNow(14),
    targetCompletionDate: daysFromNow(60),
    createdById: yagmur.id,
    relatedFunds: { create: [{ organizationId: funds["Solent Growth Partners"].id }] },
    functionalSpecialisms: { create: [{ specialismId: specialisms["VP Finance"].id }] },
    stakeholders: { create: [{ personId: clientContacts["Sophie Callahan"].id, role: "DECISION_MAKER" }] },
  });

  const mandate3 = await createMandate({
    workspaceId: wid,
    reference: "R-2026-0003",
    title: "Interim Finance Director",
    hiringOrganizationId: portfolioCos["Harrow Industrial Coatings"].id,
    status: "LONGLISTING",
    priority: "HIGH",
    confidentiality: "OPEN",
    ownerId: yagmur.id,
    hiringManagerPersonId: clientContacts["Harriet Voss"].id,
    practiceAreaId: practiceAreas["Finance"].id,
    seniority: "DIRECTOR_OR_VP",
    employmentType: "INTERIM",
    numberOfHires: 1,
    city: "Birmingham",
    countryCode: "GB",
    workArrangement: "ON_SITE",
    roleSummary: "Cover a planned parental leave and lead a finance systems migration in the interim.",
    minDayRateAmount: 850,
    maxDayRateAmount: 1050,
    dayRateCurrency: "GBP",
    engagementModel: "INTERIM",
    feeType: "DAY_RATE_MARGIN",
    dayRateMarginPercentage: 18,
    paymentTermsDays: 14,
    signedTerms: true,
    termsSignedDate: daysAgo(6),
    targetLonglistDate: daysFromNow(3),
    targetCompletionDate: daysFromNow(21),
    createdById: yagmur.id,
    relatedFunds: { create: [{ organizationId: funds["Ashcombe Capital Partners"].id }] },
    functionalSpecialisms: { create: [{ specialismId: specialisms["Interim Finance Leadership"].id }] },
    stakeholders: { create: [{ personId: clientContacts["Harriet Voss"].id, role: "DECISION_MAKER" }] },
  });

  const mandate4 = await createMandate({
    workspaceId: wid,
    reference: "R-2026-0004",
    title: "Group Finance Director",
    hiringOrganizationId: portfolioCos["Oakfield Professional Services"].id,
    status: "OFFER",
    priority: "CRITICAL",
    confidentiality: "HIGHLY_CONFIDENTIAL",
    ownerId: adam.id,
    hiringManagerPersonId: clientContacts["Ben Okafor"].id,
    internalTalentPersonId: clientContacts["Isla Mackenzie"].id,
    practiceAreaId: practiceAreas["Finance"].id,
    seniority: "DIRECTOR_OR_VP",
    employmentType: "PERMANENT",
    numberOfHires: 1,
    city: "London",
    countryCode: "GB",
    workArrangement: "HYBRID",
    roleSummary: "Replace the outgoing FD ahead of a confidential sale process; discretion is essential.",
    minBaseAmount: 145000,
    maxBaseAmount: 165000,
    baseCurrency: "GBP",
    engagementModel: "RETAINED",
    feeType: "PERCENTAGE_OF_BASE",
    feePercentage: 28,
    paymentTermsDays: 30,
    exclusivity: true,
    signedTerms: true,
    termsSignedDate: daysAgo(50),
    targetCompletionDate: daysFromNow(10),
    createdById: adam.id,
    relatedFunds: { create: [{ organizationId: funds["Ashcombe Capital Partners"].id }, { organizationId: funds["Meridian Capital Partners"].id }] },
    functionalSpecialisms: { create: [{ specialismId: specialisms["CFO / Finance Director"].id }] },
    stakeholders: { create: [{ personId: clientContacts["Ben Okafor"].id, role: "DECISION_MAKER" }] },
    assignedUsers: { create: [{ userId: adam.id }] },
  });

  const mandate5 = await createMandate({
    workspaceId: wid,
    reference: "R-2025-0098",
    title: "Head of FP&A",
    hiringOrganizationId: portfolioCos["Kestrel Consumer Brands"].id,
    status: "FILLED",
    priority: "NORMAL",
    confidentiality: "OPEN",
    ownerId: yagmur.id,
    hiringManagerPersonId: clientContacts["Ola Nilsson"].id,
    practiceAreaId: practiceAreas["Finance"].id,
    seniority: "HEAD_OF",
    employmentType: "PERMANENT",
    numberOfHires: 1,
    city: "Manchester",
    countryCode: "GB",
    workArrangement: "HYBRID",
    roleSummary: "Build out the FP&A function ahead of a planned refinancing.",
    minBaseAmount: 105000,
    maxBaseAmount: 120000,
    baseCurrency: "GBP",
    engagementModel: "CONTINGENT",
    feeType: "PERCENTAGE_OF_BASE",
    feePercentage: 22,
    paymentTermsDays: 30,
    signedTerms: true,
    termsSignedDate: monthsAgo(3),
    startDate: daysAgo(14),
    filledDate: daysAgo(30),
    targetCompletionDate: daysAgo(30),
    createdById: yagmur.id,
    relatedFunds: { create: [{ organizationId: funds["Solent Growth Partners"].id }] },
    functionalSpecialisms: { create: [{ specialismId: specialisms["FP&A"].id }] },
    stakeholders: { create: [{ personId: clientContacts["Ola Nilsson"].id, role: "DECISION_MAKER" }] },
  });

  // ---------------------------------------------------------------------
  // Candidate processes, interviews, offer, placement
  // ---------------------------------------------------------------------
  async function createProcess(
    mandateId: string,
    candidatePersonId: string,
    stage: string,
    extra: Record<string, unknown> = {},
  ) {
    const process = await prisma.candidateProcess.create({
      data: {
        workspaceId: wid,
        mandateId,
        candidatePersonId,
        stage: stage as any,
        source: "DATABASE",
        addedById: yagmur.id,
        ownerId: yagmur.id,
        overallScore: 4,
        functionalFitScore: 4,
        peExperienceScore: 4,
        sectorFitScore: 3,
        motivationScore: 4,
        compensationFitScore: 4,
        locationFitScore: 5,
        assessmentSummary: "Strong technical fit with relevant PE-backed experience; well regarded by the client on paper.",
        candidateInterest: "High — actively engaged and responsive.",
        ...extra,
      } as any,
    });
    await prisma.candidateProcessStageHistory.create({
      data: {
        candidateProcessId: process.id,
        toStage: process.stage,
        changedById: yagmur.id,
        notes: "Process created.",
      },
    });
    return process;
  }

  // Mandate 1 (Vantage CFO) — full pipeline including a placement.
  const proc1Placed = await createProcess(mandate1.id, candidates["Laura Bennett"].id, "PLACED", {
    submissionSummary: "Laura brings 6 years of PE-backed CFO experience in logistics, including a successful platform sale.",
    candidatePermissionToSubmit: true,
    candidatePermissionCapturedAt: daysAgo(28),
    compensationExpectation: "£185k base, seeking meaningful equity participation.",
    availabilityForMandate: "3 months' notice.",
    clientFeedback: "Unanimously the strongest candidate on the shortlist; board approved the offer.",
    submittedAt: daysAgo(28),
    placedAt: daysAgo(2),
  });
  const proc1Interview1 = await prisma.interview.create({
    data: {
      candidateProcessId: proc1Placed.id,
      type: "RECRUITER_SCREEN",
      roundNumber: 1,
      scheduledStart: daysAgo(25),
      scheduledEnd: daysAgo(25),
      outcome: "COMPLETED_PROGRESS",
      internalNotes: "Strong communicator, clear on motivation for the move.",
      createdById: yagmur.id,
      internalParticipants: { create: [{ userId: yagmur.id }] },
    },
  });
  void proc1Interview1;
  await prisma.interview.create({
    data: {
      candidateProcessId: proc1Placed.id,
      type: "CLIENT_INTERVIEW",
      roundNumber: 2,
      scheduledStart: daysAgo(18),
      scheduledEnd: daysAgo(18),
      outcome: "COMPLETED_PROGRESS",
      clientFeedback: "CEO very impressed; keen to move to final stage quickly.",
      createdById: yagmur.id,
      internalParticipants: { create: [{ userId: yagmur.id }] },
      externalParticipants: { create: [{ personId: clientContacts["Rebecca Nash"].id }] },
    },
  });
  await prisma.interview.create({
    data: {
      candidateProcessId: proc1Placed.id,
      type: "PRESENTATION",
      roundNumber: 3,
      scheduledStart: daysAgo(10),
      scheduledEnd: daysAgo(10),
      outcome: "COMPLETED_PROGRESS",
      clientFeedback: "Board presentation landed well; unanimous support to proceed to offer.",
      createdById: adam.id,
      internalParticipants: { create: [{ userId: adam.id }] },
      externalParticipants: {
        create: [{ personId: clientContacts["Rebecca Nash"].id }, { personId: fundContacts["Charles Ashworth"].id }],
      },
    },
  });
  const proc1Offer = await prisma.offer.create({
    data: {
      candidateProcessId: proc1Placed.id,
      status: "ACCEPTED",
      offerDate: daysAgo(6),
      expiryDate: daysAgo(1),
      baseAmount: 190000,
      baseCurrency: "GBP",
      bonusPercentage: 40,
      equityDetails: "2% equity pool allocation, 4-year vesting with 1-year cliff.",
      proposedStartDate: daysFromNow(75),
      candidateResponseDate: daysAgo(4),
      notes: "Accepted without negotiation on base; equity terms confirmed by the board.",
      createdById: adam.id,
    },
  });
  await prisma.placement.create({
    data: {
      candidateProcessId: proc1Placed.id,
      mandateId: mandate1.id,
      candidatePersonId: candidates["Laura Bennett"].id,
      hiringOrganizationId: portfolioCos["Vantage Logistics Group"].id,
      acceptedOfferId: proc1Offer.id,
      placementDate: daysAgo(2),
      startDate: daysFromNow(75),
      employmentType: "PERMANENT",
      agreedBaseAmount: 190000,
      agreedBaseCurrency: "GBP",
      feeAmount: Math.round(190000 * 1.4 * 0.3),
      feeCurrency: "GBP",
      guaranteeEndDate: (() => {
        const d = daysFromNow(75);
        d.setMonth(d.getMonth() + 6);
        return d;
      })(),
      status: "PLANNED_START",
      createdById: adam.id,
    },
  });

  const proc1Interviewing = await createProcess(mandate1.id, candidates["Michael Tan"].id, "FINAL_INTERVIEW", {
    submissionSummary: "Michael offers strong group controllership experience but less direct CFO exposure than Laura.",
    candidatePermissionToSubmit: true,
    candidatePermissionCapturedAt: daysAgo(24),
    submittedAt: daysAgo(24),
  });
  await prisma.interview.create({
    data: {
      candidateProcessId: proc1Interviewing.id,
      type: "CLIENT_INTERVIEW",
      roundNumber: 1,
      scheduledStart: daysFromNow(2),
      timezone: "Europe/London",
      locationOrLink: "Vantage HQ, London",
      outcome: "SCHEDULED",
      createdById: yagmur.id,
      internalParticipants: { create: [{ userId: yagmur.id }] },
      externalParticipants: { create: [{ personId: clientContacts["Rebecca Nash"].id }] },
    },
  });

  await createProcess(mandate1.id, candidates["Joseph Aina"].id, "REJECTED", {
    rejectionReason: "SENIORITY",
    rejectionExplanation: "Client felt Joseph's experience skewed more FD than CFO-ready for a board-facing role.",
    rejectedAt: daysAgo(15),
  });
  await createProcess(mandate1.id, candidates["Ahmed Farouk"].id, "SUBMITTED", {
    submissionSummary: "Strong transformation background; slightly light on pure logistics sector exposure.",
    candidatePermissionToSubmit: true,
    candidatePermissionCapturedAt: daysAgo(9),
    submittedAt: daysAgo(9),
  });
  await createProcess(mandate1.id, candidates["Sam Ogilvie"].id, "LONGLISTED");
  await createProcess(mandate1.id, candidates["Nisha Patel"].id, "SOURCED");

  // Mandate 2 (Bracken VP Finance)
  await createProcess(mandate2.id, candidates["Amara Okonkwo"].id, "CLIENT_REVIEW", {
    submissionSummary: "Excellent SaaS metrics fluency and investor reporting experience.",
    candidatePermissionToSubmit: true,
    candidatePermissionCapturedAt: daysAgo(5),
    submittedAt: daysAgo(5),
  });
  await createProcess(mandate2.id, candidates["Katarzyna Wysocki"].id, "CONTACTED");
  await createProcess(mandate2.id, candidates["Jonathan Marsh"].id, "WITHDRAWN", {
    withdrawalReason: "ACCEPTED_OTHER_ROLE",
    withdrawalExplanation: "Accepted a counteroffer from their current employer.",
    withdrawnAt: daysAgo(3),
  });

  // Mandate 3 (Harrow Interim FD)
  await createProcess(mandate3.id, candidates["Sam Ogilvie"].id, "INTERESTED");
  await createProcess(mandate3.id, candidates["David Krause"].id, "CONTACT_REQUIRED");

  // Mandate 4 (Oakfield Group FD, highly confidential) — near-offer
  const proc4 = await createProcess(mandate4.id, candidates["Nisha Patel"].id, "OFFER", {
    submissionSummary: "Confidential process — candidate briefed on discretion requirements.",
    candidatePermissionToSubmit: true,
    candidatePermissionCapturedAt: daysAgo(20),
    submittedAt: daysAgo(20),
  });
  await prisma.offer.create({
    data: {
      candidateProcessId: proc4.id,
      status: "MADE",
      offerDate: daysAgo(2),
      expiryDate: daysFromNow(5),
      baseAmount: 158000,
      baseCurrency: "GBP",
      bonusPercentage: 20,
      proposedStartDate: daysFromNow(45),
      notes: "Verbal offer made; written contract in preparation.",
      createdById: adam.id,
    },
  });

  // Mandate 5 (Kestrel Head of FP&A) — already filled, historical process.
  const proc5 = await createProcess(mandate5.id, candidates["David Krause"].id, "PLACED", {
    submissionSummary: "Strong FP&A build-out experience in a comparable consumer business.",
    candidatePermissionToSubmit: true,
    candidatePermissionCapturedAt: daysAgo(60),
    submittedAt: daysAgo(60),
    placedAt: daysAgo(30),
  });
  const proc5Offer = await prisma.offer.create({
    data: {
      candidateProcessId: proc5.id,
      status: "ACCEPTED",
      offerDate: daysAgo(35),
      baseAmount: 118000,
      baseCurrency: "GBP",
      proposedStartDate: daysAgo(14),
      candidateResponseDate: daysAgo(33),
      createdById: yagmur.id,
    },
  });
  await prisma.placement.create({
    data: {
      candidateProcessId: proc5.id,
      mandateId: mandate5.id,
      candidatePersonId: candidates["David Krause"].id,
      hiringOrganizationId: portfolioCos["Kestrel Consumer Brands"].id,
      acceptedOfferId: proc5Offer.id,
      placementDate: daysAgo(30),
      startDate: daysAgo(14),
      employmentType: "PERMANENT",
      agreedBaseAmount: 118000,
      agreedBaseCurrency: "GBP",
      feeAmount: Math.round(118000 * 0.22),
      feeCurrency: "GBP",
      guaranteeEndDate: daysFromNow(166),
      status: "STARTED",
      createdById: yagmur.id,
    },
  });
  // David Krause's candidate profile reflects the placement.
  await prisma.candidateProfile.update({
    where: { personId: candidates["David Krause"].id },
    data: { status: "PLACED" },
  });

  // ---------------------------------------------------------------------
  // Off-limits restrictions
  // ---------------------------------------------------------------------
  await prisma.offLimitsRestriction.create({
    data: {
      workspaceId: wid,
      organizationId: portfolioCos["Vantage Logistics Group"].id,
      type: "ACTIVE_CLIENT",
      severity: "WARNING",
      reason: "Active retained client — sourcing employees from this organisation requires a heads-up to the relationship owner.",
      startDate: monthsAgo(30),
      createdById: adam.id,
    },
  });
  await prisma.offLimitsRestriction.create({
    data: {
      workspaceId: wid,
      organizationId: portfolioCos["Kestrel Consumer Brands"].id,
      personId: candidates["David Krause"].id,
      mandateId: mandate5.id,
      type: "PLACEMENT_GUARANTEE",
      severity: "BLOCK",
      reason: "David Krause was placed at Kestrel Consumer Brands within the last 6 months — off-limits for the duration of the placement guarantee.",
      startDate: daysAgo(30),
      endDate: daysFromNow(166),
      createdById: adam.id,
    },
  });

  // ---------------------------------------------------------------------
  // Intelligence items
  // ---------------------------------------------------------------------
  const intel1 = await prisma.intelligenceItem.create({
    data: {
      workspaceId: wid,
      title: "Pinnacle Energy Systems CFO understood to be exploring exit",
      organizationId: portfolioCos["Pinnacle Energy Systems"].id,
      type: "LEADERSHIP_CHANGE",
      details: "Contact at the business suggested the current CFO has been interviewing externally over the past month.",
      sourcePersonId: referrer.id,
      dateReceived: daysAgo(6),
      confidence: "PARTIALLY_VERIFIED",
      commercialRelevance: "HIGH",
      confidentiality: "INTERNAL",
      ownerId: yagmur.id,
      followUpRequired: true,
      createdById: yagmur.id,
      relatedFunds: { create: [{ organizationId: funds["Solent Growth Partners"].id }] },
    },
  });
  void intel1;

  await prisma.intelligenceItem.create({
    data: {
      workspaceId: wid,
      title: "Meridian Capital Partners raising new buyout fund",
      organizationId: funds["Meridian Capital Partners"].id,
      type: "ACQUISITION",
      details: "Meridian is reportedly closing Fund VII at $1.2bn in Q1, likely to accelerate platform acquisitions.",
      dateReceived: daysAgo(2),
      confidence: "UNVERIFIED",
      commercialRelevance: "MEDIUM",
      confidentiality: "INTERNAL",
      ownerId: adam.id,
      followUpRequired: false,
      createdById: adam.id,
    },
  });

  const intel3 = await prisma.intelligenceItem.create({
    data: {
      workspaceId: wid,
      title: "Stonebridge Travel Group finance team under-resourced ahead of peak season",
      organizationId: portfolioCos["Stonebridge Travel Group"].id,
      type: "FINANCE_TEAM_WEAKNESS",
      details: "CEO mentioned in passing that the finance team is stretched and a VP Finance hire has been discussed internally but not yet approved.",
      sourcePersonId: clientContacts["Nadia Hassan"].id,
      dateReceived: daysAgo(1),
      confidence: "VERIFIED",
      commercialRelevance: "IMMEDIATE",
      confidentiality: "INTERNAL",
      ownerId: yagmur.id,
      followUpRequired: true,
      createdById: yagmur.id,
    },
  });

  // ---------------------------------------------------------------------
  // Tasks
  // ---------------------------------------------------------------------
  async function createTask(data: Parameters<typeof prisma.task.create>[0]["data"]) {
    return prisma.task.create({ data });
  }

  await createTask({
    workspaceId: wid,
    title: "Prep board presentation debrief call",
    type: "MEETING",
    status: "TODO",
    priority: "URGENT",
    assignedUserId: adam.id,
    createdById: adam.id,
    dueDate: new Date(),
    relatedRecordType: "CANDIDATE_PROCESS",
    relatedRecordId: proc1Placed.id,
    mandates: { create: [{ mandateId: mandate1.id }] },
    candidateProcesses: { create: [{ candidateProcessId: proc1Placed.id }] },
  });

  await createTask({
    workspaceId: wid,
    title: "Chase Bracken CEO for client-review feedback",
    type: "FOLLOW_UP",
    status: "TODO",
    priority: "HIGH",
    assignedUserId: yagmur.id,
    createdById: yagmur.id,
    dueDate: daysAgo(2),
    relatedRecordType: "MANDATE",
    relatedRecordId: mandate2.id,
    mandates: { create: [{ mandateId: mandate2.id }] },
    organizations: { create: [{ organizationId: portfolioCos["Bracken Software Solutions"].id }] },
  });

  await createTask({
    workspaceId: wid,
    title: "Follow up on Pinnacle CFO exit signal",
    type: "RESEARCH",
    status: "TODO",
    priority: "HIGH",
    assignedUserId: yagmur.id,
    createdById: yagmur.id,
    dueDate: daysFromNow(1),
    relatedRecordType: "INTELLIGENCE_ITEM",
    relatedRecordId: intel1.id,
    intelligenceItems: { create: [{ intelligenceItemId: intel1.id }] },
    organizations: { create: [{ organizationId: portfolioCos["Pinnacle Energy Systems"].id }] },
  });

  await createTask({
    workspaceId: wid,
    title: "Schedule intro call with Stonebridge CEO re: VP Finance need",
    type: "CALL",
    status: "TODO",
    priority: "URGENT",
    assignedUserId: yagmur.id,
    createdById: yagmur.id,
    dueDate: daysFromNow(2),
    relatedRecordType: "INTELLIGENCE_ITEM",
    relatedRecordId: intel3.id,
    intelligenceItems: { create: [{ intelligenceItemId: intel3.id }] },
    people: { create: [{ personId: clientContacts["Nadia Hassan"].id }] },
  });

  await createTask({
    workspaceId: wid,
    title: "Placement guarantee check-in with David Krause",
    type: "CALL",
    status: "TODO",
    priority: "NORMAL",
    assignedUserId: yagmur.id,
    createdById: yagmur.id,
    dueDate: daysFromNow(20),
    relatedRecordType: "CANDIDATE_PROCESS",
    relatedRecordId: proc5.id,
    people: { create: [{ personId: candidates["David Krause"].id }] },
    mandates: { create: [{ mandateId: mandate5.id }] },
  });

  await createTask({
    workspaceId: wid,
    title: "Send Vantage board pack ahead of AGM",
    type: "ADMIN",
    status: "COMPLETED",
    priority: "NORMAL",
    assignedUserId: adam.id,
    createdById: adam.id,
    dueDate: daysAgo(5),
    completedAt: daysAgo(5),
    completionNote: "Sent via secure data room.",
    organizations: { create: [{ organizationId: portfolioCos["Vantage Logistics Group"].id }] },
  });

  // ---------------------------------------------------------------------
  // Activities
  // ---------------------------------------------------------------------
  await prisma.activity.create({
    data: {
      workspaceId: wid,
      type: "CALL",
      direction: "OUTBOUND",
      outcome: "CONNECTED",
      subject: "Debrief with Rebecca Nash post board presentation",
      occurredAt: daysAgo(9),
      durationMinutes: 30,
      summary: "Client confirmed board unanimously backed Laura's appointment; agreed next steps on offer.",
      createdById: adam.id,
      assignedOwnerId: adam.id,
      people: { create: [{ personId: clientContacts["Rebecca Nash"].id }] },
      mandates: { create: [{ mandateId: mandate1.id }] },
      candidateProcesses: { create: [{ candidateProcessId: proc1Placed.id }] },
    },
  });

  await prisma.activity.create({
    data: {
      workspaceId: wid,
      type: "MEETING",
      direction: "NOT_APPLICABLE",
      outcome: "COMPLETED",
      subject: "Quarterly relationship review with Ashcombe Capital Partners",
      occurredAt: daysAgo(14),
      durationMinutes: 60,
      summary: "Reviewed active mandates across the Ashcombe portfolio and discussed pipeline for H2.",
      createdById: adam.id,
      assignedOwnerId: adam.id,
      people: { create: [{ personId: fundContacts["Charles Ashworth"].id }] },
      organizations: { create: [{ organizationId: funds["Ashcombe Capital Partners"].id }] },
    },
  });

  await prisma.activity.create({
    data: {
      workspaceId: wid,
      type: "LINKEDIN_MESSAGE",
      direction: "OUTBOUND",
      outcome: "REPLIED",
      subject: "Outreach to Katarzyna Wysocki re: Bracken VP Finance",
      occurredAt: daysAgo(4),
      summary: "Shared role overview; candidate keen to hear more, call scheduled for next week.",
      createdById: yagmur.id,
      assignedOwnerId: yagmur.id,
      people: { create: [{ personId: candidates["Katarzyna Wysocki"].id }] },
      mandates: { create: [{ mandateId: mandate2.id }] },
    },
  });

  await prisma.activity.create({
    data: {
      workspaceId: wid,
      type: "NOTE",
      direction: "INTERNAL",
      subject: "Stonebridge finance team signal captured",
      occurredAt: daysAgo(1),
      summary: "Logged intelligence on Stonebridge finance team gap after informal conversation with Nadia Hassan.",
      createdById: yagmur.id,
      assignedOwnerId: yagmur.id,
      people: { create: [{ personId: clientContacts["Nadia Hassan"].id }] },
      organizations: { create: [{ organizationId: portfolioCos["Stonebridge Travel Group"].id }] },
      intelligenceItems: { create: [{ intelligenceItemId: intel3.id }] },
    },
  });

  // ---------------------------------------------------------------------
  // Tags on a few records
  // ---------------------------------------------------------------------
  await prisma.tagOnOrganization.create({ data: { tagId: tags["VIP"].id, organizationId: funds["Ashcombe Capital Partners"].id } });
  await prisma.tagOnOrganization.create({ data: { tagId: tags["Warm Relationship"].id, organizationId: portfolioCos["Vantage Logistics Group"].id } });
  await prisma.tagOnPerson.create({ data: { tagId: tags["Board Level"].id, personId: candidates["Laura Bennett"].id } });
  await prisma.tagOnPerson.create({ data: { tagId: tags["Referral Source"].id, personId: referrer.id } });
  await prisma.tagOnMandate.create({ data: { tagId: tags["Needs Attention"].id, mandateId: mandate4.id } });

  // ---------------------------------------------------------------------
  // Documents (metadata only — local storage provider)
  // ---------------------------------------------------------------------
  const cvDoc = await prisma.document.create({
    data: {
      workspaceId: wid,
      originalFilename: "laura-bennett-cv-2026.pdf",
      displayName: "Laura Bennett — CV (current)",
      mimeType: "application/pdf",
      size: 182_340,
      storageKey: "seed/documents/laura-bennett-cv-2026.pdf",
      category: "CV",
      versionNumber: 2,
      isCurrentVersion: true,
      uploadedById: yagmur.id,
      people: { create: [{ personId: candidates["Laura Bennett"].id }] },
    },
  });
  await prisma.candidateProcess.update({ where: { id: proc1Placed.id }, data: { submittedCvDocumentId: cvDoc.id } });
  await prisma.documentCandidateProcess.create({ data: { documentId: cvDoc.id, candidateProcessId: proc1Placed.id } });

  await prisma.document.create({
    data: {
      workspaceId: wid,
      originalFilename: "vantage-cfo-job-description.docx",
      displayName: "Vantage Logistics — CFO Job Description",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      size: 54_112,
      storageKey: "seed/documents/vantage-cfo-job-description.docx",
      category: "JOB_DESCRIPTION",
      uploadedById: adam.id,
      mandates: { create: [{ mandateId: mandate1.id }] },
    },
  });

  await prisma.document.create({
    data: {
      workspaceId: wid,
      originalFilename: "vantage-terms-of-business-signed.pdf",
      displayName: "Vantage Logistics — Signed Terms of Business",
      mimeType: "application/pdf",
      size: 98_765,
      storageKey: "seed/documents/vantage-terms-of-business-signed.pdf",
      category: "TERMS",
      restricted: true,
      uploadedById: adam.id,
      mandates: { create: [{ mandateId: mandate1.id }] },
      organizations: { create: [{ organizationId: portfolioCos["Vantage Logistics Group"].id }] },
    },
  });

  // ---------------------------------------------------------------------
  // Custom field definition example
  // ---------------------------------------------------------------------
  await prisma.customFieldDefinition.create({
    data: {
      workspaceId: wid,
      label: "LinkedIn Recruiter Tag",
      entityType: "PERSON",
      fieldType: "TEXT",
      required: false,
      displayOrder: 0,
    },
  });

  // ---------------------------------------------------------------------
  // Saved views (shared, per spec section 15)
  // ---------------------------------------------------------------------
  async function savedView(name: string, entityType: any, filterJson: unknown, columnJson: unknown = []) {
    await prisma.savedView.create({
      data: { workspaceId: wid, name, entityType, shared: true, filterJson: filterJson as any, columnJson: columnJson as any },
    });
  }

  await savedView("Priority Portfolio Companies", "ORGANIZATION", { type: "PORTFOLIO_COMPANY", accountPriority: "PRIORITY" });
  await savedView("Portfolio Companies Without Investor", "ORGANIZATION", { type: "PORTFOLIO_COMPANY", hasInvestor: false });
  await savedView("Funds With Active Portfolio", "ORGANIZATION", { type: "PE_FUND", hasCurrentPortfolio: true });
  await savedView("Organisations With No Stakeholder", "ORGANIZATION", { hasStakeholder: false });
  await savedView("Organisations With No Next Task", "ORGANIZATION", { hasNextTask: false });
  await savedView("Stale Priority Organisations", "ORGANIZATION", { accountPriority: "PRIORITY", stale: true });

  await savedView("Qualified Candidates", "PERSON", { personType: "CANDIDATE", candidateStatus: "QUALIFIED" });
  await savedView("Open to Move", "PERSON", { personType: "CANDIDATE", candidateStatus: "OPEN_TO_MOVE" });
  await savedView("Candidates Requiring Follow-up", "PERSON", { personType: "CANDIDATE", needsFollowUp: true });
  await savedView("Candidates Without Current Employment", "PERSON", { personType: "CANDIDATE", noCurrentEmployment: true });
  await savedView("Investors and Operating Partners", "PERSON", { personTypeIn: ["INVESTOR", "OPERATING_PARTNER"] });
  await savedView("Client Decision-makers", "PERSON", { stakeholderRole: "DECISION_MAKER" });
  await savedView("Do Not Contact", "PERSON", { doNotContact: true });

  await savedView("Active Pipeline", "OPPORTUNITY", { excludeStages: ["WON", "LOST"] });
  await savedView("My Opportunities", "OPPORTUNITY", { ownerId: "$currentUser" });
  await savedView("No Next Action", "OPPORTUNITY", { hasNextTask: false });
  await savedView("Stale Opportunities", "OPPORTUNITY", { stale: true });
  await savedView("Closing This Month", "OPPORTUNITY", { expectedDecisionThisMonth: true });
  await savedView("On Hold", "OPPORTUNITY", { stage: "ON_HOLD" });
  await savedView("Lost", "OPPORTUNITY", { stage: "LOST" });

  await savedView("Active Mandates", "MANDATE", { excludeStatuses: ["FILLED", "CANCELLED"] });
  await savedView("My Mandates", "MANDATE", { ownerId: "$currentUser" });
  await savedView("Confidential Mandates", "MANDATE", { confidentiality: ["CONFIDENTIAL", "HIGHLY_CONFIDENTIAL"] });
  await savedView("Overdue Shortlists", "MANDATE", { overdueShortlist: true });
  await savedView("Interviewing", "MANDATE", { status: "INTERVIEWING" });
  await savedView("Offer Stage", "MANDATE", { status: "OFFER" });
  await savedView("Filled This Quarter", "MANDATE", { status: "FILLED", filledThisQuarter: true });

  await savedView("Due Today", "TASK", { due: "today" });
  await savedView("Overdue", "TASK", { due: "overdue" });
  await savedView("Upcoming Seven Days", "TASK", { due: "next7days" });
  await savedView("Unassigned", "TASK", { unassigned: true });
  await savedView("Completed This Week", "TASK", { status: "COMPLETED", completedThisWeek: true });

  await savedView("High and Immediate Relevance", "INTELLIGENCE", { commercialRelevance: ["HIGH", "IMMEDIATE"] });
  await savedView("Unverified", "INTELLIGENCE", { confidence: "UNVERIFIED" });
  await savedView("Follow-up Required", "INTELLIGENCE", { followUpRequired: true });
  await savedView("Converted to Opportunity", "INTELLIGENCE", { converted: true });

  console.log("Seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
