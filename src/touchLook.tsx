import { useRef } from 'react';

type TouchPoint={id:number;x:number;y:number};
export function TouchLook({onLook}:{onLook:(dx:number,dy:number)=>void}){
 const active=useRef<TouchPoint|null>(null);
 return <div className="mobileLookZone" aria-label="Swipe to rotate camera"
  onPointerDown={event=>{
   if(active.current||event.pointerType!=='touch')return;
   event.stopPropagation();
   event.currentTarget.setPointerCapture(event.pointerId);
   active.current={id:event.pointerId,x:event.clientX,y:event.clientY};
  }}
  onPointerMove={event=>{
   const point=active.current;
   if(!point||point.id!==event.pointerId)return;
   event.stopPropagation();
   const dx=Math.max(-80,Math.min(80,event.clientX-point.x));
   const dy=Math.max(-80,Math.min(80,event.clientY-point.y));
   active.current={id:point.id,x:event.clientX,y:event.clientY};
   onLook(dx,dy);
  }}
  onPointerUp={event=>{if(active.current?.id===event.pointerId)active.current=null}}
  onPointerCancel={event=>{if(active.current?.id===event.pointerId)active.current=null}}>
  <span>SWIPE TO LOOK</span>
 </div>;
}
