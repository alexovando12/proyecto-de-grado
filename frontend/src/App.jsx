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
import InventarioPage from "./pages/InventarioPage.jsx";
import ReportesPage from "./pages/ReportesPage.jsx";
import Header from "./components/layout/Header.jsx";

const ROLE_DEFAULT_PATH = {
  admin: "/reportes",
  mozo: "/pedidos",
  caja: "/pedidos",
  cocina: "/cocina",
};

const normalizeRole = (rol) => String(rol || "").toLowerCase();

const getDefaultPathByRole = (rol) => {
  const normalizedRole = normalizeRole(rol);
  return ROLE_DEFAULT_PATH[normalizedRole] || "/pedidos";
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
    return <Navigate to={getDefaultPathByRole(userRole)} replace />;
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

  return <Navigate to={getDefaultPathByRole(user.rol)} replace />;
};

const FallbackRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <Navigate to={getDefaultPathByRole(user.rol)} replace />;
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
            <Route path="*" element={<FallbackRedirect />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
