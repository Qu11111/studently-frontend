import { useNavigate } from 'react-router-dom';

interface CreatorCardProps {
  id: string;
  username: string;
  avatar: string;
  description: string;
}

function CreatorCard({ id, username, avatar, description }: CreatorCardProps) {
  const navigate = useNavigate();
  const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  return (
    <div
      className="bg-white p-4 rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-shadow"
      onClick={() => navigate(`/profile/${id}`)}
    >
      <img
        src={avatar.startsWith('/uploads') ? `${BASE_URL}${avatar}` : avatar}
        alt={username}
        className="w-24 h-24 rounded-full mx-auto mb-4"
      />
      <h3 className="text-lg font-semibold text-center">{username}</h3>
      <p className="text-gray-600 text-center text-sm mt-2 line-clamp-2">
        {description || 'Нет описания'}
      </p>
    </div>
  );
}

export default CreatorCard;