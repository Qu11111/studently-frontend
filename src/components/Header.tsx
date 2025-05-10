import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCoins, FaComment, FaClipboardList, FaTimes } from 'react-icons/fa';
import Chat from './Chat';

interface User {
  avatar: string;
  credits: number;
}

interface Subscription {
  _id: string;
  name: string;
  price: number;
  image: string;
  description: string;
  creatorId: {
    _id: string;
    username: string;
    avatar: string;
  };
}

function Header() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [showSubscriptionsModal, setShowSubscriptionsModal] = useState(false);
  const [purchasedSubscriptions, setPurchasedSubscriptions] = useState<Subscription[]>([]);
  const BASE_URL = 'https://studently-backend.onrender.com';

  // Проверка токена и загрузка пользователя
  const fetchUser = async (token: string | null) => {
    if (!token) {
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('token');
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(`Ошибка HTTP: ${response.status}`);
      const userData = await response.json();
      if (userData.error) throw new Error(userData.error);
      setUser({ avatar: userData.avatar, credits: userData.credits });
      setIsAuthenticated(true);
    } catch (err: any) {
      console.error('Ошибка загрузки пользователя:', err.message);
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('token');
    }
  };

  // Загрузка купленных подписок
  const fetchPurchasedSubscriptions = async (token: string) => {
    try {
      const response = await fetch(`${BASE_URL}/api/subscriptions/purchased`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(`Ошибка HTTP: ${response.status}`);
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setPurchasedSubscriptions(data);
    } catch (err: any) {
      console.error('Ошибка загрузки подписок:', err.message);
    }
  };

  // Инициализация
  useEffect(() => {
    const token = localStorage.getItem('token');
    fetchUser(token);
    if (token) fetchPurchasedSubscriptions(token);
  }, []);

  // Отслеживание изменений localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      const token = localStorage.getItem('token');
      fetchUser(token);
      if (token) fetchPurchasedSubscriptions(token);
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <header className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-4">
      <div className="container mx-auto flex justify-between items-center">
        <button
          onClick={() => navigate(isAuthenticated ? '/dashboard' : '/welcome')}
          className="text-3xl font-bold hover:text-gray-300"
        >
          studently
        </button>
        <nav>
          <ul className="flex space-x-4 items-center">
            {!isAuthenticated ? (
              <>
                <li>
                  <button
                    onClick={() => navigate('/login')}
                    className="hover:text-gray-300"
                  >
                    Войти
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => navigate('/signup')}
                    className="hover:text-gray-300"
                  >
                    Зарегистрироваться
                  </button>
                </li>
              </>
            ) : (
              <li className="flex items-center space-x-3">
                <button
                  onClick={() => setShowChatModal(true)}
                  className="p-2 rounded hover:bg-blue-600"
                  title="Чат"
                >
                  <FaComment className="w-6 h-6" />
                </button>
                <button
                  onClick={() => setShowSubscriptionsModal(true)}
                  className="p-2 rounded hover:bg-blue-600"
                  title="Подписки"
                >
                  <FaClipboardList className="w-6 h-6" />
                </button>
                <button onClick={() => navigate('/profile')}>
                  <img
                    src={
                      user?.avatar?.startsWith('/uploads')
                        ? `${BASE_URL}${user.avatar}`
                        : user?.avatar || 'https://via.placeholder.com/150'
                    }
                    alt="Аватар"
                    className="w-12 h-12 rounded-full border-2 border-white hover:border-gray-300 sm:w-10 sm:h-10"
                  />
                </button>
                {user && (
                  <div className="flex items-center bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold text-sm px-3 py-1 rounded-full shadow-md ml-2 sm:text-xs sm:px-2 sm:py-0.5">
                    <FaCoins className="w-4 h-4 mr-1 sm:w-3 sm:h-3" />
                    {user.credits}
                  </div>
                )}
              </li>
            )}
          </ul>
        </nav>
      </div>
      {/* Модалка чата */}
      {showChatModal && <Chat onClose={() => setShowChatModal(false)} initialUserId={undefined} />}
      {/* Модалка подписок */}
      {showSubscriptionsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] p-6 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">Мои подписки</h3>
              <button
                onClick={() => setShowSubscriptionsModal(false)}
                className="text-gray-800 hover:text-gray-600"
              >
                <FaTimes className="w-6 h-6" />
              </button>
            </div>
            {purchasedSubscriptions.length > 0 ? (
              <div className="space-y-4">
                {purchasedSubscriptions.map((sub) => (
                  <div key={sub._id} className="flex items-center space-x-4 border-b pb-4">
                    <img
                      src={
                        sub.creatorId.avatar.startsWith('/uploads')
                          ? `${BASE_URL}${sub.creatorId.avatar}`
                          : sub.creatorId.avatar || 'https://via.placeholder.com/150'
                      }
                      alt="Аватар автора"
                      className="w-12 h-12 rounded-full cursor-pointer sm:w-10 sm:h-10"
                      onClick={() => {
                        setShowSubscriptionsModal(false);
                        navigate(`/profile/${sub.creatorId._id}`);
                      }}
                    />
                    <div className="flex-grow">
                      <p
                        className="font-semibold cursor-pointer hover:underline sm:text-sm text-black"
                        onClick={() => {
                          setShowSubscriptionsModal(false);
                          navigate(`/profile/${sub.creatorId._id}`);
                        }}
                      >
                        {sub.creatorId.username}
                      </p>
                      <p className="text-gray-600 sm:text-sm">{sub.name}</p>
                      <p className="text-gray-600 sm:text-sm">{sub.price} кредитов</p>
                    </div>
                    <img
                      src={sub.image.startsWith('/uploads') ? `${BASE_URL}${sub.image}` : sub.image}
                      alt={sub.name}
                      className="w-16 h-16 rounded object-cover sm:w-12 sm:h-12"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 sm:text-sm">Нет активных подписок</p>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export default Header;