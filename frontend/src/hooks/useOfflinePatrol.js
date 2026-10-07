import { useCallback, useEffect, useState } from 'react';
import { get, errorMessage } from '../services/api';
import {
  cachePatrol,
  cachedPatrol,
  listWaypoints,
} from '../services/offlineWaypoints';

export function useOfflinePatrol(id, userId) {
  const [data, setData] = useState(null);
  const [points, setPoints] = useState([]);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((value) => value + 1), []);
  useEffect(() => {
    let active = true;
    setData(null);
    setError('');
    async function load() {
      try {
        const patrol = await get(`/patrols/${id}`);
        if (active) setData(patrol);
        await cachePatrol(userId, patrol).catch(() => {});
      } catch (failure) {
        const cached =
          !failure.response || failure.response.status >= 500
            ? await cachedPatrol(userId, id).catch(() => null)
            : null;
        if (active) {
          if (cached) setData(cached);
          else setError(errorMessage(failure));
        }
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [id, userId, version]);
  useEffect(() => {
    let active = true;
    const update = async () => {
      const records = await listWaypoints(userId, id).catch(() => []);
      if (active) setPoints(records);
      const cached = await cachedPatrol(userId, id).catch(() => null);
      if (active && cached) setData(cached);
    };
    update();
    window.addEventListener('waypoints-changed', update);
    return () => {
      active = false;
      window.removeEventListener('waypoints-changed', update);
    };
  }, [id, userId]);
  return { data, points, error, loading: !data && !error, reload };
}
