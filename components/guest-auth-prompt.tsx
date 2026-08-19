"use client";
/* eslint-disable jsx-a11y/label-has-associated-control */

import Image from "next/image";
import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { Image as ImageIcon, X } from "lucide-react";
import PasswordInput from "@/components/password-input";
import N2Select from "@/components/n2-select";
import { Logo } from "@/components/network-brand";

export default function GuestAuthPrompt({
  onClose,
  onPeek,
  initialMode = "signin",
}: {
  onClose: () => void;
  onPeek?: () => void;
  initialMode?: "register" | "signin";
}) {
  const [mode, setMode] = useState<"register" | "signin">(initialMode),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [photo, setPhoto] = useState("");
  async function choosePhoto(file?: File) {
    if (!file) return;
    if (file.size > 500_000) {
      setError("Choose a photo smaller than 500 KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPhoto(String(reader.result));
    reader.readAsDataURL(file);
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget),
      email = String(data.get("email")),
      password = String(data.get("password"));
    if (mode === "signin") {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (result?.error) {
        setError("Check your email and password.");
        setBusy(false);
        return;
      }
      window.location.reload();
      return;
    }
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: data.get("title"),
        firstName: data.get("firstName"),
        lastName: data.get("lastName"),
        dateOfBirth: data.get("dateOfBirth"),
        image: photo,
        email,
        password,
      }),
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error ?? "Could not create your account.");
      setBusy(false);
      return;
    }
    window.location.href = result.onboarding ? "/onboarding" : "/signin";
  }
  return (
    <div
      className="modal-backdrop guest-auth-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className="guest-auth-modal"
        role="dialog"
        aria-modal="true"
        aria-label={
          mode === "register" ? "Create an n2 account" : "Sign in to n2"
        }
      >
        <header>
          <Logo />
          <button type="button" className="icon-button" aria-label="Close account dialog" onClick={onClose}>
            <X size={19} />
          </button>
        </header>
        <div className="guest-auth-intro">
          <span className="eyebrow">
            {mode === "register" ? "JOIN THE NETWORK" : "WELCOME BACK"}
          </span>
          <h2>
            {mode === "register"
              ? "Turn interest into contribution."
              : "Continue where you left off."}
          </h2>
          <p>
            {mode === "register"
              ? "Create an account to view projects, comment, share ideas, start projects and meet useful people."
              : "Sign in to interact with projects and your network."}
          </p>
        </div>
        <form onSubmit={submit}>
          {mode === "register" && (
            <>
              <div className="guest-signup-grid">
                <label>
                  Title
                  <N2Select name="title" defaultValue="Ms" required ariaLabel="Title" options={["Mr", "Ms", "Mrs", "Miss", "Mx", "Dr", "Prof"].map(value => ({ value, label: value }))} />
                </label>
                <label>
                  Date of birth
                  <input
                    name="dateOfBirth"
                    type="date"
                    max={new Date(
                      new Date().setFullYear(new Date().getFullYear() - 16),
                    )
                      .toISOString()
                      .slice(0, 10)}
                    required
                  />
                </label>
                <label>
                  First name
                  <input
                    name="firstName"
                    autoComplete="given-name"
                    minLength={2}
                    required
                  />
                </label>
                <label>
                  Surname
                  <input
                    name="lastName"
                    autoComplete="family-name"
                    minLength={2}
                    required
                  />
                </label>
              </div>
              <label className="guest-photo-field">
                <span>
                  Profile photo <small>Optional</small>
                </span>
                <span className="guest-photo-picker">
                  {photo ? (
                    <Image src={photo} alt="Profile preview" width={64} height={64} unoptimized />
                  ) : (
                    <b>n2</b>
                  )}
                  <span>
                    {photo ? "Photo ready" : "Use the n2 mark or add a photo"}
                  </span>
                  <ImageIcon size={15} />
                  <input
                    aria-label="Choose a profile photo"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => choosePhoto(event.target.files?.[0])}
                  />
                </span>
              </label>
            </>
          )}
          <label>
            Email
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label htmlFor="guest-password">
            Password
            <PasswordInput
              id="guest-password"
              name="password"
              autoComplete={
                mode === "register" ? "new-password" : "current-password"
              }
              minLength={10}
              required
            />
            <small>At least 10 characters.</small>
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary-button wide" disabled={busy}>
            {busy
              ? "One moment…"
              : mode === "register"
                ? "Create account"
                : "Sign in"}
          </button>
        </form>
        <div className="guest-auth-alternatives">
          <span>{mode === "signin" ? "New to n2?" : "Already have an account?"}</span>
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              setMode(mode === "signin" ? "register" : "signin");
              setError("");
            }}
          >
            {mode === "signin" ? "Create account" : "Sign in instead"}
          </button>
          {mode === "signin" && onPeek && (
            <button type="button" className="guest-auth-peek" onClick={onPeek}>
              Take a peek first
            </button>
          )}
        </div>
        <small className="guest-auth-terms">
          {mode === "register"
            ? "By joining, you agree to follow the n2 community standards and privacy choices."
            : "Your account keeps your projects, conversations and network together."}
        </small>
      </section>
    </div>
  );
}
