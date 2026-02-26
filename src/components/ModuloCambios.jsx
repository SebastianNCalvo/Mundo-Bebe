import { useState } from 'react';
import { supabase } from '../supabaseClient';
import '../styles/ModuloCambios.css';

// Recibimos sesion y alTerminar como props
const ModuloCambios = ({ sesion, alTerminar }) => {
  const [codigoBusqueda, setCodigoBusqueda] = useState('');
  const [ventaOriginal, setVentaOriginal] = useState(null);
  const [productoADevolver, setProductoADevolver] = useState(null);
  const [productoNuevo, setProductoNuevo] = useState(null);
  const [busquedaNuevo, setBusquedaNuevo] = useState('');
  const [resultadosBusqueda, setResultadosBusqueda] = useState([]);
  const [cortesia, setCortesia] = useState(false);

  // 1. Buscar la venta original
  const buscarVenta = async () => {
    const { data, error } = await supabase
      .from('ventas_cabecera')
      .select(`id, codigo_venta, total_total, metodo_pago, vendedor_email, ventas_detalle(cantidad, precio_unitario, producto_id, productos(nombre, talle))`)
      .eq('codigo_venta', codigoBusqueda.toUpperCase())
      .single();

    if (error || !data) {
      alert("No se encontró ninguna venta con ese código.");
      return;
    }
    setVentaOriginal(data);
  };

  // 2. Buscar el nuevo producto en el inventario
  const buscarProductoNuevo = async (termino) => {
    setBusquedaNuevo(termino);
    if (termino.length < 2) return;
    const { data } = await supabase
      .from('productos')
      .select('*')
      .ilike('nombre', `%${termino}%`)
      .gt('stock', 0)
      .limit(5);
    setResultadosBusqueda(data || []);
  };

  // 3. Cálculos de diferencia
  const precioDevuelto = productoADevolver?.precio_unitario || 0;
  const precioNuevo = productoNuevo?.precio || 0;
  const diferencia = precioNuevo - precioDevuelto;
  const aPagar = cortesia ? 0 : (diferencia > 0 ? diferencia : 0);

  // 4. Procesar el Cambio
  const procesarCambio = async () => {
    if (!productoADevolver || !productoNuevo) {
      alert("Debes seleccionar el producto que devuelve y el nuevo.");
      return;
    }

    try {
      // A. Registrar la Devolución (Entrada de stock)
      await supabase.from('devoluciones').insert([{
        venta_origen_id: ventaOriginal.id,
        producto_id: productoADevolver.producto_id,
        precio_al_que_se_vendio: precioDevuelto
      }]);

      // B. Actualizar Stock: +1 al que vuelve, -1 al que sale
      await supabase.rpc('increment_stock', { row_id: productoADevolver.producto_id, x: 1 });
      await supabase.rpc('increment_stock', { row_id: productoNuevo.id, x: -1 });

      // C. Registrar el Registro de Cambio
      await supabase.from('cambios_registros').insert([{
        venta_origen_id: ventaOriginal.id,
        producto_devuelto_id: productoADevolver.producto_id,
        producto_nuevo_id: productoNuevo.id,
        diferencia_total: diferencia,
        monto_cobrado: aPagar,
        monto_cortesia: cortesia ? diferencia : 0,
        // SEGUIMIENTO DE VENDEDORES:
        vendedor_email: ventaOriginal.vendedor_email, // El que hizo la venta original
        vendedor_cambio_email: sesion?.user?.email   // El que está haciendo el cambio AHORA
      }]);

      alert("✅ Cambio procesado con éxito.");
      
      if (alTerminar) alTerminar();

      // LIMPIAR ESTADOS
      setCodigoBusqueda('');
      setVentaOriginal(null);
      setProductoADevolver(null);
      setProductoNuevo(null);
      setBusquedaNuevo('');
      setCortesia(false);

    } catch (err) {
      console.error(err);
      alert("Error al procesar el cambio.");
    }
  };

  return (
    <div className="modulo-cambios">
      <h2>🔄 Módulo de Cambios y Devoluciones</h2>
      
      <div className="buscador-seccion">
        <input 
          type="text" 
          placeholder="Código de Venta (MB-XXXX)" 
          value={codigoBusqueda} 
          onChange={(e) => setCodigoBusqueda(e.target.value)} 
        />
        <button onClick={buscarVenta}>🔍 Buscar</button>
      </div>

      {ventaOriginal && (
        <div className="detalles-cambio animar-entrada">
          {/* Mostramos quién hizo la venta para dar contexto al vendedor actual */}
          <p style={{fontSize: '0.8em', color: 'gray', marginBottom: '10px'}}>
            Venta original realizada por: <strong>{ventaOriginal.vendedor_email}</strong>
          </p>

          <div className="card-cambio">
            <h3>1. ¿Qué producto devuelve?</h3>
            {ventaOriginal.ventas_detalle.map((item, i) => (
              <div key={i} className={`item-devolucion ${productoADevolver?.producto_id === item.producto_id ? 'seleccionado' : ''}`}
                   onClick={() => setProductoADevolver(item)}>
                <span>{item.productos.nombre} ({item.productos.talle})</span>
                <strong>${item.precio_unitario.toLocaleString('es-AR')}</strong>
              </div>
            ))}
          </div>

          <div className="card-cambio">
            <h3>2. ¿Qué producto se lleva?</h3>
            <input 
              type="text" 
              placeholder="Buscar nuevo producto..." 
              value={busquedaNuevo}
              onChange={(e) => buscarProductoNuevo(e.target.value)}
            />
            <div className="lista-resultados">
              {resultadosBusqueda.map(p => (
                <div key={p.id} className="resultado-item" onClick={() => {setProductoNuevo(p); setResultadosBusqueda([]);}}>
                  {p.nombre} - ${p.precio.toLocaleString('es-AR')} (Stock: {p.stock})
                </div>
              ))}
            </div>
            {productoNuevo && (
              <div className="producto-seleccionado">
                ⭐ Seleccionado: {productoNuevo.nombre} - <strong>${productoNuevo.precio.toLocaleString('es-AR')}</strong>
              </div>
            )}
          </div>

          <div className="resumen-final">
            <h3>3. Liquidación</h3>
            <div className="fila-resumen">
              <span>Diferencia:</span>
              <span className={diferencia > 0 ? 'texto-peligro' : 'texto-exito'}>
                {diferencia > 0 ? `+$${diferencia.toLocaleString('es-AR')}` : `-$${Math.abs(diferencia).toLocaleString('es-AR')}`}
              </span>
            </div>
            
            {diferencia > 0 && (
              <label className="checkbox-cortesia">
                <input type="checkbox" checked={cortesia} onChange={() => setCortesia(!cortesia)} />
                🎁 Bonificar diferencia (Cortesía)
              </label>
            )}

            <div className="total-caja">
              <span>Total a cobrar:</span>
              <strong>${aPagar.toLocaleString('es-AR')}</strong>
            </div>

            <button className="btn-confirmar-cambio" onClick={procesarCambio}>
              Confirmar Operación
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModuloCambios;