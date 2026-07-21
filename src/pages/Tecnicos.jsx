import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Users, Plus, Pencil, Search, Eye, EyeOff, Mail, UserX, UserCheck } from 'lucide-react';
import { tecnicosApi } from '../services/api';
import { Btn, Badge, Modal, Table, Tr, Td } from '../components/ui';

const DOMINIO_EMAIL = '@prointelco.com';

const inputStyle = {
  width: '100%', height: 36, padding: '0 12px', background: 'var(--bg-3)',
  border: '1px solid var(--border-2)', borderRadius: 6, color: 'var(--txt)',
  fontSize: 13, outline: 'none',
};

// ─── Campo con label estilo "Nombre *" (no mayúsculas, azul oscuro) ──
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

// ─── Título de sección con línea divisoria ──────────────────────
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

function quitarAcentos(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

const emptyForm = {
  id: null, nombre: '', apellido: '', dni: '', telefono: '',
  email: '', password: '', zona: '', vehiculo: '',
};

export default function Tecnicos() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null);
  const [q, setQ] = useState('');
  const [verPassword, setVerPassword] = useState(false);

  const tecnicosQ = useQuery({
    queryKey: ['tecnicos', q],
    queryFn: () => tecnicosApi.listar({ q: q || undefined }).then(r => r.data),
  });

  const guardarM = useMutation({
    mutationFn: () => {
      const payload = {
        nombre: modal.nombre.trim(),
        apellido: modal.apellido.trim(),
        dni: modal.dni.trim(),
        telefono: modal.telefono || null,
        email: modal.email.trim(),
        zona: modal.zona || null,
        vehiculo: modal.vehiculo || null,
        ...(modal.password ? { password: modal.password } : {}),
      };
      return modal.id
        ? tecnicosApi.actualizar(modal.id, payload)
        : tecnicosApi.crear(payload);
    },
    onSuccess: () => {
      toast.success(modal.id ? 'Técnico actualizado' : 'Técnico creado');
      setModal(null);
      qc.invalidateQueries({ queryKey: ['tecnicos'] });
    },
    onError: (e) => toast.error(e.response?.data?.error || 'No se pudo guardar el técnico'),
  });

  // Deshabilitar / habilitar técnico (en vez de eliminarlo)
  const toggleActivoM = useMutation({
    mutationFn: (t) => tecnicosApi.actualizar(t.id, {
      nombre: t.nombre,
      apellido: t.apellido,
      dni: t.dni,
      telefono: t.telefono,
      email: t.email,
      zona: t.zona,
      vehiculo: t.vehiculo,
      activo: !t.activo,
    }),
    onSuccess: (_, t) => {
      toast.success(t.activo ? 'Técnico deshabilitado' : 'Técnico habilitado');
      qc.invalidateQueries({ queryKey: ['tecnicos'] });
    },
    onError: (e) => toast.error(e.response?.data?.error || 'No se pudo actualizar el estado'),
  });

  const tecnicos = tecnicosQ.data || [];

  const abrirNuevo = () => { setVerPassword(false); setModal(emptyForm); };
  const abrirEditar = (t) => {
    setVerPassword(false);
    setModal({
      id: t.id, nombre: t.nombre, apellido: t.apellido, dni: t.dni,
      telefono: t.telefono || '', email: t.email, password: '',
      zona: t.zona || '', vehiculo: t.vehiculo || '',
    });
  };

  // Genera: primera letra del nombre + primer apellido, sin tildes/espacios, en minúscula + @prointelco.com
  const generarEmail = () => {
    const nombre = modal.nombre.trim();
    const primerApellido = modal.apellido.trim().split(/\s+/)[0] || '';
    if (!nombre || !primerApellido) {
      toast.error('Ingresa nombre y apellido primero');
      return;
    }
    const inicial = quitarAcentos(nombre[0]).toLowerCase();
    const apellido = quitarAcentos(primerApellido).toLowerCase().replace(/[^a-z]/g, '');
    setModal({ ...modal, email: `${inicial}${apellido}${DOMINIO_EMAIL}` });
  };

  const formValido = modal?.nombre?.trim() && modal?.apellido?.trim() && modal?.dni?.trim()
    && modal?.email?.trim() && (modal?.id || (modal?.password?.trim()?.length >= 6));

  return (
    <div className="animate-fade resp-page-padding" style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'var(--blue-bg)', border: '1px solid var(--border)' }}>
            <Users size={19} color="var(--blue)" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--txt)' }}>Técnicos</h1>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--txt-3)' }}>Personal técnico de campo</p>
          </div>
        </div>
        <Btn variant="primary" icon={<Plus size={14} />} onClick={abrirNuevo}>Nuevo técnico</Btn>
      </div>

      <div style={{ position: 'relative', marginBottom: 14, maxWidth: 340 }}>
        <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--txt-3)' }} />
        <input
          value={q} onChange={e => setQ(e.target.value)}
          placeholder="Buscar por nombre, DNI o email..."
          style={{ ...inputStyle, paddingLeft: 32 }}
        />
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <Table loading={tecnicosQ.isLoading} headers={['Nombre', 'DNI', 'Teléfono', 'Email', 'Zona', 'Vehículo', 'Estado', '']}>
          {tecnicos.length === 0 ? (
            <tr><td colSpan={8} style={{ padding: 28, textAlign: 'center', color: 'var(--txt-3)', fontSize: 13 }}>Sin técnicos registrados</td></tr>
          ) : tecnicos.map(t => (
            <Tr key={t.id} style={!t.activo ? { opacity: 0.55 } : undefined}>
              <Td style={{ fontWeight: 600 }}>{t.nombre} {t.apellido}</Td>
              <Td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{t.dni}</Td>
              <Td style={{ color: 'var(--txt-3)' }}>{t.telefono || '—'}</Td>
              <Td style={{ color: 'var(--txt-3)' }}>{t.email}</Td>
              <Td>{t.zona || '—'}</Td>
              <Td>{t.vehiculo || '—'}</Td>
              <Td>
                <Badge color={t.activo ? 'green' : 'red'}>{t.activo ? 'Activo' : 'Inactivo'}</Badge>
              </Td>
              <Td>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Btn variant="ghost" size="sm" icon={<Pencil size={13} />} onClick={() => abrirEditar(t)} />
                  <Btn
                    variant={t.activo ? 'danger' : 'ghost'}
                    size="sm"
                    icon={t.activo ? <UserX size={13} /> : <UserCheck size={13} />}
                    disabled={toggleActivoM.isPending}
                    onClick={() => {
                      const accion = t.activo ? 'deshabilitar' : 'habilitar';
                      if (confirm(`¿Seguro que quieres ${accion} a ${t.nombre} ${t.apellido}?`)) {
                        toggleActivoM.mutate(t);
                      }
                    }}
                  />
                </div>
              </Td>
            </Tr>
          ))}
        </Table>
      </div>

      <Modal
        open={Boolean(modal)}
        onClose={() => setModal(null)}
        title={modal?.id ? 'Editar técnico' : 'Nuevo técnico'}
        width={560}
      >
        {modal && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

              <SeccionLabel>Datos personales</SeccionLabel>
              <div className="resp-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Campo label="Nombre" required>
                  <input style={campoInputStyle} placeholder="Juan" value={modal.nombre} onChange={e => setModal({ ...modal, nombre: e.target.value })} />
                </Campo>
                <Campo label="Apellido" required>
                  <input style={campoInputStyle} placeholder="Pérez García" value={modal.apellido} onChange={e => setModal({ ...modal, apellido: e.target.value })} />
                </Campo>
              </div>
              <div className="resp-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Campo label="DNI" required>
                  <input style={campoInputStyle} placeholder="12345678" value={modal.dni} onChange={e => setModal({ ...modal, dni: e.target.value })} />
                </Campo>
                <Campo label="Teléfono">
                  <input style={campoInputStyle} placeholder="9XXXXXXXX" value={modal.telefono} onChange={e => setModal({ ...modal, telefono: e.target.value })} />
                </Campo>
              </div>

              <SeccionLabel>Acceso al sistema</SeccionLabel>
              <Campo label="Email" required>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    style={{ ...campoInputStyle, flex: 1 }}
                    placeholder="tecnico@prointelco.com"
                    value={modal.email}
                    onChange={e => setModal({ ...modal, email: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={generarEmail}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
                      padding: '0 14px', height: 40, borderRadius: 8,
                      border: '1px solid #C9DAEA', background: '#FFFFFF', color: '#1E3A5F',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    <Mail size={14} /> Generar
                  </button>
                </div>
              </Campo>

              <Campo label="Contraseña" required={!modal.id}>
                <div style={{ position: 'relative' }}>
                  <input
                    type={verPassword ? 'text' : 'password'}
                    placeholder={modal.id ? 'Dejar en blanco para no cambiarla' : 'Mínimo 6 caracteres'}
                    value={modal.password}
                    onChange={e => setModal({ ...modal, password: e.target.value })}
                    style={{ ...campoInputStyle, paddingRight: 40 }}
                  />
                  <button
                    type="button"
                    onClick={() => setVerPassword(v => !v)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#6B8FAE' }}
                  >
                    {verPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </Campo>

              <SeccionLabel>Datos de campo</SeccionLabel>
              <div className="resp-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Campo label="Zona asignada">
                  <input style={campoInputStyle} placeholder="Zona Norte..." value={modal.zona} onChange={e => setModal({ ...modal, zona: e.target.value })} />
                </Campo>
                <Campo label="Vehículo">
                  <input style={campoInputStyle} placeholder="Moto / Camioneta" value={modal.vehiculo} onChange={e => setModal({ ...modal, vehiculo: e.target.value })} />
                </Campo>
              </div>
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
                {modal.id ? 'Guardar cambios' : 'Crear técnico'}
              </Btn>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}