import React, { useState, useCallback, useRef } from 'react';
import FireworksCanvas from './components/FireworksCanvas';
import MangaOverlay from './components/MangaOverlay';
import ParticleCharacters from './components/ParticleCharacters';
import AudioManager from './components/AudioManager';
import { Point, FireworksCanvasHandle } from './types';
import { PencilIcon, CheckIcon, TrashIcon, TextIcon } from './components/Icons';

interface DrawingConfig {
  isOpen: boolean;
  mode: 'hand' | 'text';
}

const App: React.FC = () => {
  const [drawingConfig, setDrawingConfig] = useState<DrawingConfig>({ isOpen: false, mode: 'hand' });
  const [customShape, setCustomShape] = useState<Point[] | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [textInput, setTextInput] = useState('');
  
  // Ref to control the fireworks canvas manually
  const fireworksRef = useRef<FireworksCanvasHandle>(null);

  // Handle global interaction for audio unlock
  const handleInteraction = useCallback(() => {
    if (!hasInteracted) {
      setHasInteracted(true);
    }
  }, [hasInteracted]);

  const handleAudioEnded = useCallback(() => {
    // When music ends, trigger the rainbow finale!
    if (fireworksRef.current) {
        fireworksRef.current.triggerFinale();
    }
  }, []);

  const toggleDrawingMenu = () => {
    setDrawingConfig(prev => ({ ...prev, isOpen: !prev.isOpen, mode: 'hand' }));
  };

  const clearShape = () => {
    setCustomShape(null);
    setDrawingConfig({ isOpen: false, mode: 'hand' });
  };

  const handleHandDrawConfirm = () => {
      if (fireworksRef.current) {
          const points = fireworksRef.current.getCapturedShape();
          if (points && points.length > 0) {
              setCustomShape(points);
              setDrawingConfig({ ...drawingConfig, isOpen: false });
              fireworksRef.current.clearDrawingCanvas();
          } else {
              // Optionally show visual feedback that nothing was drawn
          }
      }
  };

  const handleHandDrawClear = () => {
      if (fireworksRef.current) {
          fireworksRef.current.clearDrawingCanvas();
      }
  };

  // Convert text to particle points
  const processTextToPoints = (e: React.FormEvent) => {
    e.preventDefault();
    const text = textInput.trim().toUpperCase();
    if (!text) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Measure and setup canvas
    // Dynamic font size: smaller if text is long to ensure it fits and points aren't too dense/spread
    const fontSize = text.length > 10 ? 100 : 150;
    const fontFamily = 'Arial, sans-serif'; // Blocky fonts work best for fireworks
    ctx.font = `bold ${fontSize}px ${fontFamily}`;
    
    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;
    const textHeight = fontSize; // Approximate

    // Add padding
    canvas.width = textWidth + 40;
    canvas.height = textHeight + 40;
    
    // 2. Draw Text
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.font = `bold ${fontSize}px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    // 3. Scan Pixels
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const points: Point[] = [];
    
    // Sampling step (skip pixels to reduce density/improve perf)
    const step = 6; 

    for (let y = 0; y < canvas.height; y += step) {
      for (let x = 0; x < canvas.width; x += step) {
        const index = (y * canvas.width + x) * 4;
        // If pixel is bright (white text)
        if (data[index] > 128) {
          points.push({ x, y });
        }
      }
    }

    // 4. Normalize Points (Center to 0,0 and scale to approx -1 to 1)
    if (points.length > 0) {
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      points.forEach(p => {
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
      });

      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      const width = maxX - minX;
      const height = maxY - minY;
      const maxDim = Math.max(width, height) || 1;
      
      const scaleFactor = 2 / maxDim; // Map largest dim to 2 units (-1 to 1)

      const normalizedPoints = points.map(p => ({
        x: (p.x - centerX) * scaleFactor,
        y: (p.y - centerY) * scaleFactor
      }));

      setCustomShape(normalizedPoints);
      setDrawingConfig({ ...drawingConfig, isOpen: false });
      setTextInput('');
    }
  };

  return (
    <div 
      className="relative w-screen h-screen overflow-hidden bg-gradient-to-b from-slate-900 via-[#0a0a2a] to-[#1a1a40]"
      onClick={handleInteraction}
      onTouchStart={handleInteraction}
    >
      {/* Background Music Manager */}
      <AudioManager shouldPlay={hasInteracted} onEnded={handleAudioEnded} />

      {/* The Dynamic Canvas Layer (Fireworks) */}
      <FireworksCanvas 
        ref={fireworksRef}
        isHandDrawingMode={drawingConfig.isOpen && drawingConfig.mode === 'hand'}
        customShape={customShape}
        onShapeComplete={(points) => {
          setCustomShape(points);
          setDrawingConfig(prev => ({ ...prev, isOpen: false }));
        }}
        enableAutoFire={hasInteracted}
      />

      {/* The Static Manga Art Overlay (Background Planet & Text) */}
      <MangaOverlay />
      
      {/* 3D Particle Characters Layer */}
      <ParticleCharacters />

      {/* UI Controls */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none z-50">
        
        {/* Shape Creator Controls */}
        <div className="flex flex-col gap-2 pointer-events-auto">
          
          {/* Main Toggle / collapsed state */}
          {!drawingConfig.isOpen ? (
            <div className="flex gap-2">
              <button
                onClick={toggleDrawingMenu}
                className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 text-white px-4 py-2 rounded-full hover:bg-white/20 transition-all active:scale-95 shadow-[0_0_15px_rgba(255,255,255,0.2)]"
              >
                <PencilIcon className="w-5 h-5 text-cyan-300" />
                <span className="text-sm font-medium tracking-wide">
                  {customShape ? 'Edit Shape' : 'Draw Shape'}
                </span>
              </button>
              
              {customShape && (
                <button
                  onClick={clearShape}
                  className="flex items-center justify-center w-10 h-10 bg-red-500/20 backdrop-blur-md border border-red-500/30 text-red-200 rounded-full hover:bg-red-500/30 transition-all active:scale-95"
                  title="Clear Shape"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              )}
            </div>
          ) : (
             // Expanded Menu
             <div className="flex flex-col items-start gap-3 bg-slate-900/80 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300 min-w-[280px]">
               
               {/* Mode Switcher */}
               <div className="flex bg-black/40 rounded-lg p-1 w-full">
                 <button 
                    onClick={() => setDrawingConfig(p => ({...p, mode: 'hand'}))}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-bold transition-all ${drawingConfig.mode === 'hand' ? 'bg-cyan-600 text-white shadow-lg' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
                 >
                    <PencilIcon className="w-4 h-4" /> HAND DRAW
                 </button>
                 <button 
                    onClick={() => setDrawingConfig(p => ({...p, mode: 'text'}))}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-bold transition-all ${drawingConfig.mode === 'text' ? 'bg-purple-600 text-white shadow-lg' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
                 >
                    <TextIcon className="w-4 h-4" /> TEXT INPUT
                 </button>
               </div>

               {/* Content Area */}
               <div className="w-full">
                  {drawingConfig.mode === 'hand' ? (
                     <div className="flex flex-col gap-2">
                         <div className="text-cyan-200 text-xs text-center border border-cyan-500/30 bg-cyan-500/10 rounded-lg py-3">
                            Draw multiple strokes. Click confirm when done.
                         </div>
                         <div className="flex gap-2 mt-1">
                             <button
                                onClick={handleHandDrawClear}
                                className="flex-1 bg-white/10 text-white rounded-lg px-3 py-2 text-xs font-bold hover:bg-white/20 transition-colors"
                             >
                                CLEAR
                             </button>
                             <button
                                onClick={handleHandDrawConfirm}
                                className="flex-1 bg-cyan-600 text-white rounded-lg px-3 py-2 text-xs font-bold hover:bg-cyan-500 transition-colors flex items-center justify-center gap-1 shadow-lg shadow-cyan-500/20"
                             >
                                <CheckIcon className="w-4 h-4" /> CONFIRM
                             </button>
                         </div>
                     </div>
                  ) : (
                     <form onSubmit={processTextToPoints} className="flex gap-2 w-full">
                        <input 
                           autoFocus
                           type="text" 
                           value={textInput}
                           onChange={(e) => setTextInput(e.target.value)}
                           className="flex-1 bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/30 text-sm focus:outline-none focus:border-purple-500 uppercase font-bold tracking-widest"
                           placeholder="MAX 20 CHARS"
                           maxLength={20}
                        />
                        <button 
                           type="submit"
                           disabled={!textInput.trim()}
                           className="bg-purple-600 text-white rounded-lg px-3 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                           <CheckIcon className="w-5 h-5" />
                        </button>
                     </form>
                  )}
               </div>

               {/* Cancel */}
               <button 
                  onClick={() => {
                      setDrawingConfig({isOpen: false, mode: 'hand'});
                      handleHandDrawClear(); // Clear if cancelled
                  }}
                  className="text-xs text-white/40 hover:text-white w-full text-center mt-1"
               >
                  Cancel
               </button>
             </div>
          )}

        </div>
      </div>

      {/* Interaction Hint (Disappears after first click) */}
      {!hasInteracted && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
          <div className="bg-black/40 backdrop-blur-sm px-6 py-3 rounded-full text-white/80 text-sm tracking-widest animate-pulse border border-white/10">
            TAP ANYWHERE TO START
          </div>
        </div>
      )}
    </div>
  );
};

export default App;