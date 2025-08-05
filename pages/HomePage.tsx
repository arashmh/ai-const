
import React from 'react';
import { Page } from '../types';
import { UsersIcon, GavelIcon, ArrowRightIcon } from '../components/icons';

interface HomePageProps {
  setPage: (page: Page) => void;
}

const HomePage: React.FC<HomePageProps> = ({ setPage }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center">
      <h1 className="text-5xl md:text-6xl font-extrabold text-brand-text tracking-tight mb-4">
        AI Constitution Simulator
      </h1>
      <p className="max-w-3xl mx-auto text-lg text-brand-light mb-12">
        Craft a society of AI agents based on character profiles, then launch experiments to watch them build a constitution from the ground up. Witness the emergence of law in a digital civic sphere.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
        <div 
          onClick={() => setPage(Page.Society)}
          className="bg-brand-secondary rounded-xl p-8 border border-transparent hover:border-brand-blue cursor-pointer transition-all duration-300 transform hover:-translate-y-1 shadow-lg hover:shadow-2xl"
        >
          <div className="flex items-center justify-center h-16 w-16 rounded-full bg-brand-blue/20 mx-auto mb-6">
            <UsersIcon className="h-8 w-8 text-brand-blue" />
          </div>
          <h2 className="text-3xl font-bold text-brand-text mb-3">Society</h2>
          <p className="text-brand-light mb-6">
            Forge your digital society by creating AI members. Use detailed questionnaires for individual agents or generate populations in bulk from ideological templates.
          </p>
          <span className="font-semibold text-brand-blue inline-flex items-center">
            Build Your Society <ArrowRightIcon className="ml-2 h-5 w-5" />
          </span>
        </div>
        
        <div 
          onClick={() => setPage(Page.Law)}
          className="bg-brand-secondary rounded-xl p-8 border border-transparent hover:border-brand-blue cursor-pointer transition-all duration-300 transform hover:-translate-y-1 shadow-lg hover:shadow-2xl"
        >
          <div className="flex items-center justify-center h-16 w-16 rounded-full bg-brand-blue/20 mx-auto mb-6">
            <GavelIcon className="h-8 w-8 text-brand-blue" />
          </div>
          <h2 className="text-3xl font-bold text-brand-text mb-3">Law</h2>
          <p className="text-brand-light mb-6">
            Run constitutional experiments. Select members, assign roles, and observe as they propose, debate, and ratify laws. Gain insights into the emergent legal system.
          </p>
           <span className="font-semibold text-brand-blue inline-flex items-center">
            Simulate Governance <ArrowRightIcon className="ml-2 h-5 w-5" />
          </span>
        </div>
      </div>

      <footer className="mt-24 text-brand-accent text-sm">
        <p>This system is governed by autonomous AI Agents, acting as high-fidelity proxies. All processes are designed for transparency, auditability, and deliberate stability.</p>
      </footer>
    </div>
  );
};

export default HomePage;