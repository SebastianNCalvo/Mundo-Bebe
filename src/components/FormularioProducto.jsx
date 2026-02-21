import { useState } from 'react';
import { supabase } from '../supabaseClient';
import '../styles/Formulario.css';

export default function FormularioProducto({ alTerminar }) {
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [stock, setStock] = useState('');
  const [talle, setTalle] = useState('');

  const tallesDisponibles = ['Recién Nacido', '1 a 3 meses', 'T4', 'T6', 'T8', 'T10', 'T12'];

  const guardarProducto = async (e) => {
    e.preventDefault();
    
    let errorOperacion = null;

    const { data: existente, error: errorBusqueda } = await supabase
      .from('productos')
      .select('*')
      .eq('nombre', nombre)
      .eq('talle', talle)
      .maybeSingle();

    if (errorBusqueda) {
      console.error(errorBusqueda);
      return;
    }

    if (existente) {
      const nuevoStock = existente.stock + parseInt(stock);
      const { error } = await supabase
        .from('productos')
        .update({ stock: nuevoStock, precio: parseFloat(precio) })
        .eq('id', existente.id);
      
      errorOperacion = error; // Guardamos el resultado aquí
      if (!error) alert(`¡Stock actualizado! Ahora hay ${nuevoStock} unidades.`);

    } else {
      const { error } = await supabase
        .from('productos')
        .insert([{ 
          nombre, 
          precio: parseFloat(precio), 
          stock: parseInt(stock), 
          talle 
        }]);

      errorOperacion = error; 
      if (!error) alert("¡Producto nuevo creado con éxito!");
    }

    if (!errorBusqueda && !errorOperacion) {
      setNombre(''); 
      setPrecio(''); 
      setStock(''); 
      setTalle('');
      
      if (alTerminar) alTerminar(); 
    } else {
      alert("Hubo un error al procesar la solicitud");
    }
  };
  

  return (
    <form className="form-container" onSubmit={guardarProducto}>
      <h2>Cargar Mercadería</h2>
      <input type="text" placeholder="Producto (ej: Body Algodón)" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
      
      <div className="form-group-row">
        <select value={talle} onChange={(e) => setTalle(e.target.value)} required style={{width: '100%'}}>
          <option value="">Seleccionar Talle</option>
          {tallesDisponibles.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <input type="number" placeholder="Precio $" value={precio} onChange={(e) => setPrecio(e.target.value)} required />
      <input type="number" placeholder="Stock" value={stock} onChange={(e) => setStock(e.target.value)} required />
      
      <button type="submit">Agregar al Inventario</button>
    </form>
  );
}