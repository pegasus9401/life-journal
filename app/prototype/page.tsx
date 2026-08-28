"use client";

import { useMemo, useState } from "react";

const days = Array.from({ length: 31 }, (_, i) => i + 1);
const tabs = ["Home", "Timeline", "Progress", "AI"] as const;

export default function PrototypePage() {
  const [day, setDay] = useState(28);
  const [tab, setTab] = useState<(typeof tabs)[number]>("Home");
  const [calendar, setCalendar] = useState(false);
  const [quick, setQuick] = useState(false);
  const label = useMemo(() => `${day} August`, [day]);

  return <main style={{minHeight:"100dvh",background:"#f5f5f7",color:"#17171a",fontFamily:"var(--font-manrope),sans-serif",paddingBottom:105}}>
    <div style={{maxWidth:520,margin:"0 auto",padding:"max(22px, env(safe-area-inset-top)) 18px 30px"}}>
      <header style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:22}}>
        <div><div style={{fontSize:12,color:"#8a8a92",fontWeight:700,letterSpacing:1.2}}>PEGASOS</div><div style={{fontSize:28,fontWeight:800,letterSpacing:-1}}>Your day</div></div>
        <button onClick={()=>setCalendar(true)} style={circle}>◫</button>
      </header>

      <section style={{...card,padding:10,display:"grid",gridTemplateColumns:"48px 1fr 48px",alignItems:"center",marginBottom:18}}>
        <button style={ghost} onClick={()=>setDay(Math.max(1,day-1))}>‹</button>
        <button style={{...ghost,padding:8}} onClick={()=>setCalendar(true)}><div style={{fontSize:12,color:"#888891"}}>Friday</div><strong style={{fontSize:17}}>{label}</strong></button>
        <button style={ghost} onClick={()=>setDay(Math.min(31,day+1))}>›</button>
      </section>

      {tab === "Home" && <>
        <section style={{...card,background:"linear-gradient(145deg,#fff,#f0ecff)",marginBottom:14}}><div style={eyebrow}>DAILY STATUS</div><div style={{display:"flex",justifyContent:"space-between",alignItems:"end"}}><div><strong style={{fontSize:30}}>82</strong><span style={{color:"#777780"}}> / 100</span><div style={{fontSize:14,color:"#777780",marginTop:4}}>Ready for a productive day</div></div><div style={{fontSize:34}}>✦</div></div></section>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}><section style={card}><div style={eyebrow}>NUTRITION</div><strong style={{fontSize:22}}>1,240</strong><div style={muted}>of 1,800 kcal</div><div style={bar}><i style={{...fill,width:"69%"}}/></div></section><section style={card}><div style={eyebrow}>ACTIVITY</div><strong style={{fontSize:22}}>Workout</strong><div style={muted}>Full body · 60 min</div><button style={pill}>Start</button></section></div>
        <section style={card}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={eyebrow}>NEXT</div><strong>13:00 · Lunch</strong></div><span style={{fontSize:24}}>›</span></div></section>
      </>}

      {tab === "Timeline" && <section style={card}><div style={eyebrow}>TIMELINE · {label.toUpperCase()}</div>{[["08:30","Breakfast","520 kcal"],["10:15","Journal","Morning note"],["13:00","Lunch","Planned"],["18:30","Workout","Full body"]].map(x=><div key={x[0]} style={{display:"grid",gridTemplateColumns:"58px 1fr",gap:12,padding:"16px 0",borderBottom:"1px solid #eee"}}><span style={muted}>{x[0]}</span><div><strong>{x[1]}</strong><div style={muted}>{x[2]}</div></div></div>)}</section>}
      {tab === "Progress" && <section style={card}><div style={eyebrow}>PROGRESS</div><strong style={{fontSize:28}}>This week</strong><div style={{height:150,display:"flex",alignItems:"end",gap:10,paddingTop:20}}>{[42,58,50,72,64,83,76].map((h,i)=><i key={i} style={{height:h+"%",flex:1,borderRadius:10,background:"#d9d0ff"}}/>)}</div></section>}
      {tab === "AI" && <section style={{...card,textAlign:"center",padding:"44px 22px"}}><div style={{fontSize:48}}>✦</div><h2 style={{margin:"8px 0"}}>PegasOS Intelligence</h2><p style={{...muted,lineHeight:1.5}}>Ask about your day, meals, workouts or plans.</p><button style={{...pill,padding:"12px 18px"}}>Start conversation</button></section>}
    </div>

    <nav style={{position:"fixed",left:"50%",bottom:"max(12px, env(safe-area-inset-bottom))",transform:"translateX(-50%)",width:"min(94%,500px)",height:72,background:"rgba(255,255,255,.92)",backdropFilter:"blur(20px)",border:"1px solid rgba(0,0,0,.06)",boxShadow:"0 12px 40px rgba(0,0,0,.12)",borderRadius:25,display:"grid",gridTemplateColumns:"1fr 1fr 64px 1fr 1fr",alignItems:"center",padding:"0 8px",zIndex:20}}>
      <Nav name="Home" active={tab} set={setTab}/><Nav name="Timeline" active={tab} set={setTab}/><button onClick={()=>setQuick(true)} style={{width:54,height:54,border:0,borderRadius:18,background:"#17171a",color:"white",fontSize:28,margin:"0 auto"}}>+</button><Nav name="Progress" active={tab} set={setTab}/><Nav name="AI" active={tab} set={setTab}/>
    </nav>

    {calendar && <div onClick={()=>setCalendar(false)} style={overlay}><div onClick={e=>e.stopPropagation()} style={sheet}><div style={{width:42,height:5,background:"#ddd",borderRadius:9,margin:"0 auto 18px"}}/><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}><button style={ghost}>‹</button><strong style={{fontSize:20}}>August 2026</strong><button style={ghost}>›</button></div><div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:6}}>{["M","T","W","T","F","S","S"].map((x,i)=><div key={i} style={{textAlign:"center",fontSize:11,color:"#999",padding:5}}>{x}</div>)}{[0,0,0,0,0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31].map((d,i)=><button key={i} disabled={!d} onClick={()=>{if(d){setDay(d);setCalendar(false)}}} style={{border:0,aspectRatio:"1",borderRadius:15,background:d===day?"#17171a":"transparent",color:d===day?"white":"#222",fontWeight:700}}>{d||""}</button>)}</div><div style={{marginTop:18,padding:16,background:"#f6f6f8",borderRadius:18}}><strong>{label}</strong><div style={{...muted,marginTop:4}}>Tap a date to open it on Home.</div></div></div></div>}
    {quick && <div onClick={()=>setQuick(false)} style={overlay}><div onClick={e=>e.stopPropagation()} style={sheet}><h2 style={{marginTop:0}}>Quick Add</h2>{["Meal","Workout","Journal entry","Task","Photo"].map(x=><button key={x} onClick={()=>setQuick(false)} style={{width:"100%",padding:16,margin:"5px 0",border:0,borderRadius:16,background:"#f4f4f6",fontWeight:700,textAlign:"left"}}>{x}<span style={{float:"right"}}>+</span></button>)}</div></div>}
  </main>;
}

