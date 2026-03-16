const API_URL = 'https://v-stream-production.up.railway.app'; 
// AFRISTREAM — APPLICATION JAVASCRIPT
// Plateforme vidéo africaine complète
// ============================================================

'use strict';

// ===== STATE =====
const APP = {
  currentUser: null,
  currentVideo: null,
  currentPage: 'home',
  videos: [],
  notifications: [],
  messages: {},
  wallet: { balance: 47500, transactions: [] },
  selectedTip: 1000,
  playing: false,
  playProgress: 35,
  viewedVideos: new Set(),
  accentColor: '#FF6B35',
};

// ===== MOCK DATA =====
const CREATORS = [
  { id:'c1', name:'Kofi Mensah', avatar:'https://api.dicebear.com/7.x/avataaars/svg?seed=kofi', subs:4820, verified:true, country:'🇹🇬 Togo' },
  { id:'c2', name:'Aminata Diallo', avatar:'https://api.dicebear.com/7.x/avataaars/svg?seed=aminata', subs:12300, verified:true, country:'🇸🇳 Sénégal' },
  { id:'c3', name:'Emmanuel Osei', avatar:'https://api.dicebear.com/7.x/avataaars/svg?seed=emmanuel', subs:7650, verified:false, country:'🇬🇭 Ghana' },
  { id:'c4', name:'Fatou Camara', avatar:'https://api.dicebear.com/7.x/avataaars/svg?seed=fatou', subs:3200, verified:true, country:'🇨🇮 Côte d\'Ivoire' },
  { id:'c5', name:'Ibrahim Touré', avatar:'https://api.dicebear.com/7.x/avataaars/svg?seed=ibrahim', subs:9100, verified:true, country:'🇲🇱 Mali' },
  { id:'c6', name:'Nadia Mbeki', avatar:'https://api.dicebear.com/7.x/avataaars/svg?seed=nadia', subs:5400, verified:false, country:'🇿🇦 Afrique du Sud' },
];

const CATEGORIES = ['Musique','Sports','Tech','Cuisine','Mode','Éducation','Divertissement','Danse','Vlog','Business'];

const THUMB_COLORS = [
  ['#FF6B35','#FF8C42'],['#00D4AA','#00A87A'],['#7B61FF','#5A3FD4'],
  ['#FF4757','#FF1744'],['#FFD700','#FFA500'],['#00BCD4','#0097A7'],
  ['#E91E63','#C2185B'],['#4CAF50','#388E3C'],['#FF5722','#E64A19'],
];

function makeVideos() {
  const vids = [];
  const titles = [
    'Les meilleurs spots de surf au Sénégal 🏄‍♂️','Cuisine togolaise traditionnelle — Amiwo','Tech africaine: les startups qui changent tout',
    'Kora & Afrobeat — Session acoustique','Business en Afrique: comment démarrer sans capital','Mode africaine Printemps 2025',
    'Lomé by night — Vlog 4K','Formation Python pour débutants africains','Les 10 plages paradis de la Côte d\'Ivoire',
    'Street food Dakar — Ce qu\'on mange vraiment','Football africain: talent vs système','DJ Mix Afro House — 1h non-stop',
    'Entrepreneuriat féminin au Mali','Danse Azonto — Tutoriel complet','Voyage au Rwanda — La perle de l\'Afrique',
    'Coding bootcamp: 30 jours pour changer de vie','La musique coupé-décalé expliquée','Recette: Thiéboudienne authentique',
  ];
  for (let i = 0; i < 18; i++) {
    const c = CREATORS[i % CREATORS.length];
    const col = THUMB_COLORS[i % THUMB_COLORS.length];
    const isPremium = i === 2 || i === 7 || i === 13;
    const isLive = i === 0 || i === 5;
    vids.push({
      id: `v${i+1}`,
      title: titles[i],
      creator: c,
      views: Math.floor(Math.random() * 500000) + 1000,
      likes: Math.floor(Math.random() * 50000) + 100,
      duration: `${Math.floor(Math.random()*20)+3}:${String(Math.floor(Math.random()*60)).padStart(2,'0')}`,
      category: CATEGORIES[i % CATEGORIES.length],
      tags: ['#africa','#'+CATEGORIES[i%CATEGORIES.length].toLowerCase()],
      premium: isPremium,
      premiumPrice: isPremium ? [500,1000,2000][i%3] : 0,
      live: isLive,
      liveViewers: isLive ? Math.floor(Math.random()*20000)+500 : 0,
      thumbColors: col,
      liked: false,
      saved: false,
      comments: generateComments(),
      postedAt: `Il y a ${Math.floor(Math.random()*30)+1}j`,
    });
  }
  return vids;
}

