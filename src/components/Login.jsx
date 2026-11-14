import { useState } from "react";
import { loginUser } from "../services/api";
import "./Registration.css";

function Login({ onClose, onRegister, onLogin }) {  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();

    try {
        
        console.log("Login button clicked");
      const result = await loginUser({ phone, password });
        console.log("Login API response:", result);

localStorage.setItem("token", result.token);
localStorage.setItem("user", JSON.stringify(result.user));

onLogin(result.user);
alert("Login successful! Welcome " + result.user.name);    } catch (error) {
      alert(error.message);
    }
  }

  return (
<div className="registration-overlay">      <div className="registration-box">
        <button className="registration-close" onClick={onClose}>
          ×
        </button>

        <h2>Welcome Back!</h2>
        <p>Login to your FreshConnect account</p>

<form className="registration-form" onSubmit={handleSubmit}>          <label>Mobile Number</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            maxLength="10"
            pattern="[0-9]{10}"
            placeholder="Enter mobile number"
            required
          />

          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            required
          />

<button type="submit" className="registration-submit">            Login
          </button>
        </form>

        <p>
          Don't have an account?{" "}
          <button type="button" onClick={onRegister}>
            Register
          </button>
        </p>
      </div>
    </div>
  );
}

export default Login;