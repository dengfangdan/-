import React, { useRef, useEffect, useImperativeHandle, forwardRef, useCallback } from 'react';
import { Point, Firework, FireworkParticle, Star, FireworksCanvasHandle } from '../types';

interface FireworksCanvasProps {
  isHandDrawingMode: boolean;
  customShape: Point[] | null;
  onShapeComplete: (points: Point[]) => void;
  enableAutoFire: boolean;
}

// Define available firework types for sequential selection
// Note: 'custom_shape' is intentionally excluded from this list so auto-fire never selects it
const FIREWORK_TYPES = ['standard', 'cosmic', 'streamer', 'palm', 'ring', 'heart', 'glitter', 'galaxy', 'gold_flower', 'strobe_flower', 'violet_burst', 'floral_burst', 'cyan_flower', 'neon_flower', 'love_burst', 'tree_burst'] as const;

// --- COLOR PALETTES ---
const STANDARD_COLORS = [
  '255, 182, 193', // LightPink
  '216, 191, 216', // Thistle
  '176, 196, 222', // LightSteelBlue
  '143, 188, 143', // DarkSeaGreen
  '233, 150, 122', // DarkSalmon
  '176, 224, 230'  // PowderBlue
];
const COSMIC_CORE_COLORS = ['0, 191, 255', '138, 43, 226', '75, 0, 130'];
const COSMIC_RAY_COLORS = ['255, 255, 255', '224, 255, 255'];
const STREAMER_COLORS = ['255, 250, 250', '224, 255, 255', '192, 192, 192', '255, 182, 193', '135, 206, 250'];

// NEW PALETTES
const NEON_COLORS = ['255, 20, 147', '0, 255, 127', '0, 255, 255', '138, 43, 226']; 
const ICE_COLORS = ['240, 255, 255', '224, 255, 255', '175, 238, 238']; 

const GRADIENT_THEMES = [
  ['219, 112, 147', '188, 143, 143', '240, 230, 140'],
  ['176, 224, 230', '147, 112, 219', '221, 160, 221'],
  ['233, 150, 122', '244, 164, 96', '253, 245, 230'],
  ['143, 188, 143', '102, 205, 170', '173, 216, 230'],
];

const random = (min: number, max: number) => Math.random() * (max - min) + min;

