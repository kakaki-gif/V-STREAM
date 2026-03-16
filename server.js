// ============================================================
// AFRISTREAM — BACKEND COMPLET
// Node.js + Express + MongoDB + Socket.IO
// Auteur: Urek Digital — Lomé, Togo
// ============================================================

const express      = require('express');
const http         = require('http');
const mongoose     = require('mongoose');
const bcrypt       = require('bcryptjs');
const jwt          = require('jsonwebtoken');
const multer       = require('multer');
const cors         = require('cors');
const rateLimit    = require('express-rate-limit');
const { Server }   = require('socket.io');
const cloudinary   = require('cloudinary').v2;
const crypto       = require('crypto');
const path         = require('path');
const fs           = require('fs');
require('dotenv').config();

// ─────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────
const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL || '*', methods: ['GET','POST'] }
});

const PORT = process.env.PORT || process.env.RAILWAY_PORT || 3000;
const JWT_SECRET    = process.env.JWT_SECRET || 'afristream_dev_secret_2025';
const JWT_EXPIRES   = '7d';
const PLATFORM_FEE  = parseFloat(process.env.PLATFORM_FEE || '0.10');

cloudinary.config({
  cloud_name : process.env.CLOUDINARY_CLOUD_NAME,
  api_key    : process.env.CLOUDINARY_API_KEY,
  api_secret : process.env.CLOUDINARY_API_SECRET,
});

// ─────────────────────────────────────────
// MIDDLEWARES
// ─────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const globalLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
const authLimit   = rateLimit({ windowMs: 60 * 60 * 1000, max: 15 });
app.use('/api/', globalLimit);
app.use('/api/auth/', authLimit);

// ─────────────────────────────────────────
// MODÈLES MONGOOSE
// ─────────────────────────────────────────

// ── USER ──
const userSchema = new mongoose.Schema({
  name:       { type: String, required: true, trim: true, maxlength: 100 },
  email:      { type: String, required: true, unique: true, lowercase: true },
  password:   { type: String, required: true, select: false },
  role:       { type: String, enum: ['user','creator','moderator','admin'], default: 'user' },
  avatar:     { type: String, default: '' },
  banner:     { type: String, default: '' },
  bio:        { type: String, maxlength: 500, default: '' },
  country:    { type: String, default: '' },
  verified:   { type: Boolean, default: false },
  suspended:  { type: Boolean, default: false },
  suspendReason: { type: String, default: '' },
  subscriberCount: { type: Number, default: 0 },
  subscribers:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  subscriptions:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  wallet:     { type: mongoose.Schema.Types.ObjectId, ref: 'Wallet' },
  settings: {
    theme:       { type: String, default: 'dark' },
    accentColor: { type: String, default: '#FF6B35' },
    notifications: {
      newVideo:     { type: Boolean, default: true },
      comments:     { type: Boolean, default: true },
      tips:         { type: Boolean, default: true },
      subscriptions:{ type: Boolean, default: true },
    }
  },
  lastSeen: { type: Date, default: Date.now },
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});
userSchema.methods.checkPassword = function(candidate) {
  return bcrypt.compare(candidate, this.password);
};

const User = mongoose.model('User', userSchema);

