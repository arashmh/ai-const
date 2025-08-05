
import React, { useState, useRef, useEffect } from 'react';

interface EditableDescriptionProps {
    value: string;
    onChange: (newValue: string) => void;
    placeholder?: string;
}

const EditableDescription: React.FC<EditableDescriptionProps> = ({ value, onChange, placeholder = "Click to edit description..." }) => {
    const [isEditing, setIsEditing] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const adjustHeight = (element: HTMLTextAreaElement) => {
        element.style.height = 'auto';
        element.style.height = `${element.scrollHeight}px`;
    }

    useEffect(() => {
        if (isEditing && textareaRef.current) {
            textareaRef.current.focus();
            adjustHeight(textareaRef.current);
        }
    }, [isEditing, value]);

    const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange(e.target.value);
        if (textareaRef.current) {
            adjustHeight(textareaRef.current);
        }
    };

    const handleBlur = () => {
        setIsEditing(false);
    };

    const handleClick = () => {
        setIsEditing(true);
    };

    if (isEditing) {
        return (
            <textarea
                ref={textareaRef}
                value={value}
                onChange={handleTextareaChange}
                onBlur={handleBlur}
                className="w-full bg-brand-primary border border-brand-accent rounded-lg p-3 text-brand-text focus:ring-2 focus:ring-brand-blue focus:outline-none resize-none overflow-hidden"
                placeholder={placeholder}
            />
        );
    }

    return (
        <div
            onClick={handleClick}
            className="w-full bg-brand-primary border border-transparent hover:border-brand-accent/50 rounded-lg p-3 text-brand-text min-h-[6.5rem] cursor-pointer transition-colors"
            style={{ whiteSpace: 'pre-wrap' }} // To respect newlines
        >
            {value?.trim() ? value : <span className="text-brand-light italic">{placeholder}</span>}
        </div>
    );
};

export default EditableDescription;
