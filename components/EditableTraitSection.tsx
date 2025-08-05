
import React, { useState, useRef, useEffect } from 'react';
import { Trait } from '../types';
import { InfoTooltip } from './InfoTooltip';
import { PlusCircleIcon, Trash2Icon, CheckIcon, XIcon } from './icons';

interface EditableTraitSectionProps {
    title: string;
    traits: Trait[];
    onTraitsChange: (newTraits: Trait[]) => void;
}

const EditableTraitSection: React.FC<EditableTraitSectionProps> = ({ title, traits, onTraitsChange }) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingLabel, setEditingLabel] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [newLabel, setNewLabel] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editingId && inputRef.current) {
            inputRef.current.focus();
        }
    }, [editingId]);

    useEffect(() => {
        if (isAdding && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isAdding]);


    const handleEdit = (trait: Trait) => {
        setEditingId(trait.id);
        setEditingLabel(trait.label);
    };

    const handleSaveEdit = () => {
        if (!editingId) return;
        onTraitsChange(traits.map(t => t.id === editingId ? { ...t, label: editingLabel } : t));
        setEditingId(null);
        setEditingLabel('');
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditingLabel('');
    };

    const handleDelete = (traitId: string) => {
        if (window.confirm('Are you sure you want to delete this trait?')) {
            onTraitsChange(traits.filter(t => t.id !== traitId));
        }
    };

    const handleAdd = () => {
        if (!newLabel.trim()) {
            setIsAdding(false);
            setNewLabel('');
            return;
        }
        const newTrait: Trait = {
            id: crypto.randomUUID(),
            label: newLabel.trim(),
            reasoning: 'Manually added by user.'
        };
        onTraitsChange([...traits, newTrait]);
        setIsAdding(false);
        setNewLabel('');
    };
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            if (editingId) handleSaveEdit();
            if (isAdding) handleAdd();
        }
        if (e.key === 'Escape') {
            if (editingId) handleCancelEdit();
            if (isAdding) setIsAdding(false);
        }
    };

    return (
        <div className="bg-brand-primary/50 p-3 rounded-lg border border-brand-accent/20 h-full flex flex-col">
            <div className="flex justify-between items-center mb-2">
                <h4 className="font-semibold text-brand-light">{title}</h4>
                <button
                    onClick={() => setIsAdding(true)}
                    className="p-1 text-brand-light hover:text-brand-blue"
                    aria-label={`Add new trait to ${title}`}
                >
                    <PlusCircleIcon className="h-5 w-5" />
                </button>
            </div>
            <div className="flex-grow flex flex-wrap gap-2 items-start content-start">
                {traits && traits.map(trait => (
                    <div key={trait.id} className="relative group">
                        {editingId === trait.id ? (
                            <div className="flex items-center space-x-1">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={editingLabel}
                                    onChange={e => setEditingLabel(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    onBlur={handleSaveEdit}
                                    className="bg-brand-secondary border border-brand-blue rounded-full px-2.5 py-1 text-sm font-medium w-32"
                                />
                                <button onClick={handleSaveEdit} className="p-1 text-green-400 hover:bg-green-400/20 rounded-full"><CheckIcon className="h-4 w-4"/></button>
                                <button onClick={handleCancelEdit} className="p-1 text-red-400 hover:bg-red-400/20 rounded-full"><XIcon className="h-4 w-4"/></button>
                            </div>
                        ) : (
                            <InfoTooltip content={<p className="text-sm">{trait.reasoning}</p>}>
                                <div onClick={() => handleEdit(trait)} className="bg-brand-accent/50 text-brand-blue px-2.5 py-1 rounded-full text-sm font-medium cursor-pointer">
                                    {trait.label}
                                </div>
                            </InfoTooltip>
                        )}
                        {editingId !== trait.id && (
                             <button
                                onClick={() => handleDelete(trait.id)}
                                className="absolute -top-2 -right-2 p-0.5 bg-brand-red text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                aria-label={`Delete trait ${trait.label}`}
                            >
                                <XIcon className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>
                ))}
                {isAdding && (
                     <div className="flex items-center space-x-1">
                        <input
                            ref={inputRef}
                            type="text"
                            value={newLabel}
                            onChange={e => setNewLabel(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onBlur={handleAdd}
                            placeholder="New trait..."
                            className="bg-brand-secondary border border-brand-blue rounded-full px-2.5 py-1 text-sm font-medium w-32"
                        />
                         <button onClick={handleAdd} className="p-1 text-green-400 hover:bg-green-400/20 rounded-full"><CheckIcon className="h-4 w-4"/></button>
                         <button onClick={() => setIsAdding(false)} className="p-1 text-red-400 hover:bg-red-400/20 rounded-full"><XIcon className="h-4 w-4"/></button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EditableTraitSection;
