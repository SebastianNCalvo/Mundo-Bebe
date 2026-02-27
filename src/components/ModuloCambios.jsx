import { useState } from 'react';
import { supabase } from '../supabaseClient';
import '../styles/ModuloCambios.css';

const ModuloCambios = ({ sesion, alTerminar }) => {
  const [codigoBusqueda, setCodigoBusqueda] = useState('');
  const [ventaOriginal, setVentaOriginal] = useState(null);
  const [productoADevolver, setProductoADevolver] = useState(null);
  const [productoNuevo, setProductoNuevo] = useState(null);
  const [busquedaNuevo, setBusquedaNuevo] = useState('');
  const [resultadosBusqueda, setResultadosBusqueda] = useState([]);
  const [cortesia, setCortesia] = useState(false);

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

  const precioDevuelto = productoADevolver?.precio_unitario || 0;
  const precioNuevo = productoNuevo?.precio || 0;
  const diferencia = precioNuevo - precioDevuelto;
  const aPagar = cortesia ? 0 : (diferencia > 0 ? diferencia : 0);

  const procesarCambio = async () => {
    if (!productoADevolver || !productoNuevo) {
      alert("Debes seleccionar el producto que devuelve y el nuevo.");
      return;
    }

    try {
      await supabase.from('devoluciones').insert([{
        venta_origen_id: ventaOriginal.id,
        producto_id: productoADevolver.producto_id,
        precio_al_que_se_vendio: precioDevuelto
      }]);

      await supabase.rpc('increment_stock', { row_id: productoADevolver.producto_id, x: 1 });
      await supabase.rpc('increment_stock', { row_id: productoNuevo.id, x: -1 });

      await supabase.from('cambios_registros').insert([{
        venta_origen_id: ventaOriginal.id,
        producto_devuelto_id: productoADevolver.producto_id,
        producto_nuevo_id: productoNuevo.id,
        diferencia_total: diferencia,
        monto_cobrado: aPagar,
        monto_cortesia: cortesia ? diferencia : 0,
        vendedor_email: ventaOriginal.vendedor_email, 
        vendedor_cambio_email: sesion?.user?.email   
      }]);

      alert("✅ Cambio procesado con éxito.");
      
      if (alTerminar) alTerminar();

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
      <h2 className="titulo-modulo">🔄 Módulo de Cambios</h2>
      
      <div className="buscador-seccion">
        <input 
          type="text" 
          className="input-busqueda-venta"
          placeholder="Código de Venta (MB-XXXX)" 
          value={codigoBusqueda} 
          onChange={(e) => setCodigoBusqueda(e.target.value)} 
        />
        <button className="btn-buscar-venta" onClick={buscarVenta}>🔍 Buscar</button>
      </div>

      {ventaOriginal && (
        <div className="detalles-cambio animar-entrada">
          <div className="info-vendedor-original">
            Venta original por: <strong>{ventaOriginal.vendedor_email}</strong>
          </div>

          <div className="card-cambio">
            <h3 className="subtitulo-card">1. ¿Qué producto devuelve?</h3>
            <div className="lista-items-cambio">
              {ventaOriginal.ventas_detalle.map((item, i) => (
                <div 
                  key={i} 
                  className={`item-devolucion ${productoADevolver?.producto_id === item.producto_id ? 'seleccionado' : ''}`}
                  onClick={() => setProductoADevolver(item)}
                >
                  <span className="item-nombre">{item.productos.nombre} ({item.productos.talle})</span>
                  <strong className="item-precio">${item.precio_unitario.toLocaleString('es-AR')}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="card-cambio">
            <h3 className="subtitulo-card">2. ¿Qué producto se lleva?</h3>
            <input 
              type="text" 
              className="input-nuevo-producto"
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
              <div className="producto-seleccionado-badge">
                ⭐ {productoNuevo.nombre} - <strong>${productoNuevo.precio.toLocaleString('es-AR')}</strong>
              </div>
            )}
          </div>

          <div className="resumen-final">
            <h3 className="subtitulo-card">3. Liquidación</h3>
            <div className="fila-resumen">
              <span>Diferencia:</span>
              <span className={diferencia > 0 ? 'monto-diferencia positivo' : 'monto-diferencia negativo'}>
                {diferencia > 0 ? `+$${diferencia.toLocaleString('es-AR')}` : `-$${Math.abs(diferencia).toLocaleString('es-AR')}`}
              </span>
            </div>
            
            {diferencia > 0 && (
              <label className="checkbox-cortesia">
                <input type="checkbox" checked={cortesia} onChange={() => setCortesia(!cortesia)} />
                <span className="texto-cortesia">🎁 Bonificar diferencia (Cortesía)</span>
              </label>
            )}

            <div className="total-caja-cambio">
              <span>Total a cobrar:</span>
              <strong className="monto-total-final">${aPagar.toLocaleString('es-AR')}</strong>
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