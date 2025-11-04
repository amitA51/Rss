import React from 'react';

const DailyProgressCircle: React.FC<{ percentage: number; size?: number }> = ({ percentage, size = 48 }) => {
    const strokeWidth = 4;
    const radius = (size / 2) - (strokeWidth); // Adjusted for better visual balance
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percentage / 100) * circumference;

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg className="w-full h-full" viewBox={`0 0 ${size} ${size}`}>
                <circle
                    stroke="var(--border-primary)"
                    fill="transparent"
                    strokeWidth={strokeWidth}
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                />
                <circle
                    stroke="url(#progress-gradient)"
                    fill="transparent"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                    style={{
                        strokeDasharray: circumference,
                        strokeDashoffset: offset,
                        transform: 'rotate(-90deg)',
                        transformOrigin: '50% 50%',
                        transition: 'stroke-dashoffset 0.5s cubic-bezier(0.65, 0, 0.35, 1)'
                    }}
                />
                <defs>
                    <linearGradient id="progress-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="var(--dynamic-accent-start)" />
                        <stop offset="100%" stopColor="var(--dynamic-accent-end)" />
                    </linearGradient>
                </defs>
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                {Math.round(percentage)}%
            </span>
        </div>
    );
};

export default DailyProgressCircle;
