/**
 * Contoh Pemakaian:
 * import { WaterWave } from './components/WaterWave';
 *
 * <div className="relative w-48 h-64 rounded-3xl overflow-hidden border-4 border-sky-200">
 *   <WaterWave level={0.65} />
 * </div>
 */

import React, { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';

export interface WaterWaveProps {
  /** Tinggi air antara 0 (kosong) hingga 1 (penuh) */
  level: number;
  className?: string;
}

interface Bubble {
  x: number;
  y: number;
  radius: number;
  speedY: number;
  wobbleOffset: number;
  alpha: number;
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Gambar air statis (tanpa gelombang & gelembung) untuk prefers-reduced-motion. Dipanggil sekali, tanpa loop. */
function drawStaticWater(canvas: HTMLCanvasElement, level: number) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.width / dpr;
  const height = canvas.height / dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  const waterY = height * (1 - level);
  ctx.fillStyle = '#1CB0F6';
  ctx.fillRect(0, waterY, width, height - waterY);
}

export const WaterWave: React.FC<WaterWaveProps> = ({ level, className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const targetLevelRef = useRef<number>(clamp01(level));
  const currentLevelRef = useRef<number>(clamp01(level));
  const prefersReducedMotion = useReducedMotion();

  // Perbarui target ketinggian air setiap prop level berubah.
  // Pada mode reduced motion, langsung gambar ulang secara statis (tanpa loop).
  useEffect(() => {
    targetLevelRef.current = clamp01(level);
    if (prefersReducedMotion) {
      currentLevelRef.current = targetLevelRef.current;
      const canvas = canvasRef.current;
      if (canvas) drawStaticWater(canvas, currentLevelRef.current);
    }
  }, [level, prefersReducedMotion]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Penyesuaian resolusi layar retina (devicePixelRatio)
    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = parent.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Reduced motion: gambar ulang statis setelah ukuran berubah
      if (prefersReducedMotion) {
        currentLevelRef.current = targetLevelRef.current;
        drawStaticWater(canvas, currentLevelRef.current);
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Reduced motion: tidak ada loop requestAnimationFrame sama sekali (hemat baterai)
    if (prefersReducedMotion) {
      return () => window.removeEventListener('resize', resizeCanvas);
    }

    let animationFrameId: number;
    let phaseBack = 0;
    let phaseFront = 0;

    // Inisialisasi gelembung udara di dalam air
    const bubbles: Bubble[] = Array.from({ length: 14 }, () => ({
      x: Math.random(),
      y: Math.random(),
      radius: 2 + Math.random() * 3.5,
      speedY: 0.002 + Math.random() * 0.003,
      wobbleOffset: Math.random() * Math.PI * 2,
      alpha: 0.35 + Math.random() * 0.45,
    }));

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;

      ctx.clearRect(0, 0, width, height);

      // Transisi halus ketinggian air menggunakan linear interpolation (lerp)
      currentLevelRef.current +=
        (targetLevelRef.current - currentLevelRef.current) * 0.06;

      const waterY = height * (1 - currentLevelRef.current);

      // 1. Gelombang lapisan belakang (#1899D6)
      phaseBack += 0.025;
      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let x = 0; x <= width; x += 4) {
        const y =
          waterY +
          Math.sin(x * 0.022 + phaseBack) * 6 +
          Math.cos(x * 0.01 - phaseBack * 0.7) * 3;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fillStyle = '#1899D6';
      ctx.fill();

      // 2. Gelombang lapisan depan (#1CB0F6)
      phaseFront += 0.042;
      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let x = 0; x <= width; x += 4) {
        const y = waterY + Math.sin(x * 0.028 + phaseFront + 1.5) * 4.5;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fillStyle = '#1CB0F6';
      ctx.fill();

      // 3. Gelembung kecil naik dari dasar dan menghilang di permukaan
      if (currentLevelRef.current > 0.05) {
        bubbles.forEach((b) => {
          b.y -= b.speedY;
          const bx = b.x * width + Math.sin(b.y * 25 + b.wobbleOffset) * 4;
          const by = b.y * height;

          // Reset gelembung saat melewati permukaan air atau puncak canvas
          if (by <= waterY + 6 || b.y <= 0) {
            b.y = 0.98;
            b.x = Math.random();
          }

          // Hanya gambar gelembung yang berada di bawah permukaan air
          if (by > waterY + 4) {
            const fadeNearSurface = Math.min(1, (by - waterY) / 20);
            ctx.beginPath();
            ctx.arc(bx, by, b.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${b.alpha * fadeNearSurface})`;
            ctx.fill();
          }
        });
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    // Bersihkan loop animasi dan listener saat komponen unmount
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [prefersReducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      className={`block w-full h-full pointer-events-none ${className}`}
      aria-hidden="true"
    />
  );
};
