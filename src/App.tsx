import { useEffect, useRef, useState } from 'react';
import AdminView from './components/AdminView';
import PublicView from './components/PublicView';
import { supabase, type QueueRow } from './lib/supabase';
import './App.css';

type Tab = 'admin' | 'public';

export default function App() {
  const [tab, setTab] = useState<Tab>('admin');
  const [queue, setQueue] = useState<QueueRow[]>([]);
  const [toast, setToast] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadQueue = async () => {
    const { data, error } = await supabase
      .from('queue')
      .select('*')
      .order('created_at', { ascending: true });
    if (!error && data) setQueue(data as QueueRow[]);
  };

  useEffect(() => {
    loadQueue();
    const channel = supabase
      .channel('queue-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue' }, () => {
        loadQueue();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setToastVisible(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastVisible(false), 2500);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] flex justify-center">
      <div className="w-full max-w-[430px] min-h-screen bg-[#F5F5F0] relative overflow-x-hidden">
        {/* Topbar */}
        <div className="bg-white border-b border-[#E8E8E4] px-4 py-3.5 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2 text-[17px] font-semibold text-[#1a1a1a]">
            <img src="/Logo-FIP-Black-Transparent-NoText.webp" alt="FIP" className="h-6 w-auto object-contain" />
            FIP Autoshop
          </div>
          <span
            className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
              tab === 'admin'
                ? 'bg-[#E6F1FB] text-[#0C447C]'
                : 'bg-[#EAF3DE] text-[#27500A]'
            }`}
          >
            {tab === 'admin' ? 'Admin' : 'Publik'}
          </span>
        </div>

        {/* Main Tabs */}
        <div className="flex bg-white border-b border-[#E8E8E4]">
          {(['admin', 'public'] as Tab[]).map((t) => (
            <button
              key={t}
              className={`flex-1 py-3 text-[13px] font-medium border-b-2 transition-all cursor-pointer ${
                tab === t
                  ? 'text-[#185FA5] border-[#185FA5]'
                  : 'text-[#888] border-transparent hover:text-[#555]'
              }`}
              onClick={() => setTab(t)}
            >
              {t === 'admin' ? 'Panel Admin' : 'Lihat Antrian'}
            </button>
          ))}
        </div>

        {/* Views */}
        <div style={{ display: tab === 'admin' ? 'block' : 'none' }}>
          <AdminView queue={queue} onRefresh={loadQueue} onToast={showToast} />
        </div>
        <div style={{ display: tab === 'public' ? 'block' : 'none' }}>
          <PublicView queue={queue} />
        </div>
      </div>

      {/* Toast */}
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
