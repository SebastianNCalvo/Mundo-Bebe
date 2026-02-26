import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { generarFacturaPDF } from './GeneradorPDF'; 
import '../styles/HistorialVentas.css';

const HistorialVentas = () => {
  const [ventas, setVentas] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [cambios, setCambios] = useState([]); 
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [vendedorFiltro, setVendedorFiltro] = useState('Todos');
  const [cargando, setCargando] = useState(false);
  const [vista, setVista] = useState('todo');
  const [busquedaCodigo, setBusquedaCodigo] = useState('');
  const [editandoGasto, setEditandoGasto] = useState(null);
  const [editandoVenta, setEditandoVenta] = useState(null);
  const [idRecienActualizado, setIdRecienActualizado] = useState(null);

  useEffect(() => {
    obtenerDatos();
  }, [mes, anio]);

  const obtenerDatos = async () => {
    setCargando(true);
    const fechaInicio = `${anio}-${String(mes).padStart(2, '0')}-01`;
    const proximoMes = mes === 12 ? 1 : mes + 1;
    const proximoAnio = mes === 12 ? anio + 1 : anio;
    const fechaFin = `${proximoAnio}-${String(proximoMes).padStart(2, '0')}-01`;

    const promesaVentas = supabase
      .from('ventas_cabecera')
      .select(`id, fecha, vendedor_email, total_total, metodo_pago, codigo_venta, ventas_detalle(cantidad, precio_unitario, productos(nombre, talle))`)
      .gte('fecha', fechaInicio)
      .lt('fecha', fechaFin)
      .order('fecha', { ascending: false });

    const promesaGastos = supabase
      .from('gastos')
      .select('*')
      .gte('fecha', fechaInicio)
      .lt('fecha', fechaFin)
      .order('fecha', { ascending: false });

    const promesaCambios = supabase
      .from('cambios_registros')
      .select(`*, 
        producto_devuelto:productos!producto_devuelto_id(nombre, talle), 
        producto_nuevo:productos!producto_nuevo_id(nombre, talle),
        venta_origen:ventas_cabecera(codigo_venta)`)
      .gte('fecha', fechaInicio)
      .lt('fecha', fechaFin)
      .order('fecha', { ascending: false });

    const [resVentas, resGastos, resCambios] = await Promise.all([promesaVentas, promesaGastos, promesaCambios]);
    setVentas(resVentas.data || []);
    setGastos(resGastos.data || []);
    setCambios(resCambios.data || []); 
    setCargando(false);
  };

  const reimprimirFactura = (venta) => {
    const datosParaPDF = {
      codigo: venta.codigo_venta || `ANTIGUA-${venta.id}`,
      carrito: venta.ventas_detalle.map(d => ({
        nombre: d.productos?.nombre || 'Producto eliminado',
        talle: d.productos?.talle || '-',
        cantidadEnCarrito: d.cantidad,
        precio: d.precio_unitario
      })),
      total: venta.total_total,
      metodoPago: venta.metodo_pago,
      vendedor: venta.vendedor_email
    };
    generarFacturaPDF(datosParaPDF);
  };

  const aplicarFeedback = (id) => {
    setIdRecienActualizado(id);
    setTimeout(() => setIdRecienActualizado(null), 2000);
  };

  const eliminarVenta = async (id) => {
    if (!window.confirm("⚠️ ¿Estás seguro de eliminar esta venta? El stock volverá al inventario automáticamente.")) return;
    try {
      await supabase.from('ventas_detalle').delete().eq('venta_id', id); 
      const { error } = await supabase.from('ventas_cabecera').delete().eq('id', id);
      if (error) throw error;
      obtenerDatos();
    } catch (error) {
      console.error(error);
      alert("Error al eliminar venta");
    }
  };

  const guardarEdicionVenta = async (e) => {
    e.preventDefault();
    const { error } = await supabase
      .from('ventas_cabecera')
      .update({
        vendedor_email: editandoVenta.vendedor_email,
        metodo_pago: editandoVenta.metodo_pago
      })
      .eq('id', editandoVenta.id);

    if (error) alert("Error al actualizar");
    else {
      const idEditado = editandoVenta.id;
      setEditandoVenta(null);
      aplicarFeedback(idEditado);
      obtenerDatos();
    }
  };

  const eliminarGasto = async (id) => {
    if (!window.confirm("¿Estás seguro de eliminar este gasto?")) return;
    const { error } = await supabase.from('gastos').delete().eq('id', id);
    if (error) alert("Error al eliminar");
    else obtenerDatos();
  };

  const guardarEdicionGasto = async (e) => {
    e.preventDefault();
    const { error } = await supabase
      .from('gastos')
      .update({
        descripcion: editandoGasto.descripcion,
        monto: parseFloat(editandoGasto.monto),
        categoria: editandoGasto.categoria,
        metodo_pago: editandoGasto.metodo_pago
      })
      .eq('id', editandoGasto.id);

    if (error) alert("Error al actualizar");
    else {
      const idEditado = editandoGasto.id;
      setEditandoGasto(null);
      aplicarFeedback(idEditado);
      obtenerDatos();
    }
  };

  // --- LÓGICA DE FILTROS REFACTORIZADA ---
  const listaVendedores = ['Todos', ...new Set([
    ...ventas.map(v => v.vendedor_email), 
    ...gastos.map(g => g.vendedor_email),
    ...cambios.map(c => c.vendedor_email),
    ...cambios.map(c => c.vendedor_cambio_email) // Nuevo campo incluido
  ])].filter(Boolean);
  
  const ventasFiltradas = ventas.filter(v => {
    const cumpleVendedor = vendedorFiltro === 'Todos' || v.vendedor_email === vendedorFiltro;
    const cumpleCodigo = v.codigo_venta?.toLowerCase().includes(busquedaCodigo.toLowerCase());
    return cumpleVendedor && cumpleCodigo;
  });

  const gastosFiltrados = vendedorFiltro === 'Todos' ? gastos : gastos.filter(g => g.vendedor_email === vendedorFiltro);

  const cambiosFiltrados = cambios.filter(c => {
    // El cambio aparece si el vendedor fue el original O el que hizo el cambio
    const cumpleVendedor = vendedorFiltro === 'Todos' || 
                           c.vendedor_email === vendedorFiltro || 
                           c.vendedor_cambio_email === vendedorFiltro;
    const cumpleCodigo = c.venta_origen?.codigo_venta?.toLowerCase().includes(busquedaCodigo.toLowerCase());
    return cumpleVendedor && cumpleCodigo;
  });

  // --- CÁLCULOS DE BALANCE ---
  const totalVentas = ventasFiltradas.reduce((acc, v) => acc + (Number(v.total_total) || 0), 0);
  const totalGastos = gastosFiltrados.reduce((acc, g) => acc + (Number(g.monto) || 0), 0);
  const totalCobradoCambios = cambiosFiltrados.reduce((acc, c) => acc + (Number(c.monto_cobrado) || 0), 0);
  const totalCortesia = cambiosFiltrados.reduce((acc, c) => acc + (Number(c.monto_cortesia) || 0), 0);
  
  const balanceNeto = totalVentas + totalCobradoCambios - totalGastos;

  const formatearFechaHora = (fechaISO) => {
    return new Date(fechaISO).toLocaleString('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false
    });
  };

  const renderTablaVentas = () => (
    <div className="tabla-historial-wrapper animar-entrada">
      <h3>Ventas Realizadas</h3>
      <table className="tabla-inventario">
        <thead>
          <tr>
            <th>Cód. Venta</th>
            <th>Fecha y Hora</th>
            <th>Vendedor</th>
            <th>Productos</th>
            <th>Pago</th>
            <th>Total</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {ventasFiltradas.map(venta => (
            <tr key={venta.id} className={idRecienActualizado === venta.id ? 'fila-actualizada' : ''}>
              <td data-label="Código" style={{ fontWeight: 'bold', color: 'var(--color-acento)' }}>
                {venta.codigo_venta || '---'}
                {cambios.some(c => c.venta_origen_id === venta.id) && <span style={{fontSize: '10px', display: 'block', color: '#e67e22'}}>🔄 CON CAMBIO</span>}
              </td>
              <td data-label="Fecha/Hora">{formatearFechaHora(venta.fecha)}</td>
              <td data-label="Vendedor">{venta.vendedor_email?.split('@')[0]}</td>
              <td data-label="Productos" style={{ textAlign: 'left' }}>
                {venta.ventas_detalle.map((d, i) => <div key={i}>• {d.productos?.nombre} x{d.cantidad}</div>)}
              </td>
              <td data-label="Pago"><span className={`tag-pago ${venta.metodo_pago?.toLowerCase()}`}>{venta.metodo_pago}</span></td>
              <td data-label="Total" className="texto-total-venta">${venta.total_total.toLocaleString('es-AR')}</td>
              <td data-label="Acciones">
                <div className="acciones-gasto">
                  <button onClick={() => reimprimirFactura(venta)} className="btn-edit-icono" title="Reimprimir Factura">📄</button>
                  <button onClick={() => setEditandoVenta(venta)} className="btn-edit-icono">✏️</button>
                  <button onClick={() => eliminarVenta(venta.id)} className="btn-eliminar">🗑️</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderTablaCambios = () => (
    <div className="tabla-historial-wrapper animar-entrada" style={{ marginTop: '30px' }}>
      <h3 style={{color: '#e67e22'}}>Registro de Cambios (Devoluciones)</h3>
      <table className="tabla-inventario">
        <thead>
          <tr style={{background: '#fff3e0'}}>
            <th>Fecha</th>
            <th>Cód. Origen</th>
            <th>Vendedores (Orig | Gest)</th>
            <th>Entra / Sale</th>
            <th>Cortesía</th>
            <th>Cobrado</th>
          </tr>
        </thead>
        <tbody>
          {cambiosFiltrados.map(cambio => (
            <tr key={cambio.id}>
              <td>{formatearFechaHora(cambio.fecha)}</td>
              <td style={{ fontWeight: 'bold' }}>{cambio.venta_origen?.codigo_venta}</td>
              <td style={{ fontSize: '0.85em' }}>
                <span title="Vendedor Original" style={{color: '#7f8c8d'}}>{cambio.vendedor_email?.split('@')[0]}</span>
                {" | "}
                <span title="Gestionó el Cambio" style={{fontWeight: 'bold', color: 'var(--color-acento)'}}>{cambio.vendedor_cambio_email?.split('@')[0] || '---'}</span>
              </td>
              <td style={{ textAlign: 'left', fontSize: '0.9em' }}>
                <div style={{ color: 'var(--color-exito)' }}>📥 {cambio.producto_devuelto?.nombre}</div>
                <div style={{ color: 'var(--color-peligro)' }}>📤 {cambio.producto_nuevo?.nombre}</div>
              </td>
              <td style={{ color: '#e67e22' }}>${cambio.monto_cortesia.toLocaleString('es-AR')}</td>
              <td className="texto-total-venta">${cambio.monto_cobrado.toLocaleString('es-AR')}</td>
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
          <tr><th>Fecha y Hora</th><th>Descripción</th><th>Categoría</th><th>Pago</th><th>Monto</th><th>Acciones</th></tr>
        </thead>
        <tbody>
          {gastosFiltrados.map(gasto => (
            <tr key={gasto.id} className={idRecienActualizado === gasto.id ? 'fila-actualizada' : ''}>
              <td data-label="Fecha/Hora">{formatearFechaHora(gasto.fecha)}</td>
              <td data-label="Descripción">{gasto.descripcion}</td>
              <td data-label="Categoría"><span className="tag-categoria">{gasto.categoria}</span></td>
              <td data-label="Pago"><span className={`tag-pago ${gasto.metodo_pago?.toLowerCase() || 'efectivo'}`}>{gasto.metodo_pago || 'Efectivo'}</span></td>
              <td data-label="Monto" style={{ color: 'var(--color-peligro)', fontWeight: 'bold' }}>
                -${gasto.monto.toLocaleString('es-AR')}
              </td>
              <td data-label="Acciones">
                <div className="acciones-gasto">
                  <button onClick={() => setEditandoGasto(gasto)} className="btn-edit-icono">✏️</button>
                  <button onClick={() => eliminarGasto(gasto.id)} className="btn-eliminar">🗑️</button>
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
      {/* MODALES (Mantenidos) */}
      {editandoGasto && (
        <div className="modal-overlay animar-fade">
          <div className="modal-content animar-slide">
            <h4>Editar Gasto</h4>
            <form onSubmit={guardarEdicionGasto}>
              <div className="form-group">
                <label>Descripción</label>
                <input type="text" value={editandoGasto.descripcion} onChange={(e) => setEditandoGasto({...editandoGasto, descripcion: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Monto</label>
                <input type="number" value={editandoGasto.monto} onChange={(e) => setEditandoGasto({...editandoGasto, monto: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Categoría</label>
                <select value={editandoGasto.categoria} onChange={(e) => setEditandoGasto({...editandoGasto, categoria: e.target.value})}>
                  <option value="Mercadería">Mercadería</option><option value="Alquiler">Alquiler</option>
                  <option value="Servicios">Servicios</option><option value="Varios">Varios</option>
                </select>
              </div>
              <div className="form-group">
                <label>Método de Pago</label>
                <select value={editandoGasto.metodo_pago || 'Efectivo'} onChange={(e) => setEditandoGasto({...editandoGasto, metodo_pago: e.target.value})}>
                  <option value="Efectivo">💵 Efectivo</option><option value="Transferencia">🏦 Transferencia</option>
                  <option value="Débito">💳 Débito</option><option value="Crédito">💳 Crédito</option>
                </select>
              </div>
              <div className="modal-botones">
                <button type="submit" className="btn-confirmar">Guardar Cambios</button>
                <button type="button" onClick={() => setEditandoGasto(null)} className="btn-cancelar">Cerrar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editandoVenta && (
        <div className="modal-overlay animar-fade">
          <div className="modal-content animar-slide">
            <h4>Editar Venta</h4>
            <form onSubmit={guardarEdicionVenta}>
              <div className="form-group">
                <label>Vendedor</label>
                <select value={editandoVenta.vendedor_email} onChange={(e) => setEditandoVenta({...editandoVenta, vendedor_email: e.target.value})}>
                  {listaVendedores.filter(v => v !== 'Todos').map(v => <option key={v} value={v}>{v.split('@')[0]}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Método de Pago</label>
                <select value={editandoVenta.metodo_pago} onChange={(e) => setEditandoVenta({...editandoVenta, metodo_pago: e.target.value})}>
                  <option value="Efectivo">💵 Efectivo</option><option value="Transferencia">🏦 Transferencia</option>
                  <option value="Débito">💳 Débito</option><option value="Crédito">💳 Crédito</option>
                </select>
              </div>
              <div className="modal-botones">
                <button type="submit" className="btn-confirmar">Actualizar</button>
                <button type="button" onClick={() => setEditandoVenta(null)} className="btn-cancelar">Cerrar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="dashboard-balance">
        <div className={`card-balance ingresos clicable ${vista === 'ventas' ? 'activa' : ''}`} onClick={() => setVista('ventas')}>
          <small>Ventas (+)</small>
          <span>${(totalVentas + totalCobradoCambios).toLocaleString('es-AR')}</span>
        </div>
        <div className={`card-balance egresos clicable ${vista === 'gastos' ? 'activa' : ''}`} onClick={() => setVista('gastos')}>
          <small>Gastos (-)</small>
          <span>${totalGastos.toLocaleString('es-AR')}</span>
        </div>
        <div className={`card-balance resultado clicable ${vista === 'todo' ? 'activa' : ''} ${balanceNeto >= 0 ? 'positivo' : 'negativo'}`} onClick={() => setVista('todo')}>
          <small>Balance Neto</small>
          <span>${balanceNeto.toLocaleString('es-AR')}</span>
        </div>
        <div className={`card-balance clicable ${vista === 'cambios' ? 'activa' : ''}`} style={{borderLeft: '4px solid #e67e22'}} onClick={() => setVista('cambios')}>
          <small>Cortesías (🎁)</small>
          <span style={{color: '#e67e22'}}>${totalCortesia.toLocaleString('es-AR')}</span>
        </div>
      </div>

      <div className="historial-filtros">
        <input 
          type="text" 
          placeholder="🔍 Buscar por código MB-..." 
          value={busquedaCodigo}
          onChange={(e) => setBusquedaCodigo(e.target.value)}
          className="input-busqueda-codigo"
        />

        <select value={vendedorFiltro} onChange={(e) => setVendedorFiltro(e.target.value)}>
          {listaVendedores.map(vend => (
            <option key={vend} value={vend}>{vend === 'Todos' ? '👤 Todos' : vend.split('@')[0]}</option>
          ))}
        </select>
        <select value={mes} onChange={(e) => setMes(parseInt(e.target.value))}>
          <option value="1">📅 Enero</option><option value="2">📅 Febrero</option><option value="3">📅 Marzo</option>
          <option value="4">📅 Abril</option><option value="5">📅 Mayo</option><option value="6">📅 Junio</option>
          <option value="7">📅 Julio</option><option value="8">📅 Agosto</option><option value="9">📅 Septiembre</option>
          <option value="10">📅 Octubre</option><option value="11">📅 Noviembre</option><option value="12">📅 Diciembre</option>
        </select>
        <select value={anio} onChange={(e) => setAnio(parseInt(e.target.value))}>
          <option value="2025">🗓️ 2025</option><option value="2026">🗓️ 2026</option>
        </select>
      </div>

      {cargando ? (
        <div className="cargando-spinner">Cargando datos del período...</div>
      ) : (
        <>
          {(vista === 'ventas' || vista === 'todo') && renderTablaVentas()}
          {(vista === 'cambios' || vista === 'todo') && renderTablaCambios()}
          {(vista === 'gastos' || vista === 'todo') && renderTablaGastos()}
        </>
      )}
    </div>
  );
};

export default HistorialVentas;