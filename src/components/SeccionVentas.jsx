import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import '../styles/Ventas.css';

export default function SeccionVentas() {
  const [productos, setProductos] = useState([]);
  const [idSeleccionado, setIdSeleccionado] = useState('');
  const [cantidad, setCantidad] = useState(1);

  useEffect(() => {
    const traerProductos = async () => {
      const { data } = await supabase.from('productos').select('*').gt('stock', 0);
      setProductos(data);
    };
    traerProductos();
  }, []);

  const realizarVenta = async (e) => {
    e.preventDefault();
    
    // 1. Buscar el producto seleccionado para saber el precio
    const producto = productos.find(p => p.id === parseInt(idSeleccionado));
    if (!producto) return;

    if (producto.stock < cantidad) {
      alert("No hay suficiente stock disponible");
      return;
    }

    const totalVenta = producto.precio * cantidad;

    // 2. Insertar la venta
    const { error: errorVenta } = await supabase.from('ventas').insert([
      { producto_id: producto.id, cantidad, total: totalVenta }
    ]);

    if (!errorVenta) {
      // 3. Descontar stock (La parte clave)
      const { error: errorStock } = await supabase
        .from('productos')
        .update({ stock: producto.stock - cantidad })
        .eq('id', producto.id);

      if (!errorStock) {
        alert("Venta realizada con éxito");
        window.location.reload(); // Recarga simple para ver los cambios
      }
    }
  };

  return (
    <div className="ventas-container">
      <h3>Nueva Venta 🛒</h3>
      <form onSubmit={realizarVenta}>
        <select onChange={(e) => setIdSeleccionado(e.target.value)} required>
          <option value="">Selecciona Producto</option>
          {productos.map(p => (
            <option key={p.id} value={p.id}>{p.nombre} (Stock: {p.stock})</option>
          ))}
        </select>
        <input 
          type="number" 
          min="1" 
          value={cantidad} 
          onChange={(e) => setCantidad(e.target.value)} 
        />
        <button type="submit">Confirmar Venta</button>
      </form>
    </div>
  );
}