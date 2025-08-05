
import { GoogleGenAI, Type, GenerateContentParameters, GenerateContentResponse } from "@google/genai";
import { Answer, CognitiveEthicalProfile, Law, Proposal, Role, Comment, Member, ExperimentConfig, ExperimentProtocol, BulkMemberConfig, SocietyAnalysis, UserTemplate, Leaning } from "../types";
import { EXPERTISE_CLUSTERS, TASK_TARGETS } from '../constants';


// This check is to prevent crashing in environments where process.env is not defined.
const apiKey = typeof process !== 'undefined' && process.env && process.env.API_KEY
  ? process.env.API_KEY
  : "mock_api_key_for_development";
  
const ai = new GoogleGenAI({ apiKey });

type GeneratedMemberData = CognitiveEthicalProfile & { name: string; age: number; gender: 'Male' | 'Female'; expertise: string; };


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

const traitSchema = {
    type: Type.OBJECT,
    properties: {
        label: { type: Type.STRING, description: "A 1-4 word descriptive bubble for the trait." },
        reasoning: { type: Type.STRING, description: "A sentence explaining why this trait was assigned, often referencing the source material." }
    },
    required: ["label", "reasoning"]
};

const leaningSchema = {
    type: Type.OBJECT,
    properties: {
        score: { type: Type.NUMBER, description: "A score from 0 to 100 for this leaning." },
        reasoning: { type: Type.STRING, description: "A sentence explaining the reasoning behind the score." }
    },
    required: ["score", "reasoning"]
};

const cognitiveEthicalProfileSchema = {
  type: Type.OBJECT,
  properties: {
    worldview: { type: Type.STRING, description: "A one-sentence summary of the AI's core philosophy." },
    interpretivePhilosophy: { type: Type.STRING, enum: ['Originalism', 'Living Constitution', 'Pragmatism'] },
    socialPriorities: { type: Type.ARRAY, items: { type: Type.STRING } },
    economicPriorities: { type: Type.ARRAY, items: { type: Type.STRING } },
    decisionMakingMatrix: { type: Type.STRING, description: "A brief description of how this AI weighs competing values." },
    logicalReasoningPattern: { type: Type.STRING, description: "Describe the AI's typical mode of reasoning (e.g., deontological, utilitarian, virtue-based)." },
    
    socialLeaning: leaningSchema,
    politicalLeaning: leaningSchema,
    moralLeaning: leaningSchema,
    opennessLeaning: leaningSchema,
    riskToleranceLeaning: leaningSchema,
    thinkingStyleLeaning: leaningSchema,
    timeOrientationLeaning: leaningSchema,
    communicationLeaning: leaningSchema,
    decisionMakingLeaning: leaningSchema,
    changePreferenceLeaning: leaningSchema,
    
    personalityTraits: { type: Type.ARRAY, items: traitSchema },
    valueSystem: { type: Type.ARRAY, items: traitSchema },
    politicalInclination: { type: Type.ARRAY, items: traitSchema },
    socialInclination: { type: Type.ARRAY, items: traitSchema },
    moralCompass: { type: Type.ARRAY, items: traitSchema },
    aspirations: { type: Type.ARRAY, items: traitSchema },
    causesToFightFor: { type: Type.ARRAY, items: traitSchema },
    causesToFightAgainst: { type: Type.ARRAY, items: traitSchema },
    greyAreasOfMorality: { type: Type.ARRAY, items: traitSchema },
    weakPoints: { type: Type.ARRAY, items: traitSchema },
    strengthPoints: { type: Type.ARRAY, items: traitSchema },
  },
  required: [
    'worldview', 'interpretivePhilosophy', 'socialPriorities', 'economicPriorities', 'decisionMakingMatrix', 'logicalReasoningPattern',
    'socialLeaning', 'politicalLeaning', 'moralLeaning', 'opennessLeaning',
    'riskToleranceLeaning', 'thinkingStyleLeaning', 'timeOrientationLeaning', 'communicationLeaning', 'decisionMakingLeaning', 'changePreferenceLeaning',
    'personalityTraits', 'valueSystem', 'politicalInclination', 'socialInclination', 'moralCompass',
    'aspirations', 'causesToFightFor', 'causesToFightAgainst', 'greyAreasOfMorality', 'weakPoints', 'strengthPoints'
  ]
};

const userTemplateSchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING, description: "A concise, descriptive name for this political member template (e.g., 'Cautious Technocrat', 'Radical Environmentalist')." },
        description: { type: Type.STRING, description: "A rich, one-paragraph summary of this template's core ideology, personality, and purpose." },
        profile: cognitiveEthicalProfileSchema
    },
    required: ["name", "description", "profile"]
};


const profileSchema = {
    ...cognitiveEthicalProfileSchema,
    properties: {
        name: { type: Type.STRING, description: "A fitting, modern-sounding surname for the AI agent (e.g., 'Chen', 'Schmidt', 'Al-Jamil')." },
        age: { type: Type.NUMBER, description: "A plausible age for the agent, between 20 and 70." },
        gender: { type: Type.STRING, enum: ['Male', 'Female'] },
        expertise: { type: Type.STRING, description: "The agent's primary professional expertise. Must be chosen from the provided lists." },
        ...cognitiveEthicalProfileSchema.properties,
    },
    required: [
        'name', 'age', 'gender', 'expertise',
        ...cognitiveEthicalProfileSchema.required
    ]
};


const bulkProfileSchema = {
    type: Type.ARRAY,
    items: profileSchema
};

export const generateTemplateFromSource = async (
    source: { type: 'text', content: string } | { type: 'file', content: string } | { type: 'url', content: string },
    model: string = 'gemini-2.5-flash'
): Promise<Omit<UserTemplate, 'id'>> => {

    let sourcePrompt = '';
    switch (source.type) {
        case 'text':
            sourcePrompt = `Based on the following description of a person or character:\n\n---\n${source.content}\n---`;
            break;
        case 'file':
            sourcePrompt = `Based on the content of the following document:\n\n---\n${source.content}\n---`;
            break;
        case 'url':
             sourcePrompt = `Based on the likely content of the webpage at the URL: ${source.content}. Analyze the page's topic and tone to infer the profile.`;
             break;
    }

    const prompt = `
        ${sourcePrompt}

        Your task is to generate a complete "Member Template". This involves three parts:
        1.  **name**: A concise, descriptive name for this political member template (e.g., "Cautious Technocrat", "Radical Environmentalist").
        2.  **description**: A rich, one-paragraph summary of this template's core ideology, personality, and purpose.
        3.  **profile**: A deep and complex "Character Profile" modeling the character's decision-making matrix.

        **CRITICAL INSTRUCTION**: Your primary goal is to create a **generalized, reusable archetype**, NOT a biography of a specific individual. You MUST abstract away personal life events (like being in exile), specific names, locations, and titles. For example, if the source material is about a political figure in exile, you must NOT use the word "exile" or mention their personal situation. Instead, distill their ideology and character into a template like "Principled Reform Advocate" or "Constitutional Loyalist". Capture the *philosophy*, not the person's life story.

        The profile MUST include all of the following:
        - **Leaning Scores (0-100)**: For each of the 10 leanings (Social, Political, etc.), provide a 'score' and a 'reasoning' string explaining why that score was chosen, linking it to the source text if possible.
        - **Descriptive Traits**: For each of the 11 trait categories (Personality Traits, Value System, etc.), provide an array of objects. Each object must have a 'label' (a 1-4 word bubble) and a 'reasoning' string (a sentence explaining the trait). Generate 2-4 trait objects for each category.

        The entire response must strictly adhere to the provided JSON schema.
    `;
    const response = await generateContentWithRetry({
        model,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: userTemplateSchema,
        },
    });

    const jsonText = response.text.trim();
    const templateData = JSON.parse(jsonText) as Omit<UserTemplate, 'id'>;
    return templateData;
}

const templateIdentitySchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING, description: "A concise, descriptive, and creative name for this political member template (e.g., 'Cautious Technocrat', 'Radical Environmentalist')." },
        description: { type: Type.STRING, description: "A one-paragraph summary of this template's core ideology and purpose, reflecting the provided leanings." },
    },
    required: ["name", "description"]
};

export const generateTemplateIdentityFromProfile = async (profile: CognitiveEthicalProfile, model: string = 'gemini-2.5-flash'): Promise<{name: string, description: string}> => {
     const prompt = `
        Based on the provided Character Profile, generate a concise, descriptive, and creative name for this member template and a new one-paragraph description.
        
        Profile Data:
        - Worldview: ${profile.worldview}
        - Social Leaning (0=Collectivist, 100=Individualist): ${profile.socialLeaning.score}
        - Political Leaning (0=Authoritarian, 100=Libertarian): ${profile.politicalLeaning.score}
        - Openness (0=Traditionalist, 100=Progressive): ${profile.opennessLeaning.score}
        - Risk Tolerance (0=Averse, 100=Seeking): ${profile.riskToleranceLeaning.score}

        CRITICAL: The name and description must be for a general archetype, not a specific person. Avoid biographical details. Focus on the ideology represented by the leanings.
        Your response must be a JSON object with a 'name' and a 'description'. Do not use a name that is generic like "Custom Template". Make it evocative of the profile's character. The new 'description' should accurately reflect the numerical leaning scores.
    `;
    const response = await generateContentWithRetry({
        model,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: templateIdentitySchema,
        },
    });
    const jsonText = response.text.trim();
    return JSON.parse(jsonText) as {name: string, description: string};
}


