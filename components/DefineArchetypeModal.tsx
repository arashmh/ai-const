


import React, { useState } from 'react';
import { CognitiveEthicalProfile, UserTemplate, Leaning } from '../types';
import { generateTemplateFromSource } from '../services/geminiService';
import { BotIcon, Wand2Icon } from './icons';

interface DefineArchetypeModalProps {
    onClose: () => void;
    onSave: (archetype: UserTemplate) => void;
}

const initialProfile: CognitiveEthicalProfile = {
    worldview: '', interpretivePhilosophy: 'Pragmatism', socialPriorities: [], economicPriorities: [],
    decisionMakingMatrix: '', logicalReasoningPattern: '',
    socialLeaning: { score: 50, reasoning: "" },
    politicalLeaning: { score: 50, reasoning: "" },
    moralLeaning: { score: 50, reasoning: "" },
    opennessLeaning: { score: 50, reasoning: "" },
    riskToleranceLeaning: { score: 50, reasoning: "" },
    thinkingStyleLeaning: { score: 50, reasoning: "" },
    timeOrientationLeaning: { score: 50, reasoning: "" },
    communicationLeaning: { score: 50, reasoning: "" },
    decisionMakingLeaning: { score: 50, reasoning: "" },
    changePreferenceLeaning: { score: 50, reasoning: "" },
    personalityTraits: [],
    valueSystem: [],
    politicalInclination: [],
    socialInclination: [],
    moralCompass: [],
    aspirations: [],
    causesToFightFor: [],
    causesToFightAgainst: [],
    greyAreasOfMorality: [],
    weakPoints: [],
    strengthPoints: [],
};

const LeaningSlider: React.FC<{
  title: string;
  value: number;
  leftLabel: string;
  rightLabel: string;
  onChange: (value: number) => void;
}> = ({ title, value, leftLabel, rightLabel, onChange }) => (
  <div>
    <h4 className="text-sm font-semibold text-brand-light mb-1.5">{title}</h4>
    <div className="flex items-center space-x-2 text-xs text-brand-light/80">
      <span className="w-1/4 text-left truncate" title={leftLabel}>{leftLabel}</span>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-1/2"
      />
      <span className="w-1/4 text-right truncate" title={rightLabel}>{rightLabel}</span>
    </div>
  </div>
);

