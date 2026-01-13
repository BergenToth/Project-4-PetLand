import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "./api.js";

export default function Login({ onLogin }) {
  const nav = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");

  function change(name, value) {
    setForm({ ...form, [name]: value });
    setError("");
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      const r = await api.login(form);
      onLogin(r.user);
      nav("/dashboard");
    } catch (err) {
      setError(err.message || "Invalid username or password");
    }
  }

  return (
    <div className="page">
      <form className="card" onSubmit={submit}>
        <div className="topbar">
          <strong>Login</strong>
          <Link to="/register">Register</Link>
        </div>

        <div className="row">
          <div className="label">Username</div>
          <input className="input" value={form.username} onChange={(e) => change("username", e.target.value)} />
          <div />
        </div>

        <div className="row">
          <div className="label">Password</div>
          <input className="input" type="password" value={form.password} onChange={(e) => change("password", e.target.value)} />
          <div />
        </div>

        {error ? <div className="errorRight" style={{ marginBottom: 10 }}>{error}</div> : null}

        <button className="btnPrimary" type="submit">Login</button>
      </form>
    </div>
  );
}
