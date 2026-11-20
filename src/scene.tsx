import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, Sky, ContactShadows } from '@react-three/drei';
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Avatar } from './avatar';
import { boxes, gems, grass, perimeter, props, spots, SIZE, TAG, CAMO_REVEAL, clearLine, findTagTarget, nearestSpot, type Box } from './world';

export type P={x:number;z:number;yaw:number;name:string;character:string;role:string;caught:boolean;hidden:boolean;camo?:boolean;crouch:boolean;sprint:boolean;jumping:boolean;moving:boolean;swing?:number};

// What `viewer` can see of `p`: 'full', 'ghost' (teammate in camo/hiding) or 'none'.
export function visibility(viewer:P|undefined,p:P,isSelf:boolean):'full'|'ghost'|'none'{
 if(isSelf||!viewer)return 'full';
 const team=viewer.role===p.role;
 if(p.hidden)return team?'ghost':'none';
 if(p.camo){if(team)return 'ghost';return Math.hypot(p.x-viewer.x,p.z-viewer.z)<=CAMO_REVEAL?'full':'none';}
 return 'full';
}
// Whether the viewer can "spot" p (name tag + minimap dot).
export function spotted(viewer:P|undefined,p:P,isSelf:boolean){
 if(isSelf||!viewer)return true;
 const v=visibility(viewer,p,isSelf);if(v==='none')return false;
 if(viewer.role===p.role)return true;
 return Math.hypot(p.x-viewer.x,p.z-viewer.z)<14&&clearLine(viewer.x,viewer.z,p.x,p.z);
}

function Follow({player,yaw,pitch}:{player:P;yaw:number;pitch:number}){const {camera}=useThree();const target=useMemo(()=>new THREE.Vector3(),[]);useFrame((_,dt)=>{target.set(player.x,1.15,player.z);const radius=7.18,horizontal=Math.cos(pitch)*radius;const desired=new THREE.Vector3(player.x-Math.sin(yaw)*horizontal,Math.max(.55,target.y+Math.sin(pitch)*radius),player.z-Math.cos(yaw)*horizontal);let fraction=1;for(let t=.08;t<=1;t+=.04){const x=target.x+(desired.x-target.x)*t,z=target.z+(desired.z-target.z)*t,h=target.y+(desired.y-target.y)*t;if(boxes.some(b=>!b.walk&&x>b.x-b.w/2-.2&&x<b.x+b.w/2+.2&&z>b.z-b.d/2-.2&&z<b.z+b.d/2+.2&&h<b.h+.2)){fraction=Math.max(.12,t-.06);break;}}const c=target.clone().lerp(desired,fraction);camera.position.lerp(c,Math.min(1,dt*9));camera.lookAt(target);});return null;}

// ---------- ground ----------
function groundTexture(){
 const c=document.createElement('canvas');c.width=c.height=1024;const g=c.getContext('2d')!;const px=1024/44;
 g.fillStyle='#ddd8c8';g.fillRect(0,0,1024,1024);
 const rnd=(i:number)=>{const x=Math.sin(i*127.1)*43758.5;return x-Math.floor(x);};
 const area=(x0:number,z0:number,x1:number,z1:number,base:string,alt:string,tile:number)=>{let i=0;for(let x=x0;x<x1;x+=tile)for(let z=z0;z<z1;z+=tile){i++;g.fillStyle=rnd(i+x*3+z)<.3?alt:base;g.fillRect((x+22)*px+1,(z+22)*px+1,tile*px-2,tile*px-2);}};
 area(-22,-22,0,0,'#c8d6b6','#bccaa9',2);        // NW maze: mossy flagstones
 area(0,-22,22,0,'#cfcac0','#c2bdb2',2.75);      // NE yard: concrete slabs
 area(-22,0,0,22,'#b9c99a','#adbe8d',1.5);       // SW garden: grassy pavers
 area(0,0,22,22,'#e6d6bc','#dccaad',1.1);        // SE market: brick
 g.fillStyle='#ece6d6';g.beginPath();g.arc(22*px,22*px,7.5*px,0,Math.PI*2);g.fill(); // plaza
 g.strokeStyle='#d8cfbc';g.lineWidth=3;for(let r=2.5;r<7.5;r+=1.6){g.beginPath();g.arc(22*px,22*px,r*px,0,Math.PI*2);g.stroke();}
 for(const z of grass){g.fillStyle='#86a85e';g.fillRect((z.x-z.w/2+22)*px,(z.z-z.d/2+22)*px,z.w*px,z.d*px);}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;
}
function Ground(){const tex=useMemo(groundTexture,[]);return <><mesh rotation={[-Math.PI/2,0,0]} receiveShadow><planeGeometry args={[44,44]}/><meshStandardMaterial map={tex} roughness={1}/></mesh><mesh rotation={[-Math.PI/2,0,0]} position={[0,-.02,0]}><planeGeometry args={[160,160]}/><meshStandardMaterial color="#9fbf86" roughness={1}/></mesh></>;}

