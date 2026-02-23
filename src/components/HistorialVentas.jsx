import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import '../styles/HistorialVentas.css';

const HistorialVentas = () => {
  const [ventas, setVentas] = useState([]);
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    obtenerHistorial();
  }, [mes, anio]);

  const obtenerHistorial = async () => {
    setCargando(true);
    const fechaInicio = `${anio}-${String(mes).padStart(2, '0')}-01`;
    const proximoMes = mes === 12 ? 1 : mes + 1;
    const proximoAnio = mes === 12 ? anio + 1 : anio;
    const fechaFin = `${proximoAnio}-${String(proximoMes).padStart(2, '0')}-01`;

    const { data, error } = await supabase
      .from('ventas')
      .select(`
        *,
        productos (
          nombre
        )
      `)
      .gte('fecha', fechaInicio)
      .lt('fecha', fechaFin)
      .order('fecha', { ascending: false });

    if (error) {
      console.error("Error:", error.message);
    } else {
      setVentas(data || []);
    }
    setCargando(false);
  };

  const totalMensual = ventas.reduce((acc, v) => acc + (v.total || 0), 0);

  return (
    <div className="historial-container">
      <div className="card-total-mes">
        <h4>Total Mensual Facturado</h4>
        <span>${totalMensual.toLocaleString('es-AR')}</span>
      </div>

      <div className="historial-filtros">
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

      <div className="tabla-historial-wrapper">
        {cargando ? (
          <p style={{ textAlign: 'center', padding: '20px' }}>Cargando registros...</p>
        ) : (
          <table className="tabla-inventario"> 
            <thead>
              <tr>
                <th>Fecha y Hora</th>
                <th>Producto</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {ventas.length > 0 ? (
                ventas.map((venta) => (
                  <tr key={venta.id}>
                    <td data-label="Fecha/Hora">
                      {new Date(venta.fecha).toLocaleString('es-AR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td data-label="Producto">
                      {venta.productos?.nombre || "Producto no encontrado"}
                    </td>
                    <td data-label="Total" className="texto-total-venta">
                      ${venta.total?.toLocaleString('es-AR')}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" style={{ textAlign: 'center' }}>No hay ventas en este período.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default HistorialVentas;