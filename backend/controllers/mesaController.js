const Mesa = require('../models/Mesa');

exports.obtenerMesas = async (req, res) => {
  try {
    const mesas = await Mesa.obtenerTodas();
    res.json(mesas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.crearMesa = async (req, res) => {
  try {
    const mesa = await Mesa.crear(req.body);
    res.status(201).json(mesa);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.actualizarMesa = async (req, res) => {
  try {
    const { id } = req.params;
    const mesa = await Mesa.actualizar(id, req.body);
    res.json(mesa);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.eliminarMesa = async (req, res) => {
  try {
    const { id } = req.params;
    const mesa = await Mesa.eliminar(id);
    res.json(mesa);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};