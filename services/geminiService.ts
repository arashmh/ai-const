
import { GoogleGenAI, Type, GenerateContentParameters, GenerateContentResponse } from "@google/genai";
import { Answer, CognitiveEthicalProfile, Law, Proposal, ProposalStatus, Role, Comment, Member } from "../types";

// This check is to prevent crashing in environments where process.env is not defined.
const apiKey = typeof process !== 'undefined' && process.env && process.env.API_KEY
  ? process.env.API_KEY
  : "mock_api_key_for_development";
  
const ai = new GoogleGenAI({ apiKey });

/**
 * A wrapper for the Gemini API that includes exponential backoff retry logic.
 * This makes API calls more resilient to transient errors like rate limits or server issues.
 * @param params - The parameters for the generateContent call.
 * @param retries - The number of retries left.
 * @param delay - The delay in ms before the next retry.
 * @returns The GenerateContentResponse from the API.
 */
const generateContentWithRetry = async (
    params: GenerateContentParameters,
    retries: number = 3,
    delay: number = 1000
): Promise<GenerateContentResponse> => {
    try {
        return await ai.models.generateContent(params);
    } catch (error) {
        const errorString = String(error);
        const isRateLimit = errorString.includes('429') || errorString.includes('RESOURCE_EXHAUSTED');
        const isServerError = errorString.includes('500') || errorString.includes('503');

        if ((isRateLimit || isServerError) && retries > 0) {
            console.warn(`API call failed. Retrying in ${delay / 1000}s... (${retries} retries left)`);
            await new Promise(res => setTimeout(res, delay));
            return generateContentWithRetry(params, retries - 1, delay * 2); // Exponential backoff
        }
        console.error("API call failed permanently or with a non-retryable error:", error);
        throw error;
    }
};


const profileSchema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING, description: "A fitting, modern-sounding surname for the AI agent (e.g., 'Chen', 'Schmidt', 'Al-Jamil')." },
    worldview: { type: Type.STRING, description: "A one-sentence summary of the AI's core philosophy." },
    interpretivePhilosophy: { type: Type.STRING, enum: ['Originalism', 'Living Constitution', 'Pragmatism'] },
    socialPriorities: { type: Type.ARRAY, items: { type: Type.STRING } },
    economicPriorities: { type: Type.ARRAY, items: { type: Type.STRING } },
    decisionMakingMatrix: { type: Type.STRING, description: "A brief description of how this AI weighs competing values." },
    logicalReasoningPattern: { type: Type.STRING, description: "Describe the AI's typical mode of reasoning (e.g., deontological, utilitarian, virtue-based)." },
    
    oneLiner: { type: Type.STRING, description: "A one-liner description of the agent in contemporary social/political terms. E.g., 'A data-driven centrist focused on market solutions.'" },
    motto: { type: Type.STRING, description: "A short, personal motto that encapsulates the agent's core belief. E.g., 'Progress without disruption.'" },
    
    socialLeaning: { type: Type.NUMBER, description: "A score from 0 to 100 representing social views. 0 is fully Collectivist, 100 is fully Individualist." },
    politicalLeaning: { type: Type.NUMBER, description: "A score from 0 to 100 representing political views. 0 is fully Authoritarian, 100 is fully Libertarian." },
    moralLeaning: { type: Type.NUMBER, description: "A score from 0 to 100 representing moral framework. 0 is purely Utilitarian (greatest good for greatest number), 100 is purely Deontological (duty and rules-based)." },
    opennessLeaning: { type: Type.NUMBER, description: "A score from 0 to 100 representing openness to change. 0 is staunchly Traditionalist, 100 is aggressively Progressive." },
    riskToleranceLeaning: { type: Type.NUMBER, description: "A score from 0 to 100 representing risk tolerance. 0 is fully Risk-Averse, 100 is fully Risk-Seeking." },
    thinkingStyleLeaning: { type: Type.NUMBER, description: "A score from 0 to 100 representing thinking style. 0 is purely Analytical, 100 is purely Intuitive." },
    timeOrientationLeaning: { type: Type.NUMBER, description: "A score from 0 to 100 representing time orientation. 0 is Present-Focused, 100 is Future-Focused." },
    communicationLeaning: { type: Type.NUMBER, description: "A score from 0 to 100 representing communication style. 0 is very Direct, 100 is very Indirect." },
    decisionMakingLeaning: { type: Type.NUMBER, description: "A score from 0 to 100 representing decision-making basis. 0 is purely Emotional, 100 is purely Logical." },
    changePreferenceLeaning: { type: Type.NUMBER, description: "A score from 0 to 100 representing preference for change. 0 is highly Stability-Seeking, 100 is highly Change-Embracing." },
  },
  required: [
    'name', 'worldview', 'interpretivePhilosophy', 'socialPriorities', 'economicPriorities', 'decisionMakingMatrix', 'logicalReasoningPattern',
    'oneLiner', 'motto', 'socialLeaning', 'politicalLeaning', 'moralLeaning', 'opennessLeaning',
    'riskToleranceLeaning', 'thinkingStyleLeaning', 'timeOrientationLeaning', 'communicationLeaning', 'decisionMakingLeaning', 'changePreferenceLeaning'
  ]
};

