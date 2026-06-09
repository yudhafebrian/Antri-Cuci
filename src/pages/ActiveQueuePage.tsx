/**
 * ActiveQueuePage.tsx
 * Route: /report/active-queue
 * Auth-gated. Detects screen width and renders desktop or mobile view.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSession } from '../lib/auth';
import ActiveQueueDesktop from '../components/active-queue/ActiveQueueDesktop';
import ActiveQueueMobile from '../components/active-queue/ActiveQueueMobile';

const MOBILE_BREAKPOINT = 768;

export default function ActiveQueuePage() {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const session = getSession();
    if (!session) {
      navigate('/admin');
      return;
    }

    // Initial check
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);

    // Listen to resize
    const handler = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [navigate]);

  // Wait until we know screen size to avoid flash
  if (isMobile === null) return null;

  return isMobile ? <ActiveQueueMobile /> : <ActiveQueueDesktop />;
}
