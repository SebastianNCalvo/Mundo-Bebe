import './styles/App.css';
import FormularioProducto from './components/FormularioProducto';
import ListaInventario from './components/ListaInventario';
import SeccionVentas from './components/SeccionVentas';
import HistorialVentas from './components/HistorialVentas';
import { useState } from 'react';

function App() {
  const [pestana, setPestana] = useState('inventario');
  const [actualizador, setActualizador] = useState(0);
  const refrescarInventario = () => {
    setActualizador(prev => prev + 1);
  };

  return (
    <div className="dashboard-main">
      <h1>Mundo Bebé</h1>
      
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