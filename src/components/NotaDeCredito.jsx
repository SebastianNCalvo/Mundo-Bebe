import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { jsPDF } from 'jspdf'; // Asumiendo que usas jsPDF para tus facturas
import '../styles/NotaDeCredito.css';

const NotaDeCredito = ({ ventaOriginal, montoAFavor, alTerminar, sesion, productosInvolucrados }) => {
  const [procesando, setProcesando] = useState(false);
  const [codigoNC, setCodigoNC] = useState(null);
  const [identificador, setIdentificador] = useState('');

  // EFECTO AUTOMÁTICO: Cuando se genera el código, se dispara el PDF
  useEffect(() => {
    if (codigoNC) {
      generarPDFAutomatico();
    }
  }, [codigoNC]);

  const generarPDFAutomatico = () => {
    try {
      const doc = new jsPDF({
        format: [80, 150], // Formato ticket (puedes cambiarlo a 'a4' si prefieres)
        unit: 'mm'
      });

      const margin = 5;
      let y = 10;

      // Encabezado
      doc.setFontSize(12);
      doc.text("NOTA DE CRÉDITO", 40, y, { align: 'center' });
      y += 7;
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(codigoNC, 40, y, { align: 'center' });
      
      y += 10;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Fecha: ${new Date().toLocaleDateString()}`, margin, y);
      y += 5;
      doc.text(`Venta Ref: ${ventaOriginal.codigo_venta}`, margin, y);
      y += 5;
      doc.text(`Cliente: ${identificador || 'General'}`, margin, y);

      y += 7;
      doc.line(margin, y, 75, y);
      y += 5;

      // DETALLE DE PRODUCTOS (Lo que pidió el usuario)
      doc.setFont("helvetica", "bold");
      doc.text("DETALLE DEL CAMBIO:", margin, y);
      y += 5;
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");

      // Productos devueltos
      productosInvolucrados?.devueltos.forEach(p => {
        doc.text(`DEVOLVIÓ: ${p.nombre} (T:${p.talle})`, margin, y);
        y += 4;
      });

      // Productos nuevos
      productosInvolucrados?.nuevos.forEach(p => {
        doc.text(`LLEVÓ: ${p.nombre} (T:${p.talle})`, margin, y);
        y += 4;
      });

      y += 5;
      doc.line(margin, y, 75, y);
      y += 7;

      // MONTO FINAL
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("SALDO A FAVOR:", margin, y);
      doc.text(`$${Math.abs(montoAFavor).toLocaleString('es-AR')}`, 75, y, { align: 'right' });

      y += 10;
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.text("Válido por 90 días para compras en el local.", 40, y, { align: 'center' });

      // Descarga automática
      doc.save(`NotaCredito_${codigoNC}.pdf`);

    } catch (error) {
      console.error("Error generando PDF:", error);
      alert("Se guardó en base de datos pero hubo un error al descargar el PDF.");
    }
  };

  const generarNota = async () => {
    setProcesando(true);
    try {
      const nuevoCodigo = `NC-${Math.floor(1000 + Math.random() * 9000)}`;
      
      const { data, error } = await supabase
        .from('notas_credito')
        .insert([{
          codigo_nc: nuevoCodigo,
          venta_origen_id: ventaOriginal.id,
          monto: Math.abs(montoAFavor),
          estado: 'disponible',
          identificador_cliente: identificador || 'Cliente General',
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

  const devolverEfectivo = async () => {
    if (!window.confirm("¿Confirmas que devolviste el efectivo al cliente?")) return;

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
      alert("✅ Salida de caja registrada correctamente.");
      alTerminar();
    } catch (err) {
      console.error(err);
      alert("Error al registrar la salida de efectivo.");
    } finally {
      setProcesando(false);
    }
  };

  if (codigoNC) {
    return (
      <div className="seccion-nota-credito">
        <div className="ticket-virtual animar-entrada">
          <div className="header-nc">
            <h3>Comprobante Generado</h3>
            <span>PDF Descargado Automáticamente</span>
          </div>
          
          <div className="codigo-nc-display">{codigoNC}</div>
          
          <div className="cuerpo-nc">
            <p>Monto disponible:</p>
            <span className="monto-grande">${Math.abs(montoAFavor).toLocaleString('es-AR')}</span>
            <div className="info-extra-ticket">
               <p><strong>Cliente:</strong> {identificador || 'General'}</p>
               <p><strong>Venta Ref:</strong> {ventaOriginal.codigo_venta}</p>
            </div>
          </div>

          <div className="footer-nc">
            <p>Se ha descargado el comprobante para enviar al cliente.</p>
          </div>
        </div>

        <button className="btn-confirmar-cambio" style={{marginTop: '20px'}} onClick={alTerminar}>
          Finalizar y Salir
        </button>
      </div>
    );
  }

  return (
    <div className="seccion-nota-credito">
      <div className="alerta-saldo">
        <div className="emoji-saldo">💰</div>
        <div className="alerta-info">
          <h4>¡Saldo a favor detectado!</h4>
          <p>Hay un excedente de <strong>${Math.abs(montoAFavor).toLocaleString('es-AR')}</strong></p>
        </div>
      </div>

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
        <button className="btn-opcion-saldo primario" onClick={generarNota} disabled={procesando}>
          <span className="titulo-btn">{procesando ? 'Generando...' : 'Generar Nota de Crédito'}</span>
          <span className="subtitulo-btn">Descarga PDF automáticamente</span>
        </button>

        <button className="btn-opcion-saldo secundario" onClick={devolverEfectivo} disabled={procesando}>
          <span className="titulo-btn">Devolver Efectivo</span>
          <span className="subtitulo-btn">Registro en Gastos</span>
        </button>
      </div>
      
      <button className="tab-btn" style={{width: '100%', marginTop: '10px', background: 'none', border: 'none', textDecoration: 'underline'}} onClick={alTerminar}>
        Omitir y volver
      </button>
    </div>
  );
};

export default NotaDeCredito;