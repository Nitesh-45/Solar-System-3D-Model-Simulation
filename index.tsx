import React, { useMemo, useRef, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Float, Trail, Sphere, Text, Html } from '@react-three/drei';
import * as THREE from 'three';

// --- Constants & Config ---
const CONFIG = {
  nucleusRadius: 1.5,
  electronSpeedBase: 1,
  colors: {
    proton: '#ff4d4d',
    neutron: '#4d4dff',
    electron: '#ffff00',
    orbit: '#ffffff',
  }
};

// --- Components ---

/**
 * Individual Nucleon (Proton or Neutron)
 */
const Nucleon: React.FC<{ position: [number, number, number]; type: 'proton' | 'neutron' }> = ({ position, type }) => {
  const color = type === 'proton' ? CONFIG.colors.proton : CONFIG.colors.neutron;
  
  return (
    <Sphere args={[0.4, 32, 32]} position={position}>
      <meshStandardMaterial 
        color={color} 
        roughness={0.3} 
        metalness={0.8}
        emissive={color}
        emissiveIntensity={0.2}
      />
    </Sphere>
  );
};

/**
 * The Nucleus Cluster
 */
const Nucleus = ({ protonCount = 6, neutronCount = 6 }) => {
  const [active, setActive] = useState(false);
  const [hovered, setHover] = useState(false);

  // Change cursor on hover
  useEffect(() => {
    document.body.style.cursor = hovered ? 'pointer' : 'auto';
  }, [hovered]);

  const particles = useMemo(() => {
    const items = [];
    const total = protonCount + neutronCount;
    
    // Generate packed sphere positions roughly
    for (let i = 0; i < total; i++) {
      const isProton = i < protonCount;
      // Simple random packing within a radius
      const phi = Math.acos(-1 + (2 * i) / total);
      const theta = Math.sqrt(total * Math.PI) * phi;
      
      const r = 0.6 * Math.cbrt(i + 1); // Spread out slightly
      
      // Add some jitter
      const x = r * Math.sin(phi) * Math.cos(theta) + (Math.random() - 0.5) * 0.2;
      const y = r * Math.sin(phi) * Math.sin(theta) + (Math.random() - 0.5) * 0.2;
      const z = r * Math.cos(phi) + (Math.random() - 0.5) * 0.2;

      items.push({
        position: [x, y, z] as [number, number, number],
        type: isProton ? 'proton' : 'neutron' as const,
        id: i
      });
    }
    return items;
  }, [protonCount, neutronCount]);

  return (
    <Float speed={2} rotationIntensity={0.2} floatIntensity={0.2}>
      <group 
        onClick={(e) => { e.stopPropagation(); setActive(!active); }}
        onPointerOver={(e) => { e.stopPropagation(); setHover(true); }}
        onPointerOut={(e) => { e.stopPropagation(); setHover(false); }}
      >
        {particles.map((p) => (
          <Nucleon key={p.id} position={p.position} type={p.type} />
        ))}
        {/* Inner Glow */}
        <pointLight position={[0, 0, 0]} intensity={2} distance={5} color="#ffffff" />
        
        {/* Information Label */}
        {active && (
          <Html position={[1.5, 1.5, 0]} distanceFactor={10} zIndexRange={[100, 0]}>
            <div className="nucleus-tooltip">
              <div className="tooltip-title">Nucleus</div>
              <div className="tooltip-row">
                <span className="dot proton-dot"></span>
                Protons: <strong>{protonCount}</strong>
              </div>
              <div className="tooltip-row">
                <span className="dot neutron-dot"></span>
                Neutrons: <strong>{neutronCount}</strong>
              </div>
            </div>
          </Html>
        )}
      </group>
    </Float>
  );
};

/**
 * Single Electron with Orbit logic
 */
const Electron: React.FC<{ radius: number; speed: number; offset: number; tilt: [number, number, number]; color: string }> = ({ radius, speed, offset, tilt, color }) => {
  const ref = useRef<THREE.Group>(null);
  const sphereRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (ref.current) {
      // Rotate the entire orbit group to simulate movement along the path
      // Note: simpler to rotate the container group on one axis if the group itself is tilted
      ref.current.rotation.z = clock.getElapsedTime() * speed + offset;
    }
  });

  return (
    <group rotation={tilt}> 
      {/* This group represents the plane of the orbit. We rotate inside it. */}
      <group ref={ref}>
         {/* The electron is offset by radius */}
        <mesh position={[radius, 0, 0]} ref={sphereRef}>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshBasicMaterial color={color} />
          <Trail
            width={0.8} // Width of the trail
            length={8} // Length of the trail
            color={new THREE.Color(color)} // Default
            attenuation={(t) => t * t} // Tapering
          >
             {/* Invisible mesh to anchor trail if needed, but Trail wraps mesh children */}
             <mesh visible={false} />
          </Trail>
        </mesh>
      </group>
      
      {/* Visual Orbit Ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius - 0.02, radius + 0.02, 64]} />
        <meshBasicMaterial color={color} opacity={0.1} transparent side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

/**
 * Main 3D Scene
 */
const AtomScene = () => {
  // Let's simulate a stylized Carbon atom (6 protons, 6 neutrons, 6 electrons)
  // Electrons: 2 inner, 4 outer
  
  const electrons = useMemo(() => [
    // Inner Shell (K)
    { radius: 3, speed: 2, offset: 0, tilt: [Math.PI / 3, 0, 0], color: '#00ffff' },
    { radius: 3, speed: 2.2, offset: Math.PI, tilt: [-Math.PI / 3, 0, 0], color: '#00ffff' },
    // Outer Shell (L)
    { radius: 5, speed: 1.5, offset: 0, tilt: [Math.PI / 4, Math.PI / 4, 0], color: '#ffff00' },
    { radius: 5, speed: 1.4, offset: Math.PI / 2, tilt: [-Math.PI / 4, -Math.PI / 4, 0], color: '#ffff00' },
    { radius: 5, speed: 1.6, offset: Math.PI, tilt: [0, Math.PI / 2, 0], color: '#ffff00' },
    { radius: 5, speed: 1.3, offset: Math.PI * 1.5, tilt: [Math.PI / 2, 0, Math.PI / 4], color: '#ffff00' },
  ], []);

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="blue" />
      
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

      <group>
        <Nucleus protonCount={6} neutronCount={6} />
        
        {electrons.map((e, i) => (
          <Electron 
            key={i}
            radius={e.radius}
            speed={e.speed}
            offset={e.offset}
            tilt={e.tilt as [number, number, number]}
            color={e.color}
          />
        ))}
      </group>
      
      <OrbitControls enablePan={false} minDistance={5} maxDistance={20} />
    </>
  );
};

/**
 * UI Overlay
 */
const UI = () => {
  return (
    <div className="ui-layer">
      <h1>Carbon-12</h1>
      <div className="stat">Protons: <span>6</span></div>
      <div className="stat">Neutrons: <span>6</span></div>
      <div className="stat">Electrons: <span>6</span></div>
      <div className="stat">Mass: <span>12.011 u</span></div>
      <div className="controls-hint">
        Left Click: Rotate<br/>
        Click Nucleus: Inspect<br/>
        Scroll: Zoom
      </div>
    </div>
  );
};

const App = () => {
  return (
    <>
      <UI />
      <Canvas camera={{ position: [0, 0, 12], fov: 45 }}>
        <color attach="background" args={['#050505']} />
        <AtomScene />
      </Canvas>
    </>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);