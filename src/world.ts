// Shared map layout, collision, line of sight and tag rules (used by client, solo mode and server).
export type Box = { x:number; z:number; w:number; d:number; h:number; kind:string; color?:string; hide?:boolean; walk?:boolean };
export type Zone = { x:number; z:number; w:number; d:number };
export const SIZE=22;

// Outer perimeter walls (rendered, but collision uses the SIZE bound).
export const perimeter:Box[]=[
 {x:0,z:-22,w:44,d:1,h:5,kind:'wall'},{x:0,z:22,w:44,d:1,h:5,kind:'wall'},{x:-22,z:0,w:1,d:44,h:5,kind:'wall'},{x:22,z:0,w:1,d:44,h:5,kind:'wall'},
];

// Four districts around a central fountain plaza:
//  NW hedge maze · NE shipping yard · SW overgrown garden · SE market alley.
// `hide` objects can be entered with E; `walk` objects block sight but not movement.
export const props:Box[]=[
 // Plaza
 {x:0,z:0,w:4,d:4,h:1.2,kind:'fountain'},
 {x:0,z:-15,w:6,d:1,h:3,kind:'wall'},
 {x:-4.5,z:-10,w:1,d:6,h:3,kind:'wall'},
 {x:10,z:4,w:6,d:1,h:3,kind:'wall'},
 {x:-4.5,z:10,w:1,d:6,h:3,kind:'wall'},
 {x:4.5,z:12,w:1,d:8,h:3,kind:'wall'},
 {x:0,z:19,w:4,d:1.5,h:1.2,kind:'planter'},
 {x:0,z:-19,w:4,d:1.5,h:1.2,kind:'planter'},
 {x:-19,z:0,w:1.5,d:4,h:1.2,kind:'planter'},
 {x:19,z:0.5,w:1.5,d:4,h:1.2,kind:'planter'},
 {x:-8,z:-3.5,w:3,d:1.2,h:1,kind:'bench'},
 {x:8,z:-3.5,w:3,d:1.2,h:1,kind:'bench'},
 // NW hedge maze
 {x:-18.5,z:-8,w:5,d:1,h:2.7,kind:'hedge'},
 {x:-10.75,z:-8,w:5.5,d:1,h:2.7,kind:'hedge'},
 {x:-8,z:-19,w:1,d:4,h:2.7,kind:'hedge'},
 {x:-8,z:-11,w:1,d:6,h:2.7,kind:'hedge'},
 {x:-17,z:-12,w:6,d:1,h:2.7,kind:'hedge'},
 {x:-12,z:-16,w:1,d:6,h:2.7,kind:'hedge'},
 {x:-16,z:-17.5,w:1,d:4,h:2.7,kind:'hedge'},
 {x:-19.6,z:-19.6,w:2.2,d:2.2,h:1.9,kind:'bush',hide:true},
 {x:-10,z:-10.5,w:2.2,d:2.2,h:1.9,kind:'bush',hide:true},
 {x:-14,z:-14,w:2,d:2,h:1.8,kind:'bush',hide:true},
 // NE shipping yard
 {x:13,z:-17.5,w:6,d:3,h:3,kind:'container',color:'#3fa7b3',hide:true},
 {x:18.5,z:-11,w:3,d:6,h:3,kind:'container',color:'#e8924a',hide:true},
 {x:9,z:-12,w:3,d:5,h:3,kind:'container',color:'#c9564e'},
 {x:4.5,z:-11,w:1,d:8,h:3,kind:'wall'},
 {x:20.2,z:-19.8,w:1.4,d:1.4,h:1.5,kind:'barrel',hide:true},
 {x:6.5,z:-19.6,w:1.4,d:1.4,h:1.5,kind:'barrel',hide:true},
 {x:14,z:-5.5,w:2,d:2,h:2,kind:'crate'},
 {x:12,z:-6,w:1.5,d:1.5,h:1.4,kind:'crate'},
 {x:14,z:-11,w:2,d:2,h:2.2,kind:'crate'},
 {x:20.6,z:-4,w:1.6,d:3,h:1.7,kind:'dumpster',hide:true},
 // SW overgrown garden
 {x:-19.6,z:6,w:2.4,d:2.4,h:1.9,kind:'bush',hide:true},
 {x:-9,z:7,w:2.2,d:2.2,h:1.8,kind:'bush',hide:true},
 {x:-18.5,z:18.5,w:4,d:4,h:3.2,kind:'shed',hide:true},
 {x:-10,z:17,w:1,d:6,h:3,kind:'wall'},
 {x:-13,z:20,w:.8,d:.8,h:4,kind:'tree'},
 {x:-3.5,z:6.5,w:.8,d:.8,h:4,kind:'tree'},
 {x:-20,z:12.5,w:.8,d:.8,h:4,kind:'tree'},
 {x:-6,z:21,w:2.6,d:1.2,h:1.6,kind:'hay',hide:true},
 // SE market alley
 {x:8.5,z:8.5,w:3.2,d:1.8,h:1.4,kind:'stall',color:'#e86a6a',hide:true},
 {x:14.5,z:8.5,w:3.2,d:1.8,h:1.4,kind:'stall',color:'#5c9be0',hide:true},
 {x:8.5,z:15,w:3.2,d:1.8,h:1.4,kind:'stall',color:'#f2b84b',hide:true},
 {x:17,z:15,w:1,d:8,h:3,kind:'wall'},
 {x:20.6,z:10.5,w:1.2,d:2.4,h:2.6,kind:'locker',color:'#9d88db',hide:true},
 {x:20,z:19.8,w:2,d:2,h:2,kind:'crate'},
 {x:13,z:20.3,w:3.5,d:1.2,h:1,kind:'bench'},
 {x:12,z:12,w:5,d:.15,h:2.4,kind:'sheet',walk:true,color:'#f3efe6'},
 {x:13.5,z:17,w:4,d:.15,h:2.4,kind:'sheet',walk:true,color:'#cfe3f5'},
];
export const boxes:Box[]=[...perimeter,...props];

