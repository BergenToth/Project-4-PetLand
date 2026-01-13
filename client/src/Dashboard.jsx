import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "./api.js";

export default function Dashboard({ user, onLogout }) {
  const nav = useNavigate();

  const [categories, setCategories] = useState([]);
  const [activeCategoryId, setActiveCategoryId] = useState(null);

  const [questions, setQuestions] = useState([]);
  const [selectedQuestion, setSelectedQuestion] = useState(null);

  const [newQuestion, setNewQuestion] = useState({ title: "", body: "" });
  const [answerBody, setAnswerBody] = useState("");

  const [error, setError] = useState("");

  useEffect(() => {
    api.categories()
      .then((r) => {
        setCategories(r.categories);
        if (r.categories.length) setActiveCategoryId(r.categories[0].id);
      })
      .catch((e) => setError(e.message || "Could not load categories"));
  }, []);

  useEffect(() => {
    if (!activeCategoryId) return;

    setError("");
    setSelectedQuestion(null);

    api.questionsByCategory(activeCategoryId)
      .then((r) => setQuestions(r.questions))
      .catch((e) => setError(e.message || "Could not load questions"));
  }, [activeCategoryId]);

  async function logout() {
    try {
      await api.logout();
    } catch {
      // ignore
    }
    onLogout();
    nav("/login");
  }

  async function postQuestion() {
    setError("");
    try {
      await api.createQuestion({
        categoryId: activeCategoryId,
        title: newQuestion.title,
        body: newQuestion.body
      });
      setNewQuestion({ title: "", body: "" });
      const r = await api.questionsByCategory(activeCategoryId);
      setQuestions(r.questions);
    } catch (e) {
      setError(e.message || "Could not create question");
    }
  }

  async function openQuestion(id) {
    setError("");
    try {
      const r = await api.getQuestion(id);
      setSelectedQuestion(r.question);
      setAnswerBody("");
    } catch (e) {
      setError(e.message || "Could not open question");
    }
  }

  async function postAnswer() {
    if (!selectedQuestion) return;
    setError("");
    try {
      await api.addAnswer(selectedQuestion.id, { body: answerBody });
      const r = await api.getQuestion(selectedQuestion.id);
      setSelectedQuestion(r.question);
      setAnswerBody("");
    } catch (e) {
      setError(e.message || "Could not add answer");
    }
  }

  return (
    <div className="page" style={{ placeItems: "start center" }}>
      <div className="shell">
        <div className="topbar" style={{ padding: 12, borderBottom: "1px solid #eee" }}>
          <div>
            <strong>PetLand Forum</strong>
            <div className="small">Signed in as: {user.username}</div>
          </div>
          <button className="btn" onClick={logout}>Logout</button>
        </div>

        <div className="dashboard">
          <div className="sidebar">
            <strong>Categories</strong>
            <div style={{ marginTop: 10 }}>
              {categories.map((c) => (
                <div
                  key={c.id}
                  className="listItem"
                  style={{ cursor: "pointer", fontWeight: c.id === activeCategoryId ? "bold" : "normal" }}
                  onClick={() => setActiveCategoryId(c.id)}
                >
                  {c.name}
                </div>
              ))}
            </div>
          </div>

          <div className="main">
            {error ? <div className="errorRight" style={{ marginBottom: 10 }}>{error}</div> : null}

            <div className="listItem">
              <strong>New Question</strong>
              <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                <input
                  className="input"
                  placeholder="Title"
                  value={newQuestion.title}
                  onChange={(e) => setNewQuestion({ ...newQuestion, title: e.target.value })}
                />
                <textarea
                  className="input"
                  rows={4}
                  placeholder="Body"
                  value={newQuestion.body}
                  onChange={(e) => setNewQuestion({ ...newQuestion, body: e.target.value })}
                />
                <button className="btnPrimary" onClick={postQuestion}>Post Question</button>
              </div>
            </div>

            <div className="listItem">
              <strong>Questions</strong>
              <div style={{ marginTop: 10 }}>
                {questions.map((q) => (
                  <div key={q.id} className="listItem" style={{ cursor: "pointer" }} onClick={() => openQuestion(q.id)}>
                    <div style={{ fontWeight: "bold" }}>{q.title}</div>
                    <div className="small">by {q.username} • {new Date(q.createdAt).toLocaleString()}</div>
                    <div style={{ marginTop: 6 }}>{q.body}</div>
                  </div>
                ))}
                {questions.length === 0 ? <div className="small">No questions yet.</div> : null}
              </div>
            </div>

            {selectedQuestion ? (
              <div className="listItem">
                <strong>Selected Question</strong>
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontWeight: "bold" }}>{selectedQuestion.title}</div>
                  <div className="small">by {selectedQuestion.username} • {new Date(selectedQuestion.createdAt).toLocaleString()}</div>
                  <div style={{ marginTop: 8 }}>{selectedQuestion.body}</div>

                  <div style={{ marginTop: 12 }}>
                    <strong>Answers</strong>

                    <div style={{ marginTop: 10 }}>
                      {selectedQuestion.answers.map((a) => (
                        <div key={a.id} className="listItem">
                          <div className="small">{a.username} • {new Date(a.createdAt).toLocaleString()}</div>
                          <div style={{ marginTop: 6 }}>{a.body}</div>
                        </div>
                      ))}
                      {selectedQuestion.answers.length === 0 ? <div className="small">No answers yet.</div> : null}
                    </div>

                    <div style={{ marginTop: 10 }}>
                      <textarea
                        className="input"
                        rows={3}
                        placeholder="Write an answer..."
                        value={answerBody}
                        onChange={(e) => setAnswerBody(e.target.value)}
                      />
                      <button className="btnPrimary" onClick={postAnswer} style={{ marginTop: 8 }}>Post Answer</button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
