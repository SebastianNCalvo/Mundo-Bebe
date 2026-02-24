import { useState } from 'react';
import { supabase } from '../supabaseClient';
import '../styles/Gastos.css';

export default function SeccionGastos({ alTerminar, sesion }) {
  const [descripcion, setDescripcion] = useState('');
  const [monto, setMonto] = useState('');
  const [categoria, setCategoria] = useState('Mercadería');
  const [enviando, setEnviando] = useState(false);

  const guardarGasto = async (e) => {
    e.preventDefault();
    if (!descripcion || !monto) return;
    setEnviando(true);

    try {
      const { error } = await supabase
        .from('gastos')
        .insert([{
          descripcion,
          monto: parseFloat(monto),
          categoria,
          vendedor_email: sesion?.user?.email
        }]);

      if (error) throw error;

      alert("💸 Gasto registrado correctamente");
      setDescripcion('');
      setMonto('');
      if (alTerminar) alTerminar();
    } catch (error) {
      console.error("Error al guardar gasto:", error);
      alert("Error al registrar el gasto");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="gastos-container">
      <h3>Registrar Gasto 💸</h3>
      <form onSubmit={guardarGasto} className="gastos-form">
        <div className="input-group">
          <label>Descripción</label>
          <input 
            type="text" 
            placeholder="Ej: Pago de luz, Compra de perchas..." 
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            required
          />
        </div>

        <div className="input-group">
          <label>Monto ($)</label>
          <input 
            type="number" 
            placeholder="0.00"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            required
          />
        </div>

        <div className="input-group">
          <label>Categoría</label>
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            <option value="Mercadería">📦 Mercadería</option>
            <option value="Empleados">👩‍💻 Empleados</option>
            <option value="Alquiler">🏢 Alquiler</option>
            <option value="Servicios">💡 Servicios (Luz, Agua, etc)</option>
            <option value="Varios">🛠️ Varios</option>
          </select>
        </div>

        <button type="submit" className="btn-guardar-gasto" disabled={enviando}>
          {enviando ? 'Guardando...' : 'Confirmar Gasto'}
        </button>
      </form>
    </div>
  );
}