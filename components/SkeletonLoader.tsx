import React from 'react';

const SkeletonCard: React.FC = () => (
  <div className="relative bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl p-5 shadow-lg overflow-hidden">
    <div className="flex flex-col space-y-4">
      <div className="flex justify-between items-start">
        <div className="flex-1 pr-4 space-y-3">
          <div className="h-4 bg-[var(--bg-secondary)] rounded w-3/4"></div>
          <div className="h-3 bg-[var(--bg-secondary)] rounded w-full"></div>
          <div className="h-3 bg-[var(--bg-secondary)] rounded w-5/6"></div>
        </div>
        <div className="h-6 w-6 bg-[var(--bg-secondary)] rounded-full"></div>
      </div>
      <div className="flex items-center justify-between pt-2">
         <div className="flex gap-2">
            <div className="h-5 w-16 bg-[var(--bg-secondary)] rounded-full"></div>
            <div className="h-5 w-20 bg-[var(--bg-secondary)] rounded-full"></div>
        </div>
        <div className="h-3 w-24 bg-[var(--bg-secondary)] rounded"></div>
      </div>
    </div>
    <div className="shimmer-bg"></div>
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