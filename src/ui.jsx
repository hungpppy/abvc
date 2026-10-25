import {createRoot} from 'react-dom/client';
import {useSyncExternalStore,useEffect,useRef,useState} from 'react';

window.HS_REACT=true;
/* Dữ liệu do phần tính toán (calc) công bố ở window.HS rồi phát sự kiện "hs". */
const sub=cb=>{document.addEventListener('hs',cb);return()=>document.removeEventListener('hs',cb)};
const useHS=()=>useSyncExternalStore(sub,()=>window.HS||null);
const nf=new Intl.NumberFormat('vi-VN'),f=n=>nf.format(Math.round(n)),d=n=>f(n)+' đ';
const nv=(x,n=1)=>x.toLocaleString('vi-VN',{minimumFractionDigits:n,maximumFractionDigits:n});
const fk=n=>n>=10000?nv(n/1000)+'k':f(n);
const reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
const nice=m=>{const e=Math.pow(10,Math.floor(Math.log10(m)));for(const s of[1,1.2,1.5,2,2.5,3,4,5,6,8,10])if(s*e>=m)return s*e;return 10*e};
const money=v=>v>=1e9?nv(v/1e9)+' tỷ':nv(v/1e6,0)+' tr';

/* số chạy dần khi giá trị đổi */
function useCount(v,ms=700){
  const [x,setX]=useState(0),cur=useRef(0);
  useEffect(()=>{
    if(reduce||!isFinite(v)){cur.current=v;setX(v);return}
    const a=cur.current,t0=performance.now();let raf;
    const step=t=>{const p=Math.min(1,(t-t0)/ms),e=1-Math.pow(1-p,3);cur.current=a+(v-a)*e;setX(cur.current);if(p<1)raf=requestAnimationFrame(step)};
    raf=requestAnimationFrame(step);return()=>cancelAnimationFrame(raf);
  },[v]);
  return x;
}

function Kpi({ico,label,v,fmt,sub,tone,i}){
  const x=useCount(v);
  return <div className={'rk '+(tone||'')} style={{animationDelay:i*60+'ms'}}>
    <div className="rk-i" aria-hidden="true">{ico}</div>
    <div><small>{label}</small><strong>{fmt(x)}</strong>{sub&&<em>{sub}</em>}</div>
  </div>;
}
function Ring({pct,i}){
  const x=useCount(pct),r=26,c=2*Math.PI*r,p=Math.max(0,Math.min(100,x));
  return <div className="rk ring" style={{animationDelay:i*60+'ms'}}>
    <div><small>Đáp ứng nhu cầu</small><strong>{Math.round(p)}%</strong><em>điện tự dùng / nhu cầu</em></div>
    <svg width="64" height="64" viewBox="0 0 64 64" role="img" aria-label={'Đáp ứng '+Math.round(p)+'% nhu cầu'}>
      <defs><linearGradient id="rgd" x1="0" x2="1"><stop offset="0" stopColor="#f59e0b"/><stop offset="1" stopColor="#ea580c"/></linearGradient></defs>
      <circle cx="32" cy="32" r={r} fill="none" stroke="#e2e8f0" strokeWidth="7"/>
      <circle cx="32" cy="32" r={r} fill="none" stroke="url(#rgd)" strokeWidth="7" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c*(1-p/100)} transform="rotate(-90 32 32)"/>
    </svg>
  </div>;
}
function Kpis({s}){
  const free=s.net<=0;
  return <div className="rkg">
    <Kpi i={0} ico="⚡" label="Sản lượng / tháng" v={s.prod} fmt={x=>f(x)+' kWh'} sub={'≈ '+f(s.prod*12)+' kWh/năm'}/>
    <Kpi i={1} ico="💰" tone="hot" label="Tiết kiệm / tháng" v={s.save} fmt={d} sub={'≈ '+nv(s.save*12/1e6)+' triệu/năm'}/>
    <Kpi i={2} ico="🏗️" label="Tổng đầu tư" v={s.sum} fmt={d} sub={s.kv+' kWp'+(s.tbdN>0?' · chưa gồm '+s.tbdN+' mục thỏa thuận':'')}/>
    <Kpi i={3} ico="🧾" label={s.ppa?'Tiền cọc (PPA)':'Sau chiết khấu'} v={s.net} fmt={d} sub={s.disc>0?'Chiết khấu '+nv(s.disc)+'%':'Chưa chiết khấu'}/>
    {s.pb===null||free
      ? <div className="rk blue" style={{animationDelay:'240ms'}}><div className="rk-i">⏱️</div><div><small>Hoàn vốn</small><strong>{free?'Không cần vốn':'> 25 năm'}</strong><em>Có tính lạm phát giá điện</em></div></div>
      : <Kpi i={4} ico="⏱️" tone="blue" label="Hoàn vốn" v={s.pb} fmt={x=>nv(x)+' năm'} sub="Có tính lạm phát giá điện"/>}
    <Ring i={5} pct={s.cov}/>
  </div>;
}