function Nav({name,active,set}:{name:(typeof tabs)[number],active:string,set:(v:(typeof tabs)[number])=>void}){return <button onClick={()=>set(name)} style={{border:0,background:"transparent",fontSize:11,fontWeight:active===name?800:600,color:active===name?"#17171a":"#9a9aa1",padding:10}}><div style={{fontSize:19,marginBottom:3}}>{name==="Home"?"⌂":name==="Timeline"?"≡":name==="Progress"?"⌁":"✦"}</div>{name}</button>}
const card:React.CSSProperties={background:"#fff",border:"1px solid rgba(0,0,0,.045)",boxShadow:"0 8px 30px rgba(25,25,30,.055)",borderRadius:24,padding:20};
const circle:React.CSSProperties={width:44,height:44,borderRadius:15,border:"1px solid #e8e8eb",background:"white",fontSize:20};
const ghost:React.CSSProperties={border:0,background:"transparent",fontSize:24,color:"#252529"};
const eyebrow:React.CSSProperties={fontSize:10,fontWeight:800,letterSpacing:1.1,color:"#92929a",marginBottom:9};
const muted:React.CSSProperties={fontSize:12,color:"#8b8b94",marginTop:4};
const pill:React.CSSProperties={border:0,borderRadius:12,background:"#eeeafd",padding:"8px 12px",fontWeight:800,marginTop:12};
const bar:React.CSSProperties={height:7,background:"#eeeef1",borderRadius:10,overflow:"hidden",marginTop:14};
const fill:React.CSSProperties={display:"block",height:"100%",background:"#9b8be8",borderRadius:10};
const overlay:React.CSSProperties={position:"fixed",inset:0,background:"rgba(20,20,24,.28)",backdropFilter:"blur(8px)",zIndex:50,display:"flex",alignItems:"end",justifyContent:"center"};
const sheet:React.CSSProperties={width:"min(100%,520px)",background:"#fff",borderRadius:"30px 30px 0 0",padding:"14px 20px max(28px, env(safe-area-inset-bottom))",boxShadow:"0 -15px 50px rgba(0,0,0,.15)"};
