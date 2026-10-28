import { useEffect, useState } from 'react';
import { motion, AnimatePresence, animate, useMotionValue } from 'framer-motion';
import { api, err } from './api'; import { useApp } from './ctx';
 
// Two circles orbit in opposite directions and line up: "in sync".
export const Rings = ({ small }) => (
  <svg viewBox="0 0 120 120" className={small ? 'rings s' : 'rings'} aria-hidden="true">
    {[1, -1].map(d => <motion.circle key={d} cx={60 + 14 * d} cy="60" r="34" style={{ transformOrigin: '60px 60px' }}
      animate={{ rotate: 360 * d }} transition={{ repeat: Infinity, duration: 16, ease: 'linear' }} />)}
  </svg>
);
const Count = ({ to }) => {
  const v = useMotionValue(0), [n, setN] = useState(0);
  useEffect(() => { const c = animate(v, to, { duration: 1.1, ease: 'easeOut', onUpdate: x => setN(Math.round(x)) }); return c.stop; }, [to]);
  return n;
};
const fmt = d => new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
const Page = ({ title, sub, children }) => (
  <motion.section initial={{ opacity: 0, y: 14, filter: 'blur(10px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ duration: 0.7, ease: [0.2, 0.7, 0.2, 1] }}>
    <h1>{title}</h1>{sub && <p className="sub">{sub}</p>}{children}
  </motion.section>
);
 
 
const hash = s => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 997, 7);
export const Av = ({ name = '?', size = 40 }) => (
  <span className="av" style={{ width: size, height: size, fontSize: size / 2.6 }}>{name[0]}
    <img src={`https://i.pravatar.cc/${size * 3}?img=${(hash(name) % 70) + 1}`} alt="" loading="lazy" onError={e => (e.currentTarget.style.display = 'none')} />
  </span>
);
const crew = ['Ela Park', 'Dev Nair', 'Sara Cole', 'Marcus Lee', 'Hana Rao'];
function Collage() {
  const [t, setT] = useState({ x: 0, y: 0 }), [ok, setOk] = useState(false), C = 2 * Math.PI * 26;
  useEffect(() => { const i = setInterval(() => setOk(o => !o), 2600); return () => clearInterval(i); }, []);
  return (
    <div className="collage" onMouseMove={e => { const r = e.currentTarget.getBoundingClientRect(); setT({ x: (e.clientX - r.left) / r.width - 0.5, y: (e.clientY - r.top) / r.height - 0.5 }); }} onMouseLeave={() => setT({ x: 0, y: 0 })}>
      <motion.div className="stage" animate={{ rotateY: t.x * 16, rotateX: -t.y * 12 }} transition={{ type: 'spring', stiffness: 60, damping: 14 }}>
        <div className="mini c1"><small>In today</small><div className="stack">{crew.map(n => <Av key={n} name={n} size={36} />)}</div><div className="who2"><i className="live" /> 5 checked in</div></div>
        <div className="mini c2"><div className="who"><Av name="Ela Park" size={38} /><div><b>Ela Park</b><small>Annual · 3 days</small></div></div>
          <div className="who2"><span className={'tag ' + (ok ? 'approved' : 'pending')}>{ok ? 'approved' : 'pending'}</span></div></div>
        <div className="mini c3"><svg viewBox="0 0 64 64" width="56"><circle cx="32" cy="32" r="26" className="track" style={{ strokeWidth: 6 }} />
          <motion.circle cx="32" cy="32" r="26" className="prog" style={{ strokeWidth: 6 }} strokeDasharray={C} transform="rotate(-90 32 32)" animate={{ strokeDashoffset: [C, C * 0.3, C * 0.3, C] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }} /></svg>
          <div><b>6h 12m</b><small>worked today</small></div></div>
      </motion.div>
    </div>
  );
}
 
export function Login() {
  const { login, say } = useApp(); const [mode, setMode] = useState('login'), [f, setF] = useState({ email: '', password: '', name: '' });
  const set = k => e => setF({ ...f, [k]: e.target.value });
  const go = async e => {
    e.preventDefault();
    try { login((await api.post('/auth/' + mode, f)).data); } catch (x) { say(err(x), 1); }
  };
  return (
    <div className="login">
      <div className="hero"><h1>Everyone <em>in sync.</em></h1><p>Attendance, leave and company news in one calm place.</p><Collage /></div>
      <motion.form onSubmit={go} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}>
        <h2>{mode === 'login' ? 'Sign in' : 'Create your account'}</h2>
        {mode === 'register' && <label>Full name<input value={f.name} onChange={set('name')} required /></label>}
        <label>Email<input type="email" value={f.email} onChange={set('email')} required /></label>
        <label>Password<input type="password" value={f.password} onChange={set('password')} required minLength={6} /></label>
        <button className="btn">{mode === 'login' ? 'Sign in' : 'Create account'}</button>
        <button type="button" className="link" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? 'New here? Create an account' : 'Have an account? Sign in'}</button>
      </motion.form>
    </div>
  );
}
 
