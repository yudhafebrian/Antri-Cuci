import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSession } from '../lib/auth';
import ReportDesktop from '../components/report/ReportDesktop';

export default function ReportPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const session = getSession();
    if (!session) {
      navigate('/admin');
    }
  }, [navigate]);

  return <ReportDesktop />;
}
