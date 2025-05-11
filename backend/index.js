const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const WebSocket = require('ws');

const app = express();
app.use(cors());
app.use(express.json());

// Статическая папка для загрузок
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Настройка Cloudinary
cloudinary.config({
  cloud_name: 'dmawshrng',
  api_key: '442788134913747',
  api_secret: 'FWAIH_YN5KpwEwqiTQ7ArAY8F3o',
});
// Настройка multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'studently/uploads',
    allowed_formats: ['jpg', 'png', 'mp4', 'webm'],
    unique_filename: false, // Отключаем добавление случайного суффикса
    overwrite: true, // Перезаписываем файлы с одинаковыми именами
    public_id: (req, file) => {
      const ext = path.extname(file.originalname); // Получаем расширение
      const name = file.originalname.replace(ext, ''); // Убираем расширение из имени
      return name; // Используем оригинальное имя файла как public_id
    },
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'video/mp4', 'video/webm'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Неподдерживаемый тип файла'), false);
    }
  },
});
// Подключение к MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/boosty-clone', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('MongoDB подключен'))
  .catch((err) => console.error('Ошибка MongoDB:', err));

// Схема пользователя
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  description: { type: String, default: '' },
  purchasedSubscriptions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionLevel' }],
  avatar: { type: String, default: 'https://via.placeholder.com/150' },
  cover: { type: String, default: 'https://via.placeholder.com/1200x300' },
  credits: { type: Number, default: 1000 },
});

const User = mongoose.model('User', userSchema);

// Схема уровня подписки
const subscriptionLevelSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  image: { type: String, default: 'https://via.placeholder.com/150' },
  description: { type: String, default: '' },
  creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
});

const SubscriptionLevel = mongoose.model('SubscriptionLevel', subscriptionLevelSchema);

// Схема поста
const postSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subscriptionLevel: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionLevel', default: null },
  media: [{ type: String }],
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now },
});

const Post = mongoose.model('Post', postSchema);

// Схема комментария
const commentSchema = new mongoose.Schema({
  content: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
  createdAt: { type: Date, default: Date.now },
});

const Comment = mongoose.model('Comment', commentSchema);

// Схема сообщения чата
const messageSchema = new mongoose.Schema({
  content: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
});

const Message = mongoose.model('Message', messageSchema);

// Валидация email
const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

// Middleware для проверки токена
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    console.log('authMiddleware: Токен не предоставлен');
    return res.status(401).json({ error: 'Токен не предоставлен' });
  }

  try {
    const decoded = jwt.verify(token, 'secret_key');
    req.userId = decoded.userId;
    next();
  } catch (error) {
    console.log('authMiddleware: Неверный токен', error.message);
    res.status(401).json({ error: 'Неверный токен' });
  }
};

