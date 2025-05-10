import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import CreatorCard from '../components/CreatorCard';

interface Creator {
  _id: string;
  username: string;
  avatar: string;
  description: string;
}

function Welcome() {
  const navigate = useNavigate();
  const [creators, setCreators] = useState<Creator[]>([]);
  const BASE_URL = 'http://localhost:5000';

  // Загрузка случайных создателей
  const fetchRandomCreators = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/users/random`);
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setCreators(data);
    } catch (err) {
      console.error('Ошибка загрузки создателей:', err);
    }
  };

  // Загрузка при монтировании и периодическое обновление
  useEffect(() => {
    fetchRandomCreators();
    const interval = setInterval(fetchRandomCreators, 30000); // Обновление каждые 30 секунд
    return () => clearInterval(interval); // Очистка интервала при размонтировании
  }, []);

  return (
    <div>
      {/* Градиентное окно на всю ширину */}
      <div className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-16">
        <div className="container mx-auto text-center">
          <h1 className="text-5xl font-bold mb-6">Добро пожаловать в studently!</h1>
          <p className="text-xl mb-8">Присоединяйтесь к сообществу, где вы можете поддерживать создателей и делиться своим творчеством.</p>
          <div className="flex justify-center gap-4">
            <button
              className="bg-white text-blue-600 font-semibold py-2 px-4 rounded hover:bg-gray-100"
              onClick={() => navigate('/signup')}
            >
              Начать
            </button>
          </div>
        </div>
      </div>
      {/* Секция с создателями */}
      <div className="container mx-auto">
        <section className="my-8">
          <h2 className="text-2xl font-bold mb-4 text-center">Случайные создатели</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {creators.length > 0 ? (
              creators.map((creator) => (
                <CreatorCard
                  key={creator._id}
                  id={creator._id}
                  username={creator.username}
                  avatar={creator.avatar}
                  description={creator.description}
                />
              ))
            ) : (
              <p className="text-gray-600 text-center">Загрузка создателей...</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default Welcome;