import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Plus, X, Trash2, 
  StickyNote, Pin, AlertTriangle, Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { DangerModal } from '../components/DangerModal';

interface Note {
  id: string;
  text: string;
  color: string;
  pinned: boolean;
  priority: string;
  created_at?: string;
}

const API = 'http://localhost:3001/api/notes';
const headers = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${sessionStorage.getItem('msa_token')}`
});

const COLORS: { key: string; bg: string; border: string; dot: string }[] = [
  { key: 'yellow', bg: 'bg-amber-50', border: 'border-amber-200', dot: 'bg-amber-400' },
  { key: 'blue',   bg: 'bg-sky-50',   border: 'border-sky-200',   dot: 'bg-sky-400' },
  { key: 'green',  bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-400' },
  { key: 'rose',   bg: 'bg-rose-50',  border: 'border-rose-200',  dot: 'bg-rose-400' },
  { key: 'slate',  bg: 'bg-slate-50', border: 'border-slate-200', dot: 'bg-slate-400' },
];

const getColor = (c: string) => COLORS.find(x => x.key === c) || COLORS[0];

export const Notas = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [showClear, setShowClear] = useState(false);
  const busy = useRef(false);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // ── Fetch ──
  const load = useCallback(async () => {
    try {
      const r = await fetch(API, { headers: headers() });
      if (r.ok) {
        const d = await r.json();
        setNotes(d.map((n: any) => ({
          id: n.id, text: n.text || '', color: n.color || 'yellow',
          pinned: !!n.pinned, priority: n.priority || 'normal', created_at: n.created_at
        })));
      }
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Create ──
  const add = async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const r = await fetch(API, {
        method: 'POST', headers: headers(),
        body: JSON.stringify({ text: '', color: 'yellow', pinned: false, priority: 'normal' })
      });
      if (r.ok || r.status === 201) {
        const n = await r.json();
        setNotes(prev => [{ id: n.id, text: '', color: n.color || 'yellow', pinned: false, priority: 'normal', created_at: n.created_at }, ...prev]);
      } else toast.error('Error al crear');
    } catch { toast.error('Sin conexión'); }
    setTimeout(() => { busy.current = false; }, 400);
  };

  // ── Update (debounced) ──
  const update = (id: string, field: string, value: any) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, [field]: value } : n));
    if (timers.current[id]) clearTimeout(timers.current[id]);
    timers.current[id] = setTimeout(async () => {
      try { await fetch(`${API}/${id}`, { method: 'PUT', headers: headers(), body: JSON.stringify({ [field]: value }) }); }
      catch { /* silent */ }
    }, 600);
  };

  // ── Pin ──
  const pin = async (id: string) => {
    const n = notes.find(x => x.id === id);
    if (!n) return;
    const v = !n.pinned;
    setNotes(prev => {
      const up = prev.map(x => x.id === id ? { ...x, pinned: v } : x);
      return [...up.filter(x => x.pinned), ...up.filter(x => !x.pinned)];
    });
    try { await fetch(`${API}/${id}`, { method: 'PUT', headers: headers(), body: JSON.stringify({ pinned: v }) }); }
    catch { /* silent */ }
  };

  // ── Urgent ──
  const urgent = (id: string) => {
    const n = notes.find(x => x.id === id);
    if (!n) return;
    update(id, 'priority', n.priority === 'urgent' ? 'normal' : 'urgent');
  };

  // ── Delete ──
  const del = async (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    try { await fetch(`${API}/${id}`, { method: 'DELETE', headers: headers() }); }
    catch { /* silent */ }
  };

  // ── Clear all ──
  const clearAll = async () => {
    try { await fetch(API, { method: 'DELETE', headers: headers() }); setNotes([]); toast.success('Tablero limpio'); }
    catch { toast.error('Error'); }
    setShowClear(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <Loader2 size={40} className="animate-spin text-amber-400" />
    </div>
  );

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto pb-32 animate-in fade-in duration-300">
      
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-amber-200/50 rotate-3">
            <StickyNote size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">Notas</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-0.5">{notes.length} nota{notes.length !== 1 ? 's' : ''} • Base de datos</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {notes.length > 0 && (
            <button onClick={() => setShowClear(true)} className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all">
              <Trash2 size={14} />
            </button>
          )}
          <button onClick={add} className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl font-black text-[11px] uppercase tracking-wider shadow-lg hover:bg-slate-800 active:scale-95 transition-all">
            <Plus size={16} strokeWidth={3} /> Nueva
          </button>
        </div>
      </div>

      {/* ── Grid ── */}
      {notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mb-6">
            <StickyNote size={36} className="text-slate-300" />
          </div>
          <h3 className="text-lg font-black text-slate-300 uppercase tracking-widest mb-2">Sin notas</h3>
          <p className="text-sm text-slate-300 mb-6">Anota recordatorios, medidas o pendientes del taller.</p>
          <button onClick={add} className="px-6 py-3 border-2 border-dashed border-slate-300 text-slate-400 rounded-xl text-xs font-black uppercase tracking-widest hover:border-amber-400 hover:text-amber-500 transition-all active:scale-95">
            + Agregar nota
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {notes.map(note => {
            const c = getColor(note.color);
            const isUrgent = note.priority === 'urgent';
            return (
              <div 
                key={note.id}
                className={`group relative flex flex-col rounded-2xl border-2 ${c.bg} ${c.border} p-4 min-h-[200px] transition-all duration-200 hover:shadow-xl hover:-translate-y-1 ${isUrgent ? 'ring-2 ring-rose-400/60 ring-offset-1' : ''}`}
              >
                {/* Top bar */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    {note.pinned && (
                      <span className="text-[9px] font-black text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-md uppercase">📌</span>
                    )}
                    {isUrgent && (
                      <span className="text-[9px] font-black text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded-md uppercase animate-pulse">⚡</span>
                    )}
                    <span className="text-[9px] font-mono text-slate-400/70 font-bold">
                      {note.created_at ? new Date(note.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }) : ''}
                    </span>
                  </div>

                  {/* Actions — visible on hover */}
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => pin(note.id)} className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs transition-all ${note.pinned ? 'bg-amber-200 text-amber-700' : 'hover:bg-white/80 text-slate-400'}`} title="Fijar">
                      <Pin size={11} />
                    </button>
                    <button onClick={() => urgent(note.id)} className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs transition-all ${isUrgent ? 'bg-rose-200 text-rose-700' : 'hover:bg-white/80 text-slate-400'}`} title="Urgente">
                      <AlertTriangle size={11} />
                    </button>
                    <button onClick={() => del(note.id)} className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-white/80 transition-all" title="Eliminar">
                      <X size={11} />
                    </button>
                  </div>
                </div>

                {/* Text area */}
                <textarea 
                  value={note.text}
                  onChange={e => update(note.id, 'text', e.target.value)}
                  className="flex-1 bg-transparent text-slate-800 font-semibold text-sm leading-relaxed outline-none resize-none placeholder:text-slate-300/80 placeholder:italic"
                  placeholder="Escribe aquí..."
                />

                {/* Color picker */}
                <div className="flex items-center gap-1.5 pt-3 border-t border-black/5 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {COLORS.map(cl => (
                    <button 
                      key={cl.key}
                      onClick={() => update(note.id, 'color', cl.key)}
                      className={`w-4.5 h-4.5 rounded-full ${cl.dot} transition-all hover:scale-125 ${note.color === cl.key ? 'ring-2 ring-offset-1 ring-slate-400 scale-110' : ''}`}
                      style={{ width: 18, height: 18 }}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {/* Add card */}
          <button 
            onClick={add}
            className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 min-h-[200px] text-slate-300 hover:text-amber-500 hover:border-amber-300 transition-all group/add active:scale-95"
          >
            <Plus size={28} strokeWidth={2.5} className="mb-1 group-hover/add:scale-110 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest">Nueva</span>
          </button>
        </div>
      )}

      <DangerModal
        isOpen={showClear}
        onClose={() => setShowClear(false)}
        onConfirm={clearAll}
        title="Vaciar Tablero"
        message='Se eliminarán TODAS las notas. Escribe "BORRAR" para confirmar.'
        requireText={true}
        confirmText="BORRAR"
      />
    </div>
  );
};