// ---------- tall grass (instanced blades) ----------
function TallGrass(){
 const ref=useRef<THREE.InstancedMesh>(null);
 const blades=useMemo(()=>{const out:{x:number;z:number;h:number;r:number;t:number}[]=[];let i=0;const rnd=()=>{i++;const x=Math.sin(i*91.7)*43758.5;return x-Math.floor(x);};for(const z of grass){const n=Math.round(z.w*z.d*16);for(let k=0;k<n;k++)out.push({x:z.x+(rnd()-.5)*z.w,z:z.z+(rnd()-.5)*z.d,h:1.05+rnd()*.6,r:rnd()*Math.PI*2,t:(rnd()-.5)*.35});}return out;},[]);
 const geo=useMemo(()=>{const g=new THREE.ConeGeometry(.07,1,3,1);g.translate(0,.5,0);return g;},[]);
 useLayoutEffect(()=>{const m=new THREE.Object3D(),col=new THREE.Color();blades.forEach((b,i)=>{m.position.set(b.x,0,b.z);m.rotation.set(b.t,b.r,b.t*.6);m.scale.set(1,b.h,1);m.updateMatrix();ref.current!.setMatrixAt(i,m.matrix);ref.current!.setColorAt(i,col.setHSL(.25+b.t*.08,.45,.32+b.h*.08));});ref.current!.instanceMatrix.needsUpdate=true;if(ref.current!.instanceColor)ref.current!.instanceColor.needsUpdate=true;},[blades]);
 return <instancedMesh ref={ref} args={[geo,undefined,blades.length]} castShadow receiveShadow><meshStandardMaterial roughness={.9}/></instancedMesh>;
}

