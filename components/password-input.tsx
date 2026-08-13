"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

type PasswordInputProps = {
  id: string;
  name: string;
  autoComplete: "current-password" | "new-password";
  minLength?: number;
  required?: boolean;
};

export default function PasswordInput({ id, name, autoComplete, minLength, required }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return <span className="password-field">
    <input id={id} name={name} type={visible ? "text" : "password"} autoComplete={autoComplete} minLength={minLength} required={required}/>
    <button type="button" aria-label={visible ? "Hide password" : "Show password"} aria-pressed={visible} title={visible ? "Hide password" : "Show password"} onClick={()=>setVisible(current=>!current)}>
      {visible ? <EyeOff aria-hidden="true"/> : <Eye aria-hidden="true"/>}
    </button>
  </span>;
}
