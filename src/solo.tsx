import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Crosshair, Eye, Gem, RotateCcw, Users } from 'lucide-react';
import { GameScene } from './scene';
import { TouchLook } from './touchLook';
import { MiniMap } from './minimap';
import { gems, grass, spots, validMove, inGrass, nearestSpot, findTagTarget, lunge, clearLine, TAG } from './world';

type SoloPlayer = {
 name:string; character:string; x:number; z:number; yaw:number; role:string;
 caught:boolean; hidden:boolean; camo:boolean; crouch:boolean; sprint:boolean; jumping:boolean;
 gems:number; connected:boolean; ready:boolean; ability:number; moving:boolean; swing:number;
 // bot-only
 mode?:'hide'|'camo'|'roam'; wx?:number; wz?:number;
};
type Role='hider'|'seeker';
const base=(name:string,character:string,x:number,z:number,role:string):SoloPlayer=>({
 name,character,x,z,yaw:0,role,caught:false,hidden:false,camo:false,crouch:false,sprint:false,jumping:false,
 gems:0,connected:true,ready:true,ability:0,moving:false,swing:0,
});
const BOT_NAMES=['Pip','Juno','Kiki','Bodhi','Remy'];
function makeBots():Record<string,SoloPlayer>{
 const pool=[...spots.keys()].sort(()=>Math.random()-.5);
 const out:Record<string,SoloPlayer>={};
 BOT_NAMES.forEach((name,i)=>{
  const ch=i%2?'girl':'boy';
  if(i<2){const s=spots[pool[i]];out['bot'+i]={...base(name,ch,s.x,s.z,'hider'),hidden:true,mode:'hide'};}
  else if(i===2){const g=grass[Math.floor(Math.random()*grass.length)];out['bot'+i]={...base(name,ch,g.x+(Math.random()-.5)*g.w*.6,g.z+(Math.random()-.5)*g.d*.6,'hider'),crouch:true,camo:true,mode:'camo'};}
  else{const r=[[-14,-19],[18,-1],[-20,10],[12,17]][Math.floor(Math.random()*4)];out['bot'+i]={...base(name,ch,r[0]+i*.3,r[1],'hider'),mode:'roam'};}
 });
 return out;
}

