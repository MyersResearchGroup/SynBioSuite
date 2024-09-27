import axios from 'axios';

export default function handleLogin(instance, email, password) {
  const attemptLogin = async () => {
    console.log("TRYING TO LOGIN");
    try {
      const response = await axios.post(`https://synbiohub.colorado.edu/login`, {
        "email": `${email}`,
        "password": `${password}`
      }, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Accept': 'text/plain'
        }
      });
      console.log(response)
      console.log("LOGIN ATTEMPTED");
      const token = response.data;
      console.log(token)
      if (response.data) {
        const userResponse = await axios.get("https://synbiohub.colorado.edu/profile", {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'X-authorization': `${token}`,
            'Accept': 'text/plain'
          },
        });
        console.log(userResponse.data);
        return ('Login success.')
      }
    } catch (err) {
      console.log(err)
      console.log('Login failed')
      return ('Login failed. Please check your credentials.')
    }
  }

  attemptLogin();
}