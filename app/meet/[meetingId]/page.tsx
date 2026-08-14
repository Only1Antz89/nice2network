/* eslint-disable no-empty, @next/next/no-html-link-for-pages, jsx-a11y/media-has-caption, react-hooks/refs */
"use client";

import { Camera, Check, Globe2, Lock, Mic, MicOff, PhoneOff, Settings2, Users, Video, VideoOff, Volume2, X } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";

type Person = { id: string; name?: string | null; image?: string | null; profession?: string | null; professionalHeadline?: string | null; city?: string | null };
type Signal = { id: string; senderId: string; recipientId?: string | null; type: "join" | "heartbeat" | "offer" | "answer" | "ice" | "media" | "leave"; payload: Record<string, unknown>; createdAt: string; sender: Person };
type RemoteParticipant = { id: string; stream?: MediaStream; person: Person; cameraOn: boolean; audioOn: boolean };
type Meeting = { id: string; title: string; mode: "video" | "audio" | "in_person"; visibility: "public" | "project" | "private"; maxParticipants: number };
type DeviceChoice = { deviceId: string; label: string };

const fallbackAvatar = "/brand/nice-2-network-mark.svg";

export default function N2MeetRoom() {
  const { meetingId } = useParams<{ meetingId: string }>();
  const localVideo = useRef<HTMLVideoElement>(null);
  const localStream = useRef<MediaStream | null>(null);
  const peers = useRef(new Map<string, RTCPeerConnection>());
  const mediaState = useRef({ cameraOn: true, audioOn: true });
  const lastPoll = useRef(0);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [me, setMe] = useState<Person | null>(null);
  const [remote, setRemote] = useState<RemoteParticipant[]>([]);
  const [error, setError] = useState("");
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [ready, setReady] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [devices, setDevices] = useState<{ microphones: DeviceChoice[]; cameras: DeviceChoice[]; speakers: DeviceChoice[] }>({ microphones: [], cameras: [], speakers: [] });
  const [microphoneId, setMicrophoneId] = useState("");
  const [cameraId, setCameraId] = useState("");
  const [speakerId, setSpeakerId] = useState("");

  if (!lastPoll.current && typeof window !== "undefined") lastPoll.current = window.performance.timeOrigin + window.performance.now() - 5000;
  const participantCount = 1 + remote.length;
  const roomMode = meeting?.mode ?? "video";
  const isVideoRoom = roomMode === "video";
  const gridClass = useMemo(() => `video-grid mode-${roomMode} count-${Math.min(participantCount, 8)}`, [participantCount, roomMode]);

  async function signal(type: Signal["type"], payload: Record<string, unknown> = {}, recipientId?: string) {
    const response = await fetch(`/api/meetings/${meetingId}/signals`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type, payload, recipientId }) });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error ?? "Room unavailable");
    }
  }

  function upsertRemote(id: string, patch: Partial<RemoteParticipant> & { person?: Person }) {
    setRemote(rows => {
      const found = rows.find(row => row.id === id);
      if (!found) return [...rows, { id, person: patch.person ?? { id }, cameraOn: patch.cameraOn ?? true, audioOn: patch.audioOn ?? true, stream: patch.stream }];
      return rows.map(row => row.id === id ? { ...row, ...patch, person: patch.person ?? row.person } : row);
    });
  }

  function peer(id: string, person?: Person) {
    let pc = peers.current.get(id);
    if (pc) return pc;
    pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    localStream.current?.getTracks().forEach(track => pc!.addTrack(track, localStream.current!));
    pc.onicecandidate = event => event.candidate && signal("ice", { candidate: event.candidate.toJSON() }, id).catch(() => undefined);
    pc.ontrack = event => upsertRemote(id, { stream: event.streams[0], person });
    pc.onconnectionstatechange = () => {
      if (["closed", "failed", "disconnected"].includes(pc!.connectionState)) setRemote(rows => rows.filter(row => row.id !== id));
    };
    peers.current.set(id, pc);
    return pc;
  }

  async function handle(item: Signal) {
    upsertRemote(item.senderId, {
      person: item.sender,
      cameraOn: typeof item.payload.cameraOn === "boolean" ? item.payload.cameraOn : undefined,
      audioOn: typeof item.payload.audioOn === "boolean" ? item.payload.audioOn : undefined,
    });
    if (item.type === "media" || item.type === "heartbeat") return;
    const pc = peer(item.senderId, item.sender);
    if (item.type === "join") {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await signal("offer", { sdp: offer, cameraOn: !cameraOff, audioOn: !muted }, item.senderId);
    }
    if (item.type === "offer") {
      await pc.setRemoteDescription(item.payload.sdp as RTCSessionDescriptionInit);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await signal("answer", { sdp: answer, cameraOn: !cameraOff, audioOn: !muted }, item.senderId);
    }
    if (item.type === "answer") await pc.setRemoteDescription(item.payload.sdp as RTCSessionDescriptionInit);
    if (item.type === "ice" && item.payload.candidate) await pc.addIceCandidate(item.payload.candidate as RTCIceCandidateInit);
    if (item.type === "leave") {
      pc.close();
      peers.current.delete(item.senderId);
      setRemote(rows => rows.filter(row => row.id !== item.senderId));
    }
  }

  async function listDevices() {
    const all = await navigator.mediaDevices.enumerateDevices();
    const convert = (kind: MediaDeviceKind) => all.filter(item => item.kind === kind).map((item, index) => ({ deviceId: item.deviceId, label: item.label || `${kind === "audioinput" ? "Microphone" : kind === "videoinput" ? "Camera" : "Speaker"} ${index + 1}` }));
    const next = { microphones: convert("audioinput"), cameras: convert("videoinput"), speakers: convert("audiooutput") };
    setDevices(next);
    setMicrophoneId(value => value || next.microphones[0]?.deviceId || "");
    setCameraId(value => value || next.cameras[0]?.deviceId || "");
    setSpeakerId(value => value || next.speakers[0]?.deviceId || "");
  }

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    let heartbeat: ReturnType<typeof setInterval> | undefined;
    async function start() {
      try {
        const meetingResponse = await fetch(`/api/meetings/${meetingId}`);
        if (!meetingResponse.ok) {
          const problem = await meetingResponse.json().catch(() => ({}));
          throw new Error(problem.error ?? "Meet not found");
        }
        const data = await meetingResponse.json();
        const currentMeeting = data.meeting as Meeting;
        if (currentMeeting.mode === "in_person") throw new Error("This is an in-person meet. Open its details for the location.");
        setMeeting(currentMeeting);
        setMe(data.currentMember as Person);
        const wantsVideo = currentMeeting.mode === "video";
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: wantsVideo ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false });
        } catch (cause) {
          if (!wantsVideo) throw cause;
          stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          setCameraOff(true);
        }
        localStream.current = stream;
        if (localVideo.current) localVideo.current.srcObject = stream;
        await listDevices();
        await signal("join", { cameraOn: wantsVideo && stream.getVideoTracks().length > 0, audioOn: true, mode: currentMeeting.mode });
        setReady(true);
        mediaState.current = { cameraOn: wantsVideo && stream.getVideoTracks().length > 0, audioOn: true };
        heartbeat = setInterval(() => signal("heartbeat", mediaState.current).catch(() => undefined), 20000);
        timer = setInterval(async () => {
          const response = await fetch(`/api/meetings/${meetingId}/signals?since=${lastPoll.current}`);
          if (!response.ok) return;
          const batch = await response.json();
          lastPoll.current = batch.serverTime;
          for (const item of batch.signals as Signal[]) try { await handle(item); } catch {}
        }, 1300);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Microphone access is required");
      }
    }
    start();
    return () => {
      if (timer) clearInterval(timer);
      if (heartbeat) clearInterval(heartbeat);
      signal("leave", {}).catch(() => undefined);
      peers.current.forEach(pc => pc.close());
      localStream.current?.getTracks().forEach(track => track.stop());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId]);

  async function toggle(kind: "audio" | "video") {
    const track = localStream.current?.getTracks().find(item => item.kind === kind);
    if (track) track.enabled = !track.enabled;
    const nextMuted = kind === "audio" ? !muted : muted;
    const nextCameraOff = kind === "video" ? !cameraOff : cameraOff;
    if (kind === "audio") setMuted(nextMuted); else setCameraOff(nextCameraOff);
    mediaState.current = { cameraOn: !nextCameraOff, audioOn: !nextMuted };
    await signal("media", { cameraOn: !nextCameraOff, audioOn: !nextMuted }).catch(() => undefined);
  }

  async function switchInput(kind: "audio" | "video", deviceId: string) {
    const next = await navigator.mediaDevices.getUserMedia(kind === "audio" ? { audio: { deviceId: { exact: deviceId } }, video: false } : { video: { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
    const nextTrack = kind === "audio" ? next.getAudioTracks()[0] : next.getVideoTracks()[0];
    const oldTrack = kind === "audio" ? localStream.current?.getAudioTracks()[0] : localStream.current?.getVideoTracks()[0];
    if (!localStream.current || !nextTrack) return;
    if (oldTrack) { localStream.current.removeTrack(oldTrack); oldTrack.stop(); }
    localStream.current.addTrack(nextTrack);
    for (const pc of peers.current.values()) {
      const sender = pc.getSenders().find(item => item.track?.kind === kind);
      if (sender) await sender.replaceTrack(nextTrack); else pc.addTrack(nextTrack, localStream.current);
    }
    if (localVideo.current) localVideo.current.srcObject = localStream.current;
    if (kind === "audio") setMicrophoneId(deviceId); else { setCameraId(deviceId); setCameraOff(false); }
    mediaState.current = { cameraOn: kind === "video" ? true : !cameraOff, audioOn: kind === "audio" ? true : !muted };
    await signal("media", { cameraOn: kind === "video" ? true : !cameraOff, audioOn: kind === "audio" ? true : !muted }).catch(() => undefined);
  }

  function leave() {
    signal("leave", {}).catch(() => undefined);
    window.location.href = "/?view=meet";
  }

  const VisibilityIcon = meeting?.visibility === "public" ? Globe2 : meeting?.visibility === "project" ? Users : Lock;
  return <main className="video-room">
    <header className="room-header">
      <a href="/" className="room-brand"><span>n2</span><b>nice 2 network</b></a>
      <div className="room-heading"><strong>{meeting?.title ?? "n2 meet"}</strong><small><VisibilityIcon size={13}/>{roomMode === "audio" ? "Audio meet" : "Video meet"}</small></div>
      <div className="room-count"><Users size={18}/><strong>{participantCount}</strong><span>/{meeting?.maxParticipants ?? 4}</span></div>
    </header>
    {error ? <section className="video-room-error"><VideoOff size={28}/><h1>Could not join this room</h1><p>{error}</p><button onClick={() => history.back()}>Go back</button></section> : <section className={gridClass}>
      <ParticipantTile person={me ?? { id: "self", name: "You" }} stream={localStream.current ?? undefined} cameraOn={isVideoRoom && !cameraOff} muted={muted} local videoRef={localVideo} outputDeviceId={speakerId}/>
      {remote.map(row => <ParticipantTile key={row.id} person={row.person} stream={row.stream} cameraOn={isVideoRoom && row.cameraOn} muted={!row.audioOn} outputDeviceId={speakerId}/>)}
      {ready && participantCount === 1 && <article className="empty-video"><Users size={30}/><span>Waiting for people to join…</span></article>}
      {isVideoRoom && participantCount <= 4 && <div className="hd-marker">HD</div>}
    </section>}
    <footer className="room-controls">
      <button className={muted ? "off" : ""} aria-label={muted ? "Turn microphone on" : "Mute microphone"} onClick={() => toggle("audio")}>{muted ? <MicOff/> : <Mic/>}</button>
      {isVideoRoom && <button className={cameraOff ? "off" : ""} aria-label={cameraOff ? "Turn camera on" : "Turn camera off"} onClick={() => toggle("video")}>{cameraOff ? <VideoOff/> : <Video/>}</button>}
      <button aria-label="Device settings" onClick={() => setShowSettings(true)}><Settings2/></button>
      <button className="hangup" aria-label="Leave meet" onClick={leave}><PhoneOff/></button>
    </footer>
    {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
    {showSettings && <div className="room-settings-backdrop" onMouseDown={event => event.target === event.currentTarget && setShowSettings(false)}><section className="room-settings">
      <header><div><span>YOUR DEVICES</span><h2>Audio & video settings</h2></div><button onClick={() => setShowSettings(false)}><X/></button></header>
      <label><Mic/>Microphone<select value={microphoneId} onChange={event => switchInput("audio", event.target.value)}>{devices.microphones.map(device => <option key={device.deviceId} value={device.deviceId}>{device.label}</option>)}</select></label>
      {isVideoRoom && <label><Camera/>Camera<select value={cameraId} onChange={event => switchInput("video", event.target.value)}>{devices.cameras.map(device => <option key={device.deviceId} value={device.deviceId}>{device.label}</option>)}</select></label>}
      <label><Volume2/>Speakers<select value={speakerId} onChange={event => setSpeakerId(event.target.value)} disabled={!devices.speakers.length}>{devices.speakers.length ? devices.speakers.map(device => <option key={device.deviceId} value={device.deviceId}>{device.label}</option>) : <option>System default</option>}</select></label>
      <button className="primary-action" onClick={() => setShowSettings(false)}><Check/>Done</button>
    </section></div>}
  </main>;
}

function ParticipantTile({ person, stream, cameraOn, muted, local = false, videoRef, outputDeviceId }: { person: Person; stream?: MediaStream; cameraOn: boolean; muted: boolean; local?: boolean; videoRef?: RefObject<HTMLVideoElement | null>; outputDeviceId: string }) {
  const ownRef = useRef<HTMLVideoElement>(null);
  const ref = videoRef ?? ownRef;
  useEffect(() => {
    if (!ref.current || !stream) return;
    ref.current.srcObject = stream;
    const media = ref.current as HTMLVideoElement & { setSinkId?: (id: string) => Promise<void> };
    if (outputDeviceId && media.setSinkId) media.setSinkId(outputDeviceId).catch(() => undefined);
  }, [stream, outputDeviceId, ref]);
  const name = local ? "You" : person.name ?? "n2 member";
  return <article className={`participant-tile ${cameraOn ? "camera-on" : "camera-off"}`}>
    <video ref={ref} autoPlay playsInline muted={local}/>
    {!cameraOn && <div className="profile-standin"><img src={person.image || fallbackAvatar} alt=""/><strong>{name}</strong><small>{person.profession || "n2 member"}</small></div>}
    <div className="participant-label"><span>{name}</span>{muted && <MicOff size={14}/>}</div>
    {!local && <div className="participant-quick-card"><img src={person.image || fallbackAvatar} alt=""/><div><strong>{person.name ?? "n2 member"}</strong><span>{person.professionalHeadline || person.profession || "n2 member"}</span>{person.city && <small>{person.city}</small>}</div></div>}
  </article>;
}
