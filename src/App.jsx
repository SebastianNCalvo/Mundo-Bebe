import FormularioProducto from './components/FormularioProducto';
import ListaInventario from './components/ListaInventario';

function App() {
  return (
    <div style={{ backgroundColor: '#f0f2f5', minHeight: '100vh', padding: '20px' }}>
      <h1 style={{ textAlign: 'center', color: '#2c3e50' }}>Dashboard Kids Fashion</h1>
      <FormularioProducto />
      <ListaInventario />
    </div>
  );
}

export default App;