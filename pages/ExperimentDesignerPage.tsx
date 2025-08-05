import React, { useState, useEffect } from 'react';
import { ExperimentProtocol, Role, Task, Tool, ProcessState, StateTransition, TransitionTrigger, Protocol, ToolInput } from '../types';
import { ChevronLeftIcon, PlusCircleIcon, Trash2Icon, UserIcon, BotIcon, Wand2Icon, BookTextIcon, GitForkIcon, CheckIcon, XIcon, ArrowRightIcon, EditIcon } from '../components/icons';
import { TOOLS_PALETTE, TASK_TARGETS } from '../constants';
import { generateProtocolFromIdea, modifyProtocolWithAI } from '../services/geminiService';


interface ProtocolDesignerPageProps {
  onStartGeneration: (name: string, description: string, idea: string) => Promise<Protocol>;
  onCancel: () => void;
  protocolToEdit: Protocol | null;
  onUpdateProtocol: (protocol: Protocol) => void;
}

const ModifyProtocolModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (request: string) => void;
}> = ({ isOpen, onClose, onSubmit }) => {
    const [request, setRequest] = useState('');

    if (!isOpen) return null;

    const handleSubmit = () => {
        if (request.trim()) {
            onSubmit(request);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-brand-secondary rounded-lg shadow-2xl w-full max-w-2xl">
                <div className="p-6 border-b border-brand-accent/50">
                    <h2 className="text-2xl font-bold text-brand-text">Modify Protocol with AI</h2>
                    <p className="text-brand-light mt-1">Describe the change you want to make to the current protocol.</p>
                </div>
                <div className="p-6">
                    <textarea
                        value={request}
                        onChange={e => setRequest(e.target.value)}
                        rows={5}
                        className="w-full bg-brand-primary border border-brand-accent rounded-lg p-4 text-brand-text focus:ring-2 focus:ring-brand-blue focus:outline-none"
                        placeholder="e.g., 'Add a 3-day review period after a proposal is drafted where anyone can comment.' or 'Create a new 'Auditor' role that must approve proposals before they go to a general vote.'"
                        autoFocus
                    />
                </div>
                <div className="p-4 bg-brand-primary/50 flex justify-between items-center">
                    <button type="button" onClick={onClose} className="text-brand-light hover:text-white font-semibold">Cancel</button>
                    <button onClick={handleSubmit} disabled={!request.trim()} className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-6 rounded-lg disabled:bg-brand-accent/50 disabled:cursor-not-allowed">
                        Submit to AI
                    </button>
                </div>
            </div>
        </div>
    );
};


const Section: React.FC<{ title: string; description?: string; children: React.ReactNode; className?: string; onAdd?: () => void; }> = ({ title, description, children, className, onAdd }) => (
    <div className={`bg-brand-secondary/80 p-6 rounded-lg border border-brand-accent/30 ${className}`}>
        <div className="flex justify-between items-center">
            <div>
                <h3 className="text-xl font-semibold text-brand-text">{title}</h3>
                {description && <p className="text-sm text-brand-light mb-4">{description}</p>}
            </div>
            {onAdd && <button onClick={onAdd} className="p-1.5 text-brand-light hover:text-brand-blue bg-brand-accent/50 hover:bg-brand-accent rounded-full transition-colors"><PlusCircleIcon className="h-5 w-5"/></button>}
        </div>
        <div className="mt-4 space-y-4">{children}</div>
    </div>
);

const TaskInput: React.FC<{ input: ToolInput, value: any, onChange: (value: any) => void }> = ({ input, value, onChange }) => {
    switch(input.type) {
        case 'string':
            return <input type="text" value={value || ''} onChange={e => onChange(e.target.value)} className="w-full bg-brand-primary rounded p-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-blue" placeholder={input.description} />;
        case 'long_text':
            return <textarea value={value || ''} onChange={e => onChange(e.target.value)} rows={2} className="w-full bg-brand-primary rounded p-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-blue" placeholder={input.description} />;
        case 'options':
            return (
                <select value={value || ''} onChange={e => onChange(e.target.value)} className="w-full bg-brand-primary rounded p-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-blue">
                    <option value="">-- Select --</option>
                    {input.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
            );
        default:
            return <span className="text-xs text-brand-light/70 italic">Input type '{input.type}' is automatically handled by the system.</span>;
    }
};

const ExperimentDesignerPage: React.FC<ProtocolDesignerPageProps> = ({ onStartGeneration, onCancel, protocolToEdit, onUpdateProtocol }) => {
    const [mode, setMode] = useState<'ideation'|'review'>(protocolToEdit ? 'review' : 'ideation');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [isModifyModalOpen, setIsModifyModalOpen] = useState(false);
    
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [idea, setIdea] = useState('A simple democracy where citizens can propose laws, comment on them for a week, and then everyone votes. A 60% majority is needed to pass a law.');
    const [protocol, setProtocol] = useState<ExperimentProtocol | null>(null);
    const [activeProtocol, setActiveProtocol] = useState<Protocol | null>(protocolToEdit);

    useEffect(() => {
        if (protocolToEdit) {
            setName(protocolToEdit.name);
            setDescription(protocolToEdit.description);
            // Sanitize tasks to ensure toolInputs exists, preventing crashes in the UI.
            const sanitizedProtocol = {
                ...protocolToEdit.protocol,
                tasks: protocolToEdit.protocol.tasks.map(task => ({
                    ...task,
                    toolInputs: task.toolInputs || {}
                }))
            };
            setProtocol(sanitizedProtocol);
            setActiveProtocol(protocolToEdit);
        }
    }, [protocolToEdit]);

    const handleGenerate = async () => {
        if (!idea || !name) {
            alert("Please provide a name and your governance idea.");
            return;
        }
        
        setIsLoading(true);
        setLoadingMessage('AI is crafting your protocol...');

        try {
            const newProtocolData = await onStartGeneration(name, description, idea);
            // The onStartGeneration function now returns the complete protocol
            setName(newProtocolData.name);
            setDescription(newProtocolData.description);
            // Sanitize tasks from new generation to ensure toolInputs exists.
            const sanitizedProtocol = {
                ...newProtocolData.protocol,
                tasks: newProtocolData.protocol.tasks.map(task => ({
                    ...task,
                    toolInputs: task.toolInputs || {}
                }))
            };
            setProtocol(sanitizedProtocol);
            setActiveProtocol(newProtocolData);
            setMode('review');
        } catch (error) {
            console.error("Failed to generate protocol from ExperimentDesignerPage:", error);
            alert("Protocol generation failed. The AI may have returned an error. You may need to check the Law & Governance page to delete the failed attempt.");
            // We stay on the page, the user can try again or navigate away.
            // The failed protocol card will appear on the Law page.
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };

    const handleModifyProtocol = async (modificationRequest: string) => {
        if (!protocol) return;
        setIsModifyModalOpen(false);
        setIsLoading(true);
        setLoadingMessage('AI is modifying your protocol...');

        try {
            const { tools, ...protocolData } = protocol;
            const modifiedProtocolData = await modifyProtocolWithAI(protocolData, modificationRequest);
            const newFullProtocol = {
                ...modifiedProtocolData,
                tasks: modifiedProtocolData.tasks.map(task => ({...task, toolInputs: task.toolInputs || {}})), // Sanitize after modification too
                tools: TOOLS_PALETTE
            };
            setProtocol(newFullProtocol);
            if(activeProtocol) {
                 setActiveProtocol(prev => prev ? {...prev, protocol: newFullProtocol, flow: newFullProtocol.flow } : null);
            }
        } catch (error) {
            console.error("Failed to modify protocol:", error);
            alert("There was an error modifying the protocol. The AI may have returned an invalid format. Please check the console and try a different request.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSave = () => {
        if (!name || !protocol) {
            alert("Protocol Name and a generated protocol are required to save.");
            return;
        }

        if (!activeProtocol) {
            alert("Error: No active protocol context found to save. Please generate or load a protocol first.");
            return;
        }

        onUpdateProtocol({ ...activeProtocol, name, description, protocol });
    };

    const handleResetOrGoBack = () => {
        if (protocolToEdit) {
            if (window.confirm("Are you sure you want to discard all your manual changes?")) {
                setName(protocolToEdit.name);
                setDescription(protocolToEdit.description);
                setProtocol(protocolToEdit.protocol);
                setActiveProtocol(protocolToEdit);
            }
        } else {
            // In ideation mode, this just clears the fields
            setName('');
            setDescription('');
            setIdea('A simple democracy where citizens can propose laws, comment on them for a week, and then everyone votes. A 60% majority is needed to pass a law.');
        }
    };

    const updateProtocol = (updater: (p: ExperimentProtocol) => ExperimentProtocol) => {
        setProtocol(prev => prev ? updater(prev) : null);
    };

    const renderIdeationView = () => (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center">
                <h1 className="text-4xl font-bold text-brand-text">Protocol Design Studio</h1>
                <p className="mt-1 text-lg text-brand-light">Start by describing your governance system in plain English.</p>
            </div>

             <Section title="1. Protocol Identity" description="Give your protocol a name and a high-level description.">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-brand-light mb-1">Protocol Name</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-brand-primary border border-brand-accent rounded-lg p-3 text-brand-text focus:ring-2 focus:ring-brand-blue focus:outline-none" placeholder="e.g., Bicameral Presidential System" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-brand-light mb-1">Description (Optional)</label>
                        <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-brand-primary border border-brand-accent rounded-lg p-3 text-brand-text focus:ring-2 focus:ring-brand-blue focus:outline-none" placeholder="A brief summary of the protocol's purpose"/>
                    </div>
                </div>
            </Section>

            <Section title="2. Describe Your Governance Idea" description="Explain how you want your system to work. What are the roles? How does a law get passed? The more detail you provide, the better the result.">
                 <textarea value={idea} onChange={e => setIdea(e.target.value)} rows={8} className="w-full bg-brand-primary border border-brand-accent rounded-lg p-4 text-brand-text focus:ring-2 focus:ring-brand-blue focus:outline-none" />
            </Section>
            
            <div className="text-center pt-4">
                 <button onClick={handleGenerate} disabled={!idea || !name || isLoading} className="bg-brand-blue hover:bg-opacity-90 text-brand-primary font-bold py-4 px-10 rounded-lg text-lg flex items-center justify-center w-full md:w-auto md:mx-auto disabled:bg-brand-accent/50 disabled:cursor-not-allowed">
                    <Wand2Icon className="h-6 w-6 mr-3" />
                    Generate Protocol with AI
                </button>
            </div>
        </div>
    );
    
    const renderReviewView = () => {
        if (!protocol) return null;

        const { roles, states, transitions, tasks, flow } = protocol;
        
        return (
            <div className="space-y-8">
                <div>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-transparent text-4xl font-bold text-brand-text text-center focus:outline-none p-2 rounded-lg border border-transparent hover:border-brand-accent focus:border-brand-blue transition-colors hover:bg-brand-primary/30" />
                    <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-transparent mt-1 text-lg text-brand-light text-center focus:outline-none p-2 rounded-lg border border-transparent hover:border-brand-accent focus:border-brand-blue transition-colors hover:bg-brand-primary/30" />
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    <Section title="Roles" className="xl:col-span-1" onAdd={() => updateProtocol(p => ({...p, roles: [...p.roles, { id: `role_${Date.now()}`, name: 'New Role', description: '', type: 'member'}]}))}>
                        {roles.map(role => (
                            <div key={role.id} className="bg-brand-primary p-3 rounded-lg flex flex-col space-y-2">
                                <div className="flex items-start space-x-3">
                                    {role.type === 'member' ? <UserIcon className="h-5 w-5 text-brand-blue mt-1 flex-shrink-0" /> : <BotIcon className="h-5 w-5 text-purple-400 mt-1 flex-shrink-0" />}
                                    <input type="text" value={role.name} onChange={e => updateProtocol(p => ({...p, roles: p.roles.map(r => r.id === role.id ? {...r, name: e.target.value} : r)}))} className="w-full bg-transparent font-semibold text-brand-text focus:outline-none focus:bg-brand-secondary p-1 rounded"/>
                                    <button onClick={() => updateProtocol(p => ({...p, roles: p.roles.filter(r => r.id !== role.id)}))} className="p-1 text-brand-light hover:text-brand-red"><Trash2Icon className="h-4 w-4"/></button>
                                </div>
                                <textarea value={role.description} onChange={e => updateProtocol(p => ({...p, roles: p.roles.map(r => r.id === role.id ? {...r, description: e.target.value} : r)}))} className="w-full bg-transparent text-xs text-brand-light focus:outline-none focus:bg-brand-secondary p-1 rounded" rows={2}/>
                                <select value={role.type} onChange={e => updateProtocol(p => ({...p, roles: p.roles.map(r => r.id === role.id ? {...r, type: e.target.value as any} : r)}))} className="w-full bg-brand-secondary text-xs text-brand-light rounded p-1 border-none focus:ring-1 focus:ring-brand-blue">
                                    <option value="member">Member</option>
                                    <option value="systemic">Systemic</option>
                                </select>
                            </div>
                        ))}
                    </Section>
                    
                    <Section title="High-Level Flow" description="This is the AI's summary of the process it designed. You can edit it." className="xl:col-span-2">
                         <textarea value={flow} onChange={e => updateProtocol(p => ({...p, flow: e.target.value}))} rows={10} className="w-full bg-brand-primary p-4 rounded-lg text-brand-text whitespace-pre-wrap focus:outline-none focus:ring-1 focus:ring-brand-blue"/>
                    </Section>
                </div>

                <Section title="Process States & Transitions" onAdd={() => updateProtocol(p => ({...p, states: [...p.states, { id: `state_${Date.now()}`, name: 'New State', description: ''}]}))}>
                     {states.map(state => (
                        <div key={state.id} className="bg-brand-primary p-4 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                                <input type="text" value={state.name} onChange={e => updateProtocol(p => ({...p, states: p.states.map(s => s.id === state.id ? {...s, name: e.target.value} : s)}))} className="w-full bg-transparent font-bold text-lg text-brand-text focus:outline-none focus:bg-brand-secondary p-1 rounded"/>
                                <button onClick={() => updateProtocol(p => ({...p, states: p.states.filter(s => s.id !== state.id)}))} className="p-1 text-brand-light hover:text-brand-red"><Trash2Icon className="h-4 w-4"/></button>
                            </div>
                            <textarea value={state.description} onChange={e => updateProtocol(p => ({...p, states: p.states.map(s => s.id === state.id ? {...s, description: e.target.value} : s)}))} className="w-full bg-transparent text-xs text-brand-light mb-3 focus:outline-none focus:bg-brand-secondary p-1 rounded" rows={2}/>
                            
                            <div className="border-t border-brand-accent/30 pt-3">
                                <h5 className="font-semibold text-sm text-brand-light mb-2">Transitions from this state:</h5>
                                <div className="space-y-2">
                                {transitions.filter(t => t.fromStateId === state.id).map(t => (
                                    <div key={t.id} className="flex items-center space-x-2 text-sm text-brand-text bg-brand-secondary p-2 rounded-md">
                                        <ArrowRightIcon className="h-5 w-5 text-brand-accent flex-shrink-0" />
                                        <span>Move to</span>
                                        <select value={t.toStateId} onChange={e => updateProtocol(p => ({...p, transitions: p.transitions.map(tr => tr.id === t.id ? {...tr, toStateId: e.target.value} : tr)}))} className="bg-brand-primary rounded p-1">
                                            {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                        <span>when:</span>
                                        <input type="text" value={t.trigger.description} onChange={e => updateProtocol(p => ({...p, transitions: p.transitions.map(tr => tr.id === t.id ? {...tr, trigger: {...tr.trigger, description: e.target.value}} : tr)}))} className="flex-grow bg-transparent italic text-brand-light focus:outline-none focus:bg-brand-primary p-1 rounded" placeholder="Trigger description"/>
                                        <button onClick={() => updateProtocol(p => ({...p, transitions: p.transitions.filter(tr => tr.id !== t.id)}))} className="p-1 text-brand-light hover:text-brand-red"><Trash2Icon className="h-4 w-4"/></button>
                                    </div>
                                ))}
                                <button onClick={() => updateProtocol(p => ({...p, transitions: [...p.transitions, {id: `trans_${Date.now()}`, fromStateId: state.id, toStateId: states[0]?.id || '', description: 'New Transition', trigger: {type: 'task_completion', description: ''}}] }))} className="text-xs text-brand-blue hover:underline">+ Add transition</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </Section>
                
                <Section title="Tasks">
                    {roles.map(role => (
                        <div key={role.id} className="bg-brand-primary p-4 rounded-lg">
                            <div className="flex justify-between items-center">
                                <h4 className="font-bold text-lg text-brand-text flex items-center">
                                    {role.type === 'member' ? <UserIcon className="h-5 w-5 text-brand-blue mr-2" /> : <BotIcon className="h-5 w-5 text-purple-400 mr-2" />}
                                    {role.name}'s Tasks
                                </h4>
                                <button onClick={() => updateProtocol(p => ({...p, tasks: [...p.tasks, {id: `task_${Date.now()}`, roleId: role.id, description: 'New Task', toolId: 'read_content', target: {entity: 'Proposal Draft', statusId: states[0]?.id || ''}, toolInputs: {}, priority: 50}]}))} className="p-1.5 text-brand-light hover:text-brand-blue bg-brand-accent/50 hover:bg-brand-accent rounded-full transition-colors"><PlusCircleIcon className="h-5 w-5"/></button>
                            </div>
                            <div className="mt-3 space-y-2">
                                {tasks.filter(t => t.roleId === role.id).map(task => {
                                    const tool = TOOLS_PALETTE.find(t => t.id === task.toolId);
                                    return (
                                        <div key={task.id} className="bg-brand-secondary p-3 rounded-md space-y-2">
                                            <div className="flex items-center">
                                                <input type="text" value={task.description} onChange={e => updateProtocol(p => ({...p, tasks: p.tasks.map(t => t.id === task.id ? {...t, description: e.target.value} : t)}))} className="flex-grow bg-transparent font-semibold text-brand-text focus:outline-none focus:bg-brand-primary p-1 rounded" placeholder="Task description"/>
                                                <button onClick={() => updateProtocol(p => ({...p, tasks: p.tasks.filter(t => t.id !== task.id)}))} className="p-1 text-brand-light hover:text-brand-red"><Trash2Icon className="h-4 w-4"/></button>
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 items-center text-xs text-brand-light">
                                                <div>
                                                    <label className="block font-semibold mb-1">Tool</label>
                                                    <select value={task.toolId} onChange={e => updateProtocol(p => ({...p, tasks: p.tasks.map(t => t.id === task.id ? {...t, toolId: e.target.value, toolInputs: {}} : t)}))} className="bg-brand-primary rounded p-1 font-semibold text-brand-blue w-full">
                                                        {TOOLS_PALETTE.map(tool => <option key={tool.id} value={tool.id}>{tool.name}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block font-semibold mb-1">Target Entity</label>
                                                    <select value={task.target.entity} onChange={e => updateProtocol(p => ({...p, tasks: p.tasks.map(t => t.id === task.id ? {...t, target: {...t.target, entity: e.target.value}} : t)}))} className="bg-brand-primary rounded p-1 font-semibold text-brand-blue w-full">
                                                        {TASK_TARGETS.map(target => <option key={target} value={target}>{target}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block font-semibold mb-1">Target State</label>
                                                    <select value={task.target.statusId} onChange={e => updateProtocol(p => ({...p, tasks: p.tasks.map(t => t.id === task.id ? {...t, target: {...t.target, statusId: e.target.value}} : t)}))} className="bg-brand-primary rounded p-1 font-semibold text-brand-blue w-full">
                                                        {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                     <label className="block font-semibold mb-1">Priority</label>
                                                     <input type="number" value={task.priority || 50} onChange={e => updateProtocol(p => ({...p, tasks: p.tasks.map(t => t.id === task.id ? {...t, priority: parseInt(e.target.value, 10) || 50 } : t)}))} className="bg-brand-primary rounded p-1 text-center w-full" />
                                                </div>
                                            </div>
                                            {tool && tool.inputs.some(i => !['system_context', 'persona_profile', 'reference'].includes(i.type)) && (
                                                <div className="border-t border-brand-accent/30 pt-2 mt-2">
                                                    <h6 className="text-sm font-semibold text-brand-light mb-1">Tool Inputs</h6>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                    {tool.inputs.filter(i => !['system_context', 'persona_profile', 'reference'].includes(i.type)).map(input => (
                                                        <div key={input.id}>
                                                            <label className="block text-xs font-semibold mb-1">{input.name}</label>
                                                            <TaskInput input={input} value={task.toolInputs[input.id]} onChange={val => updateProtocol(p => ({...p, tasks: p.tasks.map(t => t.id === task.id ? {...t, toolInputs: {...t.toolInputs, [input.id]: val}} : t)}))} />
                                                        </div>
                                                    ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                {tasks.filter(t => t.roleId === role.id).length === 0 && <p className="text-sm text-brand-light italic text-center py-2">No tasks defined for this role.</p>}
                            </div>
                        </div>
                    ))}
                </Section>
                
                <div className="mt-8 pt-6 border-t border-brand-accent/30 flex justify-between items-center">
                    <button onClick={handleResetOrGoBack} className="text-brand-light font-semibold hover:text-white">
                        {protocolToEdit ? 'Reset Changes' : 'Clear & Start Over'}
                    </button>
                    <div className="flex items-center space-x-4">
                        <button onClick={() => setIsModifyModalOpen(true)} className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-8 rounded-lg text-lg flex items-center">
                            <Wand2Icon className="h-5 w-5 mr-2" />
                            Modify with AI
                        </button>
                        <button onClick={handleSave} className="bg-brand-blue hover:bg-opacity-90 text-brand-primary font-bold py-3 px-8 rounded-lg text-lg">
                            Save Protocol
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen p-4 sm:p-6 lg:p-8 animate-fade-in">
             <ModifyProtocolModal
                isOpen={isModifyModalOpen}
                onClose={() => setIsModifyModalOpen(false)}
                onSubmit={handleModifyProtocol}
            />
             <div className="max-w-7xl mx-auto">
                <div className="mb-6">
                    <button onClick={onCancel} className="flex items-center text-brand-light hover:text-brand-text transition-colors font-semibold">
                        <ChevronLeftIcon className="h-5 w-5 mr-1"/>
                        Back to Protocols
                    </button>
                </div>
                
                 {isLoading ? (
                    <div className="flex flex-col items-center justify-center text-center py-20">
                         <BotIcon className="h-16 w-16 text-brand-blue animate-pulse-fast" />
                        <h2 className="text-2xl font-bold text-brand-text mt-4">{loadingMessage}</h2>
                        <p className="text-brand-light mt-1 max-w-md">The AI is analyzing your idea and building a robust governance system. This may take a moment.</p>
                    </div>
                ) : (
                    mode === 'ideation' ? renderIdeationView() : renderReviewView()
                )}
             </div>
        </div>
    );
};

export default ExperimentDesignerPage;