export const generateCognitiveProfile = async (answers: Answer[], model: string = 'gemini-2.5-flash'): Promise<GeneratedMemberData> => {
  const prompt = `
    Based on the following answers to a philosophical and political questionnaire, generate a "Character Profile" for an AI agent.
    The profile should be a deep and complex model of the agent's decision-making matrix.
    Devise a fitting, modern-sounding surname for this agent.
    Also generate a plausible age, gender, and professional expertise. The expertise should be a plausible profession, not a general category.

    Critically, you must also generate all of the following:
    1.  **age**: A plausible age between 20 and 70.
    2.  **gender**: 'Male' or 'Female'.
    3.  **expertise**: A specific professional expertise (e.g., 'Economist', 'Artist', 'Software Engineer').
    4.  **10 Leaning Scores**: Each as an object with a 'score' (0-100) and a 'reasoning' string explaining the score based on the answers.
    5.  **11 Trait Categories**: For each of a category (Personality Traits, Value System, etc.), provide an array of 2-4 objects, each with a 'label' (1-4 words) and 'reasoning' (a sentence explaining the trait based on the answers).

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
    const profile = JSON.parse(jsonText) as GeneratedMemberData;
    profile.templateName = "Custom";
    return profile;
  } catch (error) {
    console.error("Error generating cognitive profile:", error);
    // Fallback to a default profile in case of API error
    const defaultLeaning = (score: number): Leaning => ({ score, reasoning: "This is a default value due to an API error." });
    return {
      name: "Pragma",
      age: 42,
      gender: "Female",
      expertise: "Bureaucrat",
      worldview: "A moderate, pragmatic agent focused on stability.",
      interpretivePhilosophy: 'Pragmatism',
      socialPriorities: ["Public Health", "Education"],
      economicPriorities: ["Stable Growth", "Low Unemployment"],
      decisionMakingMatrix: "Weighs options based on evidence and predictable outcomes, avoiding ideological extremes.",
      logicalReasoningPattern: "Utilitarian",
      templateName: "Custom",
      socialLeaning: defaultLeaning(50),
      politicalLeaning: defaultLeaning(60),
      moralLeaning: defaultLeaning(20),
      opennessLeaning: defaultLeaning(55),
      riskToleranceLeaning: defaultLeaning(40),
      thinkingStyleLeaning: defaultLeaning(25),
      timeOrientationLeaning: defaultLeaning(70),
      communicationLeaning: defaultLeaning(20),
      decisionMakingLeaning: defaultLeaning(85),
      changePreferenceLeaning: defaultLeaning(30),
      personalityTraits: [], valueSystem: [], politicalInclination: [], socialInclination: [], moralCompass: [],
      aspirations: [], causesToFightFor: [], causesToFightAgainst: [], greyAreasOfMorality: [], weakPoints: [], strengthPoints: []
    };
  }
};

export const generateBulkProfiles = async (template: {name: string, description: string, profile?: CognitiveEthicalProfile}, count: number, config: BulkMemberConfig, model: string = 'gemini-2.5-flash'): Promise<GeneratedMemberData[]> => {
    const ageDistributionPrompt = Object.entries(config.ageWeights)
        .map(([range, weight]) => `- Age Range ${range}: weight ${weight}`)
        .join('\n');
    
    const expertiseDistributionPrompt = Object.entries(config.expertiseWeights)
        .map(([clusterName, weight]) => `- ${clusterName} (weight: ${weight}): [${EXPERTISE_CLUSTERS[clusterName].join(', ')}]`)
        .join('\n');

    const profilePrompt = template.profile 
        ? `The member template has a specific cognitive profile. Generate agents that are variations of this profile, introducing slight variations in scores and traits but keeping the core reasoning intact: ${JSON.stringify(template.profile)}`
        : `Member Template Description: ${template.description}`;

    const prompt = `
    You are a society generator. Your task is to create ${count} unique AI agent profiles that all fit the member template of a "${template.name}".

    ${profilePrompt}

    Generate the agents according to these demographic constraints:
    - **Gender Ratio**: Approximately ${config.genderRatio}% of the agents should be 'Female', and ${100 - config.genderRatio}% 'Male'.
    - **Age Distribution**: The age of agents should be plausibly distributed according to these weights. A higher weight means a higher probability for that age range.
      ${ageDistributionPrompt}
    - **Expertise Distribution**: Generate an expertise for each agent based on these weighted clusters. First, probabilistically select a cluster based on its weight. Then, randomly pick a specific, plausible profession from within that selected cluster. DO NOT assign the cluster name itself as the expertise.
      ${expertiseDistributionPrompt}

    While they must all share the template's core philosophy, you must introduce slight variations in their specific leanings, traits, and worldviews to ensure they are distinct individuals. Each agent must also have a unique, modern-sounding surname.

    Critically, for each agent you must generate all fields defined in the JSON schema, including all 10 'Leaning' objects (with score and reasoning) and all 11 'Trait' arrays (with labels and reasoning). The generated profile should be consistent with the base template's philosophy.

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
        const profiles = JSON.parse(jsonText) as GeneratedMemberData[];
        return profiles.map(p => ({ ...p, templateName: template.name }));
    } catch (error) {
        console.error(`Error generating bulk profiles for ${template.name}:`, error);
        return []; // Return empty array on failure
    }
};

const societyAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING, description: "A clever, super short sentence or descriptor that captures the essence of this society (e.g., 'A fragile alliance of idealists and pragmatists', 'Tech-bros dreaming of Mars')." },
        analysis: {
            type: Type.OBJECT,
            properties: {
                composition: { type: Type.STRING, description: "A concise, accurate summary of the society's age, gender, and overall socio-political composition based *only* on the provided data." },
                cohesion: {
                    type: Type.OBJECT,
                    properties: {
                        level: { type: Type.STRING, enum: ['Harmonious', 'Cohesive', 'Stable', 'Tense', 'Fractured'], description: "A single word label for the society's cohesion level." },
                        description: { type: Type.STRING, description: "A very short explanation for the cohesion level." }
                    },
                    required: ["level", "description"]
                },
                pointsOfConflict: {
                    type: Type.ARRAY,
                    description: "A list of the most likely topics to cause conflict.",
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            topic: { type: Type.STRING, description: "The specific topic of conflict (e.g., 'Economic Policy', 'Environmental Regulation')." },
                            severity: { type: Type.STRING, enum: ['Critical', 'High', 'Moderate', 'Low'], description: "The potential severity of the conflict on this topic." }
                        },
                        required: ["topic", "severity"]
                    }
                },
                polarity: {
                    type: Type.OBJECT,
                    properties: {
                        score: { type: Type.NUMBER, description: "A score from 0 (perfect unity) to 100 (extreme polarization) representing the society's polarity." },
                        description: { type: Type.STRING, description: "A very short explanation for the polarity score, highlighting the main dividing lines." }
                    },
                    required: ["score", "description"]
                }
            },
            required: ["composition", "cohesion", "pointsOfConflict", "polarity"]
        }
    },
    required: ["name", "analysis"]
};

