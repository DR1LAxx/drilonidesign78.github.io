import React, { useId } from 'react';

export interface OkarinaMarkProps {
  fill?: string;
  detailColor?: string;
  subtleDetailColor?: string;
  mouthpieceColor?: string;
  className?: string;
  width?: number | string;
  height?: number | string;
}

/**
 * Pixel-accurate vector recreation of the okarina teardrop ocarina mark.
 * Uses a 200x260 coordinate space so it scales identically in React SVG and HTML5 Canvas.
 */
export const OkarinaMark: React.FC<OkarinaMarkProps> = ({
  fill = '#2939F0',
  detailColor = '#FFFFFF',
  subtleDetailColor = '#B8C4FF',
  mouthpieceColor = '#0B1120',
  className,
  width,
  height,
}) => {
  const clipId = useId();

  return (
    <svg
      viewBox="0 0 200 260"
      width={width}
      height={height}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="okarina mark"
    >
      <defs>
        <clipPath id={clipId}>
          <path d="M 100 12 C 147 12, 182 68, 182 124 C 182 174, 146 218, 100 248 C 54 218, 18 174, 18 124 C 18 68, 53 12, 100 12 Z" />
        </clipPath>
      </defs>

      {/* Main ocarina silhouette */}
      <path
        d="M 100 12 C 147 12, 182 68, 182 124 C 182 174, 146 218, 100 248 C 54 218, 18 174, 18 124 C 18 68, 53 12, 100 12 Z"
        fill={fill}
      />

      {/* Clipped interior details */}
      <g clipPath={`url(#${clipId})`}>
        {/* Top mouthpiece hole */}
        <ellipse cx="100" cy="23.5" rx="12.5" ry="5.2" fill={mouthpieceColor} />

        {/* Left 3 upper hatch marks */}
        <g stroke={subtleDetailColor} strokeWidth="3.8" strokeLinecap="round">
          <line x1="43" y1="101" x2="48" y2="117.5" />
          <line x1="58" y1="105.5" x2="61.5" y2="122.5" />
          <line x1="73" y1="109.5" x2="75" y2="126.5" />
        </g>

        {/* Right 3 upper hatch marks */}
        <g stroke={subtleDetailColor} strokeWidth="3.8" strokeLinecap="round">
          <line x1="127" y1="109.5" x2="125" y2="126.5" />
          <line x1="142" y1="105.5" x2="138.5" y2="122.5" />
          <line x1="157" y1="101" x2="152" y2="117.5" />
        </g>

        {/* Curved horizontal band */}
        <path
          d="M 14 121 Q 100 148 186 121"
          stroke={detailColor}
          strokeWidth="4.6"
          fill="none"
        />

        {/* Two circular eye holes */}
        <circle cx="59" cy="156" r="11.5" fill={detailColor} />
        <circle cx="141" cy="156" r="11.5" fill={detailColor} />

        {/* Three diagonal chin slashes */}
        <g stroke={subtleDetailColor} strokeWidth="3.8" strokeLinecap="round">
          <line x1="71" y1="186" x2="90" y2="193" />
          <line x1="78" y1="200" x2="94" y2="206" />
          <line x1="85" y1="213" x2="97" y2="217.5" />
        </g>
      </g>
    </svg>
  );
};
