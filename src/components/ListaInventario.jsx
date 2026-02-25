import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import '../styles/Inventario.css';

export default function ListaInventario({ trigger, esAdmin }) {
  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  
  // Estados para la edición
  const [editandoId, setEditandoId] = useState(null);
  const [productoEditado, setProductoEditado] = useState({});
  
  // Nuevo estado para controlar qué fila debe brillar
  const [idRecienActualizado, setIdRecienActualizado] = useState(null);

  useEffect(() => {
    obtenerProductos();
  }, [trigger]);

  const obtenerProductos = async () => {
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .order('nombre', { ascending: true });

    if (error) console.log("Error cargando:", error);
    else setProductos(data);
  };

  // --- Lógica para el Valor Total del Inventario ---
  const valorTotalInventario = productos.reduce((acc, prod) => {
    return acc + (parseFloat(prod.precio || 0) * parseInt(prod.stock || 0));
  }, 0);

  const iniciarEdicion = (prod) => {
    setEditandoId(prod.id);
    setProductoEditado({ ...prod });
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
    setProductoEditado({});
  };

  const guardarCambios = async (id) => {
    const { error } = await supabase
      .from('productos')
      .update({
        nombre: productoEditado.nombre,
        talle: productoEditado.talle,
        precio: parseFloat(productoEditado.precio),
        stock: parseInt(productoEditado.stock)
      })
      .eq('id', id);

    if (error) {
      alert("Error al actualizar el producto");
    } else {
      setEditandoId(null);
      
      // --- Lógica de Feedback Visual ---
      setIdRecienActualizado(id); // Marcamos el ID para que brille
      setTimeout(() => setIdRecienActualizado(null), 2000); // Quitamos el brillo tras 2 segundos
      
      obtenerProductos();
    }
  };

  const eliminarProducto = async (id) => {
    const confirmacion = window.confirm("¿Seguro que quieres eliminar este producto?");
    if (confirmacion) {
      const { error } = await supabase.from('productos').delete().eq('id', id);
      if (error) alert("Error al eliminar");
      else obtenerProductos();
    }
  };

  const productosFiltrados = productos.filter(prod => 
    prod.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="inventario-container">
      <h3>Stock Actual de Ropa</h3>

      {/* TARJETA DE CAPITAL TOTAL (Ahora con clase CSS limpia) */}
      <div className="card-total-inventario">
        <small>Valor Total de Mercadería</small>
        <span>${valorTotalInventario.toLocaleString('es-AR')}</span>
      </div>

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
              {esAdmin && <th>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {productosFiltrados.map((prod) => (
              <tr 
                key={prod.id} 
                className={idRecienActualizado === prod.id ? 'fila-actualizada' : ''}
              >
                {editandoId === prod.id ? (
                  <>
                    <td>
                      <input 
                        type="text" 
                        value={productoEditado.nombre} 
                        onChange={(e) => setProductoEditado({...productoEditado, nombre: e.target.value})}
                        className="input-edit-celda"
                        autoFocus
                      />
                    </td>
                    <td>
                      <input 
                        type="text" 
                        value={productoEditado.talle} 
                        onChange={(e) => setProductoEditado({...productoEditado, talle: e.target.value})}
                        className="input-edit-celda small"
                      />
                    </td>
                    <td>
                      <input 
                        type="number" 
                        value={productoEditado.precio} 
                        onChange={(e) => setProductoEditado({...productoEditado, precio: e.target.value})}
                        className="input-edit-celda"
                      />
                    </td>
                    <td>
                      <input 
                        type="number" 
                        value={productoEditado.stock} 
                        onChange={(e) => setProductoEditado({...productoEditado, stock: e.target.value})}
                        className="input-edit-celda small"
                      />
                    </td>
                    <td data-label="Acciones">
                      <div className="acciones-edit-row">
                        <button onClick={() => guardarCambios(prod.id)} className="btn-save">✅</button>
                        <button onClick={cancelarEdicion} className="btn-cancel">❌</button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td data-label="Producto"><strong>{prod.nombre}</strong></td>
                    <td data-label="Talle"><span className="badge-talle">{prod.talle}</span></td>
                    <td data-label="Precio">${prod.precio.toLocaleString('es-AR')}</td>
                    <td data-label="Stock" className={prod.stock < 5 ? 'bajo-stock' : ''}>
                      {prod.stock}
                    </td>
                    {esAdmin && (
                      <td data-label="Acciones">
                        <div className="acciones-botones">
                          <button 
                            className="btn-editar-icono" 
                            onClick={() => iniciarEdicion(prod)}
                            title="Editar"
                          >
                            ✏️
                          </button>
                          <button 
                            className="btn-eliminar" 
                            onClick={() => eliminarProducto(prod.id)}
                            title="Eliminar"
                          >
                            ×
                          </button>
                        </div>
                      </td>
                    )}
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        
        {productosFiltrados.length === 0 && (
          <p style={{ textAlign: 'center', padding: '20px' }}>
            No se encontraron productos.
          </p>
        )}
      </div>
    </div>
  );
}