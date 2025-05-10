import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PostCard from '../components/PostCard';
import { FaTimes, FaHeart, FaPaperPlane } from 'react-icons/fa';

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

function Category() {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<{ [postId: string]: Comment[] }>({});
  const [currentUser, setCurrentUser] = useState<{ _id: string } | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [newComment, setNewComment] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const BASE_URL = 'http://localhost:5000';

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

        // Получение постов по категории
        const postsResponse = await fetch(`${BASE_URL}/api/posts/${type}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!postsResponse.ok) throw new Error(`Ошибка HTTP: ${postsResponse.status}`);
        const postsData = await postsResponse.json();
        if (postsData.error) throw new Error(postsData.error);
        setPosts(postsData);

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
        console.log('Fetch category data error:', err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [type]);

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
      <h1 className="text-3xl font-bold mb-8">
        {type === 'popular' ? 'Популярные посты' : type === 'new' ? 'Новые посты' : 'Трендовые посты'}
      </h1>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <div className="grid grid-cols-3 gap-4">
        {posts.map((post) => (
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

      {/* Модальное окно для просмотра поста */}
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

export default Category;