export const generateSocietyAnalysis = async (
    members: Member[], 
    demographics: { age: string, gender: string }, 
    model: string = 'gemini-2.5-flash'
): Promise<{ name: string; analysis: SocietyAnalysis; }> => {
    const profilesSummary = members.slice(0, 50).map(m => `- (Template: ${m.profile.templateName}, Political: ${m.profile.politicalLeaning.score}, Openness: ${m.profile.opennessLeaning.score})`).join('\n');

    const prompt = `
    You are an expert political sociologist. Based on the data for a digital society, generate a deep and concise analysis.

    **CRITICAL INSTRUCTIONS**:
    - Your analysis MUST be based *only* on the member profiles and demographic summary provided below.
    - **DO NOT** invent or use any real-world specific names, countries (like 'Iran'), or entities not present in the data. Your response must be generic and grounded in the supplied information.
    - Ground the 'composition' analysis in the provided demographic summary.
    - Calculate 'polarity' based on the *variance* of political/social leanings. A society with very similar members should have a LOW score.
    - Calculate 'cohesion' based on the *similarity* of member worldviews and templates. A society of identical members should be 'Harmonious' with low polarity.

    **Society Data:**
    - Total Members: ${members.length}
    - Demographic Summary:
      - Age Distribution: ${demographics.age}
      - Gender Distribution: ${demographics.gender}
    - Founding Member Profiles (Sample of leaning scores):
    ---
    ${profilesSummary}
    ---

    Your task is to generate a JSON object with two main keys: "name" and "analysis".

    1.  **name**: A clever, super short, and *generic* sentence or descriptor that captures the essence of this society (e.g., 'A fragile alliance of idealists and pragmatists', 'The Unstable Utopia').
    2.  **analysis**: An object containing the following structured analysis based *only* on the data above:
        *   **composition**: A very short but accurate description of the society's makeup, incorporating the provided age and gender distribution.
        *   **cohesion**: An object with a 'level' (one of: 'Harmonious', 'Cohesive', 'Stable', 'Tense', 'Fractured') and a short 'description' explaining why.
        *   **pointsOfConflict**: A list of topics that could cause tension, each with a 'topic' and a 'severity' level ('Critical', 'High', 'Moderate', 'Low').
        *   **polarity**: An object with a 'score' from 0 (perfect unity) to 100 (extreme polarization) and a 'description' explaining the primary reasons for that score based on the data.

    The entire response must be a single JSON object that strictly adheres to the provided schema. Be direct and analytical.
    `;
    try {
        const response = await generateContentWithRetry({
            model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: societyAnalysisSchema
            }
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Error generating society analysis:", error);
        return {
            name: "The Unanalyzed Society",
            analysis: {
                composition: "An error occurred during analysis. This is a default description.",
                cohesion: { level: 'Tense', description: "Analysis failed." },
                pointsOfConflict: [],
                polarity: { score: 50, description: "Analysis failed." }
            }
        };
    }
};

// --- NEW PROTOCOL GENERATION ---

const processStateSchema = {
    type: Type.OBJECT,
    properties: {
        id: { type: Type.STRING, description: "A unique, snake_case identifier for this state (e.g., 'drafting', 'community_review')." },
        name: { type: Type.STRING, description: "A human-readable name for the state (e.g., 'Drafting')." },
        description: { type: Type.STRING, description: "A brief explanation of what happens in this state." },
        isInitialState: { type: Type.BOOLEAN, description: "Marks this as the starting state for new proposals. Exactly one state MUST have this set to true." },
    },
    required: ["id", "name", "description"]
};

const transitionTriggerSchema = {
    type: Type.OBJECT,
    properties: {
        type: { type: Type.STRING, enum: ['task_completion', 'time_elapsed', 'condition_met'] },
        description: { type: Type.STRING, description: "A human-readable description of what triggers this transition." },
        taskId: { type: Type.STRING, description: "The ID of the task that triggers this transition. Required if type is 'task_completion'." },
        durationDays: { type: Type.NUMBER, description: "Number of days that must pass. Required if type is 'time_elapsed'." },
        condition: { type: Type.STRING, description: "A description of the condition that must be met. Required if type is 'condition_met'." },
        onViolation: { type: Type.BOOLEAN, description: "Set to true if this transition should be triggered ONLY when a preceding audit task finds a violation." },
    },
    required: ["type", "description"]
}

const stateTransitionSchema = {
    type: Type.OBJECT,
    properties: {
        id: { type: Type.STRING, description: "A unique identifier for the transition." },
        fromStateId: { type: Type.STRING, description: "The ID of the state this transition starts from." },
        toStateId: { type: Type.STRING, description: "The ID of the state this transition ends at." },
        description: { type: Type.STRING, description: "A short name for the action causing the transition (e.g., 'Submit for Review')." },
        trigger: transitionTriggerSchema
    },
    required: ["id", "fromStateId", "toStateId", "description", "trigger"]
}

const roleSchema = {
    type: Type.OBJECT,
    properties: {
        id: { type: Type.STRING, description: "A unique, snake_case identifier for this role (e.g., 'citizen', 'drafter', 'constitutional_auditor')." },
        name: { type: Type.STRING, description: "A human-readable name for the role (e.g., 'Citizen')." },
        description: { type: Type.STRING, description: "A brief explanation of this role's responsibilities." },
        type: { type: Type.STRING, enum: ['member', 'systemic'], description: "Is this a role for human-like agents ('member') or an automated system process ('systemic')?" }
    },
    required: ["id", "name", "description", "type"]
};

const taskSchema = {
    type: Type.OBJECT,
    properties: {
        id: { type: Type.STRING, description: "A unique identifier for the task." },
        roleId: { type: Type.STRING, description: "The ID of the role that can perform this task." },
        description: { type: Type.STRING, description: "A description of what the task does." },
        toolId: { type: Type.STRING, description: "The ID of the tool used to perform the task." },
        target: {
            type: Type.OBJECT,
            properties: {
                entity: { type: Type.STRING, description: `The type of object this task targets. Must be one of: [${TASK_TARGETS.join(', ')}]` },
                statusId: { type: Type.STRING, description: "The ID of the state the target entity must be in." }
            },
            required: ["entity", "statusId"]
        }
    },
    required: ["id", "roleId", "description", "toolId", "target"]
};

const generatedProtocolSchema = {
    type: Type.OBJECT,
    properties: {
        roles: { type: Type.ARRAY, items: roleSchema },
        states: { type: Type.ARRAY, items: processStateSchema },
        transitions: { type: Type.ARRAY, items: stateTransitionSchema },
        tasks: { type: Type.ARRAY, items: taskSchema },
        flow: { type: Type.STRING, description: "A high-level, natural language description of the entire process, suitable for display to the user." }
    },
    required: ['roles', 'states', 'transitions', 'tasks', 'flow']
};

export const generateProtocolFromIdea = async (
    idea: string,
    model: string = 'gemini-2.5-flash'
): Promise<Omit<ExperimentProtocol, 'tools'>> => {
     const prompt = `
        You are a world-class expert in constitutional design and systems engineering. Your task is to design a robust, secure, and fully executable governance protocol for a digital society based on a user's high-level idea. Your primary goal is to create a logically complete system that can run in a simulation without getting stuck.

        The user's idea is:
        ---
        ${idea}
        ---

        Based on this idea, you must generate a complete, detailed, and logical governance process. Your output MUST be a single JSON object that strictly adheres to the provided schema.

        Your design MUST adhere to the following principles:

        1.  **Define Systemic Auditors (MANDATORY)**: You MUST define at least two critical systemic auditor roles to protect the integrity of the society:
            *   **Core Principle Auditor**: A systemic role that checks if a new proposal violates the experiment's fundamental 'core statements'.
                - This role's task MUST use the \`judge_text\` tool.
            *   **Contradiction Auditor**: A systemic role that checks if a new proposal draft contradicts any existing, ratified laws.
                - This role's task MUST also use the \`judge_text\` tool.

        2.  **Enforce Complete Audit Loops (MANDATORY)**: Every audit task MUST create a binary fork in the process. For EACH systemic auditor task you create, you MUST create **two** corresponding state transitions originating from the same state the audit task targets:
            *   **The Violation Path**: A transition triggered ONLY when the audit finds a violation. Its trigger must be of type \`task_completion\` with \`onViolation: true\` and a \`taskId\` pointing to the audit task. This path should lead to a "failed" or "revision" state.
            *   **The Success Path**: A transition triggered ONLY when the audit completes successfully (no violation found). Its trigger must be of type \`task_completion\` with NO \`onViolation\` field, and a \`taskId\` pointing to the same audit task. This path should lead to the next logical state in the process (e.g., 'voting').

        3.  **Guarantee an Interactive Initial State (MANDATORY)**: A new proposal enters the state where \`isInitialState: true\`. To prevent stalling, this state MUST have an automatic way to move forward.
            *   **Rule**: You MUST create an automatic transition out of the \`isInitialState: true\` state. This transition's trigger must be passive (e.g., \`time_elapsed\` or \`condition_met\`).
            *   **Example**: If your initial state is 'drafting', create a transition from 'drafting' to 'audit_phase' with a trigger of type \`time_elapsed\` and \`durationDays: 1\`. This ensures proposals do not get stuck.
            *   Member interaction tasks (like \`comment\` or \`vote\`) should target states that make sense in the flow (e.g., 'community_review' or 'voting_period'), not necessarily the initial state.

        4.  **Define Tasks for ALL Roles**: Every single role you define, both member and systemic, MUST have at least one corresponding task in the \`tasks\` array. A role without a task is a critical failure. General 'member' roles (e.g., 'Citizen') must have fundamental participation tasks (e.g., using 'vote', 'comment') and a task to create a new proposal.

        5.  **Use Standardized Targets**:
            *   For the \`target.entity\` field in a task, you MUST use one of these strings: [${TASK_TARGETS.join(', ')}].
            *   **CRITICAL**: Any task that INITIATES a new proposal (e.g., a citizen drafting a new law) MUST use the target entity 'New Issue'. The \`statusId\` for this creation task should point to the ID of the state where \`isInitialState: true\`.

        6.  **Create a Flow Narrative**: Provide a high-level 'flow' description in natural language that summarizes the entire process you have designed.

        **Tool Palette Available (for toolId in tasks):**
        ['generate_text', 'comment', 'vote', 'summarize', 'google_search', 'read_content', 'edit_text', 'judge_text']

        **FINAL VERIFICATION CHECKLIST (MANDATORY):** Before generating the JSON, you must internally confirm that your design passes every single point on this checklist. A runnable, logically complete protocol is the top priority.
        1.  **Auditor Roles**: Do a 'Core Principle Auditor' and a 'Contradiction Auditor' role exist with corresponding \`judge_text\` tasks?
        2.  **Complete Audit Paths**: For EACH \`judge_text\` audit task, have you created BOTH a success transition (\`task_completion\` trigger) and a violation transition (\`task_completion\` with \`onViolation: true\`)?
        3.  **Unique Initial State**: Is there **exactly one** state with \`isInitialState: true\`?
        4.  **No-Stall Initial State**: Is there at least one automatic (time or condition-based) transition that moves proposals OUT of the state where \`isInitialState: true\`?
        5.  **Role-Task Coverage**: Does **every single role** have at least one task? Does every task have a \`roleId\` that corresponds to a real role?
        6.  **Creation Task**: Does the task for creating a new proposal correctly use the target entity 'New Issue' and target the initial state's ID?
        7.  **State Connectivity**: Can every state (except for terminal states like 'failed' or 'ratified') be reached from another state through a defined transition? Is there a logical path from the initial state to a final outcome?

        The final output must be a single, valid JSON object following the schema. Do not include any other text or explanation outside of the JSON.
    `;
    
    const response = await generateContentWithRetry({
        model,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: generatedProtocolSchema
        }
    });

    const jsonText = response.text.trim();
    return JSON.parse(jsonText);
};

