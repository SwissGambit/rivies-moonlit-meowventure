(() => {
  'use strict';

  const canvas = document.getElementById('gameCanvas');
  const isTouchDevice = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
  const forceMobilePreview = new URLSearchParams(window.location.search).get('mobile') === '1';
  const isPortraitMobile = (isTouchDevice || forceMobilePreview) && window.innerWidth < window.innerHeight;
  if (isPortraitMobile){canvas.width=480;canvas.height=860;}
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const livesEl = document.getElementById('lives');
  const levelEl = document.getElementById('levelNumber');
  const startOverlay = document.getElementById('startOverlay');
  const endOverlay = document.getElementById('endOverlay');
  const endTitle = document.getElementById('endTitle');
  const endKicker = document.getElementById('endKicker');
  const endMessage = document.getElementById('endMessage');
  const endEmoji = document.getElementById('endEmoji');
  const finalScore = document.getElementById('finalScore');
  const restartButton = document.getElementById('restartButton');
  const leaderboardOverlay = document.getElementById('leaderboardOverlay');
  const leaderboardList = document.getElementById('leaderboardList');
  const canvasHint = document.getElementById('canvasHint');
  const heroNameInput = document.getElementById('heroName');

  const W = canvas.width;
  const H = canvas.height;
  const verticalOffset = Math.max(0,H-540);
  const WORLD_W = 3250;
  const GRAVITY = 1850;
  const MOVE_SPEED = 285;
  const JUMP_SPEED = isTouchDevice ? 715 : 680;
  const MAX_LEVEL = 10;
  const levelNames = [
    'Riviewood', "Grayson's Cat Town", 'Parker Penguin Flap', "Presley's Purrfect Place",
    "Malachi's Mane", "Solomon's Peak", "Zane's Mountain",
    "Nori's Catventure", "Adriel's Trail", "Lily's Flamingo Mango"
  ];
  const keys = { left: false, right: false, jump: false };

  let state = 'menu';
  let level = 1;
  let score = 0;
  let lives = 9;
  let cameraX = 0;
  let lastTime = performance.now();
  let muted = false;
  let audioContext = null;
  let musicTimer = null;
  let musicStep = 0;
  let themeFinished = false;
  let themeStarted = false;
  let leaderboardReturnState = 'menu';
  let scoreRecorded = false;
  const themeAudio = window.RIVIE_THEME_AUDIO ? new Audio(window.RIVIE_THEME_AUDIO) : null;
  if(themeAudio){
    themeAudio.loop=false;themeAudio.preload='auto';themeAudio.volume=.14;
    themeAudio.addEventListener('playing',()=>{themeStarted=true;});
    themeAudio.addEventListener('ended',()=>{themeFinished=true;startMusic();});
    themeAudio.addEventListener('error',()=>{themeFinished=true;startMusic();});
  }
  let heroName = 'Rivie';
  let heroColor = '#f5a65b';
  let heroKind = 'cat';
  let respawnTimer = 0;
  let platforms = [];
  let treats = [];
  let enemies = [];
  let allies = [];
  let boss = null;
  let powerup = null;

  const player = { x: 90, y: 390, w: 48, h: 54, vx: 0, vy: 0, grounded: false, facing: 1, invincible: 0, powered: 0, coyote: 0, jumpBuffer: 0, walk: 0 };
  const particles = [];
  const clouds = Array.from({ length: 14 }, (_, i) => ({ x: i * 270 + (i % 3) * 50, y: 72 + (i % 4) * 44, s: .65 + (i % 3) * .18 }));

  const platformSets = [
    [
      [0,480,680,60],[740,480,470,60],[1290,480,570,60],[1940,480,490,60],[2520,480,730,60],
      [260,380,170,24],[520,305,150,24],[820,365,190,24],[1100,275,150,24],[1390,375,175,24],
      [1640,295,170,24],[2010,365,170,24],[2260,275,145,24],[2600,370,170,24],[2850,300,150,24]
    ],
    [
      [0,480,500,60],[570,480,540,60],[1190,480,340,60],[1610,480,600,60],[2300,480,420,60],[2800,480,450,60],
      [210,355,160,24],[620,310,160,24],[895,385,145,24],[1235,335,180,24],[1660,365,155,24],
      [1900,275,180,24],[2340,330,160,24],[2600,255,155,24],[2860,355,160,24]
    ],
    [
      [0,480,760,60],[830,480,580,60],[1490,480,550,60],[2120,480,1130,60],
      [270,365,170,24],[535,285,160,24],[900,350,165,24],[1180,270,160,24],[1550,365,175,24],
      [1830,285,165,24],[2210,360,160,24],[2470,285,160,24]
    ],
    [
      [0,480,520,60],[600,480,380,60],[1060,480,560,60],[1700,480,420,60],[2200,480,300,60],[2580,480,670,60],
      [180,350,150,24],[395,275,145,24],[680,360,160,24],[1110,310,150,24],[1330,235,155,24],
      [1740,350,160,24],[1950,270,145,24],[2240,335,145,24],[2630,285,155,24],[2890,355,170,24]
    ],
    [
      [0,480,420,60],[500,480,700,60],[1290,480,300,60],[1670,480,650,60],[2400,480,350,60],[2820,480,430,60],
      [150,370,160,24],[545,300,170,24],[810,225,145,24],[1030,345,150,24],[1330,315,170,24],
      [1720,360,145,24],[1940,285,170,24],[2170,215,145,24],[2450,340,155,24],[2860,285,180,24]
    ],
    [
      [0,480,800,60],[880,480,420,60],[1370,480,520,60],[1970,480,470,60],[2520,480,730,60],
      [260,350,150,24],[500,265,155,24],[930,360,160,24],[1140,280,150,24],[1440,350,165,24],
      [1690,260,150,24],[2030,345,165,24],[2270,265,145,24],[2570,350,170,24],[2820,270,160,24]
    ],
    [
      [0,480,360,60],[430,480,430,60],[940,480,260,60],[1280,480,620,60],[1980,480,320,60],[2370,480,390,60],[2840,480,410,60],
      [120,335,150,24],[475,285,145,24],[690,205,145,24],[970,355,150,24],[1320,300,170,24],
      [1570,220,150,24],[1810,350,145,24],[2020,285,155,24],[2410,330,150,24],[2600,245,145,24],[2900,315,165,24]
    ],
    [
      [0,480,600,60],[680,480,290,60],[1050,480,650,60],[1780,480,270,60],[2130,480,590,60],[2800,480,450,60],
      [210,365,150,24],[430,285,145,24],[710,330,160,24],[1090,260,155,24],[1330,350,170,24],
      [1580,275,145,24],[1820,350,155,24],[2170,300,155,24],[2420,220,150,24],[2630,350,145,24],[2860,275,175,24]
    ],
    [
      [0,480,720,60],[800,480,500,60],[1380,480,450,60],[1910,480,520,60],[2510,480,740,60],
      [190,350,165,24],[450,270,150,24],[850,355,150,24],[1090,270,160,24],[1420,340,150,24],
      [1640,255,150,24],[1960,345,170,24],[2200,260,150,24],[2560,350,165,24],[2790,270,155,24]
    ],
    [
      [0,480,400,60],[480,480,340,60],[900,480,430,60],[1410,480,280,60],[1770,480,510,60],[2360,480,300,60],[2740,480,510,60],
      [120,370,145,24],[520,320,145,24],[730,240,145,24],[950,350,155,24],[1170,270,150,24],
      [1450,340,150,24],[1810,285,165,24],[2050,205,150,24],[2400,335,150,24],[2780,300,160,24],[3020,220,145,24]
    ]
  ];

  const enemySets = [
    [['cat',455,433,420,635,'patrol',58],['cat',890,318,825,990,'patrol',60],['trex',1450,425,1395,1580,'patrol',68],['cat',1725,248,1645,1800,'patrol',62],['trex',2075,425,2015,2400,'charge',70]],
    [['trex',390,425,290,480,'charge',72],['cat',680,263,620,770,'dart',68],['trex',950,425,790,1090,'patrol',75],['cat',1290,288,1240,1405,'patrol',70],['trex',1750,425,1615,2190,'charge',76],['cat',1960,228,1905,2070,'dart',72]],
    [['trex',590,425,460,750,'charge',78],['cat',960,303,900,1060,'dart',72],['trex',1260,425,1100,1400,'patrol',82],['cat',1620,318,1555,1710,'bob',70],['trex',1910,425,1820,2030,'charge',82],['cat',2260,313,2215,2355,'dart',74]],
    [['cat',250,303,185,325,'dart',78],['trex',720,425,615,960,'charge',84],['cat',1180,263,1110,1245,'bob',74],['trex',1510,425,1370,1605,'patrol',88],['cat',1810,303,1740,1885,'dart',80],['trex',2310,425,2210,2490,'charge',88],['cat',2920,308,2890,3040,'bob',76]],
    [['trex',310,425,150,410,'charge',90],['cat',610,253,550,705,'dart',82],['cat',1080,298,1030,1170,'bob',80],['trex',1430,425,1300,1580,'charge',92],['cat',1780,313,1720,1860,'dart',84],['trex',2070,425,1980,2290,'charge',94],['cat',2500,293,2450,2600,'bob',82],['trex',2940,425,2830,3240,'charge',95]],
    [['cat',360,303,265,645,'dart',88],['trex',720,425,560,790,'charge',96],['cat',1000,313,935,1080,'bob',84],['trex',1500,425,1380,1880,'charge',98],['cat',1750,213,1690,1835,'dart',90],['trex',2140,425,1980,2430,'charge',100],['cat',2640,303,2570,2730,'bob',88]],
    [['trex',260,425,100,350,'charge',100],['cat',535,238,480,615,'bob',88],['trex',1050,425,945,1190,'charge',102],['cat',1390,253,1320,1480,'dart',94],['trex',1660,425,1480,1890,'charge',104],['cat',2080,238,2020,2170,'bob',92],['trex',2500,425,2380,2750,'charge',106],['cat',2960,268,2900,3050,'dart',96]],
    [['cat',280,318,215,355,'dart',96],['trex',800,425,690,960,'charge',108],['cat',1160,213,1090,1240,'bob',94],['trex',1480,425,1380,1690,'charge',110],['cat',1870,303,1820,1970,'dart',100],['trex',2280,425,2140,2710,'charge',112],['cat',2470,173,2420,2570,'bob',96],['trex',3000,425,2810,3240,'charge',114]],
    [['trex',530,425,390,710,'charge',112],['cat',920,308,850,995,'bob',98],['trex',1160,425,1000,1290,'charge',115],['cat',1490,293,1420,1560,'dart',104],['trex',1740,425,1390,1820,'charge',118],['cat',2040,298,1960,2140,'bob',102],['trex',2270,425,1920,2420,'charge',120]],
    [['cat',200,323,125,300,'dart',108],['trex',610,425,490,810,'charge',122],['cat',780,193,730,870,'bob',105],['trex',1120,425,910,1320,'charge',125],['cat',1510,293,1450,1600,'dart',112],['trex',1980,425,1780,2270,'charge',128],['cat',2450,288,2400,2550,'bob',108],['trex',2890,425,2750,3240,'charge',132]]
  ];

  const allySets = [
    [[175,'#9b8bc4'],[1120,'#f4f0e8']],[[85,'#ff78b7'],[1680,'#f5a65b']],[[180,'#f4f0e8'],[2180,'#9b8bc4']],
    [[110,'#ff78b7'],[1810,'#f4f0e8']],[[90,'#9b8bc4'],[1760,'#ff78b7']],[[180,'#f5a65b'],[2080,'#f4f0e8']],
    [[95,'#ff78b7'],[1430,'#9b8bc4']],[[130,'#f4f0e8'],[2200,'#ff78b7']],[[160,'#9b8bc4'],[2040,'#f5a65b']],[[100,'#ff78b7'],[2500,'#f4f0e8']]
  ];

  const powerSpots = [[470,430],[690,260],[950,300],[440,225],[860,175],[1190,230],[740,155],[1630,225],[1120,220],[2090,155]];

  function resetRun() {
    level = 1;
    score = 0;
    lives = 9;
    scoreRecorded = false;
    loadLevel();
  }

  function loadLevel() {
    const difficulty = 1 + (level - 1) * .06;
    platforms = platformSets[level-1].map(([x,y,w,h]) => ({x,y:y+verticalOffset,w,h}));
    const ledges = platforms.filter(p => p.y < 470);
    const treatPoints = ledges.flatMap((p,i) => i%2 ? [[p.x+p.w*.5,p.y-42]] : [[p.x+p.w*.32,p.y-42],[p.x+p.w*.68,p.y-42]]);
    for(let x=320+(level%3)*35;x<3120;x+=390-level*8)treatPoints.push([x,420+verticalOffset-(level%2)*18]);
    treats = treatPoints.map(([x,y],i)=>({x,y,r:15,collected:false,phase:i*.7}));
    enemies = enemySets[level-1].map(([type,x,y,minX,maxX,behavior='patrol',speed],i) => {
      if(type==='trex'&&level>=5&&i%3===0)behavior='fly';
      return {type,x,y:y+verticalOffset,baseY:y+verticalOffset,w:type==='trex'?64:48,h:type==='trex'?55:47,vx:(i%2?-1:1)*speed*difficulty,baseSpeed:speed*difficulty,minX,maxX,behavior,turnLock:0,alive:true,walk:i,phase:i*.9};
    });
    allies = allySets[level-1].map(([x,color])=>({x,y:437+verticalOffset,color,collected:false}));
    const bossType = level === 3 ? 'gorilla' : level === 6 ? 'trex' : level === 9 ? 'lion' : null;
    const bossHealth = bossType ? 4 + level / 3 : 0;
    boss = bossType ? { type:bossType,x:2850,y:365+verticalOffset,w:bossType==='trex'?135:116,h:115,vx:-85*difficulty,minX:2640,maxX:3110,hp:bossHealth,maxHp:bossHealth,alive:true,walk:0,hitCooldown:0 } : null;
    powerup = {x:powerSpots[level-1][0],y:powerSpots[level-1][1]+verticalOffset,r:22,collected:false,phase:0};
    Object.assign(player,{x:90,y:390+verticalOffset,vx:0,vy:0,grounded:false,facing:1,invincible:0,powered:0,coyote:0,jumpBuffer:0,walk:0});
    cameraX = 0;
    particles.length = 0;
    updateHud();
  }

  function updateHud() {
    scoreEl.textContent = score;
    livesEl.textContent = lives;
    levelEl.textContent = level;
  }

  function readLeaderboard(){
    try{return JSON.parse(localStorage.getItem('rivieLeaderboard')||'[]');}catch{return [];}
  }

  function renderLeaderboard(){
    const board=readLeaderboard();leaderboardList.replaceChildren();
    if(!board.length){const empty=document.createElement('li');empty.className='leaderboard-empty';empty.textContent='Finish a run to claim the first spot!';leaderboardList.appendChild(empty);return;}
    board.forEach(entry=>{const item=document.createElement('li');const row=document.createElement('div');row.className='leaderboard-entry';const name=document.createElement('strong');name.textContent=entry.name;const result=document.createElement('span');result.textContent=`${entry.score} 🍕🧁`;row.append(name,result);item.appendChild(row);leaderboardList.appendChild(item);});
  }

  function recordScore(){
    if(scoreRecorded)return;scoreRecorded=true;
    const board=readLeaderboard();board.push({name:(heroName||'Player').slice(0,12),score,finishedAt:Date.now()});
    board.sort((a,b)=>b.score-a.score||a.finishedAt-b.finishedAt);board.splice(10);
    try{localStorage.setItem('rivieLeaderboard',JSON.stringify(board));}catch{}
    renderLeaderboard();
  }

  function startGame() {
    heroName = (heroNameInput.value.trim() || 'Rivie').slice(0,12);
    heroColor = document.querySelector('input[name="coat"]:checked').value;
    heroKind = document.querySelector('input[name="character"]:checked').value;
    startOverlay.classList.remove('visible');
    endOverlay.classList.remove('visible');
    canvasHint.classList.remove('hidden');
    resetRun();
    state = 'playing';
    document.body.classList.add('game-active');
    canvas.focus();
    ensureAudio();
    startThemeAudio(false);
  }

  function ensureAudio() {
    if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') audioContext.resume();
  }

  function sound(type) {
    if (muted) return;
    ensureAudio();
    const now = audioContext.currentTime;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.connect(gain); gain.connect(audioContext.destination);
    const s = {
      jump:['square',310,520,.13,.075], treat:['sine',650,1180,.18,.09], bop:['triangle',190,105,.2,.11],
      boss:['sawtooth',150,85,.24,.11], power:['sine',380,1450,.5,.12], life:['sine',520,1320,.42,.1], hurt:['sawtooth',170,70,.28,.1], win:['triangle',450,900,.55,.12], clear:['sine',480,960,.35,.1]
    }[type];
    osc.type=s[0]; osc.frequency.setValueAtTime(s[1],now); osc.frequency.exponentialRampToValueAtTime(s[2],now+s[3]);
    gain.gain.setValueAtTime(s[4],now); gain.gain.exponentialRampToValueAtTime(.001,now+s[3]); osc.start(now); osc.stop(now+s[3]);
  }

  function startMusic() {
    if (musicTimer) return;
    const melody = [659,784,880,784,698,659,587,659,523,659,784,659,587,523,494,587];
    musicTimer = window.setInterval(() => {
      if (muted || state !== 'playing' || document.hidden || !audioContext) return;
      const now = audioContext.currentTime;
      const note = melody[musicStep % melody.length];
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.type = musicStep % 4 === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(note,now);
      gain.gain.setValueAtTime(.0001,now);
      gain.gain.exponentialRampToValueAtTime(.01,now+.025);
      gain.gain.exponentialRampToValueAtTime(.0001,now+.2);
      osc.connect(gain);gain.connect(audioContext.destination);osc.start(now);osc.stop(now+.22);
      if(musicStep%4===0){
        const bass=audioContext.createOscillator();const bassGain=audioContext.createGain();bass.type='sine';bass.frequency.value=note/4;
        bassGain.gain.setValueAtTime(.006,now);bassGain.gain.exponentialRampToValueAtTime(.0001,now+.35);bass.connect(bassGain);bassGain.connect(audioContext.destination);bass.start(now);bass.stop(now+.36);
      }
      musicStep++;
    },240);
  }

  function startThemeAudio(restart=false){
    if(!themeAudio){startMusic();return;}
    if(themeFinished){startMusic();return;}
    themeAudio.muted=muted;themeAudio.volume=.14;if(restart&&!themeStarted)themeAudio.currentTime=0;
    const attempt=themeAudio.play();if(attempt)attempt.catch(()=>{});
  }

  function rectsOverlap(a,b) { return a.x<b.x+b.w && a.x+a.w>b.x && a.y<b.y+b.h && a.y+a.h>b.y; }

  function performJump() {
    player.vy=-JUMP_SPEED;player.grounded=false;player.coyote=0;player.jumpBuffer=0;sound('jump');puff(player.x+player.w/2,player.y+player.h,'#d6c9ef',5);
  }

  function jump() {
    if(state!=='playing')return;
    if(player.grounded||player.coyote>0)performJump();
    else player.jumpBuffer=.14;
  }

  function update(dt) {
    if (state!=='playing') return;
    dt=Math.min(dt,.032);
    player.invincible=Math.max(0,player.invincible-dt);
    player.powered=Math.max(0,player.powered-dt);
    player.jumpBuffer=Math.max(0,player.jumpBuffer-dt);
    respawnTimer=Math.max(0,respawnTimer-dt);

    const targetVx=(keys.right?MOVE_SPEED:0)-(keys.left?MOVE_SPEED:0);
    player.vx+=(targetVx-player.vx)*Math.min(1,dt*(player.grounded?13:7));
    if (Math.abs(targetVx)<1 && Math.abs(player.vx)<4) player.vx=0;
    if (player.vx) player.facing=Math.sign(player.vx);
    player.walk+=Math.abs(player.vx)*dt*.04;

    const oldX=player.x;
    player.x+=player.vx*dt;
    player.x=Math.max(0,Math.min(WORLD_W-player.w,player.x));
    if (boss?.alive) player.x=Math.min(player.x,3090-player.w);
    for (const p of platforms) {
      if (!rectsOverlap(player,p)) continue;
      if (oldX+player.w<=p.x+3) player.x=p.x-player.w;
      else if (oldX>=p.x+p.w-3) player.x=p.x+p.w;
      player.vx=0;
    }

    const oldY=player.y;
    const oldBottom=oldY+player.h;
    player.vy+=GRAVITY*dt;
    player.y+=player.vy*dt;
    player.grounded=false;
    for (const p of platforms) {
      if (!rectsOverlap(player,p)) continue;
      if (player.vy>=0 && oldBottom<=p.y+5) { player.y=p.y-player.h; player.vy=0; player.grounded=true; }
      else if (player.vy<0 && oldY>=p.y+p.h-4) { player.y=p.y+p.h; player.vy=30; }
    }
    if(player.grounded)player.coyote=.12;else player.coyote=Math.max(0,player.coyote-dt);
    if(player.jumpBuffer>0&&player.coyote>0)performJump();

    for (const treat of treats) {
      treat.phase+=dt*4;
      const box={x:treat.x-treat.r,y:treat.y-treat.r,w:treat.r*2,h:treat.r*2};
      if (!treat.collected && rectsOverlap(player,box)) {
        treat.collected=true; score++; updateHud(); sound('treat'); puff(treat.x,treat.y,'#ffcf72',12);
      }
    }

    if (powerup && !powerup.collected) {
      powerup.phase += dt * 3;
      const starBox={x:powerup.x-powerup.r,y:powerup.y-powerup.r,w:powerup.r*2,h:powerup.r*2};
      if (rectsOverlap(player,starBox)) {
        powerup.collected=true; player.powered=8; sound('power'); puff(powerup.x,powerup.y,'#fff59a',28);
      }
    }

    for(const ally of allies){
      if(ally.collected)continue;
      const allyBox={x:ally.x-8,y:ally.y-8,w:54,h:56};
      if(rectsOverlap(player,allyBox)){
        ally.collected=true;lives++;updateHud();sound('life');puff(ally.x+19,ally.y+15,'#ff8fc5',24);
      }
    }

    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      enemy.phase+=dt;enemy.turnLock=Math.max(0,enemy.turnLock-dt);
      let speedFactor=enemy.behavior==='dart'?.55+Math.abs(Math.sin(enemy.phase*3.2))*1.15:1;
      if(enemy.behavior==='charge'&&enemy.turnLock<=0&&Math.abs(player.x-enemy.x)<270&&player.x>=enemy.minX&&player.x<=enemy.maxX){enemy.vx=Math.sign(player.x-enemy.x||1)*enemy.baseSpeed*1.55;}
      else enemy.vx=Math.sign(enemy.vx||1)*enemy.baseSpeed*speedFactor;
      enemy.y=enemy.behavior==='bob'?enemy.baseY-Math.abs(Math.sin(enemy.phase*2.4))*34:enemy.behavior==='fly'?enemy.baseY-70+Math.sin(enemy.phase*2.8)*30:enemy.baseY;
      enemy.x+=enemy.vx*dt; enemy.walk+=dt*(enemy.type==='trex'?8:6)*speedFactor;
      if (enemy.x<enemy.minX || enemy.x+enemy.w>enemy.maxX) {
        const hitLeft=enemy.x<enemy.minX;enemy.x=Math.max(enemy.minX,Math.min(enemy.maxX-enemy.w,enemy.x));enemy.vx=(hitLeft?1:-1)*enemy.baseSpeed;enemy.turnLock=.55;
      }
      if (rectsOverlap(player,enemy) && player.powered>0) {
        enemy.alive=false; sound('bop'); puff(enemy.x+enemy.w/2,enemy.y+enemy.h/2,'#fff59a',18);
      } else if (rectsOverlap(player,enemy) && player.invincible<=0) {
        const stomp=player.vy>120 && oldBottom<=enemy.y+18;
        if (stomp) { enemy.alive=false; player.vy=-430; sound('bop'); puff(enemy.x+enemy.w/2,enemy.y+enemy.h/2,enemy.type==='trex'?'#86d888':'#ef7e9f',14); }
        else hurt();
      }
    }

    if (boss?.alive) {
      boss.hitCooldown=Math.max(0,boss.hitCooldown-dt);
      boss.x+=boss.vx*dt; boss.walk+=dt*5;
      if (boss.x<boss.minX || boss.x+boss.w>boss.maxX) { boss.x=Math.max(boss.minX,Math.min(boss.maxX-boss.w,boss.x)); boss.vx*=-1; }
      if (rectsOverlap(player,boss) && player.invincible<=0 && player.powered<=0 && boss.hitCooldown<=0) {
        const stomp=player.vy>110 && oldBottom<=boss.y+30;
        if (stomp) {
          boss.hp--; boss.hitCooldown=.6; player.vy=-520; sound('boss'); puff(boss.x+boss.w/2,boss.y+25,'#ffd15c',20);
          if (boss.hp<=0) { boss.alive=false; sound('clear'); puff(boss.x+boss.w/2,boss.y+boss.h/2,'#ff78b7',36); }
        } else hurt();
      }
    }

    if (player.y>H+150 && respawnTimer<=0) hurt(true);
    if (player.x+player.w>3160 && player.y+player.h>300 && !boss?.alive) finishLevel();
    cameraX+=(Math.max(0,Math.min(WORLD_W-W,player.x-W*.36))-cameraX)*Math.min(1,dt*5);
    particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=600*dt;p.life-=dt;});
    for(let i=particles.length-1;i>=0;i--) if(particles[i].life<=0) particles.splice(i,1);
  }

  function hurt(fell=false) {
    if (respawnTimer>0 || state!=='playing') return;
    sound('hurt'); lives--; updateHud();
    if (lives<=0) { lose(); return; }
    player.invincible=1.5; respawnTimer=.25;
    Object.assign(player,{x:Math.max(70,player.x-150),y:fell?330+verticalOffset:Math.max(120+verticalOffset,player.y-55),vx:fell?0:-player.facing*190,vy:-320,grounded:false});
  }

  function finishLevel() {
    if (state!=='playing') return;
    if (level<MAX_LEVEL) {
      state='levelclear';document.body.classList.remove('game-active');sound('clear');
      const praise=level%2?'Well done Nino!':'Good Job Nino!';
      endEmoji.textContent='🦩'; endKicker.textContent=`Level ${level} complete!`; endTitle.textContent=praise;
      endMessage.textContent=`${heroName} cleared ${levelNames[level-1]}. ${levelNames[level]} is waiting!`;
      finalScore.textContent=`${score} collected`; restartButton.innerHTML='Next level <span aria-hidden="true">→</span>';
      endOverlay.classList.add('visible');
    } else win();
  }

  function win() {
    state='won';document.body.classList.remove('game-active');sound('win');
    recordScore();
    endEmoji.textContent='🏆'; endKicker.textContent='Gorilla defeated!'; endTitle.textContent='You Win!';
    endMessage.textContent=`${heroName} Congratulations brave Nino. You cleared all ten levels of Rivie's moonlit adventure! You've made El Padre very proud!`;
    finalScore.textContent=`${score} collected`; restartButton.innerHTML='Play again <span aria-hidden="true">↻</span>';
    endOverlay.classList.add('visible');
  }

  function lose() {
    state='lost';document.body.classList.remove('game-active');
    recordScore();
    endEmoji.textContent='🐾'; endKicker.textContent='Oh, whiskers!'; endTitle.textContent='Game Over';
    endMessage.textContent=`${heroName} needs one heroic snack before trying again.`;
    finalScore.textContent=`${score} collected`; restartButton.innerHTML='Try again <span aria-hidden="true">↻</span>';
    endOverlay.classList.add('visible');
  }

  function puff(x,y,color,count) {
    for(let i=0;i<count;i++) particles.push({x,y,vx:(Math.random()-.5)*240,vy:-80-Math.random()*190,life:.45+Math.random()*.4,size:3+Math.random()*6,color});
  }

  function roundedRect(x,y,w,h,r) { ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill(); }

  function drawCat(x,y,w,h,color,facing=1,hostile=false,walk=0,kind='cat') {
    ctx.save();ctx.translate(x+w/2,y+h/2);ctx.scale(facing,1);ctx.translate(-w/2,-h/2);
    const bounce=Math.sin(walk)*1.5;
    if(kind==='lion') { ctx.fillStyle='#a95f38';ctx.beginPath();ctx.arc(w*.49,h*.41,w*.39,0,Math.PI*2);ctx.fill(); }
    ctx.fillStyle=color;
    ctx.beginPath();ctx.moveTo(w*.22,h*.28);ctx.lineTo(w*.14,2);ctx.lineTo(w*.39,h*.16);ctx.lineTo(w*.68,1);ctx.lineTo(w*.78,h*.29);ctx.closePath();ctx.fill();
    ctx.beginPath();ctx.ellipse(w*.48,h*.42+bounce,w*.34,h*.29,0,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.ellipse(w*.53,h*.78+bounce,w*.31,h*.25,0,0,Math.PI*2);ctx.fill();
    ctx.lineWidth=7;ctx.lineCap='round';ctx.strokeStyle=color;ctx.beginPath();ctx.moveTo(w*.74,h*.72);ctx.quadraticCurveTo(w*1.06,h*.64,w*.87,h*.45);ctx.stroke();
    if(kind==='cheetah') { ctx.fillStyle='#4c3042';for(const [sx,sy] of [[.31,.28],[.58,.25],[.7,.66],[.42,.75]]){ctx.beginPath();ctx.arc(w*sx,h*sy,2.2,0,Math.PI*2);ctx.fill();} }
    if(kind==='tiger') { ctx.strokeStyle='#51304a';ctx.lineWidth=3;for(const sx of [.28,.47,.66]){ctx.beginPath();ctx.moveTo(w*sx,h*.2);ctx.lineTo(w*(sx+.04),h*.34);ctx.stroke();} }
    ctx.strokeStyle=hostile?'#692d53':'#fff';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(w*.35,h*.88);ctx.lineTo(w*.34+Math.sin(walk)*3,h);ctx.moveTo(w*.64,h*.88);ctx.lineTo(w*.65-Math.sin(walk)*3,h);ctx.stroke();
    ctx.fillStyle=hostile?'#32173f':'#352549';
    if(hostile){ctx.save();ctx.translate(w*.35,h*.38);ctx.rotate(.22);ctx.fillRect(-4,-2,8,4);ctx.restore();ctx.save();ctx.translate(w*.61,h*.38);ctx.rotate(-.22);ctx.fillRect(-4,-2,8,4);ctx.restore();}
    else{ctx.beginPath();ctx.arc(w*.36,h*.38,3.1,0,Math.PI*2);ctx.arc(w*.61,h*.38,3.1,0,Math.PI*2);ctx.fill();}
    ctx.fillStyle='#ef7197';ctx.beginPath();ctx.moveTo(w*.49,h*.47);ctx.lineTo(w*.44,h*.43);ctx.lineTo(w*.54,h*.43);ctx.closePath();ctx.fill();
    ctx.strokeStyle=hostile?'#32173f':'#5a426c';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(w*.28,h*.5);ctx.lineTo(w*.04,h*.45);ctx.moveTo(w*.28,h*.54);ctx.lineTo(0,h*.57);ctx.moveTo(w*.69,h*.5);ctx.lineTo(w*.94,h*.45);ctx.moveTo(w*.69,h*.54);ctx.lineTo(w,h*.58);ctx.stroke();
    if(!hostile){ctx.fillStyle='#75e0ba';ctx.fillRect(w*.2,h*.62,w*.57,5);ctx.fillStyle='#ffd15c';ctx.beginPath();ctx.arc(w*.49,h*.68,4,0,Math.PI*2);ctx.fill();}
    ctx.restore();
  }

  function drawTurtle(x,y,w,h,facing,walk) {
    ctx.save();ctx.translate(x+w/2,y+h/2);ctx.scale(facing,1);ctx.translate(-w/2,-h/2);
    ctx.fillStyle='#77d5a4';ctx.beginPath();ctx.arc(w*.78,h*.42,10,0,Math.PI*2);ctx.fill();ctx.fillStyle='#3b3155';ctx.beginPath();ctx.arc(w*.82,h*.39,2,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=heroColor;ctx.beginPath();ctx.ellipse(w*.45,h*.57,w*.36,h*.32,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#fff3';ctx.lineWidth=3;ctx.stroke();
    ctx.strokeStyle='#77d5a4';ctx.lineWidth=7;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(w*.3,h*.8);ctx.lineTo(w*.25+Math.sin(walk)*3,h*.96);ctx.moveTo(w*.62,h*.8);ctx.lineTo(w*.68-Math.sin(walk)*3,h*.96);ctx.stroke();ctx.restore();
  }

  function drawPenguin(x,y,w,h,facing,walk) {
    ctx.save();ctx.translate(x+w/2,y+h/2);ctx.scale(facing,1);ctx.translate(-w/2,-h/2);
    ctx.fillStyle='#302c4b';ctx.beginPath();ctx.ellipse(w*.5,h*.53,w*.34,h*.46,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=heroColor;ctx.beginPath();ctx.ellipse(w*.5,h*.62,w*.21,h*.31,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#ffd15c';ctx.beginPath();ctx.moveTo(w*.7,h*.35);ctx.lineTo(w*.95,h*.43);ctx.lineTo(w*.7,h*.48);ctx.closePath();ctx.fill();
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(w*.58,h*.28,5,0,Math.PI*2);ctx.fill();ctx.fillStyle='#302c4b';ctx.beginPath();ctx.arc(w*.6,h*.28,2,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#ffd15c';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(w*.36,h*.9);ctx.lineTo(w*.28+Math.sin(walk)*3,h);ctx.moveTo(w*.6,h*.9);ctx.lineTo(w*.68-Math.sin(walk)*3,h);ctx.stroke();ctx.restore();
  }

  function drawHero() {
    if(player.invincible>0 && Math.floor(player.invincible*12)%2) return;
    if(heroKind==='turtle') drawTurtle(player.x,player.y,player.w,player.h,player.facing,player.walk);
    else if(heroKind==='penguin') drawPenguin(player.x,player.y,player.w,player.h,player.facing,player.walk);
    else drawCat(player.x,player.y,player.w,player.h,heroColor,player.facing,false,player.walk,heroKind);
  }

  function drawTrex(e) {
    ctx.save();ctx.translate(e.x+e.w/2,e.y+e.h/2);ctx.scale(Math.sign(e.vx),1);ctx.translate(-e.w/2,-e.h/2);
    ctx.fillStyle='#60bd79';ctx.beginPath();ctx.ellipse(e.w*.47,e.h*.58,e.w*.36,e.h*.35,0,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.roundRect(e.w*.48,2,e.w*.45,e.h*.45,8);ctx.fill();ctx.beginPath();ctx.moveTo(e.w*.2,e.h*.58);ctx.lineTo(-8,e.h*.38);ctx.lineTo(e.w*.2,e.h*.72);ctx.fill();
    ctx.fillStyle='#fff';ctx.beginPath();ctx.moveTo(e.w*.61,e.h*.45);ctx.lineTo(e.w*.69,e.h*.56);ctx.lineTo(e.w*.76,e.h*.45);ctx.lineTo(e.w*.83,e.h*.56);ctx.lineTo(e.w*.9,e.h*.44);ctx.fill();
    ctx.fillStyle='#382840';ctx.beginPath();ctx.arc(e.w*.77,e.h*.17,3,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#60bd79';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(e.w*.35,e.h*.78);ctx.lineTo(e.w*.3+Math.sin(e.walk)*4,e.h);ctx.moveTo(e.w*.59,e.h*.78);ctx.lineTo(e.w*.65-Math.sin(e.walk)*4,e.h);ctx.stroke();ctx.restore();
  }

  function drawGorilla(g) {
    ctx.save();ctx.translate(g.x+g.w/2,g.y+g.h/2);ctx.scale(Math.sign(g.vx),1);ctx.translate(-g.w/2,-g.h/2);
    ctx.fillStyle=g.hitCooldown>0?'#ff8fbf':'#554c70';ctx.beginPath();ctx.ellipse(g.w*.5,g.h*.6,g.w*.34,g.h*.4,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(g.w*.5,g.h*.28,g.w*.25,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#9b8ba7';ctx.beginPath();ctx.ellipse(g.w*.52,g.h*.34,g.w*.17,g.h*.13,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle=g.hitCooldown>0?'#ff8fbf':'#554c70';ctx.lineWidth=18;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(g.w*.25,g.h*.5);ctx.lineTo(g.w*.1,g.h*.92);ctx.moveTo(g.w*.75,g.h*.5);ctx.lineTo(g.w*.9,g.h*.92);ctx.stroke();
    ctx.fillStyle='#241735';ctx.beginPath();ctx.arc(g.w*.42,g.h*.24,4,0,Math.PI*2);ctx.arc(g.w*.61,g.h*.24,4,0,Math.PI*2);ctx.fill();ctx.restore();
  }

  function drawPizzaCupcake(t) {
    const y=t.y+Math.sin(t.phase)*5;
    ctx.save();ctx.translate(t.x,y);ctx.rotate(Math.sin(t.phase*.7)*.08);
    ctx.fillStyle='#f391a8';ctx.beginPath();ctx.moveTo(-12,1);ctx.lineTo(12,1);ctx.lineTo(8,17);ctx.lineTo(-8,17);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#fff5';ctx.lineWidth=2;for(let x=-6;x<=6;x+=6){ctx.beginPath();ctx.moveTo(x,3);ctx.lineTo(x,15);ctx.stroke();}
    ctx.fillStyle='#ffd15c';ctx.beginPath();ctx.moveTo(0,-18);ctx.lineTo(-16,3);ctx.lineTo(16,3);ctx.closePath();ctx.fill();ctx.strokeStyle='#e58a45';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-16,3);ctx.lineTo(16,3);ctx.stroke();
    ctx.fillStyle='#ef5b69';for(const [x,yy] of [[-5,-3],[5,-1],[1,-10]]){ctx.beginPath();ctx.arc(x,yy,2.8,0,Math.PI*2);ctx.fill();}ctx.restore();
  }

  function drawFinishFlamingo(){
    const x=3065,y=420+verticalOffset;const message=level%2?'Well done!':'Good job!';
    ctx.fillStyle='rgba(255,255,255,.94)';roundedRect(x-70,y-58,122,34,12);
    ctx.fillStyle='#4d315e';ctx.font='900 12px Trebuchet MS';ctx.textAlign='center';ctx.fillText(message,x-9,y-36);ctx.textAlign='start';
    ctx.fillStyle='#ff78b7';ctx.font='48px sans-serif';ctx.fillText('🦩',x-26,y+35);
  }

  function drawCatStar(s) {
    const y=s.y+Math.sin(s.phase)*7;
    ctx.save();ctx.translate(s.x,y);ctx.rotate(Math.sin(s.phase*.7)*.12);
    ctx.shadowColor='#fff59a';ctx.shadowBlur=18;ctx.fillStyle='#ffe96d';ctx.strokeStyle='#fff6b8';ctx.lineWidth=3;
    ctx.beginPath();
    for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5;const r=i%2===0?s.r:s.r*.48;const x=Math.cos(a)*r;const yy=Math.sin(a)*r;if(i===0)ctx.moveTo(x,yy);else ctx.lineTo(x,yy);}
    ctx.closePath();ctx.fill();ctx.stroke();ctx.shadowBlur=0;
    ctx.fillStyle='#6b4a45';ctx.beginPath();ctx.moveTo(-8,-2);ctx.lineTo(-5,-11);ctx.lineTo(0,-5);ctx.lineTo(5,-11);ctx.lineTo(8,-2);ctx.closePath();ctx.fill();
    ctx.fillStyle='#392c48';ctx.beginPath();ctx.arc(-5,0,2,0,Math.PI*2);ctx.arc(5,0,2,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#ef7197';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,5,4,0,Math.PI);ctx.stroke();ctx.restore();
  }

  function drawBackground() {
    const palette=(level-1)%3;
    const colors=palette===0?['#554497','#8e78c2','#e89aab']:palette===1?['#24496f','#587fa3','#c888b0']:['#30204f','#674673','#c76583'];
    const gradient=ctx.createLinearGradient(0,0,0,H);gradient.addColorStop(0,colors[0]);gradient.addColorStop(.55,colors[1]);gradient.addColorStop(1,colors[2]);ctx.fillStyle=gradient;ctx.fillRect(0,0,W,H);
    const moonX=Math.min(790,W-76);
    ctx.fillStyle='#a8efd0';ctx.beginPath();ctx.arc(moonX,92,47,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#a8efd0';ctx.beginPath();ctx.arc(moonX-20,126,11,0,Math.PI*2);ctx.arc(moonX+2,132,9,0,Math.PI*2);ctx.arc(moonX+22,126,12,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#5b3a43';for(const [dx,y,r] of [[-17,78,6],[15,67,5],[27,103,7],[-6,110,4],[8,88,3]]){ctx.beginPath();ctx.arc(moonX+dx,y,r,0,Math.PI*2);ctx.fill();}
    ctx.fillStyle='rgba(255,255,255,.28)';ctx.beginPath();ctx.arc(moonX-14,72,9,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='rgba(255,255,255,.65)';for(let i=0;i<28;i++){const x=(i*137-cameraX*.08)%1100;const y=24+(i*67)%210;const s=i%4===0?2.2:1.2;ctx.fillRect(x,y,s,s);}
    for(const c of clouds){const x=c.x-cameraX*.18;if(x<-160||x>W+160)continue;ctx.fillStyle='rgba(255,239,244,.2)';ctx.beginPath();ctx.ellipse(x,c.y,80*c.s,24*c.s,0,0,Math.PI*2);ctx.ellipse(x-42*c.s,c.y+5,48*c.s,18*c.s,0,0,Math.PI*2);ctx.ellipse(x+43*c.s,c.y+6,52*c.s,18*c.s,0,0,Math.PI*2);ctx.fill();}
    ctx.fillStyle='#4d3d79';ctx.beginPath();ctx.moveTo(0,400+verticalOffset);for(let x=0;x<=W+100;x+=120)ctx.lineTo(x,285+verticalOffset+Math.sin((x+cameraX*.12)*.008)*45);ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.fill();
    ctx.fillStyle='#3c315f';ctx.beginPath();ctx.moveTo(0,430+verticalOffset);for(let x=0;x<=W+100;x+=95)ctx.lineTo(x,360+verticalOffset+Math.sin((x+cameraX*.25)*.013)*35);ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.fill();
    ctx.textAlign='center';ctx.fillStyle='rgba(255,250,242,.9)';ctx.font='900 18px Trebuchet MS, sans-serif';ctx.fillText('Weird Lull - River',W/2,38);
    ctx.font='700 10px Trebuchet MS, sans-serif';ctx.fillStyle='rgba(255,250,242,.65)';ctx.fillText(`LEVEL ${level} · ${levelNames[level-1].toUpperCase()}`,W/2,56);ctx.textAlign='start';
  }

  function drawWorld() {
    ctx.save();ctx.translate(-cameraX,0);
    const grass=(level-1)%3===1?'#80d4d1':(level-1)%3===2?'#e583a9':'#75cfa7';
    for(const p of platforms){ctx.fillStyle='#49365e';roundedRect(p.x,p.y,p.w,p.h+20,10);ctx.fillStyle=grass;roundedRect(p.x,p.y,p.w,Math.min(15,p.h),8);ctx.fillStyle='#d6ffd9aa';for(let x=p.x+12;x<p.x+p.w-8;x+=36){ctx.beginPath();ctx.moveTo(x,p.y+2);ctx.lineTo(x+6,p.y-9);ctx.lineTo(x+11,p.y+3);ctx.fill();}}
    for(const t of treats)if(!t.collected)drawPizzaCupcake(t);
    if(powerup && !powerup.collected)drawCatStar(powerup);
    for(const a of allies){if(a.collected)continue;drawCat(a.x,a.y,38,43,a.color,1,false,0,'cat');ctx.fillStyle='#ff78b7';ctx.font='900 13px Trebuchet MS';ctx.fillText('♥ +1',a.x+3,a.y-8);}
    for(const e of enemies)if(e.alive){if(e.type==='trex')drawTrex(e);else drawCat(e.x,e.y,e.w,e.h,'#c96a86',Math.sign(e.vx),true,e.walk,'cat');}
    if(boss?.alive){
      if(boss.type==='gorilla')drawGorilla(boss);else if(boss.type==='trex')drawTrex(boss);else drawCat(boss.x,boss.y,boss.w,boss.h,'#d68b43',Math.sign(boss.vx),true,boss.walk,'lion');
      ctx.fillStyle='#241735bb';roundedRect(2705,190,330,42,12);ctx.fillStyle='#fff';ctx.font='900 12px Trebuchet MS';ctx.fillText(`${boss.type.toUpperCase()} BOSS`,2720,207);ctx.fillStyle='#ef5b86';ctx.fillRect(2820,198,195*(boss.hp/boss.maxHp),20);ctx.strokeStyle='#fff6';ctx.strokeRect(2820,198,195,20);
    }
    drawFinishFlamingo();
    const flagOffset=verticalOffset;
    ctx.fillStyle='#e5d9f3';ctx.fillRect(3170,205+flagOffset,8,275);ctx.fillStyle=boss?.alive?'#6d6387':'#ffd15c';ctx.beginPath();ctx.arc(3174,197+flagOffset,10,0,Math.PI*2);ctx.fill();ctx.fillStyle=boss?.alive?'#6d6387':'#ef5b86';ctx.beginPath();ctx.moveTo(3178,220+flagOffset);ctx.lineTo(3102,238+flagOffset);ctx.lineTo(3178,272+flagOffset);ctx.closePath();ctx.fill();ctx.fillStyle='#fff';ctx.font='23px sans-serif';ctx.fillText(boss?.alive?'🔒':'🍕',3124,252+flagOffset);
    if(player.powered>0){ctx.save();ctx.globalAlpha=.36+.18*Math.sin(player.powered*8);ctx.fillStyle='#fff59a';ctx.beginPath();ctx.arc(player.x+player.w/2,player.y+player.h/2,42,0,Math.PI*2);ctx.fill();ctx.restore();}
    drawHero();
    for(const p of particles){ctx.globalAlpha=Math.max(0,p.life*2);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;ctx.restore();
  }

  function draw(){drawBackground();drawWorld();}
  function loop(now){const dt=(now-lastTime)/1000;lastTime=now;update(dt);draw();requestAnimationFrame(loop);}

  const keyMap={ArrowLeft:'left',a:'left',A:'left',ArrowRight:'right',d:'right',D:'right',ArrowUp:'jump',w:'jump',W:'jump',' ':'jump'};
  window.addEventListener('keydown',e=>{const action=keyMap[e.key];if(!action)return;e.preventDefault();if(action==='jump'&&!keys.jump)jump();keys[action]=true;canvasHint.classList.add('hidden');});
  window.addEventListener('keyup',e=>{const action=keyMap[e.key];if(action){e.preventDefault();keys[action]=false;}});
  window.addEventListener('blur',()=>{keys.left=keys.right=keys.jump=false;});

  document.querySelectorAll('[data-control]').forEach(button=>{
    const action=button.dataset.control;
    const down=e=>{e.preventDefault();button.setPointerCapture?.(e.pointerId);if(action==='jump'&&!keys.jump)jump();keys[action]=true;button.classList.add('pressed');};
    const up=e=>{e.preventDefault();keys[action]=false;button.classList.remove('pressed');};
    button.addEventListener('pointerdown',down);button.addEventListener('pointerup',up);button.addEventListener('pointercancel',up);button.addEventListener('lostpointercapture',up);
  });

  document.getElementById('startButton').addEventListener('click',startGame);
  restartButton.addEventListener('click',()=>{
    endOverlay.classList.remove('visible');
    if(state==='levelclear'){level++;loadLevel();}
    else resetRun();
    state='playing';document.body.classList.add('game-active');canvas.focus();
  });
  document.getElementById('soundButton').addEventListener('click',e=>{muted=!muted;if(themeAudio)themeAudio.muted=muted;if(!muted){ensureAudio();startThemeAudio(false);}e.currentTarget.textContent=muted?'🔇':'🔊';e.currentTarget.setAttribute('aria-label',muted?'Unmute sounds':'Mute sounds');});
  document.getElementById('homeButton').addEventListener('click',()=>{
    keys.left=keys.right=keys.jump=false;document.body.classList.remove('game-active');endOverlay.classList.remove('visible');leaderboardOverlay.classList.remove('visible');resetRun();state='menu';startOverlay.classList.add('visible');heroNameInput.focus();
  });
  document.getElementById('leaderboardButton').addEventListener('click',()=>{
    leaderboardReturnState=state==='leaderboard'?'menu':state;keys.left=keys.right=keys.jump=false;state='leaderboard';document.body.classList.remove('game-active');renderLeaderboard();leaderboardOverlay.classList.add('visible');
  });
  document.getElementById('closeLeaderboardButton').addEventListener('click',()=>{
    leaderboardOverlay.classList.remove('visible');state=leaderboardReturnState;if(state==='playing')document.body.classList.add('game-active');canvas.focus();
  });
  document.getElementById('fullscreenButton').addEventListener('click',()=>{
    const shell=document.querySelector('.game-shell');if(!document.fullscreenElement)shell.requestFullscreen?.();else document.exitFullscreen?.();
  });
  heroNameInput.addEventListener('keydown',e=>{if(e.key==='Enter')startGame();});
  window.addEventListener('pointerdown',()=>startThemeAudio(false),{once:true});

  window.rivieQuest={getState:()=>({state,level,levelName:levelNames[level-1],score,lives,heroKind,boss:boss?{type:boss.type,alive:boss.alive,hp:boss.hp}:null,powerup:{collected:powerup?.collected,powered:Math.ceil(player.powered)},alliesLeft:allies.filter(a=>!a.collected).length,player:{x:Math.round(player.x),y:Math.round(player.y),grounded:player.grounded},treatsLeft:treats.filter(t=>!t.collected).length,enemiesLeft:enemies.filter(e=>e.alive).length})};

  resetRun();
  startThemeAudio(true);
  requestAnimationFrame(loop);
})();
