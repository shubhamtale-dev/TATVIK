import React from 'react';

export const App: React.FC = () => {
  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', padding: '2rem' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#0f172a' }}>TATVIK</h1>
        <p style={{ color: '#475569', marginTop: '0.5rem' }}>
          AI-Powered Business Data Quality and Research Verification Platform
        </p>
      </header>

      <section
        style={{
          border: '2px dashed #cbd5e1',
          borderRadius: '12px',
          padding: '3rem',
          textAlign: 'center',
          backgroundColor: '#f8fafc',
          marginBottom: '2rem',
        }}
      >
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b' }}>
          Upload Business Dataset
        </h2>
        <p style={{ color: '#64748b', margin: '0.5rem 0 1.5rem' }}>
          Drag & drop CSV or Excel (.xlsx, .xls) files to audit duplicates, format issues, and verify research evidence.
        </p>
        <button
          style={{
            backgroundColor: '#2563eb',
            color: '#fff',
            padding: '0.75rem 1.5rem',
            borderRadius: '8px',
            border: 'none',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Select File to Audit
        </button>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        <div style={{ padding: '1.5rem', borderRadius: '8px', backgroundColor: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontWeight: 600, color: '#0f172a' }}>1. Ingestion & Deduplication</h3>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.5rem' }}>
            Identify duplicate records, missing info, and inconsistent date/currency formats across rows.
          </p>
        </div>
        <div style={{ padding: '1.5rem', borderRadius: '8px', backgroundColor: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontWeight: 600, color: '#0f172a' }}>2. AI Research Verification</h3>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.5rem' }}>
            Bind research citations, verify entity data against web sources, and flag logical discrepancies.
          </p>
        </div>
        <div style={{ padding: '1.5rem', borderRadius: '8px', backgroundColor: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontWeight: 600, color: '#0f172a' }}>3. Review, Track & Export</h3>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.5rem' }}>
            Review suggested diffs, accept/reject recommendations, maintain audit trails, and export cleaned data.
          </p>
        </div>
      </div>
    </div>
  );
};

export default App;