/* biểu đồ cột sản lượng theo tháng */
function MonthChart({s}){
  const [h,setH]=useState(-1),[on,setOn]=useState(false);
  useEffect(()=>{const t=setTimeout(()=>setOn(true),40);return()=>clearTimeout(t)},[]);
  const mx=Math.max(...s.vals),mn=Math.min(...s.vals),tot=s.vals.reduce((a,b)=>a+b,0);
  const L=Math.min(88,Math.max(12,(h+.5)/12*100));
  return <div>
    <div className="chh"><b>Sản lượng điện theo tháng (kWh)</b><span className="note" style={{margin:0}}>{s.rg} (ước tính) · cả năm ≈ {f(tot)} kWh</span></div>
    <div className="cw">
      <div className="ya">{[4,3,2,1,0].map(i=><span key={i}>{fk(s.top*i/4)}</span>)}</div>
      <div className="plot"><div className="gl"/>
        <div className="bars" onMouseLeave={()=>setH(-1)}>
          {s.vals.map((v,i)=><div key={i} className={'bar'+(v===mx?' mx':v===mn?' mn':'')+(h===i?' hv':'')}
            style={{height:on?(v/s.top*100)+'%':'0%',transitionDelay:i*35+'ms'}}
            onMouseEnter={()=>setH(i)} onClick={()=>setH(h===i?-1:i)}><b>{fk(v)}</b><i>T{i+1}</i></div>)}
        </div>
        <div className="avg" style={{bottom:(s.prod/s.top*100)+'%'}}><span>TB {f(s.prod)}</span></div>
        {h>=0&&<div className="tipb" style={{left:L+'%'}}>T{h+1}: <b>{f(s.vals[h])} kWh</b> · {nv(s.vals[h]/tot*100)}% cả năm{s.ms?<> · tiết kiệm <b>{d(s.ms[h])}</b></>:null}</div>}
      </div>
    </div>
    <div className="note" style={{marginTop:28}}>Cả năm: <b>{f(tot)} kWh</b>{s.annual!=null?<> · tiết kiệm ròng <b>{d(s.annual)}</b> (= Năm 1 trong bảng giả lập)</>:null}. Cao nhất <b>T{s.vals.indexOf(mx)+1}</b>: {f(mx)} kWh · Thấp nhất <b>T{s.vals.indexOf(mn)+1}</b>: {f(mn)} kWh (bằng {Math.round(mn/mx*100)}% tháng cao nhất). Hình dạng theo mùa là ước tính theo vùng, có thể lệch so với PVGIS / Global Solar Atlas. Chạm hoặc rê chuột vào cột để xem chi tiết.</div>
  </div>;
}

