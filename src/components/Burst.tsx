/**
 * Contoh Pemakaian:
 * import { useState } from 'react';
 * import { Burst } from './components/Burst';
 *
 * const [burstTrigger, setBurstTrigger] = useState(0);
 * <button onClick={() => setBurstTrigger((c) => c + 1)}>Minum +375ml</button>
 * <Burst trigger={burstTrigger} />
 */

import React, { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export interface BurstProps {
  /** Ubah nilai angka ini untuk memicu ledakan konfeti baru */
  trigger: number;
  className?: string;
}

type ParticleShape = 'square' | 'circle' | 'star';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  shape: ParticleShape;
  rotation: number;
  vRotation: number;
}

const COLORS = ['#FFC800', '#58CC02', '#CE82FF', '#FF9600'];
const SHAPES: ParticleShape[] = ['square', 'circle', 'star'];
const DURATION_MS = 1500;

/** Fungsi bantu menggambar bintang 5 sudut pada Canvas 2D */
function drawFivePointStar(
  ctx: CanvasRenderingContext2D,
  radius: number
) {
  const spikes = 5;
  const innerRadius = radius * 0.45;
  let rot = (Math.PI / 2) * 3;
  const step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(0, -radius);
  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(Math.cos(rot) * radius, Math.sin(rot) * radius);
    rot += step;
    ctx.lineTo(Math.cos(rot) * innerRadius, Math.sin(rot) * innerRadius);
    rot += step;
  }
  ctx.closePath();
  ctx.fill();
}

export const Burst: React.FC<BurstProps> = ({ trigger, className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    // Jangan jalankan saat mount awal (trigger === 0) atau jika reduced motion aktif
    if (trigger <= 0 || prefersReducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width || window.innerWidth;
    const height = rect.height || window.innerHeight;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const originX = width / 2;
    const originY = height * 0.45;

    // Buat 55 partikel acak memancar dari titik tengah
    const particles: Particle[] = Array.from({ length: 55 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 8;
      return {
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3.5, // Sedikit dorongan ke atas
        size: 5 + Math.random() * 5,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
        rotation: Math.random() * Math.PI * 2,
        vRotation: (Math.random() - 0.5) * 0.25,
      };
    });

    const startTime = performance.now();
    let animationFrameId: number;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / DURATION_MS);

      ctx.clearRect(0, 0, width, height);

      if (progress < 1) {
        const alpha = 1 - progress; // Memudar bertahap selama 1.5 detik

        particles.forEach((p) => {
          // Fisika gravitasi dan hambatan udara ringan
          p.vy += 0.28;
          p.vx *= 0.985;
          p.x += p.vx;
          p.y += p.vy;
          p.rotation += p.vRotation;

          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.globalAlpha = alpha;
          ctx.fillStyle = p.color;

          if (p.shape === 'square') {
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          } else if (p.shape === 'circle') {
            ctx.beginPath();
            ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
            ctx.fill();
          } else {
            drawFivePointStar(ctx, p.size * 0.7);
          }

          ctx.restore();
        });

        animationFrameId = requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, width, height);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    // Bersihkan requestAnimationFrame saat trigger berubah atau komponen unmount
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [trigger, prefersReducedMotion]);

  // Fallback prefers-reduced-motion: satu kali kilatan lembut (0.8 detik), bukan berkedip terus-menerus
  if (prefersReducedMotion) {
    return trigger > 0 ? (
      <motion.div
        key={trigger}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.25, 0] }}
        transition={{ duration: 0.8 }}
        className={`fixed inset-0 z-50 pointer-events-none bg-amber-300 ${className}`}
        aria-hidden="true"
      />
    ) : null;
  }

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 w-full h-full pointer-events-none z-50 ${className}`}
      aria-hidden="true"
    />
  );
};
