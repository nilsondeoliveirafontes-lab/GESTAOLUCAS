
import React, { useState, useMemo } from 'react';
import { Plus, Search, DollarSign, Calendar, Clock, Edit2, Trash2, X, MessageCircle, Filter, CheckCircle, AlertCircle, Sparkles, Loader2 } from 'lucide-react';
import { Debt, Customer, DebtStatus } from '../types';
import { GoogleGenAI } from "@google/genai";
import { supabase } from '../supabase';

interface DebtsProps {
  debts: Debt[];
  setDebts: React.Dispatch<React.SetStateAction<Debt[]>>;
  customers: Customer[];
}

const Debts: React.FC<DebtsProps> = ({ debts, setDebts, customers }) => {
  const [filter, setFilter] = useState<'Todas' | 'Pendentes' | 'Pagas' | 'Vencidas'>('Todas');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [isGeneratingMessage, setIsGeneratingMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Form states
  const [customerId, setCustomerId] = useState('');
  const [value, setValue] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<DebtStatus>('Pendente');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [observations, setObservations] = useState('');

  const customerIdsWithPending = useMemo(() => {
    return new Set(debts.filter(d => d.status === 'Pendente').map(d => d.customerId));
  }, [debts]);

  const isSelectedCustomerPending = customerId && customerIdsWithPending.has(customerId) && !editingDebt;

  const isOverdue = (dateStr: string) => {
    return new Date(dateStr) < new Date() && new Date(dateStr).toDateString() !== new Date().toDateString();
  };

  const filteredDebts = debts.filter(d => {
    if (filter === 'Pendentes') return d.status === 'Pendente';
    if (filter === 'Pagas') return d.status === 'Paga';
    if (filter === 'Vencidas') return d.status === 'Pendente' && isOverdue(d.dueDate);
    return true;
  });

  const totalFiltered = filteredDebts.reduce((acc, d) => acc + d.value, 0);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const generateAIMessage = async (debt: Debt, customer: Customer) => {
    try {
      // Inicializa o AI apenas quando necessário
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const prompt = `Gere uma mensagem curta, educada e profissional de cobrança para o WhatsApp. 
      Cliente: ${customer.name}. 
      Valor da dívida: ${formatCurrency(debt.value)}. 
      Vencimento: ${new Date(debt.dueDate).toLocaleDateString('pt-BR')}.
      O tom deve ser amigável pois é um pequeno negócio. Não use emojis em excesso.
      Apenas o texto da mensagem, sem aspas.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });

      return response.text || `Olá ${customer.name}, lembramos da sua pendência de ${formatCurrency(debt.value)} vencida em ${new Date(debt.dueDate).toLocaleDateString('pt-BR')}. Como podemos facilitar o pagamento?`;
    } catch (error) {
      console.error("Erro ao usar Gemini:", error);
      return `Olá ${customer.name}, notamos uma pendência de ${formatCurrency(debt.value)} vencida em ${new Date(debt.dueDate).toLocaleDateString('pt-BR')}. Podemos combinar o pagamento?`;
    }
  };

  const sendWhatsAppMessage = async (debt: Debt) => {
    const customer = customers.find(c => c.id === debt.customerId);
    if (!customer) return;
    
    setIsGeneratingMessage(debt.id);
    try {
      const message = await generateAIMessage(debt, customer);
      const cleanNum = customer.whatsapp.replace(/\D/g, '');
      window.open(`https://wa.me/55${cleanNum}?text=${encodeURIComponent(message)}`, '_blank');
    } finally {
      setIsGeneratingMessage(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSelectedCustomerPending) return;
    if (!customerId || !value || !date || !dueDate) return;

    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Acesso negado.");

      const debtPayload = {
        customer_id: customerId,
        customer_name: customer.name,
        value: parseFloat(value),
        date,
        due_date: dueDate,
        status,
        payment_method: paymentMethod.trim() || null,
        observations: observations.trim() || null,
        user_id: session.user.id
      };

      if (editingDebt) {
        const { error } = await supabase.from('debts').update(debtPayload).eq('id', editingDebt.id);
        if (error) throw error;
        setDebts(prev => prev.map(d => d.id === editingDebt.id ? { ...d, customerId, customerName: customer.name, value: parseFloat(value), date, dueDate, status, paymentMethod: debtPayload.payment_method || undefined, observations: debtPayload.observations || undefined } : d));
      } else {
        const { data, error } = await supabase.from('debts').insert([debtPayload]).select();
        if (error) throw error;
        if (data && data.length > 0) {
          const row = data[0];
          setDebts(prev => [{ id: row.id, customerId: row.customer_id, customerName: row.customer_name, value: row.value, date: row.date, dueDate: row.due_date, status: row.status, paymentMethod: row.payment_method, observations: row.observations, createdAt: new Date(row.created_at).getTime() }, ...prev]);
        }
      }
      setIsModalOpen(false);
    } catch (error: any) {
      alert(`Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Excluir esta dívida?')) {
      try {
        const { error } = await supabase.from('debts').delete().eq('id', id);
        if (error) throw error;
        setDebts(prev => prev.filter(d => d.id !== id));
      } catch (error: any) {
        alert('Erro ao excluir: ' + (error.message || 'Erro desconhecido'));
      }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Dívidas</h2>
          <p className="text-slate-500">Controle total de valores a receber.</p>
        </div>
        <button 
          onClick={() => { setEditingDebt(null); setCustomerId(''); setValue(''); setDueDate(''); setStatus('Pendente'); setIsModalOpen(true); }}
          className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-6 py-4 rounded-2xl shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95"
        >
          <Plus size={20} />
          <span className="font-black uppercase tracking-wider text-sm">Lançar Dívida</span>
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-64 space-y-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center">
              <Filter size={14} className="mr-2" /> Filtrar Status
            </h3>
            <div className="space-y-1">
              {(['Todas', 'Pendentes', 'Pagas', 'Vencidas'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                    filter === f ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="bg-slate-900 p-6 rounded-3xl text-white shadow-xl">
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Total Exibido</p>
            <h4 className="text-2xl font-black text-blue-400">{formatCurrency(totalFiltered)}</h4>
          </div>
        </div>

        <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="p-5 font-black text-slate-400 uppercase text-[10px] tracking-widest">Cliente / Valor</th>
                  <th className="p-5 font-black text-slate-400 uppercase text-[10px] tracking-widest">Vencimento</th>
                  <th className="p-5 font-black text-slate-400 uppercase text-[10px] tracking-widest">Status</th>
                  <th className="p-5 font-black text-slate-400 uppercase text-[10px] tracking-widest text-right">Cobrança IA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDebts.length === 0 ? (
                  <tr><td colSpan={4} className="py-20 text-center text-slate-400 font-black">Nenhum registro encontrado.</td></tr>
                ) : (
                  filteredDebts.map(debt => (
                    <tr key={debt.id} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="p-5">
                        <p className="font-bold text-slate-900">{debt.customerName}</p>
                        <p className="text-lg font-black text-blue-600">{formatCurrency(debt.value)}</p>
                      </td>
                      <td className="p-5">
                        <div className={`flex items-center text-sm font-black ${debt.status === 'Pendente' && isOverdue(debt.dueDate) ? 'text-rose-600' : 'text-slate-700'}`}>
                          <Calendar size={14} className="mr-2 opacity-50" />
                          {new Date(debt.dueDate).toLocaleDateString('pt-BR')}
                        </div>
                      </td>
                      <td className="p-5">
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          debt.status === 'Paga' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {debt.status}
                        </span>
                      </td>
                      <td className="p-5 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button 
                            disabled={isGeneratingMessage === debt.id}
                            onClick={() => sendWhatsAppMessage(debt)}
                            className="flex items-center space-x-2 px-3 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl transition-all border border-emerald-100 font-bold text-xs disabled:opacity-50"
                          >
                            {isGeneratingMessage === debt.id ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <>
                                <Sparkles size={14} className="text-emerald-500" />
                                <span>IA</span>
                              </>
                            )}
                            <MessageCircle size={16} />
                          </button>
                          <button onClick={() => { setEditingDebt(debt); setCustomerId(debt.customerId); setValue(debt.value.toString()); setDueDate(debt.dueDate); setStatus(debt.status); setIsModalOpen(true); }} className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"><Edit2 size={18} /></button>
                          <button onClick={() => handleDelete(debt.id)} className="p-2.5 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"><Trash2 size={18} /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                {editingDebt ? 'Editar Lançamento' : 'Novo Lançamento'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-8 space-y-5 bg-white">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Selecione o Cliente *</label>
                <select 
                  required
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className={`w-full border-2 rounded-2xl px-5 py-4 outline-none text-slate-900 font-bold transition-all ${
                    isSelectedCustomerPending ? 'border-rose-300 bg-rose-50 text-rose-900' : 'bg-slate-50 border-slate-100 focus:border-blue-500 focus:bg-white'
                  }`}
                >
                  <option value="">Buscar cliente...</option>
                  {customers.map(c => {
                    const isPending = customerIdsWithPending.has(c.id);
                    return <option key={c.id} value={c.id}>{c.name} {isPending ? '⚠️ PENDENTE' : ''}</option>;
                  })}
                </select>
                {isSelectedCustomerPending && (
                  <div className="mt-3 flex items-start space-x-2 text-rose-600 bg-rose-50 p-4 rounded-2xl border border-rose-100">
                    <AlertCircle size={18} className="shrink-0" />
                    <p className="text-xs font-bold">BLOQUEADO: Este cliente já possui dívida pendente. Regularize primeiro.</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Valor (R$) *</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 outline-none font-black text-slate-900 focus:border-blue-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Status *</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value as DebtStatus)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 outline-none font-black text-slate-900">
                    <option value="Pendente">Pendente</option>
                    <option value="Paga">Paga</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Vencimento *</label>
                  <input required type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 outline-none font-bold text-slate-900" />
                </div>
              </div>

              <div className="pt-6 flex space-x-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-4 border-2 border-slate-200 text-slate-600 font-black rounded-2xl hover:bg-slate-50">CANCELAR</button>
                <button
                  type="submit"
                  disabled={loading || isSelectedCustomerPending}
                  className="flex-1 px-6 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-200 hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'SALVANDO...' : 'CONFIRMAR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Debts;
