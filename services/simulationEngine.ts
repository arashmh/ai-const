
import { Experiment, Society, Protocol, Proposal, EventLogEntry, EventType, Member, Law, Task, Comment, CognitiveEthicalProfile } from '../types';
import * as toolService from './toolService';
import { Parser } from 'expr-eval';

const addLog = (logs: Omit<EventLogEntry, 'id'>[], newLog: Omit<EventLogEntry, 'id' | 'day'>, day: number) => {
    logs.push({ ...newLog, day });
};

const evaluateCondition = (condition: string, proposal: Proposal, memberCount: number, currentDay: number): boolean => {
    const context = {
        upvote_count: proposal.upvotes.length,
        downvote_count: proposal.downvotes.length,
        total_votes: proposal.upvotes.length + proposal.downvotes.length,
        comment_count: proposal.comments.length,
        member_count: memberCount,
        days_in_state: currentDay - proposal.stateEntryDay,
    };

    try {
        // Use a safe expression parser instead of the Function constructor
        return !!Parser.evaluate(condition, context);
    } catch (e) {
        console.error(`Error evaluating condition "${condition}" with context ${JSON.stringify(context)}:`, e);
        return false;
    }
};

const processPassiveTransitions = (
    experiment: Experiment,
    protocol: Protocol
): { updatedExperiment: Experiment; newLogs: Omit<EventLogEntry, 'id'>[] } => {
    let updatedExperiment = { ...experiment };
    const newLogs: Omit<EventLogEntry, 'id'>[] = [];

    const proposalsToUpdate = updatedExperiment.proposals.map(proposal => {
        let newProposal = { ...proposal };
        const relevantTransitions = protocol.protocol.transitions.filter(t => t.fromStateId === proposal.status);

        for (const transition of relevantTransitions) {
            const { trigger } = transition;
            let triggered = false;

            if (trigger.type === 'time_elapsed' && trigger.durationDays) {
                if (experiment.currentDay - proposal.stateEntryDay >= trigger.durationDays) {
                    triggered = true;
                }
            } else if (trigger.type === 'condition_met' && trigger.condition) {
                if (evaluateCondition(trigger.condition, proposal, experiment.memberIds.length, experiment.currentDay)) {
                    triggered = true;
                }
            }

            if (triggered) {
                const fromState = protocol.protocol.states.find(s => s.id === newProposal.status)?.name || newProposal.status;
                const toState = protocol.protocol.states.find(s => s.id === transition.toStateId)?.name || transition.toStateId;
                
                newProposal.status = transition.toStateId;
                newProposal.stateEntryDay = experiment.currentDay;

                addLog(newLogs, {
                    type: EventType.StateChange,
                    text: `Proposal "${newProposal.title}" automatically transitioned from ${fromState} to ${toState} due to: ${trigger.description}.`
                }, experiment.currentDay);
                
                break; // Only apply the first triggered transition
            }
        }
        return newProposal;
    });

    updatedExperiment.proposals = proposalsToUpdate;
    return { updatedExperiment, newLogs };
};

interface PossibleAction {
    uniqueId: string;
    task: Task;
    target?: Proposal | Law | Comment;
    descriptionForAI: string;
}

const buildToolInputs = (task: Task, target: any, persona: CognitiveEthicalProfile | null, protocol: Protocol): Record<string, any> => {
    const toolDef = protocol.protocol.tools.find(t => t.id === task.toolId);
    if (!toolDef) return {};

    const finalInputs: Record<string, any> = { ...(task.toolInputs || {}) };
    
    for (const inputDef of toolDef.inputs) {
        // Skip if already filled, unless it's a system-provided one
        if (finalInputs[inputDef.id] && !['reference', 'persona_profile', 'system_context'].includes(inputDef.type)) {
            continue;
        }

        switch(inputDef.type) {
            case 'reference':
                if (target) {
                    finalInputs[inputDef.id] = target.draftText || target.text || target.comment;
                }
                break;
            case 'persona_profile':
                if (persona) {
                    finalInputs[inputDef.id] = persona;
                }
                break;
            // system_context is intentionally left out, as it's a marker for things the engine provides directly.
        }
    }
    return finalInputs;
};


