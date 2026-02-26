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

  // --- NUEVA FUNCIÓN: Generador de Código Único ---
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
    setProductos(data);
  };

  useEffect(() => {
    traerProductos();
  }, []);

  const productosFiltradosParaSelect = productos.filter(p =>
    p.nombre.toLowerCase().includes(filtroProducto.toLowerCase())
  );

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
      const nuevoCarrito = carrito.map(item =>
        item.id === producto.id
          ? { ...item, cantidadEnCarrito: item.cantidadEnCarrito + cantidadASumar }
          : item
      );
      setCarrito(nuevoCarrito);
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

  const eliminarDelCarrito = (id) => {
    setCarrito(carrito.filter(item => item.id !== id));
  };

  const disminuirCantidad = (id) => {
    const nuevoCarrito = carrito.map(item => {
      if (item.id === id) {
        if (item.cantidadEnCarrito > 1) {
          return { ...item, cantidadEnCarrito: item.cantidadEnCarrito - 1 };
        }
      }
      return item;
    });
    setCarrito(nuevoCarrito);
  };

  const aumentarCantidad = (id) => {
    const nuevoCarrito = carrito.map(item => {
      if (item.id === id) {
        if (item.cantidadEnCarrito < item.stock) {
          return { ...item, cantidadEnCarrito: item.cantidadEnCarrito + 1 };
        } else {
          alert("No hay más stock disponible");
        }
      }
      return item;
    });
    setCarrito(nuevoCarrito);
  };

  const totalVenta = carrito.reduce((acc, item) => acc + (item.precio * item.cantidadEnCarrito), 0);

  const finalizarCompra = async () => {
      if (carrito.length === 0) return;
      
      const nuevoCodigo = generarCodigoVenta();

      try {
        // 1. Insertar Cabecera
        const { data: cabecera, error: errorCabecera } = await supabase
          .from('ventas_cabecera')
          .insert([{ 
            vendedor_email: sesion?.user?.email,
            total_total: totalVenta,
            metodo_pago: metodoPago,
            codigo_venta: nuevoCodigo 
          }])
          .select()
          .single();

        if (errorCabecera) throw errorCabecera;

        // 2. Preparar e Insertar Detalle
        const registrosDetalle = carrito.map(item => ({
          venta_id: cabecera.id,
          producto_id: item.id,
          cantidad: item.cantidadEnCarrito,
          precio_unitario: item.precio
        }));

        const { error: errorDetalle } = await supabase
          .from('ventas_detalle')
          .insert(registrosDetalle);

        if (errorDetalle) throw errorDetalle;

        // 3. Actualizar Stock
        const promesasStock = carrito.map(async (item) => {
          const { data: prodActual } = await supabase
            .from('productos')
            .select('stock')
            .eq('id', item.id)
            .single();

          return supabase
            .from('productos')
            .update({ stock: (prodActual?.stock || 0) - item.cantidadEnCarrito })
            .eq('id', item.id);
        });

        await Promise.all(promesasStock);

        // --- 4. GENERACIÓN DEL PDF (Antes de limpiar el carrito) ---
        // Creamos una copia de los datos actuales del carrito para el PDF
        const datosParaPDF = {
          codigo: nuevoCodigo,
          carrito: [...carrito], // Usamos el spread para asegurar que tenemos la data
          total: totalVenta,
          metodoPago: metodoPago,
          vendedor: sesion?.user?.email || 'Vendedor'
        };

        generarFacturaPDF(datosParaPDF);
        // ----------------------------------------------------------

        // 5. Finalización y limpieza de interfaz
        alert(`🎉 Venta exitosa!\nCódigo de rastreo: ${nuevoCodigo}`);
        
        setCarrito([]); // Ahora sí limpiamos
        setMetodoPago('Efectivo');
        traerProductos();
        
        if (alTerminar) alTerminar();

      } catch (error) {
        console.error("Error al finalizar:", error);
        alert("Error al procesar la venta");
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
            className="input-filtro-ventas"
          />
        </div>

        <select 
          value={idSeleccionado} 
          onChange={(e) => setIdSeleccionado(e.target.value)} 
          required
        >
          <option value="">
            {productosFiltradosParaSelect.length > 0 
              ? "Seleccionar Producto..." 
              : "No se encontraron coincidencias"}
          </option>
          {productosFiltradosParaSelect.map(p => (
            <option key={p.id} value={p.id}>
              {p.nombre} - Talle: {p.talle} (${p.precio})
            </option>
          ))}
        </select>

        <div className="input-group">
          <label>Cantidad:</label>
          <input 
            type="number" 
            min="1" 
            value={cantidad} 
            onChange={(e) => setCantidad(e.target.value)} 
            required
          />
        </div>

        <button type="submit" className="btn-agregar">Añadir al carrito</button>
      </form>

      {carrito.length > 0 && (
        <div className="carrito-resumen">
          <h4>Detalle de la Orden</h4>
          <table className="tabla-carrito">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Cant.</th>
                <th>Subtotal</th>
                <th></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {carrito.map(item => (
                <tr key={item.id}>
                  <td>{item.nombre} (T{item.talle})</td>
                  <td>{item.cantidadEnCarrito}</td>
                  <td>${item.precio * item.cantidadEnCarrito}</td>
                  <td>
                    <div className="controles-cantidad">
                      <button className="btn-mini" onClick={() => disminuirCantidad(item.id)}>-</button>
                      <span className="cant-numero">{item.cantidadEnCarrito}</span>
                      <button className="btn-mini" onClick={() => aumentarCantidad(item.id)}>+</button>
                    </div>
                  </td>
                  <td>
                    <button onClick={() => eliminarDelCarrito(item.id)} className="btn-borrar-item">×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="carrito-footer">
            <p className="total-texto">Total: <span>${totalVenta}</span></p>
            
            <div className="pago-selector">
              <label>Método de Pago:</label>
              <select 
                value={metodoPago} 
                onChange={(e) => setMetodoPago(e.target.value)}
                className="select-pago"
              >
                <option value="Efectivo">💵 Efectivo</option>
                <option value="Transferencia">📱 Transferencia</option>
                <option value="Débito">💳 Débito</option>
                <option value="Crédito">💳 Crédito</option>
              </select>
            </div>

            <div className="acciones-finales">
              <button onClick={() => setCarrito([])} className="btn-vaciar">Cancelar</button>
              <button onClick={finalizarCompra} className="btn-finalizar">Confirmar Compra</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}