// ---------- props ----------
const C={wall:'#f4eee4',wallTop:'#e2d8c8',hedge:'#4f8f55',hedgeHi:'#5fa362',crate:'#b98457',crateEdge:'#8f6240',bench:'#9b714e',planter:'#e8dcc9',barrel:'#7b5a3c',hay:'#e2c065'};
function Std({color,...rest}:{color:string}&Record<string,unknown>){return <meshStandardMaterial color={color} roughness={.85} {...rest}/>;}
const bumps=(b:Box)=>Math.max(2,Math.round(Math.max(b.w,b.d)/1.1));
function Prop({b,i}:{b:Box;i:number}){
 const p:[number,number,number]=[b.x,0,b.z];
 const long=b.w>=b.d;
 switch(b.kind){
  case 'wall':return <group position={p}>
   <mesh position={[0,b.h/2,0]} castShadow receiveShadow><boxGeometry args={[b.w,b.h,b.d]}/><Std color={C.wall}/></mesh>
   <mesh position={[0,b.h+.06,0]} castShadow><boxGeometry args={[b.w+.15,.12,b.d+.15]}/><Std color={C.wallTop}/></mesh>
   {i%2===0&&b.h<4&&<mesh position={long?[b.w*.25,b.h*.62,b.d/2+.03]:[b.w/2+.03,b.h*.62,b.d*.25]} rotation={[0,long?0:Math.PI/2,0]}><planeGeometry args={[Math.min(2.4,(long?b.w:b.d)*.4),b.h*.7]}/><Std color="#5f9e5a" side={THREE.DoubleSide}/></mesh>}
  </group>;
  case 'hedge':return <group position={p}>
   <mesh position={[0,b.h/2,0]} castShadow receiveShadow><boxGeometry args={[b.w,b.h,b.d]}/><Std color={C.hedge}/></mesh>
   {Array.from({length:bumps(b)},(_,k)=>{const f=(k+.5)/bumps(b)-.5;return <mesh key={k} position={long?[f*b.w,b.h,0]:[0,b.h,f*b.d]} castShadow><sphereGeometry args={[.62,10,8]}/><Std color={k%2?C.hedge:C.hedgeHi}/></mesh>;})}
  </group>;
  case 'bush':return <group position={p}>{[[0,.75,0,1],[.45,.55,.3,.7],[-.4,.6,-.25,.75],[.1,1.15,-.1,.7]].map(([x,y,z,s],k)=><mesh key={k} position={[x*b.w/2.2,y*b.h/1.9,z*b.w/2.2]} castShadow><sphereGeometry args={[b.w*.42*s,14,10]}/><Std color={k%2?'#5c9d60':'#72b26b'}/></mesh>)}</group>;
  case 'container':return <group position={p}>
   <mesh position={[0,b.h/2,0]} castShadow receiveShadow><boxGeometry args={[b.w,b.h,b.d]}/><Std color={b.color!} roughness={.6} metalness={.2}/></mesh>
   {Array.from({length:Math.round((long?b.w:b.d)/.45)},(_,k)=>{const f=(k+.5)/Math.round((long?b.w:b.d)/.45)-.5;return <mesh key={k} position={long?[f*b.w,b.h/2,0]:[0,b.h/2,f*b.d]}><boxGeometry args={long?[.12,b.h*.92,b.d+.08]:[b.w+.08,b.h*.92,.12]}/><Std color={b.color!} roughness={.5}/></mesh>;})}
   <mesh position={long?[b.w/2+.05,b.h/2,0]:[0,b.h/2,b.d/2+.05]} rotation={[0,long?Math.PI/2:0,0]}><planeGeometry args={[(long?b.d:b.w)*.9,b.h*.88]}/><Std color="#2c3a40" side={THREE.DoubleSide}/></mesh>
  </group>;
  case 'barrel':return <group position={p}>
   <mesh position={[0,b.h/2,0]} castShadow><cylinderGeometry args={[b.w/2*.9,b.w/2*.82,b.h,18]}/><Std color={C.barrel}/></mesh>
   {[.2,.8].map(y=><mesh key={y} position={[0,b.h*y,0]}><torusGeometry args={[b.w/2*.88,.04,6,20]}/><Std color="#3d3a3a" metalness={.4}/></mesh>)}
   <mesh position={[0,b.h+.01,0]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[b.w/2*.85,18]}/><Std color="#5d4129"/></mesh>
  </group>;
  case 'crate':return <group position={p}>
   <mesh position={[0,b.h/2,0]} castShadow receiveShadow><boxGeometry args={[b.w,b.h,b.d]}/><Std color={C.crate}/></mesh>
   {[[0,.05],[0,.95]].map(([,y],k)=><mesh key={k} position={[0,b.h*y,0]}><boxGeometry args={[b.w+.04,.12,b.d+.04]}/><Std color={C.crateEdge}/></mesh>)}
   <mesh position={[0,b.h/2,0]} rotation={[0,0,Math.atan2(b.h,b.w)]}><boxGeometry args={[Math.hypot(b.w,b.h)*.9,.12,b.d+.03]}/><Std color={C.crateEdge}/></mesh>
  </group>;
  case 'dumpster':return <group position={p}>
   <mesh position={[0,b.h*.45,0]} castShadow><boxGeometry args={[b.w,b.h*.9,b.d]}/><Std color="#3f7a57" roughness={.6} metalness={.3}/></mesh>
   <mesh position={[-.15,b.h*.95,0]} rotation={[0,0,.25]} castShadow><boxGeometry args={[b.w*.95,.08,b.d]}/><Std color="#2f5c42"/></mesh>
  </group>;
  case 'shed':return <group position={p}>
   <mesh position={[0,b.h*.4,0]} castShadow receiveShadow><boxGeometry args={[b.w,b.h*.8,b.d]}/><Std color="#a7745a"/></mesh>
   <mesh position={[0,b.h*.8+.55,0]} rotation={[0,Math.PI/4,0]} castShadow><coneGeometry args={[b.w*.82,1.1,4]}/><Std color="#7c3f3a"/></mesh>
   <mesh position={[b.w/2+.02,b.h*.32,0]} rotation={[0,Math.PI/2,0]}><planeGeometry args={[1.1,1.9]}/><Std color="#5c3b2a"/></mesh>
  </group>;
  case 'tree':return <group position={p}>
   <mesh position={[0,1.2,0]} castShadow><cylinderGeometry args={[.22,.32,2.4,10]}/><Std color="#7d6249"/></mesh>
   {[[0,2.9,0,1.6],[.7,2.5,.3,1.1],[-.6,2.6,-.4,1.15],[0,3.7,0,1.1]].map(([x,y,z,s],k)=><mesh key={k} position={[x,y,z]} castShadow><sphereGeometry args={[s,14,10]}/><Std color={k%2?'#5d9c5c':'#73b06a'}/></mesh>)}
  </group>;
  case 'hay':return <group position={p}>
   <mesh position={[0,b.h/2,0]} castShadow><boxGeometry args={[b.w,b.h,b.d]}/><Std color={C.hay}/></mesh>
   {[-.3,.3].map(x=><mesh key={x} position={[x*b.w,b.h/2,0]}><boxGeometry args={[.06,b.h+.02,b.d+.02]}/><Std color="#9b7a35"/></mesh>)}
  </group>;
  case 'stall':return <group position={p}>
   <mesh position={[0,b.h/2,0]} castShadow receiveShadow><boxGeometry args={[b.w,b.h,b.d]}/><Std color={b.color!}/></mesh>
   <mesh position={[0,b.h+.03,0]}><boxGeometry args={[b.w+.1,.06,b.d+.1]}/><Std color="#8c6a4a"/></mesh>
   {[[0,.3,.2,'#f6c244'],[.8,.25,-.2,'#e7553e'],[-.8,.3,.1,'#8bc34a']].map(([x,y,z,col],k)=><mesh key={k} position={[x as number,b.h+(y as number)/2+.05,z as number]} castShadow><sphereGeometry args={[y as number,10,8]}/><Std color={col as string}/></mesh>)}
   {[-1,1].map(s=><mesh key={s} position={[s*b.w/2,1.4,-b.d/2]}><cylinderGeometry args={[.05,.05,2.8,6]}/><Std color="#6d5038"/></mesh>)}
   {Array.from({length:6},(_,k)=><mesh key={k} position={[-b.w/2+b.w/12+k*b.w/6,2.75,-b.d/2+.6]} rotation={[.35,0,0]} castShadow><boxGeometry args={[b.w/6,.05,1.4]}/><Std color={k%2?'#ffffff':b.color!}/></mesh>)}
  </group>;
  case 'sheet':return <group position={p}><Sheet b={b}/></group>;
  case 'fountain':return <group position={p}>
   <mesh position={[0,.4,0]} castShadow receiveShadow><cylinderGeometry args={[2.1,2.25,.8,32]}/><Std color="#e9e2d4"/></mesh>
   <mesh position={[0,.78,0]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[1.85,32]}/><meshStandardMaterial color="#6fc3d8" roughness={.15} metalness={.1}/></mesh>
   <mesh position={[0,1.2,0]} castShadow><cylinderGeometry args={[.25,.4,1.2,16]}/><Std color="#e9e2d4"/></mesh>
   <mesh position={[0,1.85,0]} castShadow><cylinderGeometry args={[.8,.3,.25,24]}/><Std color="#e9e2d4"/></mesh>
  </group>;
  case 'planter':return <group position={p}>
   <mesh position={[0,b.h*.4,0]} castShadow receiveShadow><boxGeometry args={[b.w,b.h*.8,b.d]}/><Std color={C.planter}/></mesh>
   {Array.from({length:3},(_,k)=><mesh key={k} position={long?[(k-1)*b.w/3,b.h*.9,0]:[0,b.h*.9,(k-1)*b.d/3]} castShadow><sphereGeometry args={[Math.min(b.w,b.d)*.5,10,8]}/><Std color={k%2?'#6aa865':'#e57fa6'}/></mesh>)}
  </group>;
  case 'bench':return <group position={p}>
   <mesh position={[0,b.h*.55,0]} castShadow><boxGeometry args={[b.w,.12,b.d*.8]}/><Std color={C.bench}/></mesh>
   <mesh position={[0,b.h,-b.d*.38]} castShadow><boxGeometry args={[b.w,.4,.08]}/><Std color={C.bench}/></mesh>
   {[-1,1].map(s=><mesh key={s} position={[s*(b.w/2-.2),b.h*.27,0]} castShadow><boxGeometry args={[.1,b.h*.55,b.d*.7]}/><Std color="#4a4a52"/></mesh>)}
  </group>;
  case 'locker':return <group position={p}>
   <mesh position={[0,b.h/2,0]} castShadow receiveShadow><boxGeometry args={[b.w,b.h,b.d]}/><Std color={b.color!} roughness={.5} metalness={.25}/></mesh>
   {[-.25,.25].map(f=><mesh key={f} position={[-b.w/2-.01,b.h*.55,f*b.d]} rotation={[0,-Math.PI/2,0]}><planeGeometry args={[b.d*.42,b.h*.8]}/><Std color="#8573c5"/></mesh>)}
  </group>;
  default:return <mesh position={[b.x,b.h/2,b.z]} castShadow><boxGeometry args={[b.w,b.h,b.d]}/><Std color={b.color||'#b5a9c9'}/></mesh>;
 }
}
function Sheet({b}:{b:Box}){
 const ref=useRef<THREE.Mesh>(null);
 const geo=useMemo(()=>new THREE.PlaneGeometry(b.w,b.h*.75,12,6),[b.w,b.h]);
 const base=useMemo(()=>Float32Array.from(geo.attributes.position.array),[geo]);
 useFrame(({clock})=>{const pos=geo.attributes.position;for(let k=0;k<pos.count;k++){const x=base[k*3],y=base[k*3+1];const drop=(b.h*.375-y)/(b.h*.75);pos.setZ(k,Math.sin(clock.elapsedTime*1.6+x*1.3)*.12*drop);}pos.needsUpdate=true;geo.computeVertexNormals();});
 return <>
  {[-1,1].map(s=><mesh key={s} position={[s*(b.w/2+.1),b.h/2+.1,0]} castShadow><cylinderGeometry args={[.05,.06,b.h+.2,6]}/><Std color="#6d5038"/></mesh>)}
  <mesh position={[0,b.h+.15,0]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[.012,.012,b.w+.2,4]}/><Std color="#444"/></mesh>
  <mesh ref={ref} geometry={geo} position={[0,b.h*.625+.1,0]} castShadow><meshStandardMaterial color={b.color} side={THREE.DoubleSide} roughness={.95}/></mesh>
 </>;
}

