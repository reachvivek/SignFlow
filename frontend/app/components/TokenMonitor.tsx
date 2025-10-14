/**
 * Token Expiry Monitor Component
 * Automatically monitors JWT token expiry and logs out user
 */

import { useEffect } from 'react';
import { useSubmit } from '@remix-run/react';
import { startTokenMonitoring } from '~/utils/token-monitor.client';

export function TokenMonitor() {
  const submit = useSubmit();

  useEffect(() => {
    // Start monitoring token expiry
    const cleanup = startTokenMonitoring(() => {
      // Logout on token expiry
      submit(null, { method: 'post', action: '/logout' });
    });

    return cleanup;
  }, [submit]);

  return null; // This component doesn't render anything
}