export function SoloTest({character,onExit}:{character:string;onExit:()=>void}){
 const [role,setRole]=useState<Role>('hider');
 const [player,setPlayer]=useState<SoloPlayer>(()=>base('You',character,0,-6,'hider'));
 const [bots,setBots]=useState<Record<string,SoloPlayer>>({});
 const [yaw,setYaw]=useState(Math.PI);
 const [pitch,setPitch]=useState(.438);
 const [gemMask,setGemMask]=useState(0);
 const [tagCd,setTagCd]=useState(0);
 const [message,setMessage]=useState('Explore the courtyard and find a hiding spot.');
 const [mobile,setMobile]=useState(false);
 const keys=useRef(new Set<string>());
 const touch=useRef(new Set<string>());
 const yawRef=useRef(Math.PI);
 const pitchRef=useRef(.438);
 const last=useRef(performance.now());
 const jumpUntil=useRef(0);
 const tagReady=useRef(0);
 const searchReady=useRef(0);
 const hideEntry=useRef({x:0,z:-6});
 const playerRef=useRef(player);playerRef.current=player;
 const botsRef=useRef(bots);botsRef.current=bots;
 const roleRef=useRef(role);roleRef.current=role;
 useEffect(()=>{setMobile(matchMedia('(pointer:coarse)').matches)},[]);
 useEffect(()=>{
  const down=(event:KeyboardEvent)=>{
   if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.code))event.preventDefault();
   keys.current.add(event.code);
   if(event.repeat)return;
   if(event.code==='KeyE')interact();
   if(event.code==='KeyF')tag();
   if(event.code==='Space')jump();
  };
  const up=(event:KeyboardEvent)=>keys.current.delete(event.code);
  const mouse=(event:MouseEvent)=>{
   if(document.pointerLockElement||(event.target instanceof HTMLCanvasElement&&event.target.closest('.soloPage'))){
    yawRef.current-=Math.max(-40,Math.min(40,event.movementX))*.003;
    pitchRef.current=Math.max(-.18,Math.min(1.05,pitchRef.current+Math.max(-40,Math.min(40,event.movementY))*.003));
    setYaw(yawRef.current);setPitch(pitchRef.current);
   }
  };
  const click=(event:MouseEvent)=>{if(event.button===0&&document.pointerLockElement)tag();};
  window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('mousemove',mouse);window.addEventListener('mousedown',click);
  return()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('mousemove',mouse);window.removeEventListener('mousedown',click);};
 },[]);
 function jump(){
  const now=performance.now();
  if(now<jumpUntil.current)return;
  jumpUntil.current=now+760;
  setPlayer(p=>({...p,jumping:true}));
  setTimeout(()=>setPlayer(p=>({...p,jumping:false})),760);
 }
 function catchBot(id:string){
  setBots(b=>{const bot=b[id];if(!bot)return b;const next={...b,[id]:{...bot,caught:true,hidden:false,camo:false,crouch:false,moving:false}};const left=Object.values(next).filter(x=>!x.caught).length;setMessage(left?`Caught ${bot.name}! ${left} left.`:'You found everyone! 🎉 Press RESET to play again.');return next;});
 }
 function tag(){
  if(roleRef.current!=='seeker')return;
  const now=performance.now();if(now<tagReady.current)return;
  tagReady.current=now+TAG.cooldown*1000;
  const p=playerRef.current,look=yawRef.current;
  const id=findTagTarget(p,look,Object.entries(botsRef.current).map(([id,b])=>({id,...b})));
  const end=lunge(p.x,p.z,look);
  setPlayer(q=>({...q,...end,yaw:look,swing:now}));
  if(id)catchBot(id);else setMessage('Whiff! Aim the wedge at a hider and get closer.');
 }
 function interact(){
  if(roleRef.current==='seeker'){
   const now=performance.now();if(now<searchReady.current)return;
   const p=playerRef.current;const index=nearestSpot(p.x,p.z);
   if(index<0){setMessage('Get closer to a bush, locker, stall or container to search it.');return;}
   setPlayer(q=>({...q,swing:now}));
   const found=Object.entries(botsRef.current).find(([,b])=>b.hidden&&!b.caught&&Math.hypot(b.x-spots[index].x,b.z-spots[index].z)<.1);
   if(found){setBots(b=>({...b,[found[0]]:{...b[found[0]],x:p.x+.8,z:p.z}}));catchBot(found[0]);}
   else{searchReady.current=now+1600;setMessage(`Nothing in this ${spots[index].kind}…`);}
   return;
  }
  setPlayer(p=>{
   if(p.hidden){setMessage('You stepped out of hiding.');return {...p,...hideEntry.current,hidden:false};}
   const index=nearestSpot(p.x,p.z);
   if(index<0){setMessage('Move close to a bush, locker, stall or container to hide.');return p;}
   hideEntry.current={x:p.x,z:p.z};
   setMessage('You are hidden. Move or press E to come out.');
   return {...p,x:spots[index].x,z:spots[index].z,hidden:true,camo:false,moving:false};
  });
 }
 function reset(next:Role=roleRef.current){
  setRole(next);roleRef.current=next;
  setPlayer(base('You',playerRef.current.character,0,-6,next));setGemMask(0);hideEntry.current={x:0,z:-6};
  setBots(next==='seeker'?makeBots():{});
  setMessage(next==='seeker'?'5 bots are hiding: in objects (search with E), crouched in tall grass, and on the run. Click or F to tag!':'Explore the courtyard and find a hiding spot.');
  yawRef.current=Math.PI;setYaw(Math.PI);pitchRef.current=.438;setPitch(.438);
 }
 useEffect(()=>{
  const timer=setInterval(()=>{
   const now=performance.now();
   const dt=Math.min(.05,(now-last.current)/1000);
   last.current=now;
   setTagCd(Math.max(0,(tagReady.current-now)/1000));
   const pressed=(key:string)=>keys.current.has(key)||touch.current.has(key);
   const forward=Number(pressed('KeyW')||pressed('ArrowUp')||pressed('up'))-Number(pressed('KeyS')||pressed('ArrowDown')||pressed('down'));
   const side=Number(pressed('KeyD')||pressed('ArrowRight')||pressed('right'))-Number(pressed('KeyA')||pressed('ArrowLeft')||pressed('left'));
   const sprint=pressed('ShiftLeft')||pressed('sprint');
   const crouch=pressed('KeyC')||pressed('crouch');
   const length=Math.hypot(forward,side);
   setPlayer(p=>{
    const camo=p.role==='hider'&&!p.hidden&&crouch&&inGrass(p.x,p.z);
    if(length<.05){
     if(!p.moving&&p.sprint===sprint&&p.crouch===crouch&&p.camo===camo)return p;
     return {...p,moving:false,sprint,crouch,camo};
    }
    const y=yawRef.current;
    const speed=crouch?2.1:sprint?6.5:4.1;
    const dx=(-side*Math.cos(y)+forward*Math.sin(y))/Math.max(1,length)*speed*dt;
    const dz=(side*Math.sin(y)+forward*Math.cos(y))/Math.max(1,length)*speed*dt;
    const origin=p.hidden?hideEntry.current:p;
    const next=validMove(origin.x,origin.z,origin.x+dx,origin.z+dz);
    const changed=Math.hypot(next.x-origin.x,next.z-origin.z)>.001;
    return {...p,...next,yaw:changed?Math.atan2(dx,dz):p.yaw,moving:changed,sprint,crouch,camo:p.role==='hider'&&crouch&&inGrass(next.x,next.z),hidden:false};
   });
   // bots: roamers wander, and everyone not hidden flees when the seeker gets close
   if(roleRef.current==='seeker')setBots(all=>{
    const me=playerRef.current;let changed=false;const out={...all};
    for(const [id,b] of Object.entries(all)){
     if(b.caught||b.hidden)continue;
     const dist=Math.hypot(b.x-me.x,b.z-me.z);
     const threatened=dist<(b.mode==='camo'?2.2:6)&&clearLine(b.x,b.z,me.x,me.z);
     let tx=b.wx,tz=b.wz,speed=0;
     if(threatened){tx=b.x+(b.x-me.x)/dist*4;tz=b.z+(b.z-me.z)/dist*4;speed=4.6;}
     else if(b.mode==='roam'){if(tx===undefined||Math.hypot(tx-b.x,tz!-b.z)<.6||Math.random()<.004){tx=(Math.random()-.5)*40;tz=(Math.random()-.5)*40;}speed=2.4;}
     if(!speed){if(b.moving){out[id]={...b,moving:false};changed=true;}continue;}
     const len=Math.hypot(tx!-b.x,tz!-b.z)||1;const dx=(tx!-b.x)/len*speed*dt,dz=(tz!-b.z)/len*speed*dt;
     let next=validMove(b.x,b.z,b.x+dx,b.z+dz);
     if(Math.hypot(next.x-b.x,next.z-b.z)<speed*dt*.3){const a=Math.random()*Math.PI*2;tx=b.x+Math.sin(a)*6;tz=b.z+Math.cos(a)*6;next={x:b.x,z:b.z};}
     out[id]={...b,...next,wx:tx,wz:tz,yaw:Math.atan2(dx,dz),moving:true,sprint:threatened,crouch:false,camo:false,mode:threatened&&b.mode==='camo'?'roam':b.mode};changed=true;
    }
    return changed?out:all;
   });
  },16);
  return()=>clearInterval(timer);
 },[]);
 useEffect(()=>{
  if(player.role!=='hider')return;
  gems.forEach(([x,z],i)=>{
   if(!(gemMask&(1<<i))&&Math.hypot(player.x-x,player.z-z)<.9){
    setGemMask(mask=>mask|(1<<i));
    setPlayer(p=>({...p,gems:p.gems+1}));
    setMessage('Gem collected! Keep exploring.');
   }
  });
 },[player.x,player.z,gemMask,player.role]);
 const nearSpot=nearestSpot(player.x,player.z)>=0;
 const hold=(key:string,on:boolean)=>{if(on)touch.current.add(key);else touch.current.delete(key)};
 const players={solo:player,...bots};
 const left=Object.values(bots).filter(b=>!b.caught).length;
 return <div className="soloPage" onClick={()=>{if(!mobile)document.body.requestPointerLock?.()}}
  >
  <GameScene players={players} selfId="solo" yaw={yaw} pitch={pitch} gemMask={role==='hider'?gemMask:(1<<gems.length)-1} tagCooldown={tagCd}/>
  {mobile&&<TouchLook onLook={(dx,dy)=>{yawRef.current-=dx*.018;pitchRef.current=Math.max(-.18,Math.min(1.05,pitchRef.current+dy*.013));setYaw(yawRef.current);setPitch(pitchRef.current);}}/>}
  <div className="soloTop">
   <button onClick={event=>{event.stopPropagation();document.exitPointerLock?.();onExit()}}><ArrowLeft size={17}/> EXIT TEST</button>
   <div><b>SOLO PLAYGROUND</b><small>{role==='seeker'?'SEEKER PRACTICE · 5 BOT HIDERS':'LOCAL TEST MODE · NO ROOM NEEDED'}</small></div>
   <button onClick={event=>{event.stopPropagation();reset()}}><RotateCcw size={17}/> RESET</button>
  </div>
  <div className="soloInfo">
   {role==='hider'?<>
    <span><Gem size={17}/> {player.gems} / {gems.length} GEMS</span>
    <span><Eye size={17}/> {player.hidden?'HIDDEN':player.camo?'BLENDING IN GRASS':nearSpot?'HIDING SPOT NEARBY':'EXPLORE TO HIDE'}</span>
   </>:<>
    <span><Users size={17}/> {left} / {BOT_NAMES.length} HIDERS LEFT</span>
    <span><Crosshair size={17}/> {tagCd>0?'TAG COOLDOWN':'TAG READY'}</span>
   </>}
   <span><Users size={17}/> {player.character==='boy'?'MAX':'MIA'}</span>
  </div>
  <div className="soloMap"><MiniMap players={players} selfId="solo"/></div>
  <div className="soloTip">{message}</div>
  <div className="soloBottom">
   <span>WASD move · Mouse look · Shift sprint · Space jump · C crouch · {role==='seeker'?'Click/F tag · E search':'E hide · crouch in tall grass to blend in'}</span>
   <div>
    <button onClick={event=>{event.stopPropagation();reset(role==='hider'?'seeker':'hider')}}>{role==='hider'?'PRACTICE AS SEEKER':'PRACTICE AS HIDER'}</button>
    <button onClick={event=>{event.stopPropagation();setPlayer(p=>({...p,character:p.character==='boy'?'girl':'boy'}))}}>SWITCH AVATAR</button>
    {role==='seeker'?<>
     <button className="tagBtn" disabled={tagCd>0} onClick={event=>{event.stopPropagation();tag()}}><Crosshair size={15}/> TAG</button>
     <button onClick={event=>{event.stopPropagation();interact()}}><Eye size={15}/> SEARCH</button>
    </>:<button onClick={event=>{event.stopPropagation();interact()}}>{player.hidden?'EXIT HIDING':'HIDE / INTERACT'}</button>}
   </div>
  </div>
  {mobile&&<div className="mobileControls"><div className="dpad">{[['up','▲'],['left','◀'],['down','▼'],['right','▶']].map(([key,label])=><button key={key} className={key} onPointerDown={e=>{e.stopPropagation();hold(key,true)}} onPointerUp={()=>hold(key,false)} onPointerLeave={()=>hold(key,false)}>{label}</button>)}</div><div className="mobileActs"><button onPointerDown={e=>{e.stopPropagation();jump()}}>JUMP</button><button onPointerDown={e=>{e.stopPropagation();hold('sprint',true)}} onPointerUp={()=>hold('sprint',false)}>SPRINT</button><button onPointerDown={e=>{e.stopPropagation();hold('crouch',true)}} onPointerUp={()=>hold('crouch',false)}>CROUCH</button></div></div>}
 </div>;
}
