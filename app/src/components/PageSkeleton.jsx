import React from 'react';

export default function PageSkeleton() {
  return (
    <div style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', width: '100%' }}>
      {/* Header Skeleton */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
        <div>
          <div className="skeleton" style={{ width: '260px', height: '38px', marginBottom: '8px', borderRadius: 'var(--radius-sm)' }} />
          <div className="skeleton" style={{ width: '180px', height: '18px', borderRadius: 'var(--radius-sm)' }} />
        </div>
        <div className="skeleton" style={{ width: '130px', height: '40px', borderRadius: 'var(--radius-md)', display: 'none', '@media (minWidth: 768px)': { display: 'block' } }} />
      </div>
      
      {/* Content Skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-4)' }}>
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="skeleton card" style={{ height: '220px' }} />
        ))}
      </div>
    </div>
  );
}
