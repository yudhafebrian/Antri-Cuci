import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, type QueueRow } from '../lib/supabase';
import { STAGE_CFG, MENIT, stagesOf, type Stage, type VehicleType } from '../lib/constants';

function etaMenit(car: QueueRow, allQueue: QueueRow[]): number {
  const stages = stagesOf(car.type as VehicleType);
  const idx = stages.indexOf(car.stage as Stage);
  const stageTime = car.times[car.stage] ? new Date(car.times[car.stage]).getTime() : Date.now();
  const elapsed = (Date.now() - stageTime) / 60000;
  const queueOfType = allQueue.filter((c) => c.type === car.type);

  if (car.stage === 'waiting') {
    const wIdx = queueOfType.filter((c) => c.stage === 'waiting').indexOf(car);
    return MENIT * 2 + MENIT * wIdx;
  }
  const remaining = Math.max(0, Math.round(MENIT - elapsed));
  const stepsLeft = stages.length - idx - 1;
  return remaining + stepsLeft * MENIT;
}

const TL_COLORS: Record<string, string> = {
  waiting: '#EF9F27', basah: '#378ADD', kering: '#639922',
  antripoles: '#D44A9A', poles: '#E06520', qc: '#8B44E0', selesai: '#1D9E75',
};

export default function AntrianPage() {
  const [queue, setQueue] = useState<QueueRow[]>([]);
  const [, setTick] = useState(0);
  const [tab, setTab] = useState<VehicleType>('regular');
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('queue')
        .select('*')
        .order('created_at', { ascending: true });
      if (!error && data) setQueue(data as QueueRow[]);
    };
    load();
    const channel = supabase
      .channel('queue-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  const regularQueue = queue.filter((c) => c.type === 'regular');
  const premiumQueue = queue.filter((c) => c.type === 'premium');
  const activeQueue = tab === 'regular' ? regularQueue : premiumQueue;

  const allWaiting = activeQueue.filter((c) => c.stage === 'waiting').length;
  const activeCount = activeQueue.filter((c) => c.stage !== 'selesai').length;
  const etaBaru = MENIT * 2 + allWaiting * MENIT;

  const displayOrder: Stage[] = ['selesai', 'qc', 'poles', 'antripoles', 'kering', 'basah', 'waiting'];

  const StageStats = ({ q, stages }: { q: QueueRow[]; stages: { stage: string | string[]; label: string; color: string }[] }) => (
    <div className={`grid gap-1.5 mb-4`} style={{ gridTemplateColumns: `repeat(${stages.length}, 1fr)` }}>
      {stages.map(({ stage, label, color }) => {
        const stageList = Array.isArray(stage) ? stage : [stage];
        const count = q.filter((c) => stageList.includes(c.stage)).length;
        return (
          <div key={label} className="bg-white border border-[#EAEAE6] rounded-xl py-2 px-1 text-center">
            <div className="text-lg font-semibold" style={{ color }}>{count}</div>
            <div className="text-[9px] text-[#888] mt-0.5 leading-tight">{label}</div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F5F5F0] flex justify-center">
      <div className="w-full max-w-[430px] min-h-screen bg-[#F5F5F0] relative overflow-x-hidden">
        <div className="bg-white border-b border-[#E8E8E4] px-4 py-3.5 flex items-center justify-between sticky top-0 z-30">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-[17px] font-semibold text-[#1a1a1a] cursor-pointer">
            <img src="/Logo-FIP-Black-Transparent-NoText.webp" alt="FIP" className="h-6 w-auto object-contain" />
            FIP Autoshop
          </button>
        </div>

        {activeQueue.length === 0 ? (
          <div className="px-5 py-7 text-center" style={{ background: 'linear-gradient(135deg,#1D9E75,#17826A)' }}>
            <div className="text-xs text-white/80 mb-1">Estimasi Waktu Tunggu</div>
            <div className="text-5xl font-bold text-white leading-none tracking-tight">Kosong!</div>
            <div className="text-xs text-white/80 mt-2">Tidak ada antrian — langsung bisa masuk 🎉</div>
          </div>
        ) : (
          <div
            className="px-5 py-7 text-center"
            style={{ background: tab === 'regular' ? 'linear-gradient(135deg,#1565C0,#283593)' : 'linear-gradient(135deg,#6A0DAD,#4A0C7C)' }}
          >
            <div className="text-xs text-white/75 mb-1">Estimasi Waktu Tunggu</div>
            <div className="flex items-end justify-center gap-1 leading-none">
              <span className="text-[58px] font-bold text-white tracking-tight">~{etaBaru}</span>
              <span className="text-2xl font-semibold text-white mb-2"> mnt</span>
            </div>
            <div className="text-xs text-white/80 mt-2">Untuk kendaraan yang baru mendaftar sekarang</div>
            <div className="flex justify-center mt-3">
              <div className="bg-white/15 rounded-full px-3 py-1 text-xs text-white">{activeCount} kendaraan dalam antrian</div>
            </div>
          </div>
        )}

        <div className="px-4 pt-3 pb-6">
          <div className="flex items-center gap-2 bg-[#EAF3DE] rounded-full px-3.5 py-2 text-xs font-medium text-[#27500A] mb-3 w-fit">
            <span className="w-2 h-2 rounded-full bg-[#1D9E75] animate-pulse" />
            Realtime
          </div>

          <div className="flex gap-2 mb-4">
            {(['regular', 'premium'] as VehicleType[]).map((t) => (
              <button
                key={t}
                className={`flex-1 py-2.5 text-xs font-semibold rounded-xl border-2 transition-all ${
                  tab === t
                    ? t === 'regular'
                      ? 'border-[#185FA5] bg-[#EDF5FF] text-[#185FA5]'
                      : 'border-[#8B44E0] bg-[#F0E6FB] text-[#4A0C7C]'
                    : 'border-[#EAEAE6] bg-white text-[#888] hover:border-[#bbb]'
                }`}
                onClick={() => setTab(t)}
              >
                {t === 'regular' ? 'Regular Wash' : 'Premium Wash'}
                {(t === 'regular' ? regularQueue : premiumQueue).length > 0 && (
                  <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                    tab === t
                      ? t === 'regular' ? 'bg-[#185FA5] text-white' : 'bg-[#8B44E0] text-white'
                      : 'bg-[#EAEAE6] text-[#888]'
                  }`}>
                    {(t === 'regular' ? regularQueue : premiumQueue).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {tab === 'regular' ? (
            <StageStats q={regularQueue} stages={[
              { stage: 'waiting',              label: 'Menunggu',   color: '#BA7517' },
              { stage: 'basah',                label: 'Basah',      color: '#185FA5' },
              { stage: ['kering', 'qc'],       label: 'Kering+QC',  color: '#3B6D11' },
              { stage: 'selesai',              label: 'Selesai',    color: '#1D9E75' },
            ]} />
          ) : (
            <StageStats q={premiumQueue} stages={[
              { stage: 'waiting',              label: 'Tunggu',      color: '#BA7517' },
              { stage: 'basah',                label: 'Basah',       color: '#185FA5' },
              { stage: 'kering',               label: 'Kering',      color: '#3B6D11' },
              { stage: 'antripoles',           label: 'Antri Poles', color: '#D44A9A' },
              { stage: 'poles',                label: 'Poles',       color: '#E06520' },
              { stage: 'selesai',              label: 'Selesai',     color: '#1D9E75' },
            ]} />
          )}

          <p className="text-[11px] font-semibold text-[#999] uppercase tracking-wider mb-2">Status kendaraan</p>

          {activeQueue.length === 0 ? (
            <div className="text-center py-10 text-[#aaa]">
              <div className="text-3xl mb-2">✅</div>
              <p className="text-sm font-semibold text-[#3B6D11]">Antrian kosong!</p>
            </div>
          ) : (
            displayOrder.map((stage) => {
              const group = activeQueue.filter((c) => c.stage === stage);
              if (!group.length) return null;
              const cfg = STAGE_CFG[stage];
              return (
                <div key={stage}>
                  <div className="flex items-center justify-between my-2">
                    <span
                      className="text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{ background: cfg.badgeBg, color: cfg.badgeColor }}
                    >
                      {cfg.label}
                    </span>
                    <span className="text-xs text-[#aaa]">{group.length} kendaraan</span>
                  </div>
                  {group.map((car) => {
                    const eta = etaMenit(car, activeQueue);
                    return (
                      <div key={car.id} className="bg-white border border-[#EAEAE6] rounded-xl px-4 py-3 flex items-center justify-between mb-2">
                        <div>
                          <div className="text-[15px] font-semibold text-[#1a1a1a]">{car.plat}</div>
                          <div className="text-xs text-[#aaa] mt-0.5">{car.merk} · {car.paket}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold" style={{ color: TL_COLORS[stage] }}>~{eta} mnt</div>
                          <div className="text-[11px] text-[#aaa]">est. selesai</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}

         
        </div>
      </div>
    </div>
  );
}
