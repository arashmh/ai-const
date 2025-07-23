
import React, { useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Member } from '../types';
import MemberCard from './MemberCard';

interface MemberTooltipProviderProps {
  member: Member | undefined;
  children: React.ReactNode;
}

export const MemberTooltipProvider: React.FC<MemberTooltipProviderProps> = ({ member, children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const spanRef = useRef<HTMLSpanElement>(null);
  const timeoutRef = useRef<number | null>(null);

  if (!member) {
    return <>{children}</>;
  }

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (spanRef.current) {
      const rect = spanRef.current.getBoundingClientRect();
      const cardWidth = 320; // w-80
      const cardHeight = 520; // Approximate height

      let top = rect.top + window.scrollY;
      let left = rect.right + window.scrollX + 15;

      // Adjust if it goes off-screen right
      if (left + cardWidth > window.innerWidth) {
        left = rect.left + window.scrollX - cardWidth - 15;
      }

      // Adjust if it goes off-screen bottom
      if (rect.top + cardHeight > window.innerHeight) {
        top = window.innerHeight + window.scrollY - cardHeight - 10;
      }
      
      // Adjust if it goes off-screen top
      if (top < window.scrollY) {
        top = window.scrollY + 10;
      }
       // Adjust if it goes off-screen left
      if (left < 0) {
        left = 10;
      }


      setPosition({ top, left });
      setIsVisible(true);
    }
  };

  const handleMouseLeave = () => {
    timeoutRef.current = window.setTimeout(() => {
        setIsVisible(false);
    }, 200);
  };

  const handleCardInteraction = () => {
     if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }

  return (
    <>
      <span
        ref={spanRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="inline-block underline decoration-dotted cursor-pointer decoration-brand-light"
      >
        {children}
      </span>
      {isVisible && ReactDOM.createPortal(
        <div
          style={{ 
            top: `${position.top}px`, 
            left: `${position.left}px`,
            '--tw-scale-x': '0.95',
            '--tw-scale-y': '0.95',
          } as React.CSSProperties}
          className="absolute z-50 w-80 transform transition-all duration-200 ease-out animate-fade-in"
          onMouseEnter={handleCardInteraction}
          onMouseLeave={handleMouseLeave}
        >
          <MemberCard member={member} />
        </div>,
        document.body
      )}
    </>
  );
};
