import { useFrame, type ThreeElements } from '@react-three/fiber';
import { useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';

type Props={character:string;moving?:boolean;sprint?:boolean;crouch?:boolean;jumping?:boolean;caught?:boolean;hidden?:boolean;seeker?:boolean;swing?:number;ghost?:boolean};

const INK='#2b2233';
const SKIN='#f7d4b8';

const looks={
 boy:{hair:'#252836',hairHi:'#34384b',shirt:'#efd04a',shirtTrim:'#685044',bottom:'#8c654a',shoe:'#292a31',sole:'#37383f',sock:'#f6f0e5',eye:'#3a2a24'},
 girl:{hair:'#aa865f',hairHi:'#c3a47b',shirt:'#faf7ef',shirtTrim:'#414761',bottom:'#414761',shoe:'#292a32',sole:'#41414a',sock:'#f8f4ee',eye:'#3c302f'},
};

function SoftMaterial({color,opacity}:{color:string;opacity?:number}){return <meshStandardMaterial color={color} roughness={.78} metalness={0} transparent={opacity!==undefined} opacity={opacity??1}/>;}
function Part({children,color,outline=true,ghost,...rest}:{children:ReactNode;color:string;outline?:boolean;ghost?:boolean}&ThreeElements['mesh']){
 return <mesh castShadow={!ghost} {...rest}>{children}<SoftMaterial color={color} opacity={ghost?.35:undefined}/></mesh>;
}

export function Avatar({character,moving=false,sprint=false,crouch=false,jumping=false,caught=false,hidden=false,seeker=false,swing=0,ghost=false}:Props){
 const girl=character==='girl';
 const c=girl?looks.girl:looks.boy;
 const root=useRef<THREE.Group>(null),body=useRef<THREE.Group>(null),head=useRef<THREE.Group>(null);
 const legL=useRef<THREE.Group>(null),legR=useRef<THREE.Group>(null),armL=useRef<THREE.Group>(null),armR=useRef<THREE.Group>(null);
 const eyes=useRef<THREE.Group>(null),stars=useRef<THREE.Group>(null);
 const blink=useRef({next:1+Math.random()*3,until:0});
 const swingStart=useRef({value:swing,at:-10});
 const seed=useMemo(()=>Math.random()*10,[]);
 useFrame(({clock},dt)=>{
  const t=clock.elapsedTime+seed;
  if(swing!==swingStart.current.value){swingStart.current={value:swing,at:t};}
  const sw=Math.max(0,1-(t-swingStart.current.at)/.38); // 1→0 over the swing
  const freq=sprint?15:10,cycle=Math.sin(t*freq),amp=moving?(sprint?.95:.65):0;
  const k=1-Math.pow(.0001,dt);
  const lerp=(o:THREE.Object3D|null,axis:'x'|'y'|'z',v:number)=>{if(o)o.rotation[axis]+=(v-o.rotation[axis])*k;};
  // legs
  const tuck=jumping?-.9:crouch?-.75:0;
  lerp(legL.current,'x',moving?cycle*amp:tuck);lerp(legR.current,'x',moving?-cycle*amp:tuck);
  // arms (right arm lunges forward during a tag swing)
  const armBase=jumping?-2.6:0;
  lerp(armL.current,'x',moving?-cycle*amp*.9:armBase+Math.sin(t*2)*.04);
  lerp(armR.current,'x',sw>0?-1.9*Math.sin(sw*Math.PI)-.4:moving?cycle*amp*.9:armBase-Math.sin(t*2)*.04);
  lerp(armL.current,'z',jumping?-.35:caught?-.9:.12);lerp(armR.current,'z',jumping?.35:caught?.9:-.12);
  if(body.current){
   const bob=moving?Math.abs(cycle)*(sprint?.09:.06):Math.sin(t*2.2)*.012;
   const y=(jumping?.38+Math.abs(Math.sin(t*7))*.15:0)+bob-(crouch?.28:0);
   body.current.position.y+=(y-body.current.position.y)*k;
   lerp(body.current,'x',(sprint&&moving?.22:moving?.08:0)+(crouch?.18:0)+sw*.35);
   lerp(body.current,'z',caught?Math.sin(t*7)*.14:moving?cycle*.04:0);
   const breathe=1+Math.sin(t*2.2)*.012,squash=crouch?.88:1;
   body.current.scale.set(1/Math.sqrt(squash),breathe*squash,1/Math.sqrt(squash));
  }
  if(head.current){lerp(head.current,'y',moving?0:Math.sin(t*.6)*.25);lerp(head.current,'z',moving?-cycle*.05:Math.sin(t*.9)*.05);}
  // blinking
  if(eyes.current){const b=blink.current;if(t>b.next){b.until=t+.12;b.next=t+2+Math.random()*3;}eyes.current.scale.y=caught?1:t<b.until?.12:1;}
  if(stars.current){stars.current.visible=caught;stars.current.rotation.y=t*3;}
  if(root.current)root.current.visible=!hidden;
 });
 const g=ghost;
 return <group ref={root}>
  <group ref={body}>
   {/* ---------- head ---------- */}
   <group ref={head} position={[0,1.36,0]}>
    <Part ghost={g} color={SKIN} scale={[1,.93,.95]}><sphereGeometry args={[.56,40,28]}/></Part>
    {/* ears */}
    {[-1,1].map(s=><Part ghost={g} key={s} color={SKIN} position={[s*.54,-.04,0]} scale={[.5,1,.8]} outline={false}><sphereGeometry args={[.12,14,10]}/></Part>)}
    {/* face */}
    <group ref={eyes} position={[0,-.02,0]}>
     {caught?[-1,1].map(s=><group key={s} position={[s*.19,0,.505]}>{[-1,1].map(r=><mesh key={r} rotation={[0,0,r*.8]}><boxGeometry args={[.16,.035,.02]}/><meshBasicMaterial color={INK}/></mesh>)}</group>)
     :[-1,1].map(s=><group key={s} position={[s*.19,0,.49]} rotation={[0,s*.36,0]}>
      <mesh scale={[1,1.32,.45]}><sphereGeometry args={[.085,18,14]}/><meshBasicMaterial color={INK}/></mesh>
      <mesh position={[0,-.035,.02]} scale={[1,.8,.45]}><sphereGeometry args={[.055,14,10]}/><meshBasicMaterial color={c.eye}/></mesh>
      <mesh position={[.028,.045,.04]}><sphereGeometry args={[.028,10,8]}/><meshBasicMaterial color="#ffffff"/></mesh>
      <mesh position={[-.03,-.04,.04]}><sphereGeometry args={[.013,8,6]}/><meshBasicMaterial color="#ffffff"/></mesh>
     </group>)}
    </group>
    {/* brows */}
    {[-1,1].map(s=><mesh key={s} position={[s*.2,.17,.47]} rotation={[0,s*.38,Math.PI/2+s*(caught?.35:-.12)]}><capsuleGeometry args={[.016,.07,3,6]}/><meshBasicMaterial color={girl?'#7a4f30':INK}/></mesh>)}
    {/* blush */}
    {[-1,1].map(s=><mesh key={s} position={[s*.33,-.15,.4]} rotation={[0,s*.65,0]} scale={[1.3,.75,.3]}><sphereGeometry args={[.07,12,8]}/><meshBasicMaterial color="#ff9d9a" transparent opacity={.6}/></mesh>)}
    {/* mouth */}
    <mesh position={[0,-.2,.505]} rotation={[0,0,caught?0:Math.PI]} scale={caught?[1,1.4,1]:[1,1,1]}><torusGeometry args={[.05,.014,6,14,Math.PI]}/><meshBasicMaterial color="#8c3b45"/></mesh>
    {/* Rounded hair sits around the head, leaving the face clear. */}
    {girl?<>
     <Part ghost={g} color={c.hair} position={[0,.08,-.09]} scale={[1.03,1,.97]}><sphereGeometry args={[.56,36,24,Math.PI,Math.PI,0,Math.PI*.82]}/></Part>
     <Part ghost={g} color={c.hair} position={[0,.07,-.05]} scale={[1.04,.96,1.02]}><sphereGeometry args={[.56,36,22,0,Math.PI*2,0,Math.PI*.43]}/></Part>
     {[-1,1].map(side=><group key={side}>
      <Part ghost={g} color={c.hair} position={[side*.47,-.12,.02]} rotation={[0,0,side*-.14]} scale={[.65,1.45,.72]}><sphereGeometry args={[.18,18,14]}/></Part>
      <Part ghost={g} color={c.hair} position={[side*.47,.37,-.11]}><sphereGeometry args={[.21,20,16]}/></Part>
      <Part ghost={g} color="#fffaf2" position={[side*.46,.54,-.07]} rotation={[0,0,side*.4]} scale={[1.15,.5,.65]}><sphereGeometry args={[.105,12,10]}/></Part>
      <Part ghost={g} color="#fffaf2" position={[side*.46,.51,.01]} scale={[.58,.58,.58]}><sphereGeometry args={[.065,10,8]}/></Part>
     </group>)}
    </>:<>
     <Part ghost={g} color={c.hair} position={[0,.03,-.09]} scale={[1.04,1,.98]}><sphereGeometry args={[.56,36,24,Math.PI,Math.PI,0,Math.PI*.82]}/></Part>
     <Part ghost={g} color={c.hair} position={[0,.07,-.03]} scale={[1.04,.95,1.03]}><sphereGeometry args={[.56,36,20,0,Math.PI*2,0,Math.PI*.43]}/></Part>
     {[-1,1].map(side=><Part ghost={g} key={side} color={c.hair} position={[side*.51,-.05,.01]} scale={[.5,1.05,.62]}><sphereGeometry args={[.16,16,12]}/></Part>)}
     {/* Backwards cap: visor is behind the head. */}
     <Part ghost={g} color="#dc4b55" position={[0,.1,-.03]} scale={[1.07,.95,1.07]}><sphereGeometry args={[.56,36,20,0,Math.PI*2,0,Math.PI*.43]}/></Part>
     <Part ghost={g} color="#bd3643" position={[0,.2,-.55]} scale={[1,.18,.48]}><sphereGeometry args={[.33,18,12]}/></Part>
     <Part ghost={g} color="#f6ece2" position={[0,.66,-.03]}><sphereGeometry args={[.045,10,8]}/></Part>
     <Part ghost={g} color="#f6ece2" position={[0,.21,.49]}><boxGeometry args={[.18,.06,.025]}/></Part>
    </>}
    {/* dizzy stars */}
    <group ref={stars} position={[0,.75,0]} visible={false}>
     {[0,1,2].map(i=><mesh key={i} position={[Math.sin(i*2.1)*.5,Math.sin(i)*.05,Math.cos(i*2.1)*.5]}><octahedronGeometry args={[.09]}/><meshBasicMaterial color="#ffd84a"/></mesh>)}
    </group>
   </group>
   {/* ---------- torso ---------- */}
   <Part ghost={g} color={c.shirt} position={[0,.66,0]} scale={[1,1,.88]}><capsuleGeometry args={[.27,.2,8,20]}/></Part>
   {girl?<>
    {/* sailor collar + bow */}
    <Part ghost={g} color={c.shirtTrim} position={[0,.86,-.02]} rotation={[.12,0,0]}><cylinderGeometry args={[.25,.3,.08,20]}/></Part>
    <Part ghost={g} color="#e5484d" position={[0,.8,.24]} scale={[1.5,.8,.6]}><sphereGeometry args={[.06,10,8]}/></Part>
    <Part ghost={g} color={c.bottom} position={[0,.36,0]}><cylinderGeometry args={[.28,.42,.32,16,1]}/></Part>
   </>:<>
    <Part ghost={g} color={c.shirtTrim} position={[0,.87,0]} outline={false}><torusGeometry args={[.19,.035,8,20]}/></Part>
    <Part ghost={g} color={c.shirtTrim} position={[0,.62,.235]} scale={[1,1,.3]} outline={false}><boxGeometry args={[.46,.06,.1]}/></Part>
    <Part ghost={g} color={c.bottom} position={[0,.42,0]} scale={[1,1,.9]}><cylinderGeometry args={[.29,.3,.24,18]}/></Part>
    {/* backpack */}
    <Part ghost={g} color="#9a704f" position={[0,.7,-.3]}><boxGeometry args={[.36,.4,.16]}/></Part>
   </>}
   {/* ---------- arms ---------- */}
   {[-1,1].map(s=><group key={s} ref={s<0?armL:armR} position={[s*.3,.82,0]}>
    <Part ghost={g} color={c.shirt} position={[s*.06,-.08,0]} outline={false}><sphereGeometry args={[.11,12,10]}/></Part>
    <Part ghost={g} color={SKIN} position={[s*.08,-.22,0]} rotation={[0,0,s*.25]}><capsuleGeometry args={[.07,.16,4,10]}/></Part>
    <Part ghost={g} color={SKIN} position={[s*.12,-.36,.02]}><sphereGeometry args={[.1,14,10]}/></Part>
    {s>0&&seeker&&<group position={[.14,-.42,.08]} rotation={[.4,0,0]}>
     <Part ghost={g} color="#6b4a33" position={[0,-.08,0]}><cylinderGeometry args={[.025,.03,.2,8]}/></Part>
     <Part ghost={g} color="#d9a63b" position={[0,.08,.06]} rotation={[1.2,0,0]}><torusGeometry args={[.11,.025,8,20]}/></Part>
     <mesh position={[0,.08,.06]} rotation={[1.2,0,0]}><circleGeometry args={[.1,20]}/><meshBasicMaterial color="#bfe8ff" transparent opacity={.5} side={THREE.DoubleSide}/></mesh>
    </group>}
   </group>)}
   {/* ---------- legs ---------- */}
   {[-1,1].map(s=><group key={s} ref={s<0?legL:legR} position={[s*.13,.32,0]}>
    <Part ghost={g} color={girl?c.sock:SKIN} position={[0,-.1,0]}><capsuleGeometry args={[.075,.1,4,10]}/></Part>
    <Part ghost={g} color={c.shoe} position={[0,-.22,.05]} scale={[1,.75,1.35]}><sphereGeometry args={[.11,14,10]}/></Part>
    <Part ghost={g} color={c.sole} position={[0,-.27,.05]} outline={false}><boxGeometry args={[.19,.04,.29]}/></Part>
   </group>)}
  </group>
 </group>;
}
