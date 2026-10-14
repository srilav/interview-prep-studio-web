import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

const STORAGE_KEY = "prepstudio.learner";

function readStored(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

type LearnerContextValue = { name: string; setName: (name: string) => void };

const LearnerContext = createContext<LearnerContextValue>({ name: "", setName: () => {} });

export function LearnerProvider({ children }: { children: ReactNode }) {
  const [name, setNameState] = useState(readStored);
  const setName = useCallback((next: string) => {
    const trimmed = next.trim();
    setNameState(trimmed);
    try {
      localStorage.setItem(STORAGE_KEY, trimmed);
    } catch {
      // Storage can be blocked; the name still lasts for this session.
    }
  }, []);
  return <LearnerContext.Provider value={{ name, setName }}>{children}</LearnerContext.Provider>;
}

export function useLearner(): LearnerContextValue {
  return useContext(LearnerContext);
}
