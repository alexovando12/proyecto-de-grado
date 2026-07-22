import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import Login from "./pages/Login.jsx";
import MesasPage from "./pages/MesasPage.jsx";
import ProductosPage from "./pages/ProductosPage.jsx";
import PedidosPage from "./pages/PedidosPage.jsx";
import CocinaPage from "./pages/CocinaPage.jsx";
import CajaPage from "./pages/CajaPage.jsx";
import InventarioPage from "./pages/InventarioPage.jsx";
import ReportesPage from "./pages/ReportesPage.jsx";
import UsuariosPage from "./pages/UsuariosPage.jsx";
import Header from "./components/layout/Header.jsx";

const ROLE_DEFAULT_PATH = {
  admin: "/reportes",
  mozo: "/pedidos",
  caja: "/caja",
  cocina: "/cocina",
};

const normalizeRole = (rol) => String(rol || "").toLowerCase();

// 🔧 FIX: si el rol no es reconocido, devuelve null (no una ruta que puede volver a fallar)
const getDefaultPathByRole = (rol) => {
  const normalizedRole = normalizeRole(rol);
  return ROLE_DEFAULT_PATH[normalizedRole] || null;
};

const LoadingScreen = () => (
  <div
    style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <div>Cargando...</div>
  </div>
);

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  const userRole = normalizeRole(user.rol);
  const normalizedAllowedRoles = allowedRoles.map(normalizeRole);

  if (
    normalizedAllowedRoles.length > 0 &&
    !normalizedAllowedRoles.includes(userRole)
  ) {
    // 🔧 FIX: si no hay ruta segura para este rol, manda a login en vez de repetir la misma ruta
    const fallback = getDefaultPathByRole(userRole);
    return <Navigate to={fallback || "/"} replace />;
  }

  return (
    <>
      <Header />
      {children}
    </>
  );
};

const DashboardRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  // 🔧 FIX
  const fallback = getDefaultPathByRole(user.rol);
  return <Navigate to={fallback || "/"} replace />;
};

const FallbackRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  // 🔧 FIX
  const fallback = getDefaultPathByRole(user.rol);
  return <Navigate to={fallback || "/"} replace />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/dashboard" element={<DashboardRedirect />} />
            <Route
              path="/mesas"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <MesasPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/productos"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <ProductosPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pedidos"
              element={
                <ProtectedRoute allowedRoles={["admin", "mozo", "caja"]}>
                  <PedidosPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cocina"
              element={
                <ProtectedRoute allowedRoles={["admin", "cocina"]}>
                  <CocinaPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/caja"
              element={
                <ProtectedRoute allowedRoles={["admin", "caja"]}>
                  <CajaPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventario"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <InventarioPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reportes"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <ReportesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/usuarios"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <UsuariosPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<FallbackRedirect />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;