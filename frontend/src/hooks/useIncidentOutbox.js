import { useCallback, useEffect, useRef, useState } from 'react';
import {
  incidentOutboxEvent,
  listOfflineIncidents,
  syncOfflineIncidents,
} from '../services/incidentOutbox';

export function useIncidentOutbox(userId) {
  const [records, setRecords] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const syncingRef = useRef(false);
  const [storageError, setStorageError] = useState('');
  const refresh = useCallback(async () => {
    try {
      setRecords(await listOfflineIncidents(userId));
      setStorageError('');
    } catch {
      setStorageError('Offline reports could not be read on this device.');
    }
  }, [userId]);
  const sync = useCallback(async () => {
    if (!userId || !navigator.onLine || syncingRef.current) return;
    syncingRef.current = true;
    setSyncing(true);
    try {
      await syncOfflineIncidents(userId);
      await refresh();
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [refresh, userId]);
  useEffect(() => {
    refresh();
  }, [refresh]);
  useEffect(() => {
    const onChange = () => refresh();
    const onOnline = () => sync();
    window.addEventListener(incidentOutboxEvent, onChange);
    window.addEventListener('online', onOnline);
    window.addEventListener('incident-synced', onChange);
    if (navigator.onLine) sync();
    return () => {
      window.removeEventListener(incidentOutboxEvent, onChange);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('incident-synced', onChange);
    };
  }, [refresh, sync]);
  return { records, syncing, sync, storageError };
}