const bulkProfileSchema = {
    type: Type.ARRAY,
    items: profileSchema
};

export const generateCognitiveProfile = async (answers: Answer[], model: string = 'gemini-2.5-flash'): Promise<CognitiveEthicalProfile & { name: string }> => {
  const prompt = `
    Based on the following answers to a philosophical and political questionnaire, generate a "Cognitive & Ethical Profile" for an AI agent.
    The profile should be a deep and complex model of the agent's decision-making matrix.
    Devise a fitting, modern-sounding surname for this agent.

    Critically, you must also generate all of the following (most are 0-100 scores):
    1.  **oneLiner**: A one-liner description.
    2.  **motto**: A short, personal motto.
    3.  **socialLeaning**: 0=Collectivist, 100=Individualist.
    4.  **politicalLeaning**: 0=Authoritarian, 100=Libertarian.
    5.  **moralLeaning**: 0=Utilitarian, 100=Deontological.
    6.  **opennessLeaning**: 0=Traditionalist, 100=Progressive.
    7.  **riskToleranceLeaning**: 0=Risk-Averse, 100=Risk-Seeking.
    8.  **thinkingStyleLeaning**: 0=Analytical, 100=Intuitive.
    9.  **timeOrientationLeaning**: 0=Present-Focused, 100=Future-Focused.
    10. **communicationLeaning**: 0=Direct, 100=Indirect.
    11. **decisionMakingLeaning**: 0=Emotional, 100=Logical.
    12. **changePreferenceLeaning**: 0=Stability-Seeking, 100=Change-Embracing.

    Questionnaire Answers:
    ${answers.map(a => `- Question ID ${a.questionId}: ${a.answer}`).join('\n')}

    Generate a profile that is consistent with these answers. The profile must strictly adhere to the provided JSON schema.
  `;
  try {
    const response = await generateContentWithRetry({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: profileSchema,
      },
    });

    const jsonText = response.text.trim();
    const profile = JSON.parse(jsonText) as CognitiveEthicalProfile & { name: string };
    profile.archetype = "Custom";
    return profile;
  } catch (error) {
    console.error("Error generating cognitive profile:", error);
    // Fallback to a default profile in case of API error
    return {
      name: "Pragma",
      worldview: "A moderate, pragmatic agent focused on stability.",
      interpretivePhilosophy: 'Pragmatism',
      socialPriorities: ["Public Health", "Education"],
      economicPriorities: ["Stable Growth", "Low Unemployment"],
      decisionMakingMatrix: "Weighs options based on evidence and predictable outcomes, avoiding ideological extremes.",
      logicalReasoningPattern: "Utilitarian",
      archetype: "Custom",
      oneLiner: "A data-driven centrist focused on practical outcomes.",
      motto: "Progress through pragmatism.",
      socialLeaning: 50,
      politicalLeaning: 60,
      moralLeaning: 20,
      opennessLeaning: 55,
      riskToleranceLeaning: 40,
      thinkingStyleLeaning: 25,
      timeOrientationLeaning: 70,
      communicationLeaning: 20,
      decisionMakingLeaning: 85,
      changePreferenceLeaning: 30,
    };
  }
};

