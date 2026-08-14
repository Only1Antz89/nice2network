/* eslint-disable no-empty, @next/next/no-html-link-for-pages, jsx-a11y/media-has-caption, react-hooks/refs */
"use client";

import { Camera, Check, Globe2, Headphones, Lock, MessageCircle, Mic, MicOff, PhoneOff, Podcast, Send, Settings2, UserMinus, UserRoundCheck, Users, Video, VideoOff, Volume2, X } from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type RefObject } from "react";

type PodcastRole = "host" | "cohost" | "speaker" | "listener" | "audience_speaker";
type Person = { id: string; name?: string | null; image?: string | null; profession?: string | null; professionalHeadline?: string | null; city?: string | null; role?: PodcastRole; speakerStatus?: string; status?: string };
type Signal = { id: string; senderId: string; recipientId?: string | null; type: "join" | "heartbeat" | "offer" | "answer" | "ice" | "media" | "leave" | "stage"; payload: Record<string, unknown>; createdAt: string; sender: Person };
type RemoteParticipant = { id: string; stream?: MediaStream; person: Person; cameraOn: boolean; audioOn: boolean };
type Meeting = { id: string; title: string; mode: "video" | "audio" | "in_person"; visibility: "public" | "project" | "private"; maxParticipants: number };
type DeviceChoice = { deviceId: string; label: string };
type ChatMessage = { id: string; body: string; createdAt: string; author: Person };

const fallbackAvatar = "/brand/nice-2-network-mark.svg";
const STAGE_ROLES: PodcastRole[] = ["host", "cohost", "speaker", "audience_speaker"];

