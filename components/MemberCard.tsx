import React, { useState } from 'react';
import { Member } from '../types';
import { Trash2Icon, ChevronDownIcon } from './icons';

interface MemberCardProps {
  member: Member;
  onRemove?: (memberId: string) => void;
}

const LeaningBar: React.FC<{
  title: string;
  value: number;
  leftLabel: string;
  rightLabel: string;
  colorClass: string;
}> = ({ title, value, leftLabel, rightLabel, colorClass }) => (
  <div>
    <h4 className="text-sm font-semibold text-brand-light mb-1.5">{title}</h4>
    <div className="flex items-center space-x-2 text-xs text-brand-light/80">
      <span className="w-1/4 text-left truncate" title={leftLabel}>{leftLabel}</span>
      <div className="w-1/2 bg-brand-primary rounded-full h-2">
        <div className={`${colorClass} h-2 rounded-full`} style={{ width: `${value}%` }}></div>
      </div>
      <span className="w-1/4 text-right truncate" title={rightLabel}>{rightLabel}</span>
    </div>
  </div>
);

const MemberCard: React.FC<MemberCardProps> = ({ member, onRemove }) => {
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
  const [isDimensionsOpen, setIsDimensionsOpen] = useState(false);

  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent any card-level click events
    if (onRemove) {
        onRemove(member.id);
    }
  };

  return (
    <div className="relative bg-brand-secondary p-4 rounded-lg shadow-lg border border-brand-accent/50 group flex flex-col">
      {onRemove && (
        <button
            onClick={handleRemoveClick}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-brand-accent/50 text-brand-light hover:bg-brand-red hover:text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
            aria-label={`Remove ${member.name}`}
        >
            <Trash2Icon className="h-4 w-4" />
        </button>
      )}

      {/* Static Header */}
      <div className="flex flex-col items-center text-center mb-3">
        <img src={member.avatar} alt={`${member.name}'s avatar`} className="h-20 w-20 rounded-full border-2 border-brand-blue mb-3" />
        <h3 className="text-xl font-bold text-brand-text">{member.name}</h3>
        <blockquote className="text-sm text-brand-light italic mt-1 px-2">
          "{member.profile.worldview}"
        </blockquote>
      </div>

       {/* New Demographics Section */}
      <div className="text-xs text-brand-light flex justify-center items-center space-x-3 mb-3 py-1 bg-brand-primary/50 rounded-full">
        <span className="font-semibold">Age: {member.age}</span>
        <span className="border-r border-brand-accent h-3"></span>
        <span>{member.gender}</span>
        <span className="border-r border-brand-accent h-3"></span>
        <span className="truncate" title={member.expertise}>{member.expertise}</span>
      </div>

      {/* Collapsible Description */}
      <div className="text-center my-2">
        <button
          onClick={() => setIsDescriptionOpen(!isDescriptionOpen)}
          className="text-xs text-brand-light hover:text-brand-text inline-flex items-center space-x-1 py-1 px-3 bg-brand-accent/50 hover:bg-brand-accent rounded-full transition-colors"
          aria-expanded={isDescriptionOpen}
          aria-controls={`description-${member.id}`}
        >
          <span>Description</span>
          <ChevronDownIcon className={`h-4 w-4 transition-transform duration-300 ${isDescriptionOpen ? 'rotate-180' : ''}`} />
        </button>

        <div 
          id={`description-${member.id}`}
          className={`transition-all duration-300 ease-in-out overflow-hidden ${isDescriptionOpen ? 'max-h-40' : 'max-h-0'}`}
        >
          <p className="text-sm text-brand-light pt-2">
            {member.profile.decisionMakingMatrix}
          </p>
        </div>
      </div>
      
      {/* Collapsible Dimensions */}
      <div className="mt-auto pt-4 border-t border-brand-accent/30">
        <div className="text-center mb-2">
            <button
                onClick={() => setIsDimensionsOpen(!isDimensionsOpen)}
                className="text-xs text-brand-light hover:text-brand-text inline-flex items-center space-x-1 py-1 px-3 bg-brand-accent/50 hover:bg-brand-accent rounded-full transition-colors"
                aria-expanded={isDimensionsOpen}
                aria-controls={`dimensions-${member.id}`}
            >
                <span>Dimensions</span>
                <ChevronDownIcon className={`h-4 w-4 transition-transform duration-300 ${isDimensionsOpen ? 'rotate-180' : ''}`} />
            </button>
        </div>
        <div
            id={`dimensions-${member.id}`}
            className={`transition-all duration-300 ease-in-out overflow-hidden ${isDimensionsOpen ? 'max-h-[500px]' : 'max-h-0'}`}
        >
            <div className="space-y-3 pt-2">
                <LeaningBar 
                title="Social Leaning" 
                value={member.profile.socialLeaning.score} 
                leftLabel="Collectivist" 
                rightLabel="Individualist" 
                colorClass="bg-green-500"
                />
                <LeaningBar 
                title="Political Leaning" 
                value={member.profile.politicalLeaning.score} 
                leftLabel="Authoritarian" 
                rightLabel="Libertarian" 
                colorClass="bg-red-500"
                />
                <LeaningBar 
                title="Moral Leaning" 
                value={member.profile.moralLeaning.score} 
                leftLabel="Utilitarian" 
                rightLabel="Deontological" 
                colorClass="bg-purple-500"
                />
                <LeaningBar 
                title="Openness" 
                value={member.profile.opennessLeaning.score} 
                leftLabel="Traditional" 
                rightLabel="Progressive" 
                colorClass="bg-yellow-500"
                />
                <LeaningBar 
                title="Risk Tolerance" 
                value={member.profile.riskToleranceLeaning.score} 
                leftLabel="Risk-Averse" 
                rightLabel="Risk-Seeking" 
                colorClass="bg-orange-500"
                />
                <LeaningBar 
                title="Thinking Style" 
                value={member.profile.thinkingStyleLeaning.score} 
                leftLabel="Analytical" 
                rightLabel="Intuitive" 
                colorClass="bg-teal-500"
                />
                <LeaningBar 
                title="Time Orientation" 
                value={member.profile.timeOrientationLeaning.score} 
                leftLabel="Present-Focused" 
                rightLabel="Future-Focused" 
                colorClass="bg-cyan-500"
                />
                <LeaningBar 
                title="Communication" 
                value={member.profile.communicationLeaning.score} 
                leftLabel="Direct" 
                rightLabel="Indirect" 
                colorClass="bg-indigo-500"
                />
                <LeaningBar 
                title="Decision Making" 
                value={member.profile.decisionMakingLeaning.score} 
                leftLabel="Emotional" 
                rightLabel="Logical" 
                colorClass="bg-rose-500"
                />
                <LeaningBar 
                title="Change Preference" 
                value={member.profile.changePreferenceLeaning.score} 
                leftLabel="Stability" 
                rightLabel="Change" 
                colorClass="bg-lime-500"
                />
            </div>
        </div>
      </div>
    </div>
  );
};

export default MemberCard;