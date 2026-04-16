import { useState, useEffect } from 'react';
import { X, Save, User, Mail, FileText } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useStore } from '../store/useStore';
import toast from 'react-hot-toast';
import { PhoneInput } from './ui/PhoneInput';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  client?: any;
}

export const ClientModal = ({ isOpen, onClose, client }: ClientModalProps) => {
  const { addClient, updateClient } = useStore();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    notes: '',
    benefits: ''
  });

  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name || '',
        phone: client.phone || '',
        email: client.email || '',
        notes: client.notes || '',
        benefits: client.benefits || ''
      });
    } else {
      setFormData({ name: '', phone: '', email: '', notes: '', benefits: '' });
    }
  }, [client, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (client) {
      updateClient(client.id, formData);
      toast.success('Cliente actualizado correctamente');
    } else {
      addClient({
        ...formData,
        registrationDate: new Date().toISOString()
      });
      toast.success('Cliente registrado correctamente');
    }
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Contenedor del Modal */}
      <div className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-300 z-10">
        
        {/* Header Limpio y Elegante */}
        <div className="bg-white px-8 py-6 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-slate-50 border border-slate-100 text-slate-700 rounded-2xl flex items-center justify-center shadow-sm">
                  <User size={24} />
               </div>
               <div>
                  <h2 className="text-xl font-bold text-slate-800 tracking-tight">
                    {client ? 'Modificar Cliente' : 'Nuevo Cliente'}
                  </h2>
                  <p className="text-xs font-medium text-slate-500">
                    {client ? 'Actualizar expediente en el directorio' : 'Añadir registro al directorio'}
                  </p>
               </div>
            </div>
            <button 
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5 bg-slate-50/50">
          <div className="space-y-4">
            <div className="space-y-1.5 focus-within:text-slate-900 transition-colors group">
              <label className="text-xs font-bold text-slate-500 group-focus-within:text-slate-800 transition-colors">Nombre Completo</label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-600 transition-colors">
                  <User size={16} />
                </div>
                <input
                  type="text"
                  required
                  className="w-full bg-white border border-slate-200 rounded-xl h-12 pl-10 pr-4 text-sm font-semibold text-slate-800 focus:ring-4 focus:ring-slate-100 focus:border-slate-400 outline-none transition-all placeholder:text-slate-300 shadow-sm"
                  placeholder="Ej. Juan Pérez"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                />
              </div>
            </div>

            <div className="space-y-1.5 focus-within:text-slate-900 transition-colors group">
              <label className="text-xs font-bold text-slate-500 group-focus-within:text-slate-800 transition-colors">Teléfono Móvil</label>
              <PhoneInput
                value={formData.phone}
                onChange={(val) => setFormData({ ...formData, phone: val })}
                required
              />
            </div>

            <div className="space-y-1.5 focus-within:text-slate-900 transition-colors group">
              <label className="text-xs font-bold text-slate-500 group-focus-within:text-slate-800 transition-colors">Correo Electrónico (Opcional)</label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-600 transition-colors">
                    <Mail size={16} />
                </div>
                <input
                  type="email"
                  className="w-full bg-white border border-slate-200 rounded-xl h-12 pl-10 pr-4 text-sm font-semibold text-slate-800 focus:ring-4 focus:ring-slate-100 focus:border-slate-400 outline-none transition-all placeholder:text-slate-300 shadow-sm"
                  placeholder="correo@ejemplo.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5 focus-within:text-slate-900 transition-colors group">
              <label className="text-xs font-bold text-slate-500 group-focus-within:text-slate-800 transition-colors">Notas Internas / Preferencias</label>
              <div className="relative">
                <div className="absolute left-3.5 top-3.5 text-slate-400 group-focus-within:text-slate-600 transition-colors">
                   <FileText size={16} />
                </div>
                <textarea
                  className="w-full bg-white border border-slate-200 rounded-xl py-3.5 pl-10 pr-4 text-sm font-medium text-slate-800 focus:ring-4 focus:ring-slate-100 focus:border-slate-400 outline-none transition-all min-h-[80px] resize-none placeholder:text-slate-300 shadow-sm leading-relaxed"
                  placeholder="Escribe detalles importantes, placas de autos frecuentes..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5 focus-within:text-slate-900 transition-colors group">
              <label className="text-xs font-bold text-emerald-600 group-focus-within:text-emerald-700 transition-colors flex items-center gap-1.5">
                 <span className="w-4 h-4 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0">✦</span> Beneficios Asignados
              </label>
              <div className="relative">
                <textarea
                  className="w-full bg-white border border-slate-200 border-l-2 border-l-emerald-500 rounded-xl py-3.5 px-4 text-sm font-medium text-slate-800 focus:ring-4 focus:ring-emerald-50 focus:border-emerald-400 outline-none transition-all min-h-[80px] resize-none placeholder:text-slate-300 shadow-sm leading-relaxed"
                  placeholder="Ej. Revisión Exprés, Lavado VIP, Descuento 10%..."
                  value={formData.benefits}
                  onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-xl font-bold text-sm text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 transition-colors active:scale-95"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-slate-900 hover:bg-black text-white px-8 py-3 rounded-xl font-bold text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 border border-slate-800"
            >
              <Save size={16} />
              {client ? 'Guardar Cambios' : 'Registrar Cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
