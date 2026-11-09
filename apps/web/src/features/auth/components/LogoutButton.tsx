import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { logout } from "../services/auth-api";

export const LogoutButton = () => {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const navigate = useNavigate();

  const submit = async () => {
    setPending(true);
    setFailed(false);
    try {
      await logout();
      void navigate("/login", { replace: true });
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <button type="button" disabled={pending} onClick={() => void submit()}>
        {pending ? "正在退出…" : "退出登录"}
      </button>
      {failed && <p className="prismNotice" role="alert">退出失败，请重试。</p>}
    </>
  );
};
