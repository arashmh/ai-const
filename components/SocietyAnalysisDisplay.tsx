
import React from 'react';
import { SocietyAnalysis } from '../types';
import { UsersIcon, LinkIcon, AlertTriangleIcon, GitForkIcon } from './icons';

interface AnalysisCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

const AnalysisCard: React.FC<AnalysisCardProps> = ({ title, icon, children }) => (
  <div className="bg-brand-secondary/80 rounded-lg p-5 shadow-lg h-full flex flex-col">
    <div className="flex items-center mb-3 flex-shrink-0">
      {icon}
      <h3 className="text-lg font-bold text-brand-text ml-2">{title}</h3>
    </div>
    <div className="flex-grow flex flex-col">{children}</div>
  </div>
);

const getCohesionStyle = (level: SocietyAnalysis['cohesion']['level']): string => {
    switch (level) {
        case 'Harmonious': return 'text-green-400';
        case 'Cohesive': return 'text-blue-400';
        case 'Stable': return 'text-brand-text';
        case 'Tense': return 'text-orange-400';
        case 'Fractured': return 'text-red-500';
        default: return 'text-brand-light';
    }
}

const SeverityBar: React.FC<{ severity: SocietyAnalysis['pointsOfConflict'][0]['severity'] }> = ({ severity }) => {
    const styles = {
        Critical: 'w-full bg-red-500',
        High: 'w-3/4 bg-orange-500',
        Moderate: 'w-1/2 bg-yellow-500',
        Low: 'w-1/4 bg-green-500',
    };
    return (
        <div className="w-full bg-brand-primary rounded-full h-2">
            <div className={`h-2 rounded-full ${styles[severity]}`}></div>
        </div>
    );
};

const PolarityGauge: React.FC<{ score: number }> = ({ score }) => {
    const rotation = (score / 100) * 180 - 90; // -90 to 90 degrees
    const color = score > 75 ? 'text-red-500' : score > 50 ? 'text-orange-500' : score > 25 ? 'text-yellow-500' : 'text-green-500';

    return (
        <div className="relative w-48 h-24 mx-auto">
            <svg className="w-full h-full" viewBox="0 0 100 50">
                <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#1B263B" strokeWidth="10" />
                <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="url(#gradient)" strokeWidth="10" strokeLinecap="round" />
                <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#22C55E" />
                        <stop offset="50%" stopColor="#FBBF24" />
                        <stop offset="100%" stopColor="#EF4444" />
                    </linearGradient>
                </defs>
            </svg>
            <div
                className="absolute bottom-0 left-1/2 w-0.5 h-1/2 bg-brand-text transition-transform duration-500"
                style={{ transform: `translateX(-50%) rotate(${rotation}deg)`, transformOrigin: 'bottom center' }}
            ></div>
            <div className="absolute bottom-[-10px] left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-brand-text border-2 border-brand-secondary"></div>
             <span className={`absolute bottom-5 left-1/2 -translate-x-1/2 text-2xl font-bold ${color}`}>{score.toFixed(0)}</span>
        </div>
    );
}

const SocietyAnalysisDisplay: React.FC<{ analysis: SocietyAnalysis }> = ({ analysis }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
      <div className="md:col-span-2">
        <AnalysisCard title="Composition" icon={<UsersIcon className="h-6 w-6 text-brand-blue" />}>
          <p className="text-brand-light">{analysis.composition}</p>
        </AnalysisCard>
      </div>

      <AnalysisCard title="Cohesion" icon={<LinkIcon className="h-6 w-6 text-brand-blue" />}>
        <div className="flex flex-col items-center justify-center text-center flex-grow">
            <p className={`text-4xl font-extrabold ${getCohesionStyle(analysis.cohesion.level)}`}>
                {analysis.cohesion.level}
            </p>
            <p className="text-brand-light mt-3 text-sm">{analysis.cohesion.description}</p>
        </div>
      </AnalysisCard>

      <AnalysisCard title="Polarity" icon={<GitForkIcon className="h-6 w-6 text-brand-blue" />}>
         <div className="flex flex-col items-center justify-center text-center flex-grow">
            <PolarityGauge score={analysis.polarity.score} />
            <p className="text-brand-light mt-3 text-sm">{analysis.polarity.description}</p>
        </div>
      </AnalysisCard>

      <div className="md:col-span-2">
         <AnalysisCard title="Potential Points of Conflict" icon={<AlertTriangleIcon className="h-6 w-6 text-brand-blue" />}>
            <div className="space-y-4">
                {analysis.pointsOfConflict.length > 0 ? (
                    analysis.pointsOfConflict.map(point => (
                        <div key={point.topic}>
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-brand-text font-semibold">{point.topic}</span>
                                <span className="text-xs text-brand-light">{point.severity}</span>
                            </div>
                            <SeverityBar severity={point.severity} />
                        </div>
                    ))
                ) : (
                    <p className="text-brand-light text-center">No significant points of conflict detected.</p>
                )}
            </div>
        </AnalysisCard>
      </div>
    </div>
  );
};

export default SocietyAnalysisDisplay;
