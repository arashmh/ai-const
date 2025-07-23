

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Experiment, Member, Page, EventType, ProposalStatus, Proposal, Comment, Role, ExperimentConfig, Society } from '../types';
import { GavelIcon, PlusCircleIcon, CheckCircleIcon, XCircleIcon, ThumbsUpIcon, MessageSquareIcon, FileTextIcon, UsersIcon, PlayIcon, PauseIcon, SquareIcon, ChevronLeftIcon, ClockIcon, ArrowRightIcon, Trash2Icon, ThumbsDownIcon, EditIcon } from '../components/icons';
import { MemberTooltipProvider } from '../components/MemberTooltipProvider';

const InfoTooltip: React.FC<{ text: string }> = ({ text }) => (
    <div className="relative group flex items-center">
        <span className="ml-1.5 cursor-help text-brand-light border-b border-dotted border-brand-light text-xs">(?)</span>
        <div className="absolute bottom-full mb-2 w-64 bg-brand-primary p-3 rounded-lg text-xs text-brand-text shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
            {text}
        </div>
    </div>
);

const ExperimentSetupWizard: React.FC<{
  societies: Society[];
  onCancel: () => void;
  onStart: (name: string, coreStatements: string, societyId: string, memberIds: string[], config: ExperimentConfig) => void;
}> = ({ societies, onCancel, onStart }) => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [coreStatements, setCoreStatements] = useState('');
  const [selectedSocietyId, setSelectedSocietyId] = useState<string>(societies.length > 0 ? societies[0].id : '');
  const selectedSociety = useMemo(() => societies.find(s => s.id === selectedSocietyId), [societies, selectedSocietyId]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [config, setConfig] = useState<ExperimentConfig>({
      model: 'gemini-2.5-flash',
      actionsPerMemberPerDay: 3,
      actionDelaySeconds: 5,
      initialDrafterPercent: 10,
      initialReviewerPercent: 20,
      upvotesToDraft: 3,
      daysForReview: 2,
      promotionThresholds: { drafterToReviewer: 2, reviewerToCouncil: 5 },
      ratificationDayInterval: 7,
      maxExperimentDays: 5,
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (selectedSociety) {
      setSelectedMemberIds(selectedSociety.members.map(m => m.id));
    }
  }, [selectedSocietyId, societies]);

  const handleToggleMember = (id: string) => {
    setSelectedMemberIds(prev => prev.includes(id) ? prev.filter(mId => mId !== id) : [...prev, id]);
  };

  const handleNext = () => {
    if (step === 1) {
      if (!name.trim() || !coreStatements.trim()) {
        setError('Experiment Name and Core Statements are required.');
        return;
      }
    }
    if (step === 2) {
      if (selectedMemberIds.length < 3) {
        setError('At least 3 members are required for an experiment.');
        return;
      }
    }
    setError('');
    setStep(s => s + 1);
  };

  const handleBack = () => {
    setError('');
    setStep(s => s - 1);
  };

  const handleSubmit = () => {
    if (config.actionDelaySeconds < 5) {
      setError('Delay between actions must be at least 5 seconds.');
      setStep(3);
      return;
    }
    if(config.initialDrafterPercent + config.initialReviewerPercent > 100) {
      setError('The sum of Initial Drafter % and Initial Reviewer % cannot exceed 100.');
      setStep(4);
      return;
    }
    if (config.promotionThresholds.drafterToReviewer < 1 || config.promotionThresholds.reviewerToCouncil < 1) {
      setError('Promotion thresholds must be at least 1.');
      setStep(5);
      return;
    }
    setError('');
    onStart(name, coreStatements, selectedSocietyId, selectedMemberIds, config);
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6 animate-fade-in">
            <h3 className="text-lg font-semibold text-brand-text border-b border-brand-accent pb-2 mb-4">Basic Information</h3>
            <div>
              <label className="block text-sm font-medium text-brand-light mb-1">Experiment Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-brand-primary border border-brand-accent rounded-lg p-2 text-brand-text focus:ring-2 focus:ring-brand-action focus:outline-none" placeholder="e.g., 'The Phoenix Project'" />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-light mb-1">Core Statements (one per line)</label>
              <textarea value={coreStatements} onChange={e => setCoreStatements(e.target.value)} rows={6} className="w-full bg-brand-primary border border-brand-accent rounded-lg p-2 text-brand-text focus:ring-2 focus:ring-brand-action focus:outline-none" placeholder="religion is a personal choice and does not consttitue any  especially reserved rights for the religious person."></textarea>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6 animate-fade-in">
            <h3 className="text-lg font-semibold text-brand-text border-b border-brand-accent pb-2 mb-4">Participants</h3>
            <div>
              <label className="block text-sm font-medium text-brand-light mb-1">Select Society</label>
              <select value={selectedSocietyId} onChange={e => setSelectedSocietyId(e.target.value)} className="w-full bg-brand-primary border border-brand-accent rounded-lg p-2 text-brand-text focus:ring-2 focus:ring-brand-action focus:outline-none">
                {societies.map(s => <option key={s.id} value={s.id}>{s.name} ({s.members.length} members)</option>)}
              </select>
            </div>
            {selectedSociety && (
              <div>
                <label className="block text-sm font-medium text-brand-light mb-2">Select Participants ({selectedMemberIds.length}/{selectedSociety.members.length})</label>
                <div className="flex items-center space-x-4 mb-3">
                  <button onClick={() => setSelectedMemberIds(selectedSociety.members.map(m => m.id))} className="text-xs bg-brand-accent/50 hover:bg-brand-accent text-brand-light px-3 py-1 rounded-md">Select All</button>
                  <button onClick={() => setSelectedMemberIds([])} className="text-xs bg-brand-accent/50 hover:bg-brand-accent text-brand-light px-3 py-1 rounded-md">Deselect All</button>
                </div>
                <div className="max-h-64 overflow-y-auto bg-brand-primary p-2 rounded-lg border border-brand-accent grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedSociety.members.map(member => (
                    <label key={member.id} className="flex items-center p-2 rounded hover:bg-brand-accent cursor-pointer">
                      <input type="checkbox" checked={selectedMemberIds.includes(member.id)} onChange={() => handleToggleMember(member.id)} className="h-4 w-4 rounded bg-brand-primary border-brand-light text-brand-action focus:ring-brand-action flex-shrink-0 mr-3"/>
                      <span className="text-brand-text truncate pr-2" title={member.name}>{member.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      case 3:
        return (
           <div className="space-y-6 animate-fade-in">
              <h3 className="text-lg font-semibold text-brand-text border-b border-brand-accent pb-2 mb-4">Core Simulation Parameters</h3>
              <div>
                  <label className="flex items-center text-sm font-medium text-brand-light mb-1">Primary AI Model <InfoTooltip text="The core generative model for all agent actions." /></label>
                  <select value={config.model} onChange={e => setConfig(c => ({...c, model: e.target.value}))} className="w-full bg-brand-primary border border-brand-accent rounded-lg p-2 text-brand-text focus:ring-2 focus:ring-brand-action focus:outline-none">
                      <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                  </select>
              </div>
              <div>
                  <label className="flex items-center text-sm font-medium text-brand-light mb-1">Max Experiment Days <InfoTooltip text="The experiment will automatically stop after this many days." /></label>
                  <input type="number" min="1" value={config.maxExperimentDays} onChange={e => setConfig(c => ({...c, maxExperimentDays: parseInt(e.target.value, 10) || 1}))} className="w-full bg-brand-primary border border-brand-accent rounded-lg p-2 text-brand-text" />
              </div>
              <div>
                  <label className="flex items-center text-sm font-medium text-brand-light mb-1">Actions per Member per Day <InfoTooltip text="How many actions each agent will attempt to perform each day." /></label>
                  <input type="number" min="1" value={config.actionsPerMemberPerDay} onChange={e => setConfig(c => ({...c, actionsPerMemberPerDay: parseInt(e.target.value, 10) || 1}))} className="w-full bg-brand-primary border border-brand-accent rounded-lg p-2 text-brand-text" />
              </div>
              <div>
                  <label className="flex items-center text-sm font-medium text-brand-light mb-1">Delay Between Actions (s) <InfoTooltip text="The pause between each agent's action. A longer delay makes the simulation easier to follow." /></label>
                  <input type="number" min="5" value={config.actionDelaySeconds} onChange={e => setConfig(c => ({...c, actionDelaySeconds: parseInt(e.target.value, 10) || 0}))} className="w-full bg-brand-primary border border-brand-accent rounded-lg p-2 text-brand-text" />
              </div>
           </div>
        );
      case 4:
        return (
           <div className="space-y-6 animate-fade-in">
              <h3 className="text-lg font-semibold text-brand-text border-b border-brand-accent pb-2 mb-4">Governance & Participation</h3>
               <div>
                  <label className="flex items-center text-sm font-medium text-brand-light mb-1">Initial Drafter % <InfoTooltip text="Percentage of members to bootstrap as Drafters on Day 1." /></label>
                  <input type="number" min="0" max="100" value={config.initialDrafterPercent} onChange={e => setConfig(c => ({...c, initialDrafterPercent: parseInt(e.target.value, 10) || 0}))} className="w-full bg-brand-primary border border-brand-accent rounded-lg p-2 text-brand-text" />
              </div>
              <div>
                  <label className="flex items-center text-sm font-medium text-brand-light mb-1">Initial Reviewer % <InfoTooltip text="Percentage of members to bootstrap as Reviewers on Day 1 to ensure the system can function." /></label>
                  <input type="number" min="0" max="100" value={config.initialReviewerPercent} onChange={e => setConfig(c => ({...c, initialReviewerPercent: parseInt(e.target.value, 10) || 0}))} className="w-full bg-brand-primary border border-brand-accent rounded-lg p-2 text-brand-text" />
              </div>
              <div>
                  <label className="flex items-center text-sm font-medium text-brand-light mb-1">Upvotes to start Draft <InfoTooltip text="Number of upvotes an Issue needs before an AI will draft a formal proposal." /></label>
                  <input type="number" min="1" value={config.upvotesToDraft} onChange={e => setConfig(c => ({...c, upvotesToDraft: parseInt(e.target.value, 10) || 1}))} className="w-full bg-brand-primary border border-brand-accent rounded-lg p-2 text-brand-text" />
              </div>
           </div>
        );
    case 5:
        return (
           <div className="space-y-6 animate-fade-in">
              <h3 className="text-lg font-semibold text-brand-text border-b border-brand-accent pb-2 mb-4">Legislative & Career Rules</h3>
              <div>
                  <label className="flex items-center text-sm font-medium text-brand-light mb-1">Days for Review <InfoTooltip text="How many days a proposal stays In Review before being Approved or Rejected." /></label>
                  <input type="number" min="1" value={config.daysForReview} onChange={e => setConfig(c => ({...c, daysForReview: parseInt(e.target.value, 10) || 1}))} className="w-full bg-brand-primary border border-brand-accent rounded-lg p-2 text-brand-text" />
              </div>
              <div>
                  <label className="flex items-center text-sm font-medium text-brand-light mb-1">Ratification Day Interval <InfoTooltip text="How often (in days) approved proposals are ratified into law. e.g., 7 means laws are passed on Day 7, 14, 21..." /></label>
                  <input type="number" min="1" value={config.ratificationDayInterval} onChange={e => setConfig(c => ({...c, ratificationDayInterval: parseInt(e.target.value, 10) || 1}))} className="w-full bg-brand-primary border border-brand-accent rounded-lg p-2 text-brand-text" />
              </div>
              <div>
                  <label className="flex items-center text-sm font-medium text-brand-light mb-1">Successful Drafts for Promotion <InfoTooltip text="A Drafter becomes a permanent Reviewer after their proposals are ratified this many times." /></label>
                  <input type="number" min="1" value={config.promotionThresholds.drafterToReviewer} onChange={e => setConfig(c => ({...c, promotionThresholds: {...c.promotionThresholds, drafterToReviewer: parseInt(e.target.value, 10) || 1}}))} className="w-full bg-brand-primary border border-brand-accent rounded-lg p-2 text-brand-text" />
              </div>
              <div>
                  <label className="flex items-center text-sm font-medium text-brand-light mb-1">Successful Reviews for Promotion <InfoTooltip text="A Reviewer is promoted to the Council after their feedback is on this many ratified proposals. NOTE: Council role not yet fully implemented." /></label>
                  <input type="number" min="1" value={config.promotionThresholds.reviewerToCouncil} onChange={e => setConfig(c => ({...c, promotionThresholds: {...c.promotionThresholds, reviewerToCouncil: parseInt(e.target.value, 10) || 1}}))} className="w-full bg-brand-primary border border-brand-accent rounded-lg p-2 text-brand-text" />
              </div>
           </div>
        );
      default:
        return null;
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 1: return "Basic Info";
      case 2: return "Participants";
      case 3: return "Core Simulation";
      case 4: return "Governance";
      case 5: return "Legislative Rules";
      default: return "";
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-brand-secondary rounded-lg shadow-2xl w-full max-w-2xl transform transition-all flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-brand-accent/30 flex-shrink-0">
          <h2 className="text-2xl font-bold text-brand-text">Create New Experiment</h2>
          <p className="text-sm text-brand-light">Step {step} of 5: {getStepTitle()}</p>
          <div className="w-full bg-brand-primary rounded-full h-2 mt-4">
            <div className="bg-brand-blue h-2 rounded-full transition-all duration-500" style={{ width: `${(step / 5) * 100}%` }}></div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {error && <p className="text-brand-red text-sm mb-4 text-center bg-red-500/10 p-2 rounded-md">{error}</p>}
            {renderStepContent()}
          </div>
        </div>

        <div className="p-6 border-t border-brand-accent/30 flex justify-between items-center flex-shrink-0">
          <button onClick={onCancel} className="text-brand-light hover:text-white font-semibold py-2 px-4 rounded-lg">Cancel</button>
          <div className="flex space-x-4">
            {step > 1 && (
              <button onClick={handleBack} className="bg-brand-accent hover:bg-opacity-80 text-white font-bold py-2 px-6 rounded-lg transition-colors">Back</button>
            )}
            {step < 5 ? (
              <button onClick={handleNext} className="bg-brand-accent text-brand-blue font-bold py-3 px-6 text-base rounded-lg transition-colors shadow-md hover:shadow-lg hover:bg-brand-light hover:text-brand-primary">Next</button>
            ) : (
              <button onClick={handleSubmit} className="bg-brand-accent text-brand-blue font-bold py-3 px-6 text-base rounded-lg transition-colors shadow-md hover:shadow-lg hover:bg-brand-light hover:text-brand-primary">Start Experiment</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


const ProposalCard: React.FC<{ proposal: Proposal; members: Member[]; }> = ({ proposal, members }) => {
    const author = members.find(m => m.id === proposal.authorId);
    
    const upvoteCount = proposal.upvotes.length;
    const downvoteCount = proposal.downvotes.length;
    const modificationCommentCount = proposal.comments.filter(c => c.intent === 'Modification').length;
    const totalCommentCount = proposal.comments.length;

    return (
        <details className="bg-brand-primary/50 rounded-lg p-4 group">
            <summary className="cursor-pointer list-none">
                <div className="flex justify-between items-start">
                    <div className="pr-4">
                        <h4 className="font-semibold text-brand-text group-hover:text-brand-blue">{proposal.title}</h4>
                        <p className="text-xs text-brand-light">by {author ? <MemberTooltipProvider member={author}>{author.name}</MemberTooltipProvider> : 'Unknown'} on Day {proposal.creationDay}</p>
                    </div>
                    <div className="flex items-center space-x-3 text-xs flex-shrink-0">
                         {proposal.status === ProposalStatus.Issue ? (
                             <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                                <span className="flex items-center space-x-1 text-brand-green" title={`${upvoteCount} Upvotes`}>
                                    <ThumbsUpIcon className="h-4 w-4" />
                                    <span>{upvoteCount}</span>
                                </span>
                                <span className="flex items-center space-x-1 text-brand-red" title={`${downvoteCount} Downvotes`}>
                                    <ThumbsDownIcon className="h-4 w-4" />
                                    <span>{downvoteCount}</span>
                                </span>
                                <span className="flex items-center space-x-1 text-yellow-400" title={`${modificationCommentCount} Modification Suggestions`}>
                                    <EditIcon className="h-4 w-4" />
                                    <span>{modificationCommentCount}</span>
                                </span>
                                <span className="flex items-center space-x-1 text-brand-light" title={`${totalCommentCount} Total Comments`}>
                                    <MessageSquareIcon className="h-4 w-4" />
                                    <span>{totalCommentCount}</span>
                                </span>
                            </div>
                        ) : (proposal.status === ProposalStatus.InReview || proposal.status === ProposalStatus.ApprovedForRatification) ? (
                            <span className="flex items-center space-x-1 text-brand-light">
                                <MessageSquareIcon className="h-4 w-4" />
                                <span>{totalCommentCount}</span>
                            </span>
                        ) : null}
                         <span className="text-brand-light group-open:rotate-90 transform transition-transform duration-200">&#9656;</span>
                    </div>
                </div>
            </summary>
            <div className="mt-4 pt-3 border-t border-brand-accent/50 space-y-4">
                {proposal.reference && (
                    <div>
                        <h5 className="font-semibold text-sm text-brand-light mb-1">In Relation To</h5>
                        <p className="text-sm text-brand-text bg-brand-primary/30 p-2 rounded-md">{proposal.reference.text}</p>
                    </div>
                )}
                
                <div>
                    <h5 className="font-semibold text-sm text-brand-light mb-1">Issue Statement</h5>
                    <p className="text-sm text-brand-text">{proposal.issueStatement}</p>
                </div>
                
                {proposal.proposedChanges && (
                    <div>
                        <h5 className="font-semibold text-sm text-brand-light mb-1">Proposed Changes</h5>
                        <div className="text-sm text-brand-text space-y-1">
                            {proposal.proposedChanges.split('\n').map((item, index) => (
                              <p key={index} className="m-0 p-0">{item}</p>
                            ))}
                        </div>
                    </div>
                )}

                {proposal.draftText && (
                    <div>
                        <h5 className="font-semibold text-sm text-brand-light mb-1">Drafted Text</h5>
                        <blockquote className="text-sm text-brand-text border-l-4 border-brand-accent pl-4 py-2 bg-brand-primary/30 rounded-r-md">{proposal.draftText}</blockquote>
                    </div>
                )}

                {proposal.comments.length > 0 && (
                    <div>
                        <h5 className="font-semibold text-sm text-brand-light mb-2">Comments</h5>
                        <div className="space-y-3">
                            {proposal.comments.map((comment, i) => {
                                const commenter = members.find(m => m.id === comment.commenterId);
                                const intentMap = {
                                    For: { icon: <ThumbsUpIcon className="h-4 w-4 text-brand-green" />, color: 'text-brand-green' },
                                    Against: { icon: <ThumbsDownIcon className="h-4 w-4 text-brand-red" />, color: 'text-brand-red' },
                                    Modification: { icon: <EditIcon className="h-4 w-4 text-yellow-400" />, color: 'text-yellow-400' },
                                };
                                const { icon, color } = intentMap[comment.intent];
                                
                                return (
                                    <div key={i} className="bg-brand-primary/50 p-3 rounded-md">
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="font-bold text-xs text-brand-light">{commenter ? <MemberTooltipProvider member={commenter}>{commenter.name}</MemberTooltipProvider> : 'Unknown'}</p>
                                            <div className="flex items-center space-x-1">
                                                {icon}
                                                <span className={`text-xs font-semibold ${color}`}>{comment.intent}</span>
                                            </div>
                                        </div>
                                        <p className="text-sm text-brand-text">{comment.comment}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </details>
    );
};


const ProposalColumn: React.FC<{ title: string; proposals: Proposal[]; members: Member[]; }> = ({ title, proposals, members }) => (
    <div className="bg-brand-secondary/80 rounded-lg p-4 flex-1">
        <h3 className="font-bold text-xl mb-4 text-brand-text">{title} ({proposals.length})</h3>
        <div className="space-y-3 h-96 overflow-y-auto pr-2">
            {proposals.length > 0 ? (
                proposals.map(p => <ProposalCard key={p.id} proposal={p} members={members} />)
            ) : (
                <p className="text-center text-brand-light text-sm pt-4">No proposals in this stage.</p>
            )}
        </div>
    </div>
);

const DayProgressionDisplay: React.FC<{ experiment: Experiment }> = ({ experiment }) => {
    const { completedActionsToday, totalActionsToday, status } = experiment;

    const progressPercent = totalActionsToday > 0 ? (completedActionsToday / totalActionsToday) * 100 : 0;

    const secondsInDay = 86400; // 24 * 60 * 60
    const currentSecond = (progressPercent / 100) * secondsInDay;
    const hours = Math.floor(currentSecond / 3600);
    const minutes = Math.floor((currentSecond % 3600) / 60);
    const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    
    const isDayOver = completedActionsToday >= totalActionsToday && totalActionsToday > 0;

    return (
        <div>
            <div className="flex justify-between items-baseline mb-1">
                <span className="font-semibold text-brand-text">Day Progression</span>
                <span className="text-xs font-mono text-brand-light">{completedActionsToday} / {totalActionsToday} Actions</span>
            </div>
            <div className="w-full bg-brand-primary rounded-full h-2.5 mb-2">
                <div 
                    className={`h-2.5 rounded-full ${status === 'Running' ? 'bg-brand-blue' : 'bg-brand-accent'}`} 
                    style={{ width: `${progressPercent}%`, transition: 'width 0.5s ease-in-out' }}
                ></div>
            </div>
            <div className="flex justify-between items-center text-xs text-brand-light">
                <span><ClockIcon className="inline h-3 w-3 mr-1" />{isDayOver ? "Day Complete" : timeString}</span>
                <span>Day {experiment.currentDay} / {experiment.config.maxExperimentDays}</span>
            </div>
        </div>
    );
};


const RoleDisplay: React.FC<{ role: Role }> = ({ role }) => {
    const styles: Record<Role, string> = {
        [Role.Citizen]: 'bg-brand-light/20 text-brand-light',
        [Role.Drafter]: 'bg-yellow-500/20 text-yellow-400',
        [Role.Reviewer]: 'bg-brand-blue/20 text-brand-blue',
        [Role.Council]: 'bg-green-500/20 text-green-300',
    };
    return <span className={`font-semibold px-2 py-0.5 rounded-full text-xs ${styles[role]}`}>{role.replace(" AI Agent", "")}</span>
}

const StatusBadge: React.FC<{ status: Experiment['status'] }> = ({ status }) => {
    const styles: Record<Experiment['status'], string> = {
        'Running': 'bg-green-500/20 text-green-300 animate-pulse',
        'Paused': 'bg-yellow-500/20 text-yellow-400',
        'Completed': 'bg-brand-light/20 text-brand-light',
        'Setting Up': 'bg-blue-500/20 text-brand-blue',
    };
    return <span className={`font-semibold px-2.5 py-1 rounded-full text-xs ${styles[status]}`}>{status}</span>
}

const ControlButton: React.FC<{ onClick: () => void, children: React.ReactNode, className: string, disabled?: boolean }> = ({ onClick, children, className, disabled }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`flex items-center space-x-2 px-3 py-1.5 rounded-md font-semibold text-xs transition-colors ${className}`}
    >
        {children}
    </button>
);


interface LawPageProps {
  experiments: Experiment[];
  setExperiments: React.Dispatch<React.SetStateAction<Experiment[]>>;
  societies: Society[];
  setPage: (page: Page) => void;
  initialExperimentId: string | null;
  clearInitialExperimentId: () => void;
  navigateToSociety: (societyId: string) => void;
}

const LawPage: React.FC<LawPageProps> = ({ experiments, setExperiments, societies, setPage, initialExperimentId, clearInitialExperimentId, navigateToSociety }) => {
    const [isSettingUp, setIsSettingUp] = useState(false);
    const [selectedExperimentId, setSelectedExperimentId] = useState<string | null>(null);
    const eventLogRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (initialExperimentId) {
            setSelectedExperimentId(initialExperimentId);
            clearInitialExperimentId();
        }
    }, [initialExperimentId, clearInitialExperimentId]);
    
    const selectedExperiment = useMemo(() => experiments.find(e => e.id === selectedExperimentId), [experiments, selectedExperimentId]);
    const societyForSelectedExp = useMemo(() => societies.find(s => s.id === selectedExperiment?.societyId), [societies, selectedExperiment]);

    useEffect(() => {
        if (eventLogRef.current) {
            eventLogRef.current.scrollTop = eventLogRef.current.scrollHeight;
        }
    }, [selectedExperiment?.eventLog]);

    const handleStartExperiment = (name: string, coreStatements: string, societyId: string, memberIds: string[], config: ExperimentConfig) => {
        const newExperiment: Experiment = {
            id: `exp-${Date.now()}`,
            name,
            societyId,
            status: 'Running',
            memberIds,
            coreStatements: coreStatements.split('\n').filter(s => s.trim() !== ''),
            laws: [],
            proposals: [],
            eventLog: [{
                id: `evt-${Date.now()}`,
                day: 0,
                text: `Experiment '${name}' started.`,
                type: EventType.ExperimentStarted
            }],
            currentDay: 0,
            nextDayTimestamp: Date.now(), // Used to check if browser was closed
            roles: {},
            performance: {},
            config,
            totalActionsToday: 0,
            completedActionsToday: 0,
            dailyActivity: {},
            turnState: { round: 1, phase: 'CITIZENS', actorIndex: 0 },
        };
        // Pause any other running experiments before starting a new one
        setExperiments(prev => [...prev.map(e => e.status === 'Running' ? ({ ...e, status: 'Paused' as const }) : e), newExperiment]);
        setIsSettingUp(false);
        setSelectedExperimentId(newExperiment.id);
    };

    const handleControlClick = (expId: string, status: 'Paused' | 'Running' | 'Completed') => {
        setExperiments(prev => prev.map(e => {
            if (e.id === expId) {
                // When resuming, also reset the timestamp to ensure it's picked up by the "closed browser" check if needed later.
                 if (status === 'Running') {
                    return { ...e, status, nextDayTimestamp: Date.now() };
                }
                return { ...e, status };
            }
            // If resuming one experiment, pause any others that might be running.
            if (status === 'Running' && e.status === 'Running') {
                 return { ...e, status: 'Paused' };
            }
            return e;
        }));
    };
    
    const handleDeleteExperiment = (expId: string) => {
        if (window.confirm('Are you sure you want to permanently delete this experiment? This action cannot be undone.')) {
            // If the deleted experiment is the currently selected one, navigate back to the list.
            if (selectedExperimentId === expId) {
                setSelectedExperimentId(null);
            }
            setExperiments(prev => prev.filter(e => e.id !== expId));
        }
    };


    const getLogMessage = (log: any) => {
        const member = societyForSelectedExp?.members.find(m => m.id === log.memberId);
        const MemberName: React.FC<{ member: Member | undefined }> = ({ member }) => {
            if (!member) return null;
            return <MemberTooltipProvider member={member}>{member.name}</MemberTooltipProvider>;
        };

        if (log.type === EventType.Promotion || log.type === EventType.DayStart || log.type === EventType.ExperimentStarted || log.type === EventType.DayEnd) {
             return <p key={log.id}><span className="text-yellow-400/80">[SYSTEM]</span> {log.text}</p>
        }
        if (log.type === EventType.Decision) {
             return <p key={log.id} className="opacity-60"><span className="text-brand-accent/80">[Day {log.day}]</span> <span className="font-semibold text-brand-light">[{selectedExperiment?.roles[log.memberId].replace(" AI Agent", "")} <MemberName member={member} />]:</span> {log.text}</p>
        }
        if (member && selectedExperiment) {
            const role = selectedExperiment.roles[member.id];
            if (role) {
                 return <p key={log.id}><span className="text-brand-accent/80">[Day {log.day}]</span> <span className="font-semibold text-brand-light">[{role.replace(" AI Agent", "")} <MemberName member={member} />]:</span> {log.text}</p>
            }
        }
        return <p key={log.id}><span className="text-brand-accent/80">[Day {log.day}]</span> {log.text}</p>;
    }

    const proposalsByStatus = useMemo(() => {
        if (!selectedExperiment) return { issue: [], inReview: [], approved: [], rejected: [] };
        return {
            issue: selectedExperiment.proposals.filter(p => p.status === ProposalStatus.Issue),
            inReview: selectedExperiment.proposals.filter(p => p.status === ProposalStatus.InReview),
            approved: selectedExperiment.proposals.filter(p => p.status === ProposalStatus.ApprovedForRatification),
            rejected: selectedExperiment.proposals.filter(p => p.status === ProposalStatus.Rejected)
        };
    }, [selectedExperiment]);

    // Main render
  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      {isSettingUp && <ExperimentSetupWizard societies={societies} onCancel={() => setIsSettingUp(false)} onStart={handleStartExperiment} />}
      
      {!selectedExperimentId ? (
        // EXPERIMENT LIST VIEW
        <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
              <div>
                <h1 className="text-4xl font-bold text-brand-text">Law & Governance</h1>
                <p className="mt-1 text-lg text-brand-light">
                  Manage constitutional experiments and observe the emergence of law.
                </p>
              </div>
              <button
                onClick={() => setIsSettingUp(true)}
                className="flex items-center justify-center bg-brand-accent text-brand-blue font-bold py-3 px-5 text-base rounded-lg transition-colors shadow-md hover:shadow-lg hover:bg-brand-light hover:text-brand-primary disabled:bg-brand-accent/50 disabled:text-brand-light/70 disabled:cursor-not-allowed disabled:hover:bg-brand-accent/50"
                disabled={societies.every(s => s.members.length < 3)}
              >
                <PlusCircleIcon className="h-5 w-5 mr-2" />
                Start New Experiment
              </button>
            </div>

            {societies.every(s => s.members.length < 3) && (
                <div className="text-center py-10 bg-brand-secondary rounded-lg border-2 border-dashed border-brand-accent">
                    <h3 className="text-xl font-semibold text-brand-text">A Society with at Least 3 Members is Needed</h3>
                    <p className="mt-1 text-brand-light">You need a society with at least 3 members to run an experiment.</p>
                    <button onClick={() => setPage(Page.Society)} className="mt-4 text-brand-blue font-semibold hover:underline">Go to Societies Page</button>
                </div>
            )}
            
            {societies.some(s => s.members.length >= 3) && experiments.length === 0 && (
                <div className="text-center py-20 bg-brand-secondary rounded-lg border-2 border-dashed border-brand-accent">
                    <GavelIcon className="mx-auto h-12 w-12 text-brand-accent" />
                    <h3 className="mt-4 text-xl font-semibold text-brand-text">No Experiments Created</h3>
                    <p className="mt-1 text-brand-light">Start your first constitutional simulation.</p>
                </div>
            )}

            {experiments.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...experiments].sort((a,b) => b.id.localeCompare(a.id)).map(exp => {
                         const society = societies.find(s => s.id === exp.societyId);
                         return (
                        <div key={exp.id} className="bg-brand-secondary rounded-lg shadow-lg border border-brand-accent/30 flex flex-col group">
                            <div className="p-5 flex-grow relative">
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteExperiment(exp.id); }}
                                    className="absolute top-2 right-2 p-1.5 rounded-full bg-brand-accent/50 text-brand-light hover:bg-brand-red hover:text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
                                    aria-label={`Delete experiment ${exp.name}`}
                                >
                                    <Trash2Icon className="h-4 w-4" />
                                </button>
                                <div className="flex justify-between items-start">
                                    <h3 className="text-xl font-bold text-brand-text mb-1 pr-8">{exp.name}</h3>
                                    <StatusBadge status={exp.status} />
                                </div>
                                <p className="text-xs text-brand-light mb-4">Society: {society?.name || "Unknown"}</p>

                                <div className="flex justify-around text-center text-sm">
                                    <div>
                                        <div className="font-bold text-2xl text-brand-text">{exp.currentDay}</div>
                                        <div className="text-brand-light">Day</div>
                                    </div>
                                    <div>
                                        <div className="font-bold text-2xl text-brand-text">{exp.memberIds.length}</div>
                                        <div className="text-brand-light">Members</div>
                                    </div>
                                    <div>
                                        <div className="font-bold text-2xl text-brand-text">{exp.laws.length}</div>
                                        <div className="text-brand-light">Laws</div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-brand-primary/50 p-3 mt-4">
                                <button onClick={() => setSelectedExperimentId(exp.id)} className="w-full text-center font-semibold text-brand-blue hover:text-white transition-colors flex items-center justify-center">
                                    View Details <ArrowRightIcon className="h-4 w-4 ml-2" />
                                </button>
                            </div>
                        </div>
                    )}
                  )}
                </div>
            )}
        </div>
      ) : selectedExperiment && societyForSelectedExp && (
            // EXPERIMENT DETAIL VIEW
            <div className="max-w-screen-2xl mx-auto">
                <div className="mb-6">
                    <button onClick={() => setSelectedExperimentId(null)} className="flex items-center text-brand-light hover:text-brand-text transition-colors font-semibold">
                        <ChevronLeftIcon className="h-5 w-5 mr-1"/>
                        Back to All Experiments
                    </button>
                </div>
                <div className="space-y-6">
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        <div className="bg-brand-secondary p-6 rounded-lg shadow-lg">
                            <h3 className="font-bold text-xl mb-1 text-brand-text">{selectedExperiment.name}</h3>
                             <div className="flex items-center gap-2 mb-4">
                                <span className="text-sm text-brand-light">Society:</span>
                                <button 
                                    onClick={() => navigateToSociety(societyForSelectedExp.id)}
                                    className="bg-brand-accent/70 text-brand-text hover:bg-brand-accent px-3 py-1 rounded-full text-sm font-semibold transition-colors shadow-sm"
                                >
                                    {societyForSelectedExp.name}
                                </button>
                            </div>
                            <div className="space-y-3 text-sm">
                               <div className="flex justify-between items-center"><span className="text-brand-light">Status:</span><StatusBadge status={selectedExperiment.status} /></div>
                               <div className="flex justify-between"><span className="text-brand-light">Society Members:</span><span className="font-bold text-brand-text">{selectedExperiment.memberIds.length}</span></div>
                                <div className="border-t border-brand-accent/50 my-3"></div>
                               <DayProgressionDisplay experiment={selectedExperiment} />
                            </div>
                            <div className="border-t border-brand-accent/50 mt-4 pt-4 flex items-center justify-end space-x-2">
                               {selectedExperiment.status === 'Running' &&
                                <ControlButton onClick={() => handleControlClick(selectedExperiment.id, 'Paused')} className="bg-yellow-500/80 hover:bg-yellow-500/100 text-white">
                                    <PauseIcon className="h-4 w-4" /><span>Pause</span>
                                </ControlButton>
                               }
                               {selectedExperiment.status === 'Paused' &&
                                <ControlButton onClick={() => handleControlClick(selectedExperiment.id, 'Running')} className="bg-green-500/80 hover:bg-green-500/100 text-white">
                                    <PlayIcon className="h-4 w-4" /><span>Resume</span>
                                </ControlButton>
                               }
                               {selectedExperiment.status !== 'Completed' &&
                                <ControlButton onClick={() => handleControlClick(selectedExperiment.id, 'Completed')} className="bg-red-500/80 hover:bg-red-500/100 text-white">
                                    <SquareIcon className="h-4 w-4" /><span>Stop</span>
                                </ControlButton>
                               }
                            </div>
                        </div>
                        <div className="bg-brand-secondary p-6 rounded-lg shadow-lg">
                            <h3 className="font-bold text-xl mb-4 text-brand-text">Participants & Roles</h3>
                             <ul className="space-y-2 max-h-48 overflow-y-auto pr-2 text-sm">
                                {selectedExperiment.memberIds.map(id => {
                                    const member = societyForSelectedExp.members.find(m => m.id === id);
                                    const role = selectedExperiment.roles[id];
                                    if (!member) return null;
                                    return (
                                        <li key={id} className="flex items-center justify-between">
                                            <span className="text-brand-text">
                                                <MemberTooltipProvider member={member}>{member.name}</MemberTooltipProvider>
                                            </span>
                                            {role ? <RoleDisplay role={role} /> : <span className="text-xs text-brand-light">pending...</span>}
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                         <div className="bg-brand-secondary p-6 rounded-lg shadow-lg">
                            <h3 className="font-bold text-xl mb-4 text-brand-text">Current Ratified Laws ({selectedExperiment.laws.length})</h3>
                            <ul className="space-y-3 max-h-48 overflow-y-auto pr-2">
                                {selectedExperiment.laws.length > 0 ? selectedExperiment.laws.map(law => (
                                    <li key={law.id} className="flex items-start space-x-3 text-sm">
                                        <CheckCircleIcon className="h-5 w-5 text-brand-green flex-shrink-0 mt-0.5"/>
                                        <span className="text-brand-text">{law.text} (Ratified Day {law.ratifiedOn})</span>
                                    </li>
                                )) : <p className="text-brand-light">No laws have been ratified yet.</p>}
                            </ul>
                        </div>
                    </div>
                     <div className="bg-brand-secondary p-4 rounded-lg shadow-lg">
                        <h3 className="font-bold text-xl mb-2 text-brand-text">Live Event Log</h3>
                        <div ref={eventLogRef} className="h-48 bg-brand-primary/50 p-3 rounded text-xs font-mono text-brand-light overflow-y-scroll space-y-1">
                            {selectedExperiment.eventLog.slice(-100).map(log => getLogMessage(log))}
                        </div>
                    </div>
                    <div className="flex flex-col lg:flex-row gap-4">
                        <ProposalColumn title="New Issues" proposals={proposalsByStatus.issue} members={societyForSelectedExp.members} />
                        <ProposalColumn title="In Review" proposals={proposalsByStatus.inReview} members={societyForSelectedExp.members} />
                        <ProposalColumn title="Approved" proposals={proposalsByStatus.approved} members={societyForSelectedExp.members} />
                        <ProposalColumn title="Rejected" proposals={proposalsByStatus.rejected} members={societyForSelectedExp.members} />
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default LawPage;