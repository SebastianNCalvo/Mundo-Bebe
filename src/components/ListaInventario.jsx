import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import '../styles/Inventario.css';

export default function ListaInventario() {
  const [productos, setProductos] = useState([]);

  // Función para obtener los productos de Supabase
  const obtenerProductos = async () => {
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .order('id', { ascending: false });

    if (error) console.log("Error cargando:", error);
    else setProductos(data);
  };

  // Función para borrar un producto (Cuidado aquí)
  const eliminarProducto = async (id) => {
    const confirmacion = window.confirm("¿Seguro que quieres eliminar este producto?");
    if (confirmacion) {
      const { error } = await supabase.from('productos').delete().eq('id', id);
      if (error) alert("Error al eliminar");
      else obtenerProductos(); // Recargamos la lista
    }
  };

  useEffect(() => {
    obtenerProductos();
  }, []);

  return (
    <div className="inventario-container">
      <h3>Stock Actual de Ropa</h3>
      <table className="tabla-inventario">
        <thead>
          <tr>
            <th>Producto</th>
            <th>Precio</th>
            <th>Stock</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {productos.map((prod) => (
            <tr key={prod.id}>
              <td>{prod.nombre}</td>
              <td>${prod.precio}</td>
              <td className={prod.stock < 5 ? 'bajo-stock' : ''}>
                {prod.stock} uds.
              </td>
              <td>
                <button className="btn-eliminar" onClick={() => eliminarProducto(prod.id)}>Borrar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}