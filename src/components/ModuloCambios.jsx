import { useState } from 'react';
import { supabase } from '../supabaseClient';
import '../styles/ModuloCambios.css';

const ModuloCambios = ({ sesion, alTerminar }) => {
  const [codigoBusqueda, setCodigoBusqueda] = useState('');
  const [ventaOriginal, setVentaOriginal] = useState(null);
  
  const [productosADevolver, setProductosADevolver] = useState([]);
  const [productosNuevos, setProductosNuevos] = useState([]);
  
  const [busquedaNuevo, setBusquedaNuevo] = useState('');
  const [resultadosBusqueda, setResultadosBusqueda] = useState([]);
  const [cortesia, setCortesia] = useState(false);
  const [pestanaActiva, setPestanaActiva] = useState('devolucion');

  const buscarVenta = async () => {
    const { data, error } = await supabase
      .from('ventas_cabecera')
      .select(`id, codigo_venta, total_total, metodo_pago, vendedor_email, ventas_detalle(cantidad, precio_unitario, producto_id, productos(nombre, talle))`)
      .eq('codigo_venta', codigoBusqueda.toUpperCase())
      .single();

    if (error || !data) {
      alert("No se encontró ninguna venta con ese código.");
      return;
    }
    setVentaOriginal(data);
    setProductosADevolver([]);
    setProductosNuevos([]);
  };

  const buscarProductoNuevo = async (termino) => {
    setBusquedaNuevo(termino);
    if (termino.length < 2) return;
    const { data } = await supabase
      .from('productos')
      .select('*')
      .ilike('nombre', `%${termino}%`)
      .gt('stock', 0)
      .limit(5);
    setResultadosBusqueda(data || []);
  };

  // LÓGICA DE CANTIDADES PARA DEVOLUCIÓN
  const ajustarCantidadDevolucion = (item, delta) => {
    const existe = productosADevolver.find(p => p.producto_id === item.producto_id);
    
    if (existe) {
      const nuevaCant = existe.cantidad_a_devolver + delta;
      if (nuevaCant <= 0) {
        setProductosADevolver(productosADevolver.filter(p => p.producto_id !== item.producto_id));
      } else if (nuevaCant <= item.cantidad) {
        setProductosADevolver(productosADevolver.map(p => 
          p.producto_id === item.producto_id ? { ...p, cantidad_a_devolver: nuevaCant } : p
        ));
      }
    } else if (delta > 0) {
      setProductosADevolver([...productosADevolver, {
        producto_id: item.producto_id,
        cantidad_a_devolver: 1,
        precio_unitario: item.precio_unitario,
        nombre: item.productos.nombre,
        talle: item.productos.talle
      }]);
    }
  };

  // NUEVA LÓGICA DE CANTIDADES PARA PRODUCTOS NUEVOS
  const ajustarCantidadNuevo = (producto, delta) => {
    const existe = productosNuevos.find(p => p.id === producto.id);
    if (existe) {
      const nuevaCant = existe.cantidad + delta;
      if (nuevaCant <= 0) {
        setProductosNuevos(productosNuevos.filter(p => p.id !== producto.id));
      } else {
        setProductosNuevos(productosNuevos.map(p => 
          p.id === producto.id ? { ...p, cantidad: nuevaCant } : p
        ));
      }
    } else if (delta > 0) {
      setProductosNuevos([...productosNuevos, { ...producto, cantidad: 1 }]);
    }
  };

  // Cálculos totales corregidos
  const totalDevuelto = productosADevolver.reduce((acc, p) => acc + (p.precio_unitario * p.cantidad_a_devolver), 0);
  const totalNuevo = productosNuevos.reduce((acc, p) => acc + (p.precio * p.cantidad), 0);
  const diferencia = totalNuevo - totalDevuelto;
  const aPagar = cortesia ? 0 : (diferencia > 0 ? diferencia : 0);

  const procesarCambio = async () => {
    if (productosADevolver.length === 0 || productosNuevos.length === 0) {
      alert("Debes seleccionar productos en ambas columnas.");
      return;
    }

    try {
      // 1. Devoluciones: Sumar stock
      for (const p of productosADevolver) {
        await supabase.from('devoluciones').insert([{
          venta_origen_id: ventaOriginal.id,
          producto_id: p.producto_id,
          precio_al_que_se_vendio: p.precio_unitario,
          cantidad: p.cantidad_a_devolver
        }]);
        await supabase.rpc('increment_stock', { row_id: p.producto_id, x: p.cantidad_a_devolver });
      }

      // 2. Nuevos: Restar stock según cantidad seleccionada
      for (const p of productosNuevos) {
        await supabase.rpc('increment_stock', { row_id: p.id, x: -p.cantidad });
      }

      // 3. Registro histórico
      await supabase.from('cambios_registros').insert([{
        venta_origen_id: ventaOriginal.id,
        producto_devuelto_id: productosADevolver[0].producto_id, 
        producto_nuevo_id: productosNuevos[0].id,
        diferencia_total: diferencia,
        monto_cobrado: aPagar,
        monto_cortesia: cortesia ? diferencia : 0,
        vendedor_email: ventaOriginal.vendedor_email, 
        vendedor_cambio_email: sesion?.user?.email   
      }]);

      alert("✅ Cambio procesado correctamente.");
      if (alTerminar) alTerminar();
      setVentaOriginal(null);
    } catch (err) {
      console.error(err);
      alert("Error crítico al procesar.");
    }
  };

  return (
    <div className="modulo-cambios">
      <h2 className="titulo-modulo">🔄 Sistema de Cambios</h2>
      
      <div className="buscador-seccion">
        <input 
          type="text" 
          className="input-busqueda-venta"
          placeholder="Código de Venta (MB-XXXX)" 
          value={codigoBusqueda} 
          onChange={(e) => setCodigoBusqueda(e.target.value)} 
        />
        <button className="btn-buscar-venta" onClick={buscarVenta}>🔍 Buscar</button>
      </div>

      {ventaOriginal && (
        <div className="detalles-cambio animar-entrada">
          <div className="tabs-cambio">
            <button 
              className={`tab-btn ${pestanaActiva === 'devolucion' ? 'active' : ''}`}
              onClick={() => setPestanaActiva('devolucion')}
            >
              1. Devuelven ({productosADevolver.reduce((acc, p) => acc + p.cantidad_a_devolver, 0)})
            </button>
            <button 
              className={`tab-btn ${pestanaActiva === 'nuevo' ? 'active' : ''}`}
              onClick={() => setPestanaActiva('nuevo')}
            >
              2. Se llevan ({productosNuevos.reduce((acc, p) => acc + p.cantidad, 0)})
            </button>
          </div>

          {pestanaActiva === 'devolucion' && (
            <div className="card-cambio">
              <h3 className="subtitulo-card">Productos de la venta:</h3>
              <div className="lista-items-cambio">
                {ventaOriginal.ventas_detalle.map((item, i) => {
                  const seleccion = productosADevolver.find(p => p.producto_id === item.producto_id);
                  const cantSeleccionada = seleccion ? seleccion.cantidad_a_devolver : 0;
                  return (
                    <div key={i} className={`item-devolucion-multiple ${cantSeleccionada > 0 ? 'seleccionado' : ''}`}>
                      <div className="info-item-cambio">
                        <span className="item-nombre">{item.productos.nombre} ({item.productos.talle})</span>
                        <small className="item-stock-max">Compró: {item.cantidad}</small>
                      </div>
                      <div className="controles-cantidad">
                        <button className="btn-qty" onClick={() => ajustarCantidadDevolucion(item, -1)}>-</button>
                        <span className="cant-display">{cantSeleccionada}</span>
                        <button className="btn-qty" onClick={() => ajustarCantidadDevolucion(item, 1)}>+</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {pestanaActiva === 'nuevo' && (
            <div className="card-cambio">
              <h3 className="subtitulo-card">Buscá los productos nuevos:</h3>
              <input 
                type="text" 
                className="input-nuevo-producto"
                placeholder="Escribí nombre..." 
                value={busquedaNuevo}
                onChange={(e) => buscarProductoNuevo(e.target.value)}
              />
              <div className="lista-resultados">
                {resultadosBusqueda.map(p => (
                  <div key={p.id} className="resultado-item" onClick={() => {ajustarCantidadNuevo(p, 1); setResultadosBusqueda([]); setBusquedaNuevo('');}}>
                    ➕ {p.nombre} - ${p.precio.toLocaleString('es-AR')}
                  </div>
                ))}
              </div>

              <div className="lista-items-cambio">
                {productosNuevos.map((p, i) => (
                  <div key={i} className="item-devolucion-multiple seleccionado">
                    <div className="info-item-cambio">
                      <span className="item-nombre">{p.nombre}</span>
                      <small className="item-stock-max">Precio unit: ${p.precio.toLocaleString('es-AR')}</small>
                    </div>
                    <div className="controles-cantidad">
                      <button className="btn-qty" onClick={() => ajustarCantidadNuevo(p, -1)}>-</button>
                      <span className="cant-display">{p.cantidad}</span>
                      <button className="btn-qty" onClick={() => ajustarCantidadNuevo(p, 1)}>+</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="resumen-final">
            <div className="totales-flotantes">
              <div className="fila-resumen">
                <span>Crédito por entrega:</span>
                <strong>${totalDevuelto.toLocaleString('es-AR')}</strong>
              </div>
              <div className="fila-resumen">
                <span>Total nuevos:</span>
                <strong>${totalNuevo.toLocaleString('es-AR')}</strong>
              </div>
              <div className={`fila-resumen diferencia ${diferencia >= 0 ? 'positivo' : 'negativo'}`}>
                <span>{diferencia >= 0 ? 'Diferencia a pagar:' : 'Saldo a favor:'}</span>
                <strong>${Math.abs(diferencia).toLocaleString('es-AR')}</strong>
              </div>
            </div>
            
            {diferencia > 0 && (
              <label className="checkbox-cortesia">
                <input type="checkbox" checked={cortesia} onChange={() => setCortesia(!cortesia)} />
                <span className="texto-cortesia">🎁 Bonificar diferencia</span>
              </label>
            )}

            <div className="total-caja-cambio">
              <span>Total a cobrar:</span>
              <strong className="monto-total-final">${aPagar.toLocaleString('es-AR')}</strong>
            </div>

            <button className="btn-confirmar-cambio" onClick={procesarCambio}>
              Confirmar Operación
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModuloCambios;