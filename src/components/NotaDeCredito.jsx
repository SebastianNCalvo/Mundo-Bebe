import { useState } from 'react';
import { supabase } from '../supabaseClient';
import '../styles/NotaDeCredito.css';

const NotaDeCredito = ({ ventaOriginal, montoAFavor, alTerminar, sesion }) => {
  const [procesando, setProcesando] = useState(false);
  const [codigoNC, setCodigoNC] = useState(null);
  const [identificador, setIdentificador] = useState(''); // Para anotar nombre/DNI opcional

  const generarNota = async () => {
    setProcesando(true);
    try {
      // Generamos un código legible y único
      const nuevoCodigo = `NC-${Math.floor(1000 + Math.random() * 9000)}`;
      
      const { data, error } = await supabase
        .from('notas_credito')
        .insert([{
          codigo_nc: nuevoCodigo,
          venta_origen_id: ventaOriginal.id,
          monto: Math.abs(montoAFavor),
          estado: 'disponible',
          identificador_cliente: identificador || 'Cliente General', // Texto libre
          vendedor_emisor: sesion?.user?.email
        }])
        .select()
        .single();

      if (error) throw error;

      setCodigoNC(nuevoCodigo);
    } catch (err) {
      console.error("Error Supabase:", err);
      alert("Error al conectar con la base de datos de Notas de Crédito.");
    } finally {
      setProcesando(false);
    }
  };

  // NUEVA FUNCIÓN: Registra el egreso de dinero en la tabla de gastos
  const devolverEfectivo = async () => {
    if (!window.confirm("¿Confirmas que devolviste el efectivo al cliente? Esto generará un registro de gasto en tu caja.")) {
      return;
    }

    setProcesando(true);
    try {
      const { error } = await supabase
        .from('gastos')
        .insert([{
          descripcion: `Devolución efectivo: Cambio venta ${ventaOriginal.codigo_venta}`,
          categoria: 'Devoluciones',
          monto: Math.abs(montoAFavor),
          metodo_pago: 'Efectivo',
          vendedor_email: sesion?.user?.email,
          fecha: new Date().toISOString()
        }]);

      if (error) throw error;

      alert("✅ Salida de caja registrada correctamente en Gastos.");
      alTerminar();
    } catch (err) {
      console.error("Error al registrar gasto:", err);
      alert("Error al registrar la salida de efectivo.");
    } finally {
      setProcesando(false);
    }
  };

  // VISTA 2: TICKET GENERADO (EL PDF VIRTUAL)
  if (codigoNC) {
    return (
      <div className="seccion-nota-credito">
        <div className="ticket-virtual animar-entrada">
          <div className="header-nc">
            <h3>Comprobante</h3>
            <span>Saldo a Favor</span>
          </div>
          
          <div className="codigo-nc-display">{codigoNC}</div>
          
          <div className="cuerpo-nc">
            <p>Monto disponible para su próxima compra:</p>
            <span className="monto-grande">${Math.abs(montoAFavor).toLocaleString('es-AR')}</span>
            <div className="info-extra-ticket">
               <p><strong>Cliente:</strong> {identificador || 'General'}</p>
               <p><strong>Venta Ref:</strong> {ventaOriginal.codigo_venta}</p>
            </div>
          </div>

          <div className="footer-nc">
            <p>Presente este código en caja</p>
            <small>Vence en 90 días</small>
          </div>
        </div>

        <button className="btn-confirmar-cambio" style={{marginTop: '20px'}} onClick={alTerminar}>
          Finalizar y Salir
        </button>
      </div>
    );
  }

  // VISTA 1: SELECCIÓN DE OPCIÓN
  return (
    <div className="seccion-nota-credito">
      <div className="alerta-saldo">
        <div className="emoji-saldo">💰</div>
        <div className="alerta-info">
          <h4>¡Saldo a favor detectado!</h4>
          <p>Hay un excedente de <strong>${Math.abs(montoAFavor).toLocaleString('es-AR')}</strong></p>
        </div>
      </div>

      {/* INPUT OPCIONAL PARA EL VENDEDOR - REFACTORIZADO CON CLASES CSS */}
      <div className="card-cambio-input">
        <label style={{fontSize: '0.8rem', fontWeight: '800', display: 'block', marginBottom: '5px'}}>
          IDENTIFICAR CLIENTE (OPCIONAL)
        </label>
        <input 
          type="text" 
          className="input-nc"
          placeholder="Ej: Juan Perez o DNI 123..." 
          value={identificador}
          onChange={(e) => setIdentificador(e.target.value)}
        />
      </div>

      <div className="opciones-nc">
        <button 
          className="btn-opcion-saldo primario" 
          onClick={generarNota} 
          disabled={procesando}
        >
          <span className="titulo-btn">{procesando ? 'Generando...' : 'Generar Nota de Crédito'}</span>
          <span className="subtitulo-btn">El cliente se lleva el código</span>
        </button>

        <button 
          className="btn-opcion-saldo secundario" 
          onClick={devolverEfectivo} 
          disabled={procesando}
        >
          <span className="titulo-btn">Devolver Efectivo</span>
          <span className="subtitulo-btn">Se entrega el dinero ahora</span>
        </button>
      </div>
      
      <button className="tab-btn" style={{width: '100%', marginTop: '10px', background: 'none', border: 'none', textDecoration: 'underline'}} onClick={alTerminar}>
        Omitir y volver
      </button>
    </div>
  );
};

export default NotaDeCredito;