function generateComments() {
  const cmts = [
    ['Aminata Diallo','Super contenu comme toujours 🔥','https://api.dicebear.com/7.x/avataaars/svg?seed=aminata'],
    ['Emmanuel Osei','Représentation africaine au top!','https://api.dicebear.com/7.x/avataaars/svg?seed=emmanuel'],
    ['Fatou Camara','J\'attends la prochaine vidéo avec impatience','https://api.dicebear.com/7.x/avataaars/svg?seed=fatou'],
    ['Ibrahim Touré','Très instructif, merci beaucoup','https://api.dicebear.com/7.x/avataaars/svg?seed=ibrahim'],
    ['Nadia Mbeki','Tu mérites plus d\'abonnés frère!','https://api.dicebear.com/7.x/avataaars/svg?seed=nadia'],
  ];
  return cmts.slice(0, Math.floor(Math.random()*4)+2).map(([name,text,avatar]) => ({ name, text, avatar, likes:Math.floor(Math.random()*50), time:`${Math.floor(Math.random()*24)+1}h` }));
}

const TRANSACTIONS = [
  { type:'in', icon:'💰', label:'Pourboire de Aminata Diallo', amount:'+500 FCFA', date:'Aujourd\'hui 14:32' },
  { type:'in', icon:'◆', label:'Avant-première — "Tech Startups"', amount:'+2,000 FCFA', date:'Hier 09:15' },
  { type:'out', icon:'💸', label:'Retrait Mobile Money (Flooz)', amount:'-15,000 FCFA', date:'Lun 18:00' },
  { type:'in', icon:'♥', label:'Abonnement premium x3', amount:'+6,000 FCFA', date:'Dim 11:22' },
  { type:'in', icon:'💰', label:'Pourboire de Emmanuel Osei', amount:'+1,000 FCFA', date:'Sam 16:45' },
  { type:'out', icon:'💸', label:'Paiement avant-première', amount:'-1,000 FCFA', date:'Ven 20:30' },
];

const NOTIFICATIONS = [
  { icon:'💰', text:'<strong>Aminata Diallo</strong> vous a envoyé un pourboire de 500 FCFA', time:'Il y a 2h', unread:true },
  { icon:'♥', text:'<strong>Ibrahim Touré</strong> s\'est abonné à votre chaîne', time:'Il y a 4h', unread:true },
  { icon:'💬', text:'<strong>Fatou Camara</strong> a commenté votre vidéo', time:'Il y a 5h', unread:true },
  { icon:'▶', text:'<strong>Kofi Mensah</strong> a publié une nouvelle vidéo', time:'Il y a 8h', unread:false },
  { icon:'◆', text:'2 personnes ont acheté votre avant-première', time:'Hier', unread:false },
  { icon:'●', text:'<strong>Emmanuel Osei</strong> démarre un live maintenant', time:'Hier', unread:false },
];

const CONVERSATIONS = [
  { id:'m1', name:'Aminata Diallo', avatar:'https://api.dicebear.com/7.x/avataaars/svg?seed=aminata', preview:'Super collaboration? J\'ai une idée...', time:'14:32', unread:2 },
  { id:'m2', name:'Emmanuel Osei', avatar:'https://api.dicebear.com/7.x/avataaars/svg?seed=emmanuel', preview:'Merci pour le live hier!', time:'Hier', unread:0 },
  { id:'m3', name:'Fatou Camara', avatar:'https://api.dicebear.com/7.x/avataaars/svg?seed=fatou', preview:'Tu peux me donner ton avis?', time:'Lun', unread:1 },
];

const CHAT_MESSAGES = {
  m1: [
    { from:'them', text:'Salut! Ton contenu est vraiment génial 🔥', time:'14:20' },
    { from:'me', text:'Merci beaucoup, ça fait plaisir!', time:'14:22' },
    { from:'them', text:'J\'ai une proposition de collaboration. Tu serais intéressé?', time:'14:28' },
    { from:'me', text:'Oui, dis-moi tout!', time:'14:30' },
    { from:'them', text:'Super collaboration? J\'ai une idée pour une vidéo commune sur la tech africaine', time:'14:32' },
  ],
  m2: [
    { from:'them', text:'Le live hier était incroyable!', time:'Hier 20:15' },
    { from:'me', text:'Merci! On était plus de 5000 en direct!', time:'Hier 20:18' },
    { from:'them', text:'Merci pour le live hier!', time:'Hier 20:45' },
  ],
  m3: [
    { from:'them', text:'Bonjour! Tu peux regarder ma nouvelle vidéo?', time:'Lun 10:00' },
    { from:'me', text:'Bien sûr, envoie le lien!', time:'Lun 10:15' },
    { from:'them', text:'Tu peux me donner ton avis?', time:'Lun 11:30' },
  ],
};

// ===== INIT =====
function init() {
  APP.videos = makeVideos();
  initPremiumCheckbox();
}

function initPremiumCheckbox() {
  const cb = document.getElementById('isPremium');
  if(cb) cb.addEventListener('change', function() {
    document.getElementById('premiumPriceRow').classList.toggle('hidden', !this.checked);
  });
}

// ===== AUTH =====
function switchAuth(tab) {
  document.querySelectorAll('.auth-tab').forEach((t,i) => t.classList.toggle('active', (tab==='login'&&i===0)||(tab==='register'&&i===1)));
  document.getElementById('loginForm').classList.toggle('hidden', tab!=='login');
  document.getElementById('registerForm').classList.toggle('hidden', tab!=='register');
}

