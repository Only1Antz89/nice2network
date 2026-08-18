import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";
import { getSharedProfileIdentity } from "@/lib/public-profile";

const origin = process.env.NEXT_PUBLIC_APP_URL ?? "https://nice2network.vercel.app";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Profile on nice 2 network";

export default async function ProfileOpenGraphImage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const profile = await getSharedProfileIdentity(username);
  if (!profile) notFound();

  const displayName = (profile.name || profile.username).slice(0, 54);
  const tagline = (profile.headline || profile.profession || "n2 member").slice(0, 140);
  const avatar = profile.image || `${origin}/brand/nice-2-network-mark.svg`;

  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", background: "#11110f", color: "#f7f7f4", padding: "58px 66px", fontFamily: "Arial, sans-serif", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", width: "460px", height: "460px", borderRadius: "50%", right: "-160px", top: "-210px", border: "70px solid #ff6b35", opacity: .95 }} />
      <div style={{ position: "absolute", width: "260px", height: "8px", right: "66px", bottom: "58px", borderRadius: "99px", background: "#ff6b35" }} />
      <div style={{ width: "310px", height: "310px", flex: "0 0 310px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", overflow: "hidden", border: "7px solid #ff6b35", background: "#f7f7f4", boxShadow: "0 24px 70px rgba(0,0,0,.36)" }}>
        <img src={avatar} alt="" width="310" height="310" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
      <div style={{ minWidth: 0, flex: 1, height: "100%", display: "flex", flexDirection: "column", padding: "12px 0 8px 62px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", color: "#ff6b35", fontSize: "18px", fontWeight: 700, letterSpacing: "4px", textTransform: "uppercase" }}>Profile · nice 2 network</div>
        <div style={{ display: "flex", marginTop: "64px", fontSize: "58px", fontWeight: 700, lineHeight: 1.04, letterSpacing: "-2px" }}>{displayName}</div>
        <div style={{ display: "flex", marginTop: "12px", color: "#c7c7c1", fontSize: "27px" }}>@{profile.username}</div>
        <div style={{ display: "flex", marginTop: "28px", maxWidth: "680px", color: "#f7f7f4", fontSize: "30px", lineHeight: 1.25 }}>{tagline}</div>
        <div style={{ display: "flex", alignItems: "center", gap: "15px", marginTop: "auto", fontSize: "22px", fontWeight: 700 }}>
          <span style={{ width: "48px", height: "48px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", background: "#f7f7f4", color: "#11110f", fontSize: "18px" }}>n2</span>
          On nice 2 network
        </div>
      </div>
    </div>,
    size,
  );
}
