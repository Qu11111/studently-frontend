import { FaHeart, FaPaperPlane } from 'react-icons/fa';

interface SubscriptionLevel {
  _id: string;
  name: string;
}

interface Post {
  _id: string;
  title: string;
  content: string;
  createdAt: string;
  subscriptionLevel: SubscriptionLevel | null;
  media: string[];
  likes: string[];
  userId: { username: string; avatar: string; _id: string } | null; // userId может быть null
}

interface PostCardProps {
  post: Post;
  onLike: (postId: string) => void;
  onOpenPost: (post: Post) => void;
  currentUser: { _id: string } | null;
  comments: { [postId: string]: { length: number } };
}

function PostCard({ post, onLike, onOpenPost, currentUser, comments }: PostCardProps) {
  const BASE_URL = 'https://studently-backend.onrender.com';

  // Функция для получения корректного URL
  const getImageUrl = (url: string | undefined) => {
    if (!url) return 'https://placehold.co/150x150';
    if (url.startsWith('https://res.cloudinary.com')) {
      return url;
    }
    return url.startsWith('/uploads') ? `${BASE_URL}${url}` : url;
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md h-[450px] flex flex-col overflow-hidden">
      <div className="flex items-center mb-2">
        <img
          src={getImageUrl(post.userId?.avatar)} // Проверяем post.userId
          alt="Аватар автора"
          className="w-6 h-6 rounded-full mr-2"
        />
        <span className="font-semibold text-xl cursor-pointer hover:underline" onClick={() => onOpenPost(post)}>
          {post.userId?.username || 'Неизвестный автор'} {/* Запасное значение для username */}
        </span>
      </div>
      <h4
        className="text-xl font-semibold cursor-pointer hover:underline"
        onClick={() => onOpenPost(post)}
      >
        {post.title}
      </h4>
      <p className="text-gray-600 flex-grow">{post.content}</p>
      {post.media.length > 0 && (
        <div className="mt-2 flex justify-center items-center h-64 px-2">
          {post.media[0] && (
            <div onClick={() => onOpenPost(post)} className="cursor-pointer w-full h-full flex justify-center items-center">
              {post.media[0].endsWith('.mp4') || post.media[0].endsWith('.webm') ? (
                <video controls className="max-w-full max-h-full rounded object-contain">
                  <source src={getImageUrl(post.media[0])} type="video/mp4" />
                </video>
              ) : (
                <img
                  src={getImageUrl(post.media[0])}
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
            onClick={() => onLike(post._id)}
            className={`p-2 rounded flex items-center ${
              currentUser && post.likes.includes(currentUser._id)
                ? 'bg-red-500 text-white'
                : 'bg-gray-200 text-gray-800'
            } hover:bg-red-600 hover:text-white`}
          >
            <FaHeart className="mr-1" /> {post.likes.length}
          </button>
          <button
            onClick={() => onOpenPost(post)}
            className="p-2 rounded bg-gray-200 text-gray-800 hover:bg-gray-300 flex items-center"
          >
            <FaPaperPlane className="mr-1" /> {comments[post._id]?.length || 0}
          </button>
        </div>
      </div>
      <p className="text-gray-400 text-sm">
        Опубликовано: {new Date(post.createdAt).toLocaleDateString()}
      </p>
    </div>
  );
}

export default PostCard;