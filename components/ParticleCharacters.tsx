import React, { useRef, useEffect } from 'react';

// Types
interface Particle3D {
  x: number;
  y: number;
  z: number;
  ox: number; // original x
  oy: number;
  oz: number;
  color: string;
  size: number;
  alpha: number;
  delay?: number; // for scarf animation offset
}

const ParticleCharacters: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles: Particle3D[] = [];
    let time = 0;
    let animationFrameId: number;

    // SCALING & POSITIONING
    // We define a virtual space where height = 1000 units.
    const V_HEIGHT = 1000; 
    let scale = window.innerHeight / V_HEIGHT;
    let centerX = window.innerWidth / 2;
    // Anchor point: The ground level of the characters.
    // Moved down to 92% of screen height so the planet surface sits at the bottom edge.
    let centerY = window.innerHeight * 0.92; 

    // Helper to add particles
    // Applies scale to coordinates to make scene responsive and larger
    const addParticle = (x: number, y: number, z: number, color: string, size: number = 2, alpha: number = 1, delay?: number) => {
        particles.push({ 
            x: x * scale, 
            y: y * scale, 
            z: z * scale, 
            ox: x * scale, 
            oy: y * scale, 
            oz: z * scale, 
            color, 
            size: size * scale, 
            alpha, 
            delay 
        });
    };

    // --- SHAPE GENERATORS (In Virtual Units) ---

    const createRoseFlower = (cx: number, cy: number, cz: number, size: number) => {
        // Particle Cloud Rose Logic
        // We create multiple layers of "shells" that are modulated to look like petals
        // This creates a dense, volumetric look similar to the reference image.
        
        const layers = 5; // More layers for density
        
        for (let l = 0; l < layers; l++) {
            // Normalized layer progress (0 = inner, 1 = outer)
            const t = l / (layers - 1); 
            
            // Outer layers are larger and start slightly lower
            const layerSize = size * (0.25 + 0.75 * t); 
            const height = size * (0.5 + 0.5 * t);
            const yStart = cy - (size * 0.1 * t); 
            
            // Rotation offset to stagger petals
            const rotOffset = l * 2.1; // Golden-ish ratio rotation
            
            // Modulation parameters
            const petals = 3 + Math.floor(t * 3); // 3 petals inner -> 6 petals outer
            const twist = 0.5 + t; // More twist on outer petals
            
            // Particle Count: Dense!
            // Inner layers need fewer particles, outer layers need many
            const pCount = 600 + Math.floor(t * 1200); 
            
            for (let i = 0; i < pCount; i++) {
                 // Random sampling of the surface
                 const v = Math.random(); // Height: 0 (bottom) to 1 (top)
                 const u = Math.random() * Math.PI * 2; // Angle around center
                 
                 // Bell Shape Profile (Cup)
                 // Grows radius as it goes up (v goes 0->1)
                 // Inner layers are tighter (power 0.8), Outer layers open up more (power 0.5)
                 const openFactor = 0.8 - (0.3 * t);
                 const bellR = layerSize * (0.15 + 0.85 * Math.pow(v, openFactor));
                 
                 // Petal Undulation (The "Flower" Shape)
                 // sin wave modulates the radius
                 const undulation = 0.3 * t * Math.sin(petals * u + twist * v);
                 
                 // Add volumetric thickness (Noise)
                 // This makes it a "cloud" rather than a thin shell
                 const thickness = (Math.random() - 0.5) * (10 + 10 * t);
                 
                 // Top Curl: Petals curl outward at the top
                 const curlStart = 0.6;
                 const curlAmount = Math.max(0, v - curlStart) * layerSize * (0.8 * t);
                 
                 // Calculate final radius
                 const r = bellR * (1 + undulation) + thickness + curlAmount;
                 
                 // Position
                 const angle = u + rotOffset;
                 const x = cx + r * Math.cos(angle);
                 const z = cz + r * Math.sin(angle);
                 const y = yStart - (v * height); // Grow upwards
                 
                 // Color Logic: Pointillism Gradient
                 // Deep Red/Purple center -> Bright Pink/White tips
                 let color = '#880E4F'; // Default Deep Base
                 
                 // Mix factor based on height(v) and layer(t)
                 const mix = v * 0.7 + t * 0.3 + (Math.random() * 0.1); // Add noise to gradient
                 
                 if (mix > 0.85) color = '#F48FB1'; // Pink Light (Tips)
                 else if (mix > 0.65) color = '#E91E63'; // Pink
                 else if (mix > 0.45) color = '#D81B60'; // Red-Pink
                 else if (mix > 0.25) color = '#C2185B'; // Deep Pink
                 else color = '#880E4F'; // Deep Red (Shadows)
                 
                 // Occasional sparkle/highlight
                 if (Math.random() > 0.98) color = '#FFCDD2';

                 // Size variation for depth
                 const pSize = Math.random() * 1.8 + 0.6;
                 const pAlpha = 0.7 + Math.random() * 0.3;
                 
                 addParticle(x, y, z, color, pSize, pAlpha);
            }
        }
        
        // Stamen (The glowing gold center)
        for(let i=0; i<350; i++) {
            const r = Math.random() * size * 0.2;
            const theta = Math.random() * Math.PI * 2;
            // Place inside the cup
            const y = cy - size * 0.35 + (Math.random() - 0.5) * 10;
            
            addParticle(
                cx + r*Math.cos(theta), 
                y, 
                cz + r*Math.sin(theta), 
                '#FFD54F', // Gold
                Math.random() * 1.5 + 1, 
                0.9
            );
        }
    };

    const createRoseStem = (startX: number, startY: number, height: number) => {
        // Stem as a dense cylinder cloud
        for(let i=0; i<height; i+=1.5) { 
            const t = i/height;
            // S-curve sway for natural look
            const sway = Math.sin(t * Math.PI) * 30; 
            
            const coreX = startX + sway;
            const coreY = startY - i;
            
            // Create a volume around the core line
            const stemThickness = 3;
            // Add multiple particles per height step for density
            for(let j=0; j<4; j++) {
                const angle = Math.random() * Math.PI * 2;
                const r = Math.random() * stemThickness;
                
                addParticle(
                    coreX + r*Math.cos(angle), 
                    coreY, 
                    r*Math.sin(angle), 
                    '#4CAF50', // Green
                    1.8, 
                    0.8
                );
            }
            
            // Thorns (Randomly placed)
            if (Math.random() > 0.97) {
                const thornDir = Math.random() > 0.5 ? 1 : -1;
                const tx = coreX + thornDir * 4;
                const ty = coreY;
                // Tiny triangle of dots
                addParticle(tx, ty, 0, '#388E3C', 1.5, 0.9);
                addParticle(tx + thornDir*2, ty-1, 0, '#2E7D32', 1.2, 0.9);
            }

            // Leaves (Two main leaves)
            if (Math.abs(t - 0.35) < 0.01 || Math.abs(t - 0.65) < 0.01) {
                const dir = t < 0.5 ? 1 : -1;
                createLeaf(coreX, coreY, dir);
            }
        }
    };

    const createLeaf = (ox: number, oy: number, dir: number) => {
        // Particle cloud leaf
        const length = 60;
        const width = 25;
        const pCount = 300;
        
        for(let i=0; i<pCount; i++) {
            // Parametric leaf shape
            // u goes 0 to 1 (length)
            const u = Math.random();
            // v goes -1 to 1 (width)
            const v = (Math.random() * 2) - 1;
            
            // Leaf width profile: taper at both ends
            const widthAtU = Math.sin(u * Math.PI);
            
            // Local coords
            const lx = u * length * dir;
            const ly = v * width * widthAtU * 0.5; // Flat width
            const lz = v * 5; // Slight depth
            
            // Curl the leaf: Bend down at the tip
            const curlY = Math.pow(u, 2) * 15;
            // Tilt the leaf upwards slightly
            const tiltY = -u * 20; 

            const x = ox + lx;
            const y = oy + ly + tiltY + curlY;
            const z = lz + (Math.sin(u * Math.PI * 2)*5); // Wavy edge
            
            // Color: Veins vs Blade
            // Center line (v near 0) is lighter
            let color = '#43A047';
            if (Math.abs(v) < 0.15) color = '#66BB6A'; // Vein
            if (u > 0.9) color = '#81C784'; // Tip
            
            addParticle(x, y, z, color, 1.5, 0.85);
        }
    };

    const createPrince = (cx: number, cy: number) => {
        // Massive Scale for prominence
        const P_SCALE = 3.5; 
        
        // 1. Head (Dense Yellow Sphere)
        for(let i=0; i<250; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = 14 * P_SCALE * Math.pow(Math.random(), 0.3); // Clustered near surface
            
            const x = cx + r * Math.sin(phi) * Math.cos(theta);
            const y = (cy - 50*P_SCALE) + r * Math.sin(phi) * Math.sin(theta);
            const z = r * Math.cos(phi);
            
            addParticle(x, y, z, '#FDD835', 2.5, 1);
        }

        // 2. Body (Green Cone/Gown)
        for(let i=0; i<450; i++) {
            const h = 40 * P_SCALE;
            const yRel = Math.random() * h; // 0 to 40
            const v = yRel / h;
            const r = 6 * P_SCALE + (18 * P_SCALE * v); // Narrow top, wide bottom
            const theta = Math.random() * Math.PI * 2;
            
            const x = cx + r * Math.cos(theta);
            const y = (cy - 40*P_SCALE) + yRel;
            const z = r * Math.sin(theta);
            
            addParticle(x, y, z, '#66BB6A', 2.2, 0.9);
        }

        // 3. Scarf (Animated stream placeholder)
        // We create invisible particles with 'delay' set, which the animator will pick up
        for(let i=0; i<180; i++) {
            addParticle(cx, cy - 45*P_SCALE, 0, '#FFD54F', 3.5, 1, i);
        }
    };

    const createPlanetSurface = () => {
        // Very large radius to create a gentle horizon curve filling the width
        const R = 2500; 
        const originY = R; // Top of sphere at y=0 (relative to anchor)
        const particleCount = 5000;
        
        // We want a dome distribution
        for(let i=0; i<particleCount; i++) {
            // Random point on sphere cap
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * 0.4; // Wider spread
            
            const x = R * Math.sin(phi) * Math.cos(theta);
            const z = R * Math.sin(phi) * Math.sin(theta);
            const y = originY - R * Math.cos(phi);
            
            // Limit x to screen area + padding to avoid wasting particles too far off screen
            // In virtual coords, screen width is roughly 1500-2000 depending on aspect
            if (Math.abs(x) > 1200) continue;

            // Color Logic (AuraFlow style)
            const princeDist = Math.sqrt(Math.pow(x + 280, 2) + Math.pow(z, 2));
            const roseDist = Math.sqrt(Math.pow(x - 220, 2) + Math.pow(z, 2));
            
            let color = '#1A237E'; // Deep Indigo
            let size = 1.8;
            let alpha = 0.5;

            if (princeDist < 140) {
                 if (Math.random() > 0.5) color = '#43A047'; // Green
                 else if (Math.random() > 0.5) color = '#FDD835'; // Gold
            } else if (roseDist < 120) {
                 if (Math.random() > 0.5) color = '#880E4F'; // Deep Red
                 else if (Math.random() > 0.5) color = '#4A148C'; // Purple
            } else {
                 const noise = Math.random();
                 if (noise > 0.97) { color = '#FFFFFF'; size = 2.5; alpha = 0.9; } // Sparkles
                 else if (noise > 0.88) { color = '#311B92'; }
                 else { color = '#050520'; alpha = 0.4; } // Dark filler
            }
            
            if (color !== '#050520') {
                 // Add subtle wave to y to simulate rough terrain
                 const terrainY = y + Math.sin(x*0.03)*3 + Math.cos(z*0.03)*3;
                 addParticle(x, terrainY, z, color, size, alpha);
            }
        }
    };

    // --- INIT ---
    const initScene = () => {
        particles = [];
        
        // 1. Planet
        createPlanetSurface();
        
        // 2. Little Prince (Left side)
        // Moved further left (-280) due to scale
        createPrince(-280, -10);

        // 3. Rose (Right side, floating high)
        // Moved further right (220) and taller (stem 380 + flower 120 = 500 total height)
        // Virtual height 1000 => 500 is 50% of screen. Visual perspective makes it look approx 1/3 to 1/2.
        const roseX = 220;
        const roseBaseY = -10;
        const stemHeight = 380; 
        const flowerSize = 130; // Slightly larger for cloud impact
        
        createRoseStem(roseX, roseBaseY, stemHeight);
        createRoseFlower(roseX, roseBaseY - stemHeight, 0, flowerSize); 
    };

    initScene();

    // --- ANIMATION LOOP ---
    const animate = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        time += 0.01;

        // Depth Sort
        particles.sort((a, b) => b.z - a.z);

        particles.forEach((p) => {
            let { x, y, z } = p;

            // Scarf Physics
            if (p.delay !== undefined) {
                 const t = p.delay / 180; // 0 to 1 along scarf length
                 
                 // Neck pos is stored in p.ox/oy essentially (base position)
                 const startX = p.ox;
                 const startY = p.oy;
                 
                 // Flow left (-x) with sine wave
                 const flowDist = 400 * scale; 
                 const wave = Math.sin(time * 2 + t * 10) * 30 * scale * t;
                 const waveZ = Math.cos(time * 1.5 + t * 8) * 20 * scale * t;
                 
                 x = startX - (t * flowDist) + (Math.sin(time)*5*scale);
                 y = startY + (t * 80 * scale) + wave; // Gravity
                 z = waveZ;
            }

            // 3D Projection
            // Adjust FOV/Camera for larger scale scene
            const fov = 1000;
            const cameraZ = 1200;
            const scaleProj = fov / (fov + (cameraZ - z)); 
            
            const screenX = centerX + x * scaleProj;
            const screenY = centerY + y * scaleProj;
            
            if (scaleProj > 0) {
                ctx.beginPath();
                ctx.fillStyle = p.color;
                ctx.globalAlpha = p.alpha;
                ctx.arc(screenX, screenY, p.size * scaleProj, 0, Math.PI * 2);
                ctx.fill();
            }
        });
        
        ctx.globalAlpha = 1;
        animationFrameId = requestAnimationFrame(animate);
    };
    
    animationFrameId = requestAnimationFrame(animate);

    const handleResize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        scale = window.innerHeight / V_HEIGHT;
        centerX = window.innerWidth / 2;
        centerY = window.innerHeight * 0.92;
        initScene(); 
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
        window.removeEventListener('resize', handleResize);
        cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-30" />;
};

export default ParticleCharacters;