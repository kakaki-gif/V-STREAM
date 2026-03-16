const express    = require('express');
const http       = require('http');
const mongoose   = require('mongoose');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const multer     = require('multer');
const cors       = require('cors');
const rateLimit  = require('express-rate-limit');
const { Server } = require('socket.io');
const crypto     = require('crypto');
const path       = require('path');
const fs         = require('fs');
require('dotenv').config();

const app    = express();
const server = http.createServer(app);

// PORT: Railway injecte automatiquement process.env.PORT
const PORT = process.env.PORT;
if (!PORT) { console.error('PORT non défini'); process.exit(1); }

const JWT_SECRET   = process.env.JWT_SECRET || 'afristream_secret';
const PLATFORM_FEE = parseFloat(process.env.PLATFORM_FEE || '0.10');

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET','POST'] }
});

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/api/', rateLimit({ windowMs: 15*60*1000, max: 300 }));

// ── MODELS ──
const userSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, select: false },
  role:     { type: String, enum: ['user','creator','moderator','admin'], default: 'user' },
  avatar:   { type: String, default: '' },
  banner:   { type: String, default: '' },
  bio:      { type: String, default: '' },
  country:  { type: String, default: '' },
  verified: { type: Boolean, default: false },
  suspended:{ type: Boolean, default: false },
  suspendReason: { type: String, default: '' },
  subscriberCount: { type: Number, default: 0 },
  subscribers:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  subscriptions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  wallet:   { type: mongoose.Schema.Types.ObjectId, ref: 'Wallet' },
  settings: {
    theme:       { type: String, default: 'dark' },
    accentColor: { type: String, default: '#FF6B35' },
    notifications: { newVideo: { type: Boolean, default: true }, comments: { type: Boolean, default: true }, tips: { type: Boolean, default: true } }
  },
  lastSeen: { type: Date, default: Date.now },
}, { timestamps: true });
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12); next();
});
userSchema.methods.checkPassword = function(c) { return bcrypt.compare(c, this.password); };
const User = mongoose.model('User', userSchema);

const videoSchema = new mongoose.Schema({
  title:       { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  creator:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  url:         { type: String, default: '' },
  thumbnailUrl:{ type: String, default: '' },
  duration:    { type: Number, default: 0 },
  category:    { type: String, required: true },
  tags:        [String],
  hashtags:    [String],
  status:      { type: String, enum: ['processing','active','hidden','deleted'], default: 'processing' },
  visibility:  { type: String, enum: ['public','premium','private'], default: 'public' },
  premium:     { enabled: Boolean, price: Number, makePublicAfterDays: Number, publicAfterDate: Date },
  live:        { active: Boolean, viewers: Number, isPaid: Boolean, price: Number },
  views:       { type: Number, default: 0 },
  likes:       [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  saves:       [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  commentCount:{ type: Number, default: 0 },
  reportCount: { type: Number, default: 0 },
  reports:     [{ user: mongoose.Schema.Types.ObjectId, reason: String, date: Date }],
  earnings:    { type: Number, default: 0 },
}, { timestamps: true });
videoSchema.index({ title: 'text', description: 'text', tags: 'text' });
const Video = mongoose.model('Video', videoSchema);

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

const walletSchema = new mongoose.Schema({
  user:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  balance:       { type: Number, default: 0 },
  totalEarned:   { type: Number, default: 0 },
  totalWithdrawn:{ type: Number, default: 0 },
  transactions:  [{ type: String, amount: Number, fee: Number, net: Number, description: String, reference: String, status: String, paymentMethod: String, createdAt: { type: Date, default: Date.now } }],
}, { timestamps: true });
const Wallet = mongoose.model('Wallet', walletSchema);

const tipSchema = new mongoose.Schema({
  from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  to:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  video:{ type: mongoose.Schema.Types.ObjectId, ref: 'Video' },
  amount: { type: Number, required: true },
  platformFee: Number, netAmount: Number,
  paymentMethod: String, status: { type: String, default: 'completed' }, message: String,
}, { timestamps: true });
const Tip = mongoose.model('Tip', tipSchema);

const notifSchema = new mongoose.Schema({
  user:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type:  { type: String, required: true },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  video: { type: mongoose.Schema.Types.ObjectId, ref: 'Video' },
  data:  mongoose.Schema.Types.Mixed,
  read:  { type: Boolean, default: false },
}, { timestamps: true });
const Notification = mongoose.model('Notification', notifSchema);

const convSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  lastMessage:  { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  lastActivity: { type: Date, default: Date.now },
}, { timestamps: true });
const Conversation = mongoose.model('Conversation', convSchema);

const msgSchema = new mongoose.Schema({
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  sender:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content:      { type: String, maxlength: 5000 },
  mediaUrl: String, mediaType: { type: String, default: 'none' },
  readBy:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  deleted:  { type: Boolean, default: false },
}, { timestamps: true });
const Message = mongoose.model('Message', msgSchema);

const viewLogSchema = new mongoose.Schema({
  video:       { type: mongoose.Schema.Types.ObjectId, required: true },
  fingerprint: { type: String, required: true },
  createdAt:   { type: Date, default: Date.now, expires: 86400 }
});
viewLogSchema.index({ video: 1, fingerprint: 1 }, { unique: true });
const ViewLog = mongoose.model('ViewLog', viewLogSchema);

// ── HELPERS ──
const signToken = (id, role) => jwt.sign({ id, role }, JWT_SECRET, { expiresIn: '7d' });

async function protect(req, res, next) {
  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Non authentifié' });
    const decoded = jwt.verify(auth.split(' ')[1], JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user || user.suspended) return res.status(401).json({ error: 'Compte invalide' });
    req.user = user; next();
  } catch { res.status(401).json({ error: 'Token invalide' }); }
}

function restrict(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Accès refusé' });
    next();
  };
}

