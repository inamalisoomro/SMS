/**
 * whatsapp/useWhatsApp.ts — React hook exposing outbox counts, gateway health,
 * last sync time, and inbox unread count.
 */

import { useState, useEffect, useCallback } from 'react';
import { dbInstance } from '../database';
import { checkGatewayHealth } from './apiClient';
import { getOutboxCounts } from './outbox';
import type { WhatsAppOutboxStatus } from '../types';

export interface WhatsAppState {
  enabled: boolean;
  outboxCounts: Partial<Record<WhatsAppOutboxStatus, number>>;
  failedCount: number;
  pendingCount: number;
  unreadInboxCount: number;
  gatewayReachable: boolean | null; // null = not checked yet
  gatewayMode: 'live' | 'mock' | null;
  lastSyncAt: number | null;
  refresh: () => Promise<void>;
}

export function useWhatsApp(): WhatsAppState {
  const [enabled, setEnabled] = useState(false);
  const [outboxCounts, setOutboxCounts] = useState<Partial<Record<WhatsAppOutboxStatus, number>>>({});
  const [unreadInboxCount, setUnreadInboxCount] = useState(0);
  const [gatewayReachable, setGatewayReachable] = useState<boolean | null>(null);
  const [gatewayMode, setGatewayMode] = useState<'live' | 'mock' | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      // Check if WhatsApp is enabled in settings
      const raw = localStorage.getItem('sams_settings');
      const isEnabled = raw
        ? (JSON.parse(raw) as { whatsappEnabled?: boolean }).whatsappEnabled === true
        : false;
      setEnabled(isEnabled);

      if (!isEnabled) return;

      // Outbox counts
      const counts = await getOutboxCounts();
      setOutboxCounts(counts);

      // Inbox unread
      const unread = await dbInstance.getUnreadWhatsAppInboxCount();
      setUnreadInboxCount(unread);

      // Last sync time
      const cursor = await dbInstance.getSyncState('whatsapp_events_cursor');
      if (cursor !== null) {
        setLastSyncAt(Date.now()); // approximate — cursor updated means sync ran
      }

      // Gateway health (non-blocking)
      const health = await checkGatewayHealth();
      if (health.ok) {
        setGatewayReachable(true);
        setGatewayMode(health.data.mode as 'live' | 'mock');
      } else {
        setGatewayReachable(false);
        setGatewayMode(null);
      }
    } catch (err) {
      console.error('[useWhatsApp] refresh error:', err);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30_000);
    return () => clearInterval(interval);
  }, [refresh]);

  const failedCount = outboxCounts['failed'] ?? 0;
  const pendingCount = (outboxCounts['queued'] ?? 0) + (outboxCounts['sending'] ?? 0);

  return {
    enabled,
    outboxCounts,
    failedCount,
    pendingCount,
    unreadInboxCount,
    gatewayReachable,
    gatewayMode,
    lastSyncAt,
    refresh,
  };
}

/**
 * Simple hook to track online/offline state.
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  return isOnline;
}