// ── VIDEO ──
const videoSchema = new mongoose.Schema({
  title:       { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, maxlength: 5000, default: '' },
  creator:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  url:         { type: String, default: '' },
  thumbnailUrl:{ type: String, default: '' },
  duration:    { type: Number, default: 0 },
  category:    { type: String, required: true },
  tags:        [{ type: String, maxlength: 50 }],
  hashtags:    [{ type: String, maxlength: 50 }],
  status:      { type: String, enum: ['processing','active','hidden','deleted'], default: 'processing' },
  visibility:  { type: String, enum: ['public','premium','private'], default: 'public' },
  premium: {
    enabled:             { type: Boolean, default: false },
    price:               { type: Number, default: 0 },
    makePublicAfterDays: { type: Number, default: null },
    publicAfterDate:     { type: Date, default: null },
  },
  live: {
    active:    { type: Boolean, default: false },
    streamKey: { type: String, select: false },
    viewers:   { type: Number, default: 0 },
    startedAt: { type: Date },
    isPaid:    { type: Boolean, default: false },
    price:     { type: Number, default: 0 },
  },
  views:       { type: Number, default: 0 },
  likes:       [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  saves:       [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  commentCount:{ type: Number, default: 0 },
  reportCount: { type: Number, default: 0 },
  reports: [{
    user:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: String,
    date:   { type: Date, default: Date.now }
  }],
  earnings: { type: Number, default: 0 },
}, { timestamps: true });

videoSchema.index({ title: 'text', description: 'text', tags: 'text', hashtags: 'text' });
videoSchema.index({ creator: 1, status: 1 });
videoSchema.index({ views: -1, createdAt: -1 });

const Video = mongoose.model('Video', videoSchema);

// ── COMMENT ──
const commentSchema = new mongoose.Schema({
  video:   { type: mongoose.Schema.Types.ObjectId, ref: 'Video', required: true },
  user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text:    { type: String, required: true, maxlength: 2000 },
  parent:  { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
  likes:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  edited:  { type: Boolean, default: false },
  deleted: { type: Boolean, default: false },
}, { timestamps: true });

const Comment = mongoose.model('Comment', commentSchema);

// ── WALLET ──
const walletSchema = new mongoose.Schema({
  user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  balance: { type: Number, default: 0 },
  currency:{ type: String, default: 'XOF' },
  totalEarned:   { type: Number, default: 0 },
  totalWithdrawn:{ type: Number, default: 0 },
  transactions: [{
    type:          { type: String, enum: ['deposit','withdrawal','tip_sent','tip_received','premium_purchase','premium_sale','subscription'] },
    amount:        Number,
    fee:           { type: Number, default: 0 },
    net:           Number,
    description:   String,
    reference:     String,
    status:        { type: String, enum: ['pending','completed','failed'], default: 'completed' },
    paymentMethod: String,
    createdAt:     { type: Date, default: Date.now }
  }],
}, { timestamps: true });

const Wallet = mongoose.model('Wallet', walletSchema);

// ── TIP ──
const tipSchema = new mongoose.Schema({
  from:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  to:            { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  video:         { type: mongoose.Schema.Types.ObjectId, ref: 'Video' },
  amount:        { type: Number, required: true, min: 50 },
  platformFee:   { type: Number, required: true },
  netAmount:     { type: Number, required: true },
  currency:      { type: String, default: 'XOF' },
  paymentMethod: { type: String, enum: ['wallet','momo','card'], required: true },
  status:        { type: String, enum: ['pending','completed','failed'], default: 'pending' },
  message:       { type: String, maxlength: 200 },
}, { timestamps: true });

const Tip = mongoose.model('Tip', tipSchema);

// ── NOTIFICATION ──
const notifSchema = new mongoose.Schema({
  user:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type:  { type: String, enum: ['new_video','comment','reply','tip','subscription','premium_purchase','live_start'], required: true },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  video: { type: mongoose.Schema.Types.ObjectId, ref: 'Video' },
  data:  mongoose.Schema.Types.Mixed,
  read:  { type: Boolean, default: false },
}, { timestamps: true });

notifSchema.index({ user: 1, read: 1, createdAt: -1 });
const Notification = mongoose.model('Notification', notifSchema);

// ── MESSAGE / CONVERSATION ──
const conversationSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  lastMessage:  { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  lastActivity: { type: Date, default: Date.now },
}, { timestamps: true });

const Conversation = mongoose.model('Conversation', conversationSchema);

const messageSchema = new mongoose.Schema({
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  sender:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content:      { type: String, maxlength: 5000 },
  mediaUrl:     String,
  mediaType:    { type: String, enum: ['image','video','document','none'], default: 'none' },
  readBy:       [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  edited:       { type: Boolean, default: false },
  deleted:      { type: Boolean, default: false },
}, { timestamps: true });

const Message = mongoose.model('Message', messageSchema);

// ── VIEW LOG (anti-fraude) ──
const viewLogSchema = new mongoose.Schema({
  video:       { type: mongoose.Schema.Types.ObjectId, ref: 'Video', required: true },
  fingerprint: { type: String, required: true },
  ip:          String,
  createdAt:   { type: Date, default: Date.now, expires: 86400 }
});
viewLogSchema.index({ video: 1, fingerprint: 1 }, { unique: true });
const ViewLog = mongoose.model('ViewLog', viewLogSchema);

// ─────────────────────────────────────────
// HELPERS JWT
// ─────────────────────────────────────────
const signToken = (id, role) => jwt.sign({ id, role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

// ─────────────────────────────────────────
// MIDDLEWARES AUTH
// ─────────────────────────────────────────
async function protect(req, res, next) {
  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Non authentifié' });
    const decoded = jwt.verify(auth.split(' ')[1], JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user || user.suspended) return res.status(401).json({ error: 'Compte invalide ou suspendu' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Token invalide' });
  }
}

function restrict(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role))
      return res.status(403).json({ error: 'Accès refusé' });
    next();
  };
}

// ─────────────────────────────────────────
// HELPER NOTIFICATION
// ─────────────────────────────────────────
async function notify(userId, type, actorId, videoId, data = {}) {
  try {
    const notif = await Notification.create({ user: userId, type, actor: actorId, video: videoId, data });
    io.to(`user_${userId}`).emit('notification', notif);
  } catch (e) { console.error('Notification error:', e.message); }
}

// ─────────────────────────────────────────
// UPLOAD MULTER
// ─────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'uploads', 'temp');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${path.extname(file.originalname)}`);
  }
});

const videoUpload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ok = ['video/mp4','video/webm','video/ogg','video/quicktime','video/x-msvideo'];
    cb(null, ok.includes(file.mimetype));
  },
  limits: { fileSize: 2 * 1024 * 1024 * 1024 }
});

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

