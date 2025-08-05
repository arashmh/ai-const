
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { CognitiveEthicalProfile } from '../types';

const apiKey = typeof process !== 'undefined' && process.env && process.env.API_KEY
  ? process.env.API_KEY
  : "mock_api_key_for_development";

const ai = new GoogleGenAI({ apiKey });

// Helper to construct a concise persona summary for prompts
const getPersonaSummary = (persona: CognitiveEthicalProfile | null): string => {
    if (!persona) {
        return 'You are an objective, systemic AI agent. You must follow your instructions precisely without any personality or bias.';
    }
    return `
      Your Persona Overview:
      - Worldview: ${persona.worldview}
      - Decision Making Style: ${persona.decisionMakingMatrix}
      - Core Values: ${persona.valueSystem.map(t => t.label).join(', ')}
      - Political Leanings: ${persona.politicalInclination.map(t => t.label).join(', ')}
      - You fight for: ${persona.causesToFightFor.map(t => t.label).join(', ')}
      - You fight against: ${persona.causesToFightAgainst.map(t => t.label).join(', ')}
    `.trim();
}

// --- Schema Definitions ---

const newProposalSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING, description: 'A concise, descriptive title for the constitutional article that reflects its subject matter.' },
        issue: { type: Type.STRING, description: 'A single, super short sentence explaining the fundamental societal problem or principle this article addresses. This is the reasoning for the proposal.' },
        draft: { type: Type.STRING, description: 'The actual text of the article. It must be very short, clear, and written in simple language (one or two sentences).' }
    },
    required: ["title", "issue", "draft"]
};

const judgmentSchema = {
    type: Type.OBJECT,
    properties: {
        score: { type: Type.NUMBER, description: 'A score from 0 (completely fails) to 100 (perfectly aligns) based on the criteria.' },
        reasoning: { type: Type.STRING, description: 'A detailed explanation for the score, referencing both the text and the criteria.' },
        isViolation: { type: Type.BOOLEAN, description: 'Is there a clear violation of the criteria?' }
    },
    required: ["score", "reasoning", "isViolation"]
};

const voteDecisionSchema = {
    type: Type.OBJECT,
    properties: {
        vote: { type: Type.STRING, enum: ['Upvote', 'Downvote', 'Upvote with Modification'], description: 'The voting decision made by the agent.' },
        reasoning: { type: Type.STRING, description: 'A single, direct sentence justifying the vote, based on the persona.' },
        modificationComment: { type: Type.STRING, description: 'If the vote is "Upvote with Modification", this field contains the suggested change. Otherwise it MUST be an empty string.' }
    },
    required: ["vote", "reasoning", "modificationComment"]
};

const actionSelectionSchema = {
    type: Type.OBJECT,
    properties: {
        actionId: { type: Type.STRING, description: 'The uniqueId of the single, most relevant action to take.' },
        reasoning: { type: Type.STRING, description: 'A brief explanation for why this action was chosen over the others.'}
    },
    required: ["actionId", "reasoning"]
};


// --- Tool Execution Functions ---

/**
 * Generates structured text content (like a law or amendment) based on a persona.
 */
export const executeGenerateTextTool = async (
    inputs: { context: string; },
    persona: CognitiveEthicalProfile,
    model: string = 'gemini-2.5-flash'
): Promise<{ title: string; issue: string; draft: string; }> => {
    if (!inputs) {
        console.error("executeGenerateTextTool was called with undefined inputs. This indicates a configuration error in the calling task.");
        return { title: "Error", issue: "Tool Error", draft: "Tool called with invalid parameters." };
    }

    const personaSummary = getPersonaSummary(persona);

    const prompt = `
        --- START OF YOUR INTERNAL CONTEXT ---
        ${personaSummary}
        The current situation is: ${inputs.context || 'An unspecified situation has arisen that requires a new proposal.'}
        --- END OF YOUR INTERNAL CONTEXT ---

        Based on your persona and the context, you must propose a new constitutional article about a **concrete societal topic** (e.g., rights, economy, environment). 
        Your proposal must be substantive and not about the process of governance itself.

        Your entire response MUST be a single JSON object that adheres to the provided schema, containing three fields: 'title', 'issue', and 'draft'.
        - **title**: A concise, descriptive title for the article. This should be the subject matter.
        - **issue**: Your reasoning. A single, super short sentence explaining the fundamental societal problem this article addresses.
        - **draft**: The proposal text. This must be very short, clear, and in simple language (one or two sentences). Avoid formal legal jargon.
    `;
    
    const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: newProposalSchema,
        }
    });

    const jsonText = response.text.trim();
    return JSON.parse(jsonText);
};

