import React from 'react';
import { Construction } from 'lucide-react';

export default function EnConstruccion({ titulo }) {
  return (
    <div style={{
      padding: 24, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center',
    }} className="animate-fade">
      <Construction size={40} color="#8AAABB" style={{ marginBottom: 12 }} />
      <h2 style={{ fontSize: 17, fontWeight: 800, color: '#0D1B2A' }}>{titulo}</h2>
      <p style={{ fontSize: 13, color: '#8AAABB', marginTop: 6, maxWidth: 360 }}>
        Este módulo todavía no está construido. Dile a Claude qué necesitas aquí y lo armamos.
      </p>
    </div>
  );
}
