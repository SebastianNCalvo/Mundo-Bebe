import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import '../styles/HistorialVentas.css';

const HistorialVentas = () => {
  const [ventas, setVentas] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [vendedorFiltro, setVendedorFiltro] = useState('Todos');
  const [cargando, setCargando] = useState(false);
  const [vista, setVista] = useState('todo');

  // Estados para Edición
  const [editandoGasto, setEditandoGasto] = useState(null); // Guardará el ID del gasto a editar

  useEffect(() => {
    obtenerDatos();
  }, [mes, anio]);

  const obtenerDatos = async () => {
    setCargando(true);
    const fechaInicio = `${anio}-${String(mes).padStart(2, '0')}-01`;
    const proximoMes = mes === 12 ? 1 : mes + 1;
    const proximoAnio = mes === 12 ? anio + 1 : anio;
    const fechaFin = `${proximoAnio}-${String(proximoMes).padStart(2, '0')}-01`;

    const promesaVentas = supabase.from('ventas_cabecera').select(`id, fecha, vendedor_email, total_total, metodo_pago, ventas_detalle(cantidad, productos(nombre, talle))`).gte('fecha', fechaInicio).lt('fecha', fechaFin).order('fecha', { ascending: false });
    const promesaGastos = supabase.from('gastos').select('*').gte('fecha', fechaInicio).lt('fecha', fechaFin).order('fecha', { ascending: false });

    const [resVentas, resGastos] = await Promise.all([promesaVentas, promesaGastos]);
    setVentas(resVentas.data || []);
    setGastos(resGastos.data || []);
    setCargando(false);
  };

  // --- Lógica de Acciones para Gastos ---
  const eliminarGasto = async (id) => {
    if (!window.confirm("¿Estás seguro de eliminar este gasto?")) return;
    
    const { error } = await supabase.from('gastos').delete().eq('id', id);
    if (error) alert("Error al eliminar");
    else obtenerDatos(); // Recargar datos
  };

  const guardarEdicionGasto = async (e) => {
    e.preventDefault();
    const { error } = await supabase
      .from('gastos')
      .update({
        descripcion: editandoGasto.descripcion,
        monto: parseFloat(editandoGasto.monto),
        categoria: editandoGasto.categoria
      })
      .eq('id', editandoGasto.id);

    if (error) alert("Error al actualizar");
    else {
      setEditandoGasto(null);
      obtenerDatos();
    }
  };

  // --- Lógica de Cálculos ---
  const listaVendedores = ['Todos', ...new Set([...ventas.map(v => v.vendedor_email), ...gastos.map(g => g.vendedor_email)])].filter(Boolean);
  const ventasFiltradas = vendedorFiltro === 'Todos' ? ventas : ventas.filter(v => v.vendedor_email === vendedorFiltro);
  const gastosFiltrados = vendedorFiltro === 'Todos' ? gastos : gastos.filter(g => g.vendedor_email === vendedorFiltro);

  const totalVentas = ventasFiltradas.reduce((acc, v) => acc + (Number(v.total_total) || 0), 0);
  const totalGastos = gastosFiltrados.reduce((acc, g) => acc + (Number(g.monto) || 0), 0);
  const balanceNeto = totalVentas - totalGastos;

  const resumenPagos = ventasFiltradas.reduce((acc, v) => {
    const metodo = v.metodo_pago || 'Efectivo';
    acc[metodo] = (acc[metodo] || 0) + Number(v.total_total);
    return acc;
  }, {});

  // --- Renderizado de Tablas ---
  const renderTablaVentas = () => (
    <div className="tabla-historial-wrapper animar-entrada">
      <h3>Ventas Realizadas</h3>
      <table className="tabla-inventario">
        <thead>
          <tr><th>Fecha</th><th>Vendedor</th><th>Productos</th><th>Pago</th><th>Total</th></tr>
        </thead>
        <tbody>
          {ventasFiltradas.map(venta => (
            <tr key={venta.id}>
              <td data-label="Fecha">{new Date(venta.fecha).toLocaleDateString('es-AR')}</td>
              <td data-label="Vendedor">{venta.vendedor_email?.split('@')[0]}</td>
              <td data-label="Productos" style={{ textAlign: 'left' }}>
                {venta.ventas_detalle.map((d, i) => <div key={i}>• {d.productos?.nombre} x{d.cantidad}</div>)}
              </td>
              <td data-label="Pago"><span className={`tag-pago ${venta.metodo_pago?.toLowerCase()}`}>{venta.metodo_pago}</span></td>
              <td data-label="Total" className="texto-total-venta">${venta.total_total.toLocaleString('es-AR')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderTablaGastos = () => (
    <div className="tabla-historial-wrapper animar-entrada" style={{ marginTop: '30px' }}>
      <h3>Gastos Registrados</h3>
      <table className="tabla-inventario">
        <thead>
          <tr><th>Fecha</th><th>Descripción</th><th>Categoría</th><th>Monto</th><th>Acciones</th></tr>
        </thead>
        <tbody>
          {gastosFiltrados.map(gasto => (
            <tr key={gasto.id}>
              <td data-label="Fecha">{new Date(gasto.fecha).toLocaleDateString('es-AR')}</td>
              <td data-label="Descripción">{gasto.descripcion}</td>
              <td data-label="Categoría"><span className="tag-categoria">{gasto.categoria}</span></td>
              <td data-label="Monto" style={{ color: 'var(--color-peligro)', fontWeight: 'bold' }}>
                -${gasto.monto.toLocaleString('es-AR')}
              </td>
              <td data-label="Acciones">
                <div className="acciones-gasto">
                  <button onClick={() => setEditandoGasto(gasto)} className="btn-edit">✏️</button>
                  <button onClick={() => eliminarGasto(gasto.id)} className="btn-delete">🗑️</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="historial-container">
      {/* MODAL DE EDICIÓN (Simple) */}
      {editandoGasto && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h4>Editar Gasto</h4>
            <form onSubmit={guardarEdicionGasto}>
              <input 
                type="text" 
                value={editandoGasto.descripcion} 
                onChange={(e) => setEditandoGasto({...editandoGasto, descripcion: e.target.value})}
                required
              />
              <input 
                type="number" 
                value={editandoGasto.monto} 
                onChange={(e) => setEditandoGasto({...editandoGasto, monto: e.target.value})}
                required
              />
              <select 
                value={editandoGasto.categoria}
                onChange={(e) => setEditandoGasto({...editandoGasto, categoria: e.target.value})}
              >
                <option value="Mercadería">Mercadería</option>
                <option value="Alquiler">Alquiler</option>
                <option value="Servicios">Servicios</option>
                <option value="Varios">Varios</option>
              </select>
              <div className="modal-botones">
                <button type="submit" className="btn-confirmar">Guardar</button>
                <button type="button" onClick={() => setEditandoGasto(null)} className="btn-cancelar">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resto del Dashboard... */}
      <div className="dashboard-balance">
        <div className={`card-balance ingresos clicable ${vista === 'ventas' ? 'activa' : ''}`} onClick={() => setVista('ventas')}>
          <small>Ventas (+)</small>
          <span>${totalVentas.toLocaleString('es-AR')}</span>
        </div>
        <div className={`card-balance egresos clicable ${vista === 'gastos' ? 'activa' : ''}`} onClick={() => setVista('gastos')}>
          <small>Gastos (-)</small>
          <span>${totalGastos.toLocaleString('es-AR')}</span>
        </div>
        <div className={`card-balance resultado clicable ${vista === 'todo' ? 'activa' : ''} ${balanceNeto >= 0 ? 'positivo' : 'negativo'}`} onClick={() => setVista('todo')}>
          <small>Balance Neto</small>
          <span>${balanceNeto.toLocaleString('es-AR')}</span>
        </div>
      </div>

      <div className="historial-filtros">
        <select value={vendedorFiltro} onChange={(e) => setVendedorFiltro(e.target.value)}>
          {listaVendedores.map(vend => (
            <option key={vend} value={vend}>{vend === 'Todos' ? 'Todos los Vendedores' : vend.split('@')[0]}</option>
          ))}
        </select>
        <select value={mes} onChange={(e) => setMes(parseInt(e.target.value))}>
          <option value="1">Enero</option><option value="2">Febrero</option><option value="3">Marzo</option>
          <option value="4">Abril</option><option value="5">Mayo</option><option value="6">Junio</option>
          <option value="7">Julio</option><option value="8">Agosto</option><option value="9">Septiembre</option>
          <option value="10">Octubre</option><option value="11">Noviembre</option><option value="12">Diciembre</option>
        </select>
        <select value={anio} onChange={(e) => setAnio(parseInt(e.target.value))}>
          <option value="2025">2025</option><option value="2026">2026</option>
        </select>
      </div>

      {cargando ? <p style={{ textAlign: 'center' }}>Cargando...</p> : (
        <>
          {(vista === 'ventas' || vista === 'todo') && renderTablaVentas()}
          {(vista === 'gastos' || vista === 'todo') && renderTablaGastos()}
        </>
      )}
    </div>
  );
};

export default HistorialVentas;