function Level(){
 return <>
  <Sky sunPosition={[20,30,-10]} turbidity={3} rayleigh={.4}/>
  <fog attach="fog" args={['#d9eaee',16,48]}/>
  <hemisphereLight args={['#f1f8ff','#bba98e',1.25]}/>
  <ambientLight intensity={.35}/>
  <directionalLight castShadow position={[12,25,10]} intensity={2.4} shadow-mapSize={[2048,2048]} shadow-camera-left={-26} shadow-camera-right={26} shadow-camera-top={26} shadow-camera-bottom={-26} shadow-bias={-.0004}/>
  <Ground/>
  <TallGrass/>
  {perimeter.map((b,i)=><Prop key={'p'+i} b={b} i={i+1}/>)}
  {props.map((b,i)=><Prop key={i} b={b} i={i}/>)}
  {Array.from({length:28},(_,i)=>{const a=i/28*Math.PI*2,r=25+(i%3)*1.6;return <group key={'t'+i} position={[Math.cos(a)*r,0,Math.sin(a)*r]} scale={1.3+(i%4)*.15}><Prop b={{x:0,z:0,w:1,d:1,h:4,kind:'tree'}} i={i}/></group>;})}
  <ContactShadows opacity={.22} scale={50} blur={2.5} far={8}/>
 </>;
}
function Gem({x,z}:{x:number;z:number}){const ref=useRef<THREE.Mesh>(null);useFrame(({clock})=>{if(ref.current){ref.current.rotation.y=clock.elapsedTime*1.4;ref.current.position.y=.9+Math.sin(clock.elapsedTime*3+x)*.12;}});return <mesh ref={ref} position={[x,.9,z]} castShadow><octahedronGeometry args={[.38]}/><meshStandardMaterial color="#ad5cf6" emissive="#8134d9" emissiveIntensity={.6} metalness={.15} roughness={.22}/></mesh>;}

