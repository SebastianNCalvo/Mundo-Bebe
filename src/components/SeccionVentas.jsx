import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { generarFacturaPDF } from './GeneradorPDF';
import '../styles/Ventas.css';

export default function SeccionVentas({ alTerminar, sesion }) {
  const [productos, setProductos] = useState([]);
  const [idSeleccionado, setIdSeleccionado] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [carrito, setCarrito] = useState([]);
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [filtroProducto, setFiltroProducto] = useState('');

  // --- ESTADOS PARA NOTA DE CRÉDITO ---
  const [inputNC, setInputNC] = useState('');
  const [notaAplicada, setNotaAplicada] = useState(null); 
  const [buscandoNC, setBuscandoNC] = useState(false);

  const generarCodigoVenta = () => {
    const fecha = new Date();
    const diaMes = `${fecha.getDate()}${fecha.getMonth() + 1}`;
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `MB-${diaMes}-${randomStr}`;
  };

  const traerProductos = async () => {
    const { data } = await supabase
      .from('productos')
      .select('*')
      .gt('stock', 0)
      .order('nombre', { ascending: true });
    setProductos(data || []);
  };

  useEffect(() => {
    traerProductos();
  }, []);

  const validarNotaCredito = async () => {
    if (!inputNC) return;
    setBuscandoNC(true);
    try {
      const { data, error } = await supabase
        .from('notas_credito')
        .select('*')
        .eq('codigo_nc', inputNC.trim().toUpperCase())
        .single();

      if (error || !data) {
        alert("El código de nota de crédito no existe.");
      } else if (data.estado !== 'disponible') {
        alert(`Esta nota de crédito está en estado: ${data.estado}`);
      } else {
        setNotaAplicada(data);
        alert(`✅ Nota aplicada por: $${data.monto}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBuscandoNC(false);
    }
  };

  const quitarNota = () => {
    setNotaAplicada(null);
    setInputNC('');
  };

  const agregarAlCarrito = (e) => {
    e.preventDefault();
    const producto = productos.find(p => p.id === parseInt(idSeleccionado));
    if (!producto) return;

    const existe = carrito.find(item => item.id === producto.id);
    const cantidadASumar = parseInt(cantidad);

    if (existe) {
      if (producto.stock < (existe.cantidadEnCarrito + cantidadASumar)) {
        alert("No hay suficiente stock para sumar esa cantidad");
        return;
      }
      setCarrito(carrito.map(item =>
        item.id === producto.id
          ? { ...item, cantidadEnCarrito: item.cantidadEnCarrito + cantidadASumar }
          : item
      ));
    } else {
      if (producto.stock < cantidadASumar) {
        alert("No hay suficiente stock");
        return;
      }
      setCarrito([...carrito, { ...producto, cantidadEnCarrito: cantidadASumar }]);
    }

    setIdSeleccionado('');
    setCantidad(1);
    setFiltroProducto('');
  };

  const eliminarDelCarrito = (id) => setCarrito(carrito.filter(item => item.id !== id));

  const disminuirCantidad = (id) => {
    setCarrito(carrito.map(item => 
      item.id === id && item.cantidadEnCarrito > 1 
        ? { ...item, cantidadEnCarrito: item.cantidadEnCarrito - 1 } 
        : item
    ));
  };

  const aumentarCantidad = (id) => {
    setCarrito(carrito.map(item => {
      if (item.id === id) {
        if (item.cantidadEnCarrito < item.stock) return { ...item, cantidadEnCarrito: item.cantidadEnCarrito + 1 };
        alert("No hay más stock disponible");
      }
      return item;
    }));
  };

  const subtotalVenta = carrito.reduce((acc, item) => acc + (item.precio * item.cantidadEnCarrito), 0);
  const totalConDescuento = Math.max(0, subtotalVenta - (notaAplicada?.monto || 0));

  const finalizarCompra = async () => {
    if (carrito.length === 0) return;
    const nuevoCodigo = generarCodigoVenta();

    try {
      // 1. Insertar Cabecera
      const { data: cabecera, error: errorCabecera } = await supabase
        .from('ventas_cabecera')
        .insert([{ 
          vendedor_email: sesion?.user?.email,
          total_total: totalConDescuento,
          metodo_pago: notaAplicada ? `${metodoPago} + NC` : metodoPago,
          codigo_venta: nuevoCodigo 
        }])
        .select().single();

      if (errorCabecera) throw errorCabecera;

      // 2. MARCAR NOTA DE CRÉDITO COMO USADA
      if (notaAplicada) {
        const { error: errorNC } = await supabase
          .from('notas_credito')
          .update({ 
            estado: 'usado', // Corregido según restricción de Supabase
            venta_destino_id: cabecera.id 
          })
          .eq('id', notaAplicada.id);
        
        if (errorNC) throw errorNC;
      }

      // 3. Insertar Detalle
      const registrosDetalle = carrito.map(item => ({
        venta_id: cabecera.id,
        producto_id: item.id,
        cantidad: item.cantidadEnCarrito,
        precio_unitario: item.precio
      }));
      const { error: errorDetalle } = await supabase.from('ventas_detalle').insert(registrosDetalle);
      if (errorDetalle) throw errorDetalle;

      // 4. Actualizar Stock
      const promesasStock = carrito.map(async (item) => {
        const { data: prodActual } = await supabase.from('productos').select('stock').eq('id', item.id).single();
        return supabase.from('productos').update({ stock: (prodActual?.stock || 0) - item.cantidadEnCarrito }).eq('id', item.id);
      });
      await Promise.all(promesasStock);

      // 5. PDF y Limpieza
      generarFacturaPDF({
        codigo: nuevoCodigo,
        carrito: [...carrito],
        total: totalConDescuento,
        metodoPago: metodoPago,
        vendedor: sesion?.user?.email || 'Vendedor'
      });

      alert(`🎉 Venta exitosa!\nCódigo: ${nuevoCodigo}`);
      setCarrito([]);
      setMetodoPago('Efectivo');
      setNotaAplicada(null);
      setInputNC('');
      traerProductos();
      if (alTerminar) alTerminar();

    } catch (error) {
      console.error("Error completo:", error);
      alert("Error al procesar la venta. Revisa la consola.");
    }
  };

  return (
    <div className="ventas-container">
      <h3>Punto de Venta 🛒</h3>
      
      <form className="ventas-form" onSubmit={agregarAlCarrito}>
        <div className="input-group">
          <label>Buscar Producto:</label>
          <input 
            type="text"
            placeholder="Escriba nombre del producto..."
            value={filtroProducto}
            onChange={(e) => setFiltroProducto(e.target.value)}
          />
        </div>

        <select value={idSeleccionado} onChange={(e) => setIdSeleccionado(e.target.value)} required>
          <option value="">Seleccionar Producto...</option>
          {productos.filter(p => p.nombre.toLowerCase().includes(filtroProducto.toLowerCase())).map(p => (
            <option key={p.id} value={p.id}>{p.nombre} - Talle: {p.talle} (${p.precio})</option>
          ))}
        </select>

        <div className="input-group">
          <label>Cantidad:</label>
          <input type="number" min="1" value={cantidad} onChange={(e) => setCantidad(e.target.value)} required />
        </div>
        <button type="submit" className="btn-agregar">Añadir al carrito</button>
      </form>

      {carrito.length > 0 && (
        <div className="carrito-resumen">
          <h4>Detalle de la Orden</h4>
          <table className="tabla-carrito">
            <tbody>
              {carrito.map(item => (
                <tr key={item.id}>
                  <td>{item.nombre} (T{item.talle})</td>
                  <td>${item.precio * item.cantidadEnCarrito}</td>
                  <td>
                    <div className="controles-cantidad">
                      <button className="btn-mini" onClick={() => disminuirCantidad(item.id)}>-</button>
                      <span className="cant-numero">{item.cantidadEnCarrito}</span>
                      <button className="btn-mini" onClick={() => aumentarCantidad(item.id)}>+</button>
                    </div>
                  </td>
                  <td><button onClick={() => eliminarDelCarrito(item.id)} className="btn-borrar-item">×</button></td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="seccion-canje-nc">
            <label>¿Tiene Nota de Crédito?</label>
            <div className="nc-input-group">
              <input 
                type="text" 
                placeholder="Código NC (ej: NC-1234)" 
                value={inputNC}
                onChange={(e) => setInputNC(e.target.value)}
                disabled={!!notaAplicada}
              />
              {!notaAplicada ? (
                <button onClick={validarNotaCredito} disabled={buscandoNC} className="btn-aplicar-nc">
                  {buscandoNC ? '...' : 'Aplicar'}
                </button>
              ) : (
                <button onClick={quitarNota} className="btn-quitar-nc">Quitar</button>
              )}
            </div>
          </div>

          <div className="carrito-footer">
            <div className="totales-desglose">
                <p>Subtotal: <span>${subtotalVenta}</span></p>
                {notaAplicada && <p className="descuento-nc">Nota de Crédito: <span>-${notaAplicada.monto}</span></p>}
                <p className="total-texto">Total a Pagar: <span>${totalConDescuento}</span></p>
            </div>
            
            <div className="pago-selector">
              <label>Método de Pago Restante:</label>
              <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)} className="select-pago">
                <option value="Efectivo">💵 Efectivo</option>
                <option value="Transferencia">📱 Transferencia</option>
                <option value="Débito">💳 Débito</option>
                <option value="Crédito">💳 Crédito</option>
              </select>
            </div>

            <div className="acciones-finales">
              <button onClick={() => { setCarrito([]); setNotaAplicada(null); }} className="btn-vaciar">Cancelar</button>
              <button onClick={finalizarCompra} className="btn-finalizar">Confirmar Compra</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}