import React from 'react';

export enum Page {
  Home,
  Society,
  Law,
  ExperimentDesigner // This now refers to the Protocol Designer
}

export interface SocietyAnalysis {
  composition: string;
  cohesion: {
    level: 'Harmonious' | 'Cohesive' | 'Stable' | 'Tense' | 'Fractured';
    description: string;
  };
  pointsOfConflict: {
    topic: string;
    severity: 'Critical' | 'High' | 'Moderate' | 'Low';
  }[];
  polarity: {
    score: number; // 0-100
    description: string;
  };
}

export interface Society {
  id: string;
  name: string; // Now the short, clever title
  analysis?: SocietyAnalysis; // New structured analysis, optional for backwards compatibility
  members: Member[];
}

// DEPRECATED and will be replaced by dynamic RoleDefinition
export enum LegacyRole {
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

export interface Trait {
  id: string;         // Unique ID for React key and editing
  label: string;      // The bubble text (e.g., "Pragmatic")
  reasoning: string;  // The tooltip (e.g., "Derived from the text '...avoids ideological extremes...'")
}

export interface Leaning {
    score: number;      // 0-100
    reasoning: string;  // The tooltip
}


export interface CognitiveEthicalProfile {
  worldview: string;
  interpretivePhilosophy: 'Originalism' | 'Living Constitution' | 'Pragmatism';
  socialPriorities: string[];
  economicPriorities: string[];
  decisionMakingMatrix: string;
  logicalReasoningPattern:string;
  templateName?: string; // To track template for visualization

  // Leaning scores (0-100)
  socialLeaning: Leaning; // 0 (Collectivist) to 100 (Individualist)
  politicalLeaning: Leaning; // 0 (Authoritarian) to 100 (Libertarian)
  moralLeaning: Leaning; // 0 (Utilitarian) to 100 (Deontological)
  opennessLeaning: Leaning; // 0 (Traditionalist) to 100 (Progressive)
  riskToleranceLeaning: Leaning; // 0 (Risk-Averse) to 100 (Risk-Seeking)
  thinkingStyleLeaning: Leaning; // 0 (Analytical) to 100 (Intuitive)
  timeOrientationLeaning: Leaning; // 0 (Present-Focused) to 100 (Future-Focused)
  communicationLeaning: Leaning; // 0 (Direct) to 100 (Indirect)
  decisionMakingLeaning: Leaning; // 0 (Emotional) to 100 (Logical)
  changePreferenceLeaning: Leaning; // 0 (Stability-Seeking) to 100 (Change-Embracing)

  // New detailed characteristics
  personalityTraits: Trait[];
  valueSystem: Trait[];
  politicalInclination: Trait[];
  socialInclination: Trait[];
  moralCompass: Trait[];
  aspirations: Trait[];
  causesToFightFor: Trait[];
  causesToFightAgainst: Trait[];
  greyAreasOfMorality: Trait[];
  weakPoints: Trait[];
  strengthPoints: Trait[];
}

export interface Member {
  id: string;
  name: string;
  role: LegacyRole | string; // Allow for dynamic role names
  profile: CognitiveEthicalProfile;
  avatar: string; 
  age: number;
  gender: 'Male' | 'Female';
  expertise: string;
}

export interface Law {
  id: string;
  text: string;
  ratifiedOn: number; // Day number
}

export interface Comment {
  id: string;
  commenterId: string;
  comment: string;
  intent: string; // Dynamic intent, e.g. 'For', 'Against', 'Modification'
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
  status: string; // Represents the ID of a ProcessState
  upvotes: string[]; // Member IDs
  downvotes: string[]; // Member IDs
  comments: Comment[];
  creationDay: number;
  stateEntryDay: number;
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
  Decision = "Decision",
  StateChange = "State Change",
  Action = "Action",
  NoAction = "No Action"
}

export interface EventLogEntry {
  id: string;
  day: number;
  text: string;
  type: EventType;
  memberId?: string;
}

// --- NEW PROTOCOL STRUCTURE ---

export interface ToolInput {
  id: string;
  name: string;
  description: string;
  type: 'options' | 'string' | 'long_text' | 'reference' | 'persona_profile' | 'system_context';
  options?: string[];
  isOptional?: boolean;
}

export interface Tool {
  id:string;
  name: string;
  description: string;
  isAI: boolean;
  isObjective: boolean; // If false, the tool should use the member's persona.
  inputs: ToolInput[];
}

export interface Role {
  id: string;
  name: string;
  description: string;
  type: 'member' | 'systemic'; // member roles are taken by society members, systemic are autonomous agents
}

export interface ProcessState {
  id: string;
  name: string;
  description: string;
  isInitialState?: boolean;
}

export interface TransitionTrigger {
    type: 'task_completion' | 'time_elapsed' | 'condition_met';
    description: string; 
    taskId?: string; 
    durationDays?: number;
    condition?: string;
    onViolation?: boolean;
}

export interface StateTransition {
    id: string;
    fromStateId: string;
    toStateId: string;
    description: string; 
    trigger: TransitionTrigger;
}

export interface Task {
  id: string;
  roleId: string;
  description: string;
  toolId: string;
  target: { 
    entity: string;
    statusId: string;
  };
  toolInputs: Record<string, any>; // Stores user-configured inputs for the tool
  priority?: number; // For systemic role action selection
}

export interface ExperimentProtocol {
  tools: Tool[];
  roles: Role[];
  states: ProcessState[];
  transitions: StateTransition[];
  flow: string;
  tasks: Task[];
}

export interface Protocol {
  id: string;
  name: string;
  description: string;
  protocol: ExperimentProtocol;
  status?: 'generating' | 'error';
  errorMessage?: string;
}


// The configuration for an experiment *run*, distinct from the protocol's rules.
export interface ExperimentConfig {
    model: string;
    actionDelaySeconds: number;
    maxExperimentDays: number;
}

export type RoleAssignmentConfig = 
  | { mode: 'manual', assignments: Record<string, string> } // roleId -> templateName
  | { mode: 'automatic', assignments: Record<string, number> }; // roleId -> percentage


export interface BulkMemberConfig {
    genderRatio: number; // 0-100, percentage of female
    ageWeights: Record<string, number>; // e.g., { '20-35': 50, '36-50': 30, '51-70': 20 }
    expertiseWeights: Record<string, number>; // e.g. { 'Science & Tech': 40, 'Arts & Humanities': 60 }
}


export interface Experiment {
  id: string;
  name: string;
  societyId: string;
  protocolId: string; // The ID of the protocol being used
  status: 'Setting Up' | 'Running' | 'Paused' | 'Completed';
  memberIds: string[];
  coreStatements: string[];
  laws: Law[];
  proposals: Proposal[];
  eventLog: EventLogEntry[];
  currentDay: number;
  nextDayTimestamp: number; // Used to detect if browser was closed
  roles: Record<string, string[]>; // memberId -> roleId[]
  performance: Record<string, { successfulDrafts: number; successfulReviews: number; }>;
  config: ExperimentConfig; // This no longer contains the protocol definition
  totalActionsToday: number;
  completedActionsToday: number;
  dailyActivity: Record<string, { raisedIssueToday: boolean; }>;
  turnState: {
    round: number; 
    phase: string;
    actorIndex: number;
  };
}

// --- NEW TEMPLATE TYPES ---

export interface DefaultTemplate {
  name: string;
  description: string;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  profile: CognitiveEthicalProfile;
}

export interface UserTemplate {
  id: string;
  name: string;
  description: string;
  profile: CognitiveEthicalProfile;
}