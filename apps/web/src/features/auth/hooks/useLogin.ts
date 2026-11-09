import { loginRequest, type LoginRequest } from "@face/shared";
import { useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { HttpError } from "../../../services/http/client";
import { login } from "../services/auth-api";

export const useLogin = () => {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  const navigate = useNavigate();
  const [search] = useSearchParams();

  const submit = async (credentials: LoginRequest) => {
    if (submitting.current) return;
    const result = loginRequest.safeParse(credentials);
    if (!result.success) {
      setError("请填写有效的账号和密码。");
      return;
    }
    submitting.current = true;
    setPending(true);
    setError("");
    try {
      await login(result.data);
      void navigate(search.get("next") === "/resumes" ? "/resumes" : "/", { replace: true });
    } catch (cause) {
      setError(cause instanceof HttpError && cause.status === 401
        ? "账号或密码错误。"
        : "暂时无法登录，请确认本机服务已启动后重试。");
    } finally {
      submitting.current = false;
      setPending(false);
    }
  };

  return { submit, pending, error };
};