const processAgentAction = async (
    actorId: string, // Can be memberId or systemic roleId
    experiment: Experiment,
    society: Society,
    protocol: Protocol
): Promise<{ updatedExperiment: Experiment; newLogs: Omit<EventLogEntry, 'id'>[] }> => {
    let updatedExperiment = { ...experiment };
    const newLogs: Omit<EventLogEntry, 'id'>[] = [];
    const day = experiment.currentDay;

    const member = society.members.find(m => m.id === actorId);
    const roleIds = member ? (experiment.roles[actorId] || []) : [actorId];
    const roles = protocol.protocol.roles.filter(r => roleIds.includes(r.id));
    const actorName = member?.name || roles.map(r => r.name).join('/');

    if (roles.length === 0) {
        addLog(newLogs, { type: EventType.NoAction, text: `has no valid roles.`, memberId: member?.id }, day);
        return { updatedExperiment, newLogs };
    }
    
    // 1. Generate a flat list of all possible actions
    const possibleActions: PossibleAction[] = [];
    const agentTasks = protocol.protocol.tasks.filter(task => roleIds.includes(task.roleId));

    for (const task of agentTasks) {
        let potentialTargets: any[] = [];
        
        switch(task.target.entity) {
            // Cases for target-less "creation" actions
            case 'New Issue':
            case 'Law Proposal': // For backwards compatibility
            case 'Society Newsfeed':
                potentialTargets.push(undefined);
                break;

            // Cases that target existing proposals
            case 'Proposal Draft':
            case 'Existing Issue':
                potentialTargets = updatedExperiment.proposals.filter(p => p.status === task.target.statusId);
                break;

            // Case for ratified laws
            case 'Ratified Law':
                potentialTargets = updatedExperiment.laws;
                break;
            
            // Case for comments within active proposals
            case 'Comment':
                const relevantProposals = updatedExperiment.proposals.filter(p => p.status === task.target.statusId);
                potentialTargets = relevantProposals.flatMap(p => p.comments);
                break;
        }

        for (const target of potentialTargets) {
            let targetTitle = 'New Issue';
            if (target) {
                targetTitle = target.title || `Law ratified on Day ${target.ratifiedOn}` || `Comment: "${target.comment.substring(0, 30)}..."`;
            }
             possibleActions.push({
                uniqueId: `${task.id}::${target?.id || 'new_issue'}`,
                task,
                target,
                descriptionForAI: `${task.description} on "${targetTitle}"`,
            });
        }
    }

    if (possibleActions.length === 0) {
        addLog(newLogs, { type: EventType.NoAction, text: `had no available actions to perform.`, memberId: member?.id }, day);
        return { updatedExperiment, newLogs };
    }

    let chosenAction: PossibleAction;
    
    if (possibleActions.length > 1) {
        if (member) { // AI member makes a choice
            addLog(newLogs, { type: EventType.Decision, text: `is deciding what to do.`, memberId: member.id }, day);
            const optionsForAI = possibleActions.map(a => ({ id: a.uniqueId, description: a.descriptionForAI }));
            try {
                const { actionId } = await toolService.executeActionSelectionTool(optionsForAI, member.profile, experiment.config.model);
                const foundAction = possibleActions.find(a => a.uniqueId === actionId);
                if (foundAction) {
                    chosenAction = foundAction;
                } else {
                    addLog(newLogs, { type: EventType.NoAction, text: `AI returned an invalid action ID. Defaulting to first action.`, memberId: member.id }, day);
                    chosenAction = possibleActions[0];
                }
            } catch (e) {
                addLog(newLogs, { type: EventType.NoAction, text: `had an AI error when choosing an action. Defaulting to first action.`, memberId: member.id }, day);
                chosenAction = possibleActions[0];
            }
        } else { // Systemic role makes a choice based on priority
            const sortedActions = [...possibleActions].sort((a, b) => (b.task.priority || 0) - (a.task.priority || 0));
            chosenAction = sortedActions[0];
        }
    } else {
        chosenAction = possibleActions[0];
    }
    
    // Execute the chosen action
    const { task, target } = chosenAction;
    const persona = member?.profile || null; // Systemic roles have no persona
    
    addLog(newLogs, { type: EventType.Action, text: `decided to ${task.description}.`, memberId: member?.id }, day);

    const toolInputs = buildToolInputs(task, target, persona, protocol);
    
    switch (task.toolId) {
        case 'vote':
            if (target && 'comments' in target && persona) {
                const proposalToVoteOn = target as Proposal;
                const result = await toolService.executeVoteTool({ referenceText: proposalToVoteOn.draftText, context: task.description }, persona, experiment.config.model);
                proposalToVoteOn.upvotes = proposalToVoteOn.upvotes.filter(id => id !== actorId);
                proposalToVoteOn.downvotes = proposalToVoteOn.downvotes.filter(id => id !== actorId);
                if (result.vote.startsWith('Upvote')) proposalToVoteOn.upvotes.push(actorId);
                else proposalToVoteOn.downvotes.push(actorId);
                addLog(newLogs, { type: EventType.Upvote, text: `voted on "${proposalToVoteOn.title}": ${result.vote}. Reasoning: ${result.reasoning}`, memberId: member?.id }, day);
                if (result.vote === 'Upvote with Modification' && result.modificationComment) {
                     proposalToVoteOn.comments.push({ id: `comment-${Date.now()}`, commenterId: actorId, comment: result.modificationComment, intent: 'Modification', day });
                }
            }
            break;
        
        case 'comment':
             if (target && 'comments' in target && persona) {
                const proposalToCommentOn = target as Proposal;
                const result = await toolService.executeCommentTool({ referenceText: proposalToCommentOn.draftText, context: task.description }, persona, experiment.config.model);
                proposalToCommentOn.comments.push({ id: `comment-${Date.now()}`, commenterId: actorId, comment: result, intent: 'General', day });
                addLog(newLogs, { type: EventType.Comment, text: `commented on "${proposalToCommentOn.title}": "${result}"`, memberId: member?.id }, day);
             }
            break;

        case 'generate_text':
             if (persona) {
                const initialStateId = task.target.statusId;
                 if (!initialStateId) {
                    addLog(newLogs, { type: EventType.NoAction, text: `tried to create a proposal but the task has no defined target state.`, memberId: member?.id }, day);
                    break;
                }

                let context = '';
                if (experiment.currentDay === 1 && experiment.laws.length === 0) {
                    context = `Our society is in its infancy. There are no established laws. As a founding member, you have the historic opportunity to propose a foundational article for our new constitution. Reflect on your core beliefs and identify the single most important principle you think our society must be built upon. Your proposal will set the tone for our entire civilization.`;
                } else {
                    const activeProposals = experiment.proposals.filter(p => !['ratified', 'rejected'].includes(p.status)).map(p => p.title).join(', ') || 'None';
                    const existingLaws = experiment.laws.map(l => l.text.substring(0, 100) + '...').join('\n') || 'None';
                    context = `You are a member of an ongoing constitutional assembly. The society is currently debating its future direction.
- Existing Ratified Laws to build upon:\n${existingLaws}
- Current Active Proposals under debate: ${activeProposals}
Based on this context and your persona, identify a new, pressing issue or principle that needs to be addressed and propose a new constitutional article.`;
                }

                const { title, issue, draft } = await toolService.executeGenerateTextTool({ context }, persona, experiment.config.model);
                
                const newProposal: Proposal = {
                    id: `prop-${Date.now()}`,
                    title,
                    issueStatement: issue, // Storing reasoning here
                    proposedChanges: JSON.stringify({ title, issue, draft }), // For history
                    reference: { type: 'new_law' as const, text: '' },
                    authorId: actorId,
                    draftText: draft,
                    status: initialStateId,
                    upvotes: [],
                    downvotes: [],
                    comments: [],
                    creationDay: day,
                    stateEntryDay: day
                };

                updatedExperiment.proposals.push(newProposal);
                addLog(newLogs, { type: EventType.ProposalSubmitted, text: `added a new proposal regarding "${title}"`, memberId: member?.id }, day);
             }
            break;
        
         case 'judge_text':
            if (target && 'comments' in target) {
                const proposalToJudge = target as Proposal;
                
                if (updatedExperiment.coreStatements.length > 0) {
                    const coreStatementsCriteria = `\n\nAdditionally, the text MUST NOT contradict these core societal principles:\n- ${updatedExperiment.coreStatements.join('\n- ')}`;
                    toolInputs.criteria = (toolInputs.criteria || '') + coreStatementsCriteria;
                }

                const result = await toolService.executeJudgeTextTool(toolInputs as { textToJudge: string; criteria: string; }, persona, experiment.config.model);
                addLog(newLogs, { type: EventType.Decision, text: `judged "${proposalToJudge.title}". Score: ${result.score}. Violation: ${result.isViolation}.`, memberId: member?.id }, day);
                
                if (result.isViolation) {
                    const violationTransition = protocol.protocol.transitions.find(t => t.fromStateId === proposalToJudge.status && t.trigger.onViolation && t.trigger.taskId === task.id);
                    if (violationTransition) {
                        const fromState = protocol.protocol.states.find(s => s.id === proposalToJudge.status)?.name || proposalToJudge.status;
                        const toState = protocol.protocol.states.find(s => s.id === violationTransition.toStateId)?.name || violationTransition.toStateId;
                        proposalToJudge.status = violationTransition.toStateId;
                        proposalToJudge.stateEntryDay = day;
                        addLog(newLogs, { type: EventType.StateChange, text: `Audit of "${proposalToJudge.title}" found a violation. Automatically transitioned from ${fromState} to ${toState}.`}, day);
                        return { updatedExperiment, newLogs };
                    } else {
                         addLog(newLogs, { type: EventType.Action, text: `Audit of "${proposalToJudge.title}" found a violation, but no corrective transition path was found in the protocol for this state.` }, day);
                    }
                }
            }
            break;

        case 'summarize':
            if (target && 'comments' in target) {
                const commentsText = (target as Proposal).comments.map(c => c.comment).join('\n\n');
                if (commentsText.trim()) {
                    const result = await toolService.executeSummarizeTool(commentsText, experiment.config.model);
                    addLog(newLogs, { type: EventType.Action, text: `summarized comments for "${(target as Proposal).title}": "${result}"`, memberId: member?.id }, day);
                } else {
                    addLog(newLogs, { type: EventType.NoAction, text: `tried to summarize, but there were no comments on "${(target as Proposal).title}".`, memberId: member?.id }, day);
                }
            }
            break;

        case 'google_search':
            if (target && 'comments' in target && persona) {
                const result = await toolService.executeGoogleSearchTool(toolInputs.query || (target as Proposal).title, experiment.config.model);
                const sourceUris = result.sources.map((s: any) => s.web?.uri).filter(Boolean);
                const sourcesText = sourceUris.length > 0 ? `Sources:\n${sourceUris.join('\n')}` : 'No web sources found.';
                const commentText = `Research Summary: ${result.text}\n\n${sourcesText}`;
                
                (target as Proposal).comments.push({ id: `comment-${Date.now()}`, commenterId: actorId, comment: commentText, intent: 'Research Finding', day });
                addLog(newLogs, { type: EventType.Action, text: `researched "${(target as Proposal).title}" and posted findings.`, memberId: member?.id }, day);
            }
            break;

        case 'read_content':
            if (target) {
                toolService.executeReadContentTool();
                addLog(newLogs, { type: EventType.Action, text: `read the content of "${'title' in target ? target.title : ('text' in target ? target.text.substring(0,30) : target.comment.substring(0,30))}".`, memberId: member?.id }, day);
            }
            break;

        case 'edit_text':
            if (target && 'comments' in target && persona) {
                const result = await toolService.executeEditTextTool(toolInputs as { textToEdit: string; editGuide: string; }, persona, experiment.config.model);
                (target as Proposal).draftText = result;
                addLog(newLogs, { type: EventType.Action, text: `edited the draft for "${(target as Proposal).title}".`, memberId: member?.id }, day);
            }
            break;

        default:
            addLog(newLogs, { type: EventType.NoAction, text: `attempted task with unimplemented tool "${task.toolId}".`, memberId: member?.id }, day);
    }

    // Check for task_completion triggers
    if (target && 'status' in target) {
        const relevantTransitions = protocol.protocol.transitions.filter(t => t.trigger.type === 'task_completion' && t.trigger.taskId === task.id && t.fromStateId === target.status && !t.trigger.onViolation);
        if(relevantTransitions.length > 0) {
             const transition = relevantTransitions[0];
             const fromState = protocol.protocol.states.find(s => s.id === target.status)?.name || target.status;
             const toState = protocol.protocol.states.find(s => s.id === transition.toStateId)?.name || transition.toStateId;
             target.status = transition.toStateId;
             target.stateEntryDay = day;
             addLog(newLogs, {
                type: EventType.StateChange,
                text: `Action by ${actorName} on "${target.title}" triggered a transition from ${fromState} to ${toState}.`
            }, day);
        }
    }
    
    return { updatedExperiment, newLogs };
};