function login() {
  APP.currentUser = { id:'u1', name:'Kofi Mensah', role:'creator', avatar:'https://api.dicebear.com/7.x/avataaars/svg?seed=user1' };
  document.getElementById('authOverlay').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  showPage('home');
  renderAll();
  showToast('Bienvenue sur AfriStream! 🎉', 'success');
}

function logout() {
  APP.currentUser = null;
  document.getElementById('authOverlay').classList.remove('active','hidden');
  document.getElementById('app').classList.add('hidden');
}

// ===== NAVIGATION =====
function showPage(page) {
  document.querySelectorAll('.page').forEach(p => { p.classList.remove('active'); p.classList.add('hidden'); });
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  
  const el = document.getElementById('page' + page.charAt(0).toUpperCase() + page.slice(1));
  if(el) { el.classList.remove('hidden'); el.classList.add('active'); }
  
  const navMap = { home:'home', trending:'trending', premium:'premium', live:'live', subscriptions:'subscriptions', messages:'messages', wallet:'wallet', stats:'stats', settings:'settings', profile:'profile', notifications:'notifications', admin:'admin' };
  if(navMap[page]) {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(n => { if(n.textContent.toLowerCase().includes(navMap[page].toLowerCase().substring(0,4))) n.classList.add('active'); });
  }
  
  APP.currentPage = page;
  renderPage(page);
  if(window.innerWidth <= 768) document.getElementById('sidebar').classList.remove('open');
}

function renderPage(page) {
  switch(page) {
    case 'home': renderVideoGrid(); break;
    case 'trending': renderTrending(); break;
    case 'premium': renderPremium(); break;
    case 'live': renderLive(); break;
    case 'subscriptions': renderSubscriptions(); break;
    case 'messages': renderMessages(); break;
    case 'wallet': renderWallet(); break;
    case 'stats': renderStats(); break;
    case 'profile': renderProfile(); break;
    case 'notifications': renderNotifications(); break;
    case 'admin': renderAdmin(); break;
  }
}

function renderAll() {
  renderVideoGrid();
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ===== VIDEO GRID =====
function renderVideoGrid(filter='all') {
  const grid = document.getElementById('videoGrid');
  if(!grid) return;
  let vids = [...APP.videos];
  if(filter === 'trending') vids = vids.sort((a,b) => b.views - a.views).slice(0,6);
  else if(filter === 'recent') vids = vids.reverse();
  else if(filter === 'premium') vids = vids.filter(v => v.premium);
  else if(filter !== 'all') vids = vids.filter(v => v.category.toLowerCase() === filter);
  
  grid.innerHTML = vids.map(renderVideoCard).join('');
}

function renderVideoCard(v) {
  const [c1,c2] = v.thumbColors;
  return `
  <div class="video-card" onclick="showVideoPlayer('${v.id}')">
    <div class="video-thumb">
      <div class="thumb-gradient" style="background:linear-gradient(135deg,${c1},${c2})"></div>
      <div class="thumb-play">▶</div>
      ${v.premium ? `<span class="premium-badge-thumb">◆ ${v.premiumPrice.toLocaleString()} FCFA</span>` : ''}
      ${v.live ? `<span class="live-badge-thumb">● LIVE ${v.liveViewers.toLocaleString()} viewers</span>` : ''}
      ${!v.live ? `<span class="video-duration">${v.duration}</span>` : ''}
    </div>
    <div class="video-info">
      <div class="video-meta">
        <div class="channel-avatar"><img src="${v.creator.avatar}" alt=""></div>
        <div>
          <div class="video-title">${v.title}</div>
          <div class="channel-name">${v.creator.name} ${v.creator.verified ? '<span class="verified-small">✓</span>':''}</div>
        </div>
      </div>
      <div class="video-stats">
        <span>${formatViews(v.views)} vues</span>
        <span>•</span>
        <span>${v.postedAt}</span>
        <span>•</span>
        <span>${v.category}</span>
      </div>
    </div>
  </div>`;
}

function formatViews(n) {
  if(n >= 1000000) return (n/1000000).toFixed(1)+'M';
  if(n >= 1000) return (n/1000).toFixed(0)+'K';
  return n.toString();
}

function setFilter(btn, filter) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderVideoGrid(filter);
}

function filterCategory(cat) {
  showPage('home');
  setTimeout(() => renderVideoGrid(cat.toLowerCase()), 50);
}

// ===== VIDEO PLAYER =====
function showVideoPlayer(id) {
  const v = APP.videos.find(x => x.id === id);
  if(!v) return;
  APP.currentVideo = v;
  
  document.getElementById('videoPlayerModal').classList.remove('hidden');
  
  // Premium gate
  const gate = document.getElementById('premiumGate');
  if(v.premium) {
    gate.classList.remove('hidden');
    document.getElementById('gatePrice').textContent = `Accès: ${v.premiumPrice.toLocaleString()} FCFA`;
  } else {
    gate.classList.add('hidden');
  }

  // Count view (anti-fraud: once per video)
  if(!APP.viewedVideos.has(id)) {
    APP.viewedVideos.add(id);
    v.views++;
  }
  
  // Render info panel
  document.getElementById('videoInfoPanel').innerHTML = renderVideoInfoPanel(v);
  
  // Start fake progress animation
  if(!v.premium) startFakePlayback();
  
  // Setup tip to
  document.getElementById('tipTo').textContent = `À: ${v.creator.name}`;
}