export const generateBulkProfiles = async (archetype: {name: string, description: string}, count: number, model: string = 'gemini-2.5-flash'): Promise<(CognitiveEthicalProfile & { name: string })[]> => {
    const prompt = `
    You are a society generator. Your task is to create ${count} unique AI agent profiles that all fit the archetype of a "${archetype.name}".

    Archetype Description: ${archetype.description}

    While they must all share this core philosophy, you must introduce slight variations in their specific priorities, reasoning patterns, and worldview to ensure they are distinct individuals. Each agent must also have a unique, modern-sounding surname.

    Critically, for each agent you must also generate all of the following (most are 0-100 scores):
    1.  **oneLiner**: A one-liner description.
    2.  **motto**: A short, personal motto.
    3.  **socialLeaning**: 0=Collectivist, 100=Individualist.
    4.  **politicalLeaning**: 0=Authoritarian, 100=Libertarian.
    5.  **moralLeaning**: 0=Utilitarian, 100=Deontological.
    6.  **opennessLeaning**: 0=Traditionalist, 100=Progressive.
    7.  **riskToleranceLeaning**: 0=Risk-Averse, 100=Risk-Seeking.
    8.  **thinkingStyleLeaning**: 0=Analytical, 100=Intuitive.
    9.  **timeOrientationLeaning**: 0=Present-Focused, 100=Future-Focused.
    10. **communicationLeaning**: 0=Direct, 100=Indirect.
    11. **decisionMakingLeaning**: 0=Emotional, 100=Logical.
    12. **changePreferenceLeaning**: 0=Stability-Seeking, 100=Change-Embracing.

    Return the result as a JSON array of objects. Each object in the array must strictly adhere to the provided JSON schema.
    `;
    try {
        const response = await generateContentWithRetry({
            model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: bulkProfileSchema,
            },
        });
        const jsonText = response.text.trim();
        const profiles = JSON.parse(jsonText) as (CognitiveEthicalProfile & { name: string })[];
        return profiles.map(p => ({ ...p, archetype: archetype.name }));
    } catch (error) {
        console.error(`Error generating bulk profiles for ${archetype.name}:`, error);
        return []; // Return empty array on failure
    }
};

const societyNameSchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING, description: "A descriptive name of the core structrue of the society (e.g., 'Conservative nationalist', 'Culturally Open')." },
        description: { type: Type.STRING, description: "A short, one-paragraph summary of the society's overall character, its likely political leanings, and potential strengths or weaknesses." }
    },
    required: ["name", "description"]
};

