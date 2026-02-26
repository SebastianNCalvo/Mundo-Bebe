import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; // CAMBIO: Importación específica

export const generarFacturaPDF = (datosVenta) => {
  const { codigo, carrito, total, metodoPago, vendedor } = datosVenta;
  
  // 1. Crear el documento (A4)
  const doc = new jsPDF();
  const fechaActual = new Date().toLocaleString('es-AR');

  // --- CONFIGURACIÓN DE ESTILOS ---
  const azulOscuro = [2, 136, 209]; // Un azul acorde a la marca
  const grisTexto = [55, 71, 79];

  // 2. ENCABEZADO
  doc.setFontSize(22);
  doc.setTextColor(...azulOscuro);
  doc.setFont("helvetica", "bold");
  doc.text("MUNDO BEBÉ", 20, 25);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.setFont("helvetica", "normal");
  doc.text("Ropa y Accesorios Infantiles", 20, 32);
  
  // Recuadro para el Código de Venta (arriba a la derecha)
  doc.setDrawColor(...azulOscuro);
  doc.setLineWidth(0.5);
  doc.rect(140, 15, 50, 20); 
  doc.setFontSize(11);
  doc.text("CÓDIGO DE VENTA", 145, 22);
  doc.setFontSize(13);
  doc.setTextColor(233, 30, 99); // Rosa para el código
  doc.text(codigo, 145, 30);

  // 3. DATOS DE LA TRANSACCIÓN
  doc.setTextColor(...grisTexto);
  doc.setFontSize(10);
  doc.text(`Fecha: ${fechaActual}`, 20, 50);
  doc.text(`Vendedor: ${vendedor.split('@')[0]}`, 20, 56);
  doc.text(`Método de Pago: ${metodoPago}`, 20, 62);

  // Línea divisoria
  doc.setDrawColor(200);
  doc.line(20, 68, 190, 68);

  // 4. TABLA DE PRODUCTOS (Detalle)
  const columnas = ["Producto", "Talle", "Cant.", "Precio Unit.", "Subtotal"];
  const filas = carrito.map(item => [
    item.nombre,
    item.talle || '-',
    item.cantidadEnCarrito,
    `$${item.precio.toLocaleString('es-AR')}`,
    `$${(item.precio * item.cantidadEnCarrito).toLocaleString('es-AR')}`
  ]);

  // CAMBIO: Llamamos a la función autoTable pasándole el 'doc'
  autoTable(doc, {
    startY: 75,
    head: [columnas],
    body: filas,
    theme: 'striped',
    headStyles: { 
      fillColor: azulOscuro, 
      fontSize: 10, 
      halign: 'center' 
    },
    styles: { 
      fontSize: 9, 
      cellPadding: 5 
    },
    columnStyles: {
      0: { cellWidth: 70 },
      2: { halign: 'center' },
      3: { halign: 'right' },
      4: { halign: 'right' }
    }
  });

// 5. TOTAL Y CIERRE
  const finalY = doc.lastAutoTable.finalY + 15; // Aumentamos un poquito el margen
  
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...grisTexto);
  
  // Dibujamos el texto de la etiqueta
  doc.text("TOTAL A PAGAR:", 120, finalY); 
  
  // Dibujamos el monto por separado con un color destacado y un poco más de margen
  doc.setTextColor(0, 0, 0); // Negro puro
  const montoFormateado = `$${total.toLocaleString('es-AR')}`;
  
  // Usamos una coordenada X fija (190) para que siempre termine en el mismo borde
  doc.text(montoFormateado, 190, finalY, { align: 'right' });

  // Nota al pie
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(150);
  doc.text("Gracias por elegir Mundo Bebé para los más pequeños.", 105, finalY + 25, { align: 'center' });
  doc.text("Conserve este comprobante para cambios o devoluciones.", 105, finalY + 30, { align: 'center' });

  // 6. DESCARGAR EL ARCHIVO
  doc.save(`Factura_${codigo}.pdf`);
};