function renderVideoInfoPanel(v) {
  const commentsHtml = v.comments.map(c => `
    <div class="comment-item">
      <div class="comment-avatar"><img src="${c.avatar}" alt=""></div>
      <div class="comment-body">
        <div class="comment-author">${c.name} <span style="color:var(--text-muted);font-size:11px;">${c.time}</span></div>
        <div class="comment-text">${c.text}</div>
        <div class="comment-actions">
          <span class="comment-action" onclick="likeComment(event)">❤ ${c.likes}</span>
          <span class="comment-action">Répondre</span>
        </div>
      </div>
    </div>
  `).join('');

  return `
    <h3 style="font-size:16px;font-weight:700;margin-bottom:6px;line-height:1.3;">${v.title}</h3>
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
      <img src="${v.creator.avatar}" style="width:36px;height:36px;border-radius:50%;" alt="">
      <div>
        <div style="font-size:13px;font-weight:600;">${v.creator.name} ${v.creator.verified?'<span style="color:var(--accent)">✓</span>':''}</div>
        <div style="font-size:11px;color:var(--text-muted);">${formatViews(v.creator.subs)} abonnés</div>
      </div>
      <button class="btn-primary" style="margin-left:auto;padding:7px 14px;font-size:12px;" onclick="subscribe('${v.creator.id}')">S'abonner</button>
    </div>
    <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px;">${formatViews(v.views)} vues • ${v.postedAt} • ${v.category}</div>
    
    <div class="interaction-bar">
      <button class="int-btn ${v.liked?'liked':''}" onclick="toggleLike('${v.id}',this)">
        ${v.liked?'❤':'♡'} ${formatViews(v.likes)}
      </button>
      <button class="int-btn" onclick="shareVideo('${v.id}')">↗ Partager</button>
      <button class="int-btn ${v.saved?'saved':''}" onclick="toggleSave('${v.id}',this)">
        ${v.saved?'★':'☆'} Sauvegarder
      </button>
      <button class="int-btn" onclick="reportVideo('${v.id}')">⚑ Signaler</button>
    </div>
    
    <div class="tip-bar">
      <span class="tip-label">💸 Soutenir ${v.creator.name}</span>
      <button class="tip-quick-btn" onclick="openTipModal(event)">100 FCFA</button>
      <button class="tip-quick-btn" onclick="openTipModal(event)">500 FCFA</button>
      <button class="tip-quick-btn" onclick="showModal('tipModal')">Autre</button>
    </div>
    
    <div class="comments-section">
      <h4 style="font-size:14px;margin-bottom:12px;">Commentaires (${v.comments.length})</h4>
      <div class="comment-input-row">
        <img src="${APP.currentUser?.avatar||''}" alt="">
        <input type="text" placeholder="Ajouter un commentaire..." id="commentInput" onkeypress="submitComment(event)">
        <button class="comment-send-btn" onclick="submitCommentBtn()">↑</button>
      </div>
      <div id="commentsList">${commentsHtml}</div>
    </div>
  `;
}

function closeVideoPlayer() {
  document.getElementById('videoPlayerModal').classList.add('hidden');
  APP.playing = false;
  APP.currentVideo = null;
}

function togglePlay() {
  APP.playing = !APP.playing;
  document.getElementById('playPauseBtn').textContent = APP.playing ? '⏸' : '▶';
  document.getElementById('playBtnBig').textContent = APP.playing ? '⏸' : '▶';
  if(APP.playing) startFakePlayback();
}

let playInterval = null;
function startFakePlayback() {
  clearInterval(playInterval);
  APP.playing = true;
  document.getElementById('playPauseBtn').textContent = '⏸';
  document.getElementById('playBtnBig').textContent = '⏸';
  playInterval = setInterval(() => {
    if(!APP.playing) return;
    APP.playProgress = Math.min(100, APP.playProgress + 0.3);
    const pb = document.getElementById('progressBar');
    if(pb) pb.style.width = APP.playProgress + '%';
    const mins = Math.floor(APP.playProgress / 100 * 342);
    const secs = String(mins % 60).padStart(2,'0');
    const td = document.getElementById('timeDisplay');
    if(td) td.textContent = `${Math.floor(mins/60)}:${secs} / 5:42`;
    if(APP.playProgress >= 100) { clearInterval(playInterval); APP.playing = false; }
  }, 200);
}

function seekVideo(event) {
  const bar = event.currentTarget;
  const rect = bar.getBoundingClientRect();
  APP.playProgress = ((event.clientX - rect.left) / rect.width) * 100;
  document.getElementById('progressBar').style.width = APP.playProgress + '%';
}

