
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d', { alpha: false });
let DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

function resize(){
  DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  canvas.width = Math.round(innerWidth * DPR);
  canvas.height = Math.round(innerHeight * DPR);
  canvas.style.width = innerWidth + 'px';
  canvas.style.height = innerHeight + 'px';
  ctx.setTransform(DPR,0,0,DPR,0,0);
}
window.addEventListener('resize', resize, {passive:true});
resize();

const ui = {
  speed: document.getElementById('speed'),
  zoom: document.getElementById('zoom'),
  labels: document.getElementById('labels'),
  orbits: document.getElementById('orbits'),
  pauseBtn: document.getElementById('pause'),
  resetBtn: document.getElementById('reset'),
  focusEarth: document.getElementById('focusEarth'),
  centerHint: document.getElementById('centerHint'),
};

let time = 0;
let running = true;
let globalSpeed = parseFloat(ui.speed.value);
let zoom = parseFloat(ui.zoom.value);
let showLabels = ui.labels.checked;
let showOrbits = ui.orbits.checked;

let camera = { x:0, y:0, tx:0, ty:0, scale:1, target: null, lerp: 0.04 };

let mouse = { x: innerWidth/2, y: innerHeight/2 };
window.addEventListener('mousemove', e => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

const SUN = { name: 'Sol', radius: 46, color1:'#ffdf6b', color2:'#ff9f3c', glow: 36 };
const planets = [
  { name:'Mercurio', color:'#a6a6a6', r:4, a: 78, speed: 4.15, tilt:2 },
  { name:'Venus',   color:'#e7cba9', r:7, a: 110, speed: 1.62, tilt:177 },
  { name:'Tierra',  color:'#4aa3ff', r:8, a: 156, speed: 1, tilt:23.4 },
  { name:'Marte',   color:'#e06643', r:6, a: 200, speed: 0.53, tilt:25 },
  { name:'Júpiter', color:'#d9b089', r:16, a: 270, speed: 0.084, tilt:3 },
  { name:'Saturno', color:'#d8c39b', r:14, a: 340, speed: 0.034, tilt:26 },
  { name:'Urano',   color:'#8fe5ff', r:11, a: 420, speed: 0.012, tilt:97 },
  { name:'Neptuno', color:'#2f6cff', r:11, a: 480, speed: 0.006, tilt:28 },
];

for(let i=0;i<planets.length;i++){
  planets[i].ecc = (Math.random()*0.12 - 0.06); // small eccentricity
  planets[i].ang = Math.random()*Math.PI*2;
}

function easeOutCubic(t){ return 1 - Math.pow(1 - t, 3); }
function lerp(a,b,t){return a + (b-a)*t;}
function clamp(v,min,max){return Math.max(min,Math.min(max,v));}

ui.speed.addEventListener('input', e => globalSpeed = parseFloat(e.target.value));
ui.zoom.addEventListener('input', e => zoom = parseFloat(e.target.value));
ui.labels.addEventListener('change', e => showLabels = e.target.checked);
ui.orbits.addEventListener('change', e => showOrbits = e.target.checked);

ui.pauseBtn.addEventListener('click', () => {
  running = !running;
  ui.pauseBtn.textContent = running ? '⏸️ Pausar' : '▶️ Reanudar';
});
ui.resetBtn.addEventListener('click', () => {
  camera.target = null;
  camera.tx = camera.ty = camera.x = camera.y = 0;
  camera.scale = 1;
  time = 0;
});
ui.focusEarth.addEventListener('click', () => focusOn('Tierra'));

function focusOn(name){
  const p = planets.find(x=>x.name === name);
  if(!p) return;
  camera.target = { type:'planet', planet: p, t: performance.now(), duration: 1000 };
}

canvas.addEventListener('click', (e)=>{
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  // convert to world coords
  const cx = innerWidth/2 + camera.x;
  const cy = innerHeight/2 + camera.y;
  let found = null;
  for(let p of planets){
    const pos = planetPosition(p);
    // screen pos
    const sx = cx + pos.x * camera.scale;
    const sy = cy + pos.y * camera.scale;
    const dist = Math.hypot(sx - mx, sy - my);
    if(dist < (p.r * 1.6 * camera.scale + 6)){
      found = p; break;
    }
  }
  if(found) {
    camera.target = { type:'planet', planet: found, t: performance.now(), duration: 900 };
    ui.centerHint.textContent = 'Enfocando: ' + found.name;
    ui.centerHint.style.opacity = '0.9';
    setTimeout(()=>{ ui.centerHint.style.opacity = '0.06'; ui.centerHint.textContent = ''; }, 1200);
  }
});

function planetPosition(p){

  const ang = p.ang + time * p.speed * 0.6; 
  const ecc = p.ecc;
  const denom = (1 + ecc * Math.cos(ang)) || 1;
  const r = p.a * (1 - ecc*ecc) / denom;
  const tiltRad = (p.tilt || 0) * Math.PI / 180;
  const x = r * Math.cos(ang);
  const y = r * Math.sin(ang) * Math.cos(tiltRad);
  return { x, y, ang, r };
}

function drawSun(cx, cy){
  const g = ctx.createRadialGradient(cx,cy,0,cx,cy,SUN.radius*4);
  g.addColorStop(0, SUN.color1);
  g.addColorStop(0.4, SUN.color2);
  g.addColorStop(1,'rgba(255,160,70,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx,cy,SUN.radius*1.6,0,Math.PI*2);
  ctx.fill();

  // core
  ctx.save();
  ctx.shadowBlur = 30;
  ctx.shadowColor = SUN.color2;
  ctx.fillStyle = SUN.color1;
  roundedCircle(ctx, cx, cy, SUN.radius);
  ctx.restore();
}

function roundedCircle(ctx,x,y,r){
  ctx.beginPath();
  ctx.arc(x,y,r,0,Math.PI*2);
  ctx.fill();
}

function drawOrbit(cx,cy,p){
  const pos = planetPosition(p);
  ctx.save();
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  const segs = 200;
  for(let i=0;i<=segs;i++){
    const a = (i/segs)*Math.PI*2;
    const denom = (1 + p.ecc * Math.cos(a)) || 1;
    const rr = p.a * (1 - p.ecc*p.ecc) / denom;
    const tiltRad = (p.tilt || 0) * Math.PI / 180;
    const ox = rr * Math.cos(a);
    const oy = rr * Math.sin(a) * Math.cos(tiltRad);
    const sx = cx + ox * camera.scale;
    const sy = cy + oy * camera.scale;
    if(i===0) ctx.moveTo(sx,sy); else ctx.lineTo(sx,sy);
  }
  ctx.stroke();
  ctx.restore();
}

function drawPlanet(cx,cy,p){
  const pos = planetPosition(p);
  const x = cx + pos.x * camera.scale;
  const y = cy + pos.y * camera.scale;
  ctx.save();
  ctx.beginPath();
  ctx.shadowBlur = 12 * Math.sqrt(camera.scale);
  ctx.shadowColor = p.color;
  ctx.fillStyle = p.color;
  roundedCircle(ctx, x, y, p.r * camera.scale);
  ctx.restore();

  if(p.name === 'Saturno'){
    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(215,180,135,0.55)';
    ctx.lineWidth = Math.max(1, 3 * camera.scale);
    ctx.ellipse(x, y, (p.r*1.9)*camera.scale, (p.r*0.9)*camera.scale, 0.6, 0, Math.PI*2);
    ctx.stroke();
    ctx.restore();
  }

  if(showLabels){
    ctx.save();
    ctx.font = `${10 * camera.scale}px Inter, Arial`;
    ctx.fillStyle = 'rgba(215,255,240,0.9)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(p.name, x, y + p.r*camera.scale + 6);
    ctx.restore();
  }
}

let lastTS = performance.now();
function frame(ts){
  const dt = (ts - lastTS) / 1000;
  lastTS = ts;
  if(running) time += dt * globalSpeed;

  const targetX = (innerWidth/2 - mouse.x) * 0.06 * (1/zoom);
  const targetY = (innerHeight/2 - mouse.y) * 0.06 * (1/zoom);
  camera.x = lerp(camera.x, targetX + (camera.tx||0), 0.06);
  camera.y = lerp(camera.y, targetY + (camera.ty||0), 0.06);

  if(camera.target){
    const now = performance.now();
    const t = clamp((now - camera.target.t) / camera.target.duration, 0, 1);
    const ease = easeOutCubic(t);
    const p = camera.target.planet;
    const pos = planetPosition(p);
    const desiredTx = -(pos.x * camera.scale);
    const desiredTy = -(pos.y * camera.scale);
    camera.tx = lerp(camera.tx || 0, desiredTx, ease);
    camera.ty = lerp(camera.ty || 0, desiredTy, ease);
    camera.scale = lerp(camera.scale || 1, clamp(1.3,0.5,2) , ease);
    if(t >= 1) {
      camera.target = null;
    }
  } else {
    camera.tx = lerp(camera.tx || 0, 0, 0.02);
    camera.ty = lerp(camera.ty || 0, 0, 0.02);
    camera.scale = lerp(camera.scale || 1, zoom, 0.06);
  }

  ctx.fillStyle = '#000010';
  ctx.fillRect(0,0,innerWidth,innerHeight);
  const g = ctx.createRadialGradient(innerWidth/2, innerHeight/2, 10, innerWidth/2, innerHeight/2, Math.max(innerWidth,innerHeight)*0.9);
  g.addColorStop(0, 'rgba(20,30,40,0.06)');
  g.addColorStop(1, 'rgba(0,0,0,0.9)');
  ctx.fillStyle = g;
  ctx.fillRect(0,0,innerWidth,innerHeight);

  drawStars();

  const cx = innerWidth/2 + camera.x + camera.tx;
  const cy = innerHeight/2 + camera.y + camera.ty;

  if(showOrbits){
    for(let p of planets){
      drawOrbit(cx,cy,p);
    }
  }

  drawSun(cx,cy);

  for(let p of planets){
    drawPlanet(cx,cy,p);
  }

  if(showLabels){
    ctx.save();
    ctx.font = `${12 * camera.scale}px Inter, Arial`;
    ctx.fillStyle = 'rgba(255,240,200,0.95)';
    ctx.textAlign = 'center';
    ctx.fillText('Sol', cx, cy + SUN.radius + 8);
    ctx.restore();
  }

  requestAnimationFrame(frame);
}

let starSeed = [];
function initStars(){
  starSeed = [];
  const count = Math.round((innerWidth * innerHeight) / 6500);
  for(let i=0;i<count;i++){
    starSeed.push({
      x: Math.random()*innerWidth,
      y: Math.random()*innerHeight,
      s: Math.random()*1.2 + 0.2,
      a: Math.random()*0.9 + 0.1
    });
  }
}
function drawStars(){
  if(!starSeed || starSeed.length === 0) initStars();
  ctx.save();
  for(let s of starSeed){
    ctx.globalAlpha = s.a * 0.9;
    ctx.fillStyle = 'white';
    ctx.fillRect(s.x, s.y, s.s, s.s);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

initStars();
requestAnimationFrame(frame);

let resizeTimer;
window.addEventListener('resize', ()=>{
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(()=>{ initStars(); resize(); }, 120);
});

window.SolarWallpaper = {
  focusOn,
  pause: ()=>{ running=false; ui.pauseBtn.textContent='▶️ Reanudar'; },
  resume: ()=>{ running=true; ui.pauseBtn.textContent='⏸️ Pausar'; },
  setSpeed: v => { globalSpeed = v; ui.speed.value = v; },
  setZoom: v => { zoom = v; ui.zoom.value = v; }
};