export function Dashboard() {
  const { user, say } = useApp(); const [att, setAtt] = useState(null), [stats, setStats] = useState(null), [news, setNews] = useState([]), [now, setNow] = useState(Date.now());
  useEffect(() => {
    api.get('/attendance/today').then(r => setAtt(r.data)); api.get('/announcements').then(r => setNews(r.data));
    if (user.role !== 'employee') api.get('/stats').then(r => setStats(r.data));
    const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i);
  }, []);
  const act = async p => { try { setAtt((await api.post('/attendance/' + p)).data); say(p === 'check-in' ? 'Checked in. Have a good day.' : 'Checked out. See you tomorrow.'); } catch (e) { say(err(e), 1); } };
  const start = att?.checkIn && +new Date(att.checkIn), end = att?.checkOut ? +new Date(att.checkOut) : now;
  const ms = start ? Math.max(end - start, 0) : 0, pct = Math.min(ms / 288e5, 1), C = 2 * Math.PI * 70;
  const h = new Date().getHours(), clock = `${Math.floor(ms / 36e5)}:${String(Math.floor(ms / 6e4) % 60).padStart(2, '0')}`;
  return (
    <Page title={`Good ${h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening'}, ${user.name.split(' ')[0]}`} sub={`${user.leaveBalance} annual leave days left`}>
      <div className="grid">
        <div className="card clock">
          <svg viewBox="0 0 170 170"><circle cx="85" cy="85" r="70" className="track" />
            <motion.circle cx="85" cy="85" r="70" className="prog" strokeDasharray={C} animate={{ strokeDashoffset: C * (1 - pct) }} transition={{ duration: 0.8 }} transform="rotate(-90 85 85)" /></svg>
          <div className="ctr"><b>{clock}</b><small>of 8h</small></div>
          {!att?.checkIn ? <button className="btn" onClick={() => act('check-in')}>Check in</button>
            : !att.checkOut ? <button className="btn alt" onClick={() => act('check-out')}>Check out</button> : <button className="btn" disabled>Done for today</button>}
        </div>
        {stats && <div className="card stats">
          {[['People', stats.total], ['In today', stats.present], ['Leave to review', stats.pending]].map(([l, n]) => <div key={l}><b><Count to={n} /></b><small>{l}</small></div>)}
          <div className="bars">{stats.byDept.map(d => <div key={d._id}><span>{d._id}</span><motion.i initial={{ width: 0 }} animate={{ width: `${(d.count / stats.total) * 100}%` }} transition={{ duration: 0.9 }} /><em>{d.count}</em></div>)}</div>
        </div>}
        <div className="card"><h3>Latest news</h3>{news.slice(0, 3).map(n => <div key={n._id} className="item"><b>{n.title}</b><p>{n.body}</p></div>)}{!news.length && <p className="empty">No announcements yet.</p>}</div>
      </div>
    </Page>
  );
}
 
