const bcrypt = require("bcryptjs");
const Usuario = require("../models/Usuario");

const ROLES_PERMITIDOS = ["admin", "mozo", "cocina", "caja"];

const limpiarUsuario = (usuario) => {
  if (!usuario) return usuario;
  const { contrasena, ...usuarioSinContrasena } = usuario;
  return usuarioSinContrasena;
};

const normalizarEmail = (email) => String(email || "").trim().toLowerCase();
const normalizarNombre = (nombre) => String(nombre || "").trim();
const normalizarRol = (rol) => String(rol || "").trim().toLowerCase();

const validarRol = (rol) => ROLES_PERMITIDOS.includes(rol);

const getUniqueUserErrorMessage = (error) => {
  if (!error || error.code !== "23505") return null;

  const constraint = String(error.constraint || "").toLowerCase();
  const detail = String(error.detail || "").toLowerCase();

  if (constraint.includes("email") || detail.includes("email")) {
    return "Ya existe un usuario con ese email.";
  }

  return "Ya existe un usuario con esos datos.";
};

exports.obtenerUsuarios = async (req, res) => {
  try {
    const usuarios = await Usuario.obtenerTodos();
    res.json(usuarios.map(limpiarUsuario));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.obtenerUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario = await Usuario.obtenerPorId(id);

    if (!usuario) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.json(limpiarUsuario(usuario));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.crearUsuario = async (req, res) => {
  try {
    const nombre = normalizarNombre(req.body.nombre);
    const email = normalizarEmail(req.body.email);
    const passwordPlano = String(
      req.body.password ?? req.body.contrasena ?? "",
    ).trim();
    const rol = normalizarRol(req.body.rol);

    if (!nombre || !email || !passwordPlano || !rol) {
      return res.status(400).json({
        error: "Nombre, email, contrasena y rol son requeridos",
      });
    }

    if (!validarRol(rol)) {
      return res.status(400).json({
        error: "Rol inválido. Valores permitidos: admin, mozo, cocina, caja",
      });
    }

    const contrasena = bcrypt.hashSync(passwordPlano, 10);

    const usuarioCreado = await Usuario.crear({
      nombre,
      email,
      contrasena,
      rol,
    });

    res.status(201).json(limpiarUsuario(usuarioCreado));
  } catch (error) {
    const uniqueErrorMessage = getUniqueUserErrorMessage(error);
    if (uniqueErrorMessage) {
      return res.status(409).json({ error: uniqueErrorMessage });
    }

    res.status(500).json({ error: error.message });
  }
};

exports.actualizarUsuario = async (req, res) => {
  try {
    const { id } = req.params;

    const usuarioActual = await Usuario.obtenerPorId(id);
    if (!usuarioActual) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const nombre =
      req.body.nombre !== undefined
        ? normalizarNombre(req.body.nombre)
        : usuarioActual.nombre;
    const email =
      req.body.email !== undefined
        ? normalizarEmail(req.body.email)
        : usuarioActual.email;
    const rol =
      req.body.rol !== undefined
        ? normalizarRol(req.body.rol)
        : normalizarRol(usuarioActual.rol);

    if (!nombre || !email || !rol) {
      return res.status(400).json({
        error: "Nombre, email y rol no pueden quedar vacíos",
      });
    }

    if (!validarRol(rol)) {
      return res.status(400).json({
        error: "Rol inválido. Valores permitidos: admin, mozo, cocina, caja",
      });
    }

    const passwordPlanoRaw = req.body.password ?? req.body.contrasena;
    let contrasena = usuarioActual.contrasena;

    if (passwordPlanoRaw !== undefined) {
      const passwordPlano = String(passwordPlanoRaw).trim();

      if (!passwordPlano) {
        return res
          .status(400)
          .json({ error: "La contrasena no puede ser vacía" });
      }

      // Se usa el mismo algoritmo que en login (bcrypt): hash al guardar, compare al autenticar.
      contrasena = bcrypt.hashSync(passwordPlano, 10);
    }

    const usuarioActualizado = await Usuario.actualizar(id, {
      nombre,
      email,
      contrasena,
      rol,
    });

    res.json(limpiarUsuario(usuarioActualizado));
  } catch (error) {
    const uniqueErrorMessage = getUniqueUserErrorMessage(error);
    if (uniqueErrorMessage) {
      return res.status(409).json({ error: uniqueErrorMessage });
    }

    res.status(500).json({ error: error.message });
  }
};

exports.eliminarUsuario = async (req, res) => {
  try {
    const { id } = req.params;

    if (Number(req.usuario?.id) === Number(id)) {
      return res.status(400).json({
        error: "No puedes eliminar el usuario autenticado actualmente",
      });
    }

    const usuarioEliminado = await Usuario.eliminar(id);

    if (!usuarioEliminado) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.json(limpiarUsuario(usuarioEliminado));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
