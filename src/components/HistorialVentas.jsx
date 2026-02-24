import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import '../styles/HistorialVentas.css';

const HistorialVentas = () => {
  const [ventas, setVentas] = useState([]);
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [vendedorFiltro, setVendedorFiltro] = useState('Todos'); // NUEVO ESTADO
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
      .from('ventas_cabecera')
      .select(`
        id,
        fecha,
        vendedor_email,
        total_total,
        metodo_pago,
        ventas_detalle (
          cantidad,
          productos (
            nombre,
            talle
          )
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

  // 1. Obtener lista única de vendedores para el select
  const listaVendedores = ['Todos', ...new Set(ventas.map(v => v.vendedor_email || 'S/D'))];

  // 2. Filtrar las ventas según el vendedor seleccionado
  const ventasFiltradas = vendedorFiltro === 'Todos' 
    ? ventas 
    : ventas.filter(v => (v.vendedor_email || 'S/D') === vendedorFiltro);

  // 3. Los totales ahora se calculan sobre las VENTAS FILTRADAS
  const totalMensual = ventasFiltradas.reduce((acc, v) => acc + (Number(v.total_total) || 0), 0);
  
  const resumenPagos = ventasFiltradas.reduce((acc, v) => {
    const metodo = v.metodo_pago || 'Efectivo';
    acc[metodo] = (acc[metodo] || 0) + Number(v.total_total);
    return acc;
  }, {});

  return (
    <div className="historial-container">
      <div className="card-total-mes">
        <h4>Total {vendedorFiltro === 'Todos' ? 'Mensual' : `de ${vendedorFiltro.split('@')[0]}`}</h4>
        <span>${totalMensual.toLocaleString('es-AR')}</span>
      </div>

      <div className="resumen-metodos">
        {Object.entries(resumenPagos).map(([metodo, monto]) => (
          <div key={metodo} className="mini-card-pago">
            <small>{metodo}</small>
            <p>${monto.toLocaleString('es-AR')}</p>
          </div>
        ))}
      </div>

      <div className="historial-filtros">
        {/* NUEVO FILTRO DE VENDEDOR */}
        <select value={vendedorFiltro} onChange={(e) => setVendedorFiltro(e.target.value)}>
          {listaVendedores.map(vend => (
            <option key={vend} value={vend}>
              {vend === 'Todos' ? 'Todos los Vendedores' : vend.split('@')[0]}
            </option>
          ))}
        </select>

        <select value={mes} onChange={(e) => {
          setMes(parseInt(e.target.value));
          setVendedorFiltro('Todos'); // Opcional: resetear filtro al cambiar mes
        }}>
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
                <th>Vendedor</th>
                <th>Productos</th>
                <th>Pago</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {ventasFiltradas.length > 0 ? (
                ventasFiltradas.map((venta) => (
                  <tr key={venta.id}>
                    <td data-label="Fecha/Hora">
                      {new Date(venta.fecha).toLocaleString('es-AR', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit', hour12: false
                      })}
                    </td>
                    <td data-label="Vendedor" style={{ fontSize: '0.85rem' }}>
                      {venta.vendedor_email ? venta.vendedor_email.split('@')[0] : 'S/D'}
                    </td>
                    <td data-label="Productos" style={{ textAlign: 'left' }}>
                      {venta.ventas_detalle.map((det, idx) => (
                        <div key={idx} style={{ fontSize: '0.85rem', marginBottom: '2px' }}>
                          • {det.productos?.nombre} (T{det.productos?.talle}) x{det.cantidad}
                        </div>
                      ))}
                    </td>
                    <td data-label="Pago">
                      <span className={`tag-pago ${venta.metodo_pago?.toLowerCase()}`}>
                        {venta.metodo_pago || 'Efectivo'}
                      </span>
                    </td>
                    <td data-label="Total" className="texto-total-venta">
                      ${Number(venta.total_total).toLocaleString('es-AR')}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center' }}>No hay ventas para este filtro.</td>
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