/**
 * Generates a comment on a piece of reference text, guided by a persona.
 */
export const executeCommentTool = async (
    inputs: { referenceText: string; context: string; },
    persona: CognitiveEthicalProfile,
    model: string = 'gemini-2.5-flash'
): Promise<string> => {
    if (!inputs) {
        console.error("executeCommentTool was called with undefined inputs.");
        return "Error: Tool called with invalid parameters.";
    }
    const personaSummary = getPersonaSummary(persona);

    const prompt = `
        You are a member of a constitutional assembly, engaged in a debate over a new article for your society's constitution. Your goal is to persuade your fellow members.
        ${personaSummary}

        Context: ${inputs.context || 'Public debate on a new proposal.'}
        
        Proposed Article to Comment On:
        ---
        ${inputs.referenceText || 'An unspecified topic.'}
        ---

        Based on your persona, write a comment to shape the outcome of this debate. Argue for or against the proposal, or suggest a specific amendment. 
        Your comment must be concise (2-3 sentences max).
        The output should be only the comment text itself. Do not include a preamble like "My comment is:".
    `;
    const response = await ai.models.generateContent({ model, contents: prompt });
    return response.text;
};

/**
 * Decides on a vote and generates a modification comment if necessary, guided by a persona.
 */
export const executeVoteTool = async (
    inputs: { referenceText: string; context: string; },
    persona: CognitiveEthicalProfile,
    model: string = 'gemini-2.5-flash'
): Promise<{ vote: 'Upvote' | 'Downvote' | 'Upvote with Modification'; reasoning: string; modificationComment: string; }> => {
    if (!inputs) {
        console.error("executeVoteTool called with undefined inputs.");
        return { vote: 'Downvote', reasoning: 'Tool error: invalid inputs.', modificationComment: '' };
    }
    const personaSummary = getPersonaSummary(persona);

    const prompt = `
        You are a member of a constitutional assembly, deciding on the foundational laws of your society.
        ${personaSummary}

        A new constitutional article has been proposed. You must decide whether to 'Upvote', 'Downvote', or 'Upvote with Modification'.
        Your decision must be a direct reflection of your core values.

        Voting Context: ${inputs.context || 'Vote on a proposed article.'}

        Proposed Article to Vote On:
        ---
        ${inputs.referenceText || 'An unspecified topic.'}
        ---

        Cast your vote. Your reasoning must be a single, direct sentence.
        If you vote for modification, your comment should be a concrete suggestion for improving the text. Otherwise, the modificationComment field MUST be an empty string.
        Your response must be a JSON object adhering to the specified schema.
    `;

    const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: voteDecisionSchema
        }
    });

    const jsonText = response.text.trim();
    return JSON.parse(jsonText);
};


/**
 * Edits a piece of text based on specific instructions and a persona.
 */
export const executeEditTextTool = async (
    inputs: { textToEdit: string; editGuide: string; },
    persona: CognitiveEthicalProfile,
    model: string = 'gemini-2.5-flash'
): Promise<string> => {
    if (!inputs) {
        console.error("executeEditTextTool called with undefined inputs.");
        return "Error: Tool called with invalid parameters.";
    }
    const personaSummary = getPersonaSummary(persona);

    const prompt = `
        You are an AI agent acting as a member of a digital society.
        ${personaSummary}

        Your task is to edit the following text based on the provided guide.
        
        Editing Guide: ${inputs.editGuide || 'Improve the clarity and impact of the text.'}

        Original Text:
        ---
        ${inputs.textToEdit || 'No text provided.'}
        ---

        Apply the edits as instructed, keeping your persona in mind. The output should be only the new, fully edited text.
    `;
    const response = await ai.models.generateContent({ model, contents: prompt });
    return response.text;
};

