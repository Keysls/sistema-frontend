import React, { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Users, Plus, Pencil, Search, Loader2, CheckCircle2, AlertCircle, UserX, UserCheck } from 'lucide-react';
import { clientesApi, reniecApi } from '../services/api';
import { Btn, Badge, Modal, Table, Tr, Td } from '../components/ui';

const inputStyle = {
  width: '100%', height: 36, padding: '0 12px', background: 'var(--bg-3)',
  border: '1px solid var(--border-2)', borderRadius: 6, color: 'var(--txt)',
  fontSize: 13, outline: 'none',
};

function Campo({ label, required, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <label style={{ fontSize: 13, fontWeight: 600, color: '#1E3A5F' }}>
          {label}{required && <span> *</span>}
        </label>
      )}
      {children}
    </div>
  );
}

const campoInputStyle = {
  width: '100%', height: 40, padding: '0 12px', background: '#E1EBF5',
  border: '1px solid #C9DAEA', borderRadius: 8, color: '#1E3A5F',
  fontSize: 13.5, outline: 'none', boxSizing: 'border-box',
};

function SeccionLabel({ children }) {
  return (
    <div style={{
      fontSize: 11.5, fontWeight: 700, color: '#2563EB',
      textTransform: 'uppercase', letterSpacing: '0.05em',
      paddingBottom: 8, borderBottom: '1px solid #E2ECF4', marginBottom: 2,
    }}>
      {children}
    </div>
  );
}

const emptyForm = { id: null, dniRuc: '', nombres: '', apellidos: '', telefono: '', email: '', direccion: '', latitud: '', longitud: '' };

// ─── Consulta RENIEC/SUNAT con debounce ─────────────────────────
function useDniLookup(setForm) {
  const [estado, setEstado] = useState('idle'); // idle | loading | ok | error
  const [hint, setHint] = useState('');
  const timerRef = useRef(null);

  const consultar = (valor) => {
    clearTimeout(timerRef.current);
    setHint('');
    const esDni = /^\d{8}$/.test(valor);
    const esRuc = /^\d{11}$/.test(valor);
    if (!esDni && !esRuc) { setEstado('idle'); return; }

    setEstado('loading');
    timerRef.current = setTimeout(async () => {
      try {
        if (esDni) {
          const { data } = await reniecApi.dni(valor);
          const nombres = data.first_name || '';
          const apellidos = `${data.first_last_name || ''} ${data.second_last_name || ''}`.trim();
          setForm(p => ({ ...p, nombres, apellidos }));
          setHint(`${nombres} ${apellidos}`.trim());
        } else {
          const { data } = await reniecApi.ruc(valor);
          setForm(p => ({ ...p, nombres: data.razon_social || data.razonSocial || '', apellidos: '', direccion: data.direccion || p.direccion }));
          setHint(data.razon_social || data.razonSocial || '');
        }
        setEstado('ok');
      } catch {
        setEstado('error');
      }
    }, 500);
  };

  return { estado, hint, consultar };
}