const FireworksCanvas = forwardRef<FireworksCanvasHandle, FireworksCanvasProps>(({
  isHandDrawingMode,
  customShape,
  onShapeComplete,
  enableAutoFire,
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  
  // State refs for animation loop
  const fireworksRef = useRef<Firework[]>([]);
  const particlesRef = useRef<FireworkParticle[]>([]);
  const starsRef = useRef<Star[]>([]);
  
  // Auto-fire and interaction tracking
  const lastInteractionTimeRef = useRef<number>(0);
  const nextAutoFireTimeRef = useRef<number>(0);
  
  // Sequential Playback Tracker
  const currentFireworkIndexRef = useRef<number>(0);

  // Drawing state
  const isDrawingRef = useRef(false);
  // We now store multiple paths to allow lifting the pen
  const completedPathsRef = useRef<Point[][]>([]);
  const currentPathRef = useRef<Point[]>([]);

  // Config
  const GRAVITY = 0; // Suspended in space
  const FRICTION = 0.95; 
  
  // Helper to get next firework in sequence
  const getNextFireworkType = () => {
    const type = FIREWORK_TYPES[currentFireworkIndexRef.current];
    // Increment and wrap around
    currentFireworkIndexRef.current = (currentFireworkIndexRef.current + 1) % FIREWORK_TYPES.length;
    return type;
  };

  const normalizePath = (points: Point[]): Point[] => {
    if (points.length === 0) return [];
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    points.forEach(p => {
        minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
    });
    const centerX = (minX + maxX) / 2; const centerY = (minY + maxY) / 2;
    const width = maxX - minX; const height = maxY - minY;
    // Prevent divide by zero if user just clicked one dot
    const maxDim = Math.max(width, height) || 1; 
    const scaleFactor = 2 / maxDim;
    return points.map(p => ({ x: (p.x - centerX) * scaleFactor, y: (p.y - centerY) * scaleFactor }));
  };
  
  // --- EXPOSE METHODS TO PARENT ---
  useImperativeHandle(ref, () => ({
    triggerFinale: () => {
      // THE RAINBOW FAN logic...
      const width = window.innerWidth;
      const height = window.innerHeight;
      const centerX = width / 2;
      const bottomY = height;
      const rayCount = 60; 
      const angleStart = -Math.PI * 0.9; 
      const angleEnd = -Math.PI * 0.1; 
      const angleStep = (angleEnd - angleStart) / rayCount;

      for (let i = 0; i < rayCount; i++) {
        const angle = angleStart + (i * angleStep);
        const t = i / rayCount;
        let color;
        if (t < 0.15) color = 'hsl(200, 100%, 60%)'; 
        else if (t < 0.3) color = 'hsl(170, 100%, 50%)'; 
        else if (t < 0.45) color = 'hsl(120, 100%, 60%)'; 
        else if (t < 0.6) color = 'hsl(60, 100%, 60%)'; 
        else if (t < 0.75) color = 'hsl(0, 100%, 65%)'; 
        else if (t < 0.9) color = 'hsl(300, 100%, 60%)'; 
        else color = 'hsl(270, 100%, 65%)'; 
        const velocity = 8 + Math.random() * 3; 
        fireworksRef.current.push({
          x: centerX, y: bottomY,
          targetX: centerX + Math.cos(angle) * height * 0.8,
          targetY: bottomY + Math.sin(angle) * height * 0.8,
          distanceToTarget: height * 0.8, distanceTraveled: 0,
          angle: angle, speed: velocity, hue: 0, brightness: 100,
          coordinates: Array(5).fill({ x: centerX, y: bottomY }), coordinateCount: 5,
          exploded: false, type: 'streamer', customColor: color, trailWidth: 3 
        });
      }
    },
    getCapturedShape: () => {
        // Collect points from all strokes
        const allPoints = [
            ...completedPathsRef.current.flat(),
            ...currentPathRef.current
        ];
        if (allPoints.length < 5) return null; // Too small
        return normalizePath(allPoints);
    },
    clearDrawingCanvas: () => {
        completedPathsRef.current = [];
        currentPathRef.current = [];
    }
  }));
  
  // Initialize Stars
  useEffect(() => {
    const initStars = () => {
      const stars: Star[] = [];
      const count = window.innerWidth < 600 ? 50 : 100;
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight * 0.8, 
          size: Math.random() * 2,
          opacity: Math.random(),
          blinkSpeed: Math.random() * 0.02 + 0.005,
        });
      }
      starsRef.current = stars;
    };
    initStars();
    window.addEventListener('resize', initStars);
    return () => window.removeEventListener('resize', initStars);
  }, []);

  const createExplosion = useCallback((
      x: number, 
      y: number, 
      hue: number, 
      type: typeof FIREWORK_TYPES[number] | 'custom_shape' = 'standard', 
      customColor?: string
  ) => {
    
    // --- CUSTOM SHAPE (INSTANT DRONE DISPLAY) ---
    // STRICT CHECK: Only trigger if type is explicitly 'custom_shape'
    if (type === 'custom_shape' && customShape && customShape.length > 0) {
      // Drone Show Style: Static particles forming the shape instantly
      // Uses the Tree Burst aesthetic (Cyan/Electric Blue)
      const scale = 60; // Keep scale reduced for compactness
      
      customShape.forEach((p) => {
          // Tree Burst Palette (Cyan, White, Electric Blue)
          const rand = Math.random();
          let color = '#00FFFF'; // Cyan
          if (rand > 0.8) color = '#FFFFFF'; // White sparkles
          else if (rand > 0.5) color = '#1E90FF'; // DodgerBlue

          particlesRef.current.push({
              x: x + p.x * scale, 
              y: y + p.y * scale,
              vx: (Math.random() - 0.5) * 0.15, 
              vy: (Math.random() - 0.5) * 0.15,
              alpha: 1, 
              color: color, 
              decay: random(0.04, 0.06), 
              useTrail: false, // Dots/Drones
              // INCREASED SIZE FOR VISIBILITY (Double brightness/presence)
              // Old was 0.3 - 0.5. Now ~ 0.8 - 1.5
              size: rand > 0.9 ? 1.5 : 0.8, 
              shimmer: true // Tree of Life shimmer
          });
      });
      return;
    }

    // --- PROCEDURAL EXPLOSIONS ---
    
    if (customColor) {
        const count = 10;
        for(let i=0; i<count; i++) {
            particlesRef.current.push({
                x, y,
                vx: (Math.random() - 0.5) * 3,
                vy: (Math.random() - 0.5) * 3,
                alpha: 1,
                color: customColor,
                decay: 0.1, 
                useTrail: false,
                size: 2
            });
        }
        return;
    }

    // --- TREE BURST (MATCHING 8TH IMAGE - Tree of Life) ---
    if (type === 'tree_burst') {
      const treeWidth = 62; 
      const treeHeight = 55; 

      // 1. Trunk (Wavy lines downwards)
      const trunkCount = 60; 
      for(let i=0; i<trunkCount; i++) {
            const t = i / trunkCount; 
            const yPos = y + (t * treeHeight * 0.7);
            const xWag = Math.sin(t * Math.PI * 4) * 2; 
            const spread = (1-t) * 3.5; 
            const xPos = x + xWag + (Math.random() - 0.5) * spread;

            particlesRef.current.push({
                x: xPos, y: yPos,
                vx: (Math.random() - 0.5) * 0.2, vy: (Math.random() - 0.5) * 0.2, 
                alpha: 1,
                color: Math.random() > 0.6 ? '#00BFFF' : '#E0FFFF', 
                decay: random(0.04, 0.06), 
                useTrail: false,
                size: 0.9, 
                shimmer: true
            });
      }
      
      // 2. Roots (Swirl at bottom)
      const rootY = y + treeHeight * 0.7;
      const rootCount = 40; 
      for(let i=0; i<rootCount; i++) {
          const angle = Math.PI/2 + (Math.random()-0.5) * 1.5; 
          const len = Math.random() * 12; 
          const spiralX = Math.cos(angle) * len;
          const spiralY = Math.sin(angle) * len;

          particlesRef.current.push({
              x: x + spiralX, y: rootY + spiralY,
              vx: 0, vy: 0,
              alpha: 1, 
              color: '#00BFFF', 
              decay: random(0.04, 0.06), 
              size: 0.8, 
              shimmer: true
          });
      }

      // 3. Canopy (Dense Cloud)
      const leafCount = 350; 
      for(let i=0; i<leafCount; i++) {
          const angle = Math.PI + (Math.random() * Math.PI); 
          const rNorm = Math.pow(Math.random(), 0.6); 
          const r = rNorm * treeWidth * 0.8;
          const lx = x + r * Math.cos(angle);
          const ly = y + r * Math.sin(angle) * 0.75; 

          const rand = Math.random();
          let color = '#00FFFF'; 
          if (rand > 0.8) color = '#FFFFFF'; 
          else if (rand > 0.5) color = '#1E90FF'; 
          
          particlesRef.current.push({
              x: lx, y: ly,
              vx: (Math.random()-0.5)*0.3, vy: (Math.random()-0.5)*0.3, 
              alpha: 1,
              color: color,
              decay: random(0.04, 0.07), 
              useTrail: false, 
              size: rand > 0.9 ? 1.2 : 0.7, 
              shimmer: true
          });
      }
      return;
    }

    // --- LOVE BURST ---
    if (type === 'love_burst') {
        const count = 120;
        for(let i=0; i<count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 6 + 2; 
            const dist = speed / 8; 
            let color = '#FF69B4'; 
            if (dist < 0.4) color = '#FFFFE0'; 
            else if (dist < 0.7) color = '#FF1493'; 
            else color = '#EE82EE'; 
            particlesRef.current.push({
                x, y,
                vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                alpha: 1, color: color, decay: random(0.04, 0.06), 
                useTrail: true, size: 2.5, shape: 'heart', shimmer: true
            });
        }
        return;
    }

    // --- NEON FLOWER ---
    if (type === 'neon_flower') {
      const petals = 5; const pointsPerPetal = 50; const baseSize = 8.5;
      for(let i=0; i<petals * pointsPerPetal; i++) {
          const theta = (Math.PI * 2 * i) / (petals * pointsPerPetal);
          const rNorm = Math.pow(Math.abs(Math.cos(2.5 * theta)), 0.6); 
          const r = rNorm * baseSize; 
          particlesRef.current.push({
              x, y, vx: r * Math.cos(theta), vy: r * Math.sin(theta),
              alpha: 1, color: '#FF4500', decay: random(0.04, 0.06), 
              useTrail: true, size: 2, shimmer: true
          });
      }
      for(let i=0; i<petals * (pointsPerPetal/2); i++) {
          const theta = (Math.PI * 2 * i) / (petals * (pointsPerPetal/2));
          const rNorm = Math.pow(Math.abs(Math.cos(2.5 * theta)), 0.6); 
          const r = rNorm * baseSize * 0.65; 
          particlesRef.current.push({
              x, y, vx: r * Math.cos(theta), vy: r * Math.sin(theta),
              alpha: 1, color: '#FFFFE0', decay: random(0.05, 0.07),
              useTrail: false, size: 1.6, shimmer: true
          });
      }
      for(let i=0; i<20; i++) {
          const angle = (Math.PI * 2 * i) / 20; const speed = random(2, 5);
          particlesRef.current.push({
              x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
              alpha: 1, color: '#E0FFFF', decay: 0.05, useTrail: true, size: 1.8, shimmer: true
          });
      }
      return;
    }

    // --- CYAN FLOWER ---
    if (type === 'cyan_flower') {
      for (let i = 0; i < 300; i++) {
          const angle = Math.random() * Math.PI * 2;
          const dist = Math.pow(Math.random(), 0.5); const speed = (5 + Math.random() * 6) * dist;
          let color; if (dist < 0.2) color = 'rgb(255, 255, 255)'; else if (dist < 0.6) color = 'rgb(0, 255, 255)'; else color = 'rgb(30, 144, 255)';
          particlesRef.current.push({
              x: x, y: y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
              alpha: 1, color: color, decay: random(0.04, 0.06), 
              useTrail: true, size: Math.random() * 2.5 + 1, shimmer: true
          });
      }
      return;
    }

    // --- FLORAL BURST ---
    if (type === 'floral_burst') {
        const petalCount = 5;
        for (let i = 0; i < 350; i++) {
            const angle = Math.random() * Math.PI * 2;
            const petalShape = Math.pow(Math.abs(Math.sin(angle * petalCount * 0.5)), 0.4);
            const dist = Math.random() * 0.85 + 0.15; const speed = (4 + Math.random() * 5) * petalShape * dist; 
            let color; if (dist < 0.35) color = '#FFF59D'; else if (dist < 0.65) color = '#FF7043'; else if (dist < 0.85) color = '#E91E63'; else color = '#9C27B0';
            particlesRef.current.push({
                x: x, y: y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                alpha: 1, color: color, decay: random(0.04, 0.07), useTrail: true, size: 2, shimmer: true
            });
        }
        for (let i=0; i<60; i++) {
              const angle = Math.random() * Math.PI * 2; const speed = Math.random() * 2.5;
              particlesRef.current.push({
                x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                alpha: 1, color: '#FFFFFF', decay: 0.09, useTrail: false, size: 1.8
              });
        }
        return;
    }

    // --- VIOLET BURST ---
    if (type === 'violet_burst') {
      for (let i = 0; i < 120; i++) {
        const t = i / 120; const a = t * Math.PI * 2; const angle = a + (Math.random() * 0.05);
        const speed = random(5, 7.5); 
        const color = Math.random() > 0.3 ? 'rgb(138, 43, 226)' : 'rgb(180, 130, 255)';
        particlesRef.current.push({
          x: x, y: y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
          alpha: 1, color: color, decay: random(0.05, 0.07), useTrail: true, size: 2, shimmer: true
        });
        if (i % 3 === 0) {
            const coreSpeed = speed * 0.3;
            particlesRef.current.push({
              x, y, vx: Math.cos(angle) * coreSpeed, vy: Math.sin(angle) * coreSpeed,
              alpha: 1, color: 'rgb(230, 230, 255)', decay: 0.08, useTrail: false, size: 2.5
            });
        }
      }
      return;
    }

    // --- STROBE FLOWER ---
    if (type === 'strobe_flower') {
        const rayCount = 40;
        for(let i=0; i<rayCount; i++) {
            const angle = (Math.PI * 2 * i) / rayCount; const speed = 7; 
            particlesRef.current.push({
                x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                alpha: 1, color: 'rgb(255, 215, 0)', decay: 0.05, useTrail: true, size: 1.8
            });
            for(let j=0; j<3; j++) {
                const sVar = speed * (0.9 + Math.random() * 0.2); const aVar = angle + (Math.random() - 0.5) * 0.15;
                particlesRef.current.push({
                    x, y, vx: Math.cos(aVar) * sVar, vy: Math.sin(aVar) * sVar,
                    alpha: 1, color: 'rgb(255, 255, 240)', decay: random(0.06, 0.1), useTrail: false, size: 2.2, shimmer: true
                });
            }
        }
        for(let i=0; i<24; i++) {
            const angle = (Math.PI * 2 * i) / 24; const speed = 3; 
            particlesRef.current.push({
                x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                alpha: 1, color: 'rgb(65, 105, 225)', decay: 0.06, useTrail: false, size: 2.5
            });
        }
        return;
    }

    // --- GOLD FLOWER ---
    if (type === 'gold_flower') {
        for(let i=0; i<100; i++) {
            const angle = (Math.PI * 2 * i) / 100 + (Math.random() * 0.1); const speed = random(6, 9); 
            particlesRef.current.push({
                x: x, y: y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                alpha: 1, color: '#FFC107', decay: random(0.045, 0.07), useTrail: true, size: 2
            });
        }
        for(let i=0; i<50; i++) {
            const angle = (Math.PI * 2 * i) / 50; const speed = 3.5; 
            particlesRef.current.push({
                x: x, y: y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                alpha: 1, color: Math.random() > 0.5 ? '#E0F7FA' : '#80DEEA', decay: random(0.06, 0.09), useTrail: false, size: 2.5, shimmer: true
            });
        }
        return;
    }

    // --- GALAXY ---
    if (type === 'galaxy') {
        const arms = 3;
        for(let i=0; i<80; i++) {
            const t = i / 80; const speed = 1 + (t * 5); const angle = (t * Math.PI * 4) + ((i % arms) * (Math.PI * 2 / arms));
            particlesRef.current.push({
                x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                alpha: 1, color: t < 0.3 ? '255, 255, 255' : '0, 255, 255', decay: random(0.06, 0.08), useTrail: true, size: 1.5
            });
        }
        for(let i=0; i<60; i++) {
            const angle = (Math.PI * 2 * i) / 60; const speed = random(6, 8);
            particlesRef.current.push({
                x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                alpha: 1, color: '138, 43, 226', decay: random(0.07, 0.09), useTrail: false, size: 2.2, shimmer: true
            });
        }
        return;
    }

    // --- HEART ---
    if (type === 'heart') {
        const color = NEON_COLORS[0]; const count = 60;
        for(let i=0; i<count; i++) {
            const t = (Math.PI * 2 * i) / count;
            const hx = 16 * Math.pow(Math.sin(t), 3); const hy = -(13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t));
            const scale = random(0.15, 0.25);
            particlesRef.current.push({
                x: x, y: y, vx: hx * scale, vy: hy * scale,
                alpha: 1, color: color, decay: random(0.05, 0.07), useTrail: true, size: 1.8, shimmer: true
            });
        }
        return;
    }

    // --- RING ---
    if (type === 'ring') {
        const color = ICE_COLORS[Math.floor(Math.random() * ICE_COLORS.length)]; const count = 50;
        for(let i=0; i<count; i++) {
            const angle = (Math.PI * 2 * i) / count; const speed = 4;
            particlesRef.current.push({
                x: x, y: y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                alpha: 1, color: color, decay: random(0.05, 0.07), useTrail: false, size: 2
            });
        }
        return;
    }

    // --- GLITTER ---
    if (type === 'glitter') {
        const color = Math.random() > 0.5 ? '255, 255, 255' : '175, 238, 238'; const count = 100;
        for(let i=0; i<count; i++) {
            const angle = random(0, Math.PI * 2); const speed = random(1, 6);
            particlesRef.current.push({
                x: x, y: y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                alpha: 1, color: color, decay: random(0.08, 0.12), useTrail: false, size: 1.5, shimmer: true 
            });
        }
        return;
    }

    if (type === 'palm') {
        const randTheme = Math.random(); let theme = 'GOLD';
        if (randTheme > 0.55) theme = 'BLUE'; else if (randTheme > 0.15) theme = 'SILVER'; 
        let baseColor = '255, 165, 0'; let accentColor = '255, 215, 0';
        if (theme === 'BLUE') { baseColor = '65, 105, 225'; accentColor = '224, 255, 255'; } else if (theme === 'SILVER') { baseColor = '192, 192, 192'; accentColor = '255, 250, 250'; }
        for(let i=0; i<80; i++) {
            const angle = random(0, Math.PI * 2); const speed = random(4, 9); const color = Math.random() > 0.3 ? baseColor : accentColor;
            particlesRef.current.push({
                x: x, y: y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                alpha: 1, color: color, decay: random(0.06, 0.08), useTrail: true, size: 2.8, shimmer: true 
            });
        }
    }
    else if (type === 'cosmic') {
        const rays = 48; const angleStep = (Math.PI * 2) / rays; const raySpeed = 6; const rayColor = COSMIC_RAY_COLORS[Math.floor(Math.random() * COSMIC_RAY_COLORS.length)];
        for (let i = 0; i < rays; i++) {
            const angle = i * angleStep;
            particlesRef.current.push({
                x: x, y: y, vx: Math.cos(angle) * raySpeed, vy: Math.sin(angle) * raySpeed,
                alpha: 1, color: rayColor, decay: 0.07, useTrail: true, size: 1.5, shimmer: true
            });
        }
        const coreColor = NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)]; 
        for (let i = 0; i < 40; i++) {
            const angle = random(0, Math.PI * 2); const speed = random(0.5, 2.5);
            particlesRef.current.push({
                x: x, y: y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                alpha: 1, color: coreColor, decay: random(0.07, 0.09), useTrail: false, size: 2
            });
        }
    } 
    else if (type === 'streamer') {
        const color = STREAMER_COLORS[Math.floor(Math.random() * STREAMER_COLORS.length)];
        for (let i = 0; i < 60; i++) {
            const angle = random(0, Math.PI * 2); const speed = random(2, 5);
            particlesRef.current.push({
                x: x, y: y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                alpha: 1, color: color, decay: random(0.05, 0.07), useTrail: true, size: 1.2, shimmer: true 
            });
        }
    } 
    else {
      const color = STANDARD_COLORS[Math.floor(Math.random() * STANDARD_COLORS.length)];
      for (let i = 0; i < 60; i++) {
        const angle = random(0, Math.PI * 2); const speed = random(1, 5);
        particlesRef.current.push({
          x: x, y: y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
          alpha: random(0.6, 1), color: color, decay: random(0.06, 0.09), useTrail: false, size: 2
        });
      }
    }
  }, [customShape]);

  // Main Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = () => {
      const now = Date.now();

      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)'; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'lighter';

      // --- AUTO FIRE LOGIC ---
      if (
        enableAutoFire && 
        !isDrawingRef.current && 
        !isHandDrawingMode
        // REMOVED TIME CHECK to allow continuous background fireworks during interaction
      ) {
        if (now > nextAutoFireTimeRef.current) {
            const startX = window.innerWidth * 0.5 + (Math.random() - 0.5) * 300;
            const startY = window.innerHeight;
            const targetX = window.innerWidth * 0.15 + Math.random() * window.innerWidth * 0.7;
            const targetY = window.innerHeight * 0.15 + Math.random() * window.innerHeight * 0.35;
            
            // Sequential Selection
            // Note: getNextFireworkType only selects from FIREWORK_TYPES, which excludes 'custom_shape'
            const type = getNextFireworkType();

            launchFirework(startX, startY, targetX, targetY, type);
            nextAutoFireTimeRef.current = now + random(800, 2000); 
        }
      }

      // Draw Stars
      starsRef.current.forEach(star => {
        star.opacity += star.blinkSpeed;
        if (star.opacity > 1 || star.opacity < 0) star.blinkSpeed *= -1;
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.abs(star.opacity)})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Update & Draw Fireworks (Rockets)
      for (let i = fireworksRef.current.length - 1; i >= 0; i--) {
        const fw = fireworksRef.current[i];
        
        ctx.beginPath();
        ctx.moveTo(fw.coordinates[fw.coordinates.length - 1].x, fw.coordinates[fw.coordinates.length - 1].y);
        ctx.lineTo(fw.x, fw.y);
        
        if (fw.customColor) {
             ctx.strokeStyle = fw.customColor;
             ctx.lineWidth = fw.trailWidth || 2;
        } else if (fw.type === 'cosmic' || fw.type === 'ring' || fw.type === 'galaxy' || fw.type === 'violet_burst' || fw.type === 'cyan_flower') {
             ctx.strokeStyle = `rgba(200, 200, 255, 0.5)`;
             ctx.lineWidth = 1.5;
        } else if (fw.type === 'neon_flower') {
             ctx.strokeStyle = `rgba(255, 150, 150, 0.6)`;
             ctx.lineWidth = 1.5;
        } else if (fw.type === 'love_burst') {
             ctx.strokeStyle = `rgba(255, 105, 180, 0.5)`;
             ctx.lineWidth = 1;
        } else if (fw.type === 'tree_burst' || fw.type === 'custom_shape') {
             ctx.strokeStyle = `rgba(0, 255, 255, 0.5)`; // Cyan trail
             ctx.lineWidth = 1;
        } else if (fw.type === 'streamer') {
             ctx.strokeStyle = `rgba(255, 220, 100, 0.4)`;
             ctx.lineWidth = 1;
        } else if (fw.type === 'palm' || fw.type === 'glitter' || fw.type === 'gold_flower' || fw.type === 'strobe_flower' || fw.type === 'floral_burst') {
             ctx.strokeStyle = `rgba(255, 250, 250, 0.6)`;
             ctx.lineWidth = 2;
        } else if (fw.type === 'heart') {
             ctx.strokeStyle = `rgba(255, 105, 180, 0.6)`;
             ctx.lineWidth = 1.5;
        } else {
             ctx.strokeStyle = `hsla(${fw.hue}, 40%, 70%, 0.3)`;
             ctx.lineWidth = 1;
        }
        ctx.stroke();

        fw.coordinates.pop();
        fw.coordinates.unshift({ x: fw.x, y: fw.y });

        if (fw.customColor) {
            fw.speed *= 0.96; 
            const gravityX = 0;
            const gravityY = 0.15; 
            const vx = Math.cos(fw.angle) * fw.speed + gravityX;
            const vy = Math.sin(fw.angle) * fw.speed + gravityY;
            fw.angle = Math.atan2(vy, vx);
            fw.speed = Math.sqrt(vx*vx + vy*vy);
        } else {
            fw.speed *= 1.015; 
        }
        
        const vx = Math.cos(fw.angle) * fw.speed;
        const vy = Math.sin(fw.angle) * fw.speed;
        
        fw.distanceTraveled = calculateDistance(fw.x, fw.y, fw.x + vx, fw.y + vy) + fw.distanceTraveled;
        fw.x += vx;
        fw.y += vy;

        if (fw.distanceTraveled >= fw.distanceToTarget || (fw.customColor && fw.speed < 1.5)) {
          createExplosion(fw.x, fw.y, fw.hue, fw.type, fw.customColor);
          fireworksRef.current.splice(i, 1);
        }
      }

      // Update & Draw Particles (Explosions)
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        
        p.vx *= FRICTION;
        p.vy *= FRICTION;
        p.vy += GRAVITY;
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;

        if (p.shimmer) {
            if (Math.random() > 0.85) {
                p.alpha = Math.random() * 0.4 + 0.6;
            }
        }

        if (p.useTrail) {
            if (!p.trail) p.trail = [];
            p.trail.push({ x: p.x, y: p.y });
            const maxTrail = p.size && p.size > 2 ? 15 : 8; 
            if (p.trail.length > maxTrail) p.trail.shift();
        }

        if (p.alpha <= 0) {
          particlesRef.current.splice(i, 1);
        } else {
          // --- RENDER PARTICLE ---
          
          // 1. DRAW TRAIL IF ENABLED
          if (p.useTrail && p.trail && p.trail.length > 1) {
              ctx.beginPath();
              ctx.moveTo(p.trail[0].x, p.trail[0].y);
              for (let t of p.trail) {
                  ctx.lineTo(t.x, t.y);
              }
              ctx.strokeStyle = p.color.startsWith('hsl') ? p.color : p.color.startsWith('rgb') ? p.color : `rgba(${p.color}, ${p.alpha})`;
              ctx.lineWidth = (p.size || 2) * 0.5; // Thinner trails usually look better
              ctx.stroke();
          }

          // 2. DRAW HEAD (SHAPE or DOT)
          if (p.shape === 'heart') {
             // Custom Shape: Heart
             const s = p.size || 2;
             const hx = p.x;
             const hy = p.y - s * 0.5; // Center adjustment

             ctx.save();
             ctx.translate(hx, hy);
             ctx.scale(s, s);
             ctx.beginPath();
             // Heart Path
             ctx.moveTo(0, -0.4);
             ctx.bezierCurveTo(-0.5, -0.9, -1.1, -0.4, -1.1, 0.1);
             ctx.bezierCurveTo(-1.1, 0.6, 0, 1.3, 0, 1.3);
             ctx.bezierCurveTo(0, 1.3, 1.1, 0.6, 1.1, 0.1);
             ctx.bezierCurveTo(1.1, -0.4, 0.5, -0.9, 0, -0.4);
             
             ctx.fillStyle = p.color;
             ctx.fill();
             // Add a subtle stroke for definition
             ctx.lineWidth = 0.2;
             ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'; 
             ctx.stroke();
             ctx.restore();
          } else if (!p.useTrail) {
             // Standard Dot (Only if no trail, or if we want a dot head explicitly. 
             // Current logic assumes trails don't have dot heads for line-based fireworks)
             ctx.beginPath();
             ctx.arc(p.x, p.y, p.size || 2, 0, Math.PI * 2); 
             ctx.fillStyle = p.color.startsWith('hsl') ? p.color : p.color.startsWith('rgb') ? p.color : `rgba(${p.color}, ${p.alpha})`;
             ctx.fill();
          }
        }
      }

      // --- RENDER HAND DRAWING PATHS ---
      // Draw completed strokes
      if (isHandDrawingMode && completedPathsRef.current.length > 0) {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.8)'; // Bright Cyan
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.shadowBlur = 5;
        ctx.shadowColor = 'rgba(0, 255, 255, 0.5)';
        
        completedPathsRef.current.forEach(path => {
            if (path.length > 0) {
                ctx.moveTo(path[0].x, path[0].y);
                for (let i = 1; i < path.length; i++) {
                    ctx.lineTo(path[i].x, path[i].y);
                }
            }
        });
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
      
      // Draw current active stroke
      if (isHandDrawingMode && currentPathRef.current.length > 0) {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.8)'; // Bright Cyan
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.shadowBlur = 5;
        ctx.shadowColor = 'rgba(0, 255, 255, 0.5)';

        ctx.moveTo(currentPathRef.current[0].x, currentPathRef.current[0].y);
        for (let i = 1; i < currentPathRef.current.length; i++) {
            ctx.lineTo(currentPathRef.current[i].x, currentPathRef.current[i].y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      requestRef.current = requestAnimationFrame(animate);
    };

    const calculateDistance = (x1: number, y1: number, x2: number, y2: number) => {
      return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isHandDrawingMode, customShape, enableAutoFire, createExplosion]); 

  // Resize Handler
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handleResize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Interaction Handlers (Simplified for brevity as logic is largely same)
  const handleInteractionStart = (e: React.MouseEvent | React.TouchEvent) => {
    lastInteractionTimeRef.current = Date.now();
    
    // 1. Hand Drawing Mode (Multi-stroke Logic)
    if (isHandDrawingMode) {
        isDrawingRef.current = true;
        // Start a NEW active path (don't clear old ones)
        currentPathRef.current = [];
        const { x, y } = getEventPos(e);
        currentPathRef.current.push({ x, y });
        return;
    } 
    
    // 2. Custom Shape Active (Instant Drone Launch)
    if (customShape) {
        const { x, y } = getEventPos(e);
        // Instant trigger without rocket trail
        // explicitly use 'custom_shape' type so createExplosion knows to render the text
        createExplosion(x, y, 0, 'custom_shape'); 
        return;
    }

    // 3. Normal Firework Mode
    const { x, y } = getEventPos(e);
    const startX = window.innerWidth / 2; 
    const startY = window.innerHeight;
    
    // Sequential Selection
    const type = getNextFireworkType();
    
    launchFirework(startX, startY, x, y, type);
  };

  const handleInteractionMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (isHandDrawingMode && isDrawingRef.current) {
        const { x, y } = getEventPos(e);
        currentPathRef.current.push({ x, y });
    }
  };

  const handleInteractionEnd = () => {
    lastInteractionTimeRef.current = Date.now();
    if (isHandDrawingMode && isDrawingRef.current) {
        isDrawingRef.current = false;
        // Move current stroke to completed strokes
        if (currentPathRef.current.length > 0) {
            completedPathsRef.current.push([...currentPathRef.current]);
        }
        currentPathRef.current = [];
        // DO NOT TRIGGER onShapeComplete HERE anymore.
        // Waiting for manual confirm.
    }
  };

  const launchFirework = (sx: number, sy: number, tx: number, ty: number, type: typeof FIREWORK_TYPES[number] = 'standard') => {
    const angle = Math.atan2(ty - sy, tx - sx);
    const distance = Math.sqrt(Math.pow(tx - sx, 2) + Math.pow(ty - sy, 2));
    fireworksRef.current.push({
      x: sx, y: sy, targetX: tx, targetY: ty,
      distanceToTarget: distance, distanceTraveled: 0,
      angle: angle, speed: 2, hue: Math.floor(Math.random() * 360), brightness: 100,
      coordinates: Array(3).fill({ x: sx, y: sy }), coordinateCount: 3,
      exploded: false, type: type
    });
  };

  const getEventPos = (e: React.MouseEvent | React.TouchEvent): Point => {
    if ('touches' in e) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else {
        return { x: (e as React.MouseEvent).clientX, y: (e as React.MouseEvent).clientY };
    }
  };

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full block z-10 ${isHandDrawingMode ? 'cursor-crosshair touch-none' : 'cursor-pointer'}`}
      onMouseDown={handleInteractionStart}
      onMouseMove={handleInteractionMove}
      onMouseUp={handleInteractionEnd}
      onTouchStart={handleInteractionStart}
      onTouchMove={handleInteractionMove}
      onTouchEnd={handleInteractionEnd}
    />
  );
});

export default FireworksCanvas;