async function notify(userId, type, actorId, videoId, data = {}) {
  try {
    const n = await Notification.create({ user: userId, type, actor: actorId, video: videoId, data });
    io.to(`user_${userId}`).emit('notification', n);
  } catch(e) { console.error('Notif error:', e.message); }
}

// ── AUTH ──
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name||!email||!password) return res.status(400).json({ error: 'Champs requis manquants' });
    if (password.length < 8) return res.status(400).json({ error: 'Mot de passe trop court' });
    if (await User.findOne({ email })) return res.status(409).json({ error: 'Email déjà utilisé' });
    const user   = await User.create({ name, email, password, role: ['user','creator'].includes(role)?role:'user' });
    const wallet = await Wallet.create({ user: user._id });
    await User.findByIdAndUpdate(user._id, { wallet: wallet._id });
    res.status(201).json({ token: signToken(user._id, user.role), user: { id:user._id, name, email, role:user.role } });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email||!password) return res.status(400).json({ error: 'Email et mot de passe requis' });
    const user = await User.findOne({ email }).select('+password');
    if (!user||!(await user.checkPassword(password))) return res.status(401).json({ error: 'Identifiants invalides' });
    if (user.suspended) return res.status(403).json({ error: `Compte suspendu: ${user.suspendReason}` });
    res.json({ token: signToken(user._id, user.role), user: { id:user._id, name:user.name, email:user.email, role:user.role, avatar:user.avatar } });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/auth/me', protect, (req, res) => res.json({ user: req.user }));

