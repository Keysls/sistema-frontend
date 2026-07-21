import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Wifi, Plus, Pencil, Power } from 'lucide-react';
import { planesApi } from '../services/api';
import { Btn, Badge, Modal, Table, Tr, Td } from '../components/ui';

const TIPOS = { INTERNET: 'Internet', CABLE: 'Cable', DUO: 'Dúo' };

const campoInputStyle = {
  width: '100%', height: 40, padding: '0 12px', background: '#E1EBF5',
  border: '1px solid #C9DAEA', borderRadius: 8, color: '#1E3A5F',
  fontSize: 13.5, outline: 'none', boxSizing: 'border-box',
};

function Campo({ label, required, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: '#1E3A5F' }}>{label}{required && <span> *</span>}</label>
      {children}
    </div>
  );
}

const emptyForm = { id: null, nombre: '', tipoServicio: 'INTERNET', mbps: '', precio: '' };

export default function Planes() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null);

  const planesQ = useQuery({
    queryKey: ['planes'],
    queryFn: () => planesApi.listar().then(r => r.data),
  });

  const guardarM = useMutation({
    mutationFn: () => {
      const payload = {
        nombre: modal.nombre.trim(),
        tipoServicio: modal.tipoServicio,
        mbps: modal.mbps || null,
        precio: modal.precio,
      };
      return modal.id ? planesApi.actualizar(modal.id, payload) : planesApi.crear(payload);
    },
    onSuccess: () => {
      toast.success(modal.id ? 'Plan actualizado' : 'Plan creado');
      setModal(null);
      qc.invalidateQueries({ queryKey: ['planes'] });
    },
    onError: (e) => toast.error(e.response?.data?.error || 'No se pudo guardar el plan'),
  });

  const toggleActivoM = useMutation({
    mutationFn: (p) => planesApi.actualizar(p.id, {
      nombre: p.nombre, tipoServicio: p.tipoServicio, mbps: p.mbps, precio: p.precio, activo: !p.activo,
    }),
    onSuccess: (_, p) => {
      toast.success(p.activo ? 'Plan deshabilitado' : 'Plan habilitado');
      qc.invalidateQueries({ queryKey: ['planes'] });
    },
    onError: (e) => toast.error(e.response?.data?.error || 'No se pudo actualizar el estado'),
  });

  const planes = planesQ.data || [];

  const abrirNuevo = () => setModal(emptyForm);
  const abrirEditar = (p) => setModal({ id: p.id, nombre: p.nombre, tipoServicio: p.tipoServicio, mbps: p.mbps ?? '', precio: p.precio });

  const formValido = modal?.nombre?.trim() && modal?.precio !== '' && !Number.isNaN(Number(modal?.precio));

  return (
    <div className="animate-fade resp-page-padding" style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'var(--blue-bg)', border: '1px solid var(--border)' }}>
            <Wifi size={19} color="var(--blue)" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--txt)' }}>Planes</h1>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--txt-3)' }}>Catálogo de planes de Internet, Cable y Dúo</p>
          </div>
        </div>
        <Btn variant="primary" icon={<Plus size={14} />} onClick={abrirNuevo}>Nuevo plan</Btn>
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div className="resp-table">
        <Table loading={planesQ.isLoading} headers={['Nombre', 'Servicio', 'Mbps', 'Precio', 'Estado', '']}>
          {planes.length === 0 ? (
            <tr><td colSpan={6} style={{ padding: 28, textAlign: 'center', color: 'var(--txt-3)', fontSize: 13 }}>Sin planes registrados</td></tr>
          ) : planes.map(p => (
            <Tr key={p.id} style={!p.activo ? { opacity: 0.55 } : undefined}>
              <Td style={{ fontWeight: 600 }}>{p.nombre}</Td>
              <Td><Badge color="blue">{TIPOS[p.tipoServicio] || p.tipoServicio}</Badge></Td>
              <Td style={{ fontFamily: 'var(--font-mono)' }}>{p.mbps ? `${p.mbps} Mbps` : '—'}</Td>
              <Td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>S/ {Number(p.precio).toFixed(2)}</Td>
              <Td><Badge color={p.activo ? 'green' : 'red'}>{p.activo ? 'Activo' : 'Inactivo'}</Badge></Td>
              <Td>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Btn variant="ghost" size="sm" icon={<Pencil size={13} />} onClick={() => abrirEditar(p)} />
                  <Btn
                    variant={p.activo ? 'danger' : 'ghost'} size="sm" icon={<Power size={13} />}
                    disabled={toggleActivoM.isPending}
                    onClick={() => toggleActivoM.mutate(p)}
                  />
                </div>
              </Td>
            </Tr>
          ))}
        </Table>
        </div>

        <div className="resp-cards">
          {planes.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--txt-3)', fontSize: 13 }}>Sin planes registrados</div>
          ) : planes.map(p => (
            <div key={p.id} className="resp-card" style={!p.activo ? { opacity: 0.55 } : undefined}>
              <div className="resp-card-top">
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--txt)' }}>{p.nombre}</div>
                <Badge color={p.activo ? 'green' : 'red'}>{p.activo ? 'Activo' : 'Inactivo'}</Badge>
              </div>
              <div className="resp-card-tags">
                <Badge color="blue">{TIPOS[p.tipoServicio] || p.tipoServicio}</Badge>
                {p.mbps && <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--txt-3)' }}>{p.mbps} Mbps</span>}
                <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>S/ {Number(p.precio).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', gap: 6, alignSelf: 'flex-end' }}>
                <Btn variant="ghost" size="sm" icon={<Pencil size={13} />} onClick={() => abrirEditar(p)}>Editar</Btn>
                <Btn
                  variant={p.activo ? 'danger' : 'ghost'} size="sm" icon={<Power size={13} />}
                  disabled={toggleActivoM.isPending}
                  onClick={() => toggleActivoM.mutate(p)}
                >
                  {p.activo ? 'Desactivar' : 'Activar'}
                </Btn>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal open={Boolean(modal)} onClose={() => setModal(null)} title={modal?.id ? 'Editar plan' : 'Nuevo plan'} width={460}>
        {modal && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Campo label="Nombre" required>
                <input style={campoInputStyle} placeholder="Plan 100MB Full" value={modal.nombre} onChange={e => setModal({ ...modal, nombre: e.target.value })} />
              </Campo>
              <Campo label="Tipo de servicio" required>
                <select style={campoInputStyle} value={modal.tipoServicio} onChange={e => setModal({ ...modal, tipoServicio: e.target.value })}>
                  {Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Campo>
              <div className="resp-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Campo label="Mbps">
                  <input type="number" style={campoInputStyle} placeholder="100" value={modal.mbps} onChange={e => setModal({ ...modal, mbps: e.target.value })} />
                </Campo>
                <Campo label="Precio (S/)" required>
                  <input type="number" step="0.01" style={campoInputStyle} placeholder="80.00" value={modal.precio} onChange={e => setModal({ ...modal, precio: e.target.value })} />
                </Campo>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '18px 24px', borderTop: '1px solid #EEF2F6', marginTop: 20, marginLeft: -24, marginRight: -24, marginBottom: -22 }}>
              <Btn onClick={() => setModal(null)} style={{ background: '#FFFFFF', color: '#1E3A5F', border: '1px solid #C9DAEA', fontWeight: 600 }}>Cancelar</Btn>
              <Btn disabled={!formValido || guardarM.isPending} loading={guardarM.isPending} onClick={() => guardarM.mutate()} style={{ background: '#1E3A8A', fontWeight: 700 }}>
                {modal.id ? 'Guardar cambios' : 'Crear plan'}
              </Btn>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
