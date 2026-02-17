import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function HistorialVentas(){
    const [ventas, setVentas] = useState([]);
    const [totalRecaudado, setTotalRecaudado] = useState(0);

    const obtenerVentas = async () => {
        const {data, error} = await supabase
        .from('ventas')
        .select(`
            id,
            cantidad,
            total,
            fecha,
            productos (nombre)
        `)
        .order('fecha', {ascending:false});

        if(error) console.log("Error: ", error);
        else {
            setVentas(data);
            const suma = data.reduce((acc, v) => acc + v.total, 0);
            setTotalRecaudado(suma);
        }

        useEffect(() => {
            obtenerVentas()
        }, []);

    }

    return (
        <div className="inventario-container">
            <h3>Historial de Ventas 💰</h3>
            <p><strong>Total Recaudado: ${totalRecaudado.toLocaleString()}</strong></p>
            
            <div className="tabla-wrapper">
                <table className="tabla-inventario">
                <thead>
                    <tr>
                    <th>Fecha</th>
                    <th>Producto</th>
                    <th>Cant.</th>
                    <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    {ventas.map((v) => (
                    <tr key={v.id}>
                        <td>{new Date(v.fecha).toLocaleDateString()}</td>
                        <td>{v.productos?.nombre || 'Producto eliminado'}</td>
                        <td>{v.cantidad}</td>
                        <td>${v.total}</td>
                    </tr>
                    ))}
                </tbody>
                </table>
            </div>
        </div>
    );
}