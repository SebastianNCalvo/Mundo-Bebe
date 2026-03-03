import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import '../styles/Inventario.css';

export default function ListaInventario({ trigger, esAdmin }) {
  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  
  // Estados para la edición
  const [editandoId, setEditandoId] = useState(null);
  const [productoEditado, setProductoEditado] = useState({});
  
  // Feedback visual
  const [idRecienActualizado, setIdRecienActualizado] = useState(null);

  useEffect(() => {
    obtenerProductos();
  }, [trigger]);

  const obtenerProductos = async () => {
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .order('nombre', { ascending: true });

    if (error) console.error("Error cargando:", error);
    else setProductos(data);
  };

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
      setIdRecienActualizado(id);
      setTimeout(() => setIdRecienActualizado(null), 2000);
      obtenerProductos();
    }
  };

  const eliminarProducto = async (id) => {
    if (window.confirm("¿Seguro que quieres eliminar este producto?")) {
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
      <h3 className="titulo-seccion">Stock Actual de Ropa</h3>

      {/* CAMBIO AQUÍ: Solo el admin ve el Valor Total */}
      {esAdmin && (
        <div className="card-total-inventario animar-entrada">
          <small className="label-capital">Valor Total de Mercadería</small>
          <span className="monto-capital">${valorTotalInventario.toLocaleString('es-AR')}</span>
        </div>
      )}

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
                className={`fila-producto ${idRecienActualizado === prod.id ? 'fila-actualizada' : ''} ${editandoId === prod.id ? 'fila-editando' : ''}`}
              >
                {editandoId === prod.id ? (
                  <>
                    <td data-label="Producto">
                      <input 
                        type="text" 
                        value={productoEditado.nombre} 
                        onChange={(e) => setProductoEditado({...productoEditado, nombre: e.target.value})}
                        className="input-edit-celda"
                        autoFocus
                      />
                    </td>
                    <td data-label="Talle">
                      <input 
                        type="text" 
                        value={productoEditado.talle} 
                        onChange={(e) => setProductoEditado({...productoEditado, talle: e.target.value})}
                        className="input-edit-celda small"
                      />
                    </td>
                    <td data-label="Precio">
                      <input 
                        type="number" 
                        value={productoEditado.precio} 
                        onChange={(e) => setProductoEditado({...productoEditado, precio: e.target.value})}
                        className="input-edit-celda"
                      />
                    </td>
                    <td data-label="Stock">
                      <input 
                        type="number" 
                        value={productoEditado.stock} 
                        onChange={(e) => setProductoEditado({...productoEditado, stock: e.target.value})}
                        className="input-edit-celda small"
                      />
                    </td>
                    <td data-label="Acciones">
                      <div className="acciones-edit-row">
                        <button onClick={() => guardarCambios(prod.id)} className="btn-save-inline" title="Guardar">✅</button>
                        <button onClick={cancelarEdicion} className="btn-cancel-inline" title="Cancelar">❌</button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td data-label="Producto" className="celda-nombre">
                      <strong>{prod.nombre}</strong>
                    </td>
                    <td data-label="Talle">
                      <span className="badge-talle">{prod.talle}</span>
                    </td>
                    <td data-label="Precio" className="celda-precio">
                      ${prod.precio.toLocaleString('es-AR')}
                    </td>
                    <td data-label="Stock" className={`celda-stock ${prod.stock < 5 ? 'bajo-stock' : ''}`}>
                      {prod.stock} un.
                    </td>
                    {esAdmin && (
                      <td data-label="Acciones">
                        <div className="acciones-botones">
                          <button 
                            className="btn-editar-icono" 
                            onClick={() => iniciarEdicion(prod)}
                            title="Editar"
                          >✏️</button>
                          <button 
                            className="btn-eliminar-icono" 
                            onClick={() => eliminarProducto(prod.id)}
                            title="Eliminar"
                          >×</button>
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
          <div className="mensaje-vacio">
            No se encontraron productos.
          </div>
        )}
      </div>
    </div>
  );
}