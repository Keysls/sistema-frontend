import React from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2 } from 'lucide-react';

// ─── Btn ────────────────────────────────────────────────────────
const VARIANTS = {
  primary: { background: '#2563EB', color: '#fff',    border: 'none', fontWeight: 700 },
  ghost:   { background: '#F1F5F9', color: '#64748B', border: 'none', fontWeight: 500 },
  danger:  { background: 'var(--red-bg)', color: 'var(--red)', border: '1px solid var(--red)', fontWeight: 600 },
};
const SIZES = {
  sm: { height: 30, padding: '0 10px', fontSize: 12 },
  md: { height: 44, padding: '0 20px', fontSize: 14 },
};

export function Btn({ variant = 'primary', size = 'md', icon, loading, disabled, children, style, ...rest }) {
  return (
    <button
      disabled={disabled || loading}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        borderRadius: 10, cursor: (disabled || loading) ? 'not-allowed' : 'pointer',
        opacity: (disabled || loading) ? 0.6 : 1, whiteSpace: 'nowrap',
        ...VARIANTS[variant], ...SIZES[size], ...style,
      }}
      {...rest}
    >
      {loading ? <Loader2 size={13} className="spin" /> : icon}
      {children}
    </button>
  );
}

// ─── Badge ──────────────────────────────────────────────────────
const BADGE_COLORS = {
  blue:   { bg: 'var(--blue-bg)',   fg: 'var(--blue)'   },
  green:  { bg: 'var(--green-bg)',  fg: 'var(--green)'  },
  red:    { bg: 'var(--red-bg)',    fg: 'var(--red)'    },
  yellow: { bg: 'var(--yellow-bg)', fg: 'var(--yellow)' },
};

export function Badge({ color = 'blue', children }) {
  const c = BADGE_COLORS[color] || BADGE_COLORS.blue;
  return (
    <span style={{
      display: 'inline-block', fontSize: 11, fontWeight: 700,
      padding: '2px 8px', borderRadius: 20, background: c.bg, color: c.fg,
    }}>
      {children}
    </span>
  );
}

// ─── Input ──────────────────────────────────────────────────────
export function Input({ label, required, style, ...rest }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      {label && (
        <label style={{
          fontSize: 11, fontWeight: 700, color: '#3B5B7A',
          textTransform: 'uppercase', letterSpacing: '0.04em',
        }}>
          {label}{required && <span style={{ color: '#DC2626' }}> *</span>}
        </label>
      )}
      <input
        style={{
          width: '100%', height: 40, padding: '0 12px', background: '#F4F8FC',
          border: '1px solid #DCE6F0', borderRadius: 8, color: '#0D1B2A',
          fontSize: 13.5, outline: 'none', ...style,
        }}
        {...rest}
      />
    </div>
  );
}

// ─── Select ─────────────────────────────────────────────────────
export function Select({ label, required, children, style, ...rest }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      {label && (
        <label style={{
          fontSize: 11, fontWeight: 700, color: '#3B5B7A',
          textTransform: 'uppercase', letterSpacing: '0.04em',
        }}>
          {label}{required && <span style={{ color: '#DC2626' }}> *</span>}
        </label>
      )}
      <select
        style={{
          width: '100%', height: 40, padding: '0 12px', background: '#F4F8FC',
          border: '1px solid #DCE6F0', borderRadius: 8, color: '#0D1B2A',
          fontSize: 13.5, outline: 'none', ...style,
        }}
        {...rest}
      >
        {children}
      </select>
    </div>
  );
}

// ─── Modal ──────────────────────────────────────────────────────
export function Modal({ open, onClose, title, subtitle, width = 480, children }) {
  if (!open) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        width: '100vw', height: '100vh',
        background: 'rgba(13,27,42,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 2000, padding: 16,
      }}
    >
      <div
        style={{
          width: '100%', maxWidth: width, background: '#FFFFFF',
          borderRadius: 16, boxShadow: '0 24px 64px rgba(13,27,42,0.28)',
          maxHeight: '90vh', display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
        className="animate-fade"
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          padding: '22px 24px 18px', borderBottom: '1px solid #EEF2F6',
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0D1B2A' }}>{title}</h3>
            {subtitle && (
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#8AAABB' }}>{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              color: '#94A3B8', display: 'flex', padding: 4, borderRadius: 6,
              marginTop: 2, marginLeft: 12, flexShrink: 0,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '22px 24px', overflowY: 'auto' }}>{children}</div>
      </div>
    </div>,
    document.body
  );
}

// ─── ModalFooter — pie con divisor, para usar dentro de <Modal> ──
export function ModalFooter({ children }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'flex-end', gap: 12,
      padding: '18px 24px', borderTop: '1px solid #EEF2F6',
      marginTop: 6, marginLeft: -24, marginRight: -24, marginBottom: -22,
    }}>
      {React.Children.map(children, (child) =>
        child ? React.cloneElement(child, {
          style: { flex: 1, ...(child.props.style || {}) },
        }) : child
      )}
    </div>
  );
}

// ─── Table / Tr / Td ──────────────────────────────────────────────
export function Table({ headers = [], loading, children }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: 'var(--bg-3)' }}>
            {headers.map((h, i) => (
              <th key={i} style={{
                padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700,
                color: 'var(--txt-3)', textTransform: 'uppercase', letterSpacing: '.05em',
                borderBottom: '1px solid var(--border)',
              }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={headers.length} style={{ padding: 28, textAlign: 'center', color: 'var(--txt-3)', fontSize: 13 }}>Cargando...</td></tr>
          ) : children}
        </tbody>
      </table>
    </div>
  );
}

export function Tr({ children, ...rest }) {
  return (
    <tr style={{ borderBottom: '1px solid var(--border)' }} {...rest}>
      {children}
    </tr>
  );
}

export function Td({ children, style, ...rest }) {
  return (
    <td style={{ padding: '10px 14px', fontSize: 13, color: 'var(--txt)', ...style }} {...rest}>
      {children}
    </td>
  );
}