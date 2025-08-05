
import React, { useState, useRef, ReactNode } from 'react';
import ReactDOM from 'react-dom';

interface InfoTooltipProps {
  content: ReactNode;
  children: ReactNode;
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({ content, children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<number | null>(null);

  if (!content) {
    return <>{children}</>;
  }

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      // Initially, position it to be calculated
      setPosition({ top: rect.bottom + window.scrollY + 8, left: rect.left + window.scrollX });
      setIsVisible(true);
    }
  };

  const handleMouseLeave = () => {
    timeoutRef.current = window.setTimeout(() => {
        setIsVisible(false);
    }, 200);
  };
  
  const handleTooltipInteraction = (isEntering: boolean) => {
     if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (!isEntering) {
        handleMouseLeave();
    }
  }

  // Effect to correctly position the tooltip after it has been rendered
  React.useEffect(() => {
    if (isVisible && tooltipRef.current && triggerRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      
      let left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);
      let top = triggerRect.top - tooltipRect.height - 8;

      // Adjust if it goes off-screen top
      if (top < 0) {
        top = triggerRect.bottom + 8;
      }
      
      // Adjust if it goes off-screen left/right
      if (left < 0) {
        left = 8;
      } else if (left + tooltipRect.width > window.innerWidth) {
        left = window.innerWidth - tooltipRect.width - 8;
      }

      setPosition({ top: top + window.scrollY, left: left + window.scrollX });
    }
  }, [isVisible]);

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="inline-block"
      >
        {children}
      </div>
      {isVisible && ReactDOM.createPortal(
        <div
          ref={tooltipRef}
          style={{ 
            top: `${position.top}px`, 
            left: `${position.left}px`,
          }}
          className="absolute z-[100] w-80 max-w-sm p-4 rounded-lg bg-brand-primary text-brand-text shadow-2xl border border-brand-accent/50 animate-fade-in"
          onMouseEnter={() => handleTooltipInteraction(true)}
          onMouseLeave={() => handleTooltipInteraction(false)}
        >
          {content}
        </div>,
        document.body
      )}
    </>
  );
};
