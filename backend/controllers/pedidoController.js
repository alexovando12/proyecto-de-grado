const Pedido = require('../models/Pedido');
const DetallePedido = require('../models/DetallePedido');

exports.obtenerPedidos = async (req, res) => {
  try {
    const pedidos = await Pedido.obtenerTodos();
    res.json(pedidos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.obtenerPedido = async (req, res) => {
  try {
    const { id } = req.params;
    const pedido = await Pedido.obtenerPorId(id);
    
    if (!pedido) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }
    
    // Obtener detalles del pedido
    const detalles = await DetallePedido.obtenerPorPedido(id);
    
    res.json({ ...pedido, detalles });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.crearPedido = async (req, res) => {
  try {
    const { mesa_id, usuario_id, detalles } = req.body;
    
    // Crear el pedido
    const pedido = await Pedido.crear({ mesa_id, usuario_id });
    
    // Crear los detalles del pedido
    const detallesCreados = [];
    let total = 0;
    
    for (const detalle of detalles) {
      const detalleCreado = await DetallePedido.crear({
        pedido_id: pedido.id,
        producto_id: detalle.producto_id,
        cantidad: detalle.cantidad,
        notas: detalle.notas,
        precio: detalle.precio
      });
      detallesCreados.push(detalleCreado);
      total += detalle.precio * detalle.cantidad;
    }
    
    // Actualizar el total del pedido
    await Pedido.actualizar(pedido.id, { ...pedido, total });
    
    res.status(201).json({ 
      pedido: { ...pedido, total },
      detalles: detallesCreados 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.actualizarPedido = async (req, res) => {
  try {
    const { id } = req.params;
    const { mesa_id, usuario_id, estado, total } = req.body;
    
    const pedido = await Pedido.actualizar(id, { mesa_id, usuario_id, estado, total });
    res.json(pedido);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.eliminarPedido = async (req, res) => {
  try {
    const { id } = req.params;
    const pedido = await Pedido.eliminar(id);
    res.json(pedido);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.obtenerPedidosPorMesa = async (req, res) => {
  try {
    const { mesa_id } = req.params;
    const pedidos = await Pedido.obtenerPorMesa(mesa_id);
    res.json(pedidos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.obtenerPedidosPorEstado = async (req, res) => {
  try {
    const { estado } = req.params;
    const pedidos = await Pedido.obtenerPorEstado(estado);
    res.json(pedidos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.actualizarEstadoPedido = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    
    const pedido = await Pedido.actualizar(id, { estado });
    
    // Actualizar estado de los detalles
    await DetallePedido.actualizarEstadoPorPedido(id, estado);
    
    res.json(pedido);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};