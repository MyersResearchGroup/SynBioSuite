import { Text } from "@mantine/core";
import { handleLogout } from "../../microsoft-utils/auth/handleLogout";

export default function MicrosoftSignOutButton() {
    return (
        <button
            onClick={handleLogout}
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "10px",
                padding: "8px 16px",
                borderRadius: "4px",
                backgroundColor: "#d20c0cff",
                cursor: "pointer",
                color: "#fff",
                marginTop: "10px"
            }}
        >
            <Text>
                Sign Out
            </Text>
        </button>
    );
}