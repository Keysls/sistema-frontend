import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import EnConstruccion from './pages/EnConstruccion';
import AlmacenCatalogo from './pages/almacen/AlmacenCatalogo';

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/ordenes" element={<ProtectedRoute><EnConstruccion titulo="Órdenes" /></ProtectedRoute>} />
        <Route path="/clientes" element={<ProtectedRoute><EnConstruccion titulo="Clientes" /></ProtectedRoute>} />
        <Route path="/mapa" element={<ProtectedRoute><EnConstruccion titulo="Mapa" /></ProtectedRoute>} />
        <Route path="/reportes" element={<ProtectedRoute><EnConstruccion titulo="Reportes" /></ProtectedRoute>} />
        <Route path="/planes" element={<ProtectedRoute><EnConstruccion titulo="Planes" /></ProtectedRoute>} />

        <Route path="/almacen" element={<ProtectedRoute><EnConstruccion titulo="Almacén · Dashboard" /></ProtectedRoute>} />
        <Route path="/almacen/inventario" element={<ProtectedRoute><EnConstruccion titulo="Almacén · Inventario" /></ProtectedRoute>} />
        <Route path="/almacen/devoluciones" element={<ProtectedRoute><EnConstruccion titulo="Almacén · Devoluciones" /></ProtectedRoute>} />
        <Route path="/almacen/reportes" element={<ProtectedRoute><EnConstruccion titulo="Almacén · Reportes" /></ProtectedRoute>} />
        <Route path="/almacen/catalogo" element={<ProtectedRoute><AlmacenCatalogo /></ProtectedRoute>} />
        
        <Route path="/tecnicos" element={<ProtectedRoute><EnConstruccion titulo="Técnicos" /></ProtectedRoute>} />
        <Route path="/secretarios" element={<ProtectedRoute><EnConstruccion titulo="Secretario(a)" /></ProtectedRoute>} />
        <Route path="/planta-externa" element={<ProtectedRoute><EnConstruccion titulo="Planta Externa" /></ProtectedRoute>} />

        <Route path="/perfil" element={<ProtectedRoute><EnConstruccion titulo="Mi Perfil" /></ProtectedRoute>} />

        <Route path="*" element={<ProtectedRoute><EnConstruccion titulo="Página no encontrada" /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}
