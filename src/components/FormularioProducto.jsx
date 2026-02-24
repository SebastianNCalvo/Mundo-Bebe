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

    const stockACargar = parseInt(stock) || 0;
    const precioNumerico = parseFloat(precio);

    if (precioNumerico <= 0) {
      alert("El precio debe ser mayor a 0.");
      return;
    }

    const { data: existente, error: errorBusqueda } = await supabase
      .from('productos')
      .select('*')
      .eq('nombre', nombre.trim())
      .eq('talle', talle)
      .maybeSingle();

    if (errorBusqueda) return console.error(errorBusqueda);

    let errorOperacion = null;

    if (existente) {
      const nuevoStock = existente.stock + stockACargar;
      
      const mensaje = stockACargar > 0 
        ? `¿Confirmas actualizar precio a $${precioNumerico} y sumar ${stockACargar} unidades?`
        : `¿Confirmas actualizar el precio de "${nombre}" a $${precioNumerico}?`;

      const confirmar = window.confirm(mensaje);
      if (!confirmar) return;

      const { error } = await supabase
        .from('productos')
        .update({ 
          stock: nuevoStock, 
          precio: precioNumerico 
        })
        .eq('id', existente.id);
      
      errorOperacion = error;
      if (!error) alert(stockACargar > 0 ? "¡Stock y Precio actualizados!" : "¡Precio actualizado con éxito!");

    } else {
      if (stockACargar <= 0) {
        alert("Para crear un producto nuevo debes ingresar un stock inicial.");
        return;
      }

      const { error } = await supabase
        .from('productos')
        .insert([{ 
          nombre: nombre.trim(), 
          precio: precioNumerico, 
          stock: stockACargar, 
          talle 
        }]);

      errorOperacion = error;
      if (!error) alert("¡Producto nuevo creado con éxito!");
    }

    if (!errorOperacion) {
      setNombre(''); setPrecio(''); setStock(''); setTalle('');
      if (alTerminar) alTerminar(); 
    }
  };

  return (
    <form className="form-container" onSubmit={guardarProducto}>
      <h2>Gestión de Mercadería</h2>
      
      <input 
        type="text" 
        placeholder="Producto (ej: Body Algodón)" 
        value={nombre} 
        onChange={(e) => setNombre(e.target.value)} 
        required 
      />
      
      <div className="form-group-row">
        <select value={talle} onChange={(e) => setTalle(e.target.value)} required style={{width: '100%'}}>
          <option value="">Seleccionar Talle</option>
          {tallesDisponibles.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div className="form-inputs-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div>
          <label style={{ fontSize: '0.7rem', color: '#666', marginLeft: '5px' }}>Precio $</label>
          <input 
            type="number" 
            step="0.01"
            min="0.01"
            placeholder="Precio" 
            value={precio} 
            onChange={(e) => setPrecio(e.target.value)} 
            required 
          />
        </div>
        <div>
          <label style={{ fontSize: '0.7rem', color: '#666', marginLeft: '5px' }}>Stock (Opcional)</label>
          <input 
            type="number" 
            min="0"
            placeholder="Sumar" 
            value={stock} 
            onChange={(e) => setStock(e.target.value)} 
          />
        </div>
      </div>
      
      <button type="submit" style={{ marginTop: '10px' }}>Actualizar / Crear</button>
      <p style={{ fontSize: '0.65rem', color: '#999', textAlign: 'center', marginTop: '5px' }}>
        * Si el producto existe y dejas stock vacío, solo se actualizará el precio.
      </p>
    </form>
  );
}