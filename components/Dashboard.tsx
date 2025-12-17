
import React, { useState } from 'react';
import { Users, CreditCard, CheckCircle, AlertTriangle, TrendingUp, Database, Copy, X, Check } from 'lucide-react';
import { Customer, Debt } from '../types';

interface DashboardProps {
  customers: Customer[];
  debts: Debt[];
}

const Dashboard: React.FC<DashboardProps> = ({ customers, debts }) => {
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const pendingDebts = debts.filter(d => d.status === 'Pendente');
  const paidDebts = debts.filter(d => d.status === 'Paga');
  
  const totalReceivable = pendingDebts.reduce((acc, d) => acc + d.value, 0);
  const totalPaid = paidDebts.reduce((acc, d) => acc + d.value, 0);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString();
  };

  const overdueCount = pendingDebts.filter(d => isOverdue(d.dueDate)).length;

  const sqlScript = `-- 1. Tabela de Clientes
create table customers (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  document text,
  phone text not null,
  whatsapp text not null,
  address text,
  observations text,
  created_at timestamp with time zone default now() not null,
  user_id uuid references auth.users(id) default auth.uid()
);

-- 2. Tabela de Dívidas
create table debts (
  id uuid default gen_random_uuid() primary key,
  customer_id uuid references customers(id) on delete cascade not null,
  customer_name text not null,
  value numeric not null,
  date date not null,
  due_date date not null,
  status text not null check (status in ('Pendente', 'Paga')),
  payment_method text,
  observations text,
  created_at timestamp with time zone default now() not null,
  user_id uuid references auth.users(id) default auth.uid()
);

-- 3. Habilitar Segurança (RLS)
alter table customers enable row level security;
alter table debts enable row level security;

-- 4. Criar Políticas de Acesso
create policy "Usuários veem seus próprios clientes" on customers for all using (auth.uid() = user_id);
create policy "Usuários veem suas próprias dívidas" on debts for all using (auth.uid() = user_id);`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800">Visão Geral</h2>
          <p className="text-slate-500 mt-1">Bem-vindo ao painel principal do seu negócio.</p>
        </div>
        <button 
          onClick={() => setShowSqlModal(true)}
          className="flex items-center justify-center space-x-2 bg-slate-800 text-white px-5 py-2.5 rounded-xl hover:bg-slate-900 transition-all text-sm font-bold shadow-lg"
        >
          <Database size={16} />
          <span>Configurar Banco</span>
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          icon={Users} 
          label="Total de Clientes" 
          value={customers.length.toString()} 
          color="blue"
        />
        <StatCard 
          icon={CreditCard} 
          label="Dívidas Pendentes" 
          value={pendingDebts.length.toString()} 
          color="amber"
          subValue={formatCurrency(totalReceivable)}
        />
        <StatCard 
          icon={CheckCircle} 
          label="Dívidas Pagas" 
          value={paidDebts.length.toString()} 
          color="emerald"
          subValue={formatCurrency(totalPaid)}
        />
        <StatCard 
          icon={AlertTriangle} 
          label="Dívidas Vencidas" 
          value={overdueCount.toString()} 
          color="rose"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center space-x-2 mb-6">
            <TrendingUp size={20} className="text-blue-600" />
            <h3 className="text-lg font-bold text-slate-800">Fluxo de Caixa</h3>
          </div>
          <div className="space-y-6">
            <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
              <span className="text-slate-600 font-medium">A Receber Total</span>
              <span className="text-xl font-bold text-amber-600">{formatCurrency(totalReceivable)}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
              <span className="text-slate-600 font-medium">Já Recebido</span>
              <span className="text-xl font-bold text-emerald-600">{formatCurrency(totalPaid)}</span>
            </div>
            <div className="pt-4 border-t border-slate-100">
               <div className="flex justify-between items-center">
                  <span className="text-slate-800 font-bold">Volume Total Transacionado</span>
                  <span className="text-2xl font-black text-blue-600">{formatCurrency(totalReceivable + totalPaid)}</span>
               </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Últimas Atividades</h3>
          <div className="space-y-4">
            {debts.length === 0 ? (
              <p className="text-slate-400 text-center py-10">Nenhuma movimentação recente.</p>
            ) : (
              debts.slice(0, 5).sort((a,b) => b.createdAt - a.createdAt).map(debt => (
                <div key={debt.id} className="flex items-center justify-between p-3 border-b border-slate-50 last:border-0">
                  <div>
                    <p className="font-semibold text-slate-700">{debt.customerName}</p>
                    <p className="text-xs text-slate-500">{new Date(debt.createdAt).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-800">{formatCurrency(debt.value)}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      debt.status === 'Paga' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {debt.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {showSqlModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2">
                <Database className="text-blue-600" size={20} />
                <h3 className="text-xl font-bold text-slate-900">Configuração do Supabase</h3>
              </div>
              <button onClick={() => setShowSqlModal(false)} className="text-slate-400 hover:text-slate-600 p-2">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600 leading-relaxed font-medium">
                Se você não está conseguindo salvar clientes, copie o código abaixo e cole no <strong>SQL Editor</strong> do seu painel Supabase para criar as tabelas necessárias.
              </p>
              <div className="relative group">
                <pre className="bg-slate-900 text-slate-300 p-5 rounded-2xl text-xs overflow-x-auto max-h-72 leading-relaxed font-mono">
                  {sqlScript}
                </pre>
                <button 
                  onClick={handleCopySql}
                  className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white p-2.5 rounded-xl transition-all border border-white/10"
                >
                  {copied ? <Check size={18} className="text-emerald-400" /> : <Copy size={18} />}
                </button>
              </div>
              <button 
                onClick={() => setShowSqlModal(false)}
                className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-lg hover:bg-blue-700 transition-all"
              >
                Entendi, já configurei
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, color, subValue }: { icon: any, label: string, value: string, color: string, subValue?: string }) => {
  const bgIcon: Record<string, string> = {
    blue: 'bg-blue-50',
    amber: 'bg-amber-50',
    emerald: 'bg-emerald-50',
    rose: 'bg-rose-50'
  };

  const textIcon: Record<string, string> = {
    blue: 'text-blue-600',
    amber: 'text-amber-600',
    emerald: 'text-emerald-600',
    rose: 'text-rose-600'
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-start transition-transform hover:scale-[1.02]">
      <div className={`p-3 rounded-2xl mb-4 ${bgIcon[color]}`}>
        <Icon className={textIcon[color]} size={24} />
      </div>
      <p className="text-slate-500 text-sm font-medium">{label}</p>
      <div className="flex items-baseline space-x-2">
        <h4 className="text-3xl font-black text-slate-800 mt-1">{value}</h4>
        {subValue && <span className="text-slate-400 text-xs font-bold">{subValue}</span>}
      </div>
    </div>
  );
};

export default Dashboard;