function toggleFullscreen() {
  const el = document.getElementById('videoPlayer');
  if(document.fullscreenElement) document.exitFullscreen();
  else el.requestFullscreen?.();
}

function payForContent() {
  const v = APP.currentVideo;
  if(!v) return;
  if(APP.wallet.balance >= v.premiumPrice) {
    APP.wallet.balance -= v.premiumPrice;
    document.getElementById('walletBalance').textContent = APP.wallet.balance.toLocaleString() + ' FCFA';
    document.getElementById('premiumGate').classList.add('hidden');
    startFakePlayback();
    showToast(`Contenu déverrouillé! ${v.premiumPrice.toLocaleString()} FCFA débités 🔓`, 'success');
  } else {
    showToast('Solde insuffisant. Rechargez votre wallet.', 'error');
  }
}

// ===== INTERACTIONS =====
function toggleLike(id, btn) {
  const v = APP.videos.find(x => x.id === id);
  if(!v) return;
  v.liked = !v.liked;
  v.likes += v.liked ? 1 : -1;
  btn.classList.toggle('liked', v.liked);
  btn.innerHTML = `${v.liked?'❤':'♡'} ${formatViews(v.likes)}`;
  showToast(v.liked ? '❤ Vidéo aimée!' : 'Like retiré', 'success');
}

function toggleSave(id, btn) {
  const v = APP.videos.find(x => x.id === id);
  if(!v) return;
  v.saved = !v.saved;
  btn.classList.toggle('saved', v.saved);
  btn.innerHTML = `${v.saved?'★':'☆'} Sauvegarder`;
  showToast(v.saved ? '★ Vidéo sauvegardée!' : 'Retiré des favoris', 'success');
}

function shareVideo(id) {
  if(navigator.clipboard) navigator.clipboard.writeText(`https://afristream.tg/v/${id}`);
  showToast('Lien copié dans le presse-papier! 🔗', 'success');
}

function reportVideo(id) {
  showToast('Signalement envoyé aux modérateurs. Merci!', 'success');
}

function subscribe(creatorId) {
  showToast('Abonnement confirmé! 🔔 Notifications activées', 'success');
}

function submitComment(e) {
  if(e.key === 'Enter') submitCommentBtn();
}

function submitCommentBtn() {
  const input = document.getElementById('commentInput');
  if(!input || !input.value.trim()) return;
  const v = APP.currentVideo;
  if(!v) return;
  v.comments.unshift({ name:'Kofi Mensah', text:input.value.trim(), avatar:APP.currentUser.avatar, likes:0, time:'maintenant' });
  input.value = '';
  const newCmt = `
    <div class="comment-item" style="animation:slideIn 0.3s ease">
      <div class="comment-avatar"><img src="${APP.currentUser.avatar}" alt=""></div>
      <div class="comment-body">
        <div class="comment-author">Kofi Mensah <span style="color:var(--text-muted);font-size:11px;">maintenant</span></div>
        <div class="comment-text">${v.comments[0].text}</div>
        <div class="comment-actions">
          <span class="comment-action">❤ 0</span>
          <span class="comment-action">Répondre</span>
        </div>
      </div>
    </div>`;
  const list = document.getElementById('commentsList');
  if(list) list.insertAdjacentHTML('afterbegin', newCmt);
  showToast('Commentaire publié! 💬', 'success');
}

function likeComment(e) {
  const btn = e.target;
  const num = parseInt(btn.textContent.replace('❤ ','')) + 1;
  btn.textContent = `❤ ${num}`;
  btn.style.color = 'var(--live-red)';
}

// ===== TIP =====
function openTipModal(e) {
  const amt = parseInt(e.target.textContent);
  setTip(amt);
  showModal('tipModal');
}

function setTip(amount) {
  APP.selectedTip = amount;
  document.querySelectorAll('.tip-btn').forEach(b => b.classList.toggle('active', parseInt(b.textContent.replace(/[^0-9]/g,'')) === amount));
  const el = document.getElementById('tipAmount');
  if(el) el.textContent = amount.toLocaleString() + ' FCFA';
}

