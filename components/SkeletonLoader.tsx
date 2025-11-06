import React from 'react';

const SkeletonCard: React.FC = () => (
  <div className="relative themed-card p-4 overflow-hidden">
    <div className="flex items-start gap-4">
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[var(--bg-secondary)] mt-1"></div>
      <div className="flex-1 overflow-hidden">
        <div className="flex justify-between items-center">
          <div className="h-6 w-3/4 bg-[var(--bg-secondary)] rounded"></div>
          <div className="w-2.5 h-2.5 bg-[var(--bg-secondary)] rounded-full shrink-0"></div>
        </div>
        <div className="h-4 w-1/3 bg-[var(--bg-secondary)] rounded mt-1.5"></div>
        <div className="space-y-2 mt-3">
          <div className="h-4 w-full bg-[var(--bg-secondary)] rounded"></div>
          <div className="h-4 w-5/6 bg-[var(--bg-secondary)] rounded"></div>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-4">
          <div className="h-5 w-16 bg-[var(--bg-secondary)] rounded-full"></div>
          <div className="h-5 w-20 bg-[var(--bg-secondary)] rounded-full"></div>
        </div>
      </div>
    </div>
    <div className="absolute inset-0 shimmer-bg"></div>
  </div>
);

const SkeletonLoader: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} />
      ))}
    </div>
  );
};

export default SkeletonLoader;