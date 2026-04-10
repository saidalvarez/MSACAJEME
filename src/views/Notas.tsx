import { useState, useEffect } from 'react';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { 
  Plus, X, Trash, 
  StickyNote, Search, Calendar, ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Note {
  id: string;
  text: string;
  color: 'yellow' | 'blue' | 'green' | 'rose' | 'slate';
  date: string;
}

export const Notas = () => {
  const [parent] = useAutoAnimate();
  const [searchTerm, setSearchTerm] = useState('');

  // --- MECANICO: NOTAS DINÁMICAS ---
  const [notes, setNotes] = useState<Note[]>(() => {
    const saved = localStorage.getItem('msa_mechanic_notes_v2');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('msa_mechanic_notes_v2', JSON.stringify(notes));
  }, [notes]);

  const addNote = () => {
    const newNote: Note = {
      id: crypto.randomUUID(),
      text: '',
      color: 'yellow',
      date: new Date().toLocaleString('es-MX', { 
        day: '2-digit', month: 'short', year: 'numeric', 
        hour: '2-digit', minute: '2-digit' 
      })
    };
    setNotes([newNote, ...notes]);
  };

  const updateNote = (id: string, text: string) => {
    setNotes(notes.map(n => n.id === id ? { ...n, text } : n));
  };

  const changeNoteColor = (id: string, color: Note['color']) => {
    setNotes(notes.map(n => n.id === id ? { ...n, color } : n));
  };

  const deleteNote = (id: string) => {
    setNotes(notes.filter(n => n.id !== id));
  };

  const clearAllNotes = () => {
    if(window.confirm('¿Borrar todas las notas permanentemente?')) {
      setNotes([]);
      toast.success('Tablero limpiado');
    }
  };

  const filteredNotes = notes.filter(n => 
    n.text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-500 pb-32">
      
      {/* Header Premium */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-amber-200 rotate-3">
            <StickyNote size={30} fill="rgba(255,255,255,0.2)" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
               <h1 className="text-3xl font-black text-slate-900 tracking-tight">Tablero de Notas</h1>
               <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-black uppercase rounded-full border border-slate-200">Local</span>
            </div>
            <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">Taller MSA versión 1.0</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-amber-500 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Buscar nota..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 pr-6 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-bold shadow-sm focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all outline-none w-64 md:w-80"
            />
          </div>
          <button 
            onClick={addNote}
            className="flex items-center gap-2 px-6 py-3.5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-slate-800 active:scale-95 transition-all"
          >
            <Plus size={20} /> Nueva Nota
          </button>
        </div>
      </header>

      {/* Grid de Corcho Moderno */}
      <div className="relative">
        <div className="flex items-center justify-between mb-8 px-2">
           <div className="flex items-center gap-4 text-xs font-black text-slate-400 uppercase tracking-widest">
              <Calendar size={14} /> Total: {notes.length} notas activas
           </div>
           {notes.length > 0 && (
              <button 
                onClick={clearAllNotes}
                className="text-xs font-black text-rose-500 hover:text-rose-600 uppercase tracking-widest flex items-center gap-2 px-3 py-1.5 hover:bg-rose-50 rounded-lg transition-all"
              >
                <Trash size={14} /> Limpiar Tablero
              </button>
           )}
        </div>

        {filteredNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 bg-slate-50 rounded-[40px] border-4 border-dashed border-slate-200 text-slate-400">
             <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mb-6 shadow-sm border border-slate-100 animate-pulse">
                <StickyNote size={48} className="text-slate-200" />
             </div>
             <h3 className="text-xl font-black text-slate-300 uppercase tracking-widest mb-2">
                {searchTerm ? 'No se encontraron notas' : 'Tablero Vacío'}
             </h3>
             <p className="text-sm font-bold text-slate-300 mb-8 italic text-center max-w-xs leading-relaxed">
                {searchTerm ? 'Intenta otra búsqueda o limpia el filtro.' : 'Empieza anotando recordatorios, medidas o pendientes del taller.'}
             </p>
             {!searchTerm && (
                <button 
                  onClick={addNote} 
                  className="px-8 py-3 bg-white border-2 border-slate-200 text-slate-400 rounded-2xl text-xs font-black uppercase tracking-widest hover:border-amber-400 hover:text-amber-500 transition-all active:scale-95"
                >
                  Agregar nota ahora
                </button>
             )}
          </div>
        ) : (
          <div ref={parent} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
             {filteredNotes.map(note => (
               <div 
                 key={note.id} 
                 className={`group border-2 p-6 rounded-[32px] transition-all duration-300 shadow-sm hover:shadow-2xl hover:-translate-y-2 relative flex flex-col min-h-[280px] ${
                    note.color === 'yellow' ? 'bg-[#fffbeb] border-amber-100 hover:border-amber-300' :
                    note.color === 'blue' ? 'bg-[#f0f9ff] border-blue-100 hover:border-blue-300' :
                    note.color === 'green' ? 'bg-[#f0fdf4] border-emerald-100 hover:border-emerald-300' :
                    note.color === 'rose' ? 'bg-[#fff1f2] border-rose-100 hover:border-rose-300' :
                    'bg-[#f8fafc] border-slate-100 hover:border-slate-300'
                 }`}
               >
                 {/* Chincheta visual */}
                 <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-300 rounded-full shadow-inner opacity-40" />

                 <div className="flex justify-between items-center mb-6">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400/60 font-mono">
                      {note.date}
                    </span>
                    <button 
                      onClick={() => deleteNote(note.id)}
                      className="w-9 h-9 bg-white/70 rounded-2xl flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-white hover:shadow-lg transition-all opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100"
                    >
                      <X size={16} />
                    </button>
                 </div>
                 
                 <textarea 
                    value={note.text}
                    onChange={(e) => updateNote(note.id, e.target.value)}
                    className="flex-1 bg-transparent text-slate-800 font-bold text-lg leading-relaxed outline-none resize-none placeholder:text-slate-300 placeholder:italic placeholder:font-medium"
                    placeholder="Escribir nota..."
                 />

                 <div className="mt-8 pt-6 border-t border-slate-900/5 flex items-center justify-between">
                    <div className="flex items-center gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                       {(['yellow', 'blue', 'green', 'rose', 'slate'] as Note['color'][]).map(c => (
                          <button 
                            key={c}
                            onClick={() => changeNoteColor(note.id, c)}
                            className={`w-6 h-6 rounded-xl border-2 transition-all hover:scale-125 hover:shadow-md ${
                               c === 'yellow' ? 'bg-amber-300' :
                               c === 'blue' ? 'bg-blue-300' :
                               c === 'green' ? 'bg-emerald-300' :
                               c === 'rose' ? 'bg-rose-300' :
                               'bg-slate-300'
                            } ${note.color === c ? 'border-white ring-2 ring-slate-900/10 scale-110 shadow-lg' : 'border-transparent'}`}
                          />
                       ))}
                    </div>
                    <div className="text-[10px] font-black text-slate-300 italic group-hover:text-amber-500 transition-colors uppercase tracking-widest">
                       Autoguardado
                    </div>
                 </div>
               </div>
             ))}
          </div>
        )}
      </div>

      <div className="mt-20 p-10 bg-slate-900 rounded-[40px] text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl relative overflow-hidden">
         {/* Decoración de fondo */}
         <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
         
         <div className="flex items-center gap-6 relative z-10">
            <div className="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center text-amber-400">
               <Plus size={32} />
            </div>
            <div>
               <h4 className="text-xl font-black mb-1 leading-none uppercase tracking-tight">Estación de Trabajo MSA</h4>
               <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em]">Todas tus notas se guardan por equipo</p>
            </div>
         </div>
         <div className="flex items-center gap-4 relative z-10 w-full md:w-auto">
            <div className="flex-1 text-right hidden lg:block mr-4">
               <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
                  Tip: Usa los colores para separar <br /> Urgentes de recordatorios generales.
               </p>
            </div>
            <button onClick={addNote} className="flex-1 md:flex-none px-8 py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-amber-900/20 transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3">
               Agregar Pendiente <ChevronRight size={18} />
            </button>
         </div>
      </div>
    </div>
  );
};