/* biểu đồ hoàn vốn: tiền tiết kiệm lũy kế so với vốn bỏ ra */
function useW(){
  const ref=useRef(null),[w,setW]=useState(600);
  useEffect(()=>{const el=ref.current;if(!el)return;const set=()=>setW(el.clientWidth||600);set();
    if(!window.ResizeObserver)return;const ro=new ResizeObserver(set);ro.observe(el);return()=>ro.disconnect()},[]);
  return [ref,w];
}
function PayChart({s}){
  const [ref,w]=useW(),[hi,setHi]=useState(-1),n=s.ser.length,H=250,m={l:46,r:14,t:18,b:28};
  const iw=Math.max(200,w-m.l-m.r),ih=H-m.t-m.b,ymax=nice(Math.max(s.ser[n-1],s.net,1)*1.08);
  const X=y=>m.l+iw*y/n,Y=v=>m.t+ih*(1-v/ymax);
  const pts=[[0,0],...s.ser.map((v,i)=>[i+1,v])];
  const line=pts.map((p,i)=>(i?'L':'M')+X(p[0]).toFixed(1)+' '+Y(p[1]).toFixed(1)).join(' ');
  const area=line+` L${X(n).toFixed(1)} ${Y(0)} L${X(0)} ${Y(0)} Z`;
  const move=e=>{const r=e.currentTarget.getBoundingClientRect(),x=(e.clientX-r.left)-m.l,y=Math.round(x/iw*n);setHi(y<1||y>n?-1:y)};
  const showPb=s.pb!==null&&s.net>0&&s.pb<=n;
  return <div>
    <div className="chh"><b>Hoàn vốn & dòng tiền 25 năm</b><span className="note" style={{margin:0}}>Tiết kiệm lũy kế so với vốn bỏ ra</span></div>
    <div className="pbc" ref={ref}>
      <svg width={w} height={H} viewBox={`0 0 ${w} ${H}`} onPointerMove={move} onPointerLeave={()=>setHi(-1)} role="img" aria-label="Biểu đồ tiết kiệm lũy kế và vốn đầu tư">
        <defs><linearGradient id="pga" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f97316" stopOpacity=".45"/><stop offset="1" stopColor="#f97316" stopOpacity=".03"/></linearGradient></defs>
        {[0,1,2,3,4].map(i=>{const v=ymax*i/4;return <g key={i}><line x1={m.l} x2={w-m.r} y1={Y(v)} y2={Y(v)} stroke="#e5e9ee"/><text x={m.l-6} y={Y(v)+4} textAnchor="end" fontSize="11" fill="#64748b">{money(v)}</text></g>})}
        {[0,5,10,15,20,25].filter(y=>y<=n).map(y=><text key={y} x={X(y)} y={H-8} textAnchor={y===n?'end':'middle'} fontSize="11" fill="#64748b">{y?'Năm '+y:'0'}</text>)}
        <path d={area} fill="url(#pga)"/>
        <path d={line} fill="none" stroke="#ea580c" strokeWidth="2.5" strokeLinejoin="round"/>
        {s.net>0&&<><line x1={m.l} x2={w-m.r} y1={Y(s.net)} y2={Y(s.net)} stroke="#1e3a8a" strokeWidth="1.5" strokeDasharray="6 4"/><text x={w-m.r-4} y={Y(s.net)-6} textAnchor="end" fontSize="11" fontWeight="700" fill="#1e3a8a">Vốn bỏ ra {money(s.net)}</text></>}
        {showPb&&(()=>{const tx=Math.min(w-m.r-112,Math.max(m.l+6,X(s.pb)+10)),ty=Math.max(m.t+14,Y(s.net)-14);return <g><circle cx={X(s.pb)} cy={Y(s.net)} r="6" fill="#fff" stroke="#c2410c" strokeWidth="3"/><rect x={tx-4} y={ty-14} width="112" height="20" rx="6" fill="#fff" fillOpacity=".92" stroke="#fed7aa"/><text x={tx+2} y={ty} fontSize="12" fontWeight="700" fill="#c2410c">Hoàn vốn {nv(s.pb)} năm</text></g>})()}
        {hi>0&&<g><line x1={X(hi)} x2={X(hi)} y1={m.t} y2={Y(0)} stroke="#1e3a8a" strokeOpacity=".4"/><circle cx={X(hi)} cy={Y(s.ser[hi-1])} r="4.5" fill="#ea580c"/>
          <g transform={`translate(${Math.min(w-150,Math.max(m.l,X(hi)-70))},${m.t})`}><rect width="140" height="40" rx="8" fill="#1f2a44"/><text x="10" y="16" fontSize="11" fill="#cbd5e1">Năm {hi}</text><text x="10" y="32" fontSize="12.5" fontWeight="700" fill="#fff">Lũy kế {money(s.ser[hi-1])}</text></g></g>}
      </svg>
    </div>
    <div className="note">Đã tính lạm phát giá điện theo ô "Lạm phát" bên dưới. Rê chuột hoặc chạm vào biểu đồ để xem tiết kiệm lũy kế từng năm.</div>
  </div>;
}
function Charts({s}){
  const [tab,setTab]=useState('m');
  return <div>
    <div className="tabs" role="tablist">
      <button role="tab" aria-selected={tab==='m'} className={tab==='m'?'on':''} onClick={()=>setTab('m')}>📊 Sản lượng</button>
      <button role="tab" aria-selected={tab==='p'} className={tab==='p'?'on':''} onClick={()=>setTab('p')}>📈 Hoàn vốn</button>
    </div>
    <div className={'cm'+(tab==='m'?'':' off')}><MonthChart s={s}/></div>
    <div className={'cp np'+(tab==='p'?'':' off')}><PayChart s={s}/></div>
  </div>;
}

const ICON={good:'✨',warn:'⚠️',info:'💡'};
function Tips({s}){
  return <ul className="rtips">{s.tips.map((t,i)=><li key={i} className={t.k} style={{animationDelay:i*50+'ms'}}><span aria-hidden="true">{ICON[t.k]}</span><div dangerouslySetInnerHTML={{__html:t.t}}/></li>)}</ul>;
}
function A(){const s=useHS();if(!s)return null;return <><Kpis s={s}/><div className="note" style={{margin:'2px 0 12px',fontSize:12.5}} dangerouslySetInnerHTML={{__html:s.sumline}}/><Charts s={s}/></>}
function B(){const s=useHS();if(!s)return null;return <Tips s={s}/>}
const mount=(id,C)=>{const el=document.getElementById(id);if(el)createRoot(el).render(<C/>)};
mount('rx',A);mount('rtips',B);
