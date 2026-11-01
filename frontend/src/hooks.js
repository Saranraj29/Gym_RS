import { useCallback, useEffect, useRef, useState } from 'react'

/** Fetch on mount / when deps change. `reload()` refetches without flashing the skeleton. */
export function useFetch(fn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null })
  const alive = useRef(true)
  const run = useCallback(
    (silent = false) => {
      if (!silent) setState((s) => ({ ...s, loading: true, error: null }))
      return fn()
        .then((data) => alive.current && setState({ data, loading: false, error: null }))
        .catch((error) => alive.current && setState((s) => ({ ...s, loading: false, error })))
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps,
  )
  useEffect(() => {
    alive.current = true
    run()
    return () => {
      alive.current = false
    }
  }, [run])
  return { ...state, reload: () => run(true) }
}

export function useDebounced(value, ms = 250) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}