export default function N2MeetRoom() {
  const { meetingId } = useParams<{ meetingId: string }>();
  const localVideo = useRef<HTMLVideoElement>(null);
  const localStream = useRef<MediaStream | null>(null);
  const peers = useRef(new Map<string, RTCPeerConnection>());
  const mediaState = useRef({ cameraOn: true, audioOn: true });
  const lastPoll = useRef(0);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [me, setMe] = useState<Person | null>(null);
  const [localMedia, setLocalMedia] = useState<MediaStream | undefined>();
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
  const [podcastPeople, setPodcastPeople] = useState<Person[]>([]);
  const [currentRole, setCurrentRole] = useState<PodcastRole>("listener");
  const [canModerate, setCanModerate] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [activeSpeaker, setActiveSpeaker] = useState<string | null>(null);

  if (!lastPoll.current && typeof window !== "undefined") lastPoll.current = Date.now() - 5000;
  const participantCount = 1 + remote.length;
  const roomMode = meeting?.mode ?? "video";
  const isVideoRoom = roomMode === "video";
  const isPodcast = roomMode === "audio";
  const onStage = STAGE_ROLES.includes(currentRole);
  const gridClass = useMemo(() => `video-grid mode-${roomMode} count-${Math.min(participantCount, 8)}`, [participantCount, roomMode]);

  const signal = useCallback(async (type: Signal["type"], payload: Record<string, unknown> = {}, recipientId?: string) => {
    const response = await fetch(`/api/meetings/${meetingId}/signals`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type, payload, recipientId }) });
    if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.error ?? "Room unavailable"); }
  }, [meetingId]);

  const loadPodcast = useCallback(async () => {
    const response = await fetch(`/api/meetings/${meetingId}/podcast`);
    if (!response.ok) return;
    const data = await response.json();
    setPodcastPeople(data.people ?? []);
    setCurrentRole(data.currentRole ?? "listener");
    setCanModerate(Boolean(data.canModerate));
  }, [meetingId]);

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
    pc.onconnectionstatechange = () => { if (["closed", "failed", "disconnected"].includes(pc!.connectionState)) setRemote(rows => rows.filter(row => row.id !== id)); };
    peers.current.set(id, pc);
    return pc;
  }

  async function handle(item: Signal) {
    if (item.type === "stage") {
      if (item.payload.action === "mute" && !muted) await toggle("audio");
      await loadPodcast();
      return;
    }
    upsertRemote(item.senderId, { person: item.sender, cameraOn: typeof item.payload.cameraOn === "boolean" ? item.payload.cameraOn : undefined, audioOn: typeof item.payload.audioOn === "boolean" ? item.payload.audioOn : undefined });
    if (item.type === "media" || item.type === "heartbeat") return;
    const pc = peer(item.senderId, item.sender);
    if (item.type === "join") { const offer = await pc.createOffer(); await pc.setLocalDescription(offer); await signal("offer", { sdp: offer, cameraOn: !cameraOff, audioOn: !muted }, item.senderId); }
    if (item.type === "offer") { await pc.setRemoteDescription(item.payload.sdp as RTCSessionDescriptionInit); const answer = await pc.createAnswer(); await pc.setLocalDescription(answer); await signal("answer", { sdp: answer, cameraOn: !cameraOff, audioOn: !muted }, item.senderId); }
    if (item.type === "answer") await pc.setRemoteDescription(item.payload.sdp as RTCSessionDescriptionInit);
    if (item.type === "ice" && item.payload.candidate) await pc.addIceCandidate(item.payload.candidate as RTCIceCandidateInit);
    if (item.type === "leave") { pc.close(); peers.current.delete(item.senderId); setRemote(rows => rows.filter(row => row.id !== item.senderId)); }
  }

  async function listDevices() {
    const all = await navigator.mediaDevices.enumerateDevices();
    const convert = (kind: MediaDeviceKind) => all.filter(item => item.kind === kind).map((item, index) => ({ deviceId: item.deviceId, label: item.label || `${kind === "audioinput" ? "Microphone" : kind === "videoinput" ? "Camera" : "Speaker"} ${index + 1}` }));
    const next = { microphones: convert("audioinput"), cameras: convert("videoinput"), speakers: convert("audiooutput") };
    setDevices(next); setMicrophoneId(value => value || next.microphones[0]?.deviceId || ""); setCameraId(value => value || next.cameras[0]?.deviceId || ""); setSpeakerId(value => value || next.speakers[0]?.deviceId || "");
  }

  async function acquireMicrophone() {
    if (localStream.current?.getAudioTracks().length) return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: microphoneId ? { deviceId: { exact: microphoneId } } : true, video: false });
    localStream.current = stream;
    setLocalMedia(stream);
    for (const [id, pc] of peers.current) {
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
      const offer = await pc.createOffer(); await pc.setLocalDescription(offer); await signal("offer", { sdp: offer, cameraOn: false, audioOn: true }, id);
    }
    setMuted(false); mediaState.current.audioOn = true; await listDevices();
  }

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    let heartbeat: ReturnType<typeof setInterval> | undefined;
    let podcastTimer: ReturnType<typeof setInterval> | undefined;
    let chatTimer: ReturnType<typeof setInterval> | undefined;
    async function start() {
      try {
        const meetingResponse = await fetch(`/api/meetings/${meetingId}`);
        if (!meetingResponse.ok) { const problem = await meetingResponse.json().catch(() => ({})); throw new Error(problem.error ?? "Meet not found"); }
        const data = await meetingResponse.json();
        const currentMeeting = data.meeting as Meeting;
        if (currentMeeting.mode === "in_person") throw new Error("This is an in-person meet. Open its details for the location.");
        const role = (data.currentRole ?? "listener") as PodcastRole;
        setMeeting(currentMeeting); setMe(data.currentMember as Person); setCurrentRole(role);
        if (currentMeeting.mode === "audio") await loadPodcast();
        const wantsVideo = currentMeeting.mode === "video";
        const wantsAudio = currentMeeting.mode === "video" || STAGE_ROLES.includes(role);
        let stream: MediaStream | null = null;
        if (wantsAudio || wantsVideo) {
          try { stream = await navigator.mediaDevices.getUserMedia({ audio: wantsAudio, video: wantsVideo ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false }); }
          catch (cause) { if (!wantsVideo) throw cause; stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false }); setCameraOff(true); }
        }
        localStream.current = stream; setLocalMedia(stream ?? undefined);
        if (localVideo.current && stream) localVideo.current.srcObject = stream;
        if (stream) await listDevices();
        const cameraOn = wantsVideo && Boolean(stream?.getVideoTracks().length);
        const audioOn = Boolean(stream?.getAudioTracks().length);
        await signal("join", { cameraOn, audioOn, mode: currentMeeting.mode });
        setReady(true); mediaState.current = { cameraOn, audioOn };
        heartbeat = setInterval(() => signal("heartbeat", mediaState.current).catch(() => undefined), 20000);
        timer = setInterval(async () => {
          const response = await fetch(`/api/meetings/${meetingId}/signals?since=${lastPoll.current}`); if (!response.ok) return;
          const batch = await response.json(); lastPoll.current = batch.serverTime;
          for (const item of batch.signals as Signal[]) try { await handle(item); } catch {}
        }, 1300);
        if (currentMeeting.mode === "audio") {
          podcastTimer = setInterval(loadPodcast, 2500);
          const loadChat = async () => { const response = await fetch(`/api/meetings/${meetingId}/chat`); if (response.ok) setMessages((await response.json()).messages ?? []); };
          await loadChat(); chatTimer = setInterval(loadChat, 1800);
        }
      } catch (cause) { setError(cause instanceof Error ? cause.message : "Microphone access is required"); }
    }
    start();
    return () => { if (timer) clearInterval(timer); if (heartbeat) clearInterval(heartbeat); if (podcastTimer) clearInterval(podcastTimer); if (chatTimer) clearInterval(chatTimer); signal("leave", {}).catch(() => undefined); peers.current.forEach(pc => pc.close()); localStream.current?.getTracks().forEach(track => track.stop()); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId]);

  useEffect(() => {
    if (!isPodcast || !ready) return;
    if (onStage) acquireMicrophone().catch(() => setError("Microphone access is needed to join the stage"));
    else if (localStream.current) {
      localStream.current.getTracks().forEach(track => track.stop()); localStream.current = null; setLocalMedia(undefined);
      peers.current.forEach(pc => pc.getSenders().forEach(sender => sender.track?.kind === "audio" && pc.removeTrack(sender)));
      setMuted(true); mediaState.current.audioOn = false; signal("media", { cameraOn: false, audioOn: false }).catch(() => undefined);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRole, isPodcast, ready]);

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
    if (!nextTrack) return;
    if (!localStream.current) localStream.current = new MediaStream();
    if (oldTrack) { localStream.current.removeTrack(oldTrack); oldTrack.stop(); }
    localStream.current.addTrack(nextTrack);
    setLocalMedia(localStream.current);
    for (const pc of peers.current.values()) { const sender = pc.getSenders().find(item => item.track?.kind === kind); if (sender) await sender.replaceTrack(nextTrack); else pc.addTrack(nextTrack, localStream.current); }
    if (localVideo.current) localVideo.current.srcObject = localStream.current;
    if (kind === "audio") { setMicrophoneId(deviceId); setMuted(false); } else { setCameraId(deviceId); setCameraOff(false); }
  }

  async function stageAction(action: "request_speak" | "cancel_request" | "approve" | "dismiss" | "mute", userId?: string) {
    const response = await fetch(`/api/meetings/${meetingId}/podcast`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, userId }) });
    if (response.ok) await loadPodcast();
  }

  async function sendChat(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const field = form.elements.namedItem("message") as HTMLInputElement; const body = field.value.trim(); if (!body) return;
    const response = await fetch(`/api/meetings/${meetingId}/chat`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ body }) });
    if (response.ok) { field.value = ""; const chat = await fetch(`/api/meetings/${meetingId}/chat`); if (chat.ok) setMessages((await chat.json()).messages ?? []); }
  }

  function leave() { signal("leave", {}).catch(() => undefined); window.location.href = "/?view=meet"; }
  const VisibilityIcon = meeting?.visibility === "public" ? Globe2 : meeting?.visibility === "project" ? Users : Lock;

  if (isPodcast) return <><PodcastRoom meeting={meeting} me={me} localMedia={localMedia} remote={remote} people={podcastPeople} currentRole={currentRole} canModerate={canModerate} muted={muted} participantCount={participantCount} messages={messages} chatOpen={chatOpen} activeSpeaker={activeSpeaker} setActiveSpeaker={setActiveSpeaker} setChatOpen={setChatOpen} toggleMute={() => toggle("audio")} stageAction={stageAction} sendChat={sendChat} leave={leave} openSettings={() => setShowSettings(true)} error={error}/>{showSettings && <DeviceSettings devices={devices} microphoneId={microphoneId} cameraId={cameraId} speakerId={speakerId} video={false} onClose={() => setShowSettings(false)} onInput={switchInput} onSpeaker={setSpeakerId}/>}</>;

  return <main className="video-room">
    <header className="room-header"><a href="/" className="room-brand"><span>n2</span><b>nice 2 network</b></a><div className="room-heading"><strong>{meeting?.title ?? "n2 meet"}</strong><small><VisibilityIcon size={13}/>Video meet</small></div><div className="room-count"><Users size={18}/><strong>{participantCount}</strong><span>/{meeting?.maxParticipants ?? 8}</span></div></header>
    {error ? <section className="video-room-error"><VideoOff size={28}/><h1>Could not join this room</h1><p>{error}</p><button onClick={() => history.back()}>Go back</button></section> : <section className={gridClass}>
      <ParticipantTile person={me ?? { id: "self", name: "You" }} stream={localStream.current ?? undefined} cameraOn={!cameraOff} muted={muted} local videoRef={localVideo} outputDeviceId={speakerId}/>
      {remote.map(row => <ParticipantTile key={row.id} person={row.person} stream={row.stream} cameraOn={row.cameraOn} muted={!row.audioOn} outputDeviceId={speakerId}/>)}
      {ready && participantCount === 1 && <article className="empty-video"><Users size={30}/><span>Waiting for people to join…</span></article>}
      {participantCount <= 4 && <div className="hd-marker">HD</div>}
    </section>}
    <footer className="room-controls"><button className={muted ? "off" : ""} onClick={() => toggle("audio")}>{muted ? <MicOff/> : <Mic/>}</button><button className={cameraOff ? "off" : ""} onClick={() => toggle("video")}>{cameraOff ? <VideoOff/> : <Video/>}</button><button onClick={() => setShowSettings(true)}><Settings2/></button><button className="hangup" onClick={leave}><PhoneOff/></button></footer>
    {showSettings && <DeviceSettings devices={devices} microphoneId={microphoneId} cameraId={cameraId} speakerId={speakerId} video onClose={() => setShowSettings(false)} onInput={switchInput} onSpeaker={setSpeakerId}/>}
  </main>;
}