export default function Clientes() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null);
  const [q, setQ] = useState('');
  const { estado, hint, consultar } = useDniLookup((updater) => setModal(prev => prev ? updater(prev) : prev));

  const clientesQ = useQuery({
    queryKey: ['clientes', q],
    queryFn: () => clientesApi.listar({ q: q || undefined }).then(r => r.data),
  });

  const guardarM = useMutation({
    mutationFn: () => {
      const payload = {
        dniRuc: modal.dniRuc.trim(),
        nombres: modal.nombres.trim(),
        apellidos: modal.apellidos.trim() || null,
        telefono: modal.telefono || null,
        email: modal.email || null,
        direccion: modal.direccion || null,
        latitud: modal.latitud || null,
        longitud: modal.longitud || null,
      };
      return modal.id ? clientesApi.actualizar(modal.id, payload) : clientesApi.crear(payload);
    },
    onSuccess: () => {
      toast.success(modal.id ? 'Cliente actualizado' : 'Cliente creado');
      setModal(null);
      qc.invalidateQueries({ queryKey: ['clientes'] });
    },
    onError: (e) => toast.error(e.response?.data?.error || 'No se pudo guardar el cliente'),
  });

  const toggleActivoM = useMutation({
    mutationFn: (c) => clientesApi.actualizar(c.id, {
      dniRuc: c.dniRuc, nombres: c.nombres, apellidos: c.apellidos,
      telefono: c.telefono, email: c.email, direccion: c.direccion,
      latitud: c.latitud, longitud: c.longitud,
      activo: !c.activo,
    }),
    onSuccess: (_, c) => {
      toast.success(c.activo ? 'Cliente deshabilitado' : 'Cliente habilitado');
      qc.invalidateQueries({ queryKey: ['clientes'] });
    },
    onError: (e) => toast.error(e.response?.data?.error || 'No se pudo actualizar el estado'),
  });

  const clientes = clientesQ.data || [];

  const abrirNuevo = () => setModal(emptyForm);
  const abrirEditar = (c) => setModal({
    id: c.id, dniRuc: c.dniRuc, nombres: c.nombres, apellidos: c.apellidos || '',
    telefono: c.telefono || '', email: c.email || '', direccion: c.direccion || '',
    latitud: c.latitud ?? '', longitud: c.longitud ?? '',
  });

  const handleDniChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 11);
    setModal(p => ({ ...p, dniRuc: val }));
    if (!modal.id) consultar(val);
  };

  const esDni = (modal?.dniRuc || '').length === 8;
  const formValido = modal?.dniRuc?.trim() && /^\d{8}(\d{3})?$/.test(modal.dniRuc.trim()) && modal?.nombres?.trim();

  return (
    <div className="animate-fade resp-page-padding" style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'var(--blue-bg)', border: '1px solid var(--border)' }}>
            <Users size={19} color="var(--blue)" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--txt)' }}>Clientes</h1>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--txt-3)' }}>Clientes registrados en el sistema</p>
          </div>
        </div>
        <Btn variant="primary" icon={<Plus size={14} />} onClick={abrirNuevo}>Nuevo cliente</Btn>
      </div>

      <div style={{ position: 'relative', marginBottom: 14, maxWidth: 340 }}>
        <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--txt-3)' }} />
        <input
          value={q} onChange={e => setQ(e.target.value)}
          placeholder="Buscar por nombre, DNI/RUC o email..."
          style={{ ...inputStyle, paddingLeft: 32 }}
        />
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div className="resp-table">
        <Table loading={clientesQ.isLoading} headers={['DNI/RUC', 'Nombre', 'Teléfono', 'Email', 'Dirección', 'Estado', '']}>
          {clientes.length === 0 ? (
            <tr><td colSpan={7} style={{ padding: 28, textAlign: 'center', color: 'var(--txt-3)', fontSize: 13 }}>Sin clientes registrados</td></tr>
          ) : clientes.map(c => (
            <Tr key={c.id} style={!c.activo ? { opacity: 0.55 } : undefined}>
              <Td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600 }}>{c.dniRuc}</Td>
              <Td style={{ fontWeight: 600 }}>{c.nombres} {c.apellidos}</Td>
              <Td style={{ color: 'var(--txt-3)' }}>{c.telefono || '—'}</Td>
              <Td style={{ color: 'var(--txt-3)' }}>{c.email || '—'}</Td>
              <Td style={{ color: 'var(--txt-3)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.direccion || '—'}</Td>
              <Td>
                <Badge color={c.activo ? 'green' : 'red'}>{c.activo ? 'Activo' : 'Inactivo'}</Badge>
              </Td>
              <Td>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Btn variant="ghost" size="sm" icon={<Pencil size={13} />} onClick={() => abrirEditar(c)} />
                  <Btn
                    variant={c.activo ? 'danger' : 'ghost'}
                    size="sm"
                    icon={c.activo ? <UserX size={13} /> : <UserCheck size={13} />}
                    disabled={toggleActivoM.isPending}
                    onClick={() => {
                      const accion = c.activo ? 'deshabilitar' : 'habilitar';
                      if (confirm(`¿Seguro que quieres ${accion} a ${c.nombres} ${c.apellidos}?`)) {
                        toggleActivoM.mutate(c);
                      }
                    }}
                  />
                </div>
              </Td>
            </Tr>
          ))}
        </Table>
        </div>

        <div className="resp-cards">
          {clientes.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--txt-3)', fontSize: 13 }}>Sin clientes registrados</div>
          ) : clientes.map(c => (
            <div key={c.id} className="resp-card" style={!c.activo ? { opacity: 0.55 } : undefined}>
              <div className="resp-card-top">
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--txt)' }}>{c.nombres} {c.apellidos}</div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--txt-3)' }}>{c.dniRuc}</span>
                </div>
                <Badge color={c.activo ? 'green' : 'red'}>{c.activo ? 'Activo' : 'Inactivo'}</Badge>
              </div>
              <div className="resp-card-tags">
                {c.telefono && <span style={{ fontSize: 12, color: 'var(--txt-3)' }}>{c.telefono}</span>}
                {c.email && <span style={{ fontSize: 12, color: 'var(--txt-3)' }}>{c.email}</span>}
              </div>
              {c.direccion && <div style={{ fontSize: 12, color: 'var(--txt-2)' }}>{c.direccion}</div>}
              <div style={{ display: 'flex', gap: 6, alignSelf: 'flex-end' }}>
                <Btn variant="ghost" size="sm" icon={<Pencil size={13} />} onClick={() => abrirEditar(c)}>Editar</Btn>
                <Btn
                  variant={c.activo ? 'danger' : 'ghost'}
                  size="sm"
                  icon={c.activo ? <UserX size={13} /> : <UserCheck size={13} />}
                  disabled={toggleActivoM.isPending}
                  onClick={() => {
                    const accion = c.activo ? 'deshabilitar' : 'habilitar';
                    if (confirm(`¿Seguro que quieres ${accion} a ${c.nombres} ${c.apellidos}?`)) {
                      toggleActivoM.mutate(c);
                    }
                  }}
                >
                  {c.activo ? 'Deshabilitar' : 'Habilitar'}
                </Btn>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal
        open={Boolean(modal)}
        onClose={() => setModal(null)}
        title={modal?.id ? 'Editar cliente' : 'Nuevo cliente'}
        width={560}
      >
        {modal && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

              <SeccionLabel>Identificación</SeccionLabel>
              <div className="resp-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Campo label="DNI / RUC" required>
                  <div style={{ position: 'relative' }}>
                    <input
                      style={{ ...campoInputStyle, paddingRight: 34 }}
                      placeholder="8 u 11 dígitos"
                      value={modal.dniRuc}
                      onChange={handleDniChange}
                      disabled={Boolean(modal.id)}
                      inputMode="numeric"
                    />
                    {!modal.id && (
                      <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)' }}>
                        {estado === 'loading' && <Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite', color: '#2563EB' }} />}
                        {estado === 'ok' && <CheckCircle2 size={14} color="#15803D" />}
                        {estado === 'error' && <AlertCircle size={14} color="#DC2626" />}
                      </span>
                    )}
                  </div>
                  {!modal.id && estado === 'ok' && hint && (
                    <div style={{ marginTop: 5, fontSize: 11.5, color: '#15803D', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, padding: '5px 9px', background: '#F0FDF4', borderRadius: 7, border: '1px solid #BBF7D0' }}>
                      <CheckCircle2 size={11} />{hint}
                    </div>
                  )}
                  {!modal.id && estado === 'error' && (
                    <div style={{ marginTop: 5, fontSize: 11.5, color: '#DC2626', display: 'flex', alignItems: 'center', gap: 4, padding: '5px 9px', background: '#FEF2F2', borderRadius: 7, border: '1px solid #FECACA' }}>
                      <AlertCircle size={11} />No encontrado en {esDni ? 'RENIEC' : 'SUNAT'}
                    </div>
                  )}
                </Campo>
                <Campo label="Teléfono">
                  <input style={campoInputStyle} placeholder="999 999 999" value={modal.telefono} onChange={e => setModal({ ...modal, telefono: e.target.value })} inputMode="tel" />
                </Campo>
              </div>

              <SeccionLabel>Datos personales</SeccionLabel>
              <div className="resp-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Campo label="Nombres" required>
                  <input style={campoInputStyle} placeholder="Nombres" value={modal.nombres} onChange={e => setModal({ ...modal, nombres: e.target.value })} />
                </Campo>
                <Campo label="Apellidos">
                  <input style={campoInputStyle} placeholder="Apellidos" value={modal.apellidos} onChange={e => setModal({ ...modal, apellidos: e.target.value })} />
                </Campo>
              </div>

              <SeccionLabel>Contacto</SeccionLabel>
              <Campo label="Email">
                <input style={campoInputStyle} type="email" placeholder="cliente@correo.com" value={modal.email} onChange={e => setModal({ ...modal, email: e.target.value })} />
              </Campo>
              <Campo label="Dirección">
                <input style={campoInputStyle} placeholder="Dirección completa" value={modal.direccion} onChange={e => setModal({ ...modal, direccion: e.target.value })} />
              </Campo>

              <SeccionLabel>Ubicación (opcional)</SeccionLabel>
              <div className="resp-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Campo label="Latitud">
                  <input style={{ ...campoInputStyle, fontFamily: 'monospace' }} placeholder="-8.0834" value={modal.latitud} onChange={e => setModal({ ...modal, latitud: e.target.value })} />
                </Campo>
                <Campo label="Longitud">
                  <input style={{ ...campoInputStyle, fontFamily: 'monospace' }} placeholder="-78.9557" value={modal.longitud} onChange={e => setModal({ ...modal, longitud: e.target.value })} />
                </Campo>
              </div>
              <p style={{ margin: 0, fontSize: 11.5, color: '#64748B' }}>
                También puedes ubicar al cliente directamente desde el <strong>Mapa</strong>.
              </p>
            </div>

            <div style={{
              display: 'flex', justifyContent: 'flex-end', gap: 10,
              padding: '18px 24px', borderTop: '1px solid #EEF2F6',
              marginTop: 20, marginLeft: -24, marginRight: -24, marginBottom: -22,
            }}>
              <Btn
                onClick={() => setModal(null)}
                style={{ background: '#FFFFFF', color: '#1E3A5F', border: '1px solid #C9DAEA', fontWeight: 600 }}
              >
                Cancelar
              </Btn>
              <Btn
                disabled={!formValido || guardarM.isPending}
                loading={guardarM.isPending}
                onClick={() => guardarM.mutate()}
                style={{ background: '#1E3A8A', fontWeight: 700 }}
              >
                {modal.id ? 'Guardar cambios' : 'Crear cliente'}
              </Btn>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
