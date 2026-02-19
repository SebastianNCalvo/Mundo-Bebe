import { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const manejarLogin = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) alert("Error: " + error.message);
  };

  return (
    <div className="login-container">
      <form onSubmit={manejarLogin} className="login-form">
        <h2>Mundo Bebé Admin 🔒</h2>
        <input 
          type="email" 
          placeholder="Tu correo" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          required 
        />
        <input 
          type="password" 
          placeholder="Tu contraseña" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          required 
        />
        <button type="submit">Entrar al Sistema</button>
      </form>
    </div>
  );
}