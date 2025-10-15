import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { reporteService } from '../services/reporteService.js';

const ReportesPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('ventas');
  const [reporteData, setReporteData] = useState([]);
  const [filtros, setFiltros] = useState({
    fechaInicio: '',
    fechaFin: ''
  });

  useEffect(() => {
    cargarReporte();
  }, [activeTab, filtros]);

  const cargarReporte = async () => {
    try {
      let data;
      switch (activeTab) {
        case 'ventas':
          data = await reporteService.generarReporteVentas(filtros);
          break;
        case 'productos':
          data = await reporteService.generarReporteProductosPopulares(filtros);
          break;
        case 'inventario':
          data = await reporteService.generarReporteInventario();
          break;
        case 'movimientos':
          data = await reporteService.generarReporteMovimientos(filtros);
          break;
        default:
          data = [];
      }
      setReporteData(data);
    } catch (error) {
      console.error('Error al cargar reporte:', error);
    }
  };

  const handleExportar = () => {
    // Implementar exportación a CSV o PDF
    console.log('Exportando reporte...');
  };

  const formatearMoneda = (valor) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(valor);
  };

  const getKPIs = () => {
    if (activeTab === 'ventas' && reporteData.length > 0) {
      const totalVentas = reporteData.reduce((sum, item) => sum + parseFloat(item.total_ventas), 0);
      const totalPedidos = reporteData.reduce((sum, item) => sum + parseInt(item.total_pedidos), 0);
      const ticketPromedio = totalVentas / totalPedidos;
      
      return [
        { label: 'Total Ventas', value: formatearMoneda(totalVentas), trend: 'positive' },
        { label: 'Total Pedidos', value: totalPedidos, trend: 'positive' },
        { label: 'Ticket Promedio', value: formatearMoneda(ticketPromedio), trend: 'neutral' }
      ];
    }
    return [];
  };

  const renderTablaVentas = () => (
    <div className="reporte-table-container">
      <table className="reporte-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Total Pedidos</th>
            <th>Total Ventas</th>
            <th>Ticket Promedio</th>
          </tr>
        </thead>
        <tbody>
          {reporteData.map((item, index) => (
            <tr key={index}>
              <td>{new Date(item.fecha).toLocaleDateString()}</td>
              <td>{item.total_pedidos}</td>
              <td>{formatearMoneda(item.total_ventas)}</td>
              <td>{formatearMoneda(item.ticket_promedio)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderTablaProductos = () => (
    <div className="reporte-table-container">
      <table className="reporte-table">
        <thead>
          <tr>
            <th>Producto</th>
            <th>Veces Pedido</th>
            <th>Total Unidades</th>
            <th>Total Ventas</th>
          </tr>
        </thead>
        <tbody>
          {reporteData.map((item, index) => (
            <tr key={index}>
              <td>{item.nombre}</td>
              <td>{item.veces_pedido}</td>
              <td>{item.total_unidades}</td>
              <td>{formatearMoneda(item.total_ventas)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderTablaInventario = () => (
    <div className="reporte-table-container">
      <table className="reporte-table">
        <thead>
          <tr>
            <th>Ingrediente</th>
            <th>Unidad</th>
            <th>Stock Actual</th>
            <th>Stock Mínimo</th>
            <th>Valor Total</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {reporteData.map((item, index) => (
            <tr key={index}>
              <td>{item.nombre}</td>
              <td>{item.unidad}</td>
              <td>{item.stock_actual}</td>
              <td>{item.stock_minimo}</td>
              <td>{formatearMoneda(item.valor_total)}</td>
              <td>
                <span className={`reporte-badge ${
                  item.estado === 'CRITICO' ? 'danger' : 
                  item.estado === 'BAJO' ? 'warning' : 'success'
                }`}>
                  {item.estado}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderTablaMovimientos = () => (
    <div className="reporte-table-container">
      <table className="reporte-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Tipo</th>
            <th>Total Movimientos</th>
            <th>Total Cantidad</th>
            <th>Valor Económico</th>
          </tr>
        </thead>
        <tbody>
          {reporteData.map((item, index) => (
            <tr key={index}>
              <td>{new Date(item.fecha).toLocaleDateString()}</td>
              <td>
                <span className={`reporte-badge ${item.tipo === 'entrada' ? 'success' : 'warning'}`}>
                  {item.tipo}
                </span>
              </td>
              <td>{item.total_movimientos}</td>
              <td>{item.total_cantidad}</td>
              <td>{formatearMoneda(item.valor_economico)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="reportes-container">
      <header className="reportes-header">
        <div className="reportes-header-content">
          <div>
            <h1 className="reportes-title">Reportes y Estadísticas</h1>
          </div>
        </div>
      </header>

      <main className="reportes-content">
        <div className="container">
          {/* Pestañas */}
          <div className="reportes-tabs">
            <button 
              className={`reportes-tab ${activeTab === 'ventas' ? 'active' : ''}`}
              onClick={() => setActiveTab('ventas')}
            >
              Ventas
            </button>
            <button 
              className={`reportes-tab ${activeTab === 'productos' ? 'active' : ''}`}
              onClick={() => setActiveTab('productos')}
            >
              Productos Populares
            </button>
            <button 
              className={`reportes-tab ${activeTab === 'inventario' ? 'active' : ''}`}
              onClick={() => setActiveTab('inventario')}
            >
              Inventario
            </button>
            <button 
              className={`reportes-tab ${activeTab === 'movimientos' ? 'active' : ''}`}
              onClick={() => setActiveTab('movimientos')}
            >
              Movimientos
            </button>
          </div>

          {/* Filtros */}
          {(activeTab === 'ventas' || activeTab === 'productos' || activeTab === 'movimientos') && (
            <div className="reportes-filtros">
              <h3 className="reportes-filtros-title">Filtros</h3>
              <div className="reportes-filtros-grid">
                <div className="reportes-filtros-group">
                  <label className="reportes-filtros-label">Fecha Inicio</label>
                  <input
                    type="date"
                    className="reportes-filtros-input"
                    value={filtros.fechaInicio}
                    onChange={(e) => setFiltros({...filtros, fechaInicio: e.target.value})}
                  />
                </div>
                <div className="reportes-filtros-group">
                  <label className="reportes-filtros-label">Fecha Fin</label>
                  <input
                    type="date"
                    className="reportes-filtros-input"
                    value={filtros.fechaFin}
                    onChange={(e) => setFiltros({...filtros, fechaFin: e.target.value})}
                  />
                </div>
              </div>
              <div className="reportes-filtros-actions">
                <button className="btn btn-primary" onClick={cargarReporte}>
                  Aplicar Filtros
                </button>
                <button className="btn btn-secondary" onClick={() => {
                  setFiltros({ fechaInicio: '', fechaFin: '' });
                  cargarReporte();
                }}>
                  Limpiar
                </button>
              </div>
            </div>
          )}

          {/* KPIs */}
          {activeTab === 'ventas' && getKPIs().length > 0 && (
            <div className="reporte-kpi-grid">
              {getKPIs().map((kpi, index) => (
                <div key={index} className="reporte-kpi-card">
                  <div className="reporte-kpi-value">{kpi.value}</div>
                  <div className="reporte-kpi-label">{kpi.label}</div>
                  <div className={`reporte-kpi-trend ${kpi.trend}`}>
                    {kpi.trend === 'positive' ? '↗' : kpi.trend === 'negative' ? '↘' : '→'}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Contenido del reporte */}
          {activeTab === 'ventas' && renderTablaVentas()}
          {activeTab === 'productos' && renderTablaProductos()}
          {activeTab === 'inventario' && renderTablaInventario()}
          {activeTab === 'movimientos' && renderTablaMovimientos()}

          {/* Acciones */}
          <div className="reporte-acciones">
            <button className="reporte-btn-exportar" onClick={handleExportar}>
              📊 Exportar Reporte
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ReportesPage;