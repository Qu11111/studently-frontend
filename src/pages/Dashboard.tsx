import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PostCard from '../components/PostCard';
import Chat from '../components/Chat';
import { FaSearch, FaComment, FaClipboardList, FaTimes, FaHeart, FaPaperPlane } from 'react-icons/fa';

interface SubscriptionLevel {
  _id: string;
  name: string;
}

interface User {
  _id: string;
  username: string;
  avatar: string;
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

function Dashboard() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [popularPosts, setPopularPosts] = useState<Post[]>([]);
  const [newPosts, setNewPosts] = useState<Post[]>([]);
  const [trendingPosts, setTrendingPosts] = useState<Post[]>([]);
  const [currentUser, setCurrentUser] = useState<{ _id: string } | null>(null);
  const [comments, setComments] = useState<{ [postId: string]: Comment[] }>({});
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [newComment, setNewComment] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  const categories = ['popular', 'new', 'trending'];

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
        const userResponse = await fetch(`${BASE_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!userResponse.ok) throw new Error(`Ошибка HTTP: ${userResponse.status}`);
        const userData = await userResponse.json();
        if (userData.error) throw new Error(userData.error);
        setCurrentUser(userData);

        // Получение постов
        const fetchPosts = async (type: string) => {
          const response = await fetch(`${BASE_URL}/api/posts/${type}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!response.ok) throw new Error(`Ошибка HTTP: ${response.status}`);
          const data = await response.json();
          if (data.error) throw new Error(data.error);
          return data;
        };

        const [popularData, newData, trendingData] = await Promise.all([
          fetchPosts('popular'),
          fetchPosts('new'),
          fetchPosts('trending'),
        ]);

        setPopularPosts(popularData);
        setNewPosts(newData);
        setTrendingPosts(trendingData);

        // Получение комментариев
        const allPosts = [...popularData, ...newData, ...trendingData];
        const commentsData: { [postId: string]: Comment[] } = {};
        for (const post of allPosts) {
          const commentsResponse = await fetch(`${BASE_URL}/api/posts/${post._id}/comments`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!commentsResponse.ok) throw new Error(`Ошибка HTTP: ${commentsResponse.status}`);
          const postComments = await commentsResponse.json();
          commentsData[post._id] = postComments;
        }
        setComments(commentsData);
      } catch (err: any) {
        console.log('Fetch dashboard data error:', err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Ротация постов
    const interval = setInterval(() => {
      if (!searchQuery) {
        setPopularPosts((prev) => [...prev.slice(1), prev[0]]);
        setNewPosts((prev) => [...prev.slice(1), prev[0]]);
        setTrendingPosts((prev) => [...prev.slice(1), prev[0]]);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [searchQuery]);

  const handleSearch = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Пожалуйста, войдите в систему');
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/api/posts?search=${encodeURIComponent(searchQuery)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(`Ошибка HTTP: ${response.status}`);
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setPopularPosts(data);
      setNewPosts([]);
      setTrendingPosts([]);
    } catch (err: any) {
      console.log('Search error:', err.message);
      setError(err.message);
    }
  };

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

      const updatePosts = (posts: Post[]) =>
        posts.map((post) => (post._id === postId ? { ...post, likes: data.likes } : post));
      setPopularPosts(updatePosts);
      setNewPosts(updatePosts);
      setTrendingPosts(updatePosts);
      if (selectedPost && selectedPost._id === postId) {
        setSelectedPost((prev) => (prev ? { ...prev, likes: data.likes } : null));
      }
    } catch (err: any) {
      console.log('Like post error:', err.message);
      setError(err.message);
    }
  };

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
    } catch (err: any) {
      console.log('Add comment error:', err.message);
      setError(err.message);
    }
  };

  if (loading) return <div className="container mx-auto p-4">Загрузка...</div>;

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Главная</h1>
        <div className="flex items-center gap-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Поиск..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="p-2 border rounded pl-10"
            />
            <FaSearch className="absolute left-3 top-3 text-gray-400" />
          </div>
        </div>
      </div>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      {showChat && <Chat onClose={() => setShowChat(false)} />}
      {searchQuery ? (
        <div className="grid gap-4">
          {popularPosts.map((post) => (
            <PostCard
              key={post._id}
              post={post}
              onLike={handleLikePost}
              onOpenPost={(p) => setSelectedPost(p)}
              currentUser={currentUser}
              comments={comments}
            />
          ))}
        </div>
      ) : (
        <>
          {categories.map((category) => (
            <div key={category} className="mb-8">
              <h2
                className="text-2xl font-bold mb-4 cursor-pointer hover:underline"
                onClick={() => navigate(`/category/${category}`)}
              >
                {category === 'popular' ? 'Популярные' : category === 'new' ? 'Новые' : 'Трендовые'}
              </h2>
              <div className="grid grid-cols-3 gap-4">
                {(category === 'popular' ? popularPosts : category === 'new' ? newPosts : trendingPosts)
                  .slice(0, 3)
                  .map((post) => (
                    <PostCard
                      key={post._id}
                      post={post}
                      onLike={handleLikePost}
                      onOpenPost={(p) => setSelectedPost(p)}
                      currentUser={currentUser}
                      comments={comments}
                    />
                  ))}
              </div>
            </div>
          ))}
        </>
      )}

      {selectedPost && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex overflow-hidden">
            <div className="w-2/3 p-4 overflow-y-auto">
              {selectedPost.media.length > 0 ? (
                selectedPost.media.map((url, index) => (
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
                    selectedPost.userId.avatar.startsWith('/uploads')
                      ? `${BASE_URL}${selectedPost.userId.avatar}`
                      : selectedPost.userId.avatar || 'https://via.placeholder.com/150'
                  }
                  alt="Аватар автора"
                  className="w-10 h-10 rounded-full mr-2 cursor-pointer"
                  onClick={() => {
                    setSelectedPost(null);
                    navigate(`/profile/${selectedPost.userId._id}`);
                  }}
                />
                <span
                  className="font-semibold cursor-pointer hover:underline"
                  onClick={() => {
                    setSelectedPost(null);
                    navigate(`/profile/${selectedPost.userId._id}`);
                  }}
                >
                  {selectedPost.userId.username}
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
                          setSelectedPost(null);
                          navigate(`/profile/${comment.userId._id}`);
                        }}
                      />
                      <div>
                        <p className="text-gray-600">
                          <span
                            className="font-semibold cursor-pointer hover:underline"
                            onClick={() => {
                              setSelectedPost(null);
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
    </div>
  );
}

export default Dashboard;