// ─────────────────────────────────────────
// ROUTES AUTH
// ─────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Champs requis manquants' });
    if (password.length < 8)          return res.status(400).json({ error: 'Mot de passe trop court (8 min)' });
    if (await User.findOne({ email })) return res.status(409).json({ error: 'Email déjà utilisé' });

    const user   = await User.create({ name, email, password, role: ['user','creator'].includes(role) ? role : 'user' });
    const wallet = await Wallet.create({ user: user._id });
    await User.findByIdAndUpdate(user._id, { wallet: wallet._id });

    res.status(201).json({ token: signToken(user._id, user.role), user: { id: user._id, name, email, role: user.role } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis' });
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.checkPassword(password)))
      return res.status(401).json({ error: 'Identifiants invalides' });
    if (user.suspended) return res.status(403).json({ error: `Compte suspendu: ${user.suspendReason}` });
    await User.findByIdAndUpdate(user._id, { lastSeen: Date.now() });
    res.json({ token: signToken(user._id, user.role), user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/auth/me', protect, (req, res) => res.json({ user: req.user }));

// ─────────────────────────────────────────
// ROUTES USERS
// ─────────────────────────────────────────
app.get('/api/users/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    res.json({ user });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/users/profile', protect, imageUpload.fields([{ name:'avatar',maxCount:1 },{ name:'banner',maxCount:1 }]), async (req, res) => {
  try {
    const updates = {};
    ['name','bio','country'].forEach(f => { if (req.body[f]) updates[f] = req.body[f]; });

    if (req.files?.avatar) {
      const r = await new Promise((res, rej) => {
        const stream = cloudinary.uploader.upload_stream({ folder: 'afristream/avatars' }, (e, r) => e ? rej(e) : res(r));
        stream.end(req.files.avatar[0].buffer);
      });
      updates.avatar = r.secure_url;
    }
    if (req.files?.banner) {
      const r = await new Promise((res, rej) => {
        const stream = cloudinary.uploader.upload_stream({ folder: 'afristream/banners' }, (e, r) => e ? rej(e) : res(r));
        stream.end(req.files.banner[0].buffer);
      });
      updates.banner = r.secure_url;
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
    res.json({ user });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/users/:id/subscribe', protect, async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString())
      return res.status(400).json({ error: 'Impossible de s\'abonner à soi-même' });
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ error: 'Utilisateur non trouvé' });

    const already = target.subscribers.map(s => s.toString()).includes(req.user._id.toString());
    if (already) {
      await User.findByIdAndUpdate(req.params.id, { $pull: { subscribers: req.user._id }, $inc: { subscriberCount: -1 } });
      await User.findByIdAndUpdate(req.user._id, { $pull: { subscriptions: req.params.id } });
      return res.json({ subscribed: false });
    }
    await User.findByIdAndUpdate(req.params.id, { $addToSet: { subscribers: req.user._id }, $inc: { subscriberCount: 1 } });
    await User.findByIdAndUpdate(req.user._id, { $addToSet: { subscriptions: req.params.id } });
    await notify(req.params.id, 'subscription', req.user._id, null);
    res.json({ subscribed: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─────────────────────────────────────────
// ROUTES VIDÉOS
// ─────────────────────────────────────────
app.post('/api/videos/upload', protect, restrict('creator','admin'), videoUpload.single('video'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Fichier vidéo requis' });
    const { title, description, category, tags, hashtags, isPremium, premiumPrice, makePublicAfterDays } = req.body;

    const video = await Video.create({
      title, description, creator: req.user._id, category,
      tags: tags ? JSON.parse(tags) : [],
      hashtags: hashtags ? JSON.parse(hashtags) : [],
      status: 'processing',
      premium: {
        enabled: isPremium === 'true',
        price: isPremium === 'true' ? parseInt(premiumPrice) || 0 : 0,
        makePublicAfterDays: makePublicAfterDays ? parseInt(makePublicAfterDays) : null,
      }
    });

    res.status(202).json({ message: 'Vidéo en cours de traitement', videoId: video._id });

    // Upload async vers Cloudinary
    cloudinary.uploader.upload(req.file.path, {
      resource_type: 'video',
      folder: 'afristream/videos',
      public_id: `video_${video._id}`,
    }).then(async (result) => {
      await Video.findByIdAndUpdate(video._id, {
        url: result.secure_url,
        duration: Math.round(result.duration || 0),
        status: 'active',
        visibility: isPremium === 'true' ? 'premium' : 'public',
      });
      fs.unlinkSync(req.file.path);
      // Notifier les abonnés
      const creator = await User.findById(req.user._id).select('subscribers');
      if (creator?.subscribers?.length) {
        for (const subId of creator.subscribers) {
          await notify(subId, 'new_video', req.user._id, video._id);
        }
      }
    }).catch(async err => {
      console.error('Upload Cloudinary échoué:', err.message);
      await Video.findByIdAndUpdate(video._id, { status: 'deleted' });
    });

  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/videos', async (req, res) => {
  try {
    const { page = 1, limit = 20, category, sort = 'recent', search } = req.query;
    const query = { status: 'active' };
    if (category) query.category = category;
    if (search)   query.$text = { $search: search };

    const sortMap = { recent: { createdAt: -1 }, trending: { views: -1 }, likes: { 'likes': -1 } };
    const sortObj = sortMap[sort] || { createdAt: -1 };
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [videos, total] = await Promise.all([
      Video.find(query).sort(sortObj).skip(skip).limit(parseInt(limit))
        .populate('creator', 'name avatar verified subscriberCount'),
      Video.countDocuments(query)
    ]);

    res.json({ videos, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/videos/:id', async (req, res) => {
  try {
    const video = await Video.findById(req.params.id)
      .populate('creator', 'name avatar verified subscriberCount bio');
    if (!video || video.status === 'deleted') return res.status(404).json({ error: 'Vidéo non trouvée' });
    res.json({ video });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Compteur vues anti-fraude
app.post('/api/videos/:id/view', async (req, res) => {
  try {
    let userId = null;
    try {
      const auth = req.headers.authorization;
      if (auth?.startsWith('Bearer ')) userId = jwt.verify(auth.split(' ')[1], JWT_SECRET)?.id;
    } catch {}

    const rawKey    = userId ? `${userId}_${req.params.id}` : `${req.ip}_${(req.headers['user-agent']||'').slice(0,100)}_${req.params.id}`;
    const fingerprint = crypto.createHash('sha256').update(rawKey).digest('hex');

    const isNew = await ViewLog.create({ video: req.params.id, fingerprint, ip: req.ip })
      .then(() => true).catch(() => false);

    if (isNew) await Video.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });
    res.json({ counted: isNew });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/videos/:id/like', protect, async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ error: 'Vidéo non trouvée' });
    const liked = video.likes.map(l => l.toString()).includes(req.user._id.toString());
    await Video.findByIdAndUpdate(req.params.id, liked ? { $pull: { likes: req.user._id } } : { $addToSet: { likes: req.user._id } });
    res.json({ liked: !liked });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/videos/:id/save', protect, async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ error: 'Vidéo non trouvée' });
    const saved = video.saves.map(s => s.toString()).includes(req.user._id.toString());
    await Video.findByIdAndUpdate(req.params.id, saved ? { $pull: { saves: req.user._id } } : { $addToSet: { saves: req.user._id } });
    res.json({ saved: !saved });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/videos/:id/report', protect, async (req, res) => {
  try {
    const { reason } = req.body;
    await Video.findByIdAndUpdate(req.params.id, {
      $inc: { reportCount: 1 },
      $push: { reports: { user: req.user._id, reason } }
    });
    const video = await Video.findById(req.params.id);
    if (video?.reportCount >= 10) await Video.findByIdAndUpdate(req.params.id, { status: 'hidden' });
    res.json({ message: 'Signalement envoyé' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/videos/:id', protect, async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ error: 'Vidéo non trouvée' });
    if (video.creator.toString() !== req.user._id.toString() && req.user.role !== 'admin')
      return res.status(403).json({ error: 'Non autorisé' });
    await Video.findByIdAndUpdate(req.params.id, { status: 'deleted' });
    res.json({ message: 'Vidéo supprimée' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─────────────────────────────────────────
// ROUTES COMMENTAIRES
// ─────────────────────────────────────────
app.get('/api/videos/:id/comments', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const comments = await Comment.find({ video: req.params.id, parent: null, deleted: false })
      .sort({ createdAt: -1 })
      .skip((page-1)*limit).limit(parseInt(limit))
      .populate('user', 'name avatar verified');
    res.json({ comments });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/videos/:id/comments', protect, async (req, res) => {
  try {
    const { text, parentId } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'Commentaire vide' });

    const recent = await Comment.countDocuments({ user: req.user._id, createdAt: { $gt: new Date(Date.now() - 60000) } });
    if (recent >= 5) return res.status(429).json({ error: 'Trop de commentaires. Attend 1 minute.' });

    const comment = await Comment.create({ video: req.params.id, user: req.user._id, text: text.trim(), parent: parentId || null });
    await Video.findByIdAndUpdate(req.params.id, { $inc: { commentCount: 1 } });
    const populated = await Comment.findById(comment._id).populate('user', 'name avatar verified');

    const video = await Video.findById(req.params.id).select('creator');
    if (video && video.creator.toString() !== req.user._id.toString()) {
      await notify(video.creator, 'comment', req.user._id, req.params.id);
    }

    io.to(`video_${req.params.id}`).emit('new_comment', populated);
    res.status(201).json({ comment: populated });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/comments/:id', protect, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ error: 'Commentaire non trouvé' });
    if (comment.user.toString() !== req.user._id.toString() && !['admin','moderator'].includes(req.user.role))
      return res.status(403).json({ error: 'Non autorisé' });
    await Comment.findByIdAndUpdate(req.params.id, { deleted: true });
    res.json({ message: 'Commentaire supprimé' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─────────────────────────────────────────
// ROUTES POURBOIRES (TIPS)
// ─────────────────────────────────────────
app.post('/api/tips', protect, async (req, res) => {
  try {
    const { toUserId, videoId, amount, paymentMethod, message } = req.body;
    if (!amount || amount < 50) return res.status(400).json({ error: 'Montant minimum: 50 FCFA' });

    const fee = Math.round(amount * PLATFORM_FEE);
    const net = amount - fee;

    if (paymentMethod === 'wallet') {
      const wallet = await Wallet.findOne({ user: req.user._id });
      if (!wallet || wallet.balance < amount) return res.status(400).json({ error: 'Solde insuffisant' });
      await Wallet.findOneAndUpdate({ user: req.user._id }, {
        $inc: { balance: -amount },
        $push: { transactions: { type:'tip_sent', amount:-amount, fee:0, net:-amount, description:`Pourboire envoyé`, paymentMethod:'wallet' } }
      });
    }

    const tip = await Tip.create({ from: req.user._id, to: toUserId, video: videoId, amount, platformFee: fee, netAmount: net, paymentMethod, message, status:'completed' });

    await Wallet.findOneAndUpdate({ user: toUserId }, {
      $inc: { balance: net, totalEarned: net },
      $push: { transactions: { type:'tip_received', amount:net, fee, net, description:`Pourboire reçu de ${req.user.name}`, paymentMethod:'wallet' } }
    });

    if (videoId) await Video.findByIdAndUpdate(videoId, { $inc: { earnings: net } });
    await notify(toUserId, 'tip', req.user._id, videoId, { amount, net });

    res.status(201).json({ tip, message: `Pourboire de ${amount.toLocaleString()} FCFA envoyé!` });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─────────────────────────────────────────
// ROUTES WALLET
// ─────────────────────────────────────────
app.get('/api/wallet', protect, async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ user: req.user._id });
    if (!wallet) return res.status(404).json({ error: 'Wallet non trouvé' });
    res.json({ balance: wallet.balance, totalEarned: wallet.totalEarned, totalWithdrawn: wallet.totalWithdrawn, transactions: wallet.transactions.slice(-50).reverse() });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/wallet/deposit', protect, async (req, res) => {
  try {
    const { amount, paymentMethod } = req.body;
    if (!amount || amount < 100) return res.status(400).json({ error: 'Montant minimum: 100 FCFA' });
    const reference = `DEP_${Date.now()}_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    // ICI: intégrer CinetPay / Wave / Flooz selon paymentMethod
    await Wallet.findOneAndUpdate({ user: req.user._id }, {
      $inc: { balance: amount },
      $push: { transactions: { type:'deposit', amount, fee:0, net:amount, description:`Rechargement ${paymentMethod}`, reference, paymentMethod } }
    });
    res.json({ message: `${amount.toLocaleString()} FCFA rechargés!`, reference });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/wallet/withdraw', protect, async (req, res) => {
  try {
    const { amount, paymentMethod, destination } = req.body;
    if (!amount || amount < 1000) return res.status(400).json({ error: 'Retrait minimum: 1,000 FCFA' });
    const fee   = Math.round(amount * 0.02);
    const total = amount + fee;
    const wallet = await Wallet.findOne({ user: req.user._id });
    if (!wallet || wallet.balance < total) return res.status(400).json({ error: 'Solde insuffisant (frais inclus)' });
    const reference = `WIT_${Date.now()}_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    // ICI: intégrer paiement sortant MoMo
    await Wallet.findOneAndUpdate({ user: req.user._id }, {
      $inc: { balance: -total, totalWithdrawn: amount },
      $push: { transactions: { type:'withdrawal', amount:-total, fee, net:-amount, description:`Retrait ${paymentMethod}`, reference, status:'pending', paymentMethod } }
    });
    res.json({ message: 'Retrait en cours — traitement sous 24h', reference, amount, fee });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─────────────────────────────────────────
// ROUTES NOTIFICATIONS
// ─────────────────────────────────────────
app.get('/api/notifications', protect, async (req, res) => {
  try {
    const [notifications, unread] = await Promise.all([
      Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50)
        .populate('actor', 'name avatar')
        .populate('video', 'title thumbnailUrl'),
      Notification.countDocuments({ user: req.user._id, read: false })
    ]);
    res.json({ notifications, unread });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/notifications/read-all', protect, async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
    res.json({ message: 'Toutes notifications lues' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─────────────────────────────────────────
// ROUTES MESSAGERIE
// ─────────────────────────────────────────
app.get('/api/conversations', protect, async (req, res) => {
  try {
    const convs = await Conversation.find({ participants: req.user._id })
      .sort({ lastActivity: -1 })
      .populate('participants', 'name avatar lastSeen')
      .populate('lastMessage', 'content createdAt');
    res.json({ conversations: convs });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/conversations', protect, async (req, res) => {
  try {
    const { recipientId } = req.body;
    let conv = await Conversation.findOne({ participants: { $all: [req.user._id, recipientId], $size: 2 } });
    if (!conv) conv = await Conversation.create({ participants: [req.user._id, recipientId] });
    res.json({ conversation: conv });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/conversations/:id/messages', protect, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const messages = await Message.find({ conversation: req.params.id, deleted: false })
      .sort({ createdAt: -1 }).skip((page-1)*limit).limit(parseInt(limit))
      .populate('sender', 'name avatar');
    res.json({ messages: messages.reverse() });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/conversations/:id/messages', protect, async (req, res) => {
  try {
    const { content, mediaUrl, mediaType } = req.body;
    if (!content?.trim() && !mediaUrl) return res.status(400).json({ error: 'Message vide' });

    const conv = await Conversation.findById(req.params.id);
    if (!conv?.participants.map(p => p.toString()).includes(req.user._id.toString()))
      return res.status(403).json({ error: 'Accès refusé' });

    const msg = await Message.create({ conversation: req.params.id, sender: req.user._id, content: content?.trim(), mediaUrl, mediaType: mediaType || 'none', readBy: [req.user._id] });
    await Conversation.findByIdAndUpdate(req.params.id, { lastMessage: msg._id, lastActivity: new Date() });

    const populated = await Message.findById(msg._id).populate('sender', 'name avatar');
    conv.participants.forEach(pId => {
      if (pId.toString() !== req.user._id.toString()) {
        io.to(`user_${pId}`).emit('new_message', { conversation: req.params.id, message: populated });
      }
    });
    res.status(201).json({ message: populated });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─────────────────────────────────────────
// ROUTES STATISTIQUES CRÉATEUR
// ─────────────────────────────────────────
app.get('/api/stats', protect, restrict('creator','admin'), async (req, res) => {
  try {
    const since = new Date(Date.now() - 30 * 86400000);
    const [viewsAgg, likesAgg, videos, wallet, creator] = await Promise.all([
      Video.aggregate([{ $match: { creator: req.user._id, status:'active' } }, { $group: { _id: null, total: { $sum: '$views' } } }]),
      Video.aggregate([{ $match: { creator: req.user._id, status:'active' } }, { $group: { _id: null, total: { $sum: { $size: '$likes' } } } }]),
      Video.find({ creator: req.user._id, status:'active' }).sort({ views: -1 }).limit(10).select('title views likes earnings createdAt thumbnailUrl'),
      Wallet.findOne({ user: req.user._id }),
      User.findById(req.user._id).select('subscriberCount'),
    ]);

    const dailyViews = await Video.aggregate([
      { $match: { creator: req.user._id, status:'active', createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format:'%Y-%m-%d', date:'$createdAt' } }, views: { $sum: '$views' } } },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      overview: {
        totalViews:    viewsAgg[0]?.total || 0,
        totalLikes:    likesAgg[0]?.total || 0,
        subscribers:   creator?.subscriberCount || 0,
        totalEarnings: wallet?.totalEarned || 0,
        balance:       wallet?.balance || 0,
        videoCount:    await Video.countDocuments({ creator: req.user._id, status:'active' }),
      },
      topVideos: videos,
      dailyViews,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─────────────────────────────────────────
// ROUTES RECHERCHE
// ─────────────────────────────────────────
app.get('/api/search', async (req, res) => {
  try {
    const { q, type = 'all', page = 1, limit = 20 } = req.query;
    if (!q?.trim()) return res.status(400).json({ error: 'Terme de recherche requis' });
    const regex = new RegExp(q.trim(), 'i');
    const results = {};

    if (type === 'all' || type === 'video') {
      results.videos = await Video.find({ $or: [{ title: regex },{ description: regex },{ tags: regex },{ hashtags: regex }], status:'active' })
        .sort({ views: -1 }).skip((page-1)*limit).limit(parseInt(limit))
        .populate('creator', 'name avatar verified');
    }
    if (type === 'all' || type === 'creator') {
      results.creators = await User.find({ $or: [{ name: regex },{ bio: regex }] })
        .select('name avatar verified subscriberCount bio').limit(10);
    }
    res.json(results);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─────────────────────────────────────────
// ROUTES ADMINISTRATION
// ─────────────────────────────────────────
app.patch('/api/admin/videos/:id/hide', protect, restrict('moderator','admin'), async (req, res) => {
  try {
    await Video.findByIdAndUpdate(req.params.id, { status: 'hidden' });
    res.json({ message: 'Vidéo masquée' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/admin/videos/:id/delete', protect, restrict('admin'), async (req, res) => {
  try {
    await Video.findByIdAndUpdate(req.params.id, { status: 'deleted' });
    res.json({ message: 'Vidéo supprimée' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/admin/users/:id/suspend', protect, restrict('admin'), async (req, res) => {
  try {
    const { reason } = req.body;
    await User.findByIdAndUpdate(req.params.id, { suspended: true, suspendReason: reason || 'Violation des CGU' });
    res.json({ message: 'Compte suspendu' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/admin/users/:id/unsuspend', protect, restrict('admin'), async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { suspended: false, suspendReason: '' });
    res.json({ message: 'Compte réactivé' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/reports', protect, restrict('moderator','admin'), async (req, res) => {
  try {
    const videos = await Video.find({ reportCount: { $gt: 0 }, status: 'active' })
      .sort({ reportCount: -1 }).limit(50)
      .populate('creator', 'name avatar');
    res.json({ videos });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/stats', protect, restrict('admin'), async (req, res) => {
  try {
    const [users, videos, tips] = await Promise.all([
      User.countDocuments(),
      Video.countDocuments({ status: 'active' }),
      Tip.aggregate([{ $group: { _id: null, total: { $sum: '$platformFee' } } }]),
    ]);
    res.json({ users, videos, platformRevenue: tips[0]?.total || 0 });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─────────────────────────────────────────
// WEBSOCKET SOCKET.IO
// ─────────────────────────────────────────
io.on('connection', (socket) => {
  let userId = null;

  try {
    const token = socket.handshake.auth?.token;
    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      userId = decoded.id;
      socket.join(`user_${userId}`);
      User.findByIdAndUpdate(userId, { lastSeen: new Date() }).exec();
    }
  } catch {}

  socket.on('join_video',  ({ videoId }) => socket.join(`video_${videoId}`));
  socket.on('leave_video', ({ videoId }) => socket.leave(`video_${videoId}`));

  socket.on('join_live', ({ videoId }) => {
    socket.join(`live_${videoId}`);
    const count = io.sockets.adapter.rooms.get(`live_${videoId}`)?.size || 0;
    io.to(`live_${videoId}`).emit('viewer_count', { count });
    Video.findByIdAndUpdate(videoId, { 'live.viewers': count }).exec();
  });

  socket.on('live_message', ({ videoId, message }) => {
    if (!userId) return;
    io.to(`live_${videoId}`).emit('live_message', { userId, message, timestamp: Date.now() });
  });

  socket.on('typing', ({ conversationId }) => {
    socket.to(`conv_${conversationId}`).emit('user_typing', { userId });
  });

  socket.on('disconnect', () => {
    if (userId) User.findByIdAndUpdate(userId, { lastSeen: new Date() }).exec();
  });
});

// ─────────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

// ─────────────────────────────────────────
// DÉMARRAGE SERVEUR
// ─────────────────────────────────────────
async function start() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/afristream');
    console.log('✓ MongoDB connecté');

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`✓ AfriStream API démarré — port ${PORT}`);
      console.log(`✓ Socket.IO temps réel actif`);
      console.log(`✓ Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (err) {
    console.error('✗ Erreur démarrage:', err.message);
    process.exit(1);
  }
}

start();
module.exports = { app, server, io };
