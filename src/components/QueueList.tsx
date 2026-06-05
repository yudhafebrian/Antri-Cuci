import { ArrowRight, CornerUpLeft, MessageCircle, Info, Trash2, Clock } from 'lucide-react';
import {
  STAGE_CFG,
  MENIT,
  stagesOf,
  waNo,
  type Stage,
  type VehicleType,
} from '../lib/constants';
import { supabase, type QueueRow } from '../lib/supabase';

interface Props {
  queue: QueueRow[];
  type: VehicleType;
  onRefresh: () => void;
  onOpenDetail: (id: string) => void;
  onToast: (msg: string) => void;
}

function etaMenit(car: QueueRow, queueOfType: QueueRow[]): number {
  if (car.stage === 'selesai') return 0;
  const stages = stagesOf(car.type as VehicleType);
  const idx = stages.indexOf(car.stage as Stage);
  const stageTime = car.times[car.stage] ? new Date(car.times[car.stage]).getTime() : Date.now();
  const elapsed = (Date.now() - stageTime) / 60000;

  if (car.stage === 'waiting') {
    const wIdx = queueOfType.filter((c) => c.stage === 'waiting').indexOf(car);
    return MENIT * 2 + MENIT * wIdx;
  }
  const remaining = Math.max(0, Math.round(MENIT - elapsed));
  const stepsLeft = stages.length - idx - 1;
  return remaining + stepsLeft * MENIT;
}

interface CardProps {
  car: QueueRow;
  queuePos: number;
  eta: number;
  onRefresh: () => void;
  onOpenDetail: (id: string) => void;
  onToast: (msg: string) => void;
}

