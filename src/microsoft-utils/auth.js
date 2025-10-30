export const handleLogin = () => {
        const client_id = import.meta.env.VITE_CLIENT_ID;
        const redirect_uri = encodeURIComponent("http://localhost:3000/cloud-home");
        const url =
            `https://login.microsoftonline.com/common/oauth2/v2.0/authorize` +
            `?client_id=${client_id}` +
            `&scope=openid%20profile%20email%20User.Read` +
            `&redirect_uri=${redirect_uri}`;

        window.location.href = url;
    };