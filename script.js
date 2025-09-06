const $=s=>document.querySelector(s);
const $$=s=>Array.from(document.querySelectorAll(s));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

const RULES={decks:6,dealerStandsSoft17:true};
const state={player:[],dealer:[],resolved:false,inRound:false,shoe:[],bet:0,bankroll:1000};
const ranks=["A","2","3","4","5","6","7","8","9","10","J","Q","K"], suits=["♠","♥","♦","♣"];

function buildShoe(){const shoe=[];for(let d=0;d<RULES.decks;d++){for(const s of suits){for(const r of ranks){shoe.push({r,s})}}}return shoe.sort(()=>Math.random()-0.5)}
function isTen(r){return["10","J","Q","K"].includes(r)}
function cardValue(c){return c.r=="A"?11:isTen(c.r)?10:Number(c.r)}
function handTotals(cs){let t=0,a=0;for(const c of cs){if(c.r=="A"){a++;t+=11}else t+=cardValue(c)}while(t>21&&a>0){t-=10;a--}return{total:t,soft:a>0&&t<=21}}
function dealerShouldHit(cs){const {total,soft}=handTotals(cs);if(total<17)return true;if(total==17&&soft)return !RULES.dealerStandsSoft17;return false}

function createCardEl(c,faceDown=false){const el=document.createElement("div");el.className="card";if(faceDown){el.classList.add("back");}else{el.innerHTML=`<div class='rank'>${c.r}</div><div class='suit'>${c.s}</div>`;}return el}

function fanCards(container){
  const cards=[...container.children];
  const n=cards.length, spread=Math.min(18*n,140), start=-spread/2, baseLeft=container.clientWidth/2-46;
  cards.forEach((c,i)=>{
    const angle=start+(spread/(Math.max(n-1,1)))*i, offset=(i-(n-1)/2)*22;
    c.style.left=baseLeft+offset+'px'; c.style.top=(Math.abs(angle)*0.4)+'px'; c.style.transform=`rotate(${angle/6}deg)`;
  });
}

function updateBadges(){
  const p=handTotals(state.player), d=handTotals(state.dealer);
  const pb=$('#playerBadge'), db=$('#dealerBadge');
  pb.className='badge'; db.className='badge';
  pb.textContent=p.total>0?p.total:"—";
  if(state.resolved){
    db.textContent=d.total>0?d.total:"—";
  } else if(state.inRound){
    db.textContent=state.dealer.length?handTotals([state.dealer[0]]).total:"—";
  } else {
    db.textContent="—";
  }
}

function setOutcomeBadge(outcome){
  const pb=$('#playerBadge'), db=$('#dealerBadge');
  const d=handTotals(state.dealer);
  pb.className='badge'; db.className='badge';
  if(outcome==='win'){pb.classList.add('win'); pb.textContent='WIN!';}
  else if(outcome==='blackjack'){pb.classList.add('win'); pb.textContent='BLACKJACK!';}
  else if(outcome==='lose'){pb.classList.add('lose'); pb.textContent='NO WIN';}
  else if(outcome==='bust'){pb.classList.add('lose'); pb.textContent='BUST';}
  else {pb.classList.add('push'); pb.textContent='PUSH';}
  db.textContent=d.total>0?d.total:"—";
}

async function revealDealerHole(){
  const dc=$('#dealerCards');
  const hole=dc.querySelector('.card.back');
  if(!hole)return;
  hole.style.transition='transform .3s ease';
  hole.style.transform='rotateY(90deg)';
  await sleep(300);
  const real=state.dealer[1];
  hole.classList.remove('back');
  hole.innerHTML=`<div class='rank'>${real.r}</div><div class='suit'>${real.s}</div>`;
  hole.style.transform='rotateY(0deg)';
  await sleep(300);
  updateBadges();
}

function takeCard(){if(state.shoe.length==0) state.shoe=buildShoe(); return state.shoe.pop()}

function clearHands(){state.player=[];state.dealer=[];$('#playerCards').innerHTML='';$('#dealerCards').innerHTML='';}

async function dealCardAnimated(toContainer,targetArray,card,{faceDown=false}={}){
  const el=createCardEl(card,faceDown);
  el.style.position='absolute';
  const shoeRect=$('#shoe').getBoundingClientRect();
  el.style.left=shoeRect.left+'px';
  el.style.top=shoeRect.top+'px';
  document.body.appendChild(el);
  await sleep(20);
  toContainer.appendChild(el);
  targetArray.push(card);
  fanCards(toContainer);
  updateBadges();
  await sleep(300);
}

