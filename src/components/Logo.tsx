import React from 'react';

interface LogoProps {
  className?: string;
}

export default function Logo({ className = "h-8" }: LogoProps) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 160 55" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* "86" in bold royal blue */}
      <text 
        x="5" 
        y="41" 
        fill="#0A58CA" 
        fontWeight="850" 
        fontSize="39" 
        fontFamily='"Inter", system-ui, -apple-system, sans-serif'
        letterSpacing="-1.8px"
      >
        86
      </text>

      {/* Orange Dot (Head) */}
      <circle 
        cx="63" 
        cy="15" 
        r="5.5" 
        fill="#FF7A00" 
      />

      {/* Orange Tie (Icon) */}
      <path 
        d="M 59.5 23 L 66.5 23 L 65 27 L 68 44 L 63 50 L 58 44 L 61 27 Z" 
        fill="#FF7A00" 
      />

      {/* "job" in bold dark blue */}
      <text 
        x="75" 
        y="41" 
        fill="#0D1E3E" 
        fontWeight="850" 
        fontSize="39" 
        fontFamily='"Inter", system-ui, -apple-system, sans-serif'
        letterSpacing="-1px"
      >
        job
      </text>
    </svg>
  );
}
