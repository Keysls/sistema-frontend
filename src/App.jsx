import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import EnConstruccion from './pages/EnConstruccion';
import AlmacenCatalogo from './pages/almacen/AlmacenCatalogo';
import AlmacenInventario from './pages/almacen/AlmacenInventario';
import AlmacenReportes from './pages/almacen/AlmacenReportes';
import AlmacenDashboard from './pages/almacen/AlmacenDashboard';

import Tecnicos from './pages/Tecnicos';
import Secretarios from './pages/Secretarios';
import Clientes from './pages/Clientes';
import Mapa from './pages/Mapa';
import Contratos from './pages/Contratos';
import ContratoDetalle from './pages/ContratoDetalle';
import OrdenesServicio from './pages/OrdenesServicio';
import Planes from './pages/Planes';
import Pagos from './pages/Pagos';
import Reportes from './pages/Reportes';
import Perfil from './pages/Perfil';
import Empresa from './pages/Empresa';
import ProtectedRouteTecnico from './components/ProtectedRouteTecnico';
import TecnicoLogin from './pages/tecnico/TecnicoLogin';
import TecnicoOrdenes from './pages/tecnico/TecnicoOrdenes';
import TecnicoOrdenDetalle from './pages/tecnico/TecnicoOrdenDetalle';
export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/tecnico/login" element={<TecnicoLogin />} />
        <Route path="/tecnico" element={<ProtectedRouteTecnico><TecnicoOrdenes /></ProtectedRouteTecnico>} />
        <Route path="/tecnico/ordenes/:id" element={<ProtectedRouteTecnico><TecnicoOrdenDetalle /></ProtectedRouteTecnico>} />

        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/ordenes" element={<ProtectedRoute><OrdenesServicio /></ProtectedRoute>} />
        <Route path="/clientes" element={<ProtectedRoute><Clientes /></ProtectedRoute>} />
        <Route path="/contratos" element={<ProtectedRoute><Contratos /></ProtectedRoute>} />
        <Route path="/contratos/:id" element={<ProtectedRoute><ContratoDetalle /></ProtectedRoute>} />
        <Route path="/mapa" element={<ProtectedRoute><Mapa /></ProtectedRoute>} />
        <Route path="/reportes" element={<ProtectedRoute><Reportes /></ProtectedRoute>} />
        <Route path="/planes" element={<ProtectedRoute><Planes /></ProtectedRoute>} />
        <Route path="/pagos" element={<ProtectedRoute><Pagos /></ProtectedRoute>} />

        <Route path="/almacen" element={<ProtectedRoute><AlmacenDashboard /></ProtectedRoute>} />
        <Route path="/almacen/inventario" element={<ProtectedRoute><AlmacenInventario /></ProtectedRoute>} />

        <Route path="/almacen/reportes" element={<ProtectedRoute><AlmacenReportes /></ProtectedRoute>} />
        <Route path="/almacen/catalogo" element={<ProtectedRoute><AlmacenCatalogo /></ProtectedRoute>} />
        
        <Route path="/tecnicos" element={<ProtectedRoute><Tecnicos /></ProtectedRoute>} />     
        <Route path="/secretarios" element={<ProtectedRoute><Secretarios /></ProtectedRoute>} />

        <Route path="/perfil" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />
        <Route path="/empresa" element={<ProtectedRoute><Empresa /></ProtectedRoute>} />

        <Route path="*" element={<ProtectedRoute><EnConstruccion titulo="Página no encontrada" /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}
