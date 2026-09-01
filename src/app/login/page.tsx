"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import styles from "./page.module.css";
import { Logo } from "@/components/ui/Logo";

import { GoogleLogin } from '@react-oauth/google';

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, signup, googleLogin } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    let res;
    if (isSignUp) {
      res = await signup(name, email, password);
    } else {
      res = await login(email, password);
    }

    if (res.success) {
      router.push("/");
    } else {
      setError(res.error || "An error occurred");
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (credentialResponse.credential) {
      setError("");
      setLoading(true);
      const res = await googleLogin(credentialResponse.credential);
      if (res.success) {
        router.push("/");
      } else {
        setError(res.error || "Google login failed");
        setLoading(false);
      }
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.leftPane}>
        <div style={{ alignSelf: "flex-start", marginBottom: "4rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Logo size="md" />
        </div>
        
        <div className={styles.authCard}>
          <div className={styles.header}>
            <h1 className={styles.title}>{isSignUp ? "Create an account" : "Welcome back"}</h1>
            <p className={styles.subtitle}>
              {isSignUp ? "Start researching and generating documents." : "Please enter your details to sign in."}
            </p>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <form className={styles.form} onSubmit={handleSubmit}>
            {isSignUp && (
              <div className={styles.inputGroup}>
                <label className={styles.label}>Name</label>
                <input 
                  type="text" 
                  className={styles.input} 
                  placeholder="Enter your name" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}
            
            <div className={styles.inputGroup}>
              <label className={styles.label}>Email</label>
              <input 
                type="email" 
                className={styles.input} 
                placeholder="Enter your email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Password</label>
              <input 
                type="password" 
                className={styles.input} 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? "Please wait..." : isSignUp ? "Sign up" : "Sign in"}
            </button>
          </form>

          <div className={styles.divider}>OR</div>

          <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError("Google login was unsuccessful")}
              theme="outline"
              size="large"
              shape="rectangular"
              text="continue_with"
              width="320"
            />
          </div>

          <p className={styles.toggleText}>
            {isSignUp ? "Already have an account?" : "Don't have an account?"}
            <span className={styles.toggleLink} onClick={() => setIsSignUp(!isSignUp)}>
              {isSignUp ? "Log in" : "Sign up"}
            </span>
          </p>
        </div>
      </div>
      <div className={styles.rightPane}>
         <div style={{ maxWidth: "60%", textAlign: "center" }}>
           <h2 className={styles.rightPaneTitle}>Intelligent Document Studio</h2>
           <p className={styles.rightPaneText}>
             Research, draft, and assemble high-quality documents instantly with the power of Gemini 3.1 Pro.
           </p>
         </div>
      </div>
    </div>
  );
}