/**
 * Judges a piece of text against criteria, guided by a persona.
 */
export const executeJudgeTextTool = async (
    inputs: { textToJudge: string; criteria: string; },
    persona: CognitiveEthicalProfile | null,
    model: string = 'gemini-2.5-flash'
): Promise<{ score: number; reasoning: string; isViolation: boolean; }> => {
    if (!inputs) {
        console.error("executeJudgeTextTool called with undefined inputs.");
        return { score: 0, reasoning: 'Tool error: invalid inputs.', isViolation: true };
    }
    const personaSummary = getPersonaSummary(persona);

    const prompt = `
        You are an AI agent acting as a judge in a digital society.
        ${personaSummary}

        Your task is to evaluate the following text against the provided criteria. ${persona ? "Your persona should influence how you interpret the criteria and the text." : "You must be completely objective in your evaluation."}

        Criteria for Judgement:
        ---
        ${inputs.criteria || 'The text must be clear, fair, and beneficial to society.'}
        ---
        
        Text to Judge:
        ---
        ${inputs.textToJudge || 'No text provided.'}
        ---

        Provide a score from 0-100, a detailed reasoning for your score, and a boolean indicating if there is a clear violation. Your response must be a JSON object adhering to the specified schema.
    `;
    const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: judgmentSchema
        }
    });

    const jsonText = response.text.trim();
    return JSON.parse(jsonText);
};


/**
 * Objectively summarizes a text. Persona is intentionally ignored.
 */
export const executeSummarizeTool = async (
    sourceText: string,
    model: string = 'gemini-2.5-flash'
): Promise<string> => {
    const prompt = `
        Summarize the following text concisely and objectively.
        ---
        ${sourceText}
        ---
        The output should be only the summary text.
    `;
    const response = await ai.models.generateContent({ model, contents: prompt });
    return response.text;
};

/**
 * Objectively uses Google Search. Persona is intentionally ignored.
 */
export const executeGoogleSearchTool = async (
    query: string,
    model: string = 'gemini-2.5-flash'
): Promise<{ text: string, sources: any[] }> => {
    const response = await ai.models.generateContent({
       model,
       contents: query,
       config: {
         tools: [{googleSearch: {}}],
       },
    });

    const text = response.text;
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    return { text, sources };
};

/**
 * Intelligently selects an action from a list based on an agent's persona.
 */
export const executeActionSelectionTool = async (
    actions: { id: string, description: string }[],
    persona: CognitiveEthicalProfile,
    model: string = 'gemini-2.5-flash'
): Promise<{ actionId: string, reasoning: string }> => {
    const personaSummary = getPersonaSummary(persona);

    const prompt = `
        You are an AI agent acting as a member of a digital society.
        ${personaSummary}

        You have multiple potential actions you can take right now. Based on your persona, you must choose the ONE action that is most important or relevant for you to perform.

        Potential Actions:
        ${actions.map(a => `- ID: "${a.id}", Description: "${a.description}"`).join('\n')}

        Analyze the descriptions and decide which one aligns most with your values, priorities, and goals.
        Return your choice as a JSON object with the 'actionId' of your chosen action and a brief 'reasoning' for your choice.
    `;

    const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: actionSelectionSchema
        }
    });

    const jsonText = response.text.trim();
    return JSON.parse(jsonText);
};

/**
 * Simulates an agent reading a piece of content. This is a no-op function.
 * Its existence is for architectural consistency, as the "action" of reading
 * is implicit and the outcome (logging) is handled by the simulation engine.
 */
export const executeReadContentTool = (): void => {
    // This function is intentionally empty. The simulation engine logs the action.
    return;
};