function SwipeFx({swing}:{swing:number}){
 const ref=useRef<THREE.Mesh>(null);const start=useRef({v:swing,at:-10});
 useFrame(({clock})=>{if(swing!==start.current.v)start.current={v:swing,at:clock.elapsedTime};const k=(clock.elapsedTime-start.current.at)/.3;if(ref.current){ref.current.visible=k<1;const m=ref.current.material as THREE.MeshBasicMaterial;m.opacity=.75*(1-k);ref.current.scale.setScalar(.6+k*.6);}});
 return <mesh ref={ref} position={[0,1,.5]} rotation={[-Math.PI/2,0,-Math.PI/2]} visible={false}><ringGeometry args={[1.1,1.6,24,1,-1.0,2.0]}/><meshBasicMaterial color="#ffffff" transparent depthWrite={false} side={THREE.DoubleSide}/></mesh>;
}

function Actor({p,self,view,showTag,targeted}:{p:P;self:boolean;view:'full'|'ghost'|'none';showTag:boolean;targeted:boolean}){
 const ref=useRef<THREE.Group>(null);const current=useRef(new THREE.Vector3(p.x,0,p.z));const yaw=useRef(p.yaw);
 useFrame((_,dt)=>{current.current.lerp(new THREE.Vector3(p.x,0,p.z),Math.min(1,dt*12));let d=p.yaw-yaw.current;d=Math.atan2(Math.sin(d),Math.cos(d));yaw.current+=d*Math.min(1,dt*14);if(ref.current){ref.current.position.copy(current.current);ref.current.rotation.y=yaw.current;}});
 return <group ref={ref}>
  <Avatar character={p.character} moving={p.moving} sprint={p.sprint} crouch={p.crouch||!!p.camo} jumping={p.jumping} caught={p.caught} hidden={view==='none'} ghost={view==='ghost'} seeker={p.role==='seeker'} swing={p.swing||0}/>
  {p.role==='seeker'&&<SwipeFx swing={p.swing||0}/>}
  {showTag&&<Html position={[0,2.45,0]} center zIndexRange={[10,0]}><div className={'nameTag'+(p.role==='seeker'?' seekerTag':'')+(targeted?' targeted':'')}>{targeted?'⚡ TAG! ':''}{p.name}{p.role==='seeker'?' 🔎':''}{p.caught?' 💫':''}</div></Html>}
  {targeted&&<TargetRing/>}
  {self&&(p.hidden||p.camo)&&<mesh position={[0,.04,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.65,.8,24]}/><meshBasicMaterial color="#ad5cf6" transparent opacity={.7} side={THREE.DoubleSide}/></mesh>}
 </group>;
}
function TargetRing(){const ref=useRef<THREE.Mesh>(null);useFrame(({clock})=>{if(ref.current){const s=1+Math.sin(clock.elapsedTime*10)*.08;ref.current.scale.set(s,s,s);}});return <mesh ref={ref} position={[0,.05,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.6,.82,28]}/><meshBasicMaterial color="#ff4d5e" transparent opacity={.9} side={THREE.DoubleSide} depthWrite={false}/></mesh>;}

