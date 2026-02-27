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
    if (!window.confirm("⚠️ ¿Estás seguro de eliminar esta venta?")) return;
    try {
      await supabase.from('ventas_detalle').delete().eq('venta_id', id); 
      const { error } = await supabase.from('ventas_cabecera').delete().eq('id', id);
      if (error) throw error;
      obtenerDatos();
    } catch (error) {
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
      aplicarFeedback(editandoVenta.id);
      setEditandoVenta(null);
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
      aplicarFeedback(editandoGasto.id);
      setEditandoGasto(null);
      obtenerDatos();
    }
  };

  const listaVendedores = ['Todos', ...new Set([
    ...ventas.map(v => v.vendedor_email), 
    ...gastos.map(g => g.vendedor_email),
    ...cambios.map(c => c.vendedor_email),
    ...cambios.map(c => c.vendedor_cambio_email)
  ])].filter(Boolean);
  
  const ventasFiltradas = ventas.filter(v => {
    const cumpleVendedor = vendedorFiltro === 'Todos' || v.vendedor_email === vendedorFiltro;
    const cumpleCodigo = v.codigo_venta?.toLowerCase().includes(busquedaCodigo.toLowerCase());
    return cumpleVendedor && cumpleCodigo;
  });

  const gastosFiltrados = vendedorFiltro === 'Todos' ? gastos : gastos.filter(g => g.vendedor_email === vendedorFiltro);

  const cambiosFiltrados = cambios.filter(c => {
    const cumpleVendedor = vendedorFiltro === 'Todos' || 
                           c.vendedor_email === vendedorFiltro || 
                           c.vendedor_cambio_email === vendedorFiltro;
    const cumpleCodigo = c.venta_origen?.codigo_venta?.toLowerCase().includes(busquedaCodigo.toLowerCase());
    return cumpleVendedor && cumpleCodigo;
  });

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
      <h3 className="titulo-tabla">Ventas Realizadas</h3>
      <table className="tabla-historial">
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
              <td data-label="Código" className="celda-codigo">
                {venta.codigo_venta || '---'}
                {cambios.some(c => c.venta_origen_id === venta.id) && <span className="badge-cambio-aviso">🔄 CAMBIO</span>}
              </td>
              <td data-label="Fecha/Hora">{formatearFechaHora(venta.fecha)}</td>
              <td data-label="Vendedor">{venta.vendedor_email?.split('@')[0]}</td>
              <td data-label="Productos" className="celda-productos-lista">
                {venta.ventas_detalle.map((d, i) => <div key={i}>• {d.productos?.nombre} (T:{d.productos?.talle}) x{d.cantidad}</div>)}
              </td>
              <td data-label="Pago"><span className={`tag-pago ${venta.metodo_pago?.toLowerCase()}`}>{venta.metodo_pago}</span></td>
              <td data-label="Total" className="texto-total-venta">${venta.total_total.toLocaleString('es-AR')}</td>
              <td data-label="Acciones">
                <div className="acciones-botones-historial">
                  <button onClick={() => reimprimirFactura(venta)} className="btn-historial-accion" title="PDF">📄</button>
                  <button onClick={() => setEditandoVenta(venta)} className="btn-historial-accion">✏️</button>
                  <button onClick={() => eliminarVenta(venta.id)} className="btn-historial-eliminar">🗑️</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderTablaCambios = () => (
    <div className="tabla-historial-wrapper animar-entrada seccion-cambios">
      <h3 className="titulo-tabla color-cambio">Registro de Cambios</h3>
      <table className="tabla-historial">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Cód. Origen</th>
            <th>Vendedores</th>
            <th>Entra / Sale</th>
            <th>Cortesía</th>
            <th>Cobrado</th>
          </tr>
        </thead>
        <tbody>
          {cambiosFiltrados.map(cambio => (
            <tr key={cambio.id}>
              <td data-label="Fecha">{formatearFechaHora(cambio.fecha)}</td>
              <td data-label="Origen" className="celda-negrita">{cambio.venta_origen?.codigo_venta}</td>
              <td data-label="Vendedores">
                <div className="vendedores-dual">
                  <span>Orig: {cambio.vendedor_email?.split('@')[0]}</span>
                  <span className="vendedor-gestor">Gest: {cambio.vendedor_cambio_email?.split('@')[0] || '---'}</span>
                </div>
              </td>
              <td data-label="Entra/Sale" className="celda-flujo">
                <div className="entra">📥 {cambio.producto_devuelto?.nombre}</div>
                <div className="sale">📤 {cambio.producto_nuevo?.nombre}</div>
              </td>
              <td data-label="Cortesía" className="monto-cortesia">${cambio.monto_cortesia.toLocaleString('es-AR')}</td>
              <td data-label="Cobrado" className="texto-total-venta">${cambio.monto_cobrado.toLocaleString('es-AR')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderTablaGastos = () => (
    <div className="tabla-historial-wrapper animar-entrada seccion-gastos">
      <h3 className="titulo-tabla">Gastos Registrados</h3>
      <table className="tabla-historial">
        <thead>
          <tr>
            <th>Fecha y Hora</th>
            <th>Descripción</th>
            <th>Categoría</th>
            <th>Pago</th>
            <th>Monto</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {gastosFiltrados.map(gasto => (
            <tr key={gasto.id} className={idRecienActualizado === gasto.id ? 'fila-actualizada' : ''}>
              <td data-label="Fecha/Hora">{formatearFechaHora(gasto.fecha)}</td>
              <td data-label="Descripción">{gasto.descripcion}</td>
              <td data-label="Categoría"><span className="tag-categoria">{gasto.categoria}</span></td>
              <td data-label="Pago"><span className={`tag-pago ${gasto.metodo_pago?.toLowerCase() || 'efectivo'}`}>{gasto.metodo_pago || 'Efectivo'}</span></td>
              <td data-label="Monto" className="monto-negativo">-${gasto.monto.toLocaleString('es-AR')}</td>
              <td data-label="Acciones">
                <div className="acciones-botones-historial">
                  <button onClick={() => setEditandoGasto(gasto)} className="btn-historial-accion">✏️</button>
                  <button onClick={() => eliminarGasto(gasto.id)} className="btn-historial-eliminar">🗑️</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="historial-container-nuevo">
      {/* MODALES - Los mantenemos igual pero asegúrate de que el CSS de modales sea global */}
      {editandoGasto && (
        <div className="modal-overlay animar-fade">
          <div className="modal-content animar-slide">
            <h4>Editar Gasto</h4>
            <form onSubmit={guardarEdicionGasto}>
              <div className="form-group-historial">
                <label>Descripción</label>
                <input type="text" value={editandoGasto.descripcion} onChange={(e) => setEditandoGasto({...editandoGasto, descripcion: e.target.value})} required />
              </div>
              <div className="form-group-historial">
                <label>Monto</label>
                <input type="number" value={editandoGasto.monto} onChange={(e) => setEditandoGasto({...editandoGasto, monto: e.target.value})} required />
              </div>
              <div className="form-group-historial">
                <label>Categoría</label>
                <select value={editandoGasto.categoria} onChange={(e) => setEditandoGasto({...editandoGasto, categoria: e.target.value})}>
                  <option value="Mercadería">Mercadería</option><option value="Alquiler">Alquiler</option>
                  <option value="Servicios">Servicios</option><option value="Varios">Varios</option>
                </select>
              </div>
              <div className="form-group-historial">
                <label>Pago</label>
                <select value={editandoGasto.metodo_pago || 'Efectivo'} onChange={(e) => setEditandoGasto({...editandoGasto, metodo_pago: e.target.value})}>
                  <option value="Efectivo">💵 Efectivo</option><option value="Transferencia">🏦 Transferencia</option>
                  <option value="Débito">💳 Débito</option><option value="Crédito">💳 Crédito</option>
                </select>
              </div>
              <div className="modal-botones">
                <button type="submit" className="btn-confirmar">Guardar</button>
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
              <div className="form-group-historial">
                <label>Vendedor</label>
                <select value={editandoVenta.vendedor_email} onChange={(e) => setEditandoVenta({...editandoVenta, vendedor_email: e.target.value})}>
                  {listaVendedores.filter(v => v !== 'Todos').map(v => <option key={v} value={v}>{v.split('@')[0]}</option>)}
                </select>
              </div>
              <div className="form-group-historial">
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
        <div className={`card-balance-n ingresos ${vista === 'ventas' ? 'activa' : ''}`} onClick={() => setVista('ventas')}>
          <small>Ventas (+)</small>
          <span>${(totalVentas + totalCobradoCambios).toLocaleString('es-AR')}</span>
        </div>
        <div className={`card-balance-n egresos ${vista === 'gastos' ? 'activa' : ''}`} onClick={() => setVista('gastos')}>
          <small>Gastos (-)</small>
          <span>${totalGastos.toLocaleString('es-AR')}</span>
        </div>
        <div className={`card-balance-n resultado ${vista === 'todo' ? 'activa' : ''} ${balanceNeto >= 0 ? 'positivo' : 'negativo'}`} onClick={() => setVista('todo')}>
          <small>Balance Neto</small>
          <span>${balanceNeto.toLocaleString('es-AR')}</span>
        </div>
        <div className={`card-balance-n cortesia ${vista === 'cambios' ? 'activa' : ''}`} onClick={() => setVista('cambios')}>
          <small>Cortesías (🎁)</small>
          <span>${totalCortesia.toLocaleString('es-AR')}</span>
        </div>
      </div>

      <div className="historial-filtros-n">
        <input 
          type="text" 
          placeholder="🔍 Buscar código..." 
          value={busquedaCodigo}
          onChange={(e) => setBusquedaCodigo(e.target.value)}
          className="input-filtro-historial"
        />
        <div className="selects-filtros-row">
          <select value={vendedorFiltro} onChange={(e) => setVendedorFiltro(e.target.value)}>
            {listaVendedores.map(vend => (
              <option key={vend} value={vend}>{vend === 'Todos' ? '👤 Vendedor' : vend.split('@')[0]}</option>
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
      </div>

      {cargando ? (
        <div className="cargando-historial">Cargando datos...</div>
      ) : (
        <div className="tablas-flex-container">
          {(vista === 'ventas' || vista === 'todo') && renderTablaVentas()}
          {(vista === 'cambios' || vista === 'todo') && renderTablaCambios()}
          {(vista === 'gastos' || vista === 'todo') && renderTablaGastos()}
        </div>
      )}
    </div>
  );
};

export default HistorialVentas;