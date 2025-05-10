import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FaHeart, FaPaperPlane, FaEdit, FaTrash, FaComment, FaTimes } from 'react-icons/fa';
import Settings from '../components/Settings';
import Chat from '../components/Chat';

interface User {
  _id: string;
  username: string;
  email: string;
  description: string;
  avatar: string;
  cover: string;
  credits: number;
  purchasedSubscriptions: { _id: string; name: string; price: number }[];
}

interface SubscriptionLevel {
  _id: string;
  name: string;
  price: number;
  image: string;
  description: string;
}

interface Post {
  _id: string;
  title: string;
  content: string;
  createdAt: string;
  subscriptionLevel: SubscriptionLevel | null;
  media: string[];
  likes: string[];
  userId: User;
}

interface Comment {
  _id: string;
  content: string;
  userId: User;
  createdAt: string;
}

function Profile() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [subscriptionLevels, setSubscriptionLevels] = useState<SubscriptionLevel[]>([]);
  const [selectedSubscription, setSelectedSubscription] = useState<SubscriptionLevel | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<{ url: string; type: string }[]>([]);
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [editPost, setEditPost] = useState<Post | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<{ [postId: string]: Comment[] }>({});
  const [error, setError] = useState('');
  const [titleError, setTitleError] = useState('');
  const [contentError, setContentError] = useState('');
  const [loading, setLoading] = useState(true);

  const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  const isOwnProfile = !userId || (currentUser && userId === currentUser._id);

  // Загрузка данных
  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Пожалуйста, войдите в систему');
        setLoading(false);
        return;
      }

      try {
        // Получение текущего пользователя
        const currentUserResponse = await fetch(`${BASE_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!currentUserResponse.ok) throw new Error(`Ошибка HTTP: ${currentUserResponse.status}`);
        const currentUserData = await currentUserResponse.json();
        if (currentUserData.error) throw new Error(currentUserData.error);
        setCurrentUser(currentUserData);

        // Получение данных профиля
        const profileUserId = userId || currentUserData._id;
        const profileUserResponse = await fetch(`${BASE_URL}/api/users/${profileUserId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!profileUserResponse.ok) throw new Error(`Ошибка HTTP: ${profileUserResponse.status}`);
        const profileUserData = await profileUserResponse.json();
        if (profileUserData.error) throw new Error(profileUserData.error);
        setProfileUser(profileUserData);

        // Получение постов
        const postsResponse = await fetch(`${BASE_URL}/api/users/${profileUserId}/posts`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!postsResponse.ok) throw new Error(`Ошибка HTTP: ${postsResponse.status}`);
        const postsData = await postsResponse.json();
        if (postsData.error) throw new Error(postsData.error);
        setPosts(postsData);

        // Получение подписок
        const subscriptionsResponse = await fetch(`${BASE_URL}/api/users/${profileUserId}/subscriptions`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!subscriptionsResponse.ok) throw new Error(`Ошибка HTTP: ${subscriptionsResponse.status}`);
        const subscriptionsData = await subscriptionsResponse.json();
        if (subscriptionsData.error) throw new Error(subscriptionsData.error);
        setSubscriptionLevels(subscriptionsData.sort((a: SubscriptionLevel, b: SubscriptionLevel) => b.price - a.price));

        // Получение комментариев
        const commentsData: { [postId: string]: Comment[] } = {};
        for (const post of postsData) {
          const commentsResponse = await fetch(`${BASE_URL}/api/posts/${post._id}/comments`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!commentsResponse.ok) throw new Error(`Ошибка HTTP: ${commentsResponse.status}`);
          const postComments = await commentsResponse.json();
          commentsData[post._id] = postComments;
        }
        setComments(commentsData);
      } catch (err: any) {
        console.log('Fetch profile data error:', err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  // Обработка изменения медиа
  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setMediaFiles(files);
    const previews = files.map((file) => ({
      url: URL.createObjectURL(file),
      type: file.type,
    }));
    setMediaPreviews(previews);
  };

  // Валидация поста
  const validatePost = (isEditing: boolean) => {
    let isValid = true;
    setTitleError('');
    setContentError('');

    const checkTitle = isEditing ? editPost?.title : title;
    const checkContent = isEditing ? editPost?.content : content;

    if (!checkTitle?.trim()) {
      setTitleError('Заголовок обязателен');
      isValid = false;
    }
    if (!checkContent?.trim()) {
      setContentError('Содержание обязательно');
      isValid = false;
    }

    return isValid;
  };

  // Создание поста
  const handleCreatePost = async () => {
    if (!validatePost(false)) {
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setError('Пожалуйста, войдите в систему');
      return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('content', content);
    if (selectedLevel) {
      formData.append('subscriptionLevel', selectedLevel);
    }
    mediaFiles.forEach((file) => {
      formData.append('media', file);
    });

    try {
      const response = await fetch(`${BASE_URL}/api/posts`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!response.ok) throw new Error(`Ошибка HTTP: ${response.status}`);
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setPosts([data.post, ...posts]);
      setShowCreatePostModal(false);
      setTitle('');
      setContent('');
      setSelectedLevel('');
      setMediaFiles([]);
      setMediaPreviews([]);
      setTitleError('');
      setContentError('');
      setError('');
    } catch (err: any) {
      console.log('Create post error:', err.message);
      setError(err.message);
    }
  };

  // Редактирование поста
  const handleEditPost = async () => {
    if (!editPost || !validatePost(true)) {
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setError('Пожалуйста, войдите в систему');
      return;
    }

    const formData = new FormData();
    formData.append('title', editPost.title);
    formData.append('content', editPost.content);
    formData.append('subscriptionLevel', selectedLevel || '');
    mediaFiles.forEach((file) => {
      formData.append('media', file);
    });

    try {
      const response = await fetch(`${BASE_URL}/api/posts/${editPost._id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!response.ok) throw new Error(`Ошибка HTTP: ${response.status}`);
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setPosts(posts.map((post) => (post._id === editPost._id ? data.post : post)));
      setEditPost(null);
      setSelectedLevel('');
      setMediaFiles([]);
      setMediaPreviews([]);
      setTitleError('');
      setContentError('');
      setError('');
    } catch (err: any) {
      console.log('Edit post error:', err.message);
      setError(err.message);
    }
  };

  // Удаление поста
  const handleDeletePost = async (postId: string) => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Пожалуйста, войдите в систему');
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/api/posts/${postId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(`Ошибка HTTP: ${response.status}`);
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setPosts(posts.filter((post) => post._id !== postId));
      setError('');
    } catch (err: any) {
      console.log('Delete post error:', err.message);
      setError(err.message);
    }
  };

  // Добавление комментария
  const handleAddComment = async (postId: string) => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Пожалуйста, войдите в систему');
      return;
    }
    if (!newComment.trim()) {
      setError('Комментарий не может быть пустым');
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/api/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: newComment, postId }),
      });
      if (!response.ok) throw new Error(`Ошибка HTTP: ${response.status}`);
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setComments((prev) => ({
        ...prev,
        [postId]: [data.comment, ...(prev[postId] || [])],
      }));
      setNewComment('');
      setError('');
    } catch (err: any) {
      console.log('Add comment error:', err.message);
      setError(err.message);
    }
  };

  // Лайк/анлайк поста
  const handleLikePost = async (postId: string) => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Пожалуйста, войдите в систему');
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/api/posts/${postId}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(`Ошибка HTTP: ${response.status}`);
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setPosts(posts.map((post) => (post._id === postId ? { ...post, likes: data.likes } : post)));
      if (selectedPost && selectedPost._id === postId) {
        setSelectedPost((prev) => (prev ? { ...prev, likes: data.likes } : null));
      }
    } catch (err: any) {
      console.log('Like post error:', err.message);
      setError(err.message);
    }
  };

  // Обновление данных пользователя
  const handleUpdateUser = (data: { username?: string; email?: string; description?: string; avatar?: string; cover?: string; credits?: number }) => {
    setCurrentUser((prev) => (prev ? { ...prev, ...data } : null));
    setProfileUser((prev) => (prev ? { ...prev, ...data } : null));
  };

  // Обновление списка подписок
  const handleSubscriptionUpdate = (subscription: SubscriptionLevel | string, action: 'add' | 'update' | 'delete') => {
    if (action === 'add') {
      setSubscriptionLevels((prev) => [...prev, subscription as SubscriptionLevel].sort((a, b) => b.price - a.price));
    } else if (action === 'update') {
      setSubscriptionLevels((prev) =>
        prev.map((sub) => (sub._id === (subscription as SubscriptionLevel)._id ? subscription as SubscriptionLevel : sub)).sort((a, b) => b.price - a.price)
      );
    } else if (action === 'delete') {
      setSubscriptionLevels((prev) => prev.filter((sub) => sub._id !== subscription).sort((a, b) => b.price - a.price));
    }
  };

  // Покупка подписки
  const handleBuySubscription = async () => {
    if (!selectedSubscription) return;

    const token = localStorage.getItem('token');
    if (!token) {
      setError('Пожалуйста, войдите в систему');
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/api/subscriptions/${selectedSubscription._id}/purchase`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(`Ошибка HTTP: ${response.status}`);
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setCurrentUser(data.user);
      setProfileUser((prev) => (prev ? { ...prev, purchasedSubscriptions: data.user.purchasedSubscriptions, credits: data.user.credits } : null));
      window.dispatchEvent(new Event('storage'));
      setShowSubscriptionModal(false);
      setError('');
    } catch (err: any) {
      console.log('Buy subscription error:', err.message);
      setError(err.message);
    }
  };

  // Проверка, куплена ли подписка
  const isSubscriptionPurchased = (subscriptionId: string) => {
    return currentUser?.purchasedSubscriptions?.some((sub) => sub._id === subscriptionId) || false;
  };

  // Проверка доступа к посту
  const hasPostAccess = (post: Post) => {
    if (!post.subscriptionLevel) return true;
    if (currentUser && post.userId._id === currentUser._id) return true;
    return isSubscriptionPurchased(post.subscriptionLevel._id);
  };

  if (loading) return <div className="container mx-auto p-4">Загрузка...</div>;

  return (
    <div className="container mx-auto p-4">
      <div
        className="relative h-48 bg-cover bg-center rounded-lg mb-8"
        style={{
          backgroundImage: `url(${
            profileUser?.cover.startsWith('/uploads')
              ? `${BASE_URL}${profileUser.cover}`
              : profileUser?.cover || 'https://via.placeholder.com/1200x300'
          })`,
        }}
      >
        <div className="absolute -bottom-16 left-8">
          <img
            src={
              profileUser?.avatar.startsWith('/uploads')
                ? `${BASE_URL}${profileUser.avatar}`
                : profileUser?.avatar || 'https://via.placeholder.com/150'
            }
            alt="Аватар"
            className="w-32 h-32 rounded-full border-4 border-white shadow-lg cursor-pointer"
            onClick={() => setShowAvatarModal(true)}
          />
        </div>
      </div>

      {showAvatarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg max-w-3xl">
            <img
              src={
                profileUser?.avatar.startsWith('/uploads')
                  ? `${BASE_URL}${profileUser.avatar}`
                  : profileUser?.avatar || 'https://via.placeholder.com/150'
              }
              alt="Увеличенный аватар"
              className="max-w-full max-h-[80vh] rounded"
            />
            <button
              onClick={() => setShowAvatarModal(false)}
              className="mt-4 bg-red-500 text-white p-2 rounded hover:bg-red-600"
            >
              Закрыть
            </button>
          </div>
        </div>
      )}

      {showSubscriptionModal && selectedSubscription && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <img
              src={
                selectedSubscription.image.startsWith('/uploads')
                  ? `${BASE_URL}${selectedSubscription.image}`
                  : selectedSubscription.image || 'https://via.placeholder.com/150'
              }
              alt={selectedSubscription.name}
              className="w-full max-h-[50vh] rounded object-contain mb-4"
            />
            <h3 className="text-xl font-bold mb-2">{selectedSubscription.name}</h3>
            <p className="text-gray-600 mb-4">{selectedSubscription.description}</p>
            <p className="text-gray-800 font-semibold mb-4">{selectedSubscription.price} кредитов</p>
            {error && <p className="text-red-500 mb-4">{error}</p>}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowSubscriptionModal(false)}
                className="bg-gray-500 text-white p-2 rounded hover:bg-gray-600"
              >
                Закрыть
              </button>
              <button
                onClick={handleBuySubscription}
                disabled={isSubscriptionPurchased(selectedSubscription._id)}
                className={`p-2 rounded text-white ${
                  isSubscriptionPurchased(selectedSubscription._id)
                    ? 'bg-gray-500 cursor-not-allowed'
                    : 'bg-green-500 hover:bg-green-600'
                }`}
              >
                {isSubscriptionPurchased(selectedSubscription._id) ? 'Куплено' : 'Купить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPostModal && selectedPost && hasPostAccess(selectedPost) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex overflow-hidden">
            <div className="w-2/3 p-4 overflow-y-auto">
              {selectedPost.media.length > 0 ? (
                selectedPost.media.map((url, index: number) => (
                  <div key={index} className="mb-4">
                    {url.endsWith('.mp4') || url.endsWith('.webm') ? (
                      <video controls className="w-full max-h-[70vh] rounded object-contain">
                        <source src={`${BASE_URL}${url}`} type="video/mp4" />
                      </video>
                    ) : (
                      <img
                        src={`${BASE_URL}${url}`}
                        alt="Медиа"
                        className="w-full max-h-[70vh] rounded object-contain"
                      />
                    )}
                  </div>
                ))
              ) : (
                <p className="text-gray-600">Медиа отсутствует</p>
              )}
            </div>
            <div className="w-1/3 p-4 bg-gray-100 flex flex-col">
              <div className="flex items-center mb-4">
                <img
                  src={
                    profileUser?.avatar.startsWith('/uploads')
                      ? `${BASE_URL}${profileUser.avatar}`
                      : profileUser?.avatar || 'https://via.placeholder.com/150'
                  }
                  alt="Аватар автора"
                  className="w-10 h-10 rounded-full mr-2 cursor-pointer"
                  onClick={() => {
                    setShowPostModal(false);
                    navigate(`/profile/${profileUser?._id}`);
                  }}
                />
                <span
                  className="font-semibold cursor-pointer hover:underline"
                  onClick={() => {
                    setShowPostModal(false);
                    navigate(`/profile/${profileUser?._id}`);
                  }}
                >
                  {profileUser?.username}
                </span>
              </div>
              <h4 className="text-xl font-semibold mb-2">{selectedPost.title}</h4>
              <p className="text-gray-600 mb-4">{selectedPost.content}</p>
              <div className="flex items-center mb-4">
                <button
                  onClick={() => handleLikePost(selectedPost._id)}
                  className={`p-2 rounded flex items-center ${
                    currentUser && selectedPost.likes.includes(currentUser._id)
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-200 text-gray-800'
                  } hover:bg-red-600 hover:text-white`}
                >
                  <FaHeart className="mr-1" /> {selectedPost.likes.length}
                </button>
              </div>
              <div className="flex-grow overflow-y-auto">
                {comments[selectedPost._id]?.length > 0 ? (
                  comments[selectedPost._id].map((comment) => (
                    <div key={comment._id} className="border-t pt-2 mt-2 flex items-start">
                      <img
                        src={
                          comment.userId.avatar.startsWith('/uploads')
                            ? `${BASE_URL}${comment.userId.avatar}`
                            : comment.userId.avatar || 'https://via.placeholder.com/150'
                        }
                        alt="Аватар комментатора"
                        className="w-8 h-8 rounded-full mr-2 cursor-pointer"
                        onClick={() => {
                          setShowPostModal(false);
                          navigate(`/profile/${comment.userId._id}`);
                        }}
                      />
                      <div>
                        <p className="text-gray-600">
                          <span
                            className="font-semibold cursor-pointer hover:underline"
                            onClick={() => {
                              setShowPostModal(false);
                              navigate(`/profile/${comment.userId._id}`);
                            }}
                          >
                            {comment.userId.username}:
                          </span>{' '}
                          {comment.content}
                        </p>
                        <p className="text-gray-400 text-sm">
                          {new Date(comment.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-600">Комментариев пока нет</p>
                )}
              </div>
              <textarea
                placeholder="Добавить комментарий..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="w-full p-2 mt-4 border rounded"
              />
              <div className="flex justify-end gap-2 mt-2">
                <button
                  onClick={() => {
                    setShowPostModal(false);
                    setSelectedPost(null);
                    setNewComment('');
                  }}
                  className="bg-gray-500 text-white p-2 rounded hover:bg-gray-600"
                >
                  <FaTimes />
                </button>
                <button
                  onClick={() => handleAddComment(selectedPost._id)}
                  className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
                >
                  <FaPaperPlane />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editPost && isOwnProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-lg w-full">
            <h3 className="text-lg font-bold mb-4">Редактировать пост</h3>
            <input
              type="text"
              placeholder="Заголовок"
              value={editPost.title}
              onChange={(e) => setEditPost({ ...editPost, title: e.target.value })}
              className={`w-full p-2 mb-4 border rounded ${titleError ? 'border-red-500' : ''}`}
            />
            {titleError && <p className="text-red-500 mb-4">{titleError}</p>}
            <textarea
              placeholder="Содержание"
              value={editPost.content}
              onChange={(e) => setEditPost({ ...editPost, content: e.target.value })}
              className={`w-full p-2 mb-4 border rounded ${contentError ? 'border-red-500' : ''}`}
            />
            {contentError && <p className="text-red-500 mb-4">{contentError}</p>}
            <input
              type="file"
              accept="image/jpeg,image/png,video/mp4,video/webm"
              multiple
              onChange={handleMediaChange}
              className="mb-4"
            />
            {mediaPreviews.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-2 mb-4">
                {mediaPreviews.map((preview, index: number) => (
                  <div key={index}>
                    {preview.type.startsWith('video/') ? (
                      <video controls className="w-full h-64 rounded object-cover aspect-4/3">
                        <source src={preview.url} type={preview.type} />
                      </video>
                    ) : (
                      <img
                        src={preview.url}
                        alt="Предпросмотр"
                        className="w-full h-64 rounded object-cover aspect-4/3"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="w-full p-2 mb-4 border rounded"
            >
              <option value="">Открытый пост</option>
              {subscriptionLevels.map((level) => (
                <option key={level._id} value={level._id}>
                  {level.name} ({level.price} кредитов)
                </option>
              ))}
            </select>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setEditPost(null);
                  setSelectedLevel('');
                  setMediaFiles([]);
                  setMediaPreviews([]);
                  setTitleError('');
                  setContentError('');
                }}
                className="bg-gray-500 text-white p-2 rounded hover:bg-gray-600"
              >
                Отмена
              </button>
              <button
                onClick={handleEditPost}
                className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreatePostModal && isOwnProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-lg w-full">
            <h3 className="text-lg font-bold mb-4">Создать пост</h3>
            <input
              type="text"
              placeholder="Заголовок"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`w-full p-2 mb-4 border rounded ${titleError ? 'border-red-500' : ''}`}
            />
            {titleError && <p className="text-red-500 mb-4">{titleError}</p>}
            <textarea
              placeholder="Содержание"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className={`w-full p-2 mb-4 border rounded ${contentError ? 'border-red-500' : ''}`}
            />
            {contentError && <p className="text-red-500 mb-4">{contentError}</p>}
            <input
              type="file"
              accept="image/jpeg,image/png,video/mp4,video/webm"
              multiple
              onChange={handleMediaChange}
              className="mb-4"
            />
            {mediaPreviews.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-2 mb-4">
                {mediaPreviews.map((preview, index: number) => (
                  <div key={index}>
                    {preview.type.startsWith('video/') ? (
                      <video controls className="w-full h-64 rounded object-cover aspect-4/3">
                        <source src={preview.url} type={preview.type} />
                      </video>
                    ) : (
                      <img
                        src={preview.url}
                        alt="Предпросмотр"
                        className="w-full h-64 rounded object-cover aspect-4/3"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="w-full p-2 mb-4 border rounded"
            >
              <option value="">Открытый пост</option>
              {subscriptionLevels.map((level) => (
                <option key={level._id} value={level._id}>
                  {level.name} ({level.price} кредитов)
                </option>
              ))}
            </select>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowCreatePostModal(false);
                  setTitle('');
                  setContent('');
                  setSelectedLevel('');
                  setMediaFiles([]);
                  setMediaPreviews([]);
                  setTitleError('');
                  setContentError('');
                }}
                className="bg-gray-500 text-white p-2 rounded hover:bg-gray-600"
              >
                Отмена
              </button>
              <button
                onClick={handleCreatePost}
                className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
              >
                Опубликовать
              </button>
            </div>
          </div>
        </div>
      )}

      {showChatModal && profileUser && (
        <Chat onClose={() => setShowChatModal(false)} initialUserId={profileUser._id} />
      )}

      <div className="mt-16 mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{profileUser?.username || 'Профиль'}</h1>
          {error && <p className="text-red-500 mt-2">{error}</p>}
          {profileUser ? (
            <div className="mt-2 text-gray-600">
              <p>{profileUser.email}</p>
              <p>{profileUser.description || 'Нет описания'}</p>
              <p>
                
              </p>
            </div>
          ) : (
            <p className="text-gray-600 mt-2">Войдите, чтобы увидеть профиль</p>
          )}
        </div>
        <div className="flex gap-2">
          {isOwnProfile ? (
            <>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="bg-gray-500 text-white p-2 rounded hover:bg-gray-600"
              >
                {showSettings ? 'Скрыть настройки' : 'Настройки профиля'}
              </button>
              <button
                onClick={() => setShowCreatePostModal(true)}
                className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
              >
                Создать пост
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowChatModal(true)}
              className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600 flex items-center"
            >
              <FaComment className="mr-2" /> Начать диалог
            </button>
          )}
        </div>
      </div>

      {showSettings && isOwnProfile && currentUser && (
        <Settings
          user={{ username: currentUser.username, email: currentUser.email, description: currentUser.description, credits: currentUser.credits }}
          onUpdate={handleUpdateUser}
          onSubscriptionUpdate={handleSubscriptionUpdate}
        />
      )}

      <div className="flex gap-8">
        <div className="w-2/3">
          <h3 className="text-lg font-bold mb-4">Посты</h3>
          {posts.length === 0 ? (
            <p className="text-gray-600">У пользователя пока нет постов</p>
          ) : (
            <div className="grid gap-4">
              {posts.map((post) => (
                <div key={post._id} className="bg-white p-4 rounded-lg shadow-md h-[450px] flex flex-col overflow-hidden relative">
                  {hasPostAccess(post) ? (
                    <>
                      <h4
                        className="text-xl font-semibold cursor-pointer hover:underline"
                        onClick={() => {
                          setSelectedPost(post);
                          setShowPostModal(true);
                        }}
                      >
                        {post.title}
                      </h4>
                      <p className="text-gray-600 flex-grow">{post.content}</p>
                      {post.media.length > 0 && (
                        <div className="mt-2 flex justify-center items-center h-64">
                          {post.media[0] && (
                            <div onClick={() => {
                              setSelectedPost(post);
                              setShowPostModal(true);
                            }} className="cursor-pointer w-full h-full flex justify-center items-center">
                              {post.media[0].endsWith('.mp4') || post.media[0].endsWith('.webm') ? (
                                <video controls className="max-w-full max-h-full rounded object-contain">
                                  <source src={`${BASE_URL}${post.media[0]}`} type="video/mp4" />
                                </video>
                              ) : (
                                <img
                                  src={`${BASE_URL}${post.media[0]}`}
                                  alt="Медиа"
                                  className="max-w-full max-h-full rounded object-contain"
                                />
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      <div className="mt-2 flex justify-between items-center">
                        <p className="text-gray-400 text-sm">
                          Доступ: {post.subscriptionLevel ? post.subscriptionLevel.name : 'Открытый'}
                        </p>
                        <div className="flex gap-2 items-center">
                          <button
                            onClick={() => handleLikePost(post._id)}
                            className={`p-2 rounded flex items-center ${
                              currentUser && post.likes.includes(currentUser._id)
                                ? 'bg-red-500 text-white'
                                : 'bg-gray-200 text-gray-800'
                            } hover:bg-red-600 hover:text-white`}
                          >
                            <FaHeart className="mr-1" /> {post.likes.length}
                          </button>
                          <button
                            onClick={() => {
                              setSelectedPost(post);
                              setShowPostModal(true);
                            }}
                            className="p-2 rounded bg-gray-200 text-gray-800 hover:bg-gray-300 flex items-center"
                          >
                            <FaPaperPlane className="mr-1" /> {comments[post._id]?.length || 0}
                          </button>
                        </div>
                      </div>
                      <p className="text-gray-400 text-sm">
                        Опубликовано: {new Date(post.createdAt).toLocaleDateString()}
                      </p>
                      {isOwnProfile && (
                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={() => {
                              setEditPost(post);
                              setSelectedLevel(post.subscriptionLevel?._id || '');
                            }}
                            className="bg-yellow-500 text-white p-2 rounded hover:bg-yellow-600 flex items-center"
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => handleDeletePost(post._id)}
                            className="bg-red-500 text-white p-2 rounded hover:bg-red-600 flex items-center"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="relative w-full h-full">
                      <div className="filter blur-[10px]">
                        <h4 className="text-xl font-semibold">{post.title}</h4>
                        <p className="text-gray-600 flex-grow">{post.content}</p>
                        {post.media.length > 0 && (
                          <div className="mt-2 flex justify-center items-center h-64">
                            {post.media[0] && (
                              <div className="w-full h-full flex justify-center items-center">
                                {post.media[0].endsWith('.mp4') || post.media[0].endsWith('.webm') ? (
                                  <video className="max-w-full max-h-full rounded object-contain">
                                    <source src={`${BASE_URL}${post.media[0]}`} type="video/mp4" />
                                  </video>
                                ) : (
                                  <img
                                    src={`${BASE_URL}${post.media[0]}`}
                                    alt="Медиа"
                                    className="max-w-full max-h-full rounded object-contain"
                                  />
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <div className="text-center text-white">
                          <p className="mb-4">Требуется подписка: {post.subscriptionLevel?.name}</p>
                          <button
                            onClick={() => {
                              if (post.subscriptionLevel) {
                                setSelectedSubscription(post.subscriptionLevel);
                                setShowSubscriptionModal(true);
                              }
                            }}
                            className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
                          >
                            Купить подписку
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="w-1/3">
          <h3 className="text-lg font-bold mb-4">Подписки</h3>
          {subscriptionLevels.length === 0 ? (
            <p className="text-gray-600">Подписки отсутствуют</p>
          ) : (
            <div className="space-y-4">
              {subscriptionLevels.map((level) => (
                <div
                  key={level._id}
                  className="bg-white p-4 rounded-lg shadow-md flex items-center space-x-4 cursor-pointer hover:bg-gray-100"
                  onClick={() => {
                    setSelectedSubscription(level);
                    setShowSubscriptionModal(true);
                  }}
                >
                  <img
                    src={
                      level.image.startsWith('/uploads')
                        ? `${BASE_URL}${level.image}`
                        : level.image || 'https://via.placeholder.com/150'
                    }
                    alt={level.name}
                    className="w-16 h-16 rounded object-cover"
                  />
                  <div>
                    <p className="font-semibold">{level.name}</p>
                    <p className="text-gray-600">{level.price} кредитов</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Profile;