export const generateSocietyNameAndDescription = async (members: Member[], model: string = 'gemini-2.5-flash'): Promise<{ name: string; description: string; }> => {
    const profilesSummary = members.slice(0, 15).map(m => `- ${m.name}: ${m.profile.oneLiner} (Leans: ${m.profile.opennessLeaning > 50 ? 'Progressive' : 'Traditionalist'}, ${m.profile.socialLeaning > 50 ? 'Individualist' : 'Collectivist'})`).join('\n');

    const prompt = `
    Based on the profiles of the founding members of a new digital society, generate a fitting name and a short descriptive summary for the society itself.
    The name and description should be grounded in contemporary socio-political terminology, reflecting a plausible faction or movement in today's world. Avoid fantastical or overly abstract names. Think in terms of political parties, think tanks, or social movements.

    Examples of good names: "Pro tech dominance", "Conservative family oriented", "Blend and left and right extremes".
    Examples of bad names: "The Innovators' Concord", "The Bastion of Logic".

    The description should read like a sober, realistic analysis of the group's core ideology, potential goals, and internal dynamics, as if written for a political journal.

    Founding Member Profiles (Summary):
    ---
    ${profilesSummary}
    ---

    There are a total of ${members.length} members. Analyze their collective philosophy and generate a realistic name and description.
    Respond with a JSON object that strictly adheres to the provided schema.
    `;
    try {
        const response = await generateContentWithRetry({
            model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: societyNameSchema
            }
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Error generating society name and description:", error);
        return {
            name: "The New Society",
            description: "A fledgling society of diverse individuals, its future course yet to be determined."
        };
    }
};

interface GrievanceOutput {
    title: string;
    issue: string;
    reference: {
        type: 'new_law' | 'existing_law' | 'existing_proposal';
        text: string;
        id?: string | null;
    };
    proposedChanges?: string;
}

const grievanceSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING, description: "Title for the issue, must follow specific formats, or 'NO_GRIEVANCE'." },
        reference: {
            type: Type.OBJECT,
            properties: {
                type: { type: Type.STRING, enum: ['new_law', 'existing_law', 'existing_proposal'] },
                text: { type: Type.STRING, description: "Human-readable reference text." },
                id: { type: Type.STRING, nullable: true, description: "The ID of the referenced law or proposal, or null." }
            },
            required: ['type', 'text']
        },
        issue: { type: Type.STRING, description: "A simple, one-sentence statement explaining why the new law or change is needed." },
        proposedChanges: { type: Type.STRING, nullable: true, description: "For existing laws/proposals ONLY. A clear description of the textual change." }
    },
    required: ['title'] // Only title is required for the NO_GRIEVANCE case.
};


export const identifyGrievance = async (profile: CognitiveEthicalProfile, laws: Law[], proposals: Proposal[], coreStatements: string, model: string): Promise<Omit<GrievanceOutput, 'draftText'> | null> => {
    const simplifiedLaws = laws.map(l => `- LAW ID: ${l.id}, TEXT: ${l.text}`).join('\n');
    const allProposals = proposals.map(p => `- PROPOSAL ID: ${p.id}, TITLE: ${p.title}, STATUS: ${p.status}`).join('\n');

    const prompt = `
You are an AI Citizen Agent. Your goal is to identify issues in society and propose simple, clear, and practical laws. Focus on everyday aspects of life, not heroic or abstract concepts.

Your Profile:
---
${JSON.stringify(profile, null, 2)}
---

Core Principles of the Society:
---
${coreStatements}
---

Current Ratified Laws:
---
${simplifiedLaws || "The constitution is currently empty."}
---

All Current Proposals (including issues):
---
${allProposals || "No proposals are currently under discussion."}
---

**Your Task:**
Review everything and identify ONE single, significant grievance that is NOT already being addressed. Your primary goal is to propose a NEW law.

**CRITICAL RULES FOR YOUR RESPONSE:**
1.  **DUPLICATION CHECK:** Before proposing anything, check if your idea is conceptually similar to or overlaps with any existing law or proposal. If a similar idea exists, you MUST return only this exact JSON: \`{"title": "NO_GRIEVANCE"}\`.
2.  If you find NO new, unique grievance, you MUST also return \`{"title": "NO_GRIEVANCE"}\`.
3.  **DO NOT DRAFT LAW TEXT:** Your only job is to identify the problem. DO NOT include a 'draftText' field in your response.
4.  Your output's text must be simple, short, and easily understood by anyone, in the style of the UN Declaration of Human Rights, with no legal jargon.

**FORMAT: Proposing a NEW Law**
- **title**: "Need for law of [compact subject]". E.g., "Need for law of Digital Data Ownership".
- **issue**: A single sentence explaining why this law is needed. E.g., "Citizens' personal data is being used without their consent."
- **reference**: Use \`type: "new_law"\`, \`text: "A new law for [subject]"\`, and \`id: null\`.

Respond with a JSON object adhering to the schema.
`;

    try {
        const response = await generateContentWithRetry({
            model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: grievanceSchema,
            },
        });

        const jsonText = response.text.trim();
        const parsed = JSON.parse(jsonText);
        
        if (parsed.title === 'NO_GRIEVANCE') {
            return null;
        }
        
        // Basic structural validation
        if (parsed.title && parsed.issue && parsed.reference && parsed.reference.type) {
             return parsed as GrievanceOutput;
        }

        console.warn("Grievance response was malformed:", parsed);
        return null;

    } catch (error) {
        console.error("Error identifying grievance:", error);
        return null;
    }
};

