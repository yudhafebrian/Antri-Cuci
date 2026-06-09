import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminView from '../components/AdminView';
import { loadActiveOrders, subscribeToOrders, loginUser, registerUser, type ServiceOrderRow, type UserRow } from '../lib/db';
import { getSession, saveSession, clearSession } from '../lib/auth';

const DEFAULT_ADMIN_EMAIL = 'admin@fipautoshop.com';
const DEFAULT_ADMIN_PASSWORD = 'admin123';

export default function AdminPage() {
  const [queue, setQueue] = useState<ServiceOrderRow[]>([]);
  const [toast, setToast] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();
  const [isAuth, setIsAuth] = useState(() => !!getSession());
  const [user, setUser] = useState<UserRow | null>(() => {
    const session = getSession();
    if (session) {
      return {
        id: session.userId,
        email: session.email,
        password_hash: '',
        display_name: session.displayName,
        role: session.role,
        is_active: true,
        created_at: '',
      };
    }
    return null;
  });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>('login');

  const refreshQueue = async () => {
    const data = await loadActiveOrders();
    setQueue(data);
  };

  useEffect(() => {
    if (!isAuth) return;
    refreshQueue();
    const unsubscribe = subscribeToOrders(refreshQueue);
    return unsubscribe;
  }, [isAuth]);

  const showToast = (msg: string) => {
    setToast(msg);
    setToastVisible(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastVisible(false), 2500);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginError('');
    const result = await loginUser(email.trim().toLowerCase(), password);
    setLoading(false);
    if (result) {
      setIsAuth(true);
      setUser(result);
      saveSession(result);
      setLoginError('');
    } else {
      setLoginError('Email atau password salah');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginError('');
    const result = await registerUser(email.trim().toLowerCase(), password, email.split('@')[0], 'admin');
    setLoading(false);
    if (result) {
      showToast('Akun berhasil dibuat, silakan login');
      setMode('login');
      setEmail('');
      setPassword('');
    } else {
      setLoginError('Email sudah terdaftar');
    }
  };

  const fillDemo = () => {
    setEmail(DEFAULT_ADMIN_EMAIL);
    setPassword(DEFAULT_ADMIN_PASSWORD);
  };

  const handleLogout = () => {
    setIsAuth(false);
    setUser(null);
    clearSession();
    setEmail('');
    setPassword('');
    setLoginError('');
    navigate('/');
  };

  if (isAuth) {
    return (
      <div className="w-full max-w-[430px] min-h-screen bg-[#F5F5F0] relative overflow-x-hidden">
        <div className="bg-white border-b border-[#E8E8E4] px-4 py-3.5 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2 text-[17px] font-semibold text-[#1a1a1a]">
            <img src="/Logo-FIP-Black-Transparent-NoText.webp" alt="FIP" className="h-6 w-auto object-contain" />
            FIP Autoshop
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#E6F1FB] text-[#0C447C]">
              {user?.display_name || 'Admin'}
            </span>
            <button onClick={handleLogout} className="text-xs text-[#A32D2D] hover:text-[#D04D4D] font-medium px-2 py-1 rounded-lg hover:bg-[#FFE8E8] transition-all cursor-pointer">
              Logout
            </button>
          </div>
        </div>
        <div className="flex bg-white border-b border-[#E8E8E4]">
          <button className="flex-1 py-3 text-[13px] font-medium border-b-2 text-[#185FA5] border-[#185FA5] cursor-pointer">
            Panel Admin
          </button>
          <button
            className="flex-1 py-3 text-[13px] font-medium border-b-2 border-transparent text-[#666] hover:text-[#185FA5] hover:border-[#185FA5] transition-all cursor-pointer"
            onClick={() => navigate('/report')}
          >
            Report
          </button>
          <button
            className="flex-1 py-3 text-[13px] font-medium border-b-2 text-[#185FA5] border-[#185FA5] cursor-pointer"
            onClick={() => navigate('/')}
          >
            Lihat Antrian
          </button>
        </div>
        <AdminView queue={queue} onRefresh={refreshQueue} onToast={showToast} />

        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#1a1a1a] text-white px-5 py-2.5 rounded-full text-[13px] z-[999] whitespace-nowrap max-w-[calc(100vw-40px)] text-center transition-all duration-300 pointer-events-none ${
            toastVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          }`}
        >
          {toast}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F0] flex justify-center">
      <div className="w-full max-w-[430px] min-h-screen bg-[#F5F5F0] relative overflow-x-hidden">
        <div className="bg-white border-b border-[#E8E8E4] px-4 py-3.5 flex items-center justify-between sticky top-0 z-30">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-[17px] font-semibold text-[#1a1a1a] cursor-pointer">
            <img src="/Logo-FIP-Black-Transparent-NoText.webp" alt="FIP" className="h-6 w-auto object-contain" />
            FIP Autoshop
          </button>
        </div>

        <div className="px-6 pt-12">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-[#E6F1FB] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🔐</span>
            </div>
            <h1 className="text-xl font-bold text-[#1a1a1a] mb-1">Panel Admin</h1>
            <p className="text-sm text-[#888]">
              {mode === 'login' ? 'Masuk untuk mengelola antrian' : 'Buat akun admin baru'}
            </p>
          </div>

          <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="bg-white rounded-2xl border border-[#EAEAE6] p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#555] mb-1.5">Email</label>
              <input
                className="w-full border border-[#DDDDD8] rounded-xl px-3 py-2.5 text-sm text-[#1a1a1a] outline-none focus:border-[#378ADD] focus:ring-2 focus:ring-[#378ADD]/10 transition-all"
                type="email"
                placeholder="admin@fipautoshop.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#555] mb-1.5">Password</label>
              <input
                className="w-full border border-[#DDDDD8] rounded-xl px-3 py-2.5 text-sm text-[#1a1a1a] outline-none focus:border-[#378ADD] focus:ring-2 focus:ring-[#378ADD]/10 transition-all"
                type="password"
                placeholder="Masukkan password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>

            {loginError && (
              <div className="text-sm text-[#A32D2D] bg-[#FFE8E8] rounded-xl px-3 py-2 text-center">{loginError}</div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-[#185FA5] text-white rounded-xl text-[15px] font-semibold hover:bg-[#0C447C] transition-all cursor-pointer disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Memproses...' : mode === 'login' ? 'Masuk' : 'Daftar'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              className="text-sm text-[#185FA5] hover:underline"
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setLoginError(''); setEmail(''); setPassword(''); }}
            >
              {mode === 'login' ? 'Belum punya akun? Daftar' : 'Sudah punya akun? Login'}
            </button>
          </div>

          {mode === 'login' && (
            <div className="mt-6 bg-[#F5F5F0] border border-dashed border-[#CCC] rounded-xl p-4">
              <div className="text-xs text-[#888] text-center mb-3">Default Credentials</div>
              <div className="space-y-2">
                <div className="bg-white rounded-lg px-3 py-2 text-xs font-mono cursor-pointer hover:bg-[#EDF5FF] transition-colors" onClick={fillDemo}>
                  <div className="text-[#185FA5]">Email: {DEFAULT_ADMIN_EMAIL}</div>
                  <div className="text-[#3B6D11]">Password: {DEFAULT_ADMIN_PASSWORD}</div>
                </div>
              </div>
              <div className="text-[11px] text-[#bbb] text-center mt-3">Klik untuk auto-fill</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
