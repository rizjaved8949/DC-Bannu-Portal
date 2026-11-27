import { createContext } from "react";

export interface RegisterPosition {
  scope: string;
  page: number;
  size: number;
  top: number;
  left: number;
}

/** In-memory presentation state for returning from a record to its register. */
export const RegisterNavigationContext = createContext<Map<string, RegisterPosition> | null>(null);
