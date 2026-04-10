import React, { useState } from 'react';
import { Info } from 'lucide-react';

interface InfoTooltipProps {
  content: string;
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({ content }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div 
      className="relative inline-flex items-center justify-center ml-2 z-40"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onClick={() => setIsVisible(!isVisible)}
    >
      <Info size={14} className="text-slate-300 hover:text-primary-500 transition-colors cursor-help" />
      
      {isVisible && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 animate-in fade-in zoom-in-95 duration-200 z-[100] pointer-events-none">
          <div className="bg-slate-800 text-white text-[10px] p-2.5 rounded-lg shadow-xl text-center leading-relaxed font-medium font-sans normal-case tracking-normal">
            {content}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-slate-800"></div>
          </div>
        </div>
      )}
    </div>
  );
};
