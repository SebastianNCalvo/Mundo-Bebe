import './styles/App.css';
import FormularioProducto from './components/FormularioProducto';
import ListaInventario from './components/ListaInventario';
import SeccionVentas from './components/SeccionVentas';
import HistorialVentas from './components/HistorialVentas';
import SeccionGastos from './components/SeccionGastos'; // 1. Importamos el nuevo componente
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

  const ADMIN_UID = "5a06506a-48ad-41b7-ab29-24ba4bc29502";
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
        <button 
          className={pestana === 'ventas' ? 'active' : ''} 
          onClick={() => setPestana('ventas')}
        >
          Ventas
        </button>
        
        {/* 2. Botón de Gastos disponible para todos */}
        <button 
          className={pestana === 'gastos' ? 'active' : ''} 
          onClick={() => setPestana('gastos')}
        >
          Gastos
        </button>

        <button 
          className={pestana === 'inventario' ? 'active' : ''} 
          onClick={() => setPestana('inventario')}
        >
          Inventario
        </button>
        
        {esAdmin && (
          <button 
            className={pestana === 'historial' ? 'active' : ''} 
            onClick={() => setPestana('historial')}
          >
            Historial
          </button>
        )}
      </nav>

      <div className="tab-content">
        {pestana === 'inventario' && (
          <div className="layout-grid">
            <FormularioProducto alTerminar={refrescarInventario} />
            <ListaInventario trigger={actualizador} esAdmin={esAdmin} />
          </div>
        )}

        {pestana === 'ventas' && (
          <SeccionVentas 
            alTerminar={refrescarInventario} 
            sesion={sesion} 
          />
        )}

        {/* 3. Renderizado de la Sección de Gastos */}
        {pestana === 'gastos' && (
          <SeccionGastos 
            sesion={sesion} 
            alTerminar={() => {
              // Si quieres que pase algo al cargar un gasto, como volver a ventas:
              // setPestana('ventas'); 
            }}
          />
        )}
        
        {pestana === 'historial' && esAdmin && <HistorialVentas />}
      </div>
    </div>
  );
}

export default App;