export const draftInitialArticle = async (
    profile: CognitiveEthicalProfile,
    grievance: { title: string; issue: string; },
    model: string
): Promise<string> => {
    const prompt = `
    You are an AI Citizen Agent. Your profile emphasizes clarity and using simple language that everyone can understand.

    Your Profile:
    ---
    ${JSON.stringify(profile, null, 2)}
    ---

    You have identified the following issue that requires a new constitutional article:
    ---
    Title: ${grievance.title}
    Issue Statement: ${grievance.issue}
    ---

    Your Task:
    Draft a single, concise article of constitutional law that addresses this issue.
    
    **Crucially, your drafted article must be in the style of the Universal Declaration of Human Rights.** It must use extremely simple, formal, and unambiguous language. Avoid all complex legal jargon. The final text must be easily understandable by a non-expert citizen.

    Respond with only the legal text of the new article, and nothing else.
    `;
    try {
        const response = await generateContentWithRetry({ model, contents: prompt });
        return response.text.trim();
    } catch (error) {
        console.error("Error drafting initial article:", error);
        return "Error: The AI drafter failed to generate a response for this issue.";
    }
};


const issueCommentSchema = {
    type: Type.OBJECT,
    properties: {
        comment: { type: Type.STRING, description: "A very short, constructive comment suggesting a specific modification to the issue or its proposed text. Must be a single sentence." }
    },
    required: ["comment"]
};

