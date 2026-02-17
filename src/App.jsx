import { useState } from 'react';
import './styles/App.css';
import FormularioProducto from './components/FormularioProducto';
import ListaInventario from './components/ListaInventario';
import SeccionVentas from './components/SeccionVentas';
import HistorialVentas from './components/HistorialVentas';

function App() {
  const [pestana, setPestana] = useState('inventario');

  return (
    <div className="dashboard-main">
      <h1>Kids Fashion Admin 👕</h1>
      
      <nav className="tabs-nav">
        <button onClick={() => setPestana('inventario')}>Inventario</button>
        <button onClick={() => setPestana('ventas')}>Ventas</button>
        <button onClick={() => setPestana('historial')}>Historial</button>
      </nav>

      <div className="tab-content">
        {pestana === 'inventario' && (
          <div className="layout-grid">
            <FormularioProducto />
            <ListaInventario />
          </div>
        )}

        {pestana === 'ventas' && <SeccionVentas />}
        
        {pestana === 'historial' && <HistorialVentas />}
      </div>
    </div>
  );
}

export default App;