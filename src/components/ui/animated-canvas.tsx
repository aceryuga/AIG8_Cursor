import React, { useEffect, useRef } from 'react';

// Easing functions
const ease = {
  quint: {
    in: (t: number, b: number, c: number, d: number) => {
      t /= d;
      return c * t * t * t * t * t + b;
    },
    out: (t: number, b: number, c: number, d: number) => {
      t = t / d - 1;
      return c * (t * t * t * t * t + 1) + b;
    }
  }
};

// Linear interpolation
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

interface AnimatedCanvasProps {
  count?: number;
  lineColor?: string;
  heightMultiplier?: number;
  speed?: number;
  lineWidth?: number;
  className?: string;
  direction?: 'left-to-right' | 'right-to-left';
}

const AnimatedCanvas: React.FC<AnimatedCanvasProps> = ({
  count = 40,
  lineColor = 'hsl(180, 70%, 50%)',
  heightMultiplier = 0.4,
  speed = 0.0001,
  lineWidth = 1,
  className = "",
  direction = 'left-to-right'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Line drawing function
    const line = (x1: number, y1: number, x2: number, y2: number, close = false) => {
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      if (close) ctx.closePath();
    };

    // Animation loop
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      
      const c = 1 / count;
      const time_ = Date.now() * speed;
      
      for (let i = 0; i < count; i++) {
        const t_ = i * c;
        const time = (time_ + t_) % 1;
        const t = ease.quint.in(time, 0, 1, 1);
        const ty = ease.quint.out(t, 0, 1, 1);
        // Adjust x based on direction
        const x = direction === 'left-to-right' 
          ? lerp(canvas.width, 0, t)
          : lerp(0, canvas.width, t);
        const y = ty * canvas.height * heightMultiplier;
        line(x, y, x, canvas.height - y, false);
      }
      
      ctx.stroke();
      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    // Cleanup
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [count, lineColor, heightMultiplier, speed, lineWidth, direction]);

  return <canvas ref={canvasRef} className={className} style={{ display: 'block' }} />;
};

export { AnimatedCanvas };