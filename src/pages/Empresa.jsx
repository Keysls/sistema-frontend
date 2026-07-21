import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Building2, Save, Plus, Trash2, Smartphone, Landmark, Image, X } from 'lucide-react';
import { empresaApi } from '../services/api';
import { Btn } from '../components/ui';

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

function SeccionCard({ icon: Icon, title, subtitle, children }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'var(--blue-bg)' }}>
          <Icon size={16} color="var(--blue)" />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)' }}>{title}</div>
          {subtitle && <div style={{ fontSize: 11.5, color: 'var(--txt-3)' }}>{subtitle}</div>}
        </div>
      </div>
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {children}
      </div>
    </div>
  );
}

const TIPO_CFG = {
  YAPE:            { label: 'Yape',           icon: Smartphone, color: '#7C3AED', bg: '#F3E8FF' },
  PLIN:            { label: 'Plin',            icon: Smartphone, color: '#2563EB', bg: '#EFF6FF' },
  CUENTA_BANCARIA: { label: 'Cuenta bancaria', icon: Landmark,   color: '#16A34A', bg: '#F0FDF4' },
};

const emptyMetodo = { tipo: 'YAPE', numero: '', banco: '', titular: '' };

function FormMetodo({ onGuardar, onCancelar, guardando }) {
  const [m, setM] = useState(emptyMetodo);
  const esCuenta = m.tipo === 'CUENTA_BANCARIA';
  const valido = m.numero.trim() && (!esCuenta || m.banco.trim());

  return (
    <div style={{ border: '1px dashed #C9DAEA', borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="resp-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Campo label="Tipo" required>
          <select style={campoInputStyle} value={m.tipo} onChange={e => setM({ ...m, tipo: e.target.value })}>
            {Object.entries(TIPO_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </Campo>
        <Campo label={esCuenta ? 'N° de cuenta / CCI' : 'Número de celular'} required>
          <input style={campoInputStyle} value={m.numero} onChange={e => setM({ ...m, numero: e.target.value })} placeholder={esCuenta ? '191-12345678-0-12' : '999999999'} />
        </Campo>
      </div>
      {esCuenta && (
        <div className="resp-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Campo label="Banco" required>
            <input style={campoInputStyle} value={m.banco} onChange={e => setM({ ...m, banco: e.target.value })} placeholder="BCP, Interbank, BBVA..." />
          </Campo>
          <Campo label="Titular (opcional)">
            <input style={campoInputStyle} value={m.titular} onChange={e => setM({ ...m, titular: e.target.value })} placeholder="Nombre del titular" />
          </Campo>
        </div>
      )}
      {!esCuenta && (
        <Campo label="Titular (opcional)">
          <input style={campoInputStyle} value={m.titular} onChange={e => setM({ ...m, titular: e.target.value })} placeholder="Nombre del titular" />
        </Campo>
      )}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Btn variant="ghost" onClick={onCancelar}>Cancelar</Btn>
        <Btn disabled={!valido || guardando} loading={guardando} icon={<Save size={14} />} onClick={() => onGuardar(m)}>Guardar</Btn>
      </div>
    </div>
  );
}

function MetodoRow({ m, onEliminar, eliminando }) {
  const cfg = TIPO_CFG[m.tipo] || TIPO_CFG.YAPE;
  const Icon = cfg.icon;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8 }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, display: 'grid', placeItems: 'center', background: cfg.bg, flexShrink: 0 }}>
        <Icon size={15} color={cfg.color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt)' }}>{cfg.label}</div>
        <div style={{ fontSize: 12.5, color: 'var(--txt-2)', fontFamily: 'var(--font-mono)' }}>{m.numero}</div>
        {(m.banco || m.titular) && (
          <div style={{ fontSize: 11.5, color: 'var(--txt-3)' }}>{[m.banco, m.titular].filter(Boolean).join(' · ')}</div>
        )}
      </div>
      <Btn variant="ghost" size="sm" icon={<Trash2 size={13} />} disabled={eliminando} onClick={() => onEliminar(m.id)} />
    </div>
  );
}

