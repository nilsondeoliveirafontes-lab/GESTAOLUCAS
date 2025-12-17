
import React, { useState } from 'react';
import { Plus, Search, User, Phone, MapPin, Edit2, Trash2, X, MessageCircle } from 'lucide-react';
import { Customer, Debt } from '../types';
import { supabase } from '../supabase';

interface CustomersProps {
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  debts: Debt[];
  setDebts: React.Dispatch<React.SetStateAction<Debt[]>>;
}

const Customers: React.FC<CustomersProps> = ({ customers, setCustomers, debts, setDebts }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [document, setDocument] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [address, setAddress] = useState('');
  const [observations, setObservations] = useState('');

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone.includes(searchTerm) ||
    c.whatsapp.includes(searchTerm)
  );

  const resetForm = () => {
    setName('');
    setDocument('');
    setPhone('');
    setWhatsapp('');
    setAddress('');
    setObservations('');
    setEditingCustomer(null);
  };

  const handleOpenModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setName(customer.name);
      setDocument(customer.document || '');
      setPhone(customer.phone);
      setWhatsapp(customer.whatsapp);
      setAddress(customer.address || '');
      setObservations(customer.observations || '');
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !whatsapp.trim()) {
      alert('Nome, Telefone e WhatsApp são obrigatórios.');
      return;
    }

    setLoading(true);

    try {
      // Obter o ID do usuário atual para associar ao registro (Obrigatório para RLS)
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Você precisa estar logado para salvar.");
      }

      const customerPayload = {
        name: name.trim(),
        document: document.trim() || null,
        phone: phone.trim(),
        whatsapp: whatsapp.trim(),
        address: address.trim() || null,
        observations: observations.trim() || null,
        user_id: session.user.id // Crucial para RLS
      };

      if (editingCustomer) {
        const { error } = await supabase
          .from('customers')
          .update(customerPayload)
          .eq('id', editingCustomer.id);

        if (error) throw error;

        setCustomers(prev => prev.map(c => c.id === editingCustomer.id ? { 
          ...c, 
          ...customerPayload,
          document: customerPayload.document || undefined,
          address: customerPayload.address || undefined,
          observations: customerPayload.observations || undefined
        } : c));
        
        setDebts(prev => prev.map(d => d.customerId === editingCustomer.id ? { ...d, customerName: name } : d));
      } else {
        const { data, error } = await supabase
          .from('customers')
          .insert([customerPayload])
          .select();

        if (error) throw error;
        
        if (data && data.length > 0) {
          const row = data[0];
          const newCustomer: Customer = {
            id: row.id,
            name: row.name,
            document: row.document,
            phone: row.phone,
            whatsapp: row.whatsapp,
            address: row.address,
            observations: row.observations,
            createdAt: new Date(row.created_at).getTime()
          };
          setCustomers(prev => [...prev, newCustomer]);
        }
      }
      setIsModalOpen(false);
      resetForm();
    } catch (error: any) {
      console.error('Erro ao salvar cliente:', error);
      const errorMessage = error.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
      alert(`ERRO AO SALVAR: ${errorMessage}\n\nCertifique-se que você criou as tabelas no painel do Supabase.`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este cliente?')) {
      try {
        const { error } = await supabase.from('customers').delete().eq('id', id);
        if (error) throw error;
        setCustomers(prev => prev.filter(c => c.id !== id));
      } catch (error: any) {
        alert('Erro ao excluir: ' + (error.message || 'Erro desconhecido'));
      }
    }
  };

  const openWhatsApp = (num: string) => {
    const cleanNum = num.replace(/\D/g, '');
    window.open(`https://wa.me/55${cleanNum}`, '_blank');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800">Clientes</h2>
          <p className="text-slate-500">Gerencie sua base de clientes cadastrados.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-2xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95"
        >
          <Plus size={20} />
          <span className="font-bold">Novo Cliente</span>
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4">
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por nome, telefone ou whatsapp..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-2xl py-3.5 pl-12 pr-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900 font-bold placeholder:text-slate-400"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="pb-4 pt-2 font-bold text-slate-400 uppercase text-[11px] tracking-wider px-4">Cliente</th>
                <th className="pb-4 pt-2 font-bold text-slate-400 uppercase text-[11px] tracking-wider px-4">Documento</th>
                <th className="pb-4 pt-2 font-bold text-slate-400 uppercase text-[11px] tracking-wider px-4">Contato</th>
                <th className="pb-4 pt-2 font-bold text-slate-400 uppercase text-[11px] tracking-wider px-4">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400 font-bold">Nenhum cliente encontrado.</td>
                </tr>
              ) : (
                filteredCustomers.map(customer => (
                  <tr key={customer.id} className="group hover:bg-slate-50 transition-colors">
                    <td className="py-5 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="bg-slate-100 p-2.5 rounded-xl group-hover:bg-white transition-colors border border-slate-100 text-slate-600">
                          <User size={18} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{customer.name}</p>
                          {customer.address && (
                            <div className="flex items-center text-slate-500 text-xs mt-0.5 font-medium">
                              <MapPin size={10} className="mr-1" />
                              <span className="truncate max-w-[150px]">{customer.address}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-5 px-4 text-sm text-slate-700 font-bold">
                      {customer.document || '---'}
                    </td>
                    <td className="py-5 px-4">
                      <div className="flex flex-col space-y-1">
                        <div className="flex items-center text-sm font-black text-slate-800">
                          <Phone size={12} className="mr-1.5 text-slate-400" />
                          {customer.phone}
                        </div>
                        <button 
                          onClick={() => openWhatsApp(customer.whatsapp)}
                          className="flex items-center text-xs font-black text-emerald-600 hover:text-emerald-700 w-fit"
                        >
                          <MessageCircle size={12} className="mr-1.5" />
                          WhatsApp
                        </button>
                      </div>
                    </td>
                    <td className="py-5 px-4">
                      <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleOpenModal(customer)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(customer.id)}
                          className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-xl font-black text-slate-900">
                {editingCustomer ? 'Editar Cliente' : 'Novo Cliente'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-2">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-black text-slate-700 mb-1">Nome Completo *</label>
                  <input
                    required
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-900 font-bold placeholder:text-slate-300"
                    placeholder="Ex: João da Silva"
                  />
                </div>
                <div>
                  <label className="block text-sm font-black text-slate-700 mb-1">CPF ou RG</label>
                  <input
                    type="text"
                    value={document}
                    onChange={(e) => setDocument(e.target.value)}
                    className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-900 font-bold placeholder:text-slate-300"
                    placeholder="Opcional"
                  />
                </div>
                <div>
                  <label className="block text-sm font-black text-slate-700 mb-1">Telefone *</label>
                  <input
                    required
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-900 font-bold placeholder:text-slate-300"
                    placeholder="(00) 0000-0000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-black text-slate-700 mb-1">WhatsApp *</label>
                  <input
                    required
                    type="tel"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-900 font-bold placeholder:text-slate-300"
                    placeholder="(00) 90000-0000"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-black text-slate-700 mb-1">Endereço</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-900 font-bold placeholder:text-slate-300"
                    placeholder="Rua, Número, Bairro, Cidade"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-black text-slate-700 mb-1">Observações</label>
                  <textarea
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                    className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none h-24 resize-none text-slate-900 font-bold placeholder:text-slate-300"
                    placeholder="Alguma nota importante sobre o cliente..."
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-6 py-4 border-2 border-slate-200 text-slate-700 font-black rounded-xl hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-4 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95 disabled:opacity-70"
                >
                  {loading ? 'Salvando...' : 'Confirmar Cadastro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
