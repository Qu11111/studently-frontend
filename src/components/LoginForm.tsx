import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleLogin = async () => {
    if (!validateEmail(email)) {
      setError('Пожалуйста, введите корректный email');
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (data.error) {
        setError(data.error);
      } else {
        localStorage.setItem('token', data.token);
        navigate('/profile');
      }
    } catch (err: any) {
      setError('Ошибка сервера');
    }
  };

  return (
    <div className="max-w-md w-full bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Вход</h2>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full p-2 mb-4 border rounded"
      />
      <input
        type="password"
        placeholder="Пароль"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full p-2 mb-4 border rounded"
      />
      <button
        onClick={handleLogin}
        className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
      >
        Войти
      </button>
    </div>
  );
}

export default LoginForm;