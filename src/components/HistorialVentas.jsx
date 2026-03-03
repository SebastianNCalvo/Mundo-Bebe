import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { generarFacturaPDF } from './GeneradorPDF'; 
import '../styles/HistorialVentas.css';

const HistorialVentas = () => {
  const [ventas, setVentas] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [cambios, setCambios] = useState([]); 
  const [notasCredito, setNotasCredito] = useState([]); 
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [vendedorFiltro, setVendedorFiltro] = useState('Todos');
  const [cargando, setCargando] = useState(false);
  const [vista, setVista] = useState('todo');
  const [busquedaCodigo, setBusquedaCodigo] = useState('');
  const [editandoGasto, setEditandoGasto] = useState(null);
  const [editandoVenta, setEditandoVenta] = useState(null);
  const [idRecienActualizado, setIdRecienActualizado] = useState(null);
  const [esAdmin, setEsAdmin] = useState(false);

  useEffect(() => {
    obtenerUsuario();
    obtenerDatos();
  }, [mes, anio]);

  const obtenerUsuario = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user && user.user_metadata?.role === 'admin') {
      setEsAdmin(true);
    }
  };

  const obtenerDatos = async () => {
    setCargando(true);
    
    const fechaInicio = new Date(anio, mes - 1, 1).toISOString();
    const fechaFin = new Date(anio, mes, 1).toISOString();

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

    const promesaNC = supabase
      .from('notas_credito')
      .select('*')
      .gte('created_at', fechaInicio)
      .lt('created_at', fechaFin)
      .order('created_at', { ascending: false });

    try {
      const [resVentas, resGastos, resCambios, resNC] = await Promise.all([
          promesaVentas, promesaGastos, promesaCambios, promesaNC
      ]);
      
      setVentas(resVentas.data || []);
      setGastos(resGastos.data || []);
      setCambios(resCambios.data || []); 
      setNotasCredito(resNC.data || []);
    } catch (error) {
      console.error("Error cargando historial:", error);
    } finally {
      setCargando(false);
    }
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

  const ncFiltradas = notasCredito.filter(nc => {
    const cumpleVendedor = vendedorFiltro === 'Todos' || nc.vendedor_emisor === vendedorFiltro;
    const cumpleCodigo = nc.codigo_nc?.toLowerCase().includes(busquedaCodigo.toLowerCase());
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
  const totalNC = ncFiltradas.reduce((acc, nc) => acc + (Number(nc.monto) || 0), 0);
  const totalCobradoCambios = cambiosFiltrados.reduce((acc, c) => acc + (Number(c.monto_cobrado) || 0), 0);
  const totalCortesia = cambiosFiltrados.reduce((acc, c) => acc + (Number(c.monto_cortesia) || 0), 0);
  
  const balanceNeto = totalVentas + totalCobradoCambios - totalGastos - totalNC;

  const formatearFechaHora = (fechaISO) => {
    return new Date(fechaISO).toLocaleString('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false
    });
  };

  const renderBadgePagoCambio = (cambio) => {
    if (cambio.monto_cobrado <= 0) return <span className="tag-pago cortesia">Bonificada</span>;
    
    const metodo = cambio.metodo_pago_diferencia || 'Efectivo';
    let icono = '💵';
    if (metodo.includes('Transferencia')) icono = '🏦';
    if (metodo.includes('Débito') || metodo.includes('Crédito')) icono = '💳';

    return (
      <span className={`tag-pago ${metodo.toLowerCase()}`}>
        {icono} {metodo}
      </span>
    );
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
          {ventasFiltradas.length > 0 ? (
            ventasFiltradas.map(venta => (
              <tr key={venta.id} className={idRecienActualizado === venta.id ? 'fila-actualizada' : ''}>
                <td data-label="Código" className="celda-codigo">
                  <span className="codigo-texto">{venta.codigo_venta || '---'}</span>
                  {cambios.some(c => c.venta_origen_id === venta.id) && <span className="badge-cambio-aviso">🔄 CAMBIO</span>}
                </td>
                <td data-label="Fecha/Hora">{formatearFechaHora(venta.fecha)}</td>
                <td data-label="Vendedor">{venta.vendedor_email?.split('@')[0]}</td>
                <td data-label="Productos" className="celda-productos-lista">
                  {venta.ventas_detalle?.map((d, i) => (
                    <div key={i} className="item-producto-historial">
                      <span className="prod-nombre">{d.productos?.nombre}</span>
                      <span className="prod-meta"> (T:{d.productos?.talle}) x{d.cantidad}</span>
                    </div>
                  ))}
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
            ))
          ) : (
            <tr><td colSpan="7" style={{textAlign: 'center', padding: '20px'}}>No se encontraron ventas para este periodo.</td></tr>
          )}
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
            <th>Pago</th>
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
                <div className="item-flujo entra">
                  <span className="icono-flujo">📥</span> 
                  <span className="prod-nombre">{cambio.producto_devuelto?.nombre}</span>
                  <span className="prod-meta"> (T:{cambio.producto_devuelto?.talle})</span>
                </div>
                <div className="item-flujo sale">
                  <span className="icono-flujo">📤</span> 
                  <span className="prod-nombre">{cambio.producto_nuevo?.nombre}</span>
                  <span className="prod-meta"> (T:{cambio.producto_nuevo?.talle})</span>
                </div>
              </td>
              <td data-label="Cortesía" className="monto-cortesia">${cambio.monto_cortesia.toLocaleString('es-AR')}</td>
              <td data-label="Pago">{renderBadgePagoCambio(cambio)}</td>
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

  const renderTablaNC = () => (
    <div className="tabla-historial-wrapper animar-entrada seccion-nc">
      <h3 className="titulo-tabla color-nc">Notas de Crédito</h3>
      <table className="tabla-historial">
        <thead>
          <tr>
            <th>Cód. NC</th>
            <th>Fecha</th>
            <th>Cliente/Origen</th>
            <th>Monto</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {ncFiltradas.map(nc => (
            <tr key={nc.id}>
              <td className="celda-codigo">{nc.codigo_nc}</td>
              <td>{formatearFechaHora(nc.created_at)}</td>
              <td>{nc.identificador_cliente || 'General'}</td>
              <td className="monto-negativo">-${nc.monto.toLocaleString('es-AR')}</td>
              <td><span className={`badge-estado ${nc.estado}`}>{nc.estado.toUpperCase()}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="historial-container-nuevo">
      {/* MODALES */}
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

      {/* Solo el Admin ve las tarjetas de balance */}
      {esAdmin && (
        <div className="dashboard-balance">
          <div className={`card-balance-n ingresos ${vista === 'ventas' ? 'activa' : ''}`} onClick={() => setVista('ventas')}>
            <small>Ventas (+)</small>
            <span>${(totalVentas + totalCobradoCambios).toLocaleString('es-AR')}</span>
          </div>
          <div className={`card-balance-n egresos ${vista === 'gastos' ? 'activa' : ''}`} onClick={() => setVista('gastos')}>
            <small>Gastos/NC (-)</small>
            <span>${(totalGastos + totalNC).toLocaleString('es-AR')}</span>
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
      )}

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
          {(vista === 'todo') && renderTablaNC()} 
        </div>
      )}
    </div>
  );
};

export default HistorialVentas;