// Tall grass: crouch inside to blend in (hidden from opponents beyond close range).
export const grass:Zone[]=[
 {x:-15,z:12,w:7,d:6},
 {x:-5.5,z:16.5,w:6,d:5},
 {x:15.5,z:-1.5,w:5,d:3},
 {x:-14,z:-4,w:5,d:3},
];

export const spots=props.filter(b=>b.hide).map(b=>({x:b.x,z:b.z,w:b.w,d:b.d,kind:b.kind}));
// Distance from a player to the edge of a hiding object that still lets them climb in.
export const HIDE_RANGE=1.15;
export function spotDistance(s:{x:number;z:number;w:number;d:number},x:number,z:number){return Math.hypot(Math.max(0,Math.abs(x-s.x)-s.w/2),Math.max(0,Math.abs(z-s.z)-s.d/2));}
export const gems=[[-19,-15],[-14,-10],[-10,-19.5],[12,-20.5],[19.5,-15.5],[6,-6],[-16,7],[-13,18],[-2,21],[10.5,12],[20,14.5],[0,-11]] as const;
export const spawns=Array.from({length:12},(_,i)=>{const a=i/12*Math.PI*2;return [Math.sin(a)*5,Math.cos(a)*5] as const;});

const solid=props.filter(b=>!b.walk);
const sightBlockers=boxes.filter(b=>b.h>=1.9);

export function blocked(x:number,z:number,r=.42){
 if(Math.abs(x)>SIZE-r||Math.abs(z)>SIZE-r)return true;
 return solid.some(b=>x+r>b.x-b.w/2&&x-r<b.x+b.w/2&&z+r>b.z-b.d/2&&z-r<b.z+b.d/2);
}
export function validMove(x:number,z:number,nx:number,nz:number){
 if(!blocked(nx,z))x=nx;if(!blocked(x,nz))z=nz;return {x,z};
}
export function inGrass(x:number,z:number){return grass.some(g=>Math.abs(x-g.x)<g.w/2&&Math.abs(z-g.z)<g.d/2);}

// True if nothing tall (walls, hedges, containers, sheets...) is between the two points.
export function clearLine(ax:number,az:number,bx:number,bz:number){
 const distance=Math.hypot(bx-ax,bz-az);
 for(let t=.3;t<distance-.3;t+=.2){
  const x=ax+(bx-ax)*t/distance,z=az+(bz-az)*t/distance;
  if(sightBlockers.some(b=>x>b.x-b.w/2&&x<b.x+b.w/2&&z>b.z-b.d/2&&z<b.z+b.d/2))return false;
 }
 return true;
}

// Camo hiders are only visible to opponents this close.
export const CAMO_REVEAL=2.4;

// Tag: a forward lunge with a cone check, short cooldown on every swing.
export const TAG={range:2.7,arc:1.05,cooldown:1.1,lunge:1.4,bump:1.25};
type TagCandidate={id:string;x:number;z:number;role:string;caught:boolean;hidden:boolean};
export function findTagTarget(seeker:{x:number;z:number},look:number,players:TagCandidate[]){
 let best:{id:string;score:number}|null=null;
 for(const p of players){
  if(p.role!=='hider'||p.caught||p.hidden)continue;
  const dx=p.x-seeker.x,dz=p.z-seeker.z,dist=Math.hypot(dx,dz);
  if(dist>TAG.range)continue;
  let diff=Math.atan2(dx,dz)-look;diff=Math.atan2(Math.sin(diff),Math.cos(diff));
  if(dist>TAG.bump&&Math.abs(diff)>TAG.arc)continue;
  if(!clearLine(seeker.x,seeker.z,p.x,p.z))continue;
  const score=dist+Math.abs(diff)*1.2;
  if(!best||score<best.score)best={id:p.id,score};
 }
 return best?.id??null;
}
// Moves the seeker forward along `look` for the lunge.
export function lunge(x:number,z:number,look:number,distance=TAG.lunge){
 let pos={x,z};
 for(let s=0;s<6;s++)pos=validMove(pos.x,pos.z,pos.x+Math.sin(look)*distance/6,pos.z+Math.cos(look)*distance/6);
 return pos;
}
export function nearestSpot(x:number,z:number){
 let best=-1,bd=HIDE_RANGE;
 spots.forEach((s,i)=>{const d=spotDistance(s,x,z);if(d<bd){bd=d;best=i;}});
 return best;
}
