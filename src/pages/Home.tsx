import { useState, useEffect } from 'react';
import Hero from '../components/Hero';
import CreatorCard from '../components/CreatorCard';

interface Creator {
  _id: string;
  username: string;
  avatar: string;
  description: string;
}

function Home() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const BASE_URL = 'https://studently-backend.onrender.com';

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
    <div className="container mx-auto p-4">
      <Hero />
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
  );
}

export default Home;