import React from 'react';
import { OKARINA_SWATCHES } from '../data/brandPresets';

interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (hex: string) => void;
  disabled?: boolean;
  showSwatches?: boolean;
}

export const ColorField: React.FC<ColorFieldProps> = ({
  label,
  value,
  onChange,
  disabled = false,
  showSwatches = false,
}) => {
  return (
    <div className={disabled ? 'opacity-45 pointer-events-none' : ''}>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <label className="text-xs font-medium text-slate-300">{label}</label>
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={value.toUpperCase()}
            onChange={(e) => {
              const v = e.target.value;
              if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) onChange(v);
            }}
            aria-label={`${label} hex value`}
            className="w-20 px-2 py-1 text-xs font-mono-tabular text-slate-100 bg-[#0B1120] border border-slate-700 rounded-md focus:outline-none focus:border-[#5C7CFA]"
          />
          <label className="relative w-7 h-7 rounded-md border border-slate-700 overflow-hidden cursor-pointer shrink-0 shadow-xs">
            <span
              className="block w-full h-full"
              style={{ backgroundColor: value }}
            />
            <input
              type="color"
              value={/^#[0-9A-Fa-f]{6}$/.test(value) ? value : '#0B1120'}
              onChange={(e) => onChange(e.target.value)}
              aria-label={`Pick ${label}`}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </label>
        </div>
      </div>
      {showSwatches && (
        <div className="flex items-center gap-1.5 mt-1.5">
          {OKARINA_SWATCHES.map((swatch) => {
            const active = swatch.hex.toLowerCase() === value.toLowerCase();
            return (
              <button
                key={swatch.hex}
                type="button"
                title={`${swatch.name} (${swatch.hex})`}
                onClick={() => onChange(swatch.hex)}
                className={`w-5 h-5 rounded-full border transition-transform hover:scale-110 ${
                  active
                    ? 'ring-2 ring-[#5C7CFA] ring-offset-1 ring-offset-[#0F172A] border-slate-300'
                    : 'border-slate-600'
                }`}
                style={{ backgroundColor: swatch.hex }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
