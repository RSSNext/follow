/**
 * @see https://github.com/streamich/react-use/blob/master/src/useSetState.ts
 */
import { useCallback, useState } from "react"

export const useSetState = <T extends object>(
  initialState: T = {} as T,
): [T, (patch: Partial<T> | ((prevState: T) => Partial<T>)) => void] => {
  const [state, set] = useState<T>(initialState)
  const setState = useCallback((patch) => {
    set((prevState) =>
      Object.assign({}, prevState, patch instanceof Function ? patch(prevState) : patch),
    )
  }, [])

  return [state, setState]
}
