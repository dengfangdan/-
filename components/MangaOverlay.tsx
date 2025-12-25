import React from 'react';

const MangaOverlay: React.FC = () => {
  return (
    <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-end items-center overflow-hidden">
      
      {/* Quote */}
      <div className="absolute top-[40%] left-[10%] md:left-[20%] max-w-[200px] text-white/80 animate-float opacity-80">
        <p className="text-xl md:text-2xl font-serif italic drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-relaxed">
          "The desert is beautiful, because..."
        </p>
      </div>

      {/* Main SVG Composition */}
      <svg
        className="w-full h-[50vh] md:h-[60vh]"
        viewBox="0 0 800 600"
        preserveAspectRatio="xMidYMax slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Planet Surface removed - replaced by Particle system */}
        
      </svg>
    </div>
  );
};

export default MangaOverlay;