import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCoins } from 'react-icons/fa';

interface User {
  username: string;
  email: string;
  description: string;
  credits: number;
}

interface SubscriptionLevel {
  _id: string;
  name: string;
  price: number;
  image: string;
  description: string;
}

interface SettingsProps {
  user: User;
  onUpdate: (data: { username?: string; email?: string; description?: string; avatar?: string; cover?: string; credits?: number }) => void;
  onSubscriptionUpdate?: (subscription: SubscriptionLevel | string, action: 'add' | 'update' | 'delete') => void;
}

function Settings({ user, onUpdate, onSubscriptionUpdate }: SettingsProps) {
  const navigate = useNavigate();
  const [username, setUsername] = useState(user.username);
  const [email, setEmail] = useState(user.email);
  const [description, setDescription] = useState(user.description);
  const [credits, setCredits] = useState(user.credits);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [subscriptionName, setSubscriptionName] = useState('');
  const [subscriptionPrice, setSubscriptionPrice] = useState('');
  const [subscriptionDescription, setSubscriptionDescription] = useState('');
  const [subscriptionImage, setSubscriptionImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [nameError, setNameError] = useState('');
  const [priceError, setPriceError] = useState('');
  const [descriptionError, setDescriptionError] = useState('');
  const [imageError, setImageError] = useState('');
  const [error, setError] = useState('');
  const [subscriptions, setSubscriptions] = useState<SubscriptionLevel[]>([]);
  const [editingSubscription, setEditingSubscription] = useState<SubscriptionLevel | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editImage, setEditImage] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [editNameError, setEditNameError] = useState('');
  const [editPriceError, setEditPriceError] = useState('');
  const [editDescriptionError, setEditDescriptionError] = useState('');

  const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // Загрузка подписок
  useEffect(() => {
    const fetchSubscriptions = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Пожалуйста, войдите в систему');
        return;
      }

      try {
        const response = await fetch(`${BASE_URL}/api/subscriptions`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error(`Ошибка HTTP: ${response.status}`);
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        setSubscriptions(data);
      } catch (err: any) {
        console.log('Fetch subscriptions error:', err.message);
        setError(err.message);
      }
    };

    fetchSubscriptions();
  }, []);

  // Обновление баланса при изменении localStorage
  useEffect(() => {
    const handleStorageChange = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const response = await fetch(`${BASE_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error(`Ошибка HTTP: ${response.status}`);
        const userData = await response.json();
        if (userData.error) throw new Error(userData.error);
        setCredits(userData.credits);
        onUpdate({ credits: userData.credits });
      } catch (err: any) {
        console.error('Ошибка обновления баланса:', err.message);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [onUpdate]);

  // Обработка выбора картинки для создания
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSubscriptionImage(file);
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    } else {
      setImagePreview(null);
    }
  };

  // Обработка выбора картинки для редактирования
  const handleEditImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setEditImage(file);
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setEditImagePreview(previewUrl);
    } else {
      setEditImagePreview(null);
    }
  };

  // Валидация формы создания подписки
  const validateSubscriptionForm = () => {
    let isValid = true;
    setNameError('');
    setPriceError('');
    setDescriptionError('');
    setImageError('');

    if (!subscriptionName.trim()) {
      setNameError('Название обязательно');
      isValid = false;
    }
    if (!subscriptionPrice || parseFloat(subscriptionPrice) <= 0) {
      setPriceError('Цена должна быть больше 0');
      isValid = false;
    }
    if (!subscriptionDescription.trim()) {
      setDescriptionError('Описание обязательно');
      isValid = false;
    }
    if (!subscriptionImage) {
      setImageError('Картинка обязательна');
      isValid = false;
    }

    return isValid;
  };

  // Валидация формы редактирования подписки
  const validateEditSubscriptionForm = () => {
    let isValid = true;
    setEditNameError('');
    setEditPriceError('');
    setEditDescriptionError('');

    if (!editName.trim()) {
      setEditNameError('Название обязательно');
      isValid = false;
    }
    if (!editPrice || parseFloat(editPrice) <= 0) {
      setEditPriceError('Цена должна быть больше 0');
      isValid = false;
    }
    if (!editDescription.trim()) {
      setEditDescriptionError('Описание обязательно');
      isValid = false;
    }

    return isValid;
  };

  // Обновление профиля (текстовые данные)
  const handleUpdateProfile = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Пожалуйста, войдите в систему');
      return;
    }

    if (!username.trim() && !email.trim() && !description) {
      setError('Заполните хотя бы одно поле');
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/api/auth/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: username.trim() || undefined,
          email: email.trim() || undefined,
          description: description || undefined,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Ошибка HTTP: ${response.status}`);
      }
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      onUpdate({ username: data.user.username, email: data.user.email, description: data.user.description });
      setError('');
    } catch (err: any) {
      console.error('Update profile error:', err.message);
      setError(err.message || 'Ошибка обновления профиля');
    }
  };

  // Загрузка аватара
  const handleUploadAvatar = async () => {
    if (!avatar) return;

    const token = localStorage.getItem('token');
    if (!token) {
      setError('Пожалуйста, войдите в систему');
      return;
    }

    const formData = new FormData();
    formData.append('avatar', avatar);

    try {
      const response = await fetch(`${BASE_URL}/api/upload/avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Ошибка HTTP: ${response.status}`);
      }
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      onUpdate({ avatar: data.avatar });
      setAvatar(null);
      setError('');
    } catch (err: any) {
      console.error('Upload avatar error:', err.message);
      setError(err.message || 'Ошибка загрузки аватарки');
    }
  };

  // Загрузка обложки
  const handleUploadCover = async () => {
    if (!cover) return;

    const token = localStorage.getItem('token');
    if (!token) {
      setError('Пожалуйста, войдите в систему');
      return;
    }

    const formData = new FormData();
    formData.append('cover', cover);

    try {
      const response = await fetch(`${BASE_URL}/api/upload/cover`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Ошибка HTTP: ${response.status}`);
      }
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      onUpdate({ cover: data.cover });
      setCover(null);
      setError('');
    } catch (err: any) {
      console.error('Upload cover error:', err.message);
      setError(err.message || 'Ошибка загрузки обложки');
    }
  };

  // Обработчик сохранения профиля
  const handleSaveProfile = async () => {
    try {
      await handleUpdateProfile();
      if (avatar) await handleUploadAvatar();
      if (cover) await handleUploadCover();
    } catch (err: any) {
      console.error('Save profile error:', err.message);
      setError(err.message || 'Ошибка сохранения профиля');
    }
  };

  // Создание подписки
  const handleCreateSubscription = async () => {
    if (!validateSubscriptionForm()) {
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setError('Пожалуйста, войдите в систему');
      return;
    }

    const formData = new FormData();
    formData.append('name', subscriptionName);
    formData.append('price', subscriptionPrice);
    formData.append('description', subscriptionDescription);
    if (subscriptionImage) formData.append('image', subscriptionImage);

    try {
      const response = await fetch(`${BASE_URL}/api/subscriptions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Ошибка HTTP: ${response.status}`);
      }
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setSubscriptions((prev) => [...prev, data.subscriptionLevel]);
      onSubscriptionUpdate?.(data.subscriptionLevel, 'add');
      setSubscriptionName('');
      setSubscriptionPrice('');
      setSubscriptionDescription('');
      setSubscriptionImage(null);
      setImagePreview(null);
      setError('');
    } catch (err: any) {
      console.error('Create subscription error:', err.message);
      setError(err.message || 'Ошибка создания подписки');
    }
  };

  // Редактирование подписки
  const handleEditSubscription = async (id: string) => {
    if (!validateEditSubscriptionForm()) {
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setError('Пожалуйста, войдите в систему');
      return;
    }

    const formData = new FormData();
    formData.append('name', editName);
    formData.append('price', editPrice);
    formData.append('description', editDescription);
    if (editImage) formData.append('image', editImage);

    try {
      const response = await fetch(`${BASE_URL}/api/subscriptions/${id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Ошибка HTTP: ${response.status}`);
      }
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setSubscriptions((prev) =>
        prev.map((sub) => (sub._id === id ? data.subscriptionLevel : sub))
      );
      onSubscriptionUpdate?.(data.subscriptionLevel, 'update');
      setEditingSubscription(null);
      setEditName('');
      setEditPrice('');
      setEditDescription('');
      setEditImage(null);
      setEditImagePreview(null);
      setError('');
    } catch (err: any) {
      console.error('Edit subscription error:', err.message);
      setError(err.message || 'Ошибка редактирования подписки');
    }
  };

  // Удаление подписки
  const handleDeleteSubscription = async (id: string) => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Пожалуйста, войдите в систему');
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/api/subscriptions/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Ошибка HTTP: ${response.status}`);
      }
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setSubscriptions((prev) => prev.filter((sub) => sub._id !== id));
      onSubscriptionUpdate?.(id, 'delete');
      setError('');
    } catch (err: any) {
      console.error('Delete subscription error:', err.message);
      setError(err.message || 'Ошибка удаления подписки');
    }
  };

  // Выход из аккаунта
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    window.dispatchEvent(new Event('storage')); // Уведомляем Header.tsx
    navigate('/welcome');
  };

  return (
    <div className="bg-gray-100 p-4 rounded-lg mb-8">
      <h3 className="text-lg font-bold mb-4">Настройки профиля</h3>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <div className="flex items-center mb-4">
        <FaCoins className="w-6 h-6 text-yellow-500 mr-2" />
        <p className="text-gray-700">Текущий баланс: {credits} кредитов</p>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-gray-700">Имя пользователя</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>
        <div>
          <label className="block text-gray-700">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>
        <div>
          <label className="block text-gray-700">Описание</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>
        <div>
          <label className="block text-gray-700">Аватар</label>
          <input
            type="file"
            accept="image/jpeg,image/png"
            onChange={(e) => setAvatar(e.target.files?.[0] || null)}
            className="w-full p-2"
          />
        </div>
        <div>
          <label className="block text-gray-700">Обложка</label>
          <input
            type="file"
            accept="image/jpeg,image/png"
            onChange={(e) => setCover(e.target.files?.[0] || null)}
            className="w-full p-2"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSaveProfile}
            className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
          >
            Сохранить профиль
          </button>
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white p-2 rounded hover:bg-red-600"
          >
            Выйти
          </button>
        </div>
      </div>
      <h3 className="text-lg font-bold mt-8 mb-4">Создать подписку</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-gray-700">Название подписки</label>
          <input
            type="text"
            value={subscriptionName}
            onChange={(e) => setSubscriptionName(e.target.value)}
            className={`w-full p-2 border rounded ${nameError ? 'border-red-500' : ''}`}
          />
          {nameError && <p className="text-red-500 mt-1">{nameError}</p>}
        </div>
        <div>
          <label className="block text-gray-700">Цена (кредитов)</label>
          <input
            type="number"
            value={subscriptionPrice}
            onChange={(e) => setSubscriptionPrice(e.target.value)}
            className={`w-full p-2 border rounded ${priceError ? 'border-red-500' : ''}`}
          />
          {priceError && <p className="text-red-500 mt-1">{priceError}</p>}
        </div>
        <div>
          <label className="block text-gray-700">Описание</label>
          <textarea
            value={subscriptionDescription}
            onChange={(e) => setSubscriptionDescription(e.target.value)}
            className={`w-full p-2 border rounded ${descriptionError ? 'border-red-500' : ''}`}
          />
          {descriptionError && <p className="text-red-500 mt-1">{descriptionError}</p>}
        </div>
        <div>
          <label className="block text-gray-700">Картинка</label>
          <input
            type="file"
            accept="image/jpeg,image/png"
            onChange={handleImageChange}
            className={`w-full p-2 ${imageError ? 'border-red-500' : ''}`}
          />
          {imageError && <p className="text-red-500 mt-1">{imageError}</p>}
          {imagePreview && (
            <img
              src={imagePreview}
              alt="Предпросмотр подписки"
              className="mt-2 w-16 h-16 rounded object-cover"
            />
          )}
        </div>
        <button
          onClick={handleCreateSubscription}
          className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
        >
          Создать подписку
        </button>
      </div>
      <h3 className="text-lg font-bold mt-8 mb-4">Редактировать подписки</h3>
      {subscriptions.length === 0 ? (
        <p className="text-gray-600">Подписки отсутствуют</p>
      ) : (
        <div className="space-y-4">
          {subscriptions.map((sub) => (
            <div key={sub._id} className="border p-4 rounded-lg">
              {editingSubscription?._id === sub._id ? (
                <>
                  <div>
                    <label className="block text-gray-700">Название</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className={`w-full p-2 border rounded ${editNameError ? 'border-red-500' : ''}`}
                    />
                    {editNameError && <p className="text-red-500 mt-1">{editNameError}</p>}
                  </div>
                  <div>
                    <label className="block text-gray-700">Цена (кредитов)</label>
                    <input
                      type="number"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      className={`w-full p-2 border rounded ${editPriceError ? 'border-red-500' : ''}`}
                    />
                    {editPriceError && <p className="text-red-500 mt-1">{editPriceError}</p>}
                  </div>
                  <div>
                    <label className="block text-gray-700">Описание</label>
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className={`w-full p-2 border rounded ${editDescriptionError ? 'border-red-500' : ''}`}
                    />
                    {editDescriptionError && <p className="text-red-500 mt-1">{editDescriptionError}</p>}
                  </div>
                  <div>
                    <label className="block text-gray-700">Картинка</label>
                    <input
                      type="file"
                      accept="image/jpeg,image/png"
                      onChange={handleEditImageChange}
                      className="w-full p-2"
                    />
                    {editImagePreview && (
                      <img
                        src={editImagePreview}
                        alt="Предпросмотр редактируемой подписки"
                        className="mt-2 w-16 h-16 rounded object-cover"
                      />
                    )}
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => handleEditSubscription(sub._id)}
                      className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
                    >
                      Сохранить
                    </button>
                    <button
                      onClick={() => setEditingSubscription(null)}
                      className="bg-gray-500 text-white p-2 rounded hover:bg-gray-600"
                    >
                      Отмена
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="font-semibold">{sub.name}</p>
                  <p className="text-gray-600">{sub.price} кредитов</p>
                  <p className="text-gray-600">{sub.description}</p>
                  <img
                    src={sub.image.startsWith('/uploads') ? `${BASE_URL}${sub.image}` : sub.image}
                    alt={sub.name}
                    className="w-16 h-16 rounded object-cover mt-2"
                  />
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => {
                        setEditingSubscription(sub);
                        setEditName(sub.name);
                        setEditPrice(sub.price.toString());
                        setEditDescription(sub.description);
                        setEditImage(null);
                        setEditImagePreview(sub.image);
                      }}
                      className="bg-yellow-500 text-white p-2 rounded hover:bg-yellow-600"
                    >
                      Редактировать
                    </button>
                    <button
                      onClick={() => handleDeleteSubscription(sub._id)}
                      className="bg-red-500 text-white p-2 rounded hover:bg-red-600"
                    >
                      Удалить
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Settings;