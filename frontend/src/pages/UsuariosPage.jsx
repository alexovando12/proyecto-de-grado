import React, { useEffect, useMemo, useState } from "react";
import { usuarioService } from "../services/usuarioService.js";

const ROLES = ["admin", "mozo", "cocina", "caja"];

const EMPTY_FORM = {
  nombre: "",
  email: "",
  password: "",
  rol: "mozo",
};

const UsuariosPage = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUsuario, setEditingUsuario] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const closeModal = () => {
    setShowForm(false);
    setEditingUsuario(null);
    setFormData(EMPTY_FORM);
    setError(null);
  };

  const cargarUsuarios = async () => {
    try {
      setLoading(true);
      const data = await usuarioService.obtenerTodos();
      setUsuarios(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          err?.message ||
          "Error al cargar usuarios",
      );
      setUsuarios([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const usuariosFiltrados = useMemo(() => {
    const texto = String(searchText || "")
      .toLowerCase()
      .trim();
    if (!texto) return usuarios;

    return usuarios.filter((usuario) => {
      return [
        usuario.nombre,
        usuario.email,
        usuario.rol,
        String(usuario.id),
      ].some((campo) =>
        String(campo || "")
          .toLowerCase()
          .includes(texto),
      );
    });
  }, [usuarios, searchText]);

  const handleEdit = (usuario) => {
    setEditingUsuario(usuario);
    setFormData({
      nombre: usuario.nombre || "",
      email: usuario.email || "",
      password: "",
      rol: usuario.rol || "mozo",
    });
    setShowForm(true);
    setError(null);
  };

  const handleDelete = async (usuario) => {
    const confirmacion = window.confirm(
      `¿Eliminar lógicamente al usuario ${usuario.nombre}?`,
    );

    if (!confirmacion) return;

    try {
      setLoading(true);
      setError(null);
      await usuarioService.eliminar(usuario.id);
      await cargarUsuarios();
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          err?.message ||
          "No se pudo eliminar usuario",
      );
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const nombre = String(formData.nombre || "").trim();
    const email = String(formData.email || "").trim();
    const password = String(formData.password || "").trim();
    const rol = String(formData.rol || "")
      .trim()
      .toLowerCase();

    if (!nombre || !email || !rol) {
      setError("Nombre, email y rol son requeridos");
      return;
    }

    if (!editingUsuario && !password) {
      setError("La contraseña es obligatoria para crear un usuario");
      return;
    }

    if (!ROLES.includes(rol)) {
      setError("Rol inválido");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload = {
        nombre,
        email,
        rol,
        ...(password ? { password } : {}),
      };

      if (editingUsuario) {
        await usuarioService.actualizar(editingUsuario.id, payload);
      } else {
        await usuarioService.crear(payload);
      }

      closeModal();
      await cargarUsuarios();
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          err?.message ||
          "No se pudo guardar usuario",
      );
      setLoading(false);
    }
  };

  return (
    <div className="usuarios-container">
      <main className="usuarios-content">
        <div className="container">
          <div className="usuarios-header">
            <div>
              <h1 className="usuarios-title">Gestión de Usuarios</h1>
              <p className="usuarios-subtitle">
                Administración de cuentas del sistema
              </p>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => {
                setEditingUsuario(null);
                setFormData(EMPTY_FORM);
                setShowForm(true);
                setError(null);
              }}
              disabled={loading}
            >
              Nuevo Usuario
            </button>
          </div>

          {error && (
            <div className="usuarios-error" role="alert">
              {error}
            </div>
          )}

          <div className="usuarios-toolbar">
            <input
              type="text"
              className="usuarios-search"
              placeholder="Buscar por id, nombre, email o rol..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              disabled={loading}
            />
          </div>

          {loading && usuarios.length === 0 ? (
            <div>Cargando usuarios...</div>
          ) : usuarios.length === 0 ? (
            <div className="usuarios-empty">No hay usuarios registrados.</div>
          ) : usuariosFiltrados.length === 0 ? (
            <div className="usuarios-empty">
              No se encontraron usuarios con ese filtro.
            </div>
          ) : (
            <div className="usuarios-table-wrap">
              <table className="usuarios-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Rol</th>
                    <th>Fecha creación</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {usuariosFiltrados.map((usuario) => (
                    <tr key={usuario.id}>
                      <td>{usuario.id}</td>
                      <td>{usuario.nombre}</td>
                      <td>{usuario.email}</td>
                      <td>
                        <span className="usuarios-rol-badge">
                          {usuario.rol}
                        </span>
                      </td>
                      <td>
                        {usuario.fecha_creacion
                          ? new Date(usuario.fecha_creacion).toLocaleString()
                          : "-"}
                      </td>
                      <td>
                        <div className="usuarios-actions">
                          <button
                            className="btn btn-sm btn-warning"
                            onClick={() => handleEdit(usuario)}
                            disabled={loading}
                          >
                            Editar
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDelete(usuario)}
                            disabled={loading}
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {showForm && (
            <div className="modal-overlay">
              <div className="modal-content">
                <h3>{editingUsuario ? "Editar Usuario" : "Nuevo Usuario"}</h3>
                <form onSubmit={handleSubmit} className="usuarios-form">
                  <div className="usuarios-form-group">
                    <label>Nombre</label>
                    <input
                      type="text"
                      value={formData.nombre}
                      onChange={(e) =>
                        setFormData({ ...formData, nombre: e.target.value })
                      }
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="usuarios-form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="usuarios-form-group">
                    <label>
                      Contraseña
                      {editingUsuario ? " (opcional para mantener actual)" : ""}
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      required={!editingUsuario}
                      disabled={loading}
                    />
                  </div>

                  <div className="usuarios-form-group">
                    <label>Rol</label>
                    <select
                      value={formData.rol}
                      onChange={(e) =>
                        setFormData({ ...formData, rol: e.target.value })
                      }
                      required
                      disabled={loading}
                    >
                      {ROLES.map((rol) => (
                        <option key={rol} value={rol}>
                          {rol}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="usuarios-form-actions">
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={loading}
                    >
                      {editingUsuario ? "Actualizar" : "Crear"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={closeModal}
                      disabled={loading}
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default UsuariosPage;
