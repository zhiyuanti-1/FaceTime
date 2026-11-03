import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@face/shared";
import { coreApi } from "../services/repositories/core-api";
import { RequestError } from "../services/http/client";
type Auth = {
  user: User | null;
  checking: boolean;
  connectionError: string;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};
const Context = createContext<Auth | undefined>(undefined);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [connectionError, setConnectionError] = useState("");
  useEffect(() => {
    let active = true;
    coreApi
      .me()
      .then((value) => {
        if (active) setUser(value);
      })
      .catch((error) => {
        if (active && !(error instanceof RequestError && error.status === 401))
          setConnectionError("无法连接后端，请确认npm run dev已启动两个服务");
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    const expired = () => setUser(null);
    window.addEventListener("face:unauthorized", expired);
    return () => {
      active = false;
      window.removeEventListener("face:unauthorized", expired);
    };
  }, []);
  async function login(username: string, password: string) {
    const value = await coreApi.login(username, password);
    setUser(value);
    setConnectionError("");
  }
  async function logout() {
    await coreApi.logout();
    setUser(null);
  }
  return (
    <Context.Provider
      value={{ user, checking, connectionError, login, logout }}
    >
      {children}
    </Context.Provider>
  );
}
export function useAuth() {
  const value = useContext(Context);
  if (!value) throw new Error("Missing AuthProvider");
  return value;
}
