import { ArrowRight, CornerUpLeft, MessageCircle, Info, X, CheckCheck, Clock } from 'lucide-react';
import {
  STAGE_CFG,
  MENIT,
  stagesOf,
  waNo,
  fmtRp,
  type Stage,
  type WorkflowType,
} from '../lib/constants';
import { updateServiceOrder, cancelServiceOrder, markOrderPickedUp, type ServiceOrderRow } from '../lib/db';

interface Props {
  queue: ServiceOrderRow[];
  workflowType: WorkflowType;
  onRefresh: () => void;
  onOpenDetail: (id: string) => void;
  onToast: (msg: string) => void;
}

function etaMenit(order: ServiceOrderRow, queueOfType: ServiceOrderRow[]): number {
  const stages = stagesOf(order.workflow_type as WorkflowType);
  const idx = stages.indexOf(order.current_status as Stage);
  const stageTime = order.times[order.current_status]
    ? new Date(order.times[order.current_status]!).getTime()
    : Date.now();
  const elapsed = (Date.now() - stageTime) / 60000;

  if (order.current_status === 'menunggu') {
    const wIdx = queueOfType.filter((c) => c.current_status === 'menunggu').indexOf(order);
    return MENIT * 2 + MENIT * wIdx;
  }
  const remaining = Math.max(0, Math.round(MENIT - elapsed));
  const stepsLeft = stages.length - idx - 1;
  return remaining + stepsLeft * MENIT;
}

interface CardProps {
  order: ServiceOrderRow;
  queuePos: number;
  eta: number;
  onRefresh: () => void;
  onOpenDetail: (id: string) => void;
  onToast: (msg: string) => void;
}

function QueueCard({ order, queuePos, eta, onRefresh, onOpenDetail, onToast }: CardProps) {
  const stages = stagesOf(order.workflow_type as WorkflowType);
  const idx = stages.indexOf(order.current_status as Stage);
  const canNext = idx < stages.length - 1;
  const canUndo = idx > 0;
  const cfg = STAGE_CFG[order.current_status as Stage] ?? STAGE_CFG['menunggu'];
  const nextStage = canNext ? stages[idx + 1] : null;
  const prevStage = canUndo ? stages[idx - 1] : null;
  const isDone = order.current_status === 'selesai';

  const advance = async () => {
    if (!nextStage) return;
    const newTimes = { ...order.times, [nextStage]: new Date().toISOString() };
    const success = await updateServiceOrder(order.id, { current_status: nextStage, times: newTimes });
    if (!success) { onToast('Gagal update'); return; }
    onToast(`${order.plate_number} → ${STAGE_CFG[nextStage].label}`);
    onRefresh();
  };

  const undo = async () => {
    if (!prevStage) return;
    const newTimes = { ...order.times, [order.current_status]: null };
    const success = await updateServiceOrder(order.id, { current_status: prevStage, times: newTimes });
    if (!success) { onToast('Gagal undo'); return; }
    onToast(`↩ ${order.plate_number} → ${STAGE_CFG[prevStage].label}`);
    onRefresh();
  };

  const cancel = async () => {
    if (!window.confirm(`Batalkan ${order.plate_number} dari antrian?`)) return;
    const success = await cancelServiceOrder(order.id);
    if (!success) { onToast('Gagal batalkan'); return; }
    onToast(`${order.plate_number} dibatalkan`);
    onRefresh();
  };

  const pickUp = async () => {
    if (!window.confirm(`Tandai ${order.plate_number} sudah diambil?`)) return;
    const success = await markOrderPickedUp(order.id);
    if (!success) { onToast('Gagal update'); return; }
    onToast(`${order.plate_number} sudah diambil ✓`);
    onRefresh();
  };

  const kirimWA = () => {
    const msgs: Record<string, string> = {
      menunggu:   `Halo ${order.owner_name}! 😊\n\nKendaraannya masih dalam antrian ya kak, estimasi sekitar *${eta} menit* lagi.\n\nTerima kasih sudah sabar menunggu 🙏`,
      basah:      `Halo ${order.owner_name}! 😊\n\nKendaraannya sudah masuk proses basah ya kak 🚿\n\nTerima kasih 🙏`,
      kering:     `Halo ${order.owner_name}! 😊\n\nKendaraannya sedang proses pengeringan ya kak 💨\n\nTerima kasih 🙏`,
      antri_poles:`Halo ${order.owner_name}! 😊\n\nKendaraannya sedang menunggu antrian poles ya kak ✨\n\nTerima kasih 🙏`,
      poles:      `Halo ${order.owner_name}! 😊\n\nKendaraannya sedang dalam proses poles ya kak ✨\n\nTerima kasih 🙏`,
      qc:         `Halo ${order.owner_name}! 😊\n\nKendaraannya sedang pengecekan akhir (QC) ya kak, sebentar lagi selesai! 🎉\n\nTerima kasih 🙏`,
      selesai:    `Halo ${order.owner_name}! 🎉\n\nKendaraan *${order.plate_number}* sudah selesai dan siap diambil ya kak!\n\nTerima kasih sudah mempercayakan kendaraan Anda kepada kami 🙏\n\n*FIP Autoshop*`,
    };
    const teks = msgs[order.current_status] ?? '';
    if (teks) window.open(`https://wa.me/${waNo(order.whatsapp_number)}?text=${encodeURIComponent(teks)}`, '_blank');
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
            <span className="text-[15px] font-semibold text-[#1a1a1a]">{order.plate_number}</span>
            <span className="text-[11px] text-[#aaa]">{order.vehicle_name}</span>
          </div>
          <div className="text-[12px] text-[#555] mt-0.5">{order.owner_name}</div>
          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-[#185FA5] bg-[#EDF5FF] px-2 py-0.5 rounded-full">{order.package_name}{order.variant_name !== 'All Size' ? ` · ${order.variant_name}` : ''}</span>
            <span className="text-[11px] text-[#888]">{fmtRp(order.package_price)}</span>
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
        {isDone && (
          <button className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-lg border border-[#A8E6CF] text-[#0A4D31] bg-[#D4F5E9] hover:bg-[#A8E6CF] transition-all" onClick={pickUp}>
            <CheckCheck className="w-3 h-3" />
            Diambil
          </button>
        )}
        <button className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-lg border border-[#BBEECC] text-[#1a7a42] hover:bg-[#F0FBF3] transition-all" onClick={kirimWA}>
          <MessageCircle className="w-3 h-3" />
          WA
        </button>
        <button className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-lg border border-[#D0C8F0] text-[#3D2B8C] hover:bg-[#F0EEFF] transition-all" onClick={() => onOpenDetail(order.id)}>
          <Info className="w-3 h-3" />
          Detail
        </button>
        <button className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-lg border border-[#F0CECE] text-[#A32D2D] hover:bg-[#FCEBEB] transition-all" onClick={cancel}>
          <X className="w-3 h-3" />
          Batal
        </button>
      </div>
    </div>
  );
}

export default function QueueList({ queue, workflowType, onRefresh, onOpenDetail, onToast }: Props) {
  const filtered = queue.filter((c) => c.workflow_type === workflowType);
  const stages = stagesOf(workflowType);
  // Show from last stage (Selesai) down to Menunggu so newest progress is at top
  const displayOrder = [...stages].reverse();

  return (
    <div>
      {displayOrder.map((stage) => {
        const group = filtered.filter((c) => c.current_status === stage);
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
              group.map((order) => (
                <QueueCard
                  key={order.id}
                  order={order}
                  queuePos={filtered.indexOf(order) + 1}
                  eta={etaMenit(order, filtered)}
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
