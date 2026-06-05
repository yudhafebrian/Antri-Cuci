import { useState } from 'react';
import QueueForm from './QueueForm';
import QueueList from './QueueList';
import DetailModal from './DetailModal';
import { type QueueRow } from '../lib/supabase';
import { type VehicleType } from '../lib/constants';

interface Props {
  queue: QueueRow[];
  onRefresh: () => void;
  onToast: (msg: string) => void;
}

export default function AdminView({ queue, onRefresh, onToast }: Props) {
  const [queueTab, setQueueTab] = useState<VehicleType>('regular');
  const [detailId, setDetailId] = useState<string | null>(null);

  const regularQueue = queue.filter((c) => c.type === 'regular');
  const premiumQueue = queue.filter((c) => c.type === 'premium');

  const StatCard = ({ count, label, color }: { count: number; label: string; color: string }) => (
    <div className="bg-white border border-[#EAEAE6] rounded-xl py-2 px-1 text-center">
      <div className="text-lg font-semibold" style={{ color }}>{count}</div>
      <div className="text-[9px] text-[#888] mt-0.5 leading-tight">{label}</div>
    </div>
  );

  return (
    <div>
      <div className="px-4 py-4">
        <p className="text-[11px] font-semibold text-[#999] uppercase tracking-wider mb-2">Daftarkan kendaraan baru</p>
        <QueueForm queue={queue} onAdded={onRefresh} />

        <div className="mt-2">
          <p className="text-[11px] font-semibold text-[#999] uppercase tracking-wider mb-2">Antrian</p>

          {/* Sub-tabs with count badge */}
          <div className="flex gap-2 mb-3">
            {(['regular', 'premium'] as VehicleType[]).map((t) => (
              <button
                key={t}
                className={`flex-1 py-2.5 text-xs font-semibold rounded-xl border-2 transition-all ${
                  queueTab === t
                    ? t === 'regular'
                      ? 'border-[#185FA5] bg-[#EDF5FF] text-[#185FA5]'
                      : 'border-[#8B44E0] bg-[#F0E6FB] text-[#4A0C7C]'
                    : 'border-[#EAEAE6] bg-white text-[#888] hover:border-[#bbb]'
                }`}
                onClick={() => setQueueTab(t)}
              >
                {t === 'regular' ? 'Regular Wash' : 'Premium Wash'}
                {(t === 'regular' ? regularQueue : premiumQueue).filter((c) => c.stage !== 'selesai').length > 0 && (
                  <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                    queueTab === t
                      ? t === 'regular' ? 'bg-[#185FA5] text-white' : 'bg-[#8B44E0] text-white'
                      : 'bg-[#EAEAE6] text-[#888]'
                  }`}>
                    {(t === 'regular' ? regularQueue : premiumQueue).filter((c) => c.stage !== 'selesai').length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Per-tab stats */}
          {queueTab === 'regular' ? (
            <div className="grid grid-cols-4 gap-1.5 mb-3">
              <StatCard count={regularQueue.filter((c) => c.stage === 'waiting').length} label="Menunggu" color="#BA7517" />
              <StatCard count={regularQueue.filter((c) => c.stage === 'basah').length} label="Basah" color="#185FA5" />
              <StatCard count={regularQueue.filter((c) => c.stage === 'kering' || c.stage === 'qc').length} label="Kering & QC" color="#3B6D11" />
              <StatCard count={regularQueue.filter((c) => c.stage === 'selesai').length} label="Selesai" color="#1D9E75" />
            </div>
          ) : (
            <div className="grid grid-cols-6 gap-1 mb-3">
              <StatCard count={premiumQueue.filter((c) => c.stage === 'waiting').length} label="Tunggu" color="#BA7517" />
              <StatCard count={premiumQueue.filter((c) => c.stage === 'basah').length} label="Basah" color="#185FA5" />
              <StatCard count={premiumQueue.filter((c) => c.stage === 'kering').length} label="Kering" color="#3B6D11" />
              <StatCard count={premiumQueue.filter((c) => c.stage === 'antripoles').length} label="Antri Poles" color="#D44A9A" />
              <StatCard count={premiumQueue.filter((c) => c.stage === 'poles').length} label="Poles" color="#E06520" />
              <StatCard count={premiumQueue.filter((c) => c.stage === 'selesai').length} label="Selesai" color="#1D9E75" />
            </div>
          )}
        </div>

        <QueueList
          queue={queue}
          type={queueTab}
          onRefresh={onRefresh}
          onOpenDetail={setDetailId}
          onToast={onToast}
        />
      </div>

      <DetailModal
        carId={detailId}
        queue={queue}
        onClose={() => setDetailId(null)}
        onRefresh={onRefresh}
        onToast={onToast}
      />
    </div>
  );
}
