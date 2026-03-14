import { useState } from 'react';
import { X, Save } from 'lucide-react';
import { useClients } from '../context/ClientContext';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ClientModal = ({ isOpen, onClose }: ClientModalProps) => {
  const { addClient } = useClients();
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    notes: ''
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) return alert("El nombre y teléfono son obligatorios");

    addClient({
      name: formData.name,
      phone: formData.phone,
      email: formData.email,
      notes: formData.notes
    });

    // Limpiar formulario y cerrar
    setFormData({ name: '', phone: '', email: '', notes: '' });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Encabezado */}
        <div className="flex justify-between items-center p-4 border-b border-gray-100">
          <h3 className="font-bold text-lg text-slate-800">Nuevo Cliente</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-slate-800 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Nombre</label>
            <input 
              autoFocus
              type="text" 
              placeholder="Nombre completo"
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:border-slate-800 transition-colors"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Teléfono</label>
            <input 
              type="tel" 
              placeholder="5512345678"
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:border-slate-800 transition-colors"
              value={formData.phone}
              onChange={e => setFormData({...formData, phone: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Email (opcional)</label>
            <input 
              type="email" 
              placeholder="correo@ejemplo.com"
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:border-slate-800 transition-colors"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Notas (opcional)</label>
            <textarea 
              placeholder="Notas sobre el cliente..."
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:border-slate-800 transition-colors h-24 resize-none"
              value={formData.notes}
              onChange={e => setFormData({...formData, notes: e.target.value})}
            ></textarea>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Save size={16} /> Guardar
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};