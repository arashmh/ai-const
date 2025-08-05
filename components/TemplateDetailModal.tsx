import React, { useState, useEffect } from 'react';
import { DefaultTemplate, UserTemplate, CognitiveEthicalProfile, Trait, Leaning } from '../types';
import { generateTemplateIdentityFromProfile } from '../services/geminiService';
import { BotIcon, Wand2Icon } from './icons';
import { InfoTooltip } from './InfoTooltip';
import EditableTraitSection from './EditableTraitSection';
import EditableDescription from './EditableDescription';

interface TemplateDetailModalProps {
    template: DefaultTemplate | UserTemplate;
    allTemplateNames: string[];
    onClose: () => void;
    onUpdateTemplate: (updatedTemplate: UserTemplate) => void;
    onAddTemplate: (newTemplate: UserTemplate) => void;
}

const LeaningSlider: React.FC<{
  title: string; value: Leaning;
  leftLabel: string; rightLabel: string;
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

interface SaveOptionsModalProps {
    originalTemplate: DefaultTemplate | UserTemplate;
    editedProfile: CognitiveEthicalProfile;
    editedDescription: string;
    allTemplateNames: string[];
    onClose: () => void;
    onUpdate: (template: UserTemplate) => void;
    onAdd: (template: UserTemplate) => void;
    onDescriptionUpdate: (newDescription: string) => void;
}

const SaveOptionsModal: React.FC<SaveOptionsModalProps> = ({ originalTemplate, editedProfile, editedDescription, allTemplateNames, onClose, onUpdate, onAdd, onDescriptionUpdate }) => {
    
    const [newName, setNewName] = useState('');
    const [nameError, setNameError] = useState('');
    const [isSuggestingName, setIsSuggestingName] = useState(false);

    const isUserTemplate = 'id' in originalTemplate;

    useEffect(() => {
        if (allTemplateNames.includes(newName) && (!isUserTemplate || newName !== originalTemplate.name)) {
            setNameError('A template with this name already exists.');
        } else {
            setNameError('');
        }
    }, [newName, allTemplateNames, originalTemplate, isUserTemplate]);

    const handleSuggestName = async () => {
        setIsSuggestingName(true);
        setNameError('');
        try {
            const result = await generateTemplateIdentityFromProfile(editedProfile);
            setNewName(result.name);
            onDescriptionUpdate(result.description);
        } catch (error) {
            console.error("Failed to suggest name:", error);
            setNameError("AI suggestion failed. Please try again.");
        } finally {
            setIsSuggestingName(false);
        }
    };

    const handleSaveAsNew = () => {
        if (nameError || !newName.trim()) {
            return;
        }
        const newTemplate: UserTemplate = {
            id: `utmpl-${Date.now()}`,
            name: newName,
            description: editedDescription,
            profile: editedProfile,
        };
        onAdd(newTemplate);
    };

    const handleOverwrite = () => {
        if (!isUserTemplate) return;
        const updatedTemplate: UserTemplate = {
            ...(originalTemplate as UserTemplate),
            description: editedDescription,
            profile: editedProfile,
        };
        onUpdate(updatedTemplate);
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[80]" onClick={onClose}>
            <div className="bg-brand-primary p-6 rounded-lg shadow-2xl w-full max-w-md animate-fade-in" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold text-brand-text mb-4">Save Changes</h3>
                <div className="space-y-4">
                    {isUserTemplate && (
                        <button onClick={handleOverwrite} className="w-full bg-brand-action hover:bg-opacity-80 text-white font-bold py-3 px-4 rounded-lg">
                            Overwrite "{originalTemplate.name}"
                        </button>
                    )}
                    <div className="p-4 border border-brand-accent/50 rounded-lg">
                        <h4 className="font-semibold text-brand-light mb-2">Save as New Template</h4>
                        <div className="space-y-2">
                             <div>
                                <label className="block text-xs font-medium text-brand-light mb-1">New Template Name</label>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="text"
                                        value={newName}
                                        onChange={e => setNewName(e.target.value)}
                                        placeholder="Title of member template"
                                        className={`w-full bg-brand-secondary border ${nameError ? 'border-brand-red' : 'border-brand-accent'} rounded-lg p-2 text-brand-text focus:ring-2 focus:ring-brand-blue focus:outline-none`}
                                    />
                                    <button onClick={handleSuggestName} disabled={isSuggestingName} className="p-2 bg-brand-accent rounded-lg text-brand-blue hover:bg-brand-light hover:text-brand-primary disabled:opacity-50" aria-label="Suggest Name">
                                        {isSuggestingName ? <BotIcon className="h-5 w-5 animate-pulse-fast"/> : <Wand2Icon className="h-5 w-5" />}
                                    </button>
                                </div>
                                {isSuggestingName ? (
                                    <p className="text-xs text-brand-blue animate-pulse mt-1 pl-1">AI is generating a name and description...</p>
                                ) : (
                                    <p className="text-xs text-brand-light/70 mt-1 pl-1">
                                        Click the <Wand2Icon className="inline-block h-3 w-3 align-middle" /> icon for an AI-suggested name and updated description.
                                    </p>
                                )}
                                {nameError && <p className="text-xs text-brand-red mt-1">{nameError}</p>}
                            </div>
                            <button onClick={handleSaveAsNew} disabled={!!nameError || isSuggestingName || !newName.trim()} className="w-full bg-brand-blue hover:bg-opacity-90 text-brand-primary font-bold py-3 px-4 rounded-lg disabled:bg-brand-accent/50 disabled:cursor-not-allowed">
                                Save New
                            </button>
                        </div>
                    </div>
                </div>
                 <div className="mt-6 flex justify-end">
                    <button type="button" onClick={onClose} className="text-brand-light hover:text-white font-semibold">Cancel</button>
                </div>
            </div>
        </div>
    );
};


const TemplateDetailModal: React.FC<TemplateDetailModalProps> = ({ template, allTemplateNames, onClose, onUpdateTemplate, onAddTemplate }) => {
    const [editedProfile, setEditedProfile] = useState<CognitiveEthicalProfile>(template.profile);
    const [editedDescription, setEditedDescription] = useState(template.description);
    const [showSaveOptions, setShowSaveOptions] = useState(false);

    // Ensure all traits have IDs, for backwards compatibility with older stored templates
    useEffect(() => {
        const profileWithIds = { ...template.profile };
        let wasModified = false;
        Object.keys(profileWithIds).forEach(key => {
            const prop = profileWithIds[key as keyof CognitiveEthicalProfile];
            if (Array.isArray(prop) && prop.length > 0) {
                const traits = prop as Trait[];
                if (typeof traits[0]?.id === 'undefined') {
                    wasModified = true;
                    (profileWithIds[key as keyof CognitiveEthicalProfile] as Trait[]) = traits.map(trait => ({
                        ...trait,
                        id: crypto.randomUUID(),
                    }));
                }
            }
        });
        if (wasModified) {
            setEditedProfile(profileWithIds);
        }
    }, [template.profile]);

    const isPristine = JSON.stringify(template.profile) === JSON.stringify(editedProfile) && template.description === editedDescription;

    const handleTraitsChange = (sectionKey: keyof CognitiveEthicalProfile, newTraits: Trait[]) => {
        setEditedProfile(p => ({ ...p, [sectionKey]: newTraits }));
    };

    const updateLeaning = (key: keyof CognitiveEthicalProfile, value: number) => {
        setEditedProfile(p => ({ ...p, [key]: { ...(p[key] as Leaning), score: value } }));
    };

    const handleAddAndClose = (newTemplate: UserTemplate) => {
        onAddTemplate(newTemplate);
        onClose();
    };

    const handleUpdateAndClose = (updatedTemplate: UserTemplate) => {
        onUpdateTemplate(updatedTemplate);
        onClose();
    };

    return (
        <>
            {showSaveOptions && (
                <SaveOptionsModal
                    originalTemplate={template}
                    editedProfile={editedProfile}
                    editedDescription={editedDescription}
                    allTemplateNames={allTemplateNames}
                    onClose={() => setShowSaveOptions(false)}
                    onUpdate={handleUpdateAndClose}
                    onAdd={handleAddAndClose}
                    onDescriptionUpdate={setEditedDescription}
                />
            )}
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[70] p-4 animate-fade-in">
                <div className="bg-brand-secondary rounded-lg shadow-2xl w-full max-w-6xl transform transition-all flex flex-col max-h-[90vh]">
                    <div className="p-6 border-b border-brand-accent/50">
                        <h2 className="text-2xl font-bold text-brand-text mb-1">Template Details</h2>
                    </div>

                    <div className="flex-grow p-6 overflow-y-auto min-h-[400px]">
                       <div className="space-y-6 bg-brand-primary/30 p-4 rounded-lg border border-brand-accent/20">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-brand-light mb-1">Template Name</label>
                                    <div className="w-full bg-brand-primary border border-brand-accent rounded-lg p-2.5 text-brand-text">
                                        {template.name}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-brand-light mb-1">Character Description</label>
                                    <EditableDescription
                                        value={editedDescription}
                                        onChange={setEditedDescription}
                                        placeholder="A brief summary of this template's character."
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <EditableTraitSection title="Personality Traits" traits={editedProfile.personalityTraits} onTraitsChange={(traits) => handleTraitsChange('personalityTraits', traits)} />
                                <EditableTraitSection title="Value System" traits={editedProfile.valueSystem} onTraitsChange={(traits) => handleTraitsChange('valueSystem', traits)} />
                                <EditableTraitSection title="Political Inclination" traits={editedProfile.politicalInclination} onTraitsChange={(traits) => handleTraitsChange('politicalInclination', traits)} />
                                <EditableTraitSection title="Social Inclination" traits={editedProfile.socialInclination} onTraitsChange={(traits) => handleTraitsChange('socialInclination', traits)} />
                                <EditableTraitSection title="Moral Compass" traits={editedProfile.moralCompass} onTraitsChange={(traits) => handleTraitsChange('moralCompass', traits)} />
                                <EditableTraitSection title="Aspirations" traits={editedProfile.aspirations} onTraitsChange={(traits) => handleTraitsChange('aspirations', traits)} />
                                <EditableTraitSection title="Causes to Fight For" traits={editedProfile.causesToFightFor} onTraitsChange={(traits) => handleTraitsChange('causesToFightFor', traits)} />
                                <EditableTraitSection title="Causes to Fight Against" traits={editedProfile.causesToFightAgainst} onTraitsChange={(traits) => handleTraitsChange('causesToFightAgainst', traits)} />
                                <EditableTraitSection title="Strength Points" traits={editedProfile.strengthPoints} onTraitsChange={(traits) => handleTraitsChange('strengthPoints', traits)} />
                                <EditableTraitSection title="Weak Points" traits={editedProfile.weakPoints} onTraitsChange={(traits) => handleTraitsChange('weakPoints', traits)} />
                                <EditableTraitSection title="Grey Areas of Morality" traits={editedProfile.greyAreasOfMorality} onTraitsChange={(traits) => handleTraitsChange('greyAreasOfMorality', traits)} />
                            </div>

                            <div className="mt-6 pt-6 border-t border-brand-accent/30">
                                <h3 className="text-lg font-semibold text-brand-text mb-4 text-center">Dimensions</h3>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4 bg-brand-primary p-6 rounded-lg">
                                    <LeaningSlider title="Social" value={editedProfile.socialLeaning} onChange={v => updateLeaning('socialLeaning', v)} leftLabel="Collectivist" rightLabel="Individualist" />
                                    <LeaningSlider title="Political" value={editedProfile.politicalLeaning} onChange={v => updateLeaning('politicalLeaning', v)} leftLabel="Authoritarian" rightLabel="Libertarian" />
                                    <LeaningSlider title="Moral" value={editedProfile.moralLeaning} onChange={v => updateLeaning('moralLeaning', v)} leftLabel="Utilitarian" rightLabel="Deontological" />
                                    <LeaningSlider title="Openness" value={editedProfile.opennessLeaning} onChange={v => updateLeaning('opennessLeaning', v)} leftLabel="Traditional" rightLabel="Progressive" />
                                    <LeaningSlider title="Risk Tolerance" value={editedProfile.riskToleranceLeaning} onChange={v => updateLeaning('riskToleranceLeaning', v)} leftLabel="Risk-Averse" rightLabel="Risk-Seeking" />
                                    <LeaningSlider title="Thinking Style" value={editedProfile.thinkingStyleLeaning} onChange={v => updateLeaning('thinkingStyleLeaning', v)} leftLabel="Analytical" rightLabel="Intuitive" />
                                    <LeaningSlider title="Time Orientation" value={editedProfile.timeOrientationLeaning} onChange={v => updateLeaning('timeOrientationLeaning', v)} leftLabel="Present" rightLabel="Future" />
                                    <LeaningSlider title="Communication" value={editedProfile.communicationLeaning} onChange={v => updateLeaning('communicationLeaning', v)} leftLabel="Direct" rightLabel="Indirect" />
                                    <LeaningSlider title="Decision Making" value={editedProfile.decisionMakingLeaning} onChange={v => updateLeaning('decisionMakingLeaning', v)} leftLabel="Emotional" rightLabel="Logical" />
                                    <LeaningSlider title="Change Preference" value={editedProfile.changePreferenceLeaning} onChange={v => updateLeaning('changePreferenceLeaning', v)} leftLabel="Stability" rightLabel="Change" />
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="p-4 bg-brand-primary/50 mt-auto flex justify-between items-center border-t border-brand-accent/50">
                        <button type="button" onClick={onClose} className="text-brand-light hover:text-white font-semibold">Cancel</button>
                        <button
                            type="button" onClick={() => setShowSaveOptions(true)}
                            disabled={isPristine}
                            className="bg-brand-blue text-brand-primary font-bold py-2.5 px-6 rounded-lg transition-colors shadow-md hover:shadow-lg hover:bg-opacity-90 disabled:bg-brand-accent/50 disabled:text-brand-light/70 disabled:cursor-not-allowed"
                        >
                            Save Changes...
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default TemplateDetailModal;