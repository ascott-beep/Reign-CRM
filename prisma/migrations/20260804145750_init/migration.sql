-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'STANDARD', 'READ_ONLY');

-- CreateEnum
CREATE TYPE "OrganizationType" AS ENUM ('PE_FUND', 'PORTFOLIO_COMPANY', 'OTHER_COMPANY', 'ADVISER', 'LENDER', 'OTHER');

-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM ('RESEARCH', 'TARGET', 'PROSPECT', 'ACTIVE_CLIENT', 'DORMANT', 'DO_NOT_CONTACT', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "OrganizationRelationshipType" AS ENUM ('CURRENT_INVESTOR_IN', 'FORMER_INVESTOR_IN', 'CO_INVESTOR_WITH', 'PARENT_OF', 'SUBSIDIARY_OF', 'ADVISER_TO', 'LENDER_TO', 'PARTNER_OF', 'OTHER');

-- CreateEnum
CREATE TYPE "InvestmentStatus" AS ENUM ('ANNOUNCED', 'CURRENT', 'PARTIALLY_EXITED', 'EXITED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "PortfolioClassification" AS ENUM ('PLATFORM', 'ADD_ON', 'STANDALONE', 'CARVE_OUT', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "InvestmentStage" AS ENUM ('NEWLY_ACQUIRED', 'EARLY_HOLD', 'MID_HOLD', 'LATE_HOLD', 'EXIT_ANNOUNCED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "AccountPriority" AS ENUM ('PRIORITY', 'DEVELOP', 'MONITOR', 'UNSCORED');

-- CreateEnum
CREATE TYPE "PersonType" AS ENUM ('CANDIDATE', 'CLIENT_CONTACT', 'INVESTOR', 'OPERATING_PARTNER', 'TALENT_OR_HR', 'REFERRER', 'ADVISER', 'OTHER');

-- CreateEnum
CREATE TYPE "PersonRelationshipStatus" AS ENUM ('RESEARCH_ONLY', 'OUTREACH_PLANNED', 'CONTACTED', 'ENGAGED', 'ACTIVE_RELATIONSHIP', 'DORMANT', 'DO_NOT_CONTACT', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "StakeholderRole" AS ENUM ('DECISION_MAKER', 'HIRING_MANAGER', 'BUSINESS_SPONSOR', 'INFLUENCER', 'INTERNAL_TALENT', 'HR', 'PROCUREMENT_OR_TERMS', 'FUND_SPONSOR', 'REFERRER', 'OTHER', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "Seniority" AS ENUM ('BOARD_OR_C_SUITE', 'N_MINUS_1', 'DIRECTOR_OR_VP', 'HEAD_OF', 'SENIOR_MANAGER', 'MANAGER', 'INDIVIDUAL_CONTRIBUTOR', 'CONSULTANT_OR_INTERIM', 'OTHER');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('PERMANENT', 'INTERIM', 'FRACTIONAL', 'FIXED_TERM', 'CONTRACT');

-- CreateEnum
CREATE TYPE "WorkArrangement" AS ENUM ('ON_SITE', 'HYBRID', 'REMOTE', 'FLEXIBLE');

-- CreateEnum
CREATE TYPE "CandidateStatus" AS ENUM ('PROSPECT', 'OUTREACH_PLANNED', 'CONTACTED', 'ENGAGED', 'QUALIFIED', 'OPEN_TO_MOVE', 'NOT_LOOKING', 'UNAVAILABLE', 'PLACED', 'DORMANT', 'DO_NOT_CONTACT', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CandidateRating" AS ENUM ('A_STRONG', 'B_RELEVANT', 'C_UNQUALIFIED', 'D_NOT_RELEVANT', 'NOT_RATED');

-- CreateEnum
CREATE TYPE "ConsentStatus" AS ENUM ('NOT_REQUESTED', 'REQUESTED', 'GRANTED', 'WITHDRAWN', 'EXPIRED', 'NOT_REQUIRED');

-- CreateEnum
CREATE TYPE "LegalBasis" AS ENUM ('CONSENT', 'LEGITIMATE_INTEREST', 'CONTRACT', 'LEGAL_OBLIGATION', 'NOT_SET');

-- CreateEnum
CREATE TYPE "OpportunityType" AS ENUM ('RETAINED_SEARCH', 'EXCLUSIVE_CONTINGENT', 'CONTINGENT', 'INTERIM_ASSIGNMENT', 'TALENT_MAPPING', 'ADVISORY', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "OpportunityStage" AS ENUM ('SIGNAL_IDENTIFIED', 'CONTACT_IDENTIFIED', 'CONTACTED', 'DISCOVERY_ARRANGED', 'QUALIFIED', 'PROPOSAL_OR_TERMS', 'WON', 'LOST', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "OpportunitySource" AS ENUM ('CANDIDATE_INTELLIGENCE', 'REFERRAL', 'FUND_INTRODUCTION', 'CLIENT_INBOUND', 'OUTBOUND', 'EXISTING_RELATIONSHIP', 'WEBSITE_INBOUND', 'LINKEDIN', 'EVENT', 'OTHER');

-- CreateEnum
CREATE TYPE "OpportunityLossReason" AS ENUM ('NO_REQUIREMENT', 'TIMING', 'INTERNAL_HIRE', 'EXISTING_SUPPLIER', 'COMPETITOR_SELECTED', 'TERMS_OR_FEE', 'ROLE_CANCELLED', 'NO_RESPONSE', 'OUTSIDE_SCOPE', 'OTHER');

-- CreateEnum
CREATE TYPE "MandateStatus" AS ENUM ('BRIEF_RECEIVED', 'SEARCH_ACTIVE', 'LONGLISTING', 'SHORTLISTING', 'INTERVIEWING', 'OFFER', 'FILLED', 'CANCELLED', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "MandatePriority" AS ENUM ('CRITICAL', 'HIGH', 'NORMAL', 'LOW');

-- CreateEnum
CREATE TYPE "EngagementModel" AS ENUM ('RETAINED', 'EXCLUSIVE_CONTINGENT', 'CONTINGENT', 'INTERIM', 'OTHER');

-- CreateEnum
CREATE TYPE "FeeType" AS ENUM ('PERCENTAGE_OF_BASE', 'PERCENTAGE_OF_TOTAL_CASH', 'FIXED_FEE', 'DAY_RATE_MARGIN', 'OTHER');

-- CreateEnum
CREATE TYPE "MandateConfidentiality" AS ENUM ('OPEN', 'CONFIDENTIAL', 'HIGHLY_CONFIDENTIAL');

-- CreateEnum
CREATE TYPE "CandidateProcessStage" AS ENUM ('SOURCED', 'LONGLISTED', 'CONTACT_REQUIRED', 'CONTACTED', 'INTERESTED', 'QUALIFIED', 'SUBMITTED', 'CLIENT_REVIEW', 'FIRST_INTERVIEW', 'FURTHER_INTERVIEW', 'FINAL_INTERVIEW', 'OFFER', 'PLACED', 'ON_HOLD', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "CandidateProcessSource" AS ENUM ('DATABASE', 'LINKEDIN', 'REFERRAL', 'DIRECT_APPLICANT', 'RESEARCH', 'CLIENT_SUGGESTION', 'FUND_SUGGESTION', 'OTHER');

-- CreateEnum
CREATE TYPE "ProcessRejectionReason" AS ENUM ('FUNCTIONAL_FIT', 'SECTOR_FIT', 'PE_EXPERIENCE', 'SENIORITY', 'COMPENSATION', 'LOCATION', 'AVAILABILITY', 'CULTURAL_FIT', 'CLIENT_PREFERENCE', 'ROLE_CHANGED', 'NO_RESPONSE', 'OTHER');

-- CreateEnum
CREATE TYPE "WithdrawalReason" AS ENUM ('ACCEPTED_OTHER_ROLE', 'COUNTEROFFER', 'COMPENSATION', 'LOCATION', 'TIMING', 'LOST_INTEREST', 'PERSONAL_CIRCUMSTANCES', 'CONCERNS_ABOUT_COMPANY', 'OTHER');

-- CreateEnum
CREATE TYPE "InterviewType" AS ENUM ('RECRUITER_SCREEN', 'CLIENT_INTERVIEW', 'CASE_STUDY', 'PRESENTATION', 'ASSESSMENT', 'INFORMAL_MEETING', 'OTHER');

-- CreateEnum
CREATE TYPE "InterviewOutcome" AS ENUM ('SCHEDULED', 'COMPLETED_PROGRESS', 'COMPLETED_HOLD', 'COMPLETED_REJECT', 'CANDIDATE_WITHDREW', 'CANCELLED', 'RESCHEDULED', 'AWAITING_FEEDBACK');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('PLANNED', 'MADE', 'NEGOTIATING', 'ACCEPTED', 'DECLINED', 'WITHDRAWN', 'LAPSED');

-- CreateEnum
CREATE TYPE "PlacementStatus" AS ENUM ('PLANNED_START', 'STARTED', 'GUARANTEE_COMPLETE', 'FELL_THROUGH', 'LEFT_IN_GUARANTEE');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('CALL', 'EMAIL', 'MEETING', 'LINKEDIN_MESSAGE', 'WHATSAPP', 'NOTE', 'INTERVIEW', 'INTERNAL_UPDATE', 'SYSTEM_EVENT', 'OTHER');

-- CreateEnum
CREATE TYPE "ActivityDirection" AS ENUM ('INBOUND', 'OUTBOUND', 'INTERNAL', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "ActivityOutcome" AS ENUM ('CONNECTED', 'NO_ANSWER', 'VOICEMAIL', 'REPLIED', 'NO_REPLY', 'MEETING_BOOKED', 'FOLLOW_UP_REQUIRED', 'NOT_INTERESTED', 'DO_NOT_CONTACT', 'COMPLETED', 'OTHER');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('CALL', 'EMAIL', 'LINKEDIN', 'RESEARCH', 'FOLLOW_UP', 'MEETING', 'INTERVIEW', 'ADMIN', 'OTHER');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('URGENT', 'HIGH', 'NORMAL', 'LOW');

-- CreateEnum
CREATE TYPE "RelatedRecordType" AS ENUM ('ORGANIZATION', 'PERSON', 'OPPORTUNITY', 'MANDATE', 'CANDIDATE_PROCESS', 'INTELLIGENCE_ITEM', 'PLACEMENT', 'INTERVIEW', 'OFFER');

-- CreateEnum
CREATE TYPE "IntelligenceType" AS ENUM ('LEADERSHIP_CHANGE', 'POTENTIAL_VACANCY', 'ACTIVE_VACANCY', 'ACQUISITION', 'INTEGRATION', 'CARVE_OUT', 'TRANSFORMATION', 'INTERNATIONAL_EXPANSION', 'EXIT_PREPARATION', 'REFINANCING', 'FINANCE_TEAM_WEAKNESS', 'FAILED_SEARCH', 'AGENCY_DISSATISFACTION', 'CANDIDATE_MOVEMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "IntelligenceConfidence" AS ENUM ('UNVERIFIED', 'PARTIALLY_VERIFIED', 'VERIFIED');

-- CreateEnum
CREATE TYPE "CommercialRelevance" AS ENUM ('NONE', 'LOW', 'MEDIUM', 'HIGH', 'IMMEDIATE');

-- CreateEnum
CREATE TYPE "IntelligenceConfidentiality" AS ENUM ('INTERNAL', 'RESTRICTED');

-- CreateEnum
CREATE TYPE "OffLimitsType" AS ENUM ('ACTIVE_CLIENT', 'CONTRACTUAL', 'PLACEMENT_GUARANTEE', 'MANDATE_SPECIFIC', 'INTERNAL_DECISION', 'OTHER');

-- CreateEnum
CREATE TYPE "OffLimitsSeverity" AS ENUM ('WARNING', 'BLOCK');

-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('CV', 'JOB_DESCRIPTION', 'TERMS', 'PROPOSAL', 'INTERVIEW_NOTES', 'OTHER');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'ARCHIVE', 'RESTORE', 'STAGE_CHANGE', 'CONVERSION', 'EXPORT', 'PRIVACY_ACTION', 'OFF_LIMITS_OVERRIDE');

-- CreateEnum
CREATE TYPE "CustomFieldType" AS ENUM ('TEXT', 'LONG_TEXT', 'NUMBER', 'CURRENCY', 'DATE', 'BOOLEAN', 'SINGLE_SELECT', 'MULTI_SELECT', 'URL');

-- CreateEnum
CREATE TYPE "CustomFieldEntityType" AS ENUM ('ORGANIZATION', 'PERSON', 'CANDIDATE_PROFILE', 'OPPORTUNITY', 'MANDATE');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('TASK_ASSIGNED', 'TASK_DUE_TODAY', 'TASK_OVERDUE', 'INTERVIEW_SCHEDULED', 'INTERVIEW_CHANGED', 'ASSIGNED_TO_RECORD', 'PROCESS_OFFER', 'PROCESS_PLACED', 'INTELLIGENCE_HIGH_PRIORITY', 'OTHER');

-- CreateEnum
CREATE TYPE "SavedViewEntityType" AS ENUM ('ORGANIZATION', 'PERSON', 'OPPORTUNITY', 'MANDATE', 'TASK', 'INTELLIGENCE');

-- CreateEnum
CREATE TYPE "ImportEntityType" AS ENUM ('ORGANIZATION', 'PERSON');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('PENDING', 'VALIDATING', 'READY', 'IMPORTING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "defaultCurrency" VARCHAR(3) NOT NULL DEFAULT 'GBP',
    "defaultTimezone" TEXT NOT NULL DEFAULT 'Europe/London',
    "brandAccent" TEXT NOT NULL DEFAULT '#1C2B4A',
    "staleThresholds" JSONB NOT NULL DEFAULT '{"personDays":60,"priorityOrgDays":60,"opportunityDays":14,"candidateProcessDays":7}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'STANDARD',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "avatarUrl" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/London',
    "notificationPreferences" JSONB NOT NULL DEFAULT '{}',
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestorStrategy" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "InvestorStrategy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OwnershipType" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "OwnershipType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sector" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "parentId" TEXT,

    CONSTRAINT "Sector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticeArea" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PracticeArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FunctionalSpecialism" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "practiceAreaId" TEXT,

    CONSTRAINT "FunctionalSpecialism_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "type" "OrganizationType" NOT NULL,
    "status" "OrganizationStatus" NOT NULL DEFAULT 'RESEARCH',
    "website" TEXT,
    "normalizedWebsiteDomain" TEXT,
    "linkedinUrl" TEXT,
    "hqCity" TEXT,
    "hqRegion" TEXT,
    "hqCountryCode" VARCHAR(2),
    "countriesOfOperation" TEXT[],
    "ownershipTypeId" TEXT,
    "employeeCountMin" INTEGER,
    "employeeCountMax" INTEGER,
    "employeeCountExact" INTEGER,
    "revenueAmount" DECIMAL(16,2),
    "revenueCurrency" VARCHAR(3),
    "workingLanguages" TEXT[],
    "description" TEXT,
    "internalSummary" TEXT,
    "accountPriority" "AccountPriority" NOT NULL DEFAULT 'UNSCORED',
    "priorityScore" INTEGER,
    "priorityScoreFlags" JSONB,
    "priorityScoreExplanation" TEXT,
    "relationshipOwnerId" TEXT,
    "source" TEXT,
    "sourceUrl" TEXT,
    "lastResearchedAt" TIMESTAMP(3),
    "lastVerifiedAt" TIMESTAMP(3),
    "aumAmount" DECIMAL(18,2),
    "aumCurrency" VARCHAR(3),
    "typicalMinEquityChequeAmount" DECIMAL(16,2),
    "typicalMinEquityChequeCurrency" VARCHAR(3),
    "typicalMaxEquityChequeAmount" DECIMAL(16,2),
    "typicalMaxEquityChequeCurrency" VARCHAR(3),
    "typicalMinCompanySize" INTEGER,
    "typicalMaxCompanySize" INTEGER,
    "fundVintageOrCurrentFundName" TEXT,
    "fundNotes" TEXT,
    "portfolioClassification" "PortfolioClassification",
    "businessModelSummary" TEXT,
    "investmentThesisSummary" TEXT,
    "valueCreationThemes" TEXT[],
    "acquisitionStrategySummary" TEXT,
    "likelyExitWindow" TEXT,
    "financeTeamSummary" TEXT,
    "hiringProcessSummary" TEXT,
    "agencyUsageSummary" TEXT,
    "investmentStageOverride" "InvestmentStage",
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationInvestorStrategy" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,

    CONSTRAINT "OrganizationInvestorStrategy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationSector" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sectorId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "OrganizationSector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationRelationship" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "sourceOrganizationId" TEXT NOT NULL,
    "targetOrganizationId" TEXT NOT NULL,
    "type" "OrganizationRelationshipType" NOT NULL,
    "investmentStatus" "InvestmentStatus",
    "announcementDate" TIMESTAMP(3),
    "investmentDate" TIMESTAMP(3),
    "exitDate" TIMESTAMP(3),
    "ownershipPercentage" DECIMAL(5,2),
    "isLeadInvestor" BOOLEAN NOT NULL DEFAULT false,
    "investmentAmount" DECIMAL(16,2),
    "investmentCurrency" VARCHAR(3),
    "sourceUrl" TEXT,
    "investmentThesis" TEXT,
    "valueCreationThemes" TEXT[],
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "OrganizationRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT NOT NULL,
    "preferredName" TEXT,
    "pronouns" TEXT,
    "primaryEmail" TEXT,
    "secondaryEmail" TEXT,
    "primaryPhone" TEXT,
    "secondaryPhone" TEXT,
    "linkedinUrl" TEXT,
    "city" TEXT,
    "region" TEXT,
    "countryCode" VARCHAR(2),
    "languages" TEXT[],
    "personTypes" "PersonType"[],
    "relationshipStatus" "PersonRelationshipStatus" NOT NULL DEFAULT 'RESEARCH_ONLY',
    "relationshipOwnerId" TEXT,
    "headlineOverride" TEXT,
    "currentOrganizationOverrideId" TEXT,
    "source" TEXT,
    "sourcePersonId" TEXT,
    "sourceUrl" TEXT,
    "summary" TEXT,
    "contactPreferences" TEXT,
    "doNotContact" BOOLEAN NOT NULL DEFAULT false,
    "doNotContactReason" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonOrganizationAssociation" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "stakeholderRoles" "StakeholderRole"[],
    "relationshipDescription" TEXT,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "isPrimaryContact" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonOrganizationAssociation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmploymentHistory" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "organizationId" TEXT,
    "employerNameFallback" TEXT,
    "jobTitle" TEXT NOT NULL,
    "seniority" "Seniority",
    "practiceAreaId" TEXT,
    "employmentType" "EmploymentType",
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "city" TEXT,
    "region" TEXT,
    "countryCode" VARCHAR(2),
    "workArrangement" "WorkArrangement",
    "reportingLineDescription" TEXT,
    "teamSize" INTEGER,
    "geographicScope" TEXT,
    "responsibilities" TEXT,
    "achievements" TEXT,
    "peBackedDuringTenure" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmploymentHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmploymentHistorySpecialism" (
    "id" TEXT NOT NULL,
    "employmentHistoryId" TEXT NOT NULL,
    "specialismId" TEXT NOT NULL,

    CONSTRAINT "EmploymentHistorySpecialism_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmploymentHistoryInvestor" (
    "id" TEXT NOT NULL,
    "employmentHistoryId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "relatedPersonId" TEXT,

    CONSTRAINT "EmploymentHistoryInvestor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateProfile" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "status" "CandidateStatus" NOT NULL DEFAULT 'PROSPECT',
    "rating" "CandidateRating" NOT NULL DEFAULT 'NOT_RATED',
    "seniorityValues" "Seniority"[],
    "peBackedExperienceSummary" TEXT,
    "totalYearsExperience" INTEGER,
    "currentBaseAmount" DECIMAL(14,2),
    "currentBaseCurrency" VARCHAR(3),
    "currentBonusAmount" DECIMAL(14,2),
    "currentBonusPercentage" DECIMAL(5,2),
    "currentTotalCashAmount" DECIMAL(14,2),
    "currentTotalCashCurrency" VARCHAR(3),
    "expectedBaseAmount" DECIMAL(14,2),
    "expectedBaseCurrency" VARCHAR(3),
    "expectedTotalCashAmount" DECIMAL(14,2),
    "expectedTotalCashCurrency" VARCHAR(3),
    "currentDayRateAmount" DECIMAL(10,2),
    "currentDayRateCurrency" VARCHAR(3),
    "expectedDayRateAmount" DECIMAL(10,2),
    "expectedDayRateCurrency" VARCHAR(3),
    "employmentPreferences" "EmploymentType"[],
    "noticePeriodValue" INTEGER,
    "noticePeriodUnit" TEXT,
    "availabilityDate" TIMESTAMP(3),
    "preferredCountries" TEXT[],
    "preferredRegions" TEXT[],
    "preferredCities" TEXT[],
    "workArrangementPreferences" "WorkArrangement"[],
    "willRelocate" BOOLEAN,
    "travelTolerance" TEXT,
    "rightToWorkCountries" TEXT[],
    "visaSponsorshipNotes" TEXT,
    "careerSummary" TEXT,
    "keyAchievements" TEXT,
    "motivation" TEXT,
    "targetRoleDescription" TEXT,
    "companyPreferences" TEXT,
    "excludedCompanies" TEXT,
    "lastQualifiedAt" TIMESTAMP(3),
    "qualifiedById" TEXT,
    "consentStatus" "ConsentStatus" NOT NULL DEFAULT 'NOT_REQUESTED',
    "legalBasis" "LegalBasis" NOT NULL DEFAULT 'NOT_SET',
    "consentRequestedDate" TIMESTAMP(3),
    "consentGrantedDate" TIMESTAMP(3),
    "consentExpiryDate" TIMESTAMP(3),
    "retentionReviewDate" TIMESTAMP(3),
    "privacyNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CandidateProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateProfilePracticeArea" (
    "id" TEXT NOT NULL,
    "candidateProfileId" TEXT NOT NULL,
    "practiceAreaId" TEXT NOT NULL,

    CONSTRAINT "CandidateProfilePracticeArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateProfileSpecialism" (
    "id" TEXT NOT NULL,
    "candidateProfileId" TEXT NOT NULL,
    "specialismId" TEXT NOT NULL,

    CONSTRAINT "CandidateProfileSpecialism_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateSectorExperience" (
    "id" TEXT NOT NULL,
    "candidateProfileId" TEXT NOT NULL,
    "sectorId" TEXT NOT NULL,

    CONSTRAINT "CandidateSectorExperience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hiringOrganizationId" TEXT NOT NULL,
    "type" "OpportunityType" NOT NULL DEFAULT 'UNKNOWN',
    "stage" "OpportunityStage" NOT NULL DEFAULT 'SIGNAL_IDENTIFIED',
    "stageEnteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stageProbabilityDefault" INTEGER NOT NULL DEFAULT 5,
    "probabilityOverride" INTEGER,
    "isProbabilityOverridden" BOOLEAN NOT NULL DEFAULT false,
    "potentialRoleTitle" TEXT,
    "practiceAreaId" TEXT,
    "employmentType" "EmploymentType",
    "source" "OpportunitySource" NOT NULL DEFAULT 'OTHER',
    "sourcePersonId" TEXT,
    "sourceActivityId" TEXT,
    "leadContactPersonId" TEXT,
    "ownerId" TEXT NOT NULL,
    "estimatedFeeAmount" DECIMAL(14,2),
    "estimatedFeeCurrency" VARCHAR(3),
    "expectedDecisionDate" TIMESTAMP(3),
    "nextStepSummary" TEXT,
    "primaryNextTaskId" TEXT,
    "lossReason" "OpportunityLossReason",
    "lossExplanation" TEXT,
    "onHoldReason" TEXT,
    "notes" TEXT,
    "wonMandateId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpportunityFund" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "OpportunityFund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpportunitySpecialism" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "specialismId" TEXT NOT NULL,

    CONSTRAINT "OpportunitySpecialism_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpportunityStakeholder" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "role" "StakeholderRole" NOT NULL DEFAULT 'UNKNOWN',

    CONSTRAINT "OpportunityStakeholder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpportunityStageHistory" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "fromStage" "OpportunityStage",
    "toStage" "OpportunityStage" NOT NULL,
    "changedById" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "OpportunityStageHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mandate" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "hiringOrganizationId" TEXT NOT NULL,
    "sourceOpportunityId" TEXT,
    "status" "MandateStatus" NOT NULL DEFAULT 'BRIEF_RECEIVED',
    "statusEnteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "priority" "MandatePriority" NOT NULL DEFAULT 'NORMAL',
    "confidentiality" "MandateConfidentiality" NOT NULL DEFAULT 'OPEN',
    "ownerId" TEXT NOT NULL,
    "hiringManagerPersonId" TEXT,
    "internalTalentPersonId" TEXT,
    "practiceAreaId" TEXT,
    "seniority" "Seniority",
    "employmentType" "EmploymentType" NOT NULL DEFAULT 'PERMANENT',
    "numberOfHires" INTEGER NOT NULL DEFAULT 1,
    "city" TEXT,
    "region" TEXT,
    "countryCode" VARCHAR(2),
    "workArrangement" "WorkArrangement",
    "relocationSupport" BOOLEAN,
    "visaSponsorship" BOOLEAN,
    "roleSummary" TEXT,
    "businessContext" TEXT,
    "responsibilities" TEXT,
    "requiredExperience" TEXT,
    "preferredExperience" TEXT,
    "assessmentCriteria" TEXT,
    "searchExclusions" TEXT,
    "minBaseAmount" DECIMAL(14,2),
    "maxBaseAmount" DECIMAL(14,2),
    "baseCurrency" VARCHAR(3),
    "bonusInformation" TEXT,
    "equityInformation" TEXT,
    "minDayRateAmount" DECIMAL(10,2),
    "maxDayRateAmount" DECIMAL(10,2),
    "dayRateCurrency" VARCHAR(3),
    "engagementModel" "EngagementModel" NOT NULL DEFAULT 'RETAINED',
    "feeType" "FeeType" NOT NULL DEFAULT 'PERCENTAGE_OF_BASE',
    "feePercentage" DECIMAL(5,2),
    "fixedFeeAmount" DECIMAL(14,2),
    "fixedFeeCurrency" VARCHAR(3),
    "dayRateMarginAmount" DECIMAL(10,2),
    "dayRateMarginPercentage" DECIMAL(5,2),
    "paymentTermsDays" INTEGER,
    "exclusivity" BOOLEAN NOT NULL DEFAULT false,
    "exclusivityExpiryDate" TIMESTAMP(3),
    "guaranteeValue" INTEGER,
    "guaranteeUnit" TEXT,
    "signedTerms" BOOLEAN NOT NULL DEFAULT false,
    "termsSignedDate" TIMESTAMP(3),
    "startDate" TIMESTAMP(3),
    "targetLonglistDate" TIMESTAMP(3),
    "targetShortlistDate" TIMESTAMP(3),
    "targetCompletionDate" TIMESTAMP(3),
    "filledDate" TIMESTAMP(3),
    "cancelledDate" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "onHoldReason" TEXT,
    "primaryNextTaskId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Mandate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MandateFund" (
    "id" TEXT NOT NULL,
    "mandateId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "MandateFund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MandateSpecialism" (
    "id" TEXT NOT NULL,
    "mandateId" TEXT NOT NULL,
    "specialismId" TEXT NOT NULL,

    CONSTRAINT "MandateSpecialism_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MandateStakeholder" (
    "id" TEXT NOT NULL,
    "mandateId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "role" "StakeholderRole" NOT NULL DEFAULT 'UNKNOWN',

    CONSTRAINT "MandateStakeholder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MandateAssignedUser" (
    "id" TEXT NOT NULL,
    "mandateId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "MandateAssignedUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MandateStatusHistory" (
    "id" TEXT NOT NULL,
    "mandateId" TEXT NOT NULL,
    "fromStatus" "MandateStatus",
    "toStatus" "MandateStatus" NOT NULL,
    "changedById" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "MandateStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateProcess" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "mandateId" TEXT NOT NULL,
    "candidatePersonId" TEXT NOT NULL,
    "stage" "CandidateProcessStage" NOT NULL DEFAULT 'SOURCED',
    "stageEnteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" "CandidateProcessSource" NOT NULL DEFAULT 'OTHER',
    "sourcePersonId" TEXT,
    "addedById" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "overallScore" INTEGER,
    "functionalFitScore" INTEGER,
    "peExperienceScore" INTEGER,
    "sectorFitScore" INTEGER,
    "motivationScore" INTEGER,
    "compensationFitScore" INTEGER,
    "locationFitScore" INTEGER,
    "assessmentSummary" TEXT,
    "risksConcerns" TEXT,
    "candidateInterest" TEXT,
    "submissionSummary" TEXT,
    "submittedCvDocumentId" TEXT,
    "candidatePermissionToSubmit" BOOLEAN NOT NULL DEFAULT false,
    "candidatePermissionCapturedAt" TIMESTAMP(3),
    "compensationExpectation" TEXT,
    "availabilityForMandate" TEXT,
    "clientFeedback" TEXT,
    "rejectionReason" "ProcessRejectionReason",
    "rejectionExplanation" TEXT,
    "withdrawalReason" "WithdrawalReason",
    "withdrawalExplanation" TEXT,
    "primaryNextTaskId" TEXT,
    "submittedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "withdrawnAt" TIMESTAMP(3),
    "placedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CandidateProcess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateProcessStageHistory" (
    "id" TEXT NOT NULL,
    "candidateProcessId" TEXT NOT NULL,
    "fromStage" "CandidateProcessStage",
    "toStage" "CandidateProcessStage" NOT NULL,
    "changedById" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "CandidateProcessStageHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interview" (
    "id" TEXT NOT NULL,
    "candidateProcessId" TEXT NOT NULL,
    "type" "InterviewType" NOT NULL,
    "roundNumber" INTEGER NOT NULL DEFAULT 1,
    "scheduledStart" TIMESTAMP(3) NOT NULL,
    "scheduledEnd" TIMESTAMP(3),
    "timezone" TEXT NOT NULL DEFAULT 'Europe/London',
    "locationOrLink" TEXT,
    "preparationNotes" TEXT,
    "outcome" "InterviewOutcome" NOT NULL DEFAULT 'SCHEDULED',
    "candidateFeedback" TEXT,
    "clientFeedback" TEXT,
    "internalNotes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Interview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewInternalParticipant" (
    "id" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "InterviewInternalParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewExternalParticipant" (
    "id" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,

    CONSTRAINT "InterviewExternalParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "candidateProcessId" TEXT NOT NULL,
    "status" "OfferStatus" NOT NULL DEFAULT 'PLANNED',
    "offerDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "baseAmount" DECIMAL(14,2),
    "baseCurrency" VARCHAR(3),
    "bonusAmount" DECIMAL(14,2),
    "bonusPercentage" DECIMAL(5,2),
    "signOnAmount" DECIMAL(14,2),
    "signOnCurrency" VARCHAR(3),
    "equityDetails" TEXT,
    "dayRateAmount" DECIMAL(10,2),
    "dayRateCurrency" VARCHAR(3),
    "proposedStartDate" TIMESTAMP(3),
    "noticeConsiderations" TEXT,
    "candidateResponseDate" TIMESTAMP(3),
    "declineOrWithdrawalReason" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Placement" (
    "id" TEXT NOT NULL,
    "candidateProcessId" TEXT NOT NULL,
    "mandateId" TEXT NOT NULL,
    "candidatePersonId" TEXT NOT NULL,
    "hiringOrganizationId" TEXT NOT NULL,
    "acceptedOfferId" TEXT,
    "placementDate" TIMESTAMP(3) NOT NULL,
    "startDate" TIMESTAMP(3),
    "employmentType" "EmploymentType" NOT NULL,
    "agreedBaseAmount" DECIMAL(14,2),
    "agreedBaseCurrency" VARCHAR(3),
    "agreedTotalCashAmount" DECIMAL(14,2),
    "agreedTotalCashCurrency" VARCHAR(3),
    "agreedDayRateAmount" DECIMAL(10,2),
    "agreedDayRateCurrency" VARCHAR(3),
    "feeAmount" DECIMAL(14,2),
    "feeCurrency" VARCHAR(3),
    "guaranteeEndDate" TIMESTAMP(3),
    "status" "PlacementStatus" NOT NULL DEFAULT 'PLANNED_START',
    "fallThroughOrLeaverReason" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Placement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntelligenceItem" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "IntelligenceType" NOT NULL,
    "details" TEXT,
    "sourcePersonId" TEXT,
    "sourceActivityId" TEXT,
    "sourceUrl" TEXT,
    "dateReceived" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confidence" "IntelligenceConfidence" NOT NULL DEFAULT 'UNVERIFIED',
    "commercialRelevance" "CommercialRelevance" NOT NULL DEFAULT 'NONE',
    "confidentiality" "IntelligenceConfidentiality" NOT NULL DEFAULT 'INTERNAL',
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "ownerId" TEXT NOT NULL,
    "followUpRequired" BOOLEAN NOT NULL DEFAULT false,
    "primaryNextTaskId" TEXT,
    "convertedOpportunityId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "IntelligenceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntelligenceItemFund" (
    "id" TEXT NOT NULL,
    "intelligenceItemId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "IntelligenceItemFund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "direction" "ActivityDirection" NOT NULL DEFAULT 'NOT_APPLICABLE',
    "outcome" "ActivityOutcome",
    "subject" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationMinutes" INTEGER,
    "summary" TEXT,
    "fullNotes" TEXT,
    "createdById" TEXT NOT NULL,
    "assignedOwnerId" TEXT NOT NULL,
    "followUpRequired" BOOLEAN NOT NULL DEFAULT false,
    "followUpTaskId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sourcedOpportunityBacklinkId" TEXT,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityPerson" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,

    CONSTRAINT "ActivityPerson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityOrganization" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "ActivityOrganization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityOpportunity" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,

    CONSTRAINT "ActivityOpportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityMandate" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "mandateId" TEXT NOT NULL,

    CONSTRAINT "ActivityMandate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityCandidateProcess" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "candidateProcessId" TEXT NOT NULL,

    CONSTRAINT "ActivityCandidateProcess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityIntelligenceItem" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "intelligenceItemId" TEXT NOT NULL,

    CONSTRAINT "ActivityIntelligenceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "TaskType" NOT NULL DEFAULT 'OTHER',
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "priority" "TaskPriority" NOT NULL DEFAULT 'NORMAL',
    "assignedUserId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "dueTime" TEXT,
    "reminderAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "completionNote" TEXT,
    "relatedRecordType" "RelatedRecordType",
    "relatedRecordId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskPerson" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,

    CONSTRAINT "TaskPerson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskOrganization" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "TaskOrganization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskOpportunity" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,

    CONSTRAINT "TaskOpportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskMandate" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "mandateId" TEXT NOT NULL,

    CONSTRAINT "TaskMandate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskCandidateProcess" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "candidateProcessId" TEXT NOT NULL,

    CONSTRAINT "TaskCandidateProcess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskIntelligenceItem" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "intelligenceItemId" TEXT NOT NULL,

    CONSTRAINT "TaskIntelligenceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "category" "DocumentCategory" NOT NULL DEFAULT 'OTHER',
    "versionNumber" INTEGER NOT NULL DEFAULT 1,
    "isCurrentVersion" BOOLEAN NOT NULL DEFAULT true,
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "restricted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentOrganization" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "DocumentOrganization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentPerson" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,

    CONSTRAINT "DocumentPerson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentOpportunity" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,

    CONSTRAINT "DocumentOpportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentMandate" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "mandateId" TEXT NOT NULL,

    CONSTRAINT "DocumentMandate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentCandidateProcess" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "candidateProcessId" TEXT NOT NULL,

    CONSTRAINT "DocumentCandidateProcess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentIntelligenceItem" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "intelligenceItemId" TEXT NOT NULL,

    CONSTRAINT "DocumentIntelligenceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "colorToken" TEXT NOT NULL DEFAULT 'neutral',
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TagOnOrganization" (
    "id" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "TagOnOrganization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TagOnPerson" (
    "id" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,

    CONSTRAINT "TagOnPerson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TagOnOpportunity" (
    "id" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,

    CONSTRAINT "TagOnOpportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TagOnMandate" (
    "id" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "mandateId" TEXT NOT NULL,

    CONSTRAINT "TagOnMandate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TagOnIntelligenceItem" (
    "id" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "intelligenceItemId" TEXT NOT NULL,

    CONSTRAINT "TagOnIntelligenceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OffLimitsRestriction" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "personId" TEXT,
    "mandateId" TEXT,
    "placementId" TEXT,
    "type" "OffLimitsType" NOT NULL,
    "severity" "OffLimitsSeverity" NOT NULL DEFAULT 'WARNING',
    "reason" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "activeOverride" BOOLEAN,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "opportunityId" TEXT,

    CONSTRAINT "OffLimitsRestriction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedView" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "entityType" "SavedViewEntityType" NOT NULL,
    "ownerId" TEXT,
    "shared" BOOLEAN NOT NULL DEFAULT false,
    "filterJson" JSONB NOT NULL DEFAULT '{}',
    "sortJson" JSONB NOT NULL DEFAULT '[]',
    "columnJson" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomFieldDefinition" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "entityType" "CustomFieldEntityType" NOT NULL,
    "fieldType" "CustomFieldType" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "selectOptions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomFieldDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomFieldValue" (
    "id" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "organizationId" TEXT,
    "personId" TEXT,
    "candidateProfileId" TEXT,
    "opportunityId" TEXT,
    "mandateId" TEXT,
    "valueText" TEXT,
    "valueJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomFieldValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "actorId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedFields" JSONB,
    "requestMetadata" JSONB,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InAppNotification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "relatedTaskId" TEXT,
    "relatedEntityType" TEXT,
    "relatedEntityId" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InAppNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportJob" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "entityType" "ImportEntityType" NOT NULL,
    "status" "ImportStatus" NOT NULL DEFAULT 'PENDING',
    "originalFilename" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "columnMapping" JSONB,
    "duplicateChoices" JSONB,
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "processedRows" INTEGER NOT NULL DEFAULT 0,
    "successRows" INTEGER NOT NULL DEFAULT 0,
    "errorRows" INTEGER NOT NULL DEFAULT 0,
    "rowReport" JSONB,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ActivityRelatedPerson" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ActivityRelatedPerson_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");

-- CreateIndex
CREATE INDEX "User_workspaceId_idx" ON "User"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "User_workspaceId_email_key" ON "User"("workspaceId", "email");

-- CreateIndex
CREATE INDEX "InvestorStrategy_workspaceId_idx" ON "InvestorStrategy"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "InvestorStrategy_workspaceId_name_key" ON "InvestorStrategy"("workspaceId", "name");

-- CreateIndex
CREATE INDEX "OwnershipType_workspaceId_idx" ON "OwnershipType"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "OwnershipType_workspaceId_name_key" ON "OwnershipType"("workspaceId", "name");

-- CreateIndex
CREATE INDEX "Sector_workspaceId_idx" ON "Sector"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "Sector_workspaceId_parentId_name_key" ON "Sector"("workspaceId", "parentId", "name");

-- CreateIndex
CREATE INDEX "PracticeArea_workspaceId_idx" ON "PracticeArea"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "PracticeArea_workspaceId_name_key" ON "PracticeArea"("workspaceId", "name");

-- CreateIndex
CREATE INDEX "FunctionalSpecialism_workspaceId_idx" ON "FunctionalSpecialism"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "FunctionalSpecialism_workspaceId_name_key" ON "FunctionalSpecialism"("workspaceId", "name");

-- CreateIndex
CREATE INDEX "Organization_workspaceId_type_idx" ON "Organization"("workspaceId", "type");

-- CreateIndex
CREATE INDEX "Organization_workspaceId_status_idx" ON "Organization"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "Organization_normalizedWebsiteDomain_idx" ON "Organization"("normalizedWebsiteDomain");

-- CreateIndex
CREATE INDEX "Organization_normalizedName_idx" ON "Organization"("normalizedName");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationInvestorStrategy_organizationId_strategyId_key" ON "OrganizationInvestorStrategy"("organizationId", "strategyId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationSector_organizationId_sectorId_key" ON "OrganizationSector"("organizationId", "sectorId");

-- CreateIndex
CREATE INDEX "OrganizationRelationship_workspaceId_idx" ON "OrganizationRelationship"("workspaceId");

-- CreateIndex
CREATE INDEX "OrganizationRelationship_sourceOrganizationId_idx" ON "OrganizationRelationship"("sourceOrganizationId");

-- CreateIndex
CREATE INDEX "OrganizationRelationship_targetOrganizationId_idx" ON "OrganizationRelationship"("targetOrganizationId");

-- CreateIndex
CREATE INDEX "Person_workspaceId_idx" ON "Person"("workspaceId");

-- CreateIndex
CREATE INDEX "Person_linkedinUrl_idx" ON "Person"("linkedinUrl");

-- CreateIndex
CREATE UNIQUE INDEX "Person_workspaceId_primaryEmail_key" ON "Person"("workspaceId", "primaryEmail");

-- CreateIndex
CREATE INDEX "PersonOrganizationAssociation_personId_idx" ON "PersonOrganizationAssociation"("personId");

-- CreateIndex
CREATE INDEX "PersonOrganizationAssociation_organizationId_idx" ON "PersonOrganizationAssociation"("organizationId");

-- CreateIndex
CREATE INDEX "EmploymentHistory_personId_idx" ON "EmploymentHistory"("personId");

-- CreateIndex
CREATE INDEX "EmploymentHistory_organizationId_idx" ON "EmploymentHistory"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "EmploymentHistorySpecialism_employmentHistoryId_specialismI_key" ON "EmploymentHistorySpecialism"("employmentHistoryId", "specialismId");

-- CreateIndex
CREATE UNIQUE INDEX "EmploymentHistoryInvestor_employmentHistoryId_organizationI_key" ON "EmploymentHistoryInvestor"("employmentHistoryId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateProfile_personId_key" ON "CandidateProfile"("personId");

-- CreateIndex
CREATE INDEX "CandidateProfile_status_idx" ON "CandidateProfile"("status");

-- CreateIndex
CREATE INDEX "CandidateProfile_rating_idx" ON "CandidateProfile"("rating");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateProfilePracticeArea_candidateProfileId_practiceAre_key" ON "CandidateProfilePracticeArea"("candidateProfileId", "practiceAreaId");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateProfileSpecialism_candidateProfileId_specialismId_key" ON "CandidateProfileSpecialism"("candidateProfileId", "specialismId");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateSectorExperience_candidateProfileId_sectorId_key" ON "CandidateSectorExperience"("candidateProfileId", "sectorId");

-- CreateIndex
CREATE UNIQUE INDEX "Opportunity_primaryNextTaskId_key" ON "Opportunity"("primaryNextTaskId");

-- CreateIndex
CREATE UNIQUE INDEX "Opportunity_wonMandateId_key" ON "Opportunity"("wonMandateId");

-- CreateIndex
CREATE INDEX "Opportunity_workspaceId_stage_idx" ON "Opportunity"("workspaceId", "stage");

-- CreateIndex
CREATE INDEX "Opportunity_hiringOrganizationId_idx" ON "Opportunity"("hiringOrganizationId");

-- CreateIndex
CREATE INDEX "Opportunity_ownerId_idx" ON "Opportunity"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "OpportunityFund_opportunityId_organizationId_key" ON "OpportunityFund"("opportunityId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "OpportunitySpecialism_opportunityId_specialismId_key" ON "OpportunitySpecialism"("opportunityId", "specialismId");

-- CreateIndex
CREATE UNIQUE INDEX "OpportunityStakeholder_opportunityId_personId_key" ON "OpportunityStakeholder"("opportunityId", "personId");

-- CreateIndex
CREATE INDEX "OpportunityStageHistory_opportunityId_idx" ON "OpportunityStageHistory"("opportunityId");

-- CreateIndex
CREATE UNIQUE INDEX "Mandate_sourceOpportunityId_key" ON "Mandate"("sourceOpportunityId");

-- CreateIndex
CREATE UNIQUE INDEX "Mandate_primaryNextTaskId_key" ON "Mandate"("primaryNextTaskId");

-- CreateIndex
CREATE INDEX "Mandate_workspaceId_status_idx" ON "Mandate"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "Mandate_hiringOrganizationId_idx" ON "Mandate"("hiringOrganizationId");

-- CreateIndex
CREATE INDEX "Mandate_ownerId_idx" ON "Mandate"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "Mandate_workspaceId_reference_key" ON "Mandate"("workspaceId", "reference");

-- CreateIndex
CREATE UNIQUE INDEX "MandateFund_mandateId_organizationId_key" ON "MandateFund"("mandateId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "MandateSpecialism_mandateId_specialismId_key" ON "MandateSpecialism"("mandateId", "specialismId");

-- CreateIndex
CREATE UNIQUE INDEX "MandateStakeholder_mandateId_personId_key" ON "MandateStakeholder"("mandateId", "personId");

-- CreateIndex
CREATE UNIQUE INDEX "MandateAssignedUser_mandateId_userId_key" ON "MandateAssignedUser"("mandateId", "userId");

-- CreateIndex
CREATE INDEX "MandateStatusHistory_mandateId_idx" ON "MandateStatusHistory"("mandateId");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateProcess_primaryNextTaskId_key" ON "CandidateProcess"("primaryNextTaskId");

-- CreateIndex
CREATE INDEX "CandidateProcess_workspaceId_stage_idx" ON "CandidateProcess"("workspaceId", "stage");

-- CreateIndex
CREATE INDEX "CandidateProcess_mandateId_idx" ON "CandidateProcess"("mandateId");

-- CreateIndex
CREATE INDEX "CandidateProcess_candidatePersonId_idx" ON "CandidateProcess"("candidatePersonId");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateProcess_mandateId_candidatePersonId_key" ON "CandidateProcess"("mandateId", "candidatePersonId");

-- CreateIndex
CREATE INDEX "CandidateProcessStageHistory_candidateProcessId_idx" ON "CandidateProcessStageHistory"("candidateProcessId");

-- CreateIndex
CREATE INDEX "Interview_candidateProcessId_idx" ON "Interview"("candidateProcessId");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewInternalParticipant_interviewId_userId_key" ON "InterviewInternalParticipant"("interviewId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewExternalParticipant_interviewId_personId_key" ON "InterviewExternalParticipant"("interviewId", "personId");

-- CreateIndex
CREATE INDEX "Offer_candidateProcessId_idx" ON "Offer"("candidateProcessId");

-- CreateIndex
CREATE UNIQUE INDEX "Placement_candidateProcessId_key" ON "Placement"("candidateProcessId");

-- CreateIndex
CREATE UNIQUE INDEX "Placement_acceptedOfferId_key" ON "Placement"("acceptedOfferId");

-- CreateIndex
CREATE INDEX "Placement_mandateId_idx" ON "Placement"("mandateId");

-- CreateIndex
CREATE INDEX "Placement_candidatePersonId_idx" ON "Placement"("candidatePersonId");

-- CreateIndex
CREATE UNIQUE INDEX "IntelligenceItem_primaryNextTaskId_key" ON "IntelligenceItem"("primaryNextTaskId");

-- CreateIndex
CREATE UNIQUE INDEX "IntelligenceItem_convertedOpportunityId_key" ON "IntelligenceItem"("convertedOpportunityId");

-- CreateIndex
CREATE INDEX "IntelligenceItem_workspaceId_type_idx" ON "IntelligenceItem"("workspaceId", "type");

-- CreateIndex
CREATE INDEX "IntelligenceItem_organizationId_idx" ON "IntelligenceItem"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "IntelligenceItemFund_intelligenceItemId_organizationId_key" ON "IntelligenceItemFund"("intelligenceItemId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Activity_followUpTaskId_key" ON "Activity"("followUpTaskId");

-- CreateIndex
CREATE INDEX "Activity_workspaceId_occurredAt_idx" ON "Activity"("workspaceId", "occurredAt");

-- CreateIndex
CREATE INDEX "Activity_assignedOwnerId_idx" ON "Activity"("assignedOwnerId");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityPerson_activityId_personId_key" ON "ActivityPerson"("activityId", "personId");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityOrganization_activityId_organizationId_key" ON "ActivityOrganization"("activityId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityOpportunity_activityId_opportunityId_key" ON "ActivityOpportunity"("activityId", "opportunityId");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityMandate_activityId_mandateId_key" ON "ActivityMandate"("activityId", "mandateId");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityCandidateProcess_activityId_candidateProcessId_key" ON "ActivityCandidateProcess"("activityId", "candidateProcessId");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityIntelligenceItem_activityId_intelligenceItemId_key" ON "ActivityIntelligenceItem"("activityId", "intelligenceItemId");

-- CreateIndex
CREATE INDEX "Task_workspaceId_status_idx" ON "Task"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "Task_assignedUserId_dueDate_idx" ON "Task"("assignedUserId", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "TaskPerson_taskId_personId_key" ON "TaskPerson"("taskId", "personId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskOrganization_taskId_organizationId_key" ON "TaskOrganization"("taskId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskOpportunity_taskId_opportunityId_key" ON "TaskOpportunity"("taskId", "opportunityId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskMandate_taskId_mandateId_key" ON "TaskMandate"("taskId", "mandateId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskCandidateProcess_taskId_candidateProcessId_key" ON "TaskCandidateProcess"("taskId", "candidateProcessId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskIntelligenceItem_taskId_intelligenceItemId_key" ON "TaskIntelligenceItem"("taskId", "intelligenceItemId");

-- CreateIndex
CREATE INDEX "Document_workspaceId_category_idx" ON "Document"("workspaceId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentOrganization_documentId_organizationId_key" ON "DocumentOrganization"("documentId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentPerson_documentId_personId_key" ON "DocumentPerson"("documentId", "personId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentOpportunity_documentId_opportunityId_key" ON "DocumentOpportunity"("documentId", "opportunityId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentMandate_documentId_mandateId_key" ON "DocumentMandate"("documentId", "mandateId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentCandidateProcess_documentId_candidateProcessId_key" ON "DocumentCandidateProcess"("documentId", "candidateProcessId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentIntelligenceItem_documentId_intelligenceItemId_key" ON "DocumentIntelligenceItem"("documentId", "intelligenceItemId");

-- CreateIndex
CREATE INDEX "Tag_workspaceId_idx" ON "Tag"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_workspaceId_name_key" ON "Tag"("workspaceId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "TagOnOrganization_tagId_organizationId_key" ON "TagOnOrganization"("tagId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "TagOnPerson_tagId_personId_key" ON "TagOnPerson"("tagId", "personId");

-- CreateIndex
CREATE UNIQUE INDEX "TagOnOpportunity_tagId_opportunityId_key" ON "TagOnOpportunity"("tagId", "opportunityId");

-- CreateIndex
CREATE UNIQUE INDEX "TagOnMandate_tagId_mandateId_key" ON "TagOnMandate"("tagId", "mandateId");

-- CreateIndex
CREATE UNIQUE INDEX "TagOnIntelligenceItem_tagId_intelligenceItemId_key" ON "TagOnIntelligenceItem"("tagId", "intelligenceItemId");

-- CreateIndex
CREATE INDEX "OffLimitsRestriction_workspaceId_idx" ON "OffLimitsRestriction"("workspaceId");

-- CreateIndex
CREATE INDEX "OffLimitsRestriction_organizationId_idx" ON "OffLimitsRestriction"("organizationId");

-- CreateIndex
CREATE INDEX "OffLimitsRestriction_personId_idx" ON "OffLimitsRestriction"("personId");

-- CreateIndex
CREATE INDEX "SavedView_workspaceId_entityType_idx" ON "SavedView"("workspaceId", "entityType");

-- CreateIndex
CREATE INDEX "CustomFieldDefinition_workspaceId_entityType_idx" ON "CustomFieldDefinition"("workspaceId", "entityType");

-- CreateIndex
CREATE INDEX "CustomFieldValue_definitionId_idx" ON "CustomFieldValue"("definitionId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomFieldValue_definitionId_organizationId_key" ON "CustomFieldValue"("definitionId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomFieldValue_definitionId_personId_key" ON "CustomFieldValue"("definitionId", "personId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomFieldValue_definitionId_candidateProfileId_key" ON "CustomFieldValue"("definitionId", "candidateProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomFieldValue_definitionId_opportunityId_key" ON "CustomFieldValue"("definitionId", "opportunityId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomFieldValue_definitionId_mandateId_key" ON "CustomFieldValue"("definitionId", "mandateId");

-- CreateIndex
CREATE INDEX "AuditLog_workspaceId_entityType_entityId_idx" ON "AuditLog"("workspaceId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");

-- CreateIndex
CREATE INDEX "InAppNotification_userId_readAt_idx" ON "InAppNotification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "ImportJob_workspaceId_idx" ON "ImportJob"("workspaceId");

-- CreateIndex
CREATE INDEX "_ActivityRelatedPerson_B_index" ON "_ActivityRelatedPerson"("B");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestorStrategy" ADD CONSTRAINT "InvestorStrategy_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnershipType" ADD CONSTRAINT "OwnershipType_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sector" ADD CONSTRAINT "Sector_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sector" ADD CONSTRAINT "Sector_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Sector"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeArea" ADD CONSTRAINT "PracticeArea_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FunctionalSpecialism" ADD CONSTRAINT "FunctionalSpecialism_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FunctionalSpecialism" ADD CONSTRAINT "FunctionalSpecialism_practiceAreaId_fkey" FOREIGN KEY ("practiceAreaId") REFERENCES "PracticeArea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_ownershipTypeId_fkey" FOREIGN KEY ("ownershipTypeId") REFERENCES "OwnershipType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_relationshipOwnerId_fkey" FOREIGN KEY ("relationshipOwnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationInvestorStrategy" ADD CONSTRAINT "OrganizationInvestorStrategy_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationInvestorStrategy" ADD CONSTRAINT "OrganizationInvestorStrategy_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "InvestorStrategy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationSector" ADD CONSTRAINT "OrganizationSector_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationSector" ADD CONSTRAINT "OrganizationSector_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationRelationship" ADD CONSTRAINT "OrganizationRelationship_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationRelationship" ADD CONSTRAINT "OrganizationRelationship_sourceOrganizationId_fkey" FOREIGN KEY ("sourceOrganizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationRelationship" ADD CONSTRAINT "OrganizationRelationship_targetOrganizationId_fkey" FOREIGN KEY ("targetOrganizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationRelationship" ADD CONSTRAINT "OrganizationRelationship_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_relationshipOwnerId_fkey" FOREIGN KEY ("relationshipOwnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_currentOrganizationOverrideId_fkey" FOREIGN KEY ("currentOrganizationOverrideId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_sourcePersonId_fkey" FOREIGN KEY ("sourcePersonId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonOrganizationAssociation" ADD CONSTRAINT "PersonOrganizationAssociation_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonOrganizationAssociation" ADD CONSTRAINT "PersonOrganizationAssociation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmploymentHistory" ADD CONSTRAINT "EmploymentHistory_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmploymentHistory" ADD CONSTRAINT "EmploymentHistory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmploymentHistory" ADD CONSTRAINT "EmploymentHistory_practiceAreaId_fkey" FOREIGN KEY ("practiceAreaId") REFERENCES "PracticeArea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmploymentHistorySpecialism" ADD CONSTRAINT "EmploymentHistorySpecialism_employmentHistoryId_fkey" FOREIGN KEY ("employmentHistoryId") REFERENCES "EmploymentHistory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmploymentHistorySpecialism" ADD CONSTRAINT "EmploymentHistorySpecialism_specialismId_fkey" FOREIGN KEY ("specialismId") REFERENCES "FunctionalSpecialism"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmploymentHistoryInvestor" ADD CONSTRAINT "EmploymentHistoryInvestor_employmentHistoryId_fkey" FOREIGN KEY ("employmentHistoryId") REFERENCES "EmploymentHistory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmploymentHistoryInvestor" ADD CONSTRAINT "EmploymentHistoryInvestor_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmploymentHistoryInvestor" ADD CONSTRAINT "EmploymentHistoryInvestor_relatedPersonId_fkey" FOREIGN KEY ("relatedPersonId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateProfile" ADD CONSTRAINT "CandidateProfile_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateProfile" ADD CONSTRAINT "CandidateProfile_qualifiedById_fkey" FOREIGN KEY ("qualifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateProfilePracticeArea" ADD CONSTRAINT "CandidateProfilePracticeArea_candidateProfileId_fkey" FOREIGN KEY ("candidateProfileId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateProfilePracticeArea" ADD CONSTRAINT "CandidateProfilePracticeArea_practiceAreaId_fkey" FOREIGN KEY ("practiceAreaId") REFERENCES "PracticeArea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateProfileSpecialism" ADD CONSTRAINT "CandidateProfileSpecialism_candidateProfileId_fkey" FOREIGN KEY ("candidateProfileId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateProfileSpecialism" ADD CONSTRAINT "CandidateProfileSpecialism_specialismId_fkey" FOREIGN KEY ("specialismId") REFERENCES "FunctionalSpecialism"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateSectorExperience" ADD CONSTRAINT "CandidateSectorExperience_candidateProfileId_fkey" FOREIGN KEY ("candidateProfileId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateSectorExperience" ADD CONSTRAINT "CandidateSectorExperience_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_hiringOrganizationId_fkey" FOREIGN KEY ("hiringOrganizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_practiceAreaId_fkey" FOREIGN KEY ("practiceAreaId") REFERENCES "PracticeArea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_sourcePersonId_fkey" FOREIGN KEY ("sourcePersonId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_sourceActivityId_fkey" FOREIGN KEY ("sourceActivityId") REFERENCES "Activity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_leadContactPersonId_fkey" FOREIGN KEY ("leadContactPersonId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_primaryNextTaskId_fkey" FOREIGN KEY ("primaryNextTaskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityFund" ADD CONSTRAINT "OpportunityFund_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityFund" ADD CONSTRAINT "OpportunityFund_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunitySpecialism" ADD CONSTRAINT "OpportunitySpecialism_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunitySpecialism" ADD CONSTRAINT "OpportunitySpecialism_specialismId_fkey" FOREIGN KEY ("specialismId") REFERENCES "FunctionalSpecialism"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityStakeholder" ADD CONSTRAINT "OpportunityStakeholder_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityStakeholder" ADD CONSTRAINT "OpportunityStakeholder_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityStageHistory" ADD CONSTRAINT "OpportunityStageHistory_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityStageHistory" ADD CONSTRAINT "OpportunityStageHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mandate" ADD CONSTRAINT "Mandate_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mandate" ADD CONSTRAINT "Mandate_hiringOrganizationId_fkey" FOREIGN KEY ("hiringOrganizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mandate" ADD CONSTRAINT "Mandate_sourceOpportunityId_fkey" FOREIGN KEY ("sourceOpportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mandate" ADD CONSTRAINT "Mandate_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mandate" ADD CONSTRAINT "Mandate_hiringManagerPersonId_fkey" FOREIGN KEY ("hiringManagerPersonId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mandate" ADD CONSTRAINT "Mandate_internalTalentPersonId_fkey" FOREIGN KEY ("internalTalentPersonId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mandate" ADD CONSTRAINT "Mandate_practiceAreaId_fkey" FOREIGN KEY ("practiceAreaId") REFERENCES "PracticeArea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mandate" ADD CONSTRAINT "Mandate_primaryNextTaskId_fkey" FOREIGN KEY ("primaryNextTaskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mandate" ADD CONSTRAINT "Mandate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MandateFund" ADD CONSTRAINT "MandateFund_mandateId_fkey" FOREIGN KEY ("mandateId") REFERENCES "Mandate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MandateFund" ADD CONSTRAINT "MandateFund_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MandateSpecialism" ADD CONSTRAINT "MandateSpecialism_mandateId_fkey" FOREIGN KEY ("mandateId") REFERENCES "Mandate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MandateSpecialism" ADD CONSTRAINT "MandateSpecialism_specialismId_fkey" FOREIGN KEY ("specialismId") REFERENCES "FunctionalSpecialism"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MandateStakeholder" ADD CONSTRAINT "MandateStakeholder_mandateId_fkey" FOREIGN KEY ("mandateId") REFERENCES "Mandate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MandateStakeholder" ADD CONSTRAINT "MandateStakeholder_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MandateAssignedUser" ADD CONSTRAINT "MandateAssignedUser_mandateId_fkey" FOREIGN KEY ("mandateId") REFERENCES "Mandate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MandateAssignedUser" ADD CONSTRAINT "MandateAssignedUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MandateStatusHistory" ADD CONSTRAINT "MandateStatusHistory_mandateId_fkey" FOREIGN KEY ("mandateId") REFERENCES "Mandate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MandateStatusHistory" ADD CONSTRAINT "MandateStatusHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateProcess" ADD CONSTRAINT "CandidateProcess_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateProcess" ADD CONSTRAINT "CandidateProcess_mandateId_fkey" FOREIGN KEY ("mandateId") REFERENCES "Mandate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateProcess" ADD CONSTRAINT "CandidateProcess_candidatePersonId_fkey" FOREIGN KEY ("candidatePersonId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateProcess" ADD CONSTRAINT "CandidateProcess_sourcePersonId_fkey" FOREIGN KEY ("sourcePersonId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateProcess" ADD CONSTRAINT "CandidateProcess_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateProcess" ADD CONSTRAINT "CandidateProcess_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateProcess" ADD CONSTRAINT "CandidateProcess_submittedCvDocumentId_fkey" FOREIGN KEY ("submittedCvDocumentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateProcess" ADD CONSTRAINT "CandidateProcess_primaryNextTaskId_fkey" FOREIGN KEY ("primaryNextTaskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateProcessStageHistory" ADD CONSTRAINT "CandidateProcessStageHistory_candidateProcessId_fkey" FOREIGN KEY ("candidateProcessId") REFERENCES "CandidateProcess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateProcessStageHistory" ADD CONSTRAINT "CandidateProcessStageHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_candidateProcessId_fkey" FOREIGN KEY ("candidateProcessId") REFERENCES "CandidateProcess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewInternalParticipant" ADD CONSTRAINT "InterviewInternalParticipant_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewInternalParticipant" ADD CONSTRAINT "InterviewInternalParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewExternalParticipant" ADD CONSTRAINT "InterviewExternalParticipant_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewExternalParticipant" ADD CONSTRAINT "InterviewExternalParticipant_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_candidateProcessId_fkey" FOREIGN KEY ("candidateProcessId") REFERENCES "CandidateProcess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Placement" ADD CONSTRAINT "Placement_candidateProcessId_fkey" FOREIGN KEY ("candidateProcessId") REFERENCES "CandidateProcess"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Placement" ADD CONSTRAINT "Placement_mandateId_fkey" FOREIGN KEY ("mandateId") REFERENCES "Mandate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Placement" ADD CONSTRAINT "Placement_candidatePersonId_fkey" FOREIGN KEY ("candidatePersonId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Placement" ADD CONSTRAINT "Placement_hiringOrganizationId_fkey" FOREIGN KEY ("hiringOrganizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Placement" ADD CONSTRAINT "Placement_acceptedOfferId_fkey" FOREIGN KEY ("acceptedOfferId") REFERENCES "Offer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Placement" ADD CONSTRAINT "Placement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntelligenceItem" ADD CONSTRAINT "IntelligenceItem_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntelligenceItem" ADD CONSTRAINT "IntelligenceItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntelligenceItem" ADD CONSTRAINT "IntelligenceItem_sourcePersonId_fkey" FOREIGN KEY ("sourcePersonId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntelligenceItem" ADD CONSTRAINT "IntelligenceItem_sourceActivityId_fkey" FOREIGN KEY ("sourceActivityId") REFERENCES "Activity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntelligenceItem" ADD CONSTRAINT "IntelligenceItem_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntelligenceItem" ADD CONSTRAINT "IntelligenceItem_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntelligenceItem" ADD CONSTRAINT "IntelligenceItem_primaryNextTaskId_fkey" FOREIGN KEY ("primaryNextTaskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntelligenceItem" ADD CONSTRAINT "IntelligenceItem_convertedOpportunityId_fkey" FOREIGN KEY ("convertedOpportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntelligenceItem" ADD CONSTRAINT "IntelligenceItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntelligenceItemFund" ADD CONSTRAINT "IntelligenceItemFund_intelligenceItemId_fkey" FOREIGN KEY ("intelligenceItemId") REFERENCES "IntelligenceItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntelligenceItemFund" ADD CONSTRAINT "IntelligenceItemFund_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_assignedOwnerId_fkey" FOREIGN KEY ("assignedOwnerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_followUpTaskId_fkey" FOREIGN KEY ("followUpTaskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_sourcedOpportunityBacklinkId_fkey" FOREIGN KEY ("sourcedOpportunityBacklinkId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityPerson" ADD CONSTRAINT "ActivityPerson_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityPerson" ADD CONSTRAINT "ActivityPerson_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityOrganization" ADD CONSTRAINT "ActivityOrganization_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityOrganization" ADD CONSTRAINT "ActivityOrganization_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityOpportunity" ADD CONSTRAINT "ActivityOpportunity_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityOpportunity" ADD CONSTRAINT "ActivityOpportunity_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityMandate" ADD CONSTRAINT "ActivityMandate_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityMandate" ADD CONSTRAINT "ActivityMandate_mandateId_fkey" FOREIGN KEY ("mandateId") REFERENCES "Mandate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityCandidateProcess" ADD CONSTRAINT "ActivityCandidateProcess_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityCandidateProcess" ADD CONSTRAINT "ActivityCandidateProcess_candidateProcessId_fkey" FOREIGN KEY ("candidateProcessId") REFERENCES "CandidateProcess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityIntelligenceItem" ADD CONSTRAINT "ActivityIntelligenceItem_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityIntelligenceItem" ADD CONSTRAINT "ActivityIntelligenceItem_intelligenceItemId_fkey" FOREIGN KEY ("intelligenceItemId") REFERENCES "IntelligenceItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskPerson" ADD CONSTRAINT "TaskPerson_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskPerson" ADD CONSTRAINT "TaskPerson_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskOrganization" ADD CONSTRAINT "TaskOrganization_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskOrganization" ADD CONSTRAINT "TaskOrganization_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskOpportunity" ADD CONSTRAINT "TaskOpportunity_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskOpportunity" ADD CONSTRAINT "TaskOpportunity_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskMandate" ADD CONSTRAINT "TaskMandate_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskMandate" ADD CONSTRAINT "TaskMandate_mandateId_fkey" FOREIGN KEY ("mandateId") REFERENCES "Mandate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskCandidateProcess" ADD CONSTRAINT "TaskCandidateProcess_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskCandidateProcess" ADD CONSTRAINT "TaskCandidateProcess_candidateProcessId_fkey" FOREIGN KEY ("candidateProcessId") REFERENCES "CandidateProcess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskIntelligenceItem" ADD CONSTRAINT "TaskIntelligenceItem_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskIntelligenceItem" ADD CONSTRAINT "TaskIntelligenceItem_intelligenceItemId_fkey" FOREIGN KEY ("intelligenceItemId") REFERENCES "IntelligenceItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentOrganization" ADD CONSTRAINT "DocumentOrganization_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentOrganization" ADD CONSTRAINT "DocumentOrganization_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentPerson" ADD CONSTRAINT "DocumentPerson_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentPerson" ADD CONSTRAINT "DocumentPerson_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentOpportunity" ADD CONSTRAINT "DocumentOpportunity_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentOpportunity" ADD CONSTRAINT "DocumentOpportunity_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentMandate" ADD CONSTRAINT "DocumentMandate_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentMandate" ADD CONSTRAINT "DocumentMandate_mandateId_fkey" FOREIGN KEY ("mandateId") REFERENCES "Mandate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentCandidateProcess" ADD CONSTRAINT "DocumentCandidateProcess_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentCandidateProcess" ADD CONSTRAINT "DocumentCandidateProcess_candidateProcessId_fkey" FOREIGN KEY ("candidateProcessId") REFERENCES "CandidateProcess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentIntelligenceItem" ADD CONSTRAINT "DocumentIntelligenceItem_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentIntelligenceItem" ADD CONSTRAINT "DocumentIntelligenceItem_intelligenceItemId_fkey" FOREIGN KEY ("intelligenceItemId") REFERENCES "IntelligenceItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TagOnOrganization" ADD CONSTRAINT "TagOnOrganization_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TagOnOrganization" ADD CONSTRAINT "TagOnOrganization_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TagOnPerson" ADD CONSTRAINT "TagOnPerson_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TagOnPerson" ADD CONSTRAINT "TagOnPerson_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TagOnOpportunity" ADD CONSTRAINT "TagOnOpportunity_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TagOnOpportunity" ADD CONSTRAINT "TagOnOpportunity_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TagOnMandate" ADD CONSTRAINT "TagOnMandate_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TagOnMandate" ADD CONSTRAINT "TagOnMandate_mandateId_fkey" FOREIGN KEY ("mandateId") REFERENCES "Mandate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TagOnIntelligenceItem" ADD CONSTRAINT "TagOnIntelligenceItem_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TagOnIntelligenceItem" ADD CONSTRAINT "TagOnIntelligenceItem_intelligenceItemId_fkey" FOREIGN KEY ("intelligenceItemId") REFERENCES "IntelligenceItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OffLimitsRestriction" ADD CONSTRAINT "OffLimitsRestriction_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OffLimitsRestriction" ADD CONSTRAINT "OffLimitsRestriction_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OffLimitsRestriction" ADD CONSTRAINT "OffLimitsRestriction_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OffLimitsRestriction" ADD CONSTRAINT "OffLimitsRestriction_mandateId_fkey" FOREIGN KEY ("mandateId") REFERENCES "Mandate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OffLimitsRestriction" ADD CONSTRAINT "OffLimitsRestriction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OffLimitsRestriction" ADD CONSTRAINT "OffLimitsRestriction_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedView" ADD CONSTRAINT "SavedView_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedView" ADD CONSTRAINT "SavedView_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomFieldDefinition" ADD CONSTRAINT "CustomFieldDefinition_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomFieldValue" ADD CONSTRAINT "CustomFieldValue_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "CustomFieldDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomFieldValue" ADD CONSTRAINT "CustomFieldValue_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomFieldValue" ADD CONSTRAINT "CustomFieldValue_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomFieldValue" ADD CONSTRAINT "CustomFieldValue_candidateProfileId_fkey" FOREIGN KEY ("candidateProfileId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomFieldValue" ADD CONSTRAINT "CustomFieldValue_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomFieldValue" ADD CONSTRAINT "CustomFieldValue_mandateId_fkey" FOREIGN KEY ("mandateId") REFERENCES "Mandate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InAppNotification" ADD CONSTRAINT "InAppNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InAppNotification" ADD CONSTRAINT "InAppNotification_relatedTaskId_fkey" FOREIGN KEY ("relatedTaskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ActivityRelatedPerson" ADD CONSTRAINT "_ActivityRelatedPerson_A_fkey" FOREIGN KEY ("A") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ActivityRelatedPerson" ADD CONSTRAINT "_ActivityRelatedPerson_B_fkey" FOREIGN KEY ("B") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
