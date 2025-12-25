export interface Point {
  x: number;
  y: number;
}

export interface FireworkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  color: string;
  decay: number;
  // New properties for advanced effects
  useTrail?: boolean;
  trail?: Point[]; // History of positions
  size?: number;
  shimmer?: boolean; // Determines if the particle flickers
  shape?: 'circle' | 'heart'; // Defines the particle shape
}

export interface Firework {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  angle: number;
  hue: number;
  brightness: number;
  distanceToTarget: number;
  distanceTraveled: number;
  coordinates: Point[];
  coordinateCount: number;
  exploded: boolean;
  type?: 'standard' | 'cosmic' | 'streamer' | 'palm' | 'ring' | 'heart' | 'glitter' | 'galaxy' | 'gold_flower' | 'strobe_flower' | 'violet_burst' | 'floral_burst' | 'cyan_flower' | 'neon_flower' | 'love_burst' | 'tree_burst' | 'custom_shape'; // Expanded types
  // Override for specific effects
  customColor?: string;
  trailWidth?: number;
}

export interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
  blinkSpeed: number;
}

export interface Meteor {
  x: number;
  y: number;
  length: number;
  speed: number;
  angle: number;
  opacity: number;
}

// Handle for imperative actions on the canvas
export interface FireworksCanvasHandle {
  triggerFinale: () => void;
  getCapturedShape: () => Point[] | null; // Retrieve normalized points from multi-stroke drawing
  clearDrawingCanvas: () => void; // Clear current drawing paths
}