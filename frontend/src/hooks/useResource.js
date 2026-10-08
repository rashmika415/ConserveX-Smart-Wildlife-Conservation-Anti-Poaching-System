import { useCallback, useEffect, useState } from 'react';
import { get, errorMessage } from '../services/api';
export function useResource(path, poll = false) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((value) => value + 1), []);
  useEffect(() => {
    let active = true;
    setData(null);
    setError('');
    get(path)
      .then((result) => {
        if (active) setData(result);
      })
      .catch((error) => {
        if (active) setError(errorMessage(error));
      });
    return () => {
      active = false;
    };
  }, [path, version]);
  useEffect(() => {
    if (poll) {
      const id = setInterval(reload, 30000);
      return () => clearInterval(id);
    }
  }, [poll, reload]);
  return { data, error, loading: !data && !error, reload };
}