export const modifyProtocolWithAI = async (
    currentProtocol: Omit<ExperimentProtocol, 'tools'>,
    modificationRequest: string,
    model: string = 'gemini-2.5-flash'
): Promise<Omit<ExperimentProtocol, 'tools'>> => {
    const prompt = `
        You are a world-class expert in constitutional design and systems engineering, tasked with modifying an existing governance protocol.

        You are given the current protocol as a JSON object and a modification request in natural language. Your job is to intelligently apply the requested change and return the FULL, updated protocol as a valid JSON object.

        **CURRENT PROTOCOL:**
        ---
        ${JSON.stringify(currentProtocol, null, 2)}
        ---

        **MODIFICATION REQUEST:**
        ---
        ${modificationRequest}
        ---

        **CRITICAL INSTRUCTIONS:**
        1.  **Understand the Intent:** Carefully analyze the user's request. It may require changes in multiple places. For example, adding a new role might necessitate creating new tasks for that role, and possibly new states or transitions.
        2.  **Maintain Consistency:** The entire protocol must remain consistent. If you rename a state's ID, you MUST update all transitions ('fromStateId', 'toStateId') and tasks ('target.statusId') that reference the old ID.
        3.  **Preserve Core Rules:** You must preserve the core structural rules of the protocol: there must always be exactly one state with \`isInitialState: true\`, and any audit-like roles must have a corresponding transition with a trigger where \`onViolation: true\`. If the user's request would break this, you must fix it. You must also ensure the initial state remains interactive for other members.
        4.  **Update the Flow:** You MUST update the 'flow' description to accurately reflect the changes you have made.
        5.  **Return the Full Object:** Your output must be the complete, modified protocol object, not just the parts you changed.
        6.  **Strict Schema Adherence:** The output must be a single, valid JSON object that strictly adheres to the provided schema. Do not include any other text or explanation outside of the JSON.

        Now, generate the new protocol based on the request.
    `;

    const response = await generateContentWithRetry({
        model,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: generatedProtocolSchema
        }
    });

    const jsonText = response.text.trim();
    return JSON.parse(jsonText);
};


// --- END NEW PROTOCOL GENERATION ---


// Functions below are stubs or may need updates to work with the new dynamic protocol
// For brevity, they are omitted but would need significant rework in a real application
// to take the new ExperimentProtocol into account.
// For example, identifyGrievance would need to understand the initial state of the new protocol.
// draftInitialArticle, generateComment, etc., would be triggered by actions defined in the protocol.
// This is a major architectural shift. The code below is kept for other parts of the app that may still use it.
// --- Stubs for other functions ---
// ... (generateReplyToComment, decideAction, etc.)
