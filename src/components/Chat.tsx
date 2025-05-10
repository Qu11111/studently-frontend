import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPaperPlane, FaTimes } from 'react-icons/fa';

interface User {
  _id: string;
  username: string;
  avatar: string;
}

interface Dialog {
  user: User;
  lastMessage: string;
  createdAt: string;
}

interface Message {
  _id: string;
  content: string;
  userId: User;
  recipientId: User;
  createdAt: string;
}

interface ChatProps {
  onClose: () => void;
  initialUserId?: string;
}

function Chat({ onClose, initialUserId }: ChatProps) {
  const navigate = useNavigate();
  const [dialogs, setDialogs] = useState<Dialog[]>([]);
  const [selectedDialog, setSelectedDialog] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [error, setError] = useState('');
  const BASE_URL = 'https://studently-backend.onrender.com';

  // Загрузка данных текущего пользователя
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Токен не найден');

        const response = await fetch(`${BASE_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error(`Ошибка HTTP: ${response.status}`);
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        setCurrentUser(data);
      } catch (err: any) {
        console.log('Fetch current user error:', err.message);
        setError(err.message);
      }
    };

    fetchCurrentUser();
  }, []);

  // Загрузка списка диалогов
  useEffect(() => {
    const fetchDialogs = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Токен не найден');

        const response = await fetch(`${BASE_URL}/api/dialogs`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error(`Ошибка HTTP: ${response.status}`);
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        setDialogs(data);

        // Если есть initialUserId, выбрать диалог
        if (initialUserId) {
          const dialog = data.find((d: Dialog) => d.user._id === initialUserId);
          if (dialog) {
            setSelectedDialog(dialog.user);
          } else {
            const userResponse = await fetch(`${BASE_URL}/api/users/${initialUserId}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (!userResponse.ok) throw new Error(`Ошибка HTTP: ${userResponse.status}`);
            const userData = await userResponse.json();
            if (userData.error) throw new Error(userData.error);
            setSelectedDialog(userData);
          }
        }
      } catch (err: any) {
        console.log('Fetch dialogs error:', err.message);
        setError(err.message);
      }
    };

    fetchDialogs();
  }, [initialUserId]);

  // Загрузка сообщений для выбранного диалога
  useEffect(() => {
    if (!selectedDialog) return;

    const fetchMessages = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Токен не найден');

        const response = await fetch(`${BASE_URL}/api/messages/${selectedDialog._id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error(`Ошибка HTTP: ${response.status}`);
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        setMessages(data);
      } catch (err: any) {
        console.log('Fetch messages error:', err.message);
        setError(err.message);
      }
    };

    fetchMessages();
  }, [selectedDialog]);

  // Подключение к WebSocket
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Токен не найден');
      return;
    }

    const socket = new WebSocket(
    'wss://studently-backend.onrender.com');
    socket.onopen = () => {
      console.log('WebSocket подключён');
      setWs(socket);
      setError('');
    };
    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('WebSocket received message:', message);
        if (message.error) {
          setError(message.error);
        } else {
          // Проверяем, относится ли сообщение к текущему диалогу
          const userId = localStorage.getItem('userId') || '';
          if (
            (message.userId._id === selectedDialog?._id && message.recipientId._id === userId) ||
            (message.userId._id === userId && message.recipientId._id === selectedDialog?._id)
          ) {
            setMessages((prev) => {
              // Заменяем временное сообщение, если оно есть
              const tempMessageIndex = prev.findIndex((msg) => msg._id.startsWith('temp-'));
              if (tempMessageIndex !== -1) {
                const tempMessage = prev[tempMessageIndex];
                const timeDiff = new Date(message.createdAt).getTime() - new Date(tempMessage.createdAt).getTime();
                if (timeDiff < 5000 && tempMessage.content === message.content) {
                  const newMessages = [...prev];
                  newMessages[tempMessageIndex] = message;
                  return newMessages.slice(-50);
                }
              }
              // Проверяем на дублирование
              if (prev.some((msg) => msg._id === message._id)) {
                return prev;
              }
              return [...prev, message].slice(-50);
            });
          }
          // Обновляем список диалогов
          setDialogs((prev) => {
            const existingDialog = prev.find((dialog) => dialog.user._id === message.userId._id || dialog.user._id === message.recipientId._id);
            if (existingDialog) {
              return prev.map((dialog) =>
                dialog.user._id === message.userId._id || dialog.user._id === message.recipientId._id
                  ? { ...dialog, lastMessage: message.content, createdAt: message.createdAt }
                  : dialog
              );
            }
            // Добавляем новый диалог, если его нет
            const newDialogUser = message.userId._id === userId ? message.recipientId : message.userId;
            return [
              {
                user: newDialogUser,
                lastMessage: message.content,
                createdAt: message.createdAt,
              },
              ...prev,
            ];
          });
        }
      } catch (err: any) {
        console.log('WebSocket message error:', err.message);
        setError('Ошибка обработки сообщения');
      }
    };
    socket.onclose = () => {
      console.log('WebSocket отключён');
      setWs(null);
      setError('Соединение с чатом закрыто');
    };
    socket.onerror = (err) => {
      console.error('WebSocket ошибка:', err);
      setError('Ошибка соединения с чатом');
    };

    return () => {
      socket.close();
    };
  }, [selectedDialog]);

  // Отправка сообщения
  const handleSendMessage = () => {
    if (!ws || !newMessage.trim() || !selectedDialog || !currentUser) return;

    const token = localStorage.getItem('token');
    if (!token) {
      setError('Пожалуйста, войдите в систему');
      return;
    }

    const userId = localStorage.getItem('userId') || '';
    const tempMessage: Message = {
      _id: `temp-${Date.now()}`,
      content: newMessage.trim(),
      userId: {
        _id: userId,
        username: currentUser.username,
        avatar: currentUser.avatar,
      },
      recipientId: selectedDialog,
      createdAt: new Date().toISOString(),
    };

    // Добавляем сообщение локально
    setMessages((prev) => [...prev, tempMessage].slice(-50));
    setDialogs((prev) => {
      const existingDialog = prev.find((dialog) => dialog.user._id === selectedDialog._id);
      if (existingDialog) {
        return prev.map((dialog) =>
          dialog.user._id === selectedDialog._id
            ? { ...dialog, lastMessage: newMessage.trim(), createdAt: new Date().toISOString() }
            : dialog
        );
      }
      return [
        {
          user: selectedDialog,
          lastMessage: newMessage.trim(),
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ];
    });

    // Отправляем сообщение через WebSocket
    ws.send(JSON.stringify({ token, content: newMessage.trim(), recipientId: selectedDialog._id }));
    console.log('Sent message:', { content: newMessage.trim(), recipientId: selectedDialog._id });
    setNewMessage('');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl h-[80vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl text-black font-bold">Чат</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FaTimes />
          </button>
        </div>
        <div className="flex flex-grow overflow-hidden">
          {/* Левая панель: список диалогов */}
          <div className="w-1/3 border-r overflow-y-auto">
            {dialogs.length > 0 ? (
              dialogs.map((dialog) => (
                <div
                  key={dialog.user._id}
                  className={`p-4 border-b cursor-pointer hover:bg-gray-100 ${
                    selectedDialog?._id === dialog.user._id ? 'bg-gray-200' : ''
                  }`}
                  onClick={() => setSelectedDialog(dialog.user)}
                >
                  <div className="flex items-center">
                    <img
                      src={
                        dialog.user.avatar.startsWith('/uploads')
                          ? `${BASE_URL}${dialog.user.avatar}`
                          : dialog.user.avatar || 'https://via.placeholder.com/150'
                      }
                      alt="Аватар"
                      className="w-10 h-10 rounded-full mr-2 cursor-pointer"
                      onClick={() => {
                        navigate(`/profile/${dialog.user._id}`);
                        onClose();
                      }}
                    />
                    <div>
                      <p className="font-semibold text-black">{dialog.user.username}</p>
                      <p className="text-gray-500 text-sm truncate">{dialog.lastMessage}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="p-4 text-gray-600">Диалоги отсутствуют</p>
            )}
          </div>
          {/* Правая панель: выбранный диалог */}
          <div className="w-2/3 flex flex-col">
            {selectedDialog ? (
              <>
                <div className="p-4 border-b flex items-center">
                  <img
                    src={
                      selectedDialog.avatar.startsWith('/uploads')
                        ? `${BASE_URL}${selectedDialog.avatar}`
                        : selectedDialog.avatar || 'https://via.placeholder.com/150'
                    }
                    alt="Аватар собеседника"
                    className="w-8 h-8 rounded-full mr-2 cursor-pointer"
                    onClick={() => {
                      navigate(`/profile/${selectedDialog._id}`);
                      onClose();
                    }}
                  />
                  <h3
                    className="text-lg font-semibold text-black cursor-pointer hover:underline"
                    onClick={() => {
                      navigate(`/profile/${selectedDialog._id}`);
                      onClose();
                    }}
                  >
                    {selectedDialog.username}
                  </h3>
                </div>
                <div className="flex-grow overflow-y-auto p-4">
                  {messages.length > 0 ? (
                    messages.map((message) => (
                      <div
                        key={message._id}
                        className={`flex items-start mb-2 ${
                          message.userId._id === localStorage.getItem('userId')
                            ? 'justify-end'
                            : 'justify-start'
                        }`}
                      >
                        <div
                          className={`flex ${
                            message.userId._id === localStorage.getItem('userId')
                              ? 'flex-row-reverse'
                              : 'flex-row'
                          } items-start`}
                        >
                          <img
                            src={
                              message.userId.avatar.startsWith('/uploads')
                                ? `${BASE_URL}${message.userId.avatar}`
                                : message.userId.avatar || 'https://via.placeholder.com/150'
                            }
                            alt="Аватар"
                            className="w-8 h-8 rounded-full mx-2 cursor-pointer"
                            onClick={() => {
                              navigate(`/profile/${message.userId._id}`);
                              onClose();
                            }}
                          />
                          <div
                            className={`p-2 rounded-lg ${
                              message.userId._id === localStorage.getItem('userId')
                                ? 'bg-blue-100'
                                : 'bg-gray-100'
                            }`}
                          >
                            <p className="text-gray-800">{message.content}</p>
                            <p className="text-gray-400 text-sm">
                              {new Date(message.createdAt).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-600">Сообщения отсутствуют</p>
                  )}
                </div>
                <div className="p-4 border-t flex items-center">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Напишите сообщение..."
                    className="flex-grow p-2 border rounded-l text-black"
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                  <button
                    onClick={handleSendMessage}
                    className="bg-blue-500 text-white p-2 rounded-r hover:bg-blue-600"
                  >
                    <FaPaperPlane />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-grow flex items-center justify-center">
                <p className="text-gray-600">Выберите диалог</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Chat;