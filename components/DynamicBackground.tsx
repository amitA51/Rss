import React, { useEffect, useRef, useContext, useCallback } from 'react';
import { AppContext } from '../state/AppContext';

interface Particle {
    x: number;
    y: number;
    radius: number;
    vx: number;
    vy: number;
    alpha: number;
    decay: number;
}

const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : null;
};

const DynamicBackground: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { state } = useContext(AppContext);
    const accentColor = state.settings.themeSettings.accentColor;
    // FIX: The `useRef` hook requires an initial value. Providing `null` is a standard pattern for refs that are populated later.
    const animationFrameId = useRef<number | null>(null);

    const createParticles = useCallback((count: number, canvasWidth: number, canvasHeight: number) => {
        const particles: Particle[] = [];
        for (let i = 0; i < count; i++) {
            particles.push({
                x: Math.random() * canvasWidth,
                y: Math.random() * canvasHeight,
                radius: Math.random() * 1.5 + 0.5,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                alpha: Math.random() * 0.5 + 0.1,
                decay: Math.random() * 0.01 + 0.005,
            });
        }
        return particles;
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const rgbColor = hexToRgb(accentColor);
        if (!rgbColor) return;
        const particleColor = `${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}`;

        let particles: Particle[] = [];

        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            const particleCount = Math.floor((canvas.width * canvas.height) / 15000);
            particles = createParticles(particleCount, canvas.width, canvas.height);
        };
        
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            particles.forEach((p, i) => {
                p.x += p.vx;
                p.y += p.vy;
                p.alpha -= p.decay;

                if (p.alpha <= 0) {
                    particles[i] = {
                        ...createParticles(1, canvas.width, canvas.height)[0],
                        x: Math.random() * canvas.width,
                        y: canvas.height,
                        vy: -Math.random() * 0.5 - 0.1,
                    };
                }

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2, false);
                ctx.fillStyle = `rgba(${particleColor}, ${p.alpha})`;
                ctx.fill();

                if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
                if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
            });

            animationFrameId.current = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
        };
    }, [accentColor, createParticles]);

    return <canvas ref={canvasRef} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: -1, pointerEvents: 'none' }} />;
};

export default React.memo(DynamicBackground);