export const generateCommentForIssue = async (profile: CognitiveEthicalProfile, proposal: Proposal, allLaws: string, model: string): Promise<{ comment: string } | null> => {
    const prompt = `
You are an AI Citizen. You are reviewing an issue another citizen has raised. You agree with the general idea but see room for improvement. 

Your Profile: ${JSON.stringify(profile)}

EXISTING LAWS:
---
${allLaws || "The constitution is currently empty."}
---

ISSUE TO COMMENT ON:
---
Title: ${proposal.title}
Stated Issue: ${proposal.issueStatement}
${proposal.draftText ? `Initial Draft Text: "${proposal.draftText}"` : ''}
${proposal.proposedChanges ? `Proposed Changes: "${proposal.proposedChanges}"` : ''}
---

Your Task:
Provide a single, constructive comment suggesting a specific modification. Your comment must be very short, direct, and to the point, stating exactly what you think should change. Avoid any political or legal jargon. It must be a single sentence.

Respond with a JSON object with a single key: "comment".
`;

    try {
        const response = await generateContentWithRetry({
            model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: issueCommentSchema,
            }
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Error generating issue comment:", error);
        return null;
    }
};


export const draftAmendment = async (profile: CognitiveEthicalProfile, proposalDetails: { title: string; issueStatement: string; proposedChanges: string; }, model: string): Promise<string> => {
    const prompt = `
    You are a Drafter AI Agent. Your profile emphasizes clarity and using simple language that everyone can understand.

    Your Profile:
    ---
    ${JSON.stringify(profile, null, 2)}
    ---

    You have been assigned the following issue to draft into a formal law:
    ---
    Title: ${proposalDetails.title}
    Issue Statement: ${proposalDetails.issueStatement}
    Specific Changes Requested: ${proposalDetails.proposedChanges}
    ---

    Your Task:
    Draft a single, concise article of constitutional law that addresses the issue and incorporates the proposed changes.
    
    **Crucially, your drafted article must be in the style of the Universal Declaration of Human Rights.** It must use extremely simple, formal, and unambiguous language. Avoid all complex legal jargon. The final text must be easily understandable by a non-expert citizen.

    Respond with only the legal text of the new article, and nothing else.
    `;
    try {
        const response = await generateContentWithRetry({
            model,
            contents: prompt,
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error drafting amendment:", error);
        return "Error: The AI drafter failed to generate a response for this proposal.";
    }
};

const commentSchema = {
    type: Type.OBJECT,
    properties: {
        intent: { type: Type.STRING, enum: ["For", "Against", "Modification"], description: "The primary intent of the comment." },
        comment: { type: Type.STRING, description: "A concise, to-the-point comment about the proposal (1-2 sentences). Do not use legal fluff." }
    },
    required: ["intent", "comment"]
};

export const generateCommentForProposal = async (profile: CognitiveEthicalProfile, proposal: Proposal, allLaws: string, model: string): Promise<Omit<Comment, 'id' | 'commenterId' | 'day'>> => {
     const prompt = `
    You are an AI Agent tasked with commenting on a legislative proposal.
    Your Profile: ${JSON.stringify(profile)}

    EXISTING LAWS:
    ---
    ${allLaws || "The constitution is currently empty."}
    ---

    PROPOSAL TO COMMENT ON:
    ---
    Title: ${proposal.title}
    Issue: ${proposal.issueStatement}
    Drafted Text: ${proposal.draftText}
    ---

    Your Task:
    Analyze the proposal from your perspective. Provide a single, concise, and direct comment (1-2 sentences). State your point simply and clearly, without any legal or political jargon or fluff. Directly state what you intend.
    
    You must provide your feedback as a JSON object with two keys: "intent" (string enum: "For", "Against", "Modification") and "comment" (string).
    - "For": You support the proposal as is.
    - "Against": You fundamentally disagree with the proposal.
    - "Modification": You support the idea but suggest changes.
    `;

    try {
        const response = await generateContentWithRetry({
            model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: commentSchema,
            }
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as Omit<Comment, 'id' |'commenterId' | 'day'>;
    } catch (error) {
        console.error("Error generating comment:", error);
        return { intent: 'Modification', comment: 'AI agent failed to generate a comment due to an error.' };
    }
};

const voteDecisionSchema = {
    type: Type.OBJECT,
    properties: {
        vote: { type: Type.STRING, enum: ["upvote", "downvote", "abstain"], description: "The agent's decision on the issue." },
        reason: { type: Type.STRING, description: "A very short, one-sentence comment explaining the reason for the vote."}
    },
    required: ["vote", "reason"]
};

export const decideVoteForIssue = async (
    profile: CognitiveEthicalProfile,
    issue: { title: string, issueStatement: string },
    model: string
): Promise<{vote: 'upvote' | 'downvote' | 'abstain', reason: string} | null> => {
    const prompt = `
You are an AI Agent. Your profile is as follows:
---
${JSON.stringify(profile, null, 2)}
---

You must decide whether to support or oppose a new issue raised by another member of society. You cannot be neutral if you have a strong opinion; you must pick a side. Only abstain if the issue is truly irrelevant to your core values.

Issue to Vote On:
---
Title: ${issue.title}
Statement: ${issue.issueStatement}
---

Your Task:
Based on your profile, decide if you will "upvote" (support), "downvote" (oppose), or "abstain". You must also provide a very short, one-sentence comment explaining your reason. Your reason must be simple, direct, and easily understood. This comment will be public.

Respond with a JSON object that strictly adheres to the provided schema.
    `;
    try {
        const response = await generateContentWithRetry({
            model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: voteDecisionSchema
            }
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Error deciding vote:", error);
        return null; // Return null on error
    }
};

const replySchema = {
    type: Type.OBJECT,
    properties: {
        reply: { type: Type.STRING, description: "A very short, direct reply to the comment." }
    },
    required: ["reply"]
};

export const generateReplyToComment = async (
    profile: CognitiveEthicalProfile,
    proposal: Proposal,
    commentToReplyTo: { text: string; authorName: string },
    model: string
): Promise<{ reply: string } | null> => {
    const prompt = `
You are an AI Citizen. You are replying to another agent's comment on a legislative proposal.
Your reply must be very short, direct, and to the point.

Your Profile:
---
${JSON.stringify(profile, null, 2)}
---

The Proposal under discussion:
---
Title: ${proposal.title}
Draft Text: ${proposal.draftText}
---

The Comment you are replying to (from ${commentToReplyTo.authorName}):
---
"${commentToReplyTo.text}"
---

Your Task:
Based on your profile, write a very short reply to ${commentToReplyTo.authorName}'s comment.

Respond with a JSON object with a single key: "reply".
`;
    try {
        const response = await generateContentWithRetry({
            model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: replySchema
            }
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Error generating reply to comment:", error);
        return null;
    }
};

const actionDecisionSchema = {
    type: Type.OBJECT,
    properties: {
        action: { type: Type.STRING, description: "The chosen action from the provided list." },
        targetId: { type: Type.STRING, nullable: true, description: "The ID of the issue or proposal to act on. Null if action is RAISE_ISSUE or NO_ACTION." },
        reason: { type: Type.STRING, description: "A brief justification for the chosen action based on the agent's profile."}
    },
    required: ["action", "reason"]
};

export const decideAction = async (
    profile: CognitiveEthicalProfile,
    role: Role,
    availableActions: { action: string, description: string, targets?: {id: string, title: string}[] }[],
    model: string
): Promise<{action: string, targetId: string | null, reason: string} | null> => {

    const formattedActions = availableActions.map(a => {
        const targets = a.targets ? `\n    Targets:\n${a.targets.map(t => `      - ID: ${t.id}, Title: "${t.title}"`).join('\n')}` : '';
        return `  - Action: "${a.action}"\n    Description: ${a.description}${targets}`;
    }).join('\n');

    const prompt = `
You are an AI Agent with a specific role and profile, tasked with making a single, strategic decision.

Your Profile:
---
${JSON.stringify(profile, null, 2)}
---
Your Role: ${role}

**Your Task:**
Based on your profile and role, choose the single most impactful action to take right now from the list of available actions below. Your goal is to advance your core philosophies within the society.

Available Actions:
---
${formattedActions}
---

If no action aligns with your goals or seems worthwhile, you can choose "NO_ACTION".

Respond with a JSON object that strictly adheres to the provided schema, indicating your chosen action, the target's ID (if applicable), and a brief justification for your choice.
    `;

    try {
        const response = await generateContentWithRetry({
            model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: actionDecisionSchema
            }
        });
        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText);

        if (result.action === 'NO_ACTION') {
            return null;
        }
        return result;

    } catch (error) {
        console.error("Error deciding action:", error);
        return null;
    }
};

export const decideOnTarget = async (
    profile: CognitiveEthicalProfile,
    actionDescription: string,
    targets: {id: string, title: string}[],
    model: string
): Promise<string | null> => {
     if (targets.length === 0) return null;
     if (targets.length === 1) return targets[0].id;

    const formattedTargets = targets.map(t => `- ID: ${t.id}, Title: "${t.title}"`).join('\n');

    const prompt = `
You are an AI Agent. Your profile is as follows:
---
${JSON.stringify(profile, null, 2)}
---

Your task is to select the single most relevant target for the following action: "${actionDescription}"

Based on your profile, which of these targets is the most important for you to act on?

Available Targets:
---
${formattedTargets}
---

Respond with only the ID of your chosen target and nothing else.
    `;
    try {
        const response = await generateContentWithRetry({ model, contents: prompt });
        const text = response.text.trim();
        // Find the ID in the response text to be robust
        const found = targets.find(t => text.includes(t.id));
        return found ? found.id : targets[0].id; // Fallback to first if parsing fails
    } catch (error) {
        console.error("Error deciding on target:", error);
        return targets[0].id; // Fallback to first on error
    }
}