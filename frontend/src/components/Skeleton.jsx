import React from 'react';

// ── Skeleton base ───────────────────────────────────────────────────────────
const Skeleton = ({ width = '100%', height = '16px', borderRadius = '6px', style = {} }) => (
  <div style={{
    width, height, borderRadius,
    background: 'linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%)',
    backgroundSize: '200% 100%',
    animation: 'skeletonShimmer 1.5s ease-in-out infinite',
    ...style,
  }} />
);

// ── Presets ──────────────────────────────────────────────────────────────────

// Skeleton para KPI cards
export const SkeletonKPIs = ({ count = 4 }) => (
  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${count}, 1fr)`, gap: '14px', marginBottom: '24px' }}>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} style={{ background: 'white', borderRadius: '12px', padding: '18px 20px', border: '0.5px solid #e5e7eb' }}>
        <Skeleton width="60%" height="12px" style={{ marginBottom: '10px' }} />
        <Skeleton width="45%" height="28px" style={{ marginBottom: '6px' }} />
        <Skeleton width="80%" height="11px" />
      </div>
    ))}
  </div>
);

// Skeleton para tabela
export const SkeletonTable = ({ rows = 5, cols = 6 }) => (
  <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e7eb', overflow: 'hidden' }}>
    {/* Header */}
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '12px', padding: '14px 16px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} width={`${60 + Math.random() * 30}%`} height="10px" />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, r) => (
      <div key={r} style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '12px', padding: '14px 16px', borderBottom: '1px solid #f3f4f6' }}>
        {Array.from({ length: cols }).map((_, c) => (
          <Skeleton key={c} width={`${40 + Math.random() * 50}%`} height="13px" />
        ))}
      </div>
    ))}
  </div>
);

// Skeleton para gráfico
export const SkeletonChart = ({ height = 200 }) => (
  <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '0.5px solid #e5e7eb' }}>
    <Skeleton width="30%" height="14px" style={{ marginBottom: '16px' }} />
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: `${height}px`, padding: '0 20px' }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} width="100%" height={`${20 + Math.random() * 70}%`} borderRadius="4px 4px 0 0" />
      ))}
    </div>
  </div>
);

// Skeleton para página inteira
export const SkeletonPage = () => (
  <div style={{ padding: '24px', background: '#f8f9fa', minHeight: '100vh' }}>
    {/* Header */}
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
      <div>
        <Skeleton width="200px" height="22px" style={{ marginBottom: '8px' }} />
        <Skeleton width="300px" height="14px" />
      </div>
      <Skeleton width="140px" height="38px" borderRadius="8px" />
    </div>
    <SkeletonKPIs count={4} />
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
      <SkeletonChart />
      <SkeletonChart />
    </div>
    <SkeletonTable />
    <style>{`
      @keyframes skeletonShimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
    `}</style>
  </div>
);

export default Skeleton;
