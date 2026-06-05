"use client";

import { useState, useRef, useEffect } from "react";

import type { ReactNode } from "react";

export interface CategoryOption {
  value: string;
  label: string;
  display?: ReactNode;
}

interface Props {
  categories: (string | CategoryOption)[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  required?: boolean;
  showSearch?: boolean;
  searchPlaceholder?: string;
}

export default function SearchableCategorySelect({ 
  categories, 
  value, 
  onChange, 
  disabled, 
  placeholder, 
  className, 
  required,
  showSearch = true,
  searchPlaceholder = "Type amount or currency..."
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Normalize categories to Level/Option objects
  const normalizedOptions: CategoryOption[] = categories.map(cat => 
    typeof cat === 'string' ? { value: cat, label: cat } : cat
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = normalizedOptions.filter(opt => {
    const searchString = (opt.label + " " + opt.value).toLowerCase();
    if (searchString.includes(searchTerm.toLowerCase())) return true;

    // Special handling for numeric/currency/range strings (amount filtering)
    const num = parseFloat(searchTerm);
    if (!isNaN(num) && searchTerm.trim() !== "") {
        const cat = opt.label;
        const matchRange = cat.match(/\((?:\$|£|€)?(\d+)\s*-\s*(?:\$|£|€)?(\d+)\)/);
        const matchMin = cat.match(/\((?:\$|£|€)?(\d+)\+\)/);
        const matchExact = cat.match(/\((?:\$|£|€)?(\d+)\)/);

        if (matchRange) {
            return num >= parseFloat(matchRange[1]) && num <= parseFloat(matchRange[2]);
        } else if (matchMin) {
            return num >= parseFloat(matchMin[1]);
        } else if (matchExact) {
            return num === parseFloat(matchExact[1]);
        }
    }
    return false;
  });

  const selectedOption = normalizedOptions.find(opt => opt.value === value);

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%', zIndex: isOpen ? 900 : 1 }}>
      {/* Visually hidden input for HTML5 required validation */}
      <input 
        type="text" 
        value={value} 
        onChange={() => {}} 
        required={required} 
        style={{ 
            opacity: 0, position: 'absolute', zIndex: -1, width: '100%', height: '100%', 
            pointerEvents: 'none', top: 0, left: 0 
        }} 
        tabIndex={-1} 
      />
      <div 
        className={className} 
        style={{ 
          cursor: disabled ? 'not-allowed' : 'pointer', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          opacity: disabled ? 0.6 : 1,
          height: '100%',
          userSelect: 'none'
        }}
        onClick={() => {
            if (!disabled) {
                setIsOpen(!isOpen);
                if (!isOpen) setSearchTerm("");
            }
        }}
      >
        <span style={{ overflow: 'hidden', display: 'inline-flex', alignItems: 'center', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selectedOption ? (selectedOption.display || selectedOption.label) : (placeholder || "Select Option...")}
        </span>
        <span style={{ fontSize: '0.8em', opacity: 0.5, marginLeft: '8px', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
      </div>
      
      {isOpen && !disabled && (
        <div style={{
          position: 'absolute', 
          top: '100%', 
          left: 0, 
          right: 0, 
          zIndex: 901, 
          background: 'var(--surface, #ffffff)', 
          backgroundColor: 'var(--surface, #ffffff)',
          opacity: 1,
          border: '1px solid var(--border)', 
          borderRadius: '8px', 
          marginTop: '6px',
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
          maxHeight: '350px', 
          display: 'flex', 
          flexDirection: 'column',
          color: 'var(--foreground)'
        }}>
          {showSearch && (
            <div style={{ padding: '10px', borderBottom: '1px solid var(--border)' }}>
              <input 
                type="text"
                autoFocus
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: '100%', 
                  padding: '10px 12px', 
                  borderRadius: '6px',
                  border: '1px solid var(--border)', 
                  background: 'var(--surface, transparent)',
                  color: 'var(--foreground)',
                  outline: 'none',
                  fontSize: '0.95rem'
                }}
              />
            </div>
          )}
          <div style={{ overflowY: 'auto', flex: 1, padding: '4px' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '12px', textAlign: 'center', opacity: 0.5, fontSize: '0.9rem' }}>No matching results</div>
            ) : (
                filtered.map(opt => (
                  <div 
                    key={opt.value}
                    onClick={() => {
                        onChange(opt.value);
                        setIsOpen(false);
                        setSearchTerm("");
                    }}
                    style={{
                        padding: '12px 14px',
                        cursor: 'pointer',
                        borderRadius: '6px',
                        background: value === opt.value ? 'var(--primary)' : 'transparent',
                        color: value === opt.value ? '#ffffff' : 'inherit',
                        fontWeight: value === opt.value ? 600 : 400,
                        transition: 'background 0.1s',
                        marginBottom: '2px',
                        fontSize: '0.95rem'
                    }}
                    onMouseEnter={(e) => {
                        if (value !== opt.value) e.currentTarget.style.background = 'var(--primary-light, rgba(0,0,0,0.05))';
                    }}
                    onMouseLeave={(e) => {
                        if (value !== opt.value) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    {opt.display || opt.label}
                  </div>
                ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
