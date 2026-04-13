import React from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

const ROLE_MODULES = {
  admin: [
    { to: "/reportes", label: "Reportes" },
    { to: "/mesas", label: "Mesas" },
    { to: "/productos", label: "Productos" },
    { to: "/pedidos", label: "Pedidos" },
    { to: "/cocina", label: "Cocina" },
    { to: "/inventario", label: "Inventario" },
  ],
  mozo: [{ to: "/pedidos", label: "Pedidos" }],
  caja: [{ to: "/pedidos", label: "Pedidos" }],
  cocina: [{ to: "/cocina", label: "Cocina" }],
};

const ROLE_DEFAULT_PATH = {
  admin: "/reportes",
  mozo: "/pedidos",
  caja: "/pedidos",
  cocina: "/cocina",
};

const normalizeRole = (rol) => String(rol || "").toLowerCase();

const Header = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const role = normalizeRole(user?.rol);
  const modules = ROLE_MODULES[role] || [];
  const defaultPath = ROLE_DEFAULT_PATH[role] || "/pedidos";

  const onLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-left">
          <Link to={defaultPath} className="header-logo-link">
            <div className="header-logo">
              <h1 className="header-title">Garden Gates</h1>
              <p className="header-subtitle">Sistema de Restaurante</p>
            </div>
          </Link>

          <nav className="header-nav" aria-label="Navegacion principal">
            {modules.map((module) => (
              <NavLink
                key={module.to}
                to={module.to}
                className={({ isActive }) =>
                  `header-nav-link${isActive ? " active" : ""}`
                }
              >
                {module.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="header-user">
          <span className="header-user-name">{user?.nombre || "Usuario"}</span>
          <span className="header-user-role">{role || "sin-rol"}</span>
          <button className="btn btn-secondary" onClick={onLogout}>
            Cerrar Sesion
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
