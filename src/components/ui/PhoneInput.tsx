import { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface PhoneInputProps {
  value: string;
  onChange: (formattedPhone: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  error?: boolean;
  dark?: boolean;
}

const LADAS = [
  { code: '+52', flag: '🇲🇽', country: 'MX', label: 'México' },
  { code: '+1', flag: '🇺🇸', country: 'US', label: 'EE.UU.' },
];

/**
 * Formatea el número como (XXX) XXX-XXXX para 10 dígitos
 */
const formatPhoneDisplay = (digits: string): string => {
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
};

export const PhoneInput = ({
  value,
  onChange,
  placeholder = '(644) 203-9334',
  required = false,
  error = false,
  dark = false,
}: PhoneInputProps) => {
  const [showLada, setShowLada] = useState(false);
  const [selectedLada, setSelectedLada] = useState(LADAS[0]);
  
  // Extract only digits from value
  const digits = value.replace(/\D/g, '');
  const displayValue = formatPhoneDisplay(digits);

  useEffect(() => {
    const handleClickOutside = () => setShowLada(false);
    if (showLada) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showLada]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawDigits = e.target.value.replace(/\D/g, '').slice(0, 10);
    onChange(rawDigits);
  };

  const baseClass = dark
    ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:ring-primary-500/50 focus:bg-white/10'
    : 'bg-slate-50 border-slate-200 focus:ring-primary-500/10';
  const errorClass = error ? 'ring-2 ring-danger-500/20 border-danger-300' : '';

  return (
    <div className="relative flex">
      {/* LADA Selector */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setShowLada(!showLada); }}
        className={`flex items-center gap-2 px-3 h-12 border rounded-l-xl text-xs font-bold shrink-0 transition-all ${
          dark 
            ? 'bg-white/10 border-white/10 text-white hover:bg-white/20' 
            : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
        }`}
      >
        <span className="text-lg leading-none">{selectedLada.flag}</span>
        <span className="inline">{selectedLada.code}</span>
        <ChevronDown size={14} className="opacity-50" />
      </button>
      
      {showLada && (
        <div className={`absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden min-w-[180px] animate-in fade-in zoom-in-95 duration-150`}>
          {LADAS.map(lada => (
            <button
              key={lada.code}
              type="button"
              onClick={() => { setSelectedLada(lada); setShowLada(false); }}
              className={`w-full px-4 py-2.5 text-left flex items-center gap-3 hover:bg-slate-50 transition-colors text-sm ${
                selectedLada.code === lada.code ? 'bg-primary-50 text-primary-600 font-bold' : 'text-slate-700'
              }`}
            >
              <span className="text-lg">{lada.flag}</span>
              <span className="font-medium">{lada.label}</span>
              <span className="text-slate-400 ml-auto text-xs font-bold">{lada.code}</span>
            </button>
          ))}
        </div>
      )}
      
      {/* Phone Input */}
      <div className="relative flex-1">
        <input
          type="tel"
          value={displayValue}
          onChange={handleChange}
          placeholder={placeholder}
          required={required}
          className={`w-full h-12 border rounded-r-xl px-4 text-base font-bold outline-none transition-all tracking-wider ${baseClass} ${errorClass}`}
        />
        {/* Digit counter integrated into input side as subtle indicator */}
        {digits.length > 0 && (
          <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase tracking-widest ${
            digits.length === 10 ? 'text-success-500' : 'text-slate-400'
          }`}>
            {digits.length}/10
          </span>
        )}
      </div>
    </div>
  );
};