export default function Empresa() {
  const qc = useQueryClient();
  const [datos, setDatos] = useState({ ruc: '', nombre: '', direccion: '', telefono: '', agencia: '', logo: '' });
  const [agregando, setAgregando] = useState(false);

  const empresaQ = useQuery({ queryKey: ['empresa'], queryFn: () => empresaApi.obtener().then(r => r.data) });

  useEffect(() => {
    if (empresaQ.data) setDatos({
      ruc: empresaQ.data.ruc || '', nombre: empresaQ.data.nombre || '',
      direccion: empresaQ.data.direccion || '', telefono: empresaQ.data.telefono || '',
      agencia: empresaQ.data.agencia || '', logo: empresaQ.data.logo || '',
    });
  }, [empresaQ.data]);

  const guardarDatosM = useMutation({
    mutationFn: () => empresaApi.actualizar(datos),
    onSuccess: () => { toast.success('Datos de la empresa actualizados'); qc.invalidateQueries({ queryKey: ['empresa'] }); },
    onError: (e) => toast.error(e.response?.data?.error || 'No se pudo guardar'),
  });

  const agregarM = useMutation({
    mutationFn: (payload) => empresaApi.agregarMetodo(payload),
    onSuccess: () => { toast.success('Método de pago agregado'); setAgregando(false); qc.invalidateQueries({ queryKey: ['empresa'] }); },
    onError: (e) => toast.error(e.response?.data?.error || 'No se pudo agregar el método de pago'),
  });

  const eliminarM = useMutation({
    mutationFn: (id) => empresaApi.eliminarMetodo(id),
    onSuccess: () => { toast.success('Método de pago eliminado'); qc.invalidateQueries({ queryKey: ['empresa'] }); },
    onError: (e) => toast.error(e.response?.data?.error || 'No se pudo eliminar'),
  });

  const metodos = empresaQ.data?.metodosPago || [];

  return (
    <div className="animate-fade resp-page-padding" style={{ padding: 24, maxWidth: 680 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 40, height: 40, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'var(--blue-bg)', border: '1px solid var(--border)' }}>
          <Building2 size={19} color="var(--blue)" />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--txt)' }}>Mi Empresa</h1>
          <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--txt-3)' }}>Datos que se incluyen en los recordatorios de pago por WhatsApp</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <SeccionCard icon={Building2} title="Datos de la empresa" subtitle="Se muestran en el comprobante de pago, igual que en el ejemplo">
          <Campo label="Logo (aparece en la cabecera del comprobante)">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {datos.logo ? (
                <div style={{ position: 'relative' }}>
                  <img src={datos.logo} alt="Logo" style={{ width: 72, height: 72, objectFit: 'contain', border: '1px solid #C9DAEA', borderRadius: 8, background: '#fff' }} />
                  <button type="button" onClick={() => setDatos({ ...datos, logo: '' })}
                    style={{ position: 'absolute', top: -8, right: -8, width: 20, height: 20, borderRadius: '50%', background: '#DC2626', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <div style={{ width: 72, height: 72, border: '1px dashed #C9DAEA', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>
                  <Image size={24} />
                </div>
              )}
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: '1px solid #C9DAEA', borderRadius: 8, background: '#F4F8FC', color: '#1E3A5F', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                <Image size={14} /> {datos.logo ? 'Cambiar logo' : 'Subir logo'}
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => setDatos(d => ({ ...d, logo: reader.result }));
                  reader.readAsDataURL(file);
                  e.target.value = '';
                }} />
              </label>
            </div>
          </Campo>
          <div className="resp-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Campo label="RUC">
              <input style={campoInputStyle} value={datos.ruc} onChange={e => setDatos({ ...datos, ruc: e.target.value })} placeholder="20123456789" />
            </Campo>
            <Campo label="Nombre de la empresa">
              <input style={campoInputStyle} value={datos.nombre} onChange={e => setDatos({ ...datos, nombre: e.target.value })} placeholder="Prointelco S.A.C." />
            </Campo>
          </div>
          <Campo label="Agencia">
            <input style={campoInputStyle} value={datos.agencia} onChange={e => setDatos({ ...datos, agencia: e.target.value })} placeholder="AGENCIA TRUJILLO" />
          </Campo>
          <Campo label="Dirección">
            <input style={campoInputStyle} value={datos.direccion} onChange={e => setDatos({ ...datos, direccion: e.target.value })} placeholder="Av. América Norte 1810 Dpto. 604B, Las Quintanas - Trujillo" />
          </Campo>
          <Campo label="Teléfono">
            <input style={campoInputStyle} value={datos.telefono} onChange={e => setDatos({ ...datos, telefono: e.target.value })} placeholder="051-01-000000" />
          </Campo>
          <Btn disabled={guardarDatosM.isPending} loading={guardarDatosM.isPending} icon={<Save size={14} />} onClick={() => guardarDatosM.mutate()} style={{ alignSelf: 'flex-end' }}>
            Guardar cambios
          </Btn>
        </SeccionCard>

        <SeccionCard icon={Smartphone} title="Métodos de pago" subtitle="Yape, Plin y cuentas bancarias para que tus clientes puedan pagar">
          {metodos.length === 0 && !agregando && (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--txt-3)' }}>Aún no agregaste ningún método de pago.</p>
          )}
          {metodos.map(m => (
            <MetodoRow key={m.id} m={m} onEliminar={id => eliminarM.mutate(id)} eliminando={eliminarM.isPending} />
          ))}
          {agregando ? (
            <FormMetodo onCancelar={() => setAgregando(false)} onGuardar={payload => agregarM.mutate(payload)} guardando={agregarM.isPending} />
          ) : (
            <button onClick={() => setAgregando(true)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'transparent', border: '1px dashed #C9DAEA', borderRadius: 8, padding: '10px 12px', color: '#1E3A8A', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <Plus size={14} /> Agregar método de pago
            </button>
          )}
        </SeccionCard>
      </div>
    </div>
  );
}
