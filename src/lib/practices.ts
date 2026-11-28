/**
 * Round 5 Part B — the four practices from reign.partners, and each
 * practice's role titles grouped exactly as on its practice page. Kept in
 * one file so a later Settings screen can edit the lists without touching
 * code elsewhere. Stored on people (can be more than one), opportunities
 * and mandates (one each) via the existing PracticeArea table (Part C found
 * it already wired up from an earlier round) — PRACTICE_LABEL's values are
 * exactly the four PracticeArea.name rows seeded for every workspace, so
 * practiceFromAreaName/areaNameForPractice below are the only bridge code
 * needed between a selected PracticeArea and this file's role-title groups.
 */
export const PRACTICES = ["FINANCE", "COMMERCIAL", "TECHNOLOGY_DATA", "TRANSFORMATION"] as const;
export type Practice = (typeof PRACTICES)[number];

export const PRACTICE_LABEL: Record<Practice, string> = {
  FINANCE: "Finance",
  COMMERCIAL: "Commercial",
  TECHNOLOGY_DATA: "Technology & Data",
  TRANSFORMATION: "Transformation",
};

/** The PracticeArea.name for a given practice — identical to PRACTICE_LABEL today, kept as its own name so call sites read as intent, not a label lookup. */
export function areaNameForPractice(practice: Practice): string {
  return PRACTICE_LABEL[practice];
}

/** The practice matching a PracticeArea's name, if it's one of the four (not "Other" or a custom one). */
export function practiceFromAreaName(areaName: string): Practice | undefined {
  return PRACTICES.find((practice) => PRACTICE_LABEL[practice] === areaName);
}

export type RoleGroup = { group: string; titles: string[] };

/** Appears at the end of every practice's role list. */
export const BOARD_AND_CEO_GROUP: RoleGroup = {
  group: "Board and CEO",
  titles: ["Chief Executive Officer", "Non-executive Chair", "Non-executive Director"],
};

const PRACTICE_OWN_ROLE_GROUPS: Record<Practice, RoleGroup[]> = {
  FINANCE: [
    {
      group: "Finance leadership",
      titles: ["Chief Financial Officer", "Group CFO", "Finance Director", "Interim CFO", "Head of Finance"],
    },
    {
      group: "Control, reporting and treasury",
      titles: ["Group Financial Controller", "Financial Controller", "Head of Financial Reporting", "Head of Tax", "Head of Treasury"],
    },
    {
      group: "Strategic finance",
      titles: ["Head of FP&A", "Commercial Finance Director", "Head of Business Control", "Corporate Development Director", "M&A Director"],
    },
  ],
  TECHNOLOGY_DATA: [
    {
      group: "Technology leadership",
      titles: ["Chief Technology Officer", "Chief Product Officer", "Technology Director", "Product Director", "Head of Product"],
    },
    {
      group: "Engineering, platform and security",
      titles: ["Engineering Director", "Head of Engineering", "Head of Software Development", "Head of Platform", "Head of Information Security"],
    },
    {
      group: "Data, analytics and AI",
      titles: ["Chief Data Officer", "Data Director", "Head of Data Engineering", "Head of Analytics", "Head of AI & Data Science"],
    },
  ],
  COMMERCIAL: [
    {
      group: "Commercial leadership",
      titles: ["Chief Commercial Officer", "Chief Revenue Officer", "Managing Director", "Commercial Director", "Country Manager"],
    },
    {
      group: "Sales and customer growth",
      titles: ["Sales Director", "Head of Sales", "Regional Sales Director", "Head of Business Development", "Head of Customer Success"],
    },
    {
      group: "Marketing and growth",
      titles: ["Chief Marketing Officer", "Marketing Director", "Head of Growth", "Head of Revenue Operations", "Head of Partnerships"],
    },
  ],
  TRANSFORMATION: [
    {
      group: "Transformation leadership",
      titles: ["Chief Transformation Officer", "Chief Operating Officer", "Transformation Director", "Operating Partner", "Programme Director"],
    },
    {
      group: "Operations and value creation",
      titles: ["Operations Director", "Director of Operational Excellence", "Head of Performance Improvement", "Procurement Director", "Supply Chain Director"],
    },
    {
      group: "Integration and change",
      titles: ["Integration Director", "Head of Post-Merger Integration", "Change Director", "PMO Director", "HR Director"],
    },
  ],
};

/** A practice's full role-picker list: its own three groups, then Board and CEO. */
export function roleGroupsForPractice(practice: Practice): RoleGroup[] {
  return [...PRACTICE_OWN_ROLE_GROUPS[practice], BOARD_AND_CEO_GROUP];
}

/** Every title across every practice, flattened, for a free-text fallback search. */
export function allRoleTitles(): string[] {
  const titles = new Set<string>();
  for (const practice of PRACTICES) {
    for (const group of roleGroupsForPractice(practice)) {
      for (const title of group.titles) titles.add(title);
    }
  }
  return [...titles];
}