export function Leaves() {
  const { user, say } = useApp(); const [list, setList] = useState([]), [f, setF] = useState({ type: 'annual', from: '', to: '', reason: '' });
  const load = () => api.get('/leaves').then(r => setList(r.data)); useEffect(() => { load(); }, []);
  const set = k => e => setF({ ...f, [k]: e.target.value });
  const apply = async e => { e.preventDefault(); try { await api.post('/leaves', f); say('Leave request sent.'); setF({ ...f, from: '', to: '', reason: '' }); load(); } catch (x) { say(err(x), 1); } };
  const review = async (id, status) => { try { await api.patch('/leaves/' + id, { status }); say(status === 'approved' ? 'Approved.' : 'Rejected.'); load(); } catch (x) { say(err(x), 1); } };
  return (
    <Page title="Leave" sub="Weekends are skipped automatically.">
      <form className="card row" onSubmit={apply}>
        <select value={f.type} onChange={set('type')}><option value="annual">Annual</option><option value="sick">Sick</option><option value="personal">Personal</option></select>
        <input type="date" value={f.from} onChange={set('from')} required /><input type="date" value={f.to} onChange={set('to')} required />
        <input placeholder="Reason" value={f.reason} onChange={set('reason')} /><button className="btn">Request leave</button>
      </form>
      <div className="list"><AnimatePresence initial={false}>{list.map(l => (
        <motion.div layout key={l._id} className="card line" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
          <div className="who"><Av name={l.user?.name || '?'} /><div><b>{l.user?.name}</b><small>{l.type} · {fmt(l.from)} to {fmt(l.to)} · {l.days} days</small></div></div>
          <span className={'tag ' + l.status}>{l.status}</span>
          {l.status === 'pending' && user.role !== 'employee' && String(l.user?._id) !== String(user._id) && <div><button className="btn sm" onClick={() => review(l._id, 'approved')}>Approve</button><button className="btn sm ghost" onClick={() => review(l._id, 'rejected')}>Reject</button></div>}
        </motion.div>))}</AnimatePresence>{!list.length && <p className="empty">No leave requests yet. Pick dates above to make one.</p>}</div>
    </Page>
  );
}
 
export function People() {
  const { user, say } = useApp(); const [q, setQ] = useState(''), [list, setList] = useState([]), [open, setOpen] = useState(false), [f, setF] = useState({ name: '', email: '', department: '', title: '', role: 'employee', manager: '' });
  const load = () => api.get('/employees', { params: { q } }).then(r => setList(r.data)); useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [q]);
  const set = k => e => setF({ ...f, [k]: e.target.value });
  const add = async e => { e.preventDefault(); try { await api.post('/employees', f); say('Employee added. Temporary password is Welcome@123.'); setOpen(false); load(); } catch (x) { say(err(x), 1); } };
  return (
    <Page title="People" sub={`${list.length} shown`}>
      <div className="row"><input placeholder="Search by name" value={q} onChange={e => setQ(e.target.value)} />{user.role === 'hr' && <button className="btn" onClick={() => setOpen(!open)}>{open ? 'Close' : 'Add employee'}</button>}</div>
      <AnimatePresence>{open && <motion.form className="card row wrap" onSubmit={add} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
        {['name', 'email', 'department', 'title'].map(k => <input key={k} placeholder={k} value={f[k]} onChange={set(k)} required={k === 'name' || k === 'email'} />)}
        <select value={f.role} onChange={set('role')}><option>employee</option><option>manager</option><option>hr</option></select>
        <select value={f.manager} onChange={set('manager')}><option value="">No manager</option>{list.filter(p => p.role === 'manager').map(p => <option key={p._id} value={p._id}>{p.name}</option>)}</select>
        <button className="btn">Save</button></motion.form>}</AnimatePresence>
      <div className="list">{list.map((p, i) => <motion.div key={p._id} className="card line" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.03 }}>
        <div className="who"><Av name={p.name} /><div><b>{p.name}</b><small>{p.title || p.role} · {p.department || 'Unassigned'}</small></div></div><span className="tag">{p.role}</span></motion.div>)}</div>
    </Page>
  );
}
 
export function News() {
  const { user, say } = useApp(); const [list, setList] = useState([]), [f, setF] = useState({ title: '', body: '' });
  const load = () => api.get('/announcements').then(r => setList(r.data)); useEffect(() => { load(); }, []);
  const post = async e => { e.preventDefault(); try { await api.post('/announcements', f); setF({ title: '', body: '' }); say('Announcement posted.'); load(); } catch (x) { say(err(x), 1); } };
  return (
    <Page title="News">
      {user.role === 'hr' && <form className="card row wrap" onSubmit={post}><input placeholder="Title" value={f.title} onChange={e => setF({ ...f, title: e.target.value })} required /><input placeholder="What should everyone know?" value={f.body} onChange={e => setF({ ...f, body: e.target.value })} required /><button className="btn">Post announcement</button></form>}
      <div className="list">{list.map(n => <div key={n._id} className="card"><b>{n.title}</b><p>{n.body}</p><small>{n.author?.name} · {fmt(n.createdAt)}</small></div>)}{!list.length && <p className="empty">Nothing posted yet.</p>}</div>
    </Page>
  );
}