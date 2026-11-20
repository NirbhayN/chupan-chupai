import { spotted, type P } from './scene';
import { SIZE, props, grass } from './world';
export function MiniMap({players,selfId}:{players:Record<string,P>;selfId:string}){
 const self=players[selfId];const pct=(v:number)=>(v+SIZE)/44*100+'%';
 return <div className="mapMini">
  {grass.map((g,i)=><b key={'g'+i} className="mmGrass" style={{left:pct(g.x-g.w/2),top:pct(g.z-g.d/2),width:g.w/44*100+'%',height:g.d/44*100+'%'}}/>)}
  {props.filter(b=>b.h>=1.5).map((b,i)=><b key={i} className={'mm '+b.kind} style={{left:pct(b.x-b.w/2),top:pct(b.z-b.d/2),width:Math.max(b.w,.6)/44*100+'%',height:Math.max(b.d,.6)/44*100+'%'}}/>)}
  {Object.entries(players).filter(([id,p])=>spotted(self,p,id===selfId)).map(([id,p])=><i key={id} className={id===selfId?'me':''} style={{left:pct(p.x),top:pct(p.z),background:id===selfId?'#a656e5':p.role==='seeker'?'#f87171':'#f7df75'}}/>)}
 </div>;
}
