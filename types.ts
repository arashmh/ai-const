
export enum Page {
  Home,
  Society,
  Law
}

export interface Society {
  id: string;
  name: string;
  description: string;
  members: Member[];
}

export enum Role {
  Citizen = "Citizen AI Agent",
  Drafter = "Drafter AI Agent",
  Reviewer = "Reviewer AI Agent",
  Council = "Ratification Council AI Agent"
}

export interface Question {
  id: number;
  text: string;
  type: 'multiple-choice' | 'yes-no';
  options?: string[];
}

export interface Answer {
  questionId: number;
  answer: string;
}

export interface CognitiveEthicalProfile {
  worldview: string;
  interpretivePhilosophy: 'Originalism' | 'Living Constitution' | 'Pragmatism';
  socialPriorities: string[];
  economicPriorities: string[];
  decisionMakingMatrix: string;
  logicalReasoningPattern:string;
  archetype?: string; // To track archetype for visualization

  oneLiner: string;
  motto: string;
  
  // Leaning scores (0-100)
  socialLeaning: number; // 0 (Collectivist) to 100 (Individualist)
  politicalLeaning: number; // 0 (Authoritarian) to 100 (Libertarian)
  moralLeaning: number; // 0 (Utilitarian) to 100 (Deontological)
  opennessLeaning: number; // 0 (Traditionalist) to 100 (Progressive)
  riskToleranceLeaning: number; // 0 (Risk-Averse) to 100 (Risk-Seeking)
  thinkingStyleLeaning: number; // 0 (Analytical) to 100 (Intuitive)
  timeOrientationLeaning: number; // 0 (Present-Focused) to 100 (Future-Focused)
  communicationLeaning: number; // 0 (Direct) to 100 (Indirect)
  decisionMakingLeaning: number; // 0 (Emotional) to 100 (Logical)
  changePreferenceLeaning: number; // 0 (Stability-Seeking) to 100 (Change-Embracing)
}

export interface Member {
  id: string;
  name: string;
  role: Role;
  profile: CognitiveEthicalProfile;
  avatar: string; 
}

export interface Law {
  id: string;
  text: string;
  ratifiedOn: number; // Day number
}

export enum ProposalStatus {
  Issue = "Issue",
  Drafting = "Drafting",
  InReview = "In Review",
  ApprovedForRatification = "Approved for Ratification",
  Ratified = "Ratified",
  Rejected = "Rejected",
}

export interface Comment {
  id: string;
  commenterId: string;
  comment: string;
  intent: 'For' | 'Against' | 'Modification';
  day: number;
}

export interface Proposal {
  id: string;
  title: string;
  issueStatement: string;
  proposedChanges: string;
  reference: {
    type: 'new_law' | 'existing_law' | 'existing_proposal';
    text: string;
    id?: string | null;
  };
  authorId: string;
  draftText: string;
  status: ProposalStatus;
  upvotes: string[]; // Member IDs
  downvotes: string[]; // Member IDs
  comments: Comment[];
  creationDay: number;
}

export enum EventType {
  DayEnd = "Day End",
  DayStart = "Day Start",
  NewIssue = "New Issue",
  Upvote = "Upvote",
  Downvote = "Downvote",
  DraftingStarted = "Drafting Started",
  ProposalSubmitted = "Proposal Submitted",
  ReviewStarted = "Review Started",
  Comment = "Comment",
  ProposalApproved = "Proposal Approved",
  ProposalRejected = "Proposal Rejected",
  ProposalRatified = "Proposal Ratified",
  ExperimentStarted = "Experiment Started",
  Promotion = "Promotion",
  Decision = "Decision"
}

export interface EventLogEntry {
  id: string;
  day: number;
  text: string;
  type: EventType;
  memberId?: string;
}

export interface ExperimentConfig {
    model: string;
    actionsPerMemberPerDay: number;
    actionDelaySeconds: number;
    initialReviewerPercent: number;
    initialDrafterPercent: number;
    promotionThresholds: {
        drafterToReviewer: number; // successful drafts to become reviewer
        reviewerToCouncil: number; // successful reviews to become council member
    };
    upvotesToDraft: number;
    daysForReview: number;
    ratificationDayInterval: number;
    maxExperimentDays: number;
}


export interface Experiment {
  id: string;
  name: string;
  societyId: string;
  status: 'Setting Up' | 'Running' | 'Paused' | 'Completed';
  memberIds: string[];
  coreStatements: string[];
  laws: Law[];
  proposals: Proposal[];
  eventLog: EventLogEntry[];
  currentDay: number;
  nextDayTimestamp: number; // Used to detect if browser was closed
  roles: Record<string, Role>;
  performance: Record<string, { successfulDrafts: number; successfulReviews: number; }>;
  config: ExperimentConfig;
  totalActionsToday: number;
  completedActionsToday: number;
  dailyActivity: Record<string, { raisedIssueToday: boolean; }>;
  turnState: {
    round: number; // 1, 2, or 3
    phase: 'CITIZENS' | 'REVIEWERS';
    actorIndex: number;
  };
}