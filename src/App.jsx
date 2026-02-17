import './styles/App.css'; // <--- Verifica que este archivo exista
import FormularioProducto from './components/FormularioProducto';
import ListaInventario from './components/ListaInventario';
import SeccionVentas from './components/SeccionVentas';

function App() {
  return (
    <div className="dashboard-main">
      <h1>Mundo bebé 👕</h1>
      
      <div className="layout-grid">
        <aside>
          <SeccionVentas />
          <FormularioProducto />
        </aside>
        
        <main>
          <ListaInventario />
        </main>
      </div>
    </div>
  );
}

export default App;