// Ground wedge in front of the seeker showing the tag reach.
function TagWedge({p,yaw,hot,cooldown}:{p:P;yaw:number;hot:boolean;cooldown:boolean}){
 const ref=useRef<THREE.Group>(null);
 useFrame(()=>{if(ref.current){ref.current.position.set(p.x,.07,p.z);ref.current.rotation.y=yaw;}});
 return <group ref={ref}><mesh rotation={[-Math.PI/2,0,0]} renderOrder={2}><ringGeometry args={[.55,TAG.range,28,1,-Math.PI/2-TAG.arc,TAG.arc*2]}/><meshBasicMaterial color={hot?'#ff4d5e':cooldown?'#8a8494':'#ffffff'} transparent opacity={hot?.55:.32} depthWrite={false} side={THREE.DoubleSide}/></mesh></group>;
}
function SpotHint({index}:{index:number}){const s=spots[index];const ref=useRef<THREE.Mesh>(null);useFrame(({clock})=>{if(ref.current)(ref.current.material as THREE.MeshBasicMaterial).opacity=.35+Math.sin(clock.elapsedTime*5)*.2;});return <mesh ref={ref} position={[s.x,.05,s.z]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[Math.max(s.w,s.d)/2+.25,Math.max(s.w,s.d)/2+.45,32]}/><meshBasicMaterial color="#c18bff" transparent depthWrite={false} side={THREE.DoubleSide}/></mesh>;}