const DefineArchetypeModal: React.FC<DefineArchetypeModalProps> = ({ onClose, onSave }) => {
    const [mode, setMode] = useState<'generate' | 'review'>('generate');
    const [isLoading, setIsLoading] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [textPrompt, setTextPrompt] = useState('');
    const [profile, setProfile] = useState<CognitiveEthicalProfile>(initialProfile);
    const [error, setError] = useState('');

    const handleGenerate = async () => {
        if (!textPrompt) {
            setError('Please describe the archetype to generate its profile.');
            return;
        }
        setError('');
        setIsLoading(true);
        try {
            const templateData = await generateTemplateFromSource({ type: 'text', content: textPrompt });
            setProfile(templateData.profile);
            setName(templateData.name);
            setDescription(templateData.description);
            setMode('review');
        } catch (e) {
            console.error(e);
            setError('Failed to generate profile from text. Please try a different prompt.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = () => {
        if (!name || !description) {
             setError('Name and Description cannot be empty.');
            return;
        }
        const newArchetype: UserTemplate = {
            id: `utmpl-${Date.now()}`,
            name,
            description,
            profile,
        };
        onSave(newArchetype);
        onClose();
    };

    const updateLeaning = (key: keyof CognitiveEthicalProfile, value: number) => {
        setProfile(p => {
            const currentLeaning = p[key] as Leaning;
            const updatedLeaning = { ...currentLeaning, score: value };
            return { ...p, [key]: updatedLeaning };
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60] p-4 animate-fade-in">
            <div className="bg-brand-secondary rounded-lg shadow-2xl w-full max-w-4xl transform transition-all flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-brand-accent/50">
                    <h2 className="text-2xl font-bold text-brand-text mb-1">Archetype Design Studio</h2>
                    <p className="text-brand-light">Create a reusable member template for your societies.</p>
                </div>

                {isLoading ? (
                    <div className="flex-grow flex flex-col items-center justify-center p-8">
                        <BotIcon className="h-16 w-16 text-brand-blue animate-pulse-fast" />
                        <p className="text-xl mt-4 text-brand-text">AI is crafting your archetype...</p>
                    </div>
                ) : (
                    <div className="flex-grow p-8 overflow-y-auto">
                        {error && <p className="text-brand-red bg-red-900/50 p-3 rounded-lg mb-4 text-center">{error}</p>}
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-brand-light mb-1">Archetype Name</label>
                                <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-brand-primary border border-brand-accent rounded-lg p-2 text-brand-text focus:ring-2 focus:ring-brand-blue focus:outline-none" placeholder="e.g., Cautious Technocrat" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-brand-light mb-1">One-Line Description</label>
                                <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-brand-primary border border-brand-accent rounded-lg p-2 text-brand-text focus:ring-2 focus:ring-brand-blue focus:outline-none" placeholder="A brief summary of this archetype." />
                            </div>
                        </div>

                        {mode === 'generate' && (
                             <div>
                                <label className="block text-sm font-medium text-brand-light mb-1">Describe the Archetype</label>
                                <p className="text-xs text-brand-light mb-2">Write a description and the AI will generate the personality dimensions.</p>
                                <textarea
                                    value={textPrompt}
                                    onChange={e => setTextPrompt(e.target.value)}
                                    rows={6}
                                    className="w-full bg-brand-primary border border-brand-accent rounded-lg p-3 text-brand-text focus:ring-2 focus:ring-brand-blue focus:outline-none"
                                    placeholder="e.g., A radical environmentalist who is skeptical of technology and prioritizes long-term ecological stability over economic growth. They are willing to accept authoritarian measures to protect the planet."
                                />
                                <button onClick={handleGenerate} className="mt-4 w-full bg-brand-action hover:bg-opacity-80 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center">
                                    <Wand2Icon className="h-5 w-5 mr-2" /> Generate with AI
                                </button>
                            </div>
                        )}

                        {mode === 'review' && (
                            <div>
                                <h3 className="text-lg font-semibold text-brand-text mb-4 text-center">Review & Fine-Tune Dimensions</h3>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4 bg-brand-primary/50 p-6 rounded-lg">
                                    <LeaningSlider title="Social" value={profile.socialLeaning.score} onChange={v => updateLeaning('socialLeaning', v)} leftLabel="Collectivist" rightLabel="Individualist" />
                                    <LeaningSlider title="Political" value={profile.politicalLeaning.score} onChange={v => updateLeaning('politicalLeaning', v)} leftLabel="Authoritarian" rightLabel="Libertarian" />
                                    <LeaningSlider title="Moral" value={profile.moralLeaning.score} onChange={v => updateLeaning('moralLeaning', v)} leftLabel="Utilitarian" rightLabel="Deontological" />
                                    <LeaningSlider title="Openness" value={profile.opennessLeaning.score} onChange={v => updateLeaning('opennessLeaning', v)} leftLabel="Traditional" rightLabel="Progressive" />
                                    <LeaningSlider title="Risk Tolerance" value={profile.riskToleranceLeaning.score} onChange={v => updateLeaning('riskToleranceLeaning', v)} leftLabel="Risk-Averse" rightLabel="Risk-Seeking" />
                                    <LeaningSlider title="Thinking Style" value={profile.thinkingStyleLeaning.score} onChange={v => updateLeaning('thinkingStyleLeaning', v)} leftLabel="Analytical" rightLabel="Intuitive" />
                                    <LeaningSlider title="Time Orientation" value={profile.timeOrientationLeaning.score} onChange={v => updateLeaning('timeOrientationLeaning', v)} leftLabel="Present" rightLabel="Future" />
                                    <LeaningSlider title="Communication" value={profile.communicationLeaning.score} onChange={v => updateLeaning('communicationLeaning', v)} leftLabel="Direct" rightLabel="Indirect" />
                                    <LeaningSlider title="Decision Making" value={profile.decisionMakingLeaning.score} onChange={v => updateLeaning('decisionMakingLeaning', v)} leftLabel="Emotional" rightLabel="Logical" />
                                    <LeaningSlider title="Change Preference" value={profile.changePreferenceLeaning.score} onChange={v => updateLeaning('changePreferenceLeaning', v)} leftLabel="Stability" rightLabel="Change" />
                                </div>
                            </div>
                        )}
                    </div>
                )}


                <div className="p-6 bg-brand-primary/50 mt-auto flex justify-between items-center">
                    <button type="button" onClick={onClose} className="text-brand-light hover:text-white font-semibold">Cancel</button>
                    {mode === 'review' &&
                        <button onClick={() => setMode('generate')} className="bg-brand-accent hover:bg-opacity-80 text-white font-bold py-2 px-4 rounded-lg">
                            Regenerate
                        </button>
                    }
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={mode !== 'review'}
                        className="bg-brand-blue text-brand-primary font-bold py-3 px-6 text-base rounded-lg transition-colors shadow-md hover:shadow-lg hover:bg-opacity-90 disabled:bg-brand-accent/50 disabled:text-brand-light/70 disabled:cursor-not-allowed"
                    >
                        Save Archetype
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DefineArchetypeModal;