function setPayMethod(btn, method) {
  document.querySelectorAll('.pay-method').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function sendTip() {
  const custom = document.getElementById('customTip')?.value;
  const amount = custom ? parseInt(custom) : APP.selectedTip;
  if(!amount || amount < 50) { showToast('Montant minimum: 50 FCFA', 'error'); return; }
  if(APP.wallet.balance < amount) { showToast('Solde insuffisant!', 'error'); return; }
  APP.wallet.balance -= amount;
  closeModal('tipModal');
  showToast(`💸 Pourboire de ${amount.toLocaleString()} FCFA envoyé!`, 'success');
  // Add notification
  NOTIFICATIONS.unshift({ icon:'💰', text:`Votre pourboire de <strong>${amount.toLocaleString()} FCFA</strong> a été envoyé`, time:'maintenant', unread:false });
}

// ===== UPLOAD =====
function showUploadModal() { showModal('uploadModal'); }

function handleDrop(event) {
  event.preventDefault();
  const file = event.dataTransfer.files[0];
  if(file?.type.startsWith('video/')) simulateUpload(file.name);
}

function handleFileSelect(event) {
  const file = event.target.files[0];
  if(file) simulateUpload(file.name);
}

function simulateUpload(filename) {
  document.getElementById('uploadProgress').classList.remove('hidden');
  let pct = 0;
  const interval = setInterval(() => {
    pct += Math.random() * 15;
    pct = Math.min(pct, 100);
    document.getElementById('uploadProgressBar').style.width = Math.round(pct) + '%';
    document.getElementById('uploadProgressText').textContent =
      pct < 60 ? `Compression vidéo... ${Math.round(pct)}%` :
      pct < 90 ? `Upload sécurisé... ${Math.round(pct)}%` :
      `Génération miniature... ${Math.round(pct)}%`;
    if(pct >= 100) {
      clearInterval(interval);
      document.getElementById('uploadProgressText').textContent = '✓ Vidéo prête à publier!';
      document.getElementById('videoTitle').value = filename.replace(/\.[^.]+$/, '');
    }
  }, 300);
}

function publishVideo() {
  const title = document.getElementById('videoTitle').value.trim();
  if(!title) { showToast('Titre obligatoire!', 'error'); return; }
  const isPremium = document.getElementById('isPremium')?.checked;
  const premiumPrice = isPremium ? parseInt(document.getElementById('premiumPrice')?.value) : 0;
  const col = THUMB_COLORS[Math.floor(Math.random() * THUMB_COLORS.length)];
  const newVid = {
    id: 'v' + (APP.videos.length+1),
    title, creator: CREATORS[0],
    views: 0, likes: 0,
    duration: '0:00',
    category: document.getElementById('videoCategory').value || 'Divertissement',
    tags: document.getElementById('videoTags').value.split(' ').filter(Boolean),
    premium: isPremium, premiumPrice,
    live: false, liveViewers: 0,
    thumbColors: col,
    liked: false, saved: false,
    comments: [],
    postedAt: 'à l\'instant',
  };
  APP.videos.unshift(newVid);
  closeModal('uploadModal');
  showPage('home');
  showToast(`✓ "${title}" publié avec succès! 🎉`, 'success');
}

// ===== SEARCH =====
function searchVideos(query) {
  const dd = document.getElementById('searchDropdown');
  if(!query.trim()) { dd.classList.add('hidden'); return; }
  const results = APP.videos.filter(v =>
    v.title.toLowerCase().includes(query.toLowerCase()) ||
    v.creator.name.toLowerCase().includes(query.toLowerCase()) ||
    v.category.toLowerCase().includes(query.toLowerCase()) ||
    v.tags.some(t => t.toLowerCase().includes(query.toLowerCase()))
  ).slice(0, 6);
  
  if(results.length === 0) { dd.innerHTML = '<div class="search-result" style="color:var(--text-muted)">Aucun résultat</div>'; }
  else {
    dd.innerHTML = results.map(v => `
      <div class="search-result" onclick="showVideoPlayer('${v.id}');document.getElementById('searchDropdown').classList.add('hidden');">
        <strong>${v.title}</strong>
        <span style="color:var(--text-muted)"> — ${v.creator.name}</span>
      </div>
    `).join('');
  }
  dd.classList.remove('hidden');
}

// Hide search dropdown on outside click
document.addEventListener('click', e => {
  if(!e.target.closest('.search-bar')) {
    document.getElementById('searchDropdown')?.classList.add('hidden');
  }
});

// ===== TRENDING =====
function renderTrending() {
  const list = document.getElementById('trendingList');
  if(!list) return;
  const sorted = [...APP.videos].sort((a,b) => b.views - a.views);
  list.innerHTML = sorted.map((v, i) => {
    const [c1,c2] = v.thumbColors;
    return `
    <div class="trending-item" onclick="showVideoPlayer('${v.id}')">
      <div class="trending-rank">${i+1}</div>
      <div class="trending-thumb" style="background:linear-gradient(135deg,${c1},${c2})"></div>
      <div class="trending-info">
        <div class="trending-title">${v.title}</div>
        <div class="trending-stats">${v.creator.name} • ${formatViews(v.views)} vues • ${v.category}</div>
      </div>
      ${i < 3 ? `<span style="background:var(--accent);color:white;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;">🔥 Hot</span>` : ''}
    </div>`;
  }).join('');
}

// ===== PREMIUM =====
function renderPremium() {
  const grid = document.getElementById('premiumGrid');
  if(!grid) return;
  const premVids = APP.videos.filter(v => v.premium);
  grid.innerHTML = premVids.map(renderVideoCard).join('');
}

// ===== LIVE =====
function renderLive() {
  const grid = document.getElementById('liveGrid');
  if(!grid) return;
  const liveVids = APP.videos.filter(v => v.live);
  // Add a few fake lives
  const fakeLives = APP.videos.slice(3,6).map(v => ({...v, live:true, liveViewers: Math.floor(Math.random()*5000)+200}));
  grid.innerHTML = [...liveVids, ...fakeLives].map(renderVideoCard).join('');
}

function showStartLiveModal() { showModal('startLiveModal'); }

// ===== SUBSCRIPTIONS =====
function renderSubscriptions() {
  const cg = document.getElementById('subscriptionsList');
  if(cg) cg.innerHTML = CREATORS.map(c => `
    <div class="creator-card" onclick="subscribe('${c.id}')">
      <img src="${c.avatar}" alt="">
      <h4>${c.name} ${c.verified?'<span style="color:var(--accent)">✓</span>':''}</h4>
      <p>${formatViews(c.subs)} abonnés</p>
      <p style="margin-top:2px;">${c.country}</p>
      <button class="sub-btn">Abonné ✓</button>
    </div>
  `).join('');
  
  const sv = document.getElementById('subVideos');
  if(sv) sv.innerHTML = APP.videos.slice(0,8).map(renderVideoCard).join('');
}

// ===== MESSAGES =====
function renderMessages() {
  const cl = document.getElementById('conversationsList');
  if(!cl) return;
  cl.innerHTML = CONVERSATIONS.map(c => `
    <div class="convo-item" onclick="openChat('${c.id}')">
      <div class="convo-avatar"><img src="${c.avatar}" alt=""></div>
      <div class="convo-info">
        <div class="convo-name">${c.name} ${c.unread > 0 ? `<span style="background:var(--accent);color:white;font-size:10px;padding:1px 5px;border-radius:10px;margin-left:4px;">${c.unread}</span>`:''}</div>
        <div class="convo-preview">${c.preview}</div>
      </div>
      <div class="convo-time">${c.time}</div>
    </div>
  `).join('');
}

function openChat(convId) {
  const conv = CONVERSATIONS.find(c => c.id === convId);
  if(!conv) return;
  document.querySelectorAll('.convo-item').forEach(el => el.classList.remove('active'));
  event?.currentTarget?.classList.add('active');
  
  const msgs = CHAT_MESSAGES[convId] || [];
  const chatArea = document.getElementById('chatArea');
  chatArea.innerHTML = `
    <div class="chat-header">
      <div style="width:36px;height:36px;border-radius:50%;overflow:hidden;"><img src="${conv.avatar}" style="width:100%;height:100%;"></div>
      <div>
        <div style="font-size:14px;font-weight:600;">${conv.name}</div>
        <div style="font-size:11px;color:var(--success);">● En ligne</div>
      </div>
    </div>
    <div class="chat-messages" id="chatMessages">
      ${msgs.map(m => `<div class="msg ${m.from==='me'?'sent':'received'}">${m.text}<div style="font-size:10px;opacity:0.6;margin-top:3px;text-align:right;">${m.time}</div></div>`).join('')}
    </div>
    <div class="chat-input-row">
      <input type="text" id="chatMsgInput" placeholder="Écrivez un message..." onkeypress="sendMessage(event,'${convId}')">
      <button class="chat-send-btn" onclick="sendMessageBtn('${convId}')">↑</button>
    </div>
  `;
  const msgs_el = document.getElementById('chatMessages');
  if(msgs_el) msgs_el.scrollTop = msgs_el.scrollHeight;
}

function sendMessage(e, convId) {
  if(e.key === 'Enter') sendMessageBtn(convId);
}

function sendMessageBtn(convId) {
  const input = document.getElementById('chatMsgInput');
  if(!input?.value.trim()) return;
  const text = input.value.trim();
  input.value = '';
  const msgs = document.getElementById('chatMessages');
  if(msgs) {
    msgs.insertAdjacentHTML('beforeend', `<div class="msg sent">${text}<div style="font-size:10px;opacity:0.6;margin-top:3px;text-align:right;">maintenant</div></div>`);
    msgs.scrollTop = msgs.scrollHeight;
  }
  // Simulate reply
  setTimeout(() => {
    const replies = ['Super!','Merci pour l\'info!','D\'accord, je comprends 👍','On se retrouve bientôt!','C\'est noté!'];
    const reply = replies[Math.floor(Math.random()*replies.length)];
    if(msgs) {
      msgs.insertAdjacentHTML('beforeend', `<div class="msg received">${reply}<div style="font-size:10px;opacity:0.6;margin-top:3px;">maintenant</div></div>`);
      msgs.scrollTop = msgs.scrollHeight;
    }
  }, 1500);
}

// ===== WALLET =====
function renderWallet() {
  const el = document.getElementById('walletBalance');
  if(el) el.textContent = APP.wallet.balance.toLocaleString() + ' FCFA';
  
  const list = document.getElementById('transactionsList');
  if(list) list.innerHTML = TRANSACTIONS.map(tx => `
    <div class="transaction-item">
      <div class="tx-icon ${tx.type}">${tx.icon}</div>
      <div class="tx-info">
        <div class="tx-label">${tx.label}</div>
        <div class="tx-date">${tx.date}</div>
      </div>
      <div class="tx-amount ${tx.type}">${tx.amount}</div>
    </div>
  `).join('');
}

function deposit() {
  APP.wallet.balance += 10000;
  closeModal('depositModal');
  renderWallet();
  showToast('✓ 10,000 FCFA rechargés avec succès!', 'success');
}

function withdraw() {
  closeModal('withdrawModal');
  showToast('✓ Demande de retrait envoyée! Traitement sous 24h', 'success');
}

// ===== STATS =====
let chartsCreated = false;
function renderStats() {
  if(chartsCreated) return;
  chartsCreated = true;
  setTimeout(() => {
    const viewsCtx = document.getElementById('viewsChart');
    const revenueCtx = document.getElementById('revenueChart');
    if(!viewsCtx || !revenueCtx) return;
    
    const labels = Array.from({length:30},(_,i) => i+1);
    new Chart(viewsCtx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Vues',
          data: labels.map(() => Math.floor(Math.random()*15000)+2000),
          borderColor: '#FF6B35',
          backgroundColor: 'rgba(255,107,53,0.1)',
          fill: true, tension: 0.4, pointRadius: 0,
        }]
      },
      options: {
        responsive: true, plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9090A8' } },
          y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9090A8' } }
        }
      }
    });
    
    new Chart(revenueCtx, {
      type: 'doughnut',
      data: {
        labels: ['Pourboires', 'Premium', 'Lives', 'Abonnements'],
        datasets: [{ data: [8500,45000,22000,48000], backgroundColor: ['#FF6B35','#FFD700','#00D4AA','#7B61FF'], borderWidth: 0 }]
      },
      options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { color: '#9090A8', font: { size: 11 } } } } }
    });
  }, 100);
}

