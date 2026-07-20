# Sistema Frontend

Panel React (Vite) para el nuevo Sistema de Gestión. Mismo diseño y estructura de sidebar/topbar que `isp-admin`.

## 🚀 Instalación

```bash
cd sistema-frontend
npm install
npm run dev
# Abre http://localhost:5173
```

Asegúrate de que **sistema-backend** esté corriendo en `http://localhost:3000` antes de iniciar.
El proxy de Vite redirige `/api/*` → `http://localhost:3000/api/*` automáticamente.

## 🔒 Credenciales de prueba
```
Email:    admin@sistema.com
Password: Admin123!
```
(Creadas por el seed del backend)

## 📱 Páginas incluidas

| Ruta | Estado |
|------|--------|
| `/login` | ✅ Funcional |
| `/` (Dashboard) | ✅ Funcional (con tarjetas de ejemplo) |
| `/ordenes`, `/clientes`, `/mapa`, `/reportes`, `/planes` | 🚧 Placeholder — ya tienen ruta e ícono en sidebar |
| `/almacen`, `/almacen/inventario`, `/almacen/devoluciones`, `/almacen/reportes` | 🚧 Placeholder |
| `/tecnicos`, `/secretarios`, `/planta-externa` | 🚧 Placeholder |

## 🎨 Diseño
- Tipografía: Inter
- Paleta: azul acento (`#1E3A8A` / `#2563EB`), fondo claro
- Sidebar colapsable + responsive (drawer en móvil)
- Topbar con título dinámico por ruta y menú de usuario

## 🏗️ Estructura

```
src/
├── main.jsx
├── App.jsx                  # Router
├── index.css                # Design tokens
├── pages/
│   ├── Login.jsx
│   ├── Dashboard.jsx
│   └── EnConstruccion.jsx   # Placeholder reutilizable
├── components/
│   ├── ProtectedRoute.jsx
│   └── layout/
│       ├── Layout.jsx
│       ├── Sidebar.jsx
│       └── Topbar.jsx
├── services/api.js          # Axios + llamadas a auth
├── store/auth.store.js      # Zustand: login/logout/token
└── queryClient.js
```

## ➕ Cómo agregar un módulo nuevo
1. Crea la página en `src/pages/<Modulo>.jsx`
2. Reemplaza el `<EnConstruccion />` correspondiente en `App.jsx` por tu página
3. Agrega las llamadas API en `src/services/api.js`
4. Si necesitas un ícono distinto en el sidebar, edítalo en `Sidebar.jsx`