function PodcastRoom({ meeting, me, localMedia, remote, people, currentRole, canModerate, muted, participantCount, messages, chatOpen, activeSpeaker, setActiveSpeaker, setChatOpen, toggleMute, stageAction, sendChat, leave, openSettings, error }: {
  meeting: Meeting | null; me: Person | null; localMedia?: MediaStream; remote: RemoteParticipant[]; people: Person[]; currentRole: PodcastRole; canModerate: boolean; muted: boolean; participantCount: number; messages: ChatMessage[]; chatOpen: boolean; activeSpeaker: string | null; setActiveSpeaker: (id: string | null) => void; setChatOpen: (open: boolean) => void; toggleMute: () => void; stageAction: (action: "request_speak" | "cancel_request" | "approve" | "dismiss" | "mute", userId?: string) => void; sendChat: (event: FormEvent<HTMLFormElement>) => void; leave: () => void; openSettings: () => void; error: string;
}) {
  const remoteById = new Map(remote.map(person => [person.id, person]));
  const stage = people.filter(person => person.role && STAGE_ROLES.includes(person.role));
  const requests = people.filter(person => person.speakerStatus === "requested");
  const self = people.find(person => person.id === me?.id) ?? (me ? { ...me, role: currentRole } : null);
  const isListener = currentRole === "listener";
  const requested = self?.speakerStatus === "requested";
  return <main className={`podcast-room ${chatOpen ? "chat-open" : ""}`}>
    <header className="podcast-header">
      <a href="/" className="room-brand"><span>n2</span><b>nice 2 network</b></a>
      <div className="room-heading"><strong>{meeting?.title ?? "n2 podcast"}</strong><small>{meeting?.visibility === "public" ? <Globe2 size={13}/> : meeting?.visibility === "private" ? <Lock size={13}/> : <Users size={13}/>} {meeting?.visibility} podcast</small></div>
      <div className="room-count"><Headphones size={17}/><strong>{participantCount}</strong><span>/{meeting?.maxParticipants ?? 16}</span></div>
    </header>
    <div className="podcast-layout">
      <section className="podcast-main">
        {error && <p className="podcast-error">{error}</p>}
        <div className="podcast-intro"><span>LIVE PODCAST</span><h1>{meeting?.title}</h1><p>{isListener ? "You’re listening. Request the microphone when you want to contribute." : currentRole === "host" ? "You’re hosting this room." : currentRole === "cohost" ? "You can manage the stage with the host." : "You’re live on the stage."}</p></div>
        <div className="podcast-stage">
          {stage.map(person => {
            const connection = person.id === me?.id ? { stream: undefined, audioOn: !muted } : remoteById.get(person.id);
            return <PodcastCard key={person.id} person={person} stream={person.id === me?.id ? localMedia : connection?.stream} muted={person.id === me?.id ? muted : !connection?.audioOn} active={activeSpeaker === person.id} onSpeaking={speaking => setActiveSpeaker(speaking ? person.id : activeSpeaker === person.id ? null : activeSpeaker)} canModerate={canModerate && person.id !== me?.id && person.role !== "host"} onDismiss={() => stageAction("dismiss", person.id)} onMute={() => stageAction("mute", person.id)}/>;
          })}
        </div>
        {canModerate && requests.length > 0 && <section className="speaker-requests"><header><span>REQUESTS TO SPEAK</span><strong>{requests.length}</strong></header>{requests.map(person => <div key={person.id}><img src={person.image || fallbackAvatar} alt=""/><span><b>{person.name}</b><small>{person.profession || "n2 member"}</small></span><button onClick={() => stageAction("dismiss", person.id)}><X size={15}/></button><button className="approve" onClick={() => stageAction("approve", person.id)}><UserRoundCheck size={15}/>Bring up</button></div>)}</section>}
        <section className="audience-status"><Headphones/><div><b>{Math.max(0, participantCount - stage.filter(person => remoteById.has(person.id) || person.id === me?.id).length)} listening</b><span>Listeners remain off stage until a host invites them to speak.</span></div></section>
      </section>
      <PodcastChat messages={messages} me={me} onSubmit={sendChat} onClose={() => setChatOpen(false)}/>
    </div>
    <footer className="podcast-controls">
      {!isListener && <button className={muted ? "off" : ""} onClick={toggleMute}>{muted ? <MicOff/> : <Mic/>}<span>{muted ? "Unmute" : "Mute"}</span></button>}
      {isListener && <button className={`request-mic ${requested ? "requested" : ""}`} onClick={() => stageAction(requested ? "cancel_request" : "request_speak")}>{requested ? <X/> : <Podcast/>}<span>{requested ? "Cancel request" : "Request to speak"}</span></button>}
      {!isListener && <button onClick={openSettings}><Settings2/><span>Devices</span></button>}
      <button onClick={() => setChatOpen(!chatOpen)}><MessageCircle/><span>Chat</span></button>
      <button className="hangup" onClick={leave}><PhoneOff/><span>Leave</span></button>
    </footer>
  </main>;
}

