
import React, { useState, useEffect } from 'react';
import { LogOut, Users, DollarSign, LayoutDashboard, Calculator as CalcIcon, Menu, X } from 'lucide-react';
import { User, View, Customer, Debt } from './types';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Customers from './components/Customers';
import Debts from './components/Debts';
import Calculator from './components/Calculator';
import { supabase } from './supabase';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);

  // Monitora estado de autenticação do Supabase
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({ username: session.user.email || 'Usuário', isAuthenticated: true });
        fetchInitialData();
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({ username: session.user.email || 'Usuário', isAuthenticated: true });
        fetchInitialData();
      } else {
        setUser(null);
        setCustomers([]);
        setDebts([]);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [customersRes, debtsRes] = await Promise.all([
        supabase.from('customers').select('*').order('name'),
        supabase.from('debts').select('*').order('created_at', { ascending: false })
      ]);

      if (customersRes.data) setCustomers(customersRes.data);
      if (debtsRes.data) {
        // Map snake_case from Supabase to camelCase for the frontend
        const mappedDebts = debtsRes.data.map(d => ({
          id: d.id,
          customerId: d.customer_id,
          customerName: d.customer_name,
          value: d.value,
          date: d.date,
          dueDate: d.due_date,
          status: d.status,
          paymentMethod: d.payment_method,
          observations: d.observations,
          createdAt: new Date(d.created_at).getTime()
        }));
        setDebts(mappedDebts);
      }
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-slate-500 font-medium">Carregando Gestão Lucas...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={() => {}} />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard customers={customers} debts={debts} />;
      case 'customers':
        return <Customers customers={customers} setCustomers={setCustomers} debts={debts} setDebts={setDebts} />;
      case 'debts':
        return <Debts debts={debts} setDebts={setDebts} customers={customers} />;
      case 'calculator':
        return <Calculator />;
      default:
        return <Dashboard customers={customers} debts={debts} />;
    }
  };

  const NavItem = ({ view, icon: Icon, label }: { view: View, icon: any, label: string }) => (
    <button
      onClick={() => {
        setCurrentView(view);
        setIsMobileMenuOpen(false);
      }}
      className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
        currentView === view 
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
          : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-72 bg-white border-r border-slate-200 p-6">
        <div className="flex items-center space-x-3 mb-10 px-2">
          <div className="bg-blue-600 p-2 rounded-lg">
            <DollarSign className="text-white" size={24} />
          </div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">GESTÃO LUCAS</h1>
        </div>

        <nav className="flex-1 space-y-2">
          <NavItem view="dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavItem view="customers" icon={Users} label="Clientes" />
          <NavItem view="debts" icon={DollarSign} label="Dívidas" />
          <NavItem view="calculator" icon={CalcIcon} label="Calculadora" />
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-100">
          <div className="flex items-center justify-between px-2">
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-semibold text-slate-800 truncate">{user.username}</span>
              <span className="text-xs text-slate-500 uppercase tracking-wider">Administrador</span>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Sair"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 px-4 flex items-center justify-between z-40 shadow-sm">
        <div className="flex items-center space-x-2">
          <div className="bg-blue-600 p-1.5 rounded-md">
            <DollarSign className="text-white" size={18} />
          </div>
          <span className="font-bold text-slate-800">GESTÃO LUCAS</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-slate-600"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-30 bg-white pt-20 px-6 animate-in fade-in slide-in-from-top-4 duration-200">
          <nav className="space-y-3">
            <NavItem view="dashboard" icon={LayoutDashboard} label="Dashboard" />
            <NavItem view="customers" icon={Users} label="Clientes" />
            <NavItem view="debts" icon={DollarSign} label="Dívidas" />
            <NavItem view="calculator" icon={CalcIcon} label="Calculadora" />
            <button 
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-all"
            >
              <LogOut size={20} />
              <span className="font-medium">Sair do Sistema</span>
            </button>
          </nav>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pt-16 lg:pt-0 p-4 lg:p-10">
        <div className="max-w-6xl mx-auto">
          {renderView()}
        </div>
      </main>
    </div>
  );
};

export default App;
