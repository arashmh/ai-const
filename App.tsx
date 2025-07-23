
import React, { useState, useEffect, useRef } from 'react';
import { Page, Member, Experiment, Role, EventType, Proposal, ProposalStatus, EventLogEntry, Law, Comment, Society } from './types';
import HomePage from './pages/HomePage';
import SocietyPage from './pages/SocietyPage';
import LawPage from './pages/LawPage';
import { HomeIcon, UsersIcon, GavelIcon } from './components/icons';
import { identifyGrievance, draftAmendment, generateCommentForProposal, generateCommentForIssue, decideVoteForIssue, decideOnTarget, generateReplyToComment, draftInitialArticle } from './services/geminiService';

// Module-level trackers for the simulation
const runningSimulations = new Set<string>();

const App: React.FC = () => {
  const [page, setPage] = useState<Page>(Page.Home);
  const [societies, setSocieties] = useState<Society[]>([]);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [initialExperimentId, setInitialExperimentId] = useState<string | null>(null);
  const [initialSocietyId, setInitialSocietyId] = useState<string | null>(null);
  
  useEffect(() => {
    try {
        const savedSocieties = localStorage.getItem('ai-constitution-societies');
        if(savedSocieties) setSocieties(JSON.parse(savedSocieties));
        
        const savedExperimentsJSON = localStorage.getItem('ai-constitution-experiments');
        if (savedExperimentsJSON) {
            let loadedExperiments: Experiment[] = JSON.parse(savedExperimentsJSON);
            const now = Date.now();
            
            loadedExperiments = loadedExperiments.map(exp => {
                const updatedExp = {
                    ...exp,
                    status: (exp.status === 'Running' && exp.nextDayTimestamp < now) ? 'Paused' as const : exp.status,
                    proposals: exp.proposals.map(p => ({...p, downvotes: p.downvotes || [] })),
                    dailyActivity: exp.dailyActivity || {},
                    turnState: exp.turnState || { round: 1, phase: 'CITIZENS', actorIndex: 0 },
                    config: {
                        ...exp.config,
                        maxExperimentDays: exp.config.maxExperimentDays || 999 // Fallback for old experiments
                    }
                };
                return updatedExp;
            });
            setExperiments(loadedExperiments);
        }
    } catch(e) { console.error("Failed to load from local storage", e); }
  }, []);

  useEffect(() => {
      try { localStorage.setItem('ai-constitution-societies', JSON.stringify(societies)); } 
      catch(e) { console.error("Failed to save societies to local storage", e); }
  }, [societies]);

  useEffect(() => {
      try { localStorage.setItem('ai-constitution-experiments', JSON.stringify(experiments)); } 
      catch(e) { console.error("Failed to save experiments to local storage", e); }
  }, [experiments]);

    const navigateToExperiment = (experimentId: string) => {
        setInitialExperimentId(experimentId);
        setPage(Page.Law);
    };
    
    const navigateToSociety = (societyId: string) => {
        setInitialSocietyId(societyId);
        setPage(Page.Society);
    };

    const handleAddSociety = (society: Society) => {
        setSocieties(prev => [...prev, society]);
    };

    const handleUpdateSociety = (updatedSociety: Society) => {
        setSocieties(prev => prev.map(s => s.id === updatedSociety.id ? updatedSociety : s));
    };

    const handleDeleteSociety = (societyId: string) => {
        const isSocietyInUse = experiments.some(exp => 
            exp.societyId === societyId && (exp.status === 'Running' || exp.status === 'Paused')
        );

        if (isSocietyInUse) {
            alert('This society cannot be deleted because it is part of an active (Running or Paused) experiment. Please complete or stop the experiment first.');
            return;
        }

        if (window.confirm('Are you sure you want to permanently delete this society and all its members? This also deletes any completed experiments associated with it. This action cannot be undone.')) {
            setSocieties(prev => prev.filter(s => s.id !== societyId));
            setExperiments(prev => prev.filter(exp => exp.societyId !== societyId));
        }
    };


  const updateExperimentState = (expId: string, updateFn: (exp: Experiment) => Experiment) => {
      setExperiments(prev =>
          prev.map(e => (e.id === expId ? updateFn(e) : e))
      );
  };

  const addLogEntry = (expId: string, log: Omit<EventLogEntry, 'id'>) => {
      updateExperimentState(expId, exp => ({
          ...exp,
          eventLog: [...exp.eventLog, { ...log, id: `evt-${Date.now()}-${Math.random()}` }]
      }));
  };

  const getLatestExperiment = async (expId: string): Promise<Experiment | null> => {
      return new Promise((resolve) => {
          setExperiments(prev => {
              resolve(prev.find(e => e.id === expId) || null);
              return prev;
          });
      });
  };
  
    const getSocieties = async (): Promise<Society[]> => {
      return new Promise((resolve) => {
          setSocieties(prev => {
              resolve(prev);
              return prev;
          });
      });
  };

  const runSimulationTick = async (expId: string) => {
      let exp = await getLatestExperiment(expId);

      if (!exp || exp.status !== 'Running') {
          runningSimulations.delete(expId);
          return;
      }

      const societyForExp = (await getSocieties()).find(s => s.id === exp.societyId);
       if (!societyForExp) {
          console.error(`Society ${exp.societyId} not found for running experiment ${exp.id}. Pausing.`);
          updateExperimentState(expId, e => ({...e, status: 'Paused'}));
          addLogEntry(expId, {day: exp.currentDay, type: EventType.DayEnd, text: "Error: Society not found. Experiment paused."})
          runningSimulations.delete(expId);
          return;
      }

      const societyMembers = societyForExp.members;
      
      const citizenActors = exp.memberIds
        .map(id => ({ ...societyMembers.find(m => m.id === id)!, role: exp.roles[id] }))
        .filter(m => m.id && m.profile && m.role === Role.Citizen);

      const reviewerActors = exp.memberIds
        .map(id => ({ ...societyMembers.find(m => m.id === id)!, role: exp.roles[id] }))
        .filter(m => m.id && m.profile && (m.role === Role.Reviewer || m.role === Role.Drafter));

      // --- New Day or End of Day Logic ---
      if (exp.currentDay === 0 || exp.turnState.round > exp.config.actionsPerMemberPerDay) {
          if (exp.currentDay > 0 && exp.currentDay >= exp.config.maxExperimentDays) {
              updateExperimentState(expId, e => ({...e, status: 'Completed'}));
              addLogEntry(expId, {day: exp.currentDay, type: EventType.DayEnd, text: `Experiment reached its maximum duration of ${exp.config.maxExperimentDays} days and has now completed.`})
              runningSimulations.delete(expId);
              return; // Stop the tick
          }
          
          if (exp.currentDay > 0) {
            await endOfDayPhase(expId);
          }
          
          const postFinalizeExp = await getLatestExperiment(expId);
          if (!postFinalizeExp) return;

          const { roles, performance, logs: promoLogs } = calculatePromotions(postFinalizeExp, societyMembers);
          
          const activeActors = postFinalizeExp.memberIds.filter(id => roles[id] === Role.Citizen || roles[id] === Role.Reviewer || roles[id] === Role.Drafter);
          const newTotalActions = activeActors.length * postFinalizeExp.config.actionsPerMemberPerDay;

          updateExperimentState(expId, currentExp => ({
              ...currentExp,
              currentDay: currentExp.currentDay + 1,
              roles,
              performance,
              totalActionsToday: newTotalActions,
              completedActionsToday: 0,
              dailyActivity: {}, // Reset daily activity
              turnState: { round: 1, phase: 'CITIZENS', actorIndex: 0 }, // Reset turn state
              eventLog: [
                  ...currentExp.eventLog,
                  ...promoLogs,
                  { id: `evt-daystart-${Date.now()}`, day: currentExp.currentDay + 1, text: `Day ${currentExp.currentDay + 1} has begun. Agents are now active.`, type: EventType.DayStart }
              ],
          }));

      } else { // --- Action Logic ---
          let member;
          const { phase, actorIndex } = exp.turnState;
          if (phase === 'CITIZENS') {
              member = citizenActors[actorIndex];
          } else {
              member = reviewerActors[actorIndex];
          }
          
          let actionTaken = false;
          if (member && member.id) {
            exp = await getLatestExperiment(expId);
            if (!exp) return;
            
            const performGrievanceAction = async () => {
                addLogEntry(expId, { day: exp!.currentDay, memberId: member.id, type: EventType.Decision, text: `is scanning for a new, unique grievance to raise...`});
                const grievance = await identifyGrievance(member.profile, exp!.laws, exp!.proposals, exp!.coreStatements.join('\n'), exp!.config.model);
                
                if (grievance && grievance.reference.type === 'new_law') {
                    addLogEntry(expId, { day: exp!.currentDay, memberId: member.id, type: EventType.Decision, text: `has identified a need for a new law: "${grievance.title}". Now drafting the initial text...`});
                    const draftText = await draftInitialArticle(member.profile, { title: grievance.title, issue: grievance.issue }, exp!.config.model);

                    if (draftText && !draftText.toLowerCase().includes('error')) {
                        updateExperimentState(expId, e => {
                            if (e.proposals.some(p => p.title === grievance.title)) return e;
                            const newProposal: Proposal = { id: `prop-${Date.now()}-${Math.random()}`, title: grievance.title, issueStatement: grievance.issue, proposedChanges: '', draftText: draftText, reference: grievance.reference, authorId: member.id, status: ProposalStatus.Issue, upvotes: [member.id], downvotes:[], comments: [], creationDay: e.currentDay };
                            addLogEntry(expId, { day: e.currentDay, type: EventType.NewIssue, memberId: member.id, text: `raised a new issue with a draft: "${grievance.title}"`});
                            return {...e, proposals: [...e.proposals, newProposal]};
                        });
                    } else {
                        addLogEntry(expId, { day: exp!.currentDay, memberId: member.id, type: EventType.Decision, text: `failed to draft text for the issue "${grievance.title}".`});
                    }
                }
                actionTaken = true; // Still counts as an action even if no grievance is found or draft fails.
            };

            if (exp.currentDay === 1) {
                if (member.role === Role.Citizen) {
                   await performGrievanceAction();
                } else {
                    addLogEntry(expId, { day: exp.currentDay, memberId: member.id, type: EventType.Decision, text: `observes the initial proceedings on Day 1.`});
                    actionTaken = true; // Drafters/Reviewers do nothing on day 1
                }
            } else { // Day 2+ Logic
                const allLawsText = exp.laws.map(l => l.text).join('\n\n');
                if (member.role === Role.Citizen) {
                    const { round } = exp.turnState;
                    
                    // ACTION 1: Upvote
                    if (round === 1) {
                        addLogEntry(expId, { day: exp.currentDay, memberId: member.id, type: EventType.Decision, text: `is looking for an issue or proposal to support.`});
                        
                        const reviewTargets = exp.proposals.filter(p => p.status === ProposalStatus.InReview && !p.comments.some(c => c.commenterId === member.id));
                        const issueTargets = exp.proposals.filter(p => p.status === ProposalStatus.Issue && p.authorId !== member.id && !p.upvotes.includes(member.id) && !p.downvotes.includes(member.id));
                        const allTargets = [...reviewTargets, ...issueTargets];

                        if (allTargets.length > 0) {
                            const targetId = await decideOnTarget(member.profile, "Select a proposal or issue to support with an upvote.", allTargets.map(t => ({id: t.id, title: t.title})), exp.config.model);
                            const target = allTargets.find(p => p.id === targetId);

                            if (target) {
                                const decision = await decideVoteForIssue(member.profile, { title: target.title, issueStatement: target.issueStatement }, exp.config.model);
                                if (decision && decision.vote === 'upvote') {
                                    updateExperimentState(expId, e => {
                                        const pIndex = e.proposals.findIndex(p => p.id === targetId);
                                        if (pIndex === -1) return e;
                                        
                                        const newProposals = [...e.proposals];
                                        const currentProposal = newProposals[pIndex];
                                        const newComment: Comment = { id: `cmt-${Date.now()}`, comment: decision.reason, intent: 'For', commenterId: member.id, day: e.currentDay };
                                        
                                        newProposals[pIndex] = {...currentProposal, upvotes: [...currentProposal.upvotes, member.id], comments: [...currentProposal.comments, newComment]};
                                        
                                        addLogEntry(expId, { day: e.currentDay, type: EventType.Upvote, memberId: member.id, text: `supported "${currentProposal.title}" with an upvote.`});
                                        return {...e, proposals: newProposals};
                                    });
                                    actionTaken = true;
                                }
                            }
                        }
                    }
                    // ACTION 2: Downvote & Comment on an Issue
                    else if (round === 2) {
                        addLogEntry(expId, { day: exp.currentDay, memberId: member.id, type: EventType.Decision, text: `is looking for an open issue to oppose.`});
                        
                        const issueTargets = exp.proposals.filter(p => p.status === ProposalStatus.Issue && p.authorId !== member.id && !p.upvotes.includes(member.id) && !p.downvotes.includes(member.id));

                        if (issueTargets.length > 0) {
                            const targetId = await decideOnTarget(member.profile, "Select an open issue to oppose with a downvote and comment.", issueTargets.map(t => ({id: t.id, title: t.title})), exp.config.model);
                            const target = issueTargets.find(p => p.id === targetId);

                            if (target) {
                                const decision = await decideVoteForIssue(member.profile, { title: target.title, issueStatement: target.issueStatement }, exp.config.model);
                                if (decision && decision.vote === 'downvote') {
                                    updateExperimentState(expId, e => {
                                        const pIndex = e.proposals.findIndex(p => p.id === targetId);
                                        if (pIndex === -1) return e;
                                        
                                        const newProposals = [...e.proposals];
                                        const currentProposal = newProposals[pIndex];
                                        const newComment: Comment = { id: `cmt-${Date.now()}`, comment: decision.reason, intent: 'Against', commenterId: member.id, day: e.currentDay };

                                        newProposals[pIndex] = {...currentProposal, downvotes: [...currentProposal.downvotes, member.id], comments: [...currentProposal.comments, newComment]};
                                        
                                        addLogEntry(expId, { day: e.currentDay, type: EventType.Downvote, memberId: member.id, text: `opposed issue "${currentProposal.title}" with a downvote.`});
                                        return {...e, proposals: newProposals};
                                    });
                                    actionTaken = true;
                                }
                            }
                        }
                    }
                    // ACTION 3: Upvote with Modification
                    else if (round === 3) {
                        addLogEntry(expId, { day: exp.currentDay, memberId: member.id, type: EventType.Decision, text: `is looking for an issue to support with a modification.`});
                        
                        const issueTargets = exp.proposals.filter(p => p.status === ProposalStatus.Issue && p.authorId !== member.id && !p.upvotes.includes(member.id) && !p.downvotes.includes(member.id));

                        if (issueTargets.length > 0) {
                            const targetId = await decideOnTarget(member.profile, "Select an open issue to support with a constructive modification.", issueTargets.map(t => ({id: t.id, title: t.title})), exp.config.model);
                            const target = issueTargets.find(p => p.id === targetId);

                            if (target) {
                                const commentData = await generateCommentForIssue(member.profile, target, allLawsText, exp.config.model);
                                if(commentData) {
                                    updateExperimentState(expId, e => {
                                        const pIndex = e.proposals.findIndex(p => p.id === targetId);
                                        if (pIndex === -1) return e;
                                        const newComment: Comment = { id: `cmt-${Date.now()}`, comment: commentData.comment, intent: 'Modification', commenterId: member.id, day: e.currentDay };
                                        const newProposals = [...e.proposals];
                                        const updatedProposal = {...newProposals[pIndex], comments: [...newProposals[pIndex].comments, newComment], upvotes: [...newProposals[pIndex].upvotes, member.id]};
                                        newProposals[pIndex] = updatedProposal;
                                        addLogEntry(expId, { day: e.currentDay, type: EventType.Comment, memberId: member.id, text: `suggested a modification for issue "${target.title}", thereby upvoting it.`});
                                        return {...e, proposals: newProposals};
                                    });
                                    actionTaken = true;
                                }
                            }
                        }
                    }
                } else if (member.role === Role.Reviewer || member.role === Role.Drafter) {
                    const proposalsInReview = exp.proposals.filter(p => p.status === ProposalStatus.InReview);
                    if (proposalsInReview.length > 0) {
                        addLogEntry(expId, { day: exp.currentDay, memberId: member.id, type: EventType.Decision, text: `is reviewing active proposals...`});
                        const targetId = await decideOnTarget(member.profile, "Review and comment on a formal proposal.", proposalsInReview.map(p => ({id: p.id, title: p.title})), exp.config.model);
                        const proposalToComment = exp.proposals.find(p => p.id === targetId);
                        if (proposalToComment) {
                            const commentData = await generateCommentForProposal(member.profile, proposalToComment, allLawsText, exp.config.model);
                            updateExperimentState(expId, e => {
                                const pIndex = e.proposals.findIndex(p => p.id === targetId);
                                if (pIndex === -1) return e;
                                const newComment: Comment = { id: `cmt-${Date.now()}`, ...commentData, commenterId: member.id, day: e.currentDay };
                                const newProposals = [...e.proposals];
                                newProposals[pIndex] = {...newProposals[pIndex], comments: [...newProposals[pIndex].comments, newComment]};
                                addLogEntry(expId, { day: e.currentDay, type: EventType.Comment, memberId: member.id, text: `commented on "${proposalToComment.title}" (Intent: ${commentData.intent})`});
                                return {...e, proposals: newProposals};
                            });
                            actionTaken = true;
                        }
                    }
                }
            }
          }
           if (!actionTaken) {
                addLogEntry(expId, { day: exp.currentDay, memberId: member?.id, type: EventType.Decision, text: `observes the situation and takes no action this turn.`});
           }
          
          // --- Advance Turn State ---
          updateExperimentState(expId, e => {
            let { round, phase, actorIndex } = e.turnState;
            actorIndex++;

            if (phase === 'CITIZENS' && actorIndex >= citizenActors.length) {
                phase = 'REVIEWERS';
                actorIndex = 0;
            } else if (phase === 'REVIEWERS' && actorIndex >= reviewerActors.length) {
                phase = 'CITIZENS';
                actorIndex = 0;
                round++;
            }
            
            const totalActiveActors = citizenActors.length + reviewerActors.length;
            const actionsThisRound = (phase === 'CITIZENS') ? actorIndex : citizenActors.length + actorIndex;
            const completedActions = ((round - 1) * totalActiveActors) + actionsThisRound;
            
            return {
                ...e,
                turnState: { round, phase, actorIndex },
                completedActionsToday: completedActions
            };
          });
      }

      const finalExpState = await getLatestExperiment(expId);
      if (finalExpState && finalExpState.status === 'Running') {
          const delay = finalExpState.config.actionDelaySeconds * 1000;
          setTimeout(() => runSimulationTick(expId), Math.max(100, delay));
      }
  };

  useEffect(() => {
      experiments.forEach(exp => {
          if (exp.status === 'Running' && !runningSimulations.has(exp.id)) {
              runningSimulations.add(exp.id);
              runSimulationTick(exp.id);
          }
      });
  }, [experiments, societies]); // Add societies to dependencies

  const calculatePromotions = (exp: Experiment, members: Member[]): { roles: Record<string, Role>, performance: Experiment['performance'], logs: EventLogEntry[] } => {
      let roles = { ...exp.roles };
      let performance = { ...exp.performance };
      const { initialDrafterPercent, initialReviewerPercent, promotionThresholds } = exp.config;
      let logs: EventLogEntry[] = [];
      const currentDay = exp.currentDay + 1;

      if (currentDay === 1) { // Bootstrap roles
          const participatingMembers = members.filter(m => exp.memberIds.includes(m.id));
          participatingMembers.forEach(m => {
              roles[m.id] = Role.Citizen;
              if (!performance[m.id]) {
                  performance[m.id] = { successfulDrafts: 0, successfulReviews: 0 };
              }
          });
          const numReviewers = Math.max(1, Math.floor(participatingMembers.length * (initialReviewerPercent / 100)));
          const numDrafters = Math.max(1, Math.floor(participatingMembers.length * (initialDrafterPercent / 100)));
          
          const shuffledMembers = [...participatingMembers].sort(() => 0.5 - Math.random());
          const assignedReviewers = shuffledMembers.slice(0, numReviewers);
          assignedReviewers.forEach(m => roles[m.id] = Role.Reviewer);
          
          const remainingMembers = shuffledMembers.filter(m => !assignedReviewers.map(ar => ar.id).includes(m.id));
          const assignedDrafters = remainingMembers.slice(0, numDrafters);
          assignedDrafters.forEach(m => roles[m.id] = Role.Drafter);

          logs.push({id: `evt-promo-${Date.now()}`, day: currentDay, type: EventType.Promotion, text: `Initial roles assigned: ${assignedReviewers.length} Reviewers, ${assignedDrafters.length} Drafters.`})

      } else { // Meritocratic promotion
           for (const memberId of exp.memberIds) {
              const memberName = members.find(m=>m.id === memberId)?.name || 'A member';
              if(roles[memberId] === Role.Citizen && (performance[memberId]?.successfulDrafts || 0) >= 1) {
                  roles[memberId] = Role.Drafter;
                  logs.push({id: `evt-promo-c2d-${Date.now()}`, day: currentDay, type: EventType.Promotion, text: `${memberName} has been promoted to Drafter for successfully authoring a ratified law.`})
              }
              else if(roles[memberId] === Role.Drafter && (performance[memberId]?.successfulDrafts || 0) >= promotionThresholds.drafterToReviewer) {
                  roles[memberId] = Role.Reviewer;
                  logs.push({id: `evt-promo-d2r-${Date.now()}`, day: currentDay, type: EventType.Promotion, text: `${memberName} has been promoted to Reviewer for exemplary drafting.`})
              }
          }
      }
      return { roles, performance, logs };
  };

  const endOfDayPhase = async (expId: string) => {
    let exp = await getLatestExperiment(expId);
    if (!exp) return;

    const society = (await getSocieties()).find(s => s.id === exp!.societyId);
    if (!society) return;

    // --- Drafting & Advancement Phase ---
    const proposalsToAdvance = exp.proposals.filter(p => p.status === ProposalStatus.Issue && (p.upvotes.length - p.downvotes.length) >= exp.config.upvotesToDraft);
    const drafters = society.members.filter(m => exp!.roles[m.id] === Role.Drafter);

    if (proposalsToAdvance.length > 0) {
        addLogEntry(expId, { day: exp.currentDay, type: EventType.DayEnd, text: `End of day. ${proposalsToAdvance.length} issue(s) have enough support to advance.`});
        for (const p of proposalsToAdvance) {
             if (p.reference.type === 'new_law' && p.draftText) {
                // Already has a draft, move straight to review
                updateExperimentState(expId, e => {
                    const pIndex = e.proposals.findIndex(prop => prop.id === p.id);
                    if (pIndex === -1) return e;
                    const newProposals = [...e.proposals];
                    newProposals[pIndex] = { ...newProposals[pIndex], status: ProposalStatus.InReview };
                     addLogEntry(expId, { day: e.currentDay, type: EventType.ReviewStarted, text: `Issue "${p.title}" already included a draft and now moves to the review phase.`});
                    return { ...e, proposals: newProposals };
                });
            } else if (drafters.length > 0) {
                // Needs a draft written by a Drafter AI
                const drafter = drafters[Math.floor(Math.random() * drafters.length)];
                addLogEntry(expId, { day: exp.currentDay, type: EventType.DraftingStarted, memberId: drafter.id, text: `is drafting a proposal for issue: "${p.title}".`});
                const draftText = await draftAmendment(drafter.profile, { title: p.title, issueStatement: p.issueStatement, proposedChanges: p.proposedChanges }, exp.config.model);
                updateExperimentState(expId, e => {
                    const pIndex = e.proposals.findIndex(prop => prop.id === p.id);
                    if (pIndex === -1) return e;
                    const newProposals = [...e.proposals];
                    newProposals[pIndex] = { ...newProposals[pIndex], draftText, status: ProposalStatus.InReview };
                    addLogEntry(expId, { day: e.currentDay, type: EventType.ProposalSubmitted, memberId: drafter.id, text: `submitted a draft for "${p.title}". It is now In Review.`});
                    return { ...e, proposals: newProposals };
                });
            }
        }
    }
    
    // --- Proposal Finalization & Ratification Phase ---
    exp = await getLatestExperiment(expId);
    if (!exp) return;
    
    const logs: EventLogEntry[] = [];
    const performanceUpdates: Record<string, Experiment['performance'][string]> = {};

    const proposalsAfterReview = exp.proposals.map(p => {
        if (p.status === ProposalStatus.InReview && (exp.currentDay - p.creationDay) >= exp.config.daysForReview) {
            if (p.comments.some(c => c.intent === 'Against')) {
                logs.push({ id: `evt-fin-rej-${p.id}`, day: exp.currentDay, type: EventType.ProposalRejected, text: `"${p.title}" has been rejected due to critical opposition.`});
                return { ...p, status: ProposalStatus.Rejected };
            } else {
                logs.push({ id: `evt-fin-app-${p.id}`, day: exp.currentDay, type: EventType.ProposalApproved, text: `"${p.title}" has passed review and is approved for ratification.`});
                return { ...p, status: ProposalStatus.ApprovedForRatification };
            }
        }
        return p;
    });

    let newLaws = [...exp.laws];
    let proposalsAfterRatification = proposalsAfterReview;
    
    if (exp.currentDay > 0 && exp.currentDay % exp.config.ratificationDayInterval === 0) {
        const proposalsToRatify = proposalsAfterReview.filter(p => p.status === ProposalStatus.ApprovedForRatification);

        if (proposalsToRatify.length > 0) {
            logs.push({id: `evt-ratday-${Date.now()}`, day: exp.currentDay, type: EventType.DayEnd, text: `It is Ratification Day! ${proposalsToRatify.length} proposal(s) will become law.`});

            proposalsToRatify.forEach(p => {
                newLaws.push({ id: `law-${p.id}`, text: p.draftText, ratifiedOn: exp.currentDay });
                
                const currentPerf = exp.performance[p.authorId] || { successfulDrafts: 0, successfulReviews: 0 };
                performanceUpdates[p.authorId] = { ...currentPerf, successfulDrafts: currentPerf.successfulDrafts + 1 };

                logs.push({id: `evt-rat-${p.id}`, day: exp.currentDay, type: EventType.ProposalRatified, text: `Ratified: "${p.title}" is now law.`});
            });
            
            const ratifiedIds = proposalsToRatify.map(p => p.id);
            proposalsAfterRatification = proposalsAfterReview.map(p => 
                ratifiedIds.includes(p.id) ? { ...p, status: ProposalStatus.Ratified } : p
            );
        }
    }

    if (logs.length > 0 || Object.keys(performanceUpdates).length > 0) {
        updateExperimentState(expId, e => ({
            ...e,
            proposals: proposalsAfterRatification,
            laws: newLaws,
            performance: { ...e.performance, ...performanceUpdates },
            eventLog: [...e.eventLog, ...logs]
        }));
    }
  };

  const renderPage = () => {
    switch (page) {
      case Page.Society:
        return <SocietyPage societies={societies} experiments={experiments} onAddSociety={handleAddSociety} onUpdateSociety={handleUpdateSociety} onDeleteSociety={handleDeleteSociety} setPage={setPage} navigateToExperiment={navigateToExperiment} initialSocietyId={initialSocietyId} clearInitialSocietyId={() => setInitialSocietyId(null)} />;
      case Page.Law:
        return <LawPage experiments={experiments} setExperiments={setExperiments} societies={societies} setPage={setPage} initialExperimentId={initialExperimentId} clearInitialExperimentId={() => setInitialExperimentId(null)} navigateToSociety={navigateToSociety} />;
      case Page.Home:
      default:
        return <HomePage setPage={setPage} />;
    }
  };

  const NavButton = ({ targetPage, icon, label }: { targetPage: Page, icon: React.ReactNode, label: string}) => (
      <button
          onClick={() => setPage(targetPage)}
          className={`flex flex-col sm:flex-row items-center font-semibold space-x-0 sm:space-x-2 px-4 py-2 rounded-lg transition-colors duration-200 ${
              page === targetPage
              ? 'bg-brand-accent text-brand-blue shadow-md'
              : 'text-brand-light hover:bg-brand-accent/80 hover:text-brand-blue'
          }`}
      >
          {icon}
          <span className="text-xs sm:text-sm mt-1 sm:mt-0">{label}</span>
      </button>
  );

  return (
    <div className="flex flex-col min-h-screen">
      {page !== Page.Home && (
          <header className="bg-brand-secondary/80 backdrop-blur-sm sticky top-0 z-40 shadow-md">
              <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="flex items-center justify-between h-16">
                      <div className="flex items-center">
                          <span className="font-bold text-xl text-brand-text">AI Constitution</span>
                      </div>
                      <div className="flex items-center space-x-2 sm:space-x-4">
                        <NavButton targetPage={Page.Home} icon={<HomeIcon className="h-5 w-5" />} label="Home" />
                        <NavButton targetPage={Page.Society} icon={<UsersIcon className="h-5 w-5" />} label="Societies" />
                        <NavButton targetPage={Page.Law} icon={<GavelIcon className="h-5 w-5" />} label="Law" />
                      </div>
                  </div>
              </nav>
          </header>
      )}
      <main className="flex-grow">{renderPage()}</main>
    </div>
  );
};

export default App;