// ── USERS ──
app.get('/api/users/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    res.json({ user });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/users/:id/subscribe', protect, async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) return res.status(400).json({ error: 'Impossible' });
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    const already = target.subscribers.map(s=>s.toString()).includes(req.user._id.toString());
    if (already) {
      await User.findByIdAndUpdate(req.params.id, { $pull:{subscribers:req.user._id}, $inc:{subscriberCount:-1} });
      await User.findByIdAndUpdate(req.user._id, { $pull:{subscriptions:req.params.id} });
      return res.json({ subscribed: false });
    }
    await User.findByIdAndUpdate(req.params.id, { $addToSet:{subscribers:req.user._id}, $inc:{subscriberCount:1} });
    await User.findByIdAndUpdate(req.user._id, { $addToSet:{subscriptions:req.params.id} });
    await notify(req.params.id, 'subscription', req.user._id, null);
    res.json({ subscribed: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── VIDEOS ──
app.get('/api/videos', async (req, res) => {
  try {
    const { page=1, limit=20, category, sort='recent', search } = req.query;
    const query = { status:'active' };
    if (category) query.category = category;
    if (search) query.$text = { $search: search };
    const sortMap = { recent:{createdAt:-1}, trending:{views:-1} };
    const [videos, total] = await Promise.all([
      Video.find(query).sort(sortMap[sort]||{createdAt:-1}).skip((page-1)*limit).limit(+limit)
        .populate('creator','name avatar verified subscriberCount'),
      Video.countDocuments(query)
    ]);
    res.json({ videos, total, page:+page, pages:Math.ceil(total/limit) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/videos/:id', async (req, res) => {
  try {
    const video = await Video.findById(req.params.id).populate('creator','name avatar verified subscriberCount bio');
    if (!video||video.status==='deleted') return res.status(404).json({ error: 'Vidéo non trouvée' });
    res.json({ video });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/videos/:id/view', async (req, res) => {
  try {
    let userId = null;
    try { const a=req.headers.authorization; if(a?.startsWith('Bearer ')) userId=jwt.verify(a.split(' ')[1],JWT_SECRET)?.id; } catch{}
    const key = userId ? `${userId}_${req.params.id}` : `${req.ip}_${req.params.id}`;
    const fp  = crypto.createHash('sha256').update(key).digest('hex');
    const isNew = await ViewLog.create({ video:req.params.id, fingerprint:fp }).then(()=>true).catch(()=>false);
    if (isNew) await Video.findByIdAndUpdate(req.params.id, { $inc:{views:1} });
    res.json({ counted: isNew });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/videos/:id/like', protect, async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ error: 'Vidéo non trouvée' });
    const liked = video.likes.map(l=>l.toString()).includes(req.user._id.toString());
    await Video.findByIdAndUpdate(req.params.id, liked?{$pull:{likes:req.user._id}}:{$addToSet:{likes:req.user._id}});
    res.json({ liked: !liked });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/videos/:id/report', protect, async (req, res) => {
  try {
    await Video.findByIdAndUpdate(req.params.id, { $inc:{reportCount:1}, $push:{reports:{user:req.user._id,reason:req.body.reason,date:new Date()}} });
    const v = await Video.findById(req.params.id);
    if (v?.reportCount>=10) await Video.findByIdAndUpdate(req.params.id,{status:'hidden'});
    res.json({ message: 'Signalement envoyé' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/videos/:id', protect, async (req, res) => {
  try {
    const v = await Video.findById(req.params.id);
    if (!v) return res.status(404).json({ error: 'Non trouvée' });
    if (v.creator.toString()!==req.user._id.toString()&&req.user.role!=='admin') return res.status(403).json({ error: 'Non autorisé' });
    await Video.findByIdAndUpdate(req.params.id,{status:'deleted'});
    res.json({ message: 'Supprimée' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── COMMENTS ──
app.get('/api/videos/:id/comments', async (req, res) => {
  try {
    const { page=1, limit=20 } = req.query;
    const comments = await Comment.find({ video:req.params.id, parent:null, deleted:false })
      .sort({createdAt:-1}).skip((page-1)*limit).limit(+limit).populate('user','name avatar verified');
    res.json({ comments });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/videos/:id/comments', protect, async (req, res) => {
  try {
    const { text, parentId } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'Commentaire vide' });
    const recent = await Comment.countDocuments({ user:req.user._id, createdAt:{$gt:new Date(Date.now()-60000)} });
    if (recent>=5) return res.status(429).json({ error: 'Trop de commentaires' });
    const comment = await Comment.create({ video:req.params.id, user:req.user._id, text:text.trim(), parent:parentId||null });
    await Video.findByIdAndUpdate(req.params.id,{$inc:{commentCount:1}});
    const pop = await Comment.findById(comment._id).populate('user','name avatar verified');
    const v = await Video.findById(req.params.id).select('creator');
    if (v&&v.creator.toString()!==req.user._id.toString()) await notify(v.creator,'comment',req.user._id,req.params.id);
    io.to(`video_${req.params.id}`).emit('new_comment', pop);
    res.status(201).json({ comment: pop });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── TIPS ──
app.post('/api/tips', protect, async (req, res) => {
  try {
    const { toUserId, videoId, amount, paymentMethod, message } = req.body;
    if (!amount||amount<50) return res.status(400).json({ error: 'Montant minimum: 50 FCFA' });
    const fee = Math.round(amount*PLATFORM_FEE);
    const net = amount - fee;
    if (paymentMethod==='wallet') {
      const w = await Wallet.findOne({ user:req.user._id });
      if (!w||w.balance<amount) return res.status(400).json({ error: 'Solde insuffisant' });
      await Wallet.findOneAndUpdate({user:req.user._id},{$inc:{balance:-amount},$push:{transactions:{type:'tip_sent',amount:-amount,fee:0,net:-amount,description:'Pourboire envoyé',paymentMethod:'wallet'}}});
    }
    const tip = await Tip.create({ from:req.user._id, to:toUserId, video:videoId, amount, platformFee:fee, netAmount:net, paymentMethod, message, status:'completed' });
    await Wallet.findOneAndUpdate({user:toUserId},{$inc:{balance:net,totalEarned:net},$push:{transactions:{type:'tip_received',amount:net,fee,net,description:`Pourboire reçu`,paymentMethod:'wallet'}}});
    if (videoId) await Video.findByIdAndUpdate(videoId,{$inc:{earnings:net}});
    await notify(toUserId,'tip',req.user._id,videoId,{amount,net});
    res.status(201).json({ tip, message:`Pourboire de ${amount.toLocaleString()} FCFA envoyé!` });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── WALLET ──
app.get('/api/wallet', protect, async (req, res) => {
  try {
    const w = await Wallet.findOne({ user:req.user._id });
    if (!w) return res.status(404).json({ error: 'Wallet non trouvé' });
    res.json({ balance:w.balance, totalEarned:w.totalEarned, totalWithdrawn:w.totalWithdrawn, transactions:w.transactions.slice(-50).reverse() });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/wallet/deposit', protect, async (req, res) => {
  try {
    const { amount, paymentMethod } = req.body;
    if (!amount||amount<100) return res.status(400).json({ error: 'Minimum 100 FCFA' });
    const ref = `DEP_${Date.now()}_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    await Wallet.findOneAndUpdate({user:req.user._id},{$inc:{balance:amount},$push:{transactions:{type:'deposit',amount,fee:0,net:amount,description:`Rechargement ${paymentMethod}`,reference:ref,paymentMethod}}});
    res.json({ message:`${amount.toLocaleString()} FCFA rechargés!`, reference:ref });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/wallet/withdraw', protect, async (req, res) => {
  try {
    const { amount, paymentMethod } = req.body;
    if (!amount||amount<1000) return res.status(400).json({ error: 'Minimum 1,000 FCFA' });
    const fee=Math.round(amount*0.02), total=amount+fee;
    const w = await Wallet.findOne({ user:req.user._id });
    if (!w||w.balance<total) return res.status(400).json({ error: 'Solde insuffisant' });
    const ref = `WIT_${Date.now()}_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    await Wallet.findOneAndUpdate({user:req.user._id},{$inc:{balance:-total,totalWithdrawn:amount},$push:{transactions:{type:'withdrawal',amount:-total,fee,net:-amount,description:`Retrait ${paymentMethod}`,reference:ref,status:'pending',paymentMethod}}});
    res.json({ message:'Retrait en cours — 24h', reference:ref, amount, fee });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── NOTIFICATIONS ──
app.get('/api/notifications', protect, async (req, res) => {
  try {
    const [notifications, unread] = await Promise.all([
      Notification.find({user:req.user._id}).sort({createdAt:-1}).limit(50).populate('actor','name avatar').populate('video','title thumbnailUrl'),
      Notification.countDocuments({user:req.user._id, read:false})
    ]);
    res.json({ notifications, unread });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/notifications/read-all', protect, async (req, res) => {
  try {
    await Notification.updateMany({user:req.user._id,read:false},{read:true});
    res.json({ message:'Toutes notifications lues' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── MESSAGES ──
app.get('/api/conversations', protect, async (req, res) => {
  try {
    const convs = await Conversation.find({participants:req.user._id}).sort({lastActivity:-1})
      .populate('participants','name avatar lastSeen').populate('lastMessage','content createdAt');
    res.json({ conversations: convs });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/conversations', protect, async (req, res) => {
  try {
    const { recipientId } = req.body;
    let conv = await Conversation.findOne({participants:{$all:[req.user._id,recipientId],$size:2}});
    if (!conv) conv = await Conversation.create({participants:[req.user._id,recipientId]});
    res.json({ conversation: conv });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/conversations/:id/messages', protect, async (req, res) => {
  try {
    const { content, mediaUrl, mediaType } = req.body;
    if (!content?.trim()&&!mediaUrl) return res.status(400).json({ error: 'Message vide' });
    const conv = await Conversation.findById(req.params.id);
    if (!conv?.participants.map(p=>p.toString()).includes(req.user._id.toString())) return res.status(403).json({ error: 'Accès refusé' });
    const msg = await Message.create({conversation:req.params.id,sender:req.user._id,content:content?.trim(),mediaUrl,mediaType:mediaType||'none',readBy:[req.user._id]});
    await Conversation.findByIdAndUpdate(req.params.id,{lastMessage:msg._id,lastActivity:new Date()});
    const pop = await Message.findById(msg._id).populate('sender','name avatar');
    conv.participants.forEach(p=>{ if(p.toString()!==req.user._id.toString()) io.to(`user_${p}`).emit('new_message',{conversation:req.params.id,message:pop}); });
    res.status(201).json({ message: pop });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── STATS ──
app.get('/api/stats', protect, restrict('creator','admin'), async (req, res) => {
  try {
    const [vAgg, lAgg, videos, wallet, creator] = await Promise.all([
      Video.aggregate([{$match:{creator:req.user._id,status:'active'}},{$group:{_id:null,total:{$sum:'$views'}}}]),
      Video.aggregate([{$match:{creator:req.user._id,status:'active'}},{$group:{_id:null,total:{$sum:{$size:'$likes'}}}}]),
      Video.find({creator:req.user._id,status:'active'}).sort({views:-1}).limit(10).select('title views likes earnings createdAt'),
      Wallet.findOne({user:req.user._id}),
      User.findById(req.user._id).select('subscriberCount'),
    ]);
    res.json({ overview:{ totalViews:vAgg[0]?.total||0, totalLikes:lAgg[0]?.total||0, subscribers:creator?.subscriberCount||0, totalEarnings:wallet?.totalEarned||0, balance:wallet?.balance||0, videoCount:await Video.countDocuments({creator:req.user._id,status:'active'}) }, topVideos:videos });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── SEARCH ──
app.get('/api/search', async (req, res) => {
  try {
    const { q, page=1, limit=20 } = req.query;
    if (!q?.trim()) return res.status(400).json({ error: 'Terme requis' });
    const rx = new RegExp(q.trim(),'i');
    const [videos, creators] = await Promise.all([
      Video.find({$or:[{title:rx},{description:rx},{tags:rx}],status:'active'}).sort({views:-1}).skip((page-1)*limit).limit(+limit).populate('creator','name avatar verified'),
      User.find({$or:[{name:rx},{bio:rx}]}).select('name avatar verified subscriberCount').limit(10)
    ]);
    res.json({ videos, creators });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── ADMIN ──
app.patch('/api/admin/videos/:id/hide', protect, restrict('moderator','admin'), async (req, res) => {
  try { await Video.findByIdAndUpdate(req.params.id,{status:'hidden'}); res.json({message:'Masquée'}); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/admin/users/:id/suspend', protect, restrict('admin'), async (req, res) => {
  try { await User.findByIdAndUpdate(req.params.id,{suspended:true,suspendReason:req.body.reason||'Violation CGU'}); res.json({message:'Suspendu'}); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

// ── SOCKET.IO ──
io.on('connection', (socket) => {
  let userId = null;
  try { const t=socket.handshake.auth?.token; if(t){const d=jwt.verify(t,JWT_SECRET);userId=d.id;socket.join(`user_${userId}`);} } catch{}
  socket.on('join_video',  ({videoId}) => socket.join(`video_${videoId}`));
  socket.on('leave_video', ({videoId}) => socket.leave(`video_${videoId}`));
  socket.on('join_live',   ({videoId}) => { socket.join(`live_${videoId}`); io.to(`live_${videoId}`).emit('viewer_count',{count:io.sockets.adapter.rooms.get(`live_${videoId}`)?.size||0}); });
  socket.on('live_message',({videoId,message}) => { if(userId) io.to(`live_${videoId}`).emit('live_message',{userId,message,timestamp:Date.now()}); });
  socket.on('disconnect', () => { if(userId) User.findByIdAndUpdate(userId,{lastSeen:new Date()}).exec(); });
});

// ── HEALTH CHECK ──
app.get('/api/health', (req, res) => {
  res.json({ status:'ok', timestamp:new Date().toISOString(), db:mongoose.connection.readyState===1?'connected':'disconnected', port:PORT });
});

// ── START ──
async function start() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ MongoDB connecté');
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`✓ AfriStream API démarré — port ${PORT}`);
      console.log(`✓ Socket.IO actif`);
    });
  } catch(err) {
    console.error('✗ Erreur:', err.message);
    process.exit(1);
  }
}

start();
module.exports = { app, server, io };