export const processTick = async (
    experiment: Experiment,
    society: Society,
    protocol: Protocol
): Promise<{ updatedExperiment: Experiment, newLogs: EventLogEntry[] }> => {

    let currentExperiment = { ...experiment };
    let allNewLogs: Omit<EventLogEntry, 'id'>[] = [];

    // On the first action of a day, run passive transitions
    if (currentExperiment.completedActionsToday === 0) {
        const { updatedExperiment: expAfterPassive, newLogs: passiveLogs } = processPassiveTransitions(currentExperiment, protocol);
        currentExperiment = expAfterPassive;
        allNewLogs.push(...passiveLogs);
    }
    
    // Determine actor
    const systemicRoles = protocol.protocol.roles.filter(r => r.type === 'systemic').map(r => r.id);
    const actors = [...currentExperiment.memberIds, ...systemicRoles];
    const actorIndex = currentExperiment.turnState.actorIndex;
    
    if (actorIndex >= actors.length) {
         // Should not happen if we handle day end correctly, but as a safeguard.
         currentExperiment.currentDay += 1;
         currentExperiment.turnState.actorIndex = 0;
         currentExperiment.completedActionsToday = 0;
         addLog(allNewLogs, {type: EventType.DayEnd, text: `Day ${currentExperiment.currentDay-1} has ended.`}, currentExperiment.currentDay -1);
         addLog(allNewLogs, {type: EventType.DayStart, text: `Day ${currentExperiment.currentDay} has begun.`}, currentExperiment.currentDay);

         const finalLogs = allNewLogs.map(log => ({ ...log, id: `log-${Date.now()}-${Math.random()}` }));
         return { updatedExperiment: currentExperiment, newLogs: finalLogs };
    }

    const currentActorId = actors[actorIndex];

    const { updatedExperiment: expAfterAction, newLogs: actionLogs } = await processAgentAction(
        currentActorId,
        currentExperiment,
        society,
        protocol
    );

    currentExperiment = expAfterAction;
    allNewLogs.push(...actionLogs);

    currentExperiment.completedActionsToday += 1;
    currentExperiment.turnState.actorIndex += 1;
    
    // Check for end of day
    if (currentExperiment.turnState.actorIndex >= actors.length || currentExperiment.currentDay > currentExperiment.config.maxExperimentDays) {
        if(currentExperiment.currentDay >= currentExperiment.config.maxExperimentDays) {
            currentExperiment.status = 'Completed';
            addLog(allNewLogs, {type: EventType.DayEnd, text: `Experiment reached max days (${currentExperiment.config.maxExperimentDays}) and is now complete.`}, currentExperiment.currentDay);
        } else {
             currentExperiment.currentDay += 1;
             currentExperiment.turnState.actorIndex = 0;
             currentExperiment.completedActionsToday = 0;
             currentExperiment.totalActionsToday = actors.length; // Recalculate for next day, just in case.
             addLog(allNewLogs, {type: EventType.DayEnd, text: `Day ${currentExperiment.currentDay-1} has ended.`}, currentExperiment.currentDay - 1);
             addLog(allNewLogs, {type: EventType.DayStart, text: `Day ${currentExperiment.currentDay} has begun.`}, currentExperiment.currentDay);
        }
    }
    
    const finalLogs = allNewLogs.map(log => ({ ...log, id: `log-${Date.now()}-${Math.random()}` }));
    
    // Add logs to experiment object
    currentExperiment.eventLog.push(...finalLogs);
    if (currentExperiment.eventLog.length > 200) {
        currentExperiment.eventLog = currentExperiment.eventLog.slice(-200);
    }
    
    return { updatedExperiment: currentExperiment, newLogs: [] }; // Logs are already added to the object
};
