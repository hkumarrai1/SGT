import { useEffect, useMemo, useState } from "react";
import Background from "../components/Background/Background";
import Loader from "../components/Loader/Loader";
import { useAuth } from "../store";
import "../components/Authentication/Authentication.css";
import "./Questionnaire.css";
import { API_URL } from "../config";

function Questionnaire() {
  const { token, isAuthenticated } = useAuth();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAuthenticated) {
      window.location.assign("/auth?mode=login");
      return;
    }

    async function loadQuestionnaire() {
      try {
        const statusResponse = await fetch(`${API_URL}/api/onboarding/status`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const statusData = await statusResponse.json();

        if (!statusResponse.ok) {
          throw new Error(statusData.message || "Unable to confirm your stage.");
        }

        const onboarding = statusData.onboarding;
        if (onboarding.questionnaireStatus === "COMPLETED") {
          window.location.assign("/dashboard");
          return;
        }

        if (onboarding.verificationStatus !== "VERIFIED") {
          window.location.assign(
            onboarding.verificationStatus === "PENDING"
              ? "/verification/pending"
              : "/onboarding/review",
          );
          return;
        }

        const questionResponse = await fetch(`${API_URL}/api/questionnaire`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const questionData = await questionResponse.json();

        if (!questionResponse.ok) {
          throw new Error(
            questionData.message || "Unable to load questionnaire.",
          );
        }

        setQuestions(questionData.questions || []);
      } catch (caughtError) {
        setError(caughtError.message);
      } finally {
        setIsLoading(false);
      }
    }

    loadQuestionnaire();
  }, [isAuthenticated, token]);

  const question = questions[currentQuestion];
  const answeredCount = useMemo(
    () => questions.filter((item) => answers[item.id]).length,
    [answers, questions],
  );
  const progress = questions.length
    ? ((currentQuestion + 1) / questions.length) * 100
    : 0;
  const isLastQuestion = currentQuestion === questions.length - 1;
  const selectedOptionId = question ? answers[question.id] : "";

  function selectOption(optionId) {
    if (!question) return;
    setAnswers((previous) => ({
      ...previous,
      [question.id]: optionId,
    }));
    setError("");
  }

  function goBack() {
    setCurrentQuestion((previous) => Math.max(0, previous - 1));
    setError("");
  }

  function goNext() {
    if (!selectedOptionId) {
      setError("Please select an answer before continuing.");
      return;
    }
    setCurrentQuestion((previous) =>
      Math.min(questions.length - 1, previous + 1),
    );
    setError("");
  }

  async function submitQuestionnaire() {
    if (!selectedOptionId) {
      setError("Please select an answer before completing the questionnaire.");
      return;
    }

    if (answeredCount !== questions.length) {
      setError("Please answer every question before submitting.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/questionnaire/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ answers }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to submit questionnaire.");
      }

      if (Array.isArray(data.tags)) {
        try {
          localStorage.setItem("sgt_user_tags", JSON.stringify(data.tags));
        } catch {
          // Ignore localStorage errors
        }
      }

      window.location.assign("/dashboard");
    } catch (caughtError) {
      setError(caughtError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isAuthenticated) return null;

  return (
    <main className="questionnaire-page">
      <Background />
      <a className="auth-home" href="/">
        Back to SGT
      </a>
      <section className="questionnaire-card">
        <div className="questionnaire-header">
          <span>SGT</span>
          <h1>Get to Know Your Vibe</h1>
          <p>
            Question {Math.min(currentQuestion + 1, questions.length || 1)} of{" "}
            {questions.length || 10}
          </p>
          <div
            className="questionnaire-progress"
            aria-label={`${Math.round(progress)}% complete`}
          >
            <span style={{ width: `${progress}%` }} />
          </div>
        </div>

        {isLoading ? (
          <div className="questionnaire-loading">
            <Loader label="Preparing your questions" />
          </div>
        ) : error && !questions.length ? (
          <p className="auth-status auth-status--error">{error}</p>
        ) : question ? (
          <>
            <div className="questionnaire-question">
              <span>{question.category.replace("-", " ")}</span>
              <h2>{question.question}</h2>
            </div>

            <div className="questionnaire-options" role="radiogroup">
              {question.options.map((option) => (
                <button
                  className={`questionnaire-option ${
                    selectedOptionId === option.id ? "is-selected" : ""
                  }`}
                  type="button"
                  key={option.id}
                  onClick={() => selectOption(option.id)}
                  role="radio"
                  aria-checked={selectedOptionId === option.id}
                >
                  <span>{option.id}</span>
                  <strong>{option.text}</strong>
                </button>
              ))}
            </div>

            {error && (
              <p className="auth-status auth-status--error" role="alert">
                {error}
              </p>
            )}

            <div className="questionnaire-actions">
              <button
                className="questionnaire-secondary"
                type="button"
                onClick={goBack}
                disabled={currentQuestion === 0 || isSubmitting}
              >
                Back
              </button>
              {isLastQuestion ? (
                <button
                  className="questionnaire-primary"
                  type="button"
                  onClick={submitQuestionnaire}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader label="Completing" />
                  ) : (
                    "Complete Questionnaire"
                  )}
                </button>
              ) : (
                <button
                  className="questionnaire-primary"
                  type="button"
                  onClick={goNext}
                  disabled={isSubmitting}
                >
                  Next
                </button>
              )}
            </div>
          </>
        ) : (
          <p className="auth-status auth-status--error">
            Questionnaire questions are unavailable.
          </p>
        )}
      </section>
    </main>
  );
}

export default Questionnaire;
