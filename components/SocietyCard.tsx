
import React, { useMemo } from 'react';
import { Society, Experiment } from '../types';
import { UsersIcon, Trash2Icon, GavelIcon, ArrowRightIcon } from './icons';

interface SocietyCardProps {
  society: Society;
  experiments: Experiment[];
  onSelect: () => void;
  onDelete: () => void;
  onSelectExperiment: (experimentId: string) => void;
}

const TemplateBar: React.FC<{ name: string; count: number; total: number; color: string }> = ({ name, count, total, color }) => {
    const percentage = total > 0 ? (count / total) * 100 : 0;
    return (
        <div className="flex items-center justify-between text-xs">
            <span className="text-brand-light w-2/5 truncate">{name}</span>
            <div className="w-3/5 bg-brand-primary rounded-full h-2.5">
                <div className={`${color} h-2.5 rounded-full`} style={{ width: `${percentage}%` }}></div>
            </div>
        </div>
    );
};


const SocietyCard: React.FC<SocietyCardProps> = ({ society, experiments, onSelect, onDelete, onSelectExperiment }) => {
  
  const composition = useMemo(() => {
    const counts: Record<string, number> = {};

    society.members.forEach(member => {
      const template = member.profile.templateName || 'Custom';
      counts[template] = (counts[template] || 0) + 1;
    });

    return Object.entries(counts)
      .filter(([, count]) => count > 0)
      .sort(([, a], [, b]) => b - a);
  }, [society.members]);

  const templateColors = [
    'bg-brand-blue', 'bg-brand-green', 'bg-yellow-400', 'bg-purple-400', 'bg-pink-400', 'bg-indigo-400', 'bg-teal-400'
  ];

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  };

  return (
    <div className="bg-brand-secondary rounded-lg shadow-lg border border-brand-accent/30 flex flex-col group transition-all duration-300 hover:border-brand-blue/50 hover:shadow-2xl">
      <div className="p-5 flex-grow relative cursor-pointer" onClick={onSelect}>
        <button
          onClick={handleDeleteClick}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-brand-accent/50 text-brand-light hover:bg-brand-red hover:text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
          aria-label={`Delete society ${society.name}`}
        >
          <Trash2Icon className="h-4 w-4" />
        </button>
        <h3 className="text-xl font-bold text-brand-text mb-2 pr-8">{society.name}</h3>
        <p className="text-xs text-brand-light mb-4 h-16 overflow-hidden">{society.analysis?.composition || 'This society has not been analyzed yet.'}</p>
        
        <div className="flex items-center text-sm text-brand-light mb-4">
            <UsersIcon className="h-4 w-4 mr-2" />
            <span>{society.members.length} Members</span>
        </div>

        <div>
            <h4 className="text-sm font-semibold text-brand-light mb-2">Composition</h4>
            <div className="space-y-1">
                {composition.map(([name, count], index) => (
                    <TemplateBar key={name} name={name} count={count} total={society.members.length} color={templateColors[index % templateColors.length]} />
                ))}
            </div>
        </div>

        {experiments.length > 0 && (
          <div className="mt-4 pt-4 border-t border-brand-accent/50">
            <h4 className="text-sm font-semibold text-brand-light mb-2">Active In Experiments</h4>
            <div className="flex flex-wrap gap-2">
              {experiments.map(exp => (
                <button
                  key={exp.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectExperiment(exp.id);
                  }}
                  className="text-xs bg-brand-primary text-brand-blue font-semibold px-2 py-1 rounded-full flex items-center space-x-1 hover:bg-brand-blue hover:text-brand-primary transition-colors cursor-pointer"
                  aria-label={`View experiment ${exp.name}`}
                >
                  <GavelIcon className="h-3 w-3" />
                  <span>{exp.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
       <div className="bg-brand-primary/50 p-3 mt-auto">
            <div onClick={onSelect} className="w-full text-center font-semibold text-brand-blue group-hover:text-white transition-colors flex items-center justify-center cursor-pointer">
                Manage Society <ArrowRightIcon className="h-4 w-4 ml-2" />
            </div>
        </div>
    </div>
  );
};

export default SocietyCard;
