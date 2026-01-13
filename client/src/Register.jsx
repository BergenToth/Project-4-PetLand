import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "./api.js";

function validate(v) {
  const e = {};

  if (!v.username.trim()) e.username = "Username required";
  else if (v.username.trim().length < 3) e.username = "Min 3 characters";
  else if (!/^[a-zA-Z0-9_]+$/.test(v.username.trim())) e.username = "Letters/numbers/_ only";

  if (!v.password) e.password = "Password required";
  else if (v.password.length < 8) e.password = "Min 8 characters";
  else if (!/[0-9]/.test(v.password)) e.password = "Must include a number";

  if (!v.confirmPassword) e.confirmPassword = "Confirm password";
  else if (v.password !== v.confirmPassword) e.confirmPassword = "Passwords do not match";

  if (!v.acceptedTerms) e.acceptedTerms = "You must accept the terms";

  return e;
}

export default function Register({ onRegister }) {
  const nav = useNavigate();
  const [form, setForm] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    acceptedTerms: false
  });

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");

  function setField(name, value) {
    setForm({ ...form, [name]: value });

    // spec: error disappears when that field changes
    const next = { ...errors };
    delete next[name];
    if (name === "password" || name === "confirmPassword") delete next.confirmPassword;
    setErrors(next);

    setServerError("");
  }

  const termsClass = useMemo(() => (errors.acceptedTerms ? "redText" : ""), [errors.acceptedTerms]);

  async function submit(e) {
    e.preventDefault();
    setServerError("");

    const e2 = validate(form);
    setErrors(e2);
    if (Object.keys(e2).length) return;

    try {
      const r = await api.register(form);
      onRegister(r.user);
      nav("/dashboard");
    } catch (err) {
      setServerError(err.message || "Register failed");
    }
  }

  return (
    <div className="page">
      <form className="card" onSubmit={submit}>
        <div className="topbar">
          <strong>Register</strong>
          <Link to="/login">Back to Login</Link>
        </div>

        <div className="row">
          <div className="label">Username</div>
          <input className="input" value={form.username} onChange={(e) => setField("username", e.target.value)} />
          <div className="errorRight">{errors.username || ""}</div>
        </div>

        <div className="row">
          <div className="label">Password</div>
          <input className="input" type="password" value={form.password} onChange={(e) => setField("password", e.target.value)} />
          <div className="errorRight">{errors.password || ""}</div>
        </div>

        <div className="row">
          <div className="label">Confirm</div>
          <input className="input" type="password" value={form.confirmPassword} onChange={(e) => setField("confirmPassword", e.target.value)} />
          <div className="errorRight">{errors.confirmPassword || ""}</div>
        </div>

        <div className="row">
          <div className="label">Terms</div>
          <label className={termsClass} style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input type="checkbox" checked={form.acceptedTerms} onChange={(e) => setField("acceptedTerms", e.target.checked)} />
            I agree to the terms
          </label>
          <div className="errorRight">{errors.acceptedTerms || ""}</div>
        </div>

        {serverError ? <div className="errorRight" style={{ marginBottom: 10 }}>{serverError}</div> : null}

        <button className="btnPrimary" type="submit">Register</button>
      </form>
    </div>
  );
}