// ===== PROFILE =====
function renderProfile() {
  const grid = document.getElementById('profileVideos');
  if(grid) grid.innerHTML = APP.videos.slice(0,9).map(renderVideoCard).join('');
}

// ===== NOTIFICATIONS =====
function renderNotifications() {
  const list = document.getElementById('notifList');
  if(!list) return;
  list.innerHTML = NOTIFICATIONS.map(n => `
    <div class="notif-item ${n.unread?'unread':''}">
      <div class="notif-icon">${n.icon}</div>
      <div class="notif-text">${n.text}</div>
      <div class="notif-time">${n.time}</div>
    </div>
  `).join('');
}

// ===== ADMIN =====
function renderAdmin() {
  const rc = document.getElementById('reportedContent');
  if(!rc) return;
  const reported = [
    { title:'Contenu inapproprié — vidéo #47', reporter:'Aminata D.', reason:'Discours haineux', count:12 },
    { title:'Spam — vidéo #89', reporter:'Emmanuel O.', reason:'Contenu répétitif', count:8 },
    { title:'Vidéo trompeuse — #23', reporter:'Ibrahim T.', reason:'Fausse information', count:5 },
  ];
  rc.innerHTML = reported.map(r => `
    <div class="reported-item">
      <div class="reported-info">
        <strong>${r.title}</strong>
        <span> • ${r.count} signalements • Raison: ${r.reason}</span>
      </div>
      <div class="admin-actions">
        <button class="btn-hide" onclick="adminAction('masquer',event)">Masquer</button>
        <button class="btn-del" onclick="adminAction('supprimer',event)">Supprimer</button>
        <button class="btn-suspend" onclick="adminAction('suspendre',event)">Suspendre</button>
      </div>
    </div>
  `).join('');
}