async function initialDeal(){
  clearHands();
  state.inRound=true; state.resolved=false;
  await dealCardAnimated($('#playerCards'),state.player,takeCard());
  await dealCardAnimated($('#dealerCards'),state.dealer,takeCard());
  await dealCardAnimated($('#playerCards'),state.player,takeCard());
  await dealCardAnimated($('#dealerCards'),state.dealer,takeCard(),{faceDown:true});
  $('#hitBtn').disabled=false; $('#standBtn').disabled=false;
}

async function hit(){
  await dealCardAnimated($('#playerCards'),state.player,takeCard());
  if(handTotals(state.player).total>21){await revealDealerHole(); setOutcomeBadge('bust'); state.inRound=false; state.resolved=true; $('#hitBtn').disabled=true; $('#standBtn').disabled=true;}
}

async function stand(){
  await revealDealerHole();
  while(dealerShouldHit(state.dealer)){
    await dealCardAnimated($('#dealerCards'),state.dealer,takeCard());
    await sleep(400);
  }
  const pT=handTotals(state.player).total, dT=handTotals(state.dealer).total;
  let outcome='push'; if(dT>21||pT>dT) outcome='win'; else if(dT>pT) outcome='lose';
  if(pT===21 && state.player.length===2 && !(dT===21 && state.dealer.length===2)) outcome='blackjack';
  setOutcomeBadge(outcome); state.inRound=false; state.resolved=true; $('#hitBtn').disabled=true; $('#standBtn').disabled=true;
}

function addBet(amount,fromBtn){state.bet+=amount;$('#betArea .bet-amount').textContent=`Mise: $${state.bet}`;const chip=document.createElement('div');chip.className=`chip ${amount==100?'black':amount==50?'blue':'green'}`;chip.textContent=amount;const r=$('#betArea').getBoundingClientRect();chip.style.left=(r.left+r.width/2)+'px';chip.style.top=(r.top+r.height/2)+'px';$('#chips').appendChild(chip);}

$$('[data-chip]').forEach(btn=>btn.addEventListener('click',()=>addBet(Number(btn.dataset.chip),btn)));
$('#clearBet').addEventListener('click',()=>{state.bet=0;$('#betArea .bet-amount').textContent='Place ta mise';$('#chips').innerHTML='';});
$('#dealBtn').addEventListener('click',initialDeal);
$('#hitBtn').addEventListener('click',hit);
$('#standBtn').addEventListener('click',stand);

// Effet clic souris
const OSMO_PATH_D = "M3.5 5L3.50049 3.9468C3.50049 3.177 4.33382 2.69588 5.00049 3.08078L20.0005 11.741C20.6672 12.1259 20.6672 13.0882 20.0005 13.4731L17.2388 15.1412L17.0055 15.2759M3.50049 8L3.50049 21.2673C3.50049 22.0371 4.33382 22.5182 5.00049 22.1333L14.1192 16.9423L14.4074 16.7759";
const layer=document.getElementById('fx');
function spawnStrokeAt(x,y,{scale=1,rotation=0}={}){
  const size=64*scale;
  const svgNS="http://www.w3.org/2000/svg";
  const svg=document.createElementNS(svgNS,"svg");
  svg.setAttribute("viewBox","0 0 24 25");
  svg.setAttribute("width",size);
  svg.setAttribute("height",size);
  svg.style.position="absolute";
  svg.style.left=(x-size/2)+"px";
  svg.style.top=(y-size/2)+"px";
  svg.style.transform=`rotate(${rotation}deg)`;
  svg.style.opacity="0";
  svg.style.pointerEvents="none";
  const path=document.createElementNS(svgNS,"path");
  path.setAttribute("d",OSMO_PATH_D);
  path.setAttribute("class","fx-path");
  svg.appendChild(path);
  layer.appendChild(svg);
  const len=path.getTotalLength();
  path.style.strokeDasharray=len;
  path.style.strokeDashoffset=len;
  const tl=gsap.timeline({onComplete:()=>layer.removeChild(svg)});
  tl.to(svg,{duration:.08,opacity:1,ease:"power2.out"})
    .to(path,{duration:.45,strokeDashoffset:0,ease:"power3.out"},0)
    .fromTo(svg,{scale:.9},{duration:.35,scale:1,ease:"back.out(2)"},.05)
    .to(svg,{duration:.25,opacity:0,ease:"power2.in"},"+=0.25");
  return tl;
}
window.addEventListener('click',e=>{
  const rot=Math.random()*30-15;
  const scl=0.9+Math.random()*0.4;
  spawnStrokeAt(e.clientX,e.clientY,{rotation:rot,scale:scl});
});
window.addEventListener('load',()=>{
  const cx=window.innerWidth*0.5, cy=window.innerHeight*0.5;
  spawnStrokeAt(cx,cy,{rotation:0,scale:1});
});