function PodcastCard({ person, stream, muted, active, onSpeaking, canModerate, onDismiss, onMute }: { person: Person; stream?: MediaStream; muted: boolean; active: boolean; onSpeaking: (speaking: boolean) => void; canModerate: boolean; onDismiss: () => void; onMute: () => void }) {
  useSpeaking(stream, !muted, onSpeaking);
  const label = person.role === "host" ? "HOST" : person.role === "cohost" ? "CO-HOST" : person.role === "audience_speaker" ? "AUDIENCE SPEAKER" : "GUEST SPEAKER";
  return <article className={`podcast-card role-${person.role} ${active ? "speaking" : ""}`}>
    <div className="podcast-avatar-wrap"><img src={person.image || fallbackAvatar} alt=""/></div>
    <div className="podcast-identity"><span><b>{person.name ?? "n2 member"}</b><small>{person.profession || "n2 member"}</small></span><em>{label}</em><div className={`podcast-mic ${muted ? "muted" : ""}`}>{muted ? <MicOff/> : <Podcast/>}</div></div>
    {canModerate && <div className="podcast-member-actions"><button onClick={onMute}><MicOff size={14}/>Mute</button><button onClick={onDismiss}><UserMinus size={14}/>Dismiss</button></div>}
  </article>;
}

function PodcastChat({ messages, me, onSubmit, onClose }: { messages: ChatMessage[]; me: Person | null; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onClose: () => void }) {
  return <aside className="podcast-chat"><header><div><span>ROOM CHAT</span><b>Live conversation</b></div><button onClick={onClose}><X/></button></header><div className="podcast-chat-feed">{messages.length ? messages.map(message => <article className={message.author.id === me?.id ? "mine" : ""} key={message.id}><img src={message.author.image || fallbackAvatar} alt=""/><div><strong>{message.author.name ?? "n2 member"}</strong><p>{message.body}</p><time>{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time></div></article>) : <div className="chat-empty"><MessageCircle/><b>Start the room chat</b><span>Listeners and speakers share one conversation.</span></div>}</div><form onSubmit={onSubmit}><input name="message" maxLength={1200} placeholder="Say something useful…"/><button aria-label="Send"><Send/></button></form></aside>;
}

function useSpeaking(stream: MediaStream | undefined, enabled: boolean, onSpeaking: (speaking: boolean) => void) {
  const callback = useRef(onSpeaking); callback.current = onSpeaking;
  useEffect(() => {
    if (!stream || !enabled || !stream.getAudioTracks().length) return;
    const context = new AudioContext(); const source = context.createMediaStreamSource(stream); const analyser = context.createAnalyser(); analyser.fftSize = 256; source.connect(analyser); const data = new Uint8Array(analyser.frequencyBinCount); let frame = 0; let speaking = false;
    const sample = () => { analyser.getByteTimeDomainData(data); let sum = 0; for (const value of data) { const normalized = (value - 128) / 128; sum += normalized * normalized; } const next = Math.sqrt(sum / data.length) > .045; if (next !== speaking) { speaking = next; callback.current(next); } frame = requestAnimationFrame(sample); };
    sample(); return () => { cancelAnimationFrame(frame); source.disconnect(); context.close(); if (speaking) callback.current(false); };
  }, [stream, enabled]);
}

function DeviceSettings({ devices, microphoneId, cameraId, speakerId, video, onClose, onInput, onSpeaker }: { devices: { microphones: DeviceChoice[]; cameras: DeviceChoice[]; speakers: DeviceChoice[] }; microphoneId: string; cameraId: string; speakerId: string; video: boolean; onClose: () => void; onInput: (kind: "audio" | "video", id: string) => void; onSpeaker: (id: string) => void }) {
  return <div className="room-settings-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}><section className="room-settings"><header><div><span>YOUR DEVICES</span><h2>Audio & video settings</h2></div><button onClick={onClose}><X/></button></header><label><Mic/>Microphone<select value={microphoneId} onChange={event => onInput("audio", event.target.value)}>{devices.microphones.map(device => <option key={device.deviceId} value={device.deviceId}>{device.label}</option>)}</select></label>{video && <label><Camera/>Camera<select value={cameraId} onChange={event => onInput("video", event.target.value)}>{devices.cameras.map(device => <option key={device.deviceId} value={device.deviceId}>{device.label}</option>)}</select></label>}<label><Volume2/>Speakers<select value={speakerId} onChange={event => onSpeaker(event.target.value)} disabled={!devices.speakers.length}>{devices.speakers.length ? devices.speakers.map(device => <option key={device.deviceId} value={device.deviceId}>{device.label}</option>) : <option>System default</option>}</select></label><button className="primary-action" onClick={onClose}><Check/>Done</button></section></div>;
}

function ParticipantTile({ person, stream, cameraOn, muted, local = false, videoRef, outputDeviceId }: { person: Person; stream?: MediaStream; cameraOn: boolean; muted: boolean; local?: boolean; videoRef?: RefObject<HTMLVideoElement | null>; outputDeviceId: string }) {
  const ownRef = useRef<HTMLVideoElement>(null); const ref = videoRef ?? ownRef;
  useEffect(() => { if (!ref.current || !stream) return; ref.current.srcObject = stream; const media = ref.current as HTMLVideoElement & { setSinkId?: (id: string) => Promise<void> }; if (outputDeviceId && media.setSinkId) media.setSinkId(outputDeviceId).catch(() => undefined); }, [stream, outputDeviceId, ref]);
  const name = local ? "You" : person.name ?? "n2 member";
  return <article className={`participant-tile ${cameraOn ? "camera-on" : "camera-off"}`}><video ref={ref} autoPlay playsInline muted={local}/>{!cameraOn && <div className="profile-standin"><img src={person.image || fallbackAvatar} alt=""/><strong>{name}</strong><small>{person.profession || "n2 member"}</small></div>}<div className="participant-label"><span>{name}</span>{muted && <MicOff size={14}/>}</div>{!local && <div className="participant-quick-card"><img src={person.image || fallbackAvatar} alt=""/><div><strong>{person.name ?? "n2 member"}</strong><span>{person.professionalHeadline || person.profession || "n2 member"}</span>{person.city && <small>{person.city}</small>}</div></div>}</article>;
}
