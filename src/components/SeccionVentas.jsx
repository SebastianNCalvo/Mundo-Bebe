import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import '../styles/Ventas.css';

export default function SeccionVentas() {
  const [productos, setProductos] = useState([]);
  const [idSeleccionado, setIdSeleccionado] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [carrito, setCarrito] = useState([]);

  // Cargar productos disponibles
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
  };

  const eliminarDelCarrito = (id) => {
    setCarrito(carrito.filter(item => item.id !== id));
  };

  const disminuirCantidad = (id) => {
  const nuevoCarrito = carrito.map(item => {
    if (item.id === id) {
      // Si la cantidad es mayor a 1, restamos
      if (item.cantidadEnCarrito > 1) {
        return { ...item, cantidadEnCarrito: item.cantidadEnCarrito - 1 };
      }
    }
    return item;
  });
  setCarrito(nuevoCarrito);
};

// Opcional: También podrías crear una para aumentar rápido
const aumentarCantidad = (id) => {
  const nuevoCarrito = carrito.map(item => {
    if (item.id === id) {
      // Validamos contra el stock real del producto
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

    try {
      const registrosVenta = carrito.map(item => ({
        producto_id: item.id,
        cantidad: item.cantidadEnCarrito,
        total: item.precio * item.cantidadEnCarrito
      }));

      const { error: errorVenta } = await supabase.from('ventas').insert(registrosVenta);
      if (errorVenta) throw errorVenta;

      const promesasStock = carrito.map(item => {
        return supabase
          .from('productos')
          .update({ stock: item.stock - item.cantidadEnCarrito })
          .eq('id', item.id);
      });

      await Promise.all(promesasStock);

      alert("🎉 Venta realizada con éxito");
      setCarrito([]); // Vaciar carrito
      traerProductos(); // Refrescar stock en el selector
    } catch (error) {
      console.error("Error al finalizar:", error);
      alert("Error al procesar la venta");
    }
  };

  return (
    <div className="ventas-container">
      <h3>Punto de Venta 🛒</h3>
      
      <form className="ventas-form" onSubmit={agregarAlCarrito}>
        <select 
          value={idSeleccionado} 
          onChange={(e) => setIdSeleccionado(e.target.value)} 
          required
        >
          <option value="">Seleccionar Producto...</option>
          {productos.map(p => (
            <option key={p.id} value={p.id}>
              {p.nombre} - Talle: {p.talle} (Stock: {p.stock})
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