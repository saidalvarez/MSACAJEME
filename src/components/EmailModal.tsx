import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Mail, Send, Loader2, CheckCircle } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import { QuotePDF } from './QuotePDF';

import toast from 'react-hot-toast';

interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEmail: string | null;
  ticketNumber: string | number;
  ticket?: any;
  formatType?: any;
}

export const EmailModal = ({ isOpen, onClose, defaultEmail, ticketNumber, ticket, formatType }: EmailModalProps) => {
  const [emailTo, setEmailTo] = useState(defaultEmail || '');
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setEmailTo(defaultEmail || '');
      setIsSent(false);
    }
  }, [isOpen, defaultEmail]);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailTo.trim()) {
      toast.error('Ingresa un correo válido');
      return;
    }

    setIsSending(true);

    try {
      let pdfBase64 = '';
      
      // Generate PDF if ticket data is available
      if (ticket) {
        const doc = <QuotePDF quote={ticket} formatType={formatType || 'payment_info'} />;
        const blob = await pdf(doc).toBlob();
        const buffer = await blob.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        // Convert to base64
        let binary = '';
        bytes.forEach(b => binary += String.fromCharCode(b));
        pdfBase64 = btoa(binary);
      }

      // Send via backend API
      const token = sessionStorage.getItem('msa_token');
      const response = await fetch('http://localhost:3001/api/email/send', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          to: emailTo,
          subject: `Cotización de Servicio #${ticketNumber} — Multiservicios Cajeme`,
          ticketNumber,
          clientName: ticket?.client_name || ticket?.clientName || 'Cliente',
          total: ticket?.total || 0,
          pdfBase64
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al enviar');
      }

      setIsSent(true);
      toast.success(`Correo enviado a ${emailTo}`, { duration: 4000 });
      
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error: any) {
      console.error('Email send error:', error);
      toast.error(`Error: ${error.message || 'No se pudo enviar el correo'}`, { duration: 5000 });
    } finally {
      setIsSending(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#0a1428]/80 transition-opacity" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 p-0 animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-slate-50/50">
          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            <Mail size={20} className="text-slate-500"/> Enviar Cotización por Email
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-slate-800 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        {isSent ? (
          <div className="p-10 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">¡Correo Enviado!</h3>
            <p className="text-sm text-slate-500">El cliente recibirá la cotización en su bandeja de entrada.</p>
          </div>
        ) : (
          <form onSubmit={handleSend} className="p-6 space-y-5">
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600 shrink-0">
                <Mail size={14}/>
              </div>
              <p className="text-xs text-emerald-700 font-medium">
                Se adjuntará automáticamente el PDF del Ticket #{ticketNumber} al correo.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Correo del Cliente</label>
              <input 
                required
                type="email" 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                placeholder="cliente@correo.com"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
              />
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Remitente</p>
              <p className="text-sm font-bold text-slate-700">msacajeme@gmail.com</p>
            </div>

            {/* Footer Actions */}
            <div className="flex gap-3 justify-end pt-2 font-bold uppercase tracking-widest text-[10px]">
              <button 
                type="button" 
                onClick={onClose}
                className="px-6 py-3 text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                disabled={isSending}
                className="px-6 py-3 text-white bg-blue-600 hover:bg-blue-700 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-50"
              >
                {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {isSending ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>,
    document.body
  );
};
