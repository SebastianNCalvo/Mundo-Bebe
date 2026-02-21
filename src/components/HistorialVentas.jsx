import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import '../styles/Inventario.css';

export default function HistorialVentas() {
  const [ventas, setVentas] = useState([]);
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [anio, setAnio] = useState(new Date().getFullYear());

const traerHistorial = async () => {
  const inicioMes = `${anio}-${String(mes).padStart(2, '0')}-01T00:00:00`;
  
  const ultimoDia = new Date(anio, mes, 0).getDate();
  const finMes = `${anio}-${String(mes).padStart(2, '0')}-${ultimoDia}T23:59:59`;

  console.log(`Consultando rango real: ${inicioMes} al ${finMes}`);

  const { data, error } = await supabase
    .from('ventas')
    .select('id, cantidad, total, fecha, productos(nombre, talle)')
    .gte('fecha', inicioMes)
    .lte('fecha', finMes)
    .order('fecha', { ascending: false });

  if (error) {
    console.error("Error en Supabase:", error);
  } else {
    setVentas(data || []);
  }
};

  useEffect(() => {
    traerHistorial();
  }, [mes, anio]);

  const totalMensual = ventas.reduce((acc, v) => acc + (v.total || 0), 0);

  const formatearFechaArg = (fechaISO) => {
    if (!fechaISO) return "S/F";
    const fecha = new Date(fechaISO);
    return fecha.toLocaleString('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="historial-container">
      <h3>Resumen de Ventas 💰</h3>

      <div className="filtros-historial">
        <select value={mes} onChange={(e) => setMes(parseInt(e.target.value))}>
          <option value="1">Enero</option>
          <option value="2">Febrero</option>
          <option value="3">Marzo</option>
          <option value="4">Abril</option>
          <option value="5">Mayo</option>
          <option value="6">Junio</option>
          <option value="7">Julio</option>
          <option value="8">Agosto</option>
          <option value="9">Septiembre</option>
          <option value="10">Octubre</option>
          <option value="11">Noviembre</option>
          <option value="12">Diciembre</option>
        </select>

        <select value={anio} onChange={(e) => setAnio(parseInt(e.target.value))}>
          <option value="2024">2024</option>
          <option value="2025">2025</option>
          <option value="2026">2026</option>
        </select>
      </div>

      <div className="card-total-mes">
        <h4>Total Mensual: <span>${totalMensual.toLocaleString('es-AR')}</span></h4>
        <p>Operaciones: {ventas.length}</p>
      </div>

      <table className="tabla-inventario">
        <thead>
          <tr>
            <th>Fecha/Hora (Arg)</th>
            <th>Producto</th>
            <th>Cant.</th>
            <th>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {ventas.map((v) => (
            <tr key={v.id}>
              <td data-label="Fecha">{formatearFechaArg(v.fecha)}</td>
              <td data-label="Producto">{v.productos?.nombre}</td>
              <td data-label="Cantidad">{v.cantidad}</td>
              <td data-label="Total">${v.total}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {ventas.length === 0 && (
        <p style={{ textAlign: 'center', padding: '20px' }}>No hay ventas en este período.</p>
      )}
    </div>
  );
}