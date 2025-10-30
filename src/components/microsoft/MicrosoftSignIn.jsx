export default function MicrosoftSignInButton({ onClick }) {
  return (
    <button
      onClick={onClick}
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
        src="https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg"
        alt="Microsoft"
        style={{ width: 20, height: 20 }}
      />
      <span>
        Sign in with Microsoft
      </span>
    </button>
  );
}