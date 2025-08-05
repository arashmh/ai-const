import React, { useState, useRef } from 'react';
import { UserTemplate, CognitiveEthicalProfile, Trait, Leaning } from '../types';
import { generateTemplateFromSource } from '../services/geminiService';
import { BotIcon, Wand2Icon, FileTextIcon, UploadCloudIcon, GlobeIcon, EditIcon } from './icons';
import { InfoTooltip } from './InfoTooltip';
import EditableTraitSection from './EditableTraitSection';
import EditableDescription from './EditableDescription';

interface DefineTemplateModalProps {
    onClose: () => void;
    onSave: (template: UserTemplate) => void;
}

const LeaningSlider: React.FC<{
  title: string; value: Leaning; leftLabel: string; rightLabel: string;
  onChange: (value: number) => void;
}> = ({ title, value, leftLabel, rightLabel, onChange }) => (
  <InfoTooltip content={value.reasoning}>
      <div>
        <h4 className="text-sm font-semibold text-brand-light mb-1.5">{title}</h4>
        <div className="flex items-center space-x-2 text-xs text-brand-light/80">
          <span className="w-1/4 text-left truncate" title={leftLabel}>{leftLabel}</span>
          <input
            type="range" min="0" max="100" value={value.score}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full h-2 bg-brand-primary rounded-lg appearance-none cursor-pointer"
          />
          <span className="w-1/4 text-right truncate" title={rightLabel}>{rightLabel}</span>
        </div>
      </div>
  </InfoTooltip>
);

const DefineTemplateModal: React.FC<DefineTemplateModalProps> = ({ onClose, onSave }) => {
    const [mode, setMode] = useState<'define' | 'review'>('define');
    const [activeTab, setActiveTab] = useState<'text' | 'file' | 'url'>('text');
    const [isLoading, setIsLoading] = useState(false);
    
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [textPrompt, setTextPrompt] = useState('A radical environmentalist who is skeptical of technology and prioritizes long-term ecological stability over economic growth.');
    const [fileContent, setFileContent] = useState('');
    const [fileName, setFileName] = useState('');
    const [url, setUrl] = useState('');
    const [profile, setProfile] = useState<CognitiveEthicalProfile | null>(null);
    
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.size > 100000) { // 100kb limit
                setError('File is too large. Please use a file under 100KB.');
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                setFileContent(e.target?.result as string);
                setFileName(file.name);
                setError('');
            };
            reader.readAsText(file);
        }
    };
    
    const handleGenerate = async () => {
        let source: { type: 'text' | 'file' | 'url', content: string } | null = null;
        if (activeTab === 'text' && textPrompt) source = { type: 'text', content: textPrompt };
        if (activeTab === 'file' && fileContent) source = { type: 'file', content: fileContent };
        if (activeTab === 'url' && url) source = { type: 'url', content: url };

        if (!source) {
            setError('Please provide content for the selected source (Text, File, or URL).');
            return;
        }
        
        setError('');
        setIsLoading(true);
        setProfile(null);
        try {
            const templateData = await generateTemplateFromSource(source);

            // Add unique IDs to all traits
            const profileWithIds = { ...templateData.profile };
            Object.keys(profileWithIds).forEach(key => {
                if (Array.isArray(profileWithIds[key as keyof CognitiveEthicalProfile])) {
                    (profileWithIds[key as keyof CognitiveEthicalProfile] as Trait[]) = 
                        (profileWithIds[key as keyof CognitiveEthicalProfile] as Trait[]).map(trait => ({
                            ...trait,
                            id: crypto.randomUUID(),
                        }));
                }
            });

            setName(templateData.name);
            setDescription(templateData.description);
            setProfile(profileWithIds);
            setMode('review');
        } catch (e) {
            console.error(e);
            setError('Failed to generate template from source. Please try different content or check the console for errors.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = () => {
        if (!name || !description || !profile) {
            setError('Name, Description, and Profile must be set before saving.');
            return;
        }
        const newTemplate: UserTemplate = {
            id: `utmpl-${Date.now()}`,
            name, description, profile,
        };
        onSave(newTemplate);
        onClose();
    };

    const handleTraitsChange = (sectionKey: keyof CognitiveEthicalProfile, newTraits: Trait[]) => {
        if (profile) {
            setProfile(p => ({ ...p!, [sectionKey]: newTraits }));
        }
    };

    const updateLeaning = (key: keyof CognitiveEthicalProfile, value: number) => {
        if (profile) {
            setProfile(p => ({ ...p!, [key]: { ...(p![key] as Leaning), score: value } }));
        }
    };

    const renderTabs = () => (
        <div className="flex border-b border-brand-accent mb-4">
            <TabButton icon={<FileTextIcon/>} label="From Text" isActive={activeTab === 'text'} onClick={() => setActiveTab('text')} />
            <TabButton icon={<UploadCloudIcon/>} label="From File" isActive={activeTab === 'file'} onClick={() => setActiveTab('file')} />
            <TabButton icon={<GlobeIcon/>} label="From URL" isActive={activeTab === 'url'} onClick={() => setActiveTab('url')} />
        </div>
    );

    const renderDefineContent = () => {
        switch (activeTab) {
            case 'text': return (
                <div>
                    <label className="block text-sm font-medium text-brand-light mb-1">Describe the Template</label>
                    <p className="text-xs text-brand-light mb-2">Write a description, and the AI will generate the name, summary, and personality dimensions.</p>
                    <textarea value={textPrompt} onChange={e => setTextPrompt(e.target.value)} rows={8} className="w-full bg-brand-primary border border-brand-accent rounded-lg p-3 text-brand-text focus:ring-2 focus:ring-brand-blue focus:outline-none" />
                </div>
            );
            case 'file': return (
                <div>
                    <label className="block text-sm font-medium text-brand-light mb-1">Upload a Document</label>
                    <p className="text-xs text-brand-light mb-2">Upload a .txt or .md file. The AI will analyze its content.</p>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".txt,.md" className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()} className="w-full h-32 border-2 border-dashed border-brand-accent rounded-lg flex flex-col items-center justify-center text-brand-light hover:bg-brand-accent/50 hover:border-brand-blue transition-colors">
                        <UploadCloudIcon className="h-8 w-8 mb-2" />
                        <span>{fileName || 'Click to select a file'}</span>
                        <span className="text-xs mt-1">(Max 100KB)</span>
                    </button>
                </div>
            );
            case 'url': return (
                <div>
                    <label className="block text-sm font-medium text-brand-light mb-1">Analyze a Webpage</label>
                    <p className="text-xs text-brand-light mb-2">Provide a URL. The AI will attempt to analyze the page content.</p>
                    <input type="url" value={url} onChange={e => setUrl(e.target.value)} className="w-full bg-brand-primary border border-brand-accent rounded-lg p-3 text-brand-text focus:ring-2 focus:ring-brand-blue focus:outline-none" placeholder="https://example.com/some-article" />
                    <p className="text-xs text-brand-accent mt-2">Note: This may not work for all websites due to access restrictions.</p>
                </div>
            );
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60] p-4 animate-fade-in">
            <div className="bg-brand-secondary rounded-lg shadow-2xl w-full max-w-6xl transform transition-all flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-brand-accent/50">
                    <h2 className="text-2xl font-bold text-brand-text mb-1">Template Design Studio</h2>
                    <p className="text-brand-light">Create a reusable member template for your societies.</p>
                </div>

                {isLoading ? (
                    <div className="flex-grow flex flex-col items-center justify-center p-8">
                        <BotIcon className="h-16 w-16 text-brand-blue animate-pulse-fast" />
                        <p className="text-xl mt-4 text-brand-text">AI is crafting your template...</p>
                    </div>
                ) : (
                    <div className="flex-grow p-6 overflow-y-auto">
                        {error && <p className="text-brand-red bg-red-900/50 p-3 rounded-lg mb-4 text-center">{error}</p>}
                        
                        {mode === 'define' && (
                            <div className="max-w-3xl mx-auto">
                                {renderTabs()}
                                {renderDefineContent()}
                                <button onClick={handleGenerate} className="mt-6 w-full bg-brand-action hover:bg-opacity-80 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center">
                                    <Wand2Icon className="h-5 w-5 mr-2" /> Generate with AI
                                </button>
                            </div>
                        )}
                        
                        {mode === 'review' && profile && (
                            <div className="space-y-6">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="text-2xl font-semibold text-brand-text">Review & Fine-Tune</h3>
                                     <button onClick={() => setMode('define')} className="flex items-center text-sm bg-brand-accent text-brand-blue font-semibold py-2 px-4 rounded-lg hover:bg-brand-light hover:text-brand-primary transition-colors">
                                        <EditIcon className="h-4 w-4 mr-1.5" /> Go Back & Regenerate
                                    </button>
                                </div>
                                <div className="space-y-6 bg-brand-primary/30 p-4 rounded-lg border border-brand-accent/20">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-brand-light mb-1">Template Name</label>
                                            <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-brand-primary border border-brand-accent rounded-lg p-2.5 text-brand-text focus:ring-2 focus:ring-brand-blue focus:outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-brand-light mb-1">Character Description</label>
                                            <EditableDescription
                                                value={description}
                                                onChange={setDescription}
                                                placeholder="A brief summary of this template's character."
                                            />
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <EditableTraitSection title="Personality Traits" traits={profile.personalityTraits} onTraitsChange={(traits) => handleTraitsChange('personalityTraits', traits)} />
                                        <EditableTraitSection title="Value System" traits={profile.valueSystem} onTraitsChange={(traits) => handleTraitsChange('valueSystem', traits)} />
                                        <EditableTraitSection title="Political Inclination" traits={profile.politicalInclination} onTraitsChange={(traits) => handleTraitsChange('politicalInclination', traits)} />
                                        <EditableTraitSection title="Social Inclination" traits={profile.socialInclination} onTraitsChange={(traits) => handleTraitsChange('socialInclination', traits)} />
                                        <EditableTraitSection title="Moral Compass" traits={profile.moralCompass} onTraitsChange={(traits) => handleTraitsChange('moralCompass', traits)} />
                                        <EditableTraitSection title="Aspirations" traits={profile.aspirations} onTraitsChange={(traits) => handleTraitsChange('aspirations', traits)} />
                                        <EditableTraitSection title="Causes to Fight For" traits={profile.causesToFightFor} onTraitsChange={(traits) => handleTraitsChange('causesToFightFor', traits)} />
                                        <EditableTraitSection title="Causes to Fight Against" traits={profile.causesToFightAgainst} onTraitsChange={(traits) => handleTraitsChange('causesToFightAgainst', traits)} />
                                        <EditableTraitSection title="Strength Points" traits={profile.strengthPoints} onTraitsChange={(traits) => handleTraitsChange('strengthPoints', traits)} />
                                        <EditableTraitSection title="Weak Points" traits={profile.weakPoints} onTraitsChange={(traits) => handleTraitsChange('weakPoints', traits)} />
                                        <EditableTraitSection title="Grey Areas of Morality" traits={profile.greyAreasOfMorality} onTraitsChange={(traits) => handleTraitsChange('greyAreasOfMorality', traits)} />
                                    </div>
                                    
                                    <div className="mt-6 pt-6 border-t border-brand-accent/30">
                                        <h3 className="text-lg font-semibold text-brand-text mb-4 text-center">Dimensions</h3>
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4 bg-brand-primary p-6 rounded-lg">
                                            <LeaningSlider title="Social" value={profile.socialLeaning} onChange={v => updateLeaning('socialLeaning', v)} leftLabel="Collectivist" rightLabel="Individualist" />
                                            <LeaningSlider title="Political" value={profile.politicalLeaning} onChange={v => updateLeaning('politicalLeaning', v)} leftLabel="Authoritarian" rightLabel="Libertarian" />
                                            <LeaningSlider title="Moral" value={profile.moralLeaning} onChange={v => updateLeaning('moralLeaning', v)} leftLabel="Utilitarian" rightLabel="Deontological" />
                                            <LeaningSlider title="Openness" value={profile.opennessLeaning} onChange={v => updateLeaning('opennessLeaning', v)} leftLabel="Traditional" rightLabel="Progressive" />
                                            <LeaningSlider title="Risk Tolerance" value={profile.riskToleranceLeaning} onChange={v => updateLeaning('riskToleranceLeaning', v)} leftLabel="Risk-Averse" rightLabel="Risk-Seeking" />
                                            <LeaningSlider title="Thinking Style" value={profile.thinkingStyleLeaning} onChange={v => updateLeaning('thinkingStyleLeaning', v)} leftLabel="Analytical" rightLabel="Intuitive" />
                                            <LeaningSlider title="Time Orientation" value={profile.timeOrientationLeaning} onChange={v => updateLeaning('timeOrientationLeaning', v)} leftLabel="Present" rightLabel="Future" />
                                            <LeaningSlider title="Communication" value={profile.communicationLeaning} onChange={v => updateLeaning('communicationLeaning', v)} leftLabel="Direct" rightLabel="Indirect" />
                                            <LeaningSlider title="Decision Making" value={profile.decisionMakingLeaning} onChange={v => updateLeaning('decisionMakingLeaning', v)} leftLabel="Emotional" rightLabel="Logical" />
                                            <LeaningSlider title="Change Preference" value={profile.changePreferenceLeaning} onChange={v => updateLeaning('changePreferenceLeaning', v)} leftLabel="Stability" rightLabel="Change" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className="p-4 bg-brand-primary/50 mt-auto flex justify-between items-center border-t border-brand-accent/50">
                    <button type="button" onClick={onClose} className="text-brand-light hover:text-white font-semibold">Cancel</button>
                    <button
                        type="button" onClick={handleSave}
                        disabled={mode !== 'review' || isLoading}
                        className="bg-brand-blue text-brand-primary font-bold py-2.5 px-6 rounded-lg transition-colors shadow-md hover:shadow-lg hover:bg-opacity-90 disabled:bg-brand-accent/50 disabled:text-brand-light/70 disabled:cursor-not-allowed"
                    >
                        Save Template
                    </button>
                </div>
            </div>
        </div>
    );
};

const TabButton: React.FC<{label: string, icon: React.ReactNode, isActive: boolean, onClick: () => void}> = ({ label, icon, isActive, onClick }) => (
    <button onClick={onClick} className={`flex items-center space-x-2 py-2 px-4 text-sm font-semibold border-b-2 transition-colors ${
        isActive ? 'border-brand-blue text-brand-blue' : 'border-transparent text-brand-light hover:text-brand-text'
    }`}>
        {icon}
        <span>{label}</span>
    </button>
);

export default DefineTemplateModal;