// Регистрация
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Неверный формат email' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, email, password: hashedPassword, credits: 1000, purchasedSubscriptions: [] });
    await user.save();
    res.status(201).json({ message: 'Пользователь зарегистрирован' });
  } catch (error) {
    console.log('POST /api/auth/register: Ошибка:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// Вход
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Неверный формат email' });
    }
    const user = await User.findOne({ email });
    if (!user) {
      console.log('POST /api/auth/login: Пользователь не найден, email:', email);
      return res.status(400).json({ error: 'Пользователь не найден' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('POST /api/auth/login: Неверный пароль, email:', email);
      return res.status(400).json({ error: 'Неверный пароль' });
    }

    const token = jwt.sign({ userId: user._id }, 'secret_key', { expiresIn: '1h' });
    res.json({ token });
  } catch (error) {
    console.log('POST /api/auth/login: Ошибка:', error.message);
    res.status(400).json({ error: error.message });
  }
});
app.get('/ping', (req, res) => res.send('OK'));
// Получение данных текущего пользователя
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password').populate('purchasedSubscriptions');
    if (!user) {
      console.log('GET /api/auth/me: Пользователь не найден, userId:', req.userId);
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    res.json(user);
  } catch (error) {
    console.log('GET /api/auth/me: Ошибка:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// Обновление профиля (ник, email, описание)
app.put('/api/auth/update', authMiddleware, async (req, res) => {
  try {
    const { username, email, description } = req.body;
    const user = await User.findById(req.userId);
    if (!user) {
      console.log('PUT /api/auth/update: Пользователь не найден, userId:', req.userId);
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    if (email && !validateEmail(email)) {
      return res.status(400).json({ error: 'Неверный формат email' });
    }

    if (username) user.username = username;
    if (email) user.email = email;
    if (description !== undefined) user.description = description;

    await user.save();
    res.json({ message: 'Профиль обновлён', user: { username: user.username, email: user.email, description: user.description } });
  } catch (error) {
    console.log('PUT /api/auth/update: Ошибка:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// Загрузка аватара
app.post('/api/upload/avatar', authMiddleware, upload.single('avatar'), async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      console.log('POST /api/upload/avatar: Пользователь не найден, userId:', req.userId);
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    user.avatar = req.file.path; // URL от Cloudinary
    await user.save();
    res.json({ avatar: user.avatar });
  } catch (error) {
    console.log('POST /api/upload/avatar: Ошибка:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// Загрузка обложки
app.post('/api/upload/cover', authMiddleware, upload.single('cover'), async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      console.log('POST /api/upload/cover: Пользователь не найден, userId:', req.userId);
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    user.cover = req.file.path; // URL от Cloudinary
    await user.save();
    res.json({ cover: user.cover });
  } catch (error) {
    console.log('POST /api/upload/cover: Ошибка:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// Создание уровня подписки
app.post('/api/subscriptions', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const { name, price, description } = req.body;
    const image = req.file ? req.file.path : 'https://via.placeholder.com/150'; // Используем Cloudinary URL
    console.log('Uploaded subscription image URL:', image); // Добавь отладку
    const subscriptionLevel = new SubscriptionLevel({
      name,
      price,
      image,
      description,
      creatorId: req.userId,
    });
    await subscriptionLevel.save();
    res.status(201).json({ message: 'Уровень подписки создан', subscriptionLevel });
  } catch (error) {
    console.log('POST /api/subscriptions: Ошибка:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// Редактирование уровня подписки
app.put('/api/subscriptions/:id', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const { name, price, description } = req.body;
    const subscriptionLevel = await SubscriptionLevel.findById(req.params.id);
    if (!subscriptionLevel) {
      console.log('PUT /api/subscriptions/:id: Подписка не найдена, id:', req.params.id);
      return res.status(404).json({ error: 'Подписка не найдена' });
    }
    if (subscriptionLevel.creatorId.toString() !== req.userId) {
      console.log('PUT /api/subscriptions/:id: Нет доступа, userId:', req.userId, 'creatorId:', subscriptionLevel.creatorId);
      return res.status(403).json({ error: 'Нет доступа' });
    }

    subscriptionLevel.name = name || subscriptionLevel.name;
    subscriptionLevel.price = price || subscriptionLevel.price;
    subscriptionLevel.description = description || subscriptionLevel.description;
    if (req.file) {
      subscriptionLevel.image = req.file.path; // Используем Cloudinary URL
      console.log('Updated subscription image URL:', subscriptionLevel.image);
    }

    await subscriptionLevel.save();
    res.json({ message: 'Подписка обновлена', subscriptionLevel });
  } catch (error) {
    console.log('PUT /api/subscriptions/:id: Ошибка:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// Удаление уровня подписки
app.delete('/api/subscriptions/:id', authMiddleware, async (req, res) => {
  try {
    const subscriptionLevel = await SubscriptionLevel.findById(req.params.id);
    if (!subscriptionLevel) {
      console.log('DELETE /api/subscriptions/:id: Подписка не найдена, id:', req.params.id);
      return res.status(404).json({ error: 'Подписка не найдена' });
    }
    if (subscriptionLevel.creatorId.toString() !== req.userId) {
      console.log('DELETE /api/subscriptions/:id: Нет доступа, userId:', req.userId, 'creatorId:', subscriptionLevel.creatorId);
      return res.status(403).json({ error: 'Нет доступа' });
    }

    await subscriptionLevel.deleteOne();
    res.json({ message: 'Подписка удалена' });
  } catch (error) {
    console.log('DELETE /api/subscriptions/:id: Ошибка:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// Покупка подписки
app.post('/api/subscriptions/:id/purchase', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const subscriptionLevel = await SubscriptionLevel.findById(req.params.id).populate('creatorId');
    if (!user) {
      console.log('POST /api/subscriptions/:id/purchase: Пользователь не найден, userId:', req.userId);
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    if (!subscriptionLevel) {
      console.log('POST /api/subscriptions/:id/purchase: Подписка не найдена, id:', req.params.id);
      return res.status(404).json({ error: 'Подписка не найдена' });
    }

    if (user.credits < subscriptionLevel.price) {
      console.log('POST /api/subscriptions/:id/purchase: Недостаточно кредитов, userId:', req.userId);
      return res.status(400).json({ error: 'Недостаточно кредитов' });
    }

    // Проверяем, не куплена ли подписка
    if (user.purchasedSubscriptions.includes(subscriptionLevel._id)) {
      console.log('POST /api/subscriptions/:id/purchase: Подписка уже куплена, userId:', req.userId);
      return res.status(400).json({ error: 'Подписка уже куплена' });
    }

    // Вычитаем кредиты у покупателя
    user.credits -= subscriptionLevel.price;
    user.purchasedSubscriptions.push(subscriptionLevel._id);

    // Начисляем кредиты создателю подписки
    const creator = await User.findById(subscriptionLevel.creatorId);
    if (!creator) {
      console.log('POST /api/subscriptions/:id/purchase: Создатель не найден, creatorId:', subscriptionLevel.creatorId);
      return res.status(404).json({ error: 'Создатель подписки не найден' });
    }
    creator.credits += subscriptionLevel.price;
    await creator.save();

    await user.save();

    const updatedUser = await User.findById(req.userId).select('-password').populate('purchasedSubscriptions');
    res.json({ message: 'Подписка приобретена', user: updatedUser });
  } catch (error) {
    console.log('POST /api/subscriptions/:id/purchase: Ошибка:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// Получение купленных подписок пользователя
app.get('/api/subscriptions/purchased', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('purchasedSubscriptions').populate({
      path: 'purchasedSubscriptions',
      populate: { path: 'creatorId', select: 'username avatar _id' },
    });
    if (!user) {
      console.log('GET /api/subscriptions/purchased: Пользователь не найден, userId:', req.userId);
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json(user.purchasedSubscriptions || []);
  } catch (error) {
    console.log('GET /api/subscriptions/purchased: Ошибка:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// Получение уровней подписки текущего пользователя
app.get('/api/subscriptions', authMiddleware, async (req, res) => {
  try {
    const subscriptionLevels = await SubscriptionLevel.find({ creatorId: req.userId });
    res.json(subscriptionLevels);
  } catch (error) {
    console.log('GET /api/subscriptions: Ошибка:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// Получение уровней подписки другого пользователя
app.get('/api/users/:id/subscriptions', async (req, res) => {
  try {
    const subscriptionLevels = await SubscriptionLevel.find({ creatorId: req.params.id });
    res.json(subscriptionLevels);
  } catch (error) {
    console.log('GET /api/users/:id/subscriptions: Ошибка:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// Создание поста с медиа
app.post('/api/posts', authMiddleware, upload.array('media', 5), async (req, res) => {
  try {
    const { title, content, subscriptionLevel } = req.body;
    const media = req.files.map(file => file.path); // URLs от Cloudinary
    const post = new Post({
      title,
      content,
      userId: req.userId,
      subscriptionLevel: subscriptionLevel || null,
      media,
      likes: [],
    });
    await post.save();
    const populatedPost = await Post.findById(post._id).populate('subscriptionLevel').populate('userId', 'username _id avatar');
    res.status(201).json({ message: 'Пост создан', post: populatedPost });
  } catch (error) {
    console.log('POST /api/posts: Ошибка:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// Редактирование поста
app.put('/api/posts/:id', authMiddleware, upload.array('media', 5), async (req, res) => {
  try {
    const { title, content, subscriptionLevel } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post) {
      console.log('PUT /api/posts/:id: Пост не найден, postId:', req.params.id);
      return res.status(404).json({ error: 'Пост не найден' });
    }
    if (post.userId.toString() !== req.userId) {
      console.log('PUT /api/posts/:id: Нет доступа, userId:', req.userId, 'post.userId:', post.userId);
      return res.status(403).json({ error: 'Нет доступа' });
    }

    post.title = title || post.title;
    post.content = content || post.content;
    post.subscriptionLevel = subscriptionLevel === '' ? null : subscriptionLevel || post.subscriptionLevel;
    if (req.files.length > 0) {
      post.media = req.files.map(file => file.path); // Используем Cloudinary URL
      console.log('Updated post media URLs:', post.media);
    }

    await post.save();
    const populatedPost = await Post.findById(post._id).populate('subscriptionLevel').populate('userId', 'username _id avatar');
    res.json({ message: 'Пост обновлён', post: populatedPost });
  } catch (error) {
    console.log('PUT /api/posts/:id: Ошибка:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// Удаление поста
app.delete('/api/posts/:id', authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      console.log('DELETE /api/posts/:id: Пост не найден, postId:', req.params.id);
      return res.status(404).json({ error: 'Пост не найден' });
    }
    if (post.userId.toString() !== req.userId) {
      console.log('DELETE /api/posts/:id: Нет доступа, userId:', req.userId, 'post.userId:', post.userId);
      return res.status(403).json({ error: 'Нет доступа' });
    }

    await post.deleteOne();
    res.json({ message: 'Пост удалён' });
  } catch (error) {
    console.log('DELETE /api/posts/:id: Ошибка:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// Получение постов пользователя
app.get('/api/posts', authMiddleware, async (req, res) => {
  try {
    const posts = await Post.find({ userId: req.userId })
      .populate('subscriptionLevel')
      .populate('userId', 'username _id avatar')
      .sort({ createdAt: -1 });
    res.json(posts);
  } catch (error) {
    console.log('GET /api/posts: Ошибка:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// Получение постов другого пользователя
app.get('/api/users/:id/posts', authMiddleware, async (req, res) => {
  try {
    const posts = await Post.find({ userId: req.params.id })
      .populate('subscriptionLevel')
      .populate('userId', 'username _id avatar')
      .sort({ createdAt: -1 });
    res.json(posts);
  } catch (error) {
    console.log('GET /api/users/:id/posts: Ошибка:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// Получение популярных постов
app.get('/api/posts/popular', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('purchasedSubscriptions');
    if (!user) {
      console.log('GET /api/posts/popular: Пользователь не найден, userId:', req.userId);
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const posts = await Post.find({
      $or: [
        { subscriptionLevel: null },
        { subscriptionLevel: { $in: user.purchasedSubscriptions } },
        { userId: req.userId },
      ],
    })
      .populate('subscriptionLevel')
      .populate('userId', 'username _id avatar')
      .sort({ likes: -1 })
      .limit(10);
    res.json(posts);
  } catch (error) {
    console.log('GET /api/posts/popular: Ошибка:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// Получение новых постов
app.get('/api/posts/new', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('purchasedSubscriptions');
    if (!user) {
      console.log('GET /api/posts/new: Пользователь не найден, userId:', req.userId);
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const posts = await Post.find({
      $or: [
        { subscriptionLevel: null },
        { subscriptionLevel: { $in: user.purchasedSubscriptions } },
        { userId: req.userId },
      ],
    })
      .populate('subscriptionLevel')
      .populate('userId', 'username _id avatar')
      .sort({ createdAt: -1 })
      .limit(10);
    res.json(posts);
  } catch (error) {
    console.log('GET /api/posts/new: Ошибка:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// Получение трендовых постов
app.get('/api/posts/trending', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('purchasedSubscriptions');
    if (!user) {
      console.log('GET /api/posts/trending: Пользователь не найден, userId:', req.userId);
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const posts = await Post.find({
      $or: [
        { subscriptionLevel: null },
        { subscriptionLevel: { $in: user.purchasedSubscriptions } },
        { userId: req.userId },
      ],
    })
      .populate('subscriptionLevel')
      .populate('userId', 'username _id avatar')
      .sort({ likes: -1, createdAt: -1 })
      .limit(10);
    res.json(posts);
  } catch (error) {
    console.log('GET /api/posts/trending: Ошибка:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// Создание комментария
app.post('/api/comments', authMiddleware, async (req, res) => {
  try {
    const { content, postId } = req.body;
    if (!content || !postId) {
      console.log('POST /api/comments: Требуется текст и postId');
      return res.status(400).json({ error: 'Требуется текст комментария и ID поста' });
    }

    const comment = new Comment({
      content,
      userId: req.userId,
      postId,
    });
    await comment.save();
    const populatedComment = await Comment.findById(comment._id).populate('userId', 'username avatar _id');
    res.status(201).json({ message: 'Комментарий добавлен', comment: populatedComment });
  } catch (error) {
    console.log('POST /api/comments: Ошибка:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// Получение комментариев к посту
app.get('/api/posts/:id/comments', authMiddleware, async (req, res) => {
  try {
    const comments = await Comment.find({ postId: req.params.id })
      .populate('userId', 'username avatar _id')
      .sort({ createdAt: -1 });
    res.json(comments);
  } catch (error) {
    console.log('GET /api/posts/:id/comments: Ошибка:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// Лайк/анлайк поста
app.post('/api/posts/:id/like', authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      console.log('POST /api/posts/:id/like: Пост не найден, postId:', req.params.id);
      return res.status(404).json({ error: 'Пост не найден' });
    }

    const userId = req.userId;
    const index = post.likes.indexOf(userId);
    if (index === -1) {
      post.likes.push(userId);
    } else {
      post.likes.splice(index, 1);
    }

    await post.save();
    res.json({ message: 'Лайк обновлён', likes: post.likes });
  } catch (error) {
    console.log('POST /api/posts/:id/like: Ошибка:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// Получение случайных пользователей
app.get('/api/users/random', async (req, res) => {
  try {
    const users = await User.find().select('username avatar _id description email');
    const randomUsers = users.sort(() => 0.5 - Math.random()).slice(0, 3);
    res.json(randomUsers);
  } catch (error) {
    console.log('GET /api/users/random: Ошибка:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// Получение данных пользователя по ID
app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('username avatar cover description email purchasedSubscriptions').populate('purchasedSubscriptions');
    if (!user) {
      console.log('GET /api/users/:id: Пользователь не найден, userId:', req.params.id);
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    res.json(user);
  } catch (error) {
    console.log('GET /api/users/:id: Ошибка:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// Получение списка диалогов пользователя
app.get('/api/dialogs', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const messages = await Message.find({
      $or: [{ userId }, { recipientId: userId }],
    })
      .populate('userId', 'username avatar _id')
      .populate('recipientId', 'username avatar _id')
      .sort({ createdAt: -1 });

    // Группировка по собеседнику
    const dialogs = {};
    messages.forEach((msg) => {
      const otherUserId = msg.userId._id.toString() === userId ? msg.recipientId._id.toString() : msg.userId._id.toString();
      if (!dialogs[otherUserId]) {
        dialogs[otherUserId] = {
          user: msg.userId._id.toString() === userId ? msg.recipientId : msg.userId,
          lastMessage: msg.content,
          createdAt: msg.createdAt,
        };
      }
    });

    res.json(Object.values(dialogs));
  } catch (error) {
    console.log('GET /api/dialogs: Ошибка:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// Получение сообщений диалога
app.get('/api/messages/:recipientId', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const recipientId = req.params.recipientId;
    const messages = await Message.find({
      $or: [
        { userId, recipientId },
        { userId: recipientId, recipientId: userId },
      ],
    })
      .populate('userId', 'username avatar _id')
      .populate('recipientId', 'username avatar _id')
      .sort({ createdAt: 1 })
      .limit(50);
    res.json(messages);
  } catch (error) {
    console.log('GET /api/messages/:recipientId: Ошибка:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// Получение всех сообщений (для текущего Chat.tsx)
app.get('/api/messages', authMiddleware, async (req, res) => {
  try {
    const messages = await Message.find({ userId: req.userId })
      .populate('userId', 'username avatar _id')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(messages);
  } catch (error) {
    console.log('GET /api/messages: Ошибка:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// Запуск HTTP-сервера
const PORT = 5000;
const server = app.listen(PORT, () => console.log(`HTTP-сервер запущен на порту ${PORT}`));

// Настройка WebSocket-сервера
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('WebSocket-клиент подключён');
  ws.on('message', async (message) => {
    try {
      const parsedMessage = JSON.parse(message);
      const { token, content, recipientId } = parsedMessage;
      console.log('WebSocket received:', { token, content, recipientId });

      if (!token || !content || !recipientId) {
        console.log('WebSocket: Требуется токен, текст и recipientId');
        ws.send(JSON.stringify({ error: 'Требуется токен, текст сообщения и ID получателя' }));
        return;
      }

      // Проверка токена
      const decoded = jwt.verify(token, 'secret_key');
      const userId = decoded.userId;
      const user = await User.findById(userId).select('username avatar _id');
      if (!user) {
        console.log('WebSocket: Пользователь не найден, userId:', userId);
        ws.send(JSON.stringify({ error: 'Пользователь не найден' }));
        return;
      }

      // Проверка получателя
      const recipient = await User.findById(recipientId);
      if (!recipient) {
        console.log('WebSocket: Получатель не найден, recipientId:', recipientId);
        ws.send(JSON.stringify({ error: 'Получатель не найден' }));
        return;
      }

      // Сохранение сообщения
      const newMessage = new Message({
        content,
        userId,
        recipientId,
      });
      await newMessage.save();
      const populatedMessage = await Message.findById(newMessage._id)
        .populate('userId', 'username avatar _id')
        .populate('recipientId', 'username avatar _id');

      console.log('WebSocket: Сообщение сохранено и отправлено:', populatedMessage);

      // Рассылка сообщения
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(populatedMessage));
        }
      });
    } catch (error) {
      console.error('WebSocket error:', error.message);
      ws.send(JSON.stringify({ error: 'Ошибка обработки сообщения' }));
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });

  ws.on('close', () => {
    console.log('WebSocket-клиент отключён');
  });
});