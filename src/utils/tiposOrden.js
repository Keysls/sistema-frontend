const SERVICIO_LABEL = { I: 'Internet', C: 'Cable', D: 'Dúo' };

function construirTiposOrden() {
  const base = {
    I: [
      ['INSTALACION', 'Instalación'], ['ALTA_SERVICIO', 'Alta de servicio'], ['ATENCION_NOC', 'Atención NOC'],
      ['AVERIA', 'Avería'], ['BAJA_SERVICIO', 'Baja de servicio'], ['CAMBIO_CONTRASENA', 'Cambio de contraseña'],
      ['CAMBIO_DOMICILIO', 'Cambio de domicilio'], ['CAMBIO_EQUIPO', 'Cambio de equipo'], ['CAMBIO_PLAN', 'Cambio de plan'],
      ['CAMBIO_TITULAR', 'Cambio de titular'], ['CORTE_SOLICITUD', 'Corte a solicitud'], ['CORTE_DEUDA', 'Corte por deuda'],
      ['RECONEXION', 'Reconexión'], ['RETIRO_EQUIPO', 'Retiro de equipo'], ['TRASLADO', 'Traslado'],
    ],
    C: [
      ['INSTALACION', 'Instalación'], ['ALTA_SERVICIO', 'Alta de servicio'], ['AVERIA', 'Avería'],
      ['CAMBIO_DOMICILIO', 'Cambio de domicilio'], ['CAMBIO_PLAN', 'Cambio de plan'], ['CAMBIO_TITULAR', 'Cambio de titular'],
      ['CORTE_SOLICITUD', 'Corte a solicitud'], ['CORTE_DEUDA', 'Corte por deuda'], ['INSTALACION_ANEXO', 'Instalación de anexo'],
      ['MIGRACION_FTTH', 'Migración FTTH'], ['RECONEXION', 'Reconexión'], ['RETIRO_EQUIPO', 'Retiro de equipo'],
      ['SUPERVISION', 'Supervisión'], ['TRASLADO', 'Traslado'],
    ],
    D: [
      ['INSTALACION', 'Instalación'], ['ALTA_SERVICIO', 'Alta de servicio'], ['AVERIA', 'Avería'],
      ['CAMBIO_DOMICILIO', 'Cambio de domicilio'], ['CAMBIO_EQUIPO', 'Cambio de equipo'], ['CAMBIO_PLAN', 'Cambio de plan'],
      ['CAMBIO_TITULAR', 'Cambio de titular'], ['CORTE_SOLICITUD', 'Corte a solicitud'], ['CORTE_DEUDA', 'Corte por deuda'],
      ['RECONEXION', 'Reconexión'], ['RETIRO_EQUIPO', 'Retiro de equipo'], ['TRASLADO', 'Traslado'], ['BAJA_SERVICIO', 'Baja de servicio'],
    ],
  };
  const cfg = {};
  for (const [suf, lista] of Object.entries(base)) {
    for (const [key, label] of lista) {
      cfg[`${key}_${suf}`] = { label, servicio: SERVICIO_LABEL[suf], sufijo: suf };
    }
  }
  return cfg;
}

export const TIPOS_ORDEN = construirTiposOrden();
export { SERVICIO_LABEL };

export function tipoLabel(codigo) {
  return TIPOS_ORDEN[codigo]?.label || codigo || '—';
}

export function tipoLabelConServicio(codigo) {
  const info = TIPOS_ORDEN[codigo];
  if (!info) return codigo || '—';
  return `${info.label} · ${info.servicio}`;
}
