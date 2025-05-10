import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Profile from './pages/Profile';
import Welcome from './pages/Welcome';
import Dashboard from './pages/Dashboard';
import Category from './pages/Category';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));

  // Синхронизация isAuthenticated с localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      setIsAuthenticated(!!localStorage.getItem('token'));
    };

    window.addEventListener('storage', handleStorageChange);
    handleStorageChange();
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <Router>
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Welcome />} />
            <Route path="/welcome" element={<Welcome />} />
            <Route
              path="/dashboard"
              element={isAuthenticated ? <Dashboard /> : <Navigate to="/welcome" replace />}
            />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route
              path="/profile"
              element={isAuthenticated ? <Profile /> : <Navigate to="/welcome" replace />}
            />
            <Route
              path="/profile/:userId"
              element={isAuthenticated ? <Profile /> : <Navigate to="/welcome" replace />}
            />
            <Route
              path="/category/:type"
              element={isAuthenticated ? <Category /> : <Navigate to="/welcome" replace />}
            />
            <Route path="*" element={<Navigate to={isAuthenticated ? '/dashboard' : '/welcome'} replace />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;