import './styles/App.css';
import FormularioProducto from './components/FormularioProducto';
import ListaInventario from './components/ListaInventario';
import SeccionVentas from './components/SeccionVentas';
import HistorialVentas from './components/HistorialVentas';
import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Login from './components/Login';

function App() {
  const [sesion, setSesion] = useState(null);
  const [pestana, setPestana] = useState('ventas');
  const [actualizador, setActualizador] = useState(0);
  
  const refrescarInventario = () => {
    setActualizador(prev => prev + 1);
  };
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSesion(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSesion(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
  };

  if (!sesion) {
    return <Login />;
  }
  const ADMIN_UID= "5a06506a-48ad-41b7-ab29-24ba4bc29502"
  const esAdmin = sesion?.user.id === ADMIN_UID;

  return (
    <div className="dashboard-main">
      <header className="header-admin">
        <div>
          <h1>Mundo Bebé 👶</h1>
          <p>Usuario: <strong>{sesion?.user.email}</strong> ({esAdmin ? "Admin" : "Vendedor"})</p>
        </div>
        <button className="btn-logout" onClick={cerrarSesion}>Salir</button>
      </header>

      <nav className="tabs-nav">
        <button onClick={() => setPestana('ventas')}>Ventas</button>
        <button onClick={() => setPestana('inventario')}>Inventario</button>
        
        {esAdmin && (
          <button onClick={() => setPestana('historial')}>Historial 💰</button>
        )}
      </nav>

      <div className="tab-content">
        {pestana === 'inventario' && (
          <div className="layout-grid">
            {esAdmin && <FormularioProducto alTerminar={refrescarInventario} />}
            
            <ListaInventario trigger={actualizador} esAdmin={esAdmin} />
          </div>
        )}

        {pestana === 'ventas' && <SeccionVentas alTerminar={refrescarInventario} />}
        
        {pestana === 'historial' && esAdmin && <HistorialVentas />}
      </div>
    </div>
  );
}

export default App;