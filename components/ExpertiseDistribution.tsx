
import React, { useCallback } from 'react';
import { EXPERTISE_CLUSTERS } from '../constants';
import { LockIcon, UnlockIcon } from './icons';

interface ExpertiseDistributionProps {
    weights: Record<string, number>;
    setWeights: React.Dispatch<React.SetStateAction<Record<string, number>>>;
    locked: Record<string, boolean>;
    setLocked: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

const ExpertiseDistribution: React.FC<ExpertiseDistributionProps> = ({ weights, setWeights, locked, setLocked }) => {
    
    const toggleLock = (key: string) => {
        setLocked(prev => ({ ...prev, [key]: !prev[key] }));
    };
    
    const handleWeightChange = useCallback((key: string, newValue: number) => {
        const oldValue = weights[key];
        const delta = newValue - oldValue;
        
        const unlockedKeys = Object.keys(weights).filter(k => !locked[k] && k !== key);
        const sumOfOtherUnlockedWeights = unlockedKeys.reduce((sum, k) => sum + weights[k], 0);

        if (sumOfOtherUnlockedWeights === 0 && unlockedKeys.length > 0) {
            // Distribute change equally if all other unlocked are 0
            const changePerItem = delta / unlockedKeys.length;
            const newWeights = { ...weights };
            unlockedKeys.forEach(k => {
                newWeights[k] -= changePerItem;
            });
            newWeights[key] = newValue;
            setWeights(newWeights);
            return;
        }

        if (sumOfOtherUnlockedWeights > 0) {
            const newWeights = { ...weights };
            newWeights[key] = newValue;
            
            unlockedKeys.forEach(k => {
                const proportion = weights[k] / sumOfOtherUnlockedWeights;
                newWeights[k] -= delta * proportion;
            });
            
            // Normalize to ensure it sums to 100
            const currentSum = Object.values(newWeights).reduce((a, b) => a + b, 0);
            const factor = 100 / currentSum;
            Object.keys(newWeights).forEach(k => {
                newWeights[k] *= factor;
            });

            setWeights(newWeights);
        }
    }, [weights, locked, setWeights]);

    return (
        <div className="bg-brand-primary/50 p-4 rounded-lg grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-3">
            {Object.keys(EXPERTISE_CLUSTERS).map((key) => {
                const value = weights[key] || 0;
                const isLocked = locked[key] || false;

                return (
                    <div key={key} className="grid grid-cols-12 gap-2 items-center">
                        <button 
                            onClick={() => toggleLock(key)} 
                            className={`col-span-1 p-1 rounded-md transition-colors ${isLocked ? 'bg-brand-blue text-brand-primary' : 'bg-brand-accent/50 text-brand-light hover:bg-brand-accent'}`}
                            aria-label={isLocked ? `Unlock ${key}`: `Lock ${key}`}
                        >
                           {isLocked ? <LockIcon className="h-4 w-4 mx-auto"/> : <UnlockIcon className="h-4 w-4 mx-auto"/>}
                        </button>
                        <label className="col-span-4 text-sm text-brand-light truncate" title={key}>{key}</label>
                        <div className="col-span-6 flex items-center space-x-2">
                            <input
                                type="range"
                                min="0"
                                max="100"
                                step="0.1"
                                value={value}
                                onChange={(e) => handleWeightChange(key, parseFloat(e.target.value))}
                                disabled={isLocked}
                                className="w-full h-2 bg-brand-primary rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                        </div>
                         <span className="col-span-1 text-right text-xs font-mono text-brand-text">{value.toFixed(0)}%</span>
                    </div>
                );
            })}
        </div>
    );
};

export default ExpertiseDistribution;
