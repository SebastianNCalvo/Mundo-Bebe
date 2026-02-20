import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import '../styles/Inventario.css';

export default function ListaInventario({ trigger, esAdmin }) {
  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  useEffect(() => {
    obtenerProductos();
  }, [trigger]);

  const productosFiltrados = productos.filter(prod => 
    prod.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );
  // Función para obtener los productos de Supabase
  const obtenerProductos = async () => {
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .order('nombre', { ascending: true });

      if (error) console.log("Error cargando:", error);
      else setProductos(data);
  };

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

      <div className="buscador-container">
        <span className="icono-lupa">🔍</span>
        <input 
          type="text" 
          placeholder="Buscar por nombre de prenda..." 
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="input-busqueda"
        />
      </div>


      <div className="tabla-wrapper">
        <table className="tabla-inventario">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Talle</th>
              <th>Precio</th>
              <th>Stock</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {productosFiltrados.map((prod) => (
              <tr key={prod.id}>
                <td><strong>{prod.nombre}</strong></td>
                <td>
                  <span className="badge-talle">{prod.talle}</span> 
                </td>
                <td>${prod.precio}</td>
                <td className={prod.stock < 5 ? 'bajo-stock' : ''}>
                  {prod.stock}
                </td>
                <td>
                  {esAdmin ? (
                    <button className="btn-eliminar" onClick={() => eliminarProducto(prod.id)}>×</button>
                  ) : (
                    <span style={{color: '#ccc', fontSize: '0.8rem'}}>Lectura</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {productosFiltrados.length === 0 && (
          <p style={{ textAlign: 'center', padding: '20px' }}>
            No se encontraron productos con ese nombre.
          </p>
        )}
      </div>
    </div>
  );
}