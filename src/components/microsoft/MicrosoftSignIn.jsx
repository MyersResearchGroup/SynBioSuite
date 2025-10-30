import { handleLogin } from "../../microsoft-utils/auth";
import microsoftLogo from '../../icons/microsoft-logo.svg';

export default function MicrosoftSignInButton() {
  return (
    <button
      onClick={handleLogin}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "10px",
        border: "1px solid #ccc",
        padding: "8px 16px",
        borderRadius: "4px",
        backgroundColor: "#fff",
        cursor: "pointer",
        fontSize: "16px",
        fontFamily: "Segoe UI, Helvetica, Arial, sans-serif",
        color: "#000",
      }}
    >
      <img
        src={microsoftLogo}
        alt="Microsoft"
        style={{ width: 20, height: 20 }}
      />
      <span>
        Sign in with Microsoft
      </span>
    </button>
  );
}