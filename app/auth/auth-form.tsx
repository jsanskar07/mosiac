"use client";

import { CheckCircle2, LockKeyhole, Mail, Phone } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import type { AuthCapabilities } from "@/src/platform/config/server";

type Method = "email" | "mobile";
type Intent = "login" | "register" | "recover";
type Step = "credentials" | "email-code" | "otp-code" | "recovery-code";

type ApiResult = {
  challenge_id?: number;
  debug_code?: string;
  debug_token?: string;
  error?: { message?: string };
  message?: string;
};

type AuthFormProps = {
  capabilities: AuthCapabilities;
};

export default function AuthForm({ capabilities }: AuthFormProps) {
  const router = useRouter();
  const [method, setMethod] = useState<Method>("email");
  const [intent, setIntent] = useState<Intent>("login");
  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [mobile, setMobile] = useState("");
  const [verification, setVerification] = useState("");
  const [challengeId, setChallengeId] = useState<number | null>(null);
  const [debugValue, setDebugValue] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  function chooseMethod(next: Method) {
    if (next === "mobile" && !capabilities.mobileOtp) return;
    setMethod(next);
    resetChallenge();
  }

  function chooseIntent(next: Intent) {
    setIntent(next);
    resetChallenge();
  }

  function resetChallenge() {
    setStep("credentials");
    setVerification("");
    setChallengeId(null);
    setDebugValue("");
    setError("");
    setNotice("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      if (step === "email-code") {
        await completeSession("/api/auth/email/verify", { token: verification });
        return;
      }
      if (step === "otp-code") {
        await completeSession("/api/auth/otp/verify", {
          challenge_id: challengeId,
          code: verification,
        });
        return;
      }
      if (step === "recovery-code") {
        await post("/api/auth/password/recovery/complete", {
          token: verification,
          new_password: newPassword,
        });
        setIntent("login");
        setStep("credentials");
        setPassword("");
        setNewPassword("");
        setVerification("");
        setNotice("Password updated. Sign in with your new password.");
        return;
      }

      if (method === "email" && intent === "login") {
        await completeSession("/api/auth/password/login", { email, password });
        return;
      }
      if (method === "email" && intent === "recover") {
        const result = await post("/api/auth/password/recovery/request", { email });
        setStep("recovery-code");
        setDebugValue(result.debug_token ?? "");
        return;
      }
      if (method === "email") {
        const result = await post("/api/auth/email/register", { email, password });
        setStep("email-code");
        setDebugValue(result.debug_token ?? "");
        return;
      }

      const result = await post("/api/auth/otp/request", {
        mobile: mobile.replace(/[\s()-]/g, ""),
        purpose: intent,
      });
      if (typeof result.challenge_id !== "number") {
        throw new Error("The verification challenge was not created");
      }
      setChallengeId(result.challenge_id);
      setDebugValue(result.debug_code ?? "");
      setStep("otp-code");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function completeSession(path: string, body: unknown) {
    await post(path, body);
    router.push("/");
    router.refresh();
  }

  async function resendEmailToken() {
    setBusy(true);
    setError("");
    try {
      const result = await post("/api/auth/email/verification/request", { email });
      setDebugValue(result.debug_token ?? "");
      setNotice("A new verification email has been requested.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  const heading =
    step === "email-code"
      ? "Verify your email"
      : step === "otp-code"
        ? "Enter the text code"
        : step === "recovery-code"
          ? "Reset your password"
          : intent === "recover"
            ? "Recover your account"
            : intent === "register"
              ? "Create your account"
              : "Welcome back";

  return (
    <main className="auth-shell">
      <section className="auth-story" aria-label="About Mosaic">
        <span className="auth-wordmark" aria-label="Mosaic">
          mosaic<span>.</span>
        </span>
        <div>
          <p className="auth-eyebrow">A quieter place to share</p>
          <h1>Keep the moments that make life yours.</h1>
          <p>
            Photos, people, and everyday details—shared with the circle you
            choose.
          </p>
        </div>
        <div className="auth-proof">
          <CheckCircle2 size={18} />
          <span>Your sign-in methods stay linked to one private account.</span>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <div className="auth-title">
            <span className="auth-title-icon">
              <LockKeyhole size={20} />
            </span>
            <div>
              <p>{step === "credentials" ? "Your Mosaic account" : "One last step"}</p>
              <h2>{heading}</h2>
            </div>
          </div>

          {step === "credentials" && (
            <>
              <div className="auth-methods" role="tablist" aria-label="Sign-in method">
                <button
                  type="button"
                  role="tab"
                  aria-selected={method === "email"}
                  className={method === "email" ? "active" : ""}
                  onClick={() => chooseMethod("email")}
                >
                  <Mail size={17} /> Email
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={method === "mobile"}
                  className={method === "mobile" ? "active" : ""}
                  onClick={() => chooseMethod("mobile")}
                  disabled={!capabilities.mobileOtp}
                  title={!capabilities.mobileOtp ? "Mobile sign-in is not available yet" : undefined}
                >
                  <Phone size={17} /> Mobile
                  {!capabilities.mobileOtp && <small>Unavailable</small>}
                </button>
              </div>

              <div className="auth-intents" aria-label="Account action">
                <button
                  type="button"
                  className={intent === "login" ? "active" : ""}
                  onClick={() => chooseIntent("login")}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  className={intent === "register" ? "active" : ""}
                  onClick={() => chooseIntent("register")}
                  disabled={!capabilities.emailVerification}
                >
                  Create account
                </button>
              </div>
            </>
          )}

          <form className="auth-form" onSubmit={submit}>
            {step === "credentials" && method === "email" && (
              <>
                <label>
                  Email address
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </label>
                {intent !== "recover" && (
                  <label>
                    Password
                    <input
                      type="password"
                      autoComplete={intent === "register" ? "new-password" : "current-password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder={intent === "register" ? "12–72 characters" : "Your password"}
                      minLength={intent === "register" ? 12 : 1}
                      maxLength={72}
                      required
                    />
                  </label>
                )}
                {intent === "login" && capabilities.passwordRecovery && (
                  <button
                    type="button"
                    className="auth-reset"
                    onClick={() => chooseIntent("recover")}
                  >
                    Forgot your password?
                  </button>
                )}
              </>
            )}

            {step === "credentials" && method === "mobile" && (
              <label>
                Mobile number
                <input
                  type="tel"
                  autoComplete="tel"
                  value={mobile}
                  onChange={(event) => setMobile(event.target.value)}
                  placeholder="+91 98765 43210"
                  required
                />
                <small>Include your country code.</small>
              </label>
            )}

            {step !== "credentials" && (
              <label>
                {step === "otp-code" ? "Six-digit code" : "Verification token"}
                <input
                  type="text"
                  inputMode={step === "otp-code" ? "numeric" : "text"}
                  autoComplete="one-time-code"
                  value={verification}
                  onChange={(event) => setVerification(event.target.value)}
                  placeholder={step === "otp-code" ? "000000" : "Paste the token from your email"}
                  minLength={step === "otp-code" ? 6 : 16}
                  maxLength={256}
                  required
                />
              </label>
            )}

            {step === "recovery-code" && (
              <label>
                New password
                <input
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="12–72 characters"
                  minLength={12}
                  maxLength={72}
                  required
                />
              </label>
            )}

            {debugValue && (
              <button
                type="button"
                className="auth-debug"
                onClick={() => setVerification(debugValue)}
              >
                Local preview code: <strong>{debugValue}</strong>
              </button>
            )}

            {error && <p className="auth-error" role="alert">{error}</p>}
            {notice && <p className="auth-notice" role="status">{notice}</p>}

            <button className="auth-submit" type="submit" disabled={busy}>
              {busy
                ? "Please wait…"
                : step !== "credentials"
                  ? "Verify and continue"
                  : intent === "recover"
                    ? "Send recovery email"
                    : method === "mobile"
                      ? "Send verification code"
                      : intent === "register"
                        ? "Create account"
                        : "Sign in"}
            </button>

            {step !== "credentials" && (
              <>
                {step === "email-code" && (
                  <button
                    type="button"
                    className="auth-reset"
                    disabled={busy}
                    onClick={() => void resendEmailToken()}
                  >
                    Send a new verification email
                  </button>
                )}
                <button type="button" className="auth-reset" onClick={resetChallenge}>
                  Use a different {method === "email" ? "email" : "number"}
                </button>
              </>
            )}

            {step === "credentials" && intent === "recover" && (
              <button type="button" className="auth-reset" onClick={() => chooseIntent("login")}>
                Back to sign in
              </button>
            )}
          </form>

          <p className="auth-terms">
            By continuing, you agree to Mosaic’s Terms and acknowledge its
            Privacy Policy.
          </p>
        </div>
      </section>
    </main>
  );
}

async function post(path: string, body: unknown): Promise<ApiResult> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = (await response.json().catch(() => ({}))) as ApiResult;
  if (!response.ok) {
    const retryAfter = response.headers.get("retry-after");
    const suffix = response.status === 429 && retryAfter
      ? ` Try again in ${retryAfter} seconds.`
      : "";
    throw new Error(
      `${result.error?.message ?? "The request could not be completed"}${suffix}`,
    );
  }
  return result;
}
