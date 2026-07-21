const TIPO_LABEL = { YAPE: 'Yape', PLIN: 'Plin', CUENTA_BANCARIA: 'Cuenta bancaria' };

export function formatMetodosPagoTexto(metodos) {
  if (!metodos || metodos.length === 0) return '';
  const lineas = metodos.map(m => {
    const label = TIPO_LABEL[m.tipo] || m.tipo;
    if (m.tipo === 'CUENTA_BANCARIA') {
      return `- ${label} ${m.banco || ''}: ${m.numero}${m.titular ? ` (${m.titular})` : ''}`;
    }
    return `- ${label}: ${m.numero}${m.titular ? ` (${m.titular})` : ''}`;
  });
  return `\n\nPuedes pagar a cualquiera de estas opciones:\n${lineas.join('\n')}`;
}
