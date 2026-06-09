import { useNavigate } from 'react-router-dom';
import { clearSession } from '../../lib/auth';

interface ReportHeaderProps {
  displayName?: string;
}

export default function ReportHeader({ displayName }: ReportHeaderProps) {
  const navigate = useNavigate();

  const handleLogout = () => {
    clearSession();
    navigate('/admin');
  };

  return (
    <div className="bg-white border-b border-[#E8E8E4] px-4 py-3.5 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-2 text-[17px] font-semibold text-[#1a1a1a]">
        <img src="/Logo-FIP-Black-Transparent-NoText.webp" alt="FIP" className="h-6 w-auto object-contain" />
        FIP Autoshop
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate('/admin')}
          className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#E6F1FB] text-[#0C447C] hover:bg-[#D4E6F5] transition-all cursor-pointer"
        >
          {displayName || 'Admin'}
        </button>
        <button
          onClick={handleLogout}
          className="text-xs text-[#A32D2D] hover:text-[#D04D4D] font-medium px-2 py-1 rounded-lg hover:bg-[#FFE8E8] transition-all cursor-pointer"
        >
          Logout
        </button>
      </div>
    </div>
  );
}