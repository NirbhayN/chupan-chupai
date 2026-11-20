import http from 'node:http';
import { Server, Room } from 'colyseus';
import { schema } from '@colyseus/schema';
import { validMove, spots, gems, spawns, inGrass, findTagTarget, lunge, nearestSpot, spotDistance, TAG } from '../src/world.js';

const Player = schema({name:'string',character:'string',x:'number',z:'number',yaw:'number',look:'number',role:'string',caught:'boolean',hidden:'boolean',camo:'boolean',crouch:'boolean',sprint:'boolean',jumping:'boolean',gems:'number',connected:'boolean',ready:'boolean',ability:'number',tagCd:'number',searchCd:'number',swing:'number',moving:'boolean',moveX:'number',moveZ:'number',jumpUntil:'number',hideSpot:'number',lastInput:'number',entryX:'number',entryZ:'number'});
const GameState = schema({players:{map:Player,default:new Map()},phase:'string',host:'string',time:'number',winner:'string',round:'number',gemMask:'number',seeker:'string',map:'string'});
type PlayerState=InstanceType<typeof Player> & {moveX:number;moveZ:number;jumpUntil:number;hideSpot:number;lastInput:number};
class HideoutRoom extends Room<InstanceType<typeof GameState>>{
 maxClients=12;
 private elapsed=0;
 onCreate(){
  const state=new GameState();Object.assign(state,{phase:'lobby',host:'',time:0,winner:'',round:0,gemMask:0,seeker:'',map:'Secret Courtyard'});this.setState(state);this.setPrivate(true);this.setSimulationInterval(dt=>this.tick(dt),50);
  this.onMessage('profile',(c,m)=>{const p=this.state.players.get(c.sessionId);if(!p||this.state.phase!=='lobby')return;p.name=String(m.name||'Player').trim().slice(0,18)||'Player';p.character=m.character==='girl'?'girl':'boy';p.ready=!!m.ready;});
  this.onMessage('start',(c)=>{if(c.sessionId!==this.state.host||this.state.phase!=='lobby'||this.state.players.size<2)return;this.startRound();});
  this.onMessage('input',(c,m)=>{const p=this.state.players.get(c.sessionId);if(!p||typeof m!=='object')return;const mx=Number(m.x),mz=Number(m.z),look=Number(m.look);p.moveX=Number.isFinite(mx)?Math.max(-1,Math.min(1,mx)):0;p.moveZ=Number.isFinite(mz)?Math.max(-1,Math.min(1,mz)):0;if(Number.isFinite(look))p.look=look;p.sprint=!!m.sprint;p.crouch=!!m.crouch;p.lastInput=Date.now();if(m.jump&&Date.now()>p.jumpUntil&&this.state.phase!=='lobby'){p.jumpUntil=Date.now()+850;p.jumping=true;}});
  this.onMessage('interact',(c)=>{
   const p=this.state.players.get(c.sessionId);if(!p||p.caught||this.state.phase==='lobby'||this.state.phase==='results')return;
   if(p.role==='seeker'){
    if(this.state.phase!=='seek'||p.searchCd>0)return;
    const index=nearestSpot(p.x,p.z);
    if(index<0){c.send('event',{type:'nothing',reason:'far'});return;}
    const found=[...this.state.players.values()].find(t=>t.role==='hider'&&t.hidden&&t.hideSpot===index);
    p.swing=Date.now();
    if(found){this.catchHider(found,p);}else{p.searchCd=1.6;c.send('event',{type:'nothing',reason:'empty',kind:spots[index].kind});}
    return;
   }
   if(p.hidden){this.unhide(p);return;}
   const index=nearestSpot(p.x,p.z);
   if(index<0)return;
   if([...this.state.players.values()].some(t=>t!==p&&t.hidden&&t.hideSpot===index)){c.send('event',{type:'occupied'});return;}
   p.entryX=p.x;p.entryZ=p.z;p.x=spots[index].x;p.z=spots[index].z;p.hidden=true;p.camo=false;p.hideSpot=index;
  });
  this.onMessage('tag',(c)=>{
   const p=this.state.players.get(c.sessionId);if(!p||p.role!=='seeker'||this.state.phase!=='seek'||p.tagCd>0)return;
   const targets=[...this.state.players.entries()].map(([id,t])=>({id,x:t.x,z:t.z,role:t.role,caught:t.caught,hidden:t.hidden}));
   const id=findTagTarget(p,p.look,targets);
   p.tagCd=TAG.cooldown;p.swing=Date.now();
   const end=lunge(p.x,p.z,p.look);p.x=end.x;p.z=end.z;p.yaw=p.look;
   if(id){this.catchHider(this.state.players.get(id)!,p);}else c.send('event',{type:'miss'});
  });
  this.onMessage('ability',(c)=>{const p=this.state.players.get(c.sessionId);if(!p||p.role!=='seeker'||this.state.phase!=='seek'||p.ability>0)return;p.ability=25;const near=[...this.state.players.values()].filter(t=>t.role==='hider'&&!t.caught&&Math.hypot(t.x-p.x,t.z-p.z)<9).length;c.send('event',{type:'pulse',near});});
  this.onMessage('lobby',(c)=>{if(c.sessionId===this.state.host&&this.state.phase==='results')this.resetLobby();});
 }
 onJoin(c:any,options:any){const p=new Player() as PlayerState;Object.assign(p,{name:'Player',character:'boy',x:0,z:0,yaw:0,look:0,role:'hider',caught:false,hidden:false,camo:false,crouch:false,sprint:false,jumping:false,gems:0,connected:true,ready:false,ability:0,tagCd:0,searchCd:0,swing:0,moving:false,moveX:0,moveZ:0,jumpUntil:0,hideSpot:-1,lastInput:0,entryX:0,entryZ:0});p.name=String(options.name||'Player').trim().slice(0,18)||'Player';p.character=options.character==='girl'?'girl':'boy';const s=spawns[this.state.players.size%spawns.length];p.x=s[0];p.z=s[1];this.state.players.set(c.sessionId,p);if(!this.state.host)this.state.host=c.sessionId;}
 async onLeave(c:any,consented:boolean){const p=this.state.players.get(c.sessionId);if(!p)return;p.connected=false;p.moveX=0;p.moveZ=0;if(!consented){try{await this.allowReconnection(c,15);p.connected=true;return;}catch{}}this.state.players.delete(c.sessionId);if(this.state.host===c.sessionId)this.state.host=[...this.state.players.keys()][0]||'';this.checkWin();}
 private unhide(p:InstanceType<typeof Player>){p.hidden=false;p.hideSpot=-1;p.x=p.entryX;p.z=p.entryZ;}
 private catchHider(target:InstanceType<typeof Player>,by:InstanceType<typeof Player>){
  if(target.hidden){const s=spots[target.hideSpot];target.hidden=false;target.hideSpot=-1;target.x=target.entryX;target.z=target.entryZ;if(s&&spotDistance(s,target.x,target.z)>2){target.x=by.x;target.z=by.z;}}
  target.caught=true;target.camo=false;target.moving=false;
  this.broadcast('event',{type:'caught',name:target.name,x:target.x,z:target.z});
  this.checkWin();
 }
 private startRound(){this.lock();const s=this.state;const ids=[...s.players.keys()];s.seeker=ids[Math.floor(Math.random()*ids.length)];s.phase='hide';s.time=25;s.round++;s.winner='';s.gemMask=0;this.elapsed=0;ids.forEach((id,i)=>{const p=s.players.get(id)!;p.role=id===s.seeker?'seeker':'hider';p.caught=false;p.hidden=false;p.camo=false;p.hideSpot=-1;p.gems=0;p.ability=0;p.tagCd=0;p.searchCd=0;p.x=spawns[i][0];p.z=spawns[i][1];p.yaw=p.look=Math.atan2(p.x,p.z);});this.broadcast('event',{type:'round'});}
 private resetLobby(){this.unlock();this.state.phase='lobby';this.state.winner='';this.state.time=0;for(const p of this.state.players.values()){p.caught=false;p.hidden=false;p.camo=false;p.role='hider';}}
 private checkWin(){const s=this.state;if(s.phase!=='seek'&&s.phase!=='hide')return;if(!s.players.has(s.seeker)){s.phase='results';s.winner='hiders';s.time=0;return;}const h=[...s.players.values()].filter(p=>p.role==='hider');if(h.length===0||h.every(p=>p.caught)){s.phase='results';s.winner='seeker';s.time=0;}}
 private tick(dt:number){const s=this.state;const sec=dt/1000;for(const [id,p] of s.players){if(!p.connected||p.caught)continue;if(Date.now()-p.lastInput>300)p.moveX=p.moveZ=0;p.moving=false;if(p.jumping&&Date.now()>p.jumpUntil)p.jumping=false;if(p.ability>0)p.ability=Math.max(0,p.ability-sec);if(p.tagCd>0)p.tagCd=Math.max(0,p.tagCd-sec);if(p.searchCd>0)p.searchCd=Math.max(0,p.searchCd-sec);if(s.phase==='lobby'||s.phase==='results'||(s.phase==='hide'&&id===s.seeker))continue;const len=Math.hypot(p.moveX,p.moveZ);if(p.hidden&&len>.1)this.unhide(p);p.camo=p.role==='hider'&&!p.hidden&&p.crouch&&inGrass(p.x,p.z);if(p.hidden||len<.05)continue;p.moving=true;const speed=p.crouch?2.1:p.sprint?6.5:4.1;const dx=p.moveX/Math.max(1,len)*speed*sec,dz=p.moveZ/Math.max(1,len)*speed*sec;const next=validMove(p.x,p.z,p.x+dx,p.z+dz);p.x=next.x;p.z=next.z;p.yaw=Math.atan2(dx,dz);if(p.role==='hider'){gems.forEach(([x,z],i)=>{if(!(s.gemMask&(1<<i))&&Math.hypot(x-p.x,z-p.z)<.9){s.gemMask|=1<<i;p.gems++;this.broadcast('event',{type:'gem',name:p.name});}});}}
 if(s.phase==='hide'||s.phase==='seek'){this.elapsed+=sec;if(this.elapsed>=1){const n=Math.floor(this.elapsed);this.elapsed-=n;s.time=Math.max(0,s.time-n);if(!s.time){if(s.phase==='hide'){s.phase='seek';s.time=180;this.broadcast('event',{type:'release'});}else{s.phase='results';s.winner='hiders';}}}}
 }
}
const app=http.createServer((req,res)=>{res.writeHead(200,{'content-type':'application/json','access-control-allow-origin':'*'});res.end(JSON.stringify({name:'HIDEOUT',status:'ok'}));});
const gameServer=new Server({server:app});gameServer.define('hideout',HideoutRoom);const port=Number(process.env.PORT||2567);gameServer.listen(port).then(()=>console.log('HIDEOUT server on '+port));