function QueueCard({ car, queuePos, eta, onRefresh, onOpenDetail, onToast }: CardProps) {
  const stages = stagesOf(car.type as VehicleType);
  const idx = stages.indexOf(car.stage as Stage);
  const canNext = idx < stages.length - 1;
  const canUndo = idx > 0;
  const cfg = STAGE_CFG[car.stage as Stage];
  const nextStage = canNext ? stages[idx + 1] : null;
  const prevStage = canUndo ? stages[idx - 1] : null;
  const isDone = car.stage === 'selesai';

  const advance = async () => {
    if (!nextStage) return;
    const newTimes = { ...car.times, [nextStage]: new Date().toISOString() };
    const { error } = await supabase.from('queue').update({ stage: nextStage, times: newTimes }).eq('id', car.id);
    if (error) { onToast('Gagal update: ' + error.message); return; }
    onToast(`${car.plat} → ${STAGE_CFG[nextStage].label}`);
    onRefresh();
  };

  const undo = async () => {
    if (!prevStage) return;
    const newTimes = { ...car.times };
    delete newTimes[car.stage];
    const { error } = await supabase.from('queue').update({ stage: prevStage, times: newTimes }).eq('id', car.id);
    if (error) { onToast('Gagal undo: ' + error.message); return; }
    onToast(`↩ ${car.plat} → ${STAGE_CFG[prevStage].label}`);
    onRefresh();
  };

  const hapus = async () => {
    if (!window.confirm(`Hapus ${car.plat} dari antrian?`)) return;
    const { error } = await supabase.from('queue').delete().eq('id', car.id);
    if (error) { onToast('Gagal hapus: ' + error.message); return; }
    onToast(`${car.plat} dihapus`);
    onRefresh();
  };

  const kirimWA = () => {
    const msgs: Record<string, string> = {
      waiting:    `Halo ${car.nama}! 😊\n\nKendaraannya masih dalam antrian ya kak, estimasi sekitar *${eta} menit* lagi.\n\nTerima kasih sudah sabar menunggu 🙏`,
      basah:      `Halo ${car.nama}! 😊\n\nKendaraannya sudah masuk proses basah ya kak 🚿\n\nTerima kasih 🙏`,
      kering:     `Halo ${car.nama}! 😊\n\nKendaraannya sedang proses pengeringan ya kak 💨\n\nTerima kasih 🙏`,
      antripoles: `Halo ${car.nama}! 😊\n\nKendaraannya sedang menunggu antrian poles ya kak ✨\n\nTerima kasih 🙏`,
      poles:      `Halo ${car.nama}! 😊\n\nKendaraannya sedang dalam proses poles ya kak ✨\n\nTerima kasih 🙏`,
      qc:         `Halo ${car.nama}! 😊\n\nKendaraannya sedang pengecekan akhir (QC) ya kak, sebentar lagi selesai! 🎉\n\nTerima kasih 🙏`,
      selesai:    `Halo ${car.nama}! 🎉\n\nKendaraan *${car.plat}* sudah selesai dan siap diambil ya kak!\n\nTerima kasih sudah mempercayakan kendaraan Anda kepada kami 🙏\n\n*FIP Autoshop*`,
    };
    const teks = msgs[car.stage] ?? '';
    if (teks) window.open(`https://wa.me/${waNo(car.wa)}?text=${encodeURIComponent(teks)}`, '_blank');
  };

  return (
    <div className={`bg-white border rounded-xl p-3 mb-2 transition-all hover:shadow-sm ${isDone ? 'border-[#A8E6CF]' : 'border-[#EAEAE6]'}`}>
      <div className="flex items-start gap-2.5">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5"
          style={{ background: cfg.numBg, color: cfg.numColor }}
        >
          {isDone ? '✓' : queuePos}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-[15px] font-semibold text-[#1a1a1a]">{car.plat}</span>
            <span className="text-[11px] text-[#aaa]">{car.merk}</span>
          </div>
          <div className="text-[12px] text-[#555] mt-0.5">{car.nama}</div>
          <div className="mt-1">
            <span className="text-[11px] text-[#185FA5] bg-[#EDF5FF] px-2 py-0.5 rounded-full">{car.paket} · {car.size}</span>
          </div>
          {!isDone && (
            <div className="flex items-center gap-1 text-[12px] text-[#888] mt-1.5">
              <Clock className="w-3 h-3" />
              Selesai ±{eta} menit lagi
            </div>
          )}
          {isDone && (
            <div className="text-[12px] text-[#1D9E75] font-medium mt-1.5">Selesai dikerjakan ✓</div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2.5 border-t border-[#F0F0EC]">
        {canUndo && prevStage && (
          <button className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-lg border border-[#E6D027] text-[#5A4200] hover:bg-[#FFFAED] transition-all" onClick={undo}>
            <CornerUpLeft className="w-3 h-3" />
            {STAGE_CFG[prevStage].label}
          </button>
        )}
        {canNext && nextStage && (
          <button className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-lg border border-[#A8D4F5] text-[#0C447C] hover:bg-[#EDF5FF] transition-all" onClick={advance}>
            <ArrowRight className="w-3 h-3" />
            {STAGE_CFG[nextStage].label}
          </button>
        )}
        <button className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-lg border border-[#BBEECC] text-[#1a7a42] hover:bg-[#F0FBF3] transition-all" onClick={kirimWA}>
          <MessageCircle className="w-3 h-3" />
          WA
        </button>
        <button className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-lg border border-[#D0C8F0] text-[#3D2B8C] hover:bg-[#F0EEFF] transition-all" onClick={() => onOpenDetail(car.id)}>
          <Info className="w-3 h-3" />
          Detail
        </button>
        <button className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-lg border border-[#F0CECE] text-[#A32D2D] hover:bg-[#FCEBEB] transition-all" onClick={hapus}>
          <Trash2 className="w-3 h-3" />
          Hapus
        </button>
      </div>
    </div>
  );
}

export default function QueueList({ queue, type, onRefresh, onOpenDetail, onToast }: Props) {
  const filtered = queue.filter((c) => c.type === type);
  const stages = stagesOf(type);
  // Show from last stage (Selesai) down to Menunggu so newest progress is at top
  const displayOrder = [...stages].reverse();

  return (
    <div>
      {displayOrder.map((stage) => {
        const group = filtered.filter((c) => c.stage === stage);
        const cfg = STAGE_CFG[stage];
        return (
          <div key={stage}>
            <div className="flex items-center gap-2 mt-4 mb-2">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cfg.dotColor }} />
              <span className="text-[12px] font-semibold text-[#555]">{cfg.label}</span>
              <span className="text-[11px] text-[#aaa] ml-auto">
                {group.length > 0 ? `${group.length} kendaraan` : 'kosong'}
              </span>
            </div>
            {group.length === 0 ? (
              <div className="bg-white border border-dashed border-[#EAEAE6] rounded-xl px-4 py-3 text-center text-[12px] text-[#ccc] mb-1">
                Tidak ada kendaraan
              </div>
            ) : (
              group.map((car) => (
                <QueueCard
                  key={car.id}
                  car={car}
                  queuePos={filtered.indexOf(car) + 1}
                  eta={etaMenit(car, filtered)}
                  onRefresh={onRefresh}
                  onOpenDetail={onOpenDetail}
                  onToast={onToast}
                />
              ))
            )}
          </div>
        );
      })}
    </div>
  );
}