function adminAction(action, e) {
  e.target.closest('.reported-item').style.opacity = '0.4';
  showToast(`Action "${action}" appliquée par l'admin ✓`, 'success');
}

// ===== SETTINGS =====
function setTheme(theme, btn) {
  document.body.classList.toggle('dark-theme', theme==='dark');
  document.body.classList.toggle('light-theme', theme==='light');
  document.querySelectorAll('.btn-theme').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  // Fix topbar bg
  document.querySelector('.topbar').style.background = theme==='light' ? 'rgba(245,245,248,0.92)' : 'rgba(14,14,18,0.92)';
  showToast(`Thème ${theme==='dark'?'sombre':'clair'} activé`, 'success');
}

function setAccent(color, dot) {
  document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
  dot.classList.add('active');
  document.documentElement.style.setProperty('--accent', color);
  APP.accentColor = color;
  showToast('Couleur personnalisée appliquée ✓', 'success');
}

// ===== MODALS =====
function showModal(id) { document.getElementById(id)?.classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id)?.classList.add('hidden'); }

// Close modals on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if(e.target === overlay) {
      overlay.classList.add('hidden');
      clearInterval(playInterval);
    }
  });
});

// ===== TOAST =====
let toastTimer = null;
function showToast(msg, type='success') {
  const t = document.getElementById('toast');
  t.innerHTML = msg;
  t.className = `toast ${type}`;
  t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), 3500);
}

// ===== KEYBOARD SHORTCUTS =====
document.addEventListener('keydown', e => {
  if(e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
    clearInterval(playInterval);
  }
  if(e.key === ' ' && APP.currentVideo) { e.preventDefault(); togglePlay(); }
});

// ===== START APP =====
init();