export function GameScene({players,selfId,yaw,pitch,gemMask,tagCooldown=0}:{players:Record<string,P>;selfId:string;yaw:number;pitch:number;gemMask:number;tagCooldown?:number}){
 const self=players[selfId];
 const seeking=self?.role==='seeker'&&!self.caught;
 const target=seeking?findTagTarget(self,yaw,Object.entries(players).map(([id,p])=>({id,...p}))):null;
 const spot=self&&self.role==='hider'&&!self.caught&&!self.hidden?nearestSpot(self.x,self.z):-1;
 return <Canvas shadows camera={{position:[0,5,8],fov:60,near:.1,far:130}} gl={{antialias:true}} dpr={[1,2]}>
  <Level/>
  {gems.map(([x,z],i)=>!(gemMask&(1<<i))&&<Gem key={i} x={x} z={z}/>)}
  {Object.entries(players).map(([id,p])=>{const isSelf=id===selfId;const view=visibility(self,p,isSelf);return <Actor key={id} p={p} self={isSelf} view={view} showTag={view!=='none'&&spotted(self,p,isSelf)} targeted={id===target}/>;})}
  {seeking&&<TagWedge p={self} yaw={yaw} hot={!!target&&tagCooldown<=0} cooldown={tagCooldown>0}/>}
  {spot>=0&&<SpotHint index={spot}/>}
  {self&&<Follow player={self} yaw={yaw} pitch={pitch}/>}
 </Canvas>;
}
export function Preview({character,seeker=false}:{character:string;seeker?:boolean}){return <Canvas shadows camera={{position:[0,.45,5.6],fov:34}} dpr={[1,2]}><hemisphereLight args={['#ffffff','#d8c8e8',1.6]}/><ambientLight intensity={.4}/><directionalLight position={[3,5,4]} intensity={2.2} castShadow/><group position={[0,-1.05,0]}><mesh rotation={[-Math.PI/2,0,0]} receiveShadow><circleGeometry args={[1.8,32]}/><meshStandardMaterial color="#eee6fa"/></mesh><group rotation={[0,.3,0]}><Avatar character={character} seeker={seeker}/></group><ContactShadows opacity={.25} scale={4} blur={2}/></group></Canvas>;}
export { SIZE };
