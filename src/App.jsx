import './styles/App.css';
import FormularioProducto from './components/FormularioProducto';
import ListaInventario from './components/ListaInventario';
import SeccionVentas from './components/SeccionVentas';
import HistorialVentas from './components/HistorialVentas';
import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
// ... tus otros imports de componentes ...
import Login from './components/Login';

function App() {
  const [sesion, setSesion] = useState(null);
  const [pestana, setPestana] = useState('inventario');
  const [actualizador, setActualizador] = useState(0);
  
  const refrescarInventario = () => {
    setActualizador(prev => prev + 1);
  };
  useEffect(() => {
    // 1. Revisar si ya hay una sesión activa al cargar
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSesion(session);
    });

    // 2. Escuchar cambios en el estado de auth (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSesion(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
  };

  // SI NO HAY SESIÓN, MOSTRAR LOGIN
  if (!sesion) {
    return <Login />;
  }

  return (
    <div className="dashboard-main">
      <header className="header-admin">
        <h1>Mundo Bebé 👶</h1>
        <button className="btn-logout" onClick={cerrarSesion}>Cerrar Sesión</button>
      </header>

      <nav className="tabs-nav">
        <button onClick={() => setPestana('inventario')}>Inventario</button>
        <button onClick={() => setPestana('ventas')}>Ventas</button>
        <button onClick={() => setPestana('historial')}>Historial</button>
      </nav>

      <div className="tab-content">
        {pestana === 'inventario' && (
          <div className="layout-grid">
            {/* Le pasamos la función para que el formulario pueda "tocar el timbre" */}
            <FormularioProducto alTerminar={refrescarInventario} />
            
            {/* Le pasamos el estado para que la lista sepa cuándo reaccionar */}
            <ListaInventario trigger={actualizador} />
          </div>
        )}

        {pestana === 'ventas' && <SeccionVentas />}
        
        {pestana === 'historial' && <HistorialVentas />}
      </div>
    </div>
  );
}

export default App;