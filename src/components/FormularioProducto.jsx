import { useState } from 'react';
import { supabase } from '../supabaseClient';
import '../styles/Formulario.css';

export default function FormularioProducto() {
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [stock, setStock] = useState('');

  const guardarProducto = async (e) => {
    e.preventDefault();
    const { data, error } = await supabase
      .from('productos')
      .insert([{ nombre, precio: parseFloat(precio), stock: parseInt(stock) }]);

    if (error) console.log("Error:", error);
    else {
      alert("¡Producto cargado!");
      setNombre(''); setPrecio(''); setStock('');
    }
  };

  return (
    <form className="form-container" onSubmit={guardarProducto}>
      <h2>Cargar Nuevo Producto</h2>
      <input type="text" placeholder="Nombre (ej: Remera Oso)" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
      <input type="number" placeholder="Precio" value={precio} onChange={(e) => setPrecio(e.target.value)} required />
      <input type="number" placeholder="Stock Inicial" value={stock} onChange={(e) => setStock(e.target.value)} required />
      <button type="submit">Guardar en Inventario</button>
    </form>
  );
}