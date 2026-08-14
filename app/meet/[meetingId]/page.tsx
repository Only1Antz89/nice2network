/* eslint-disable no-empty, @next/next/no-html-link-for-pages, jsx-a11y/media-has-caption, react-hooks/refs */
"use client";

import { Camera, Check, Globe2, Headphones, Lock, Maximize2, MessageCircle, Mic, MicOff, Minimize2, PhoneOff, Podcast, Send, Settings2, UserMinus, UserRoundCheck, Users, Video, VideoOff, Volume2, X } from "lucide-react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type RefObject } from "react";

type PodcastRole = "host" | "cohost" | "speaker" | "listener" | "audience_speaker";
type Person = { id: string; name?: string | null; image?: string | null; profession?: string | null; professionalHeadline?: string | null; city?: string | null; role?: PodcastRole; speakerStatus?: string; status?: string };
type Signal = { id: string; senderId: string; recipientId?: string | null; type: "join" | "heartbeat" | "offer" | "answer" | "ice" | "media" | "leave" | "end" | "stage"; payload: Record<string, unknown>; createdAt: string; sender: Person };
type RemoteParticipant = { id: string; stream?: MediaStream; person: Person; cameraOn: boolean; audioOn: boolean };
type VideoParticipant = RemoteParticipant & { local?: boolean };
type Meeting = { id: string; title: string; mode: "video" | "audio" | "in_person"; visibility: "public" | "project" | "private"; maxParticipants: number; endedAt?: string | null };
type DeviceChoice = { deviceId: string; label: string };
type ChatMessage = { id: string; body: string; createdAt: string; author: Person; kind?: "message" | "question" };
type ConnectionStatus = "awaiting" | "connecting" | "connected" | "disconnected";
type JoinErrorKind = "room" | "media" | "connection" | null;

const fallbackAvatar = "/brand/nice-2-network-mark.svg";
const STAGE_ROLES: PodcastRole[] = ["host", "cohost", "speaker", "audience_speaker"];

function PersonImage({ src }: { src?: string | null }) {
  return <Image src={src || fallbackAvatar} alt="" width={160} height={160} sizes="160px" unoptimized />;
}

function describeMediaError(cause: unknown) {
  const name = cause instanceof DOMException ? cause.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") return "Camera or microphone access is blocked. Allow access in your browser's website settings, then try again. You can also join with both devices off.";
  if (name === "NotFoundError" || name === "DevicesNotFoundError") return "No camera or microphone was found. Connect a device or join with both devices off.";
  if (name === "NotReadableError" || name === "TrackStartError") return "Your camera or microphone is already in use by another app. Close the other app, then try again.";
  return "We could not start your camera or microphone. Check the browser's website permissions, then try again.";
}

export default function N2MeetRoom() {
  const { meetingId } = useParams<{ meetingId: string }>();
  const localVideo = useRef<HTMLVideoElement>(null);
  const roomRef = useRef<HTMLElement>(null);
  const localStream = useRef<MediaStream | null>(null);
  const peers = useRef(new Map<string, RTCPeerConnection>());
  const pendingIce = useRef(new Map<string, RTCIceCandidateInit[]>());
  const mediaState = useRef({ cameraOn: true, audioOn: true });
  const roomModeRef = useRef<Meeting["mode"]>("video");
  const isHost = useRef(false);
  const departureSent = useRef(false);
  const joinedRef = useRef(false);
  const lastPoll = useRef(0);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [me, setMe] = useState<Person | null>(null);
  const [localMedia, setLocalMedia] = useState<MediaStream | undefined>();
  const [remote, setRemote] = useState<RemoteParticipant[]>([]);
  const [error, setError] = useState("");
  const [errorKind, setErrorKind] = useState<JoinErrorKind>(null);
  const [meetingLoading, setMeetingLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joinAttempt, setJoinAttempt] = useState(0);
  const [joinWithoutDevices, setJoinWithoutDevices] = useState(false);
  const [mediaWarning, setMediaWarning] = useState("");
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
  const [unreadChat, setUnreadChat] = useState(0);
  const [invitedPeople, setInvitedPeople] = useState<Person[]>([]);
  const [connectionStates, setConnectionStates] = useState<Record<string, ConnectionStatus>>({});
  const [participantPanelOpen, setParticipantPanelOpen] = useState(false);
  const [profilePreview, setProfilePreview] = useState<Person | null>(null);
  const [activeSpeaker, setActiveSpeaker] = useState<string | null>(null);
  const [manualFocusId, setManualFocusId] = useState<string | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const chatOpenRef = useRef(false);
  const messageIdsRef = useRef(new Set<string>());
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (!lastPoll.current && typeof window !== "undefined") lastPoll.current = Date.now() - 5000;
  const participantCount = 1 + remote.length;
  const roomMode = meeting?.mode ?? "video";
  const isPodcast = roomMode === "audio";
  const onStage = STAGE_ROLES.includes(currentRole);
  const localParticipantId = me?.id ?? "self";
  const videoParticipants = useMemo<VideoParticipant[]>(() => [
    { id: localParticipantId, person: me ?? { id: localParticipantId, name: "You" }, stream: localMedia, cameraOn: !cameraOff, audioOn: !muted, local: true },
    ...remote,
  ], [cameraOff, localMedia, localParticipantId, me, muted, remote]);
  const automaticFocusId = activeSpeaker ?? remote[0]?.id ?? localParticipantId;
  const focusId = manualFocusId && videoParticipants.some(person => person.id === manualFocusId) ? manualFocusId : automaticFocusId;
  const focusedParticipant = videoParticipants.find(person => person.id === focusId) ?? videoParticipants[0];
  const thumbnailParticipants = videoParticipants.filter(person => person.id !== focusedParticipant?.id).sort((a, b) => Number(Boolean(a.local)) - Number(Boolean(b.local)));
  const roomPeople = useMemo(() => {
    const known = new Map<string, Person>();
    for (const person of invitedPeople) known.set(person.id, person);
    for (const person of podcastPeople) known.set(person.id, { ...known.get(person.id), ...person });
    for (const person of remote) known.set(person.id, { ...known.get(person.id), ...person.person });
    if (me) known.set(me.id, { ...known.get(me.id), ...me, role: currentRole });
    return [...known.values()];
  }, [currentRole, invitedPeople, me, podcastPeople, remote]);

  const applyMessages = useCallback((next: ChatMessage[]) => {
    const ids = messageIdsRef.current;
    const newlyArrived = next.filter(message => !ids.has(message.id));
    next.forEach(message => ids.add(message.id));
    if (!chatOpenRef.current && ids.size > newlyArrived.length) {
      const incoming = newlyArrived.filter(message => message.author.id !== me?.id).length;
      if (incoming) setUnreadChat(count => count + incoming);
    }
    setMessages(next);
  }, [me?.id]);

  useEffect(() => {
    chatOpenRef.current = chatOpen;
  }, [chatOpen]);

  const signal = useCallback(async (type: Signal["type"], payload: Record<string, unknown> = {}, recipientId?: string) => {
    const response = await fetch(`/api/meetings/${meetingId}/signals`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type, payload, recipientId }), keepalive: type === "leave" || type === "end" });
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

  async function restartPeer(id: string, pc: RTCPeerConnection) {
    if (pc.signalingState !== "stable" || pc.connectionState === "closed") return;
    pc.restartIce();
    const offer = await pc.createOffer({ iceRestart: true });
    await pc.setLocalDescription(offer);
    await signal("offer", { sdp: offer, ...mediaState.current }, id);
  }

  function peer(id: string, person?: Person) {
    let pc = peers.current.get(id);
    if (pc) return pc;
    pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    localStream.current?.getTracks().forEach(track => pc!.addTrack(track, localStream.current!));
    if (roomModeRef.current === "audio" && !localStream.current?.getAudioTracks().length) pc.addTransceiver("audio", { direction: "recvonly" });
    pc.onicecandidate = event => event.candidate && signal("ice", { candidate: event.candidate.toJSON() }, id).catch(() => undefined);
    pc.ontrack = event => {
      const incoming = event.streams[0] ?? new MediaStream([event.track]);
      upsertRemote(id, { stream: incoming, person });
      event.track.onunmute = () => upsertRemote(id, { stream: incoming, person });
    };
    pc.onconnectionstatechange = () => {
      const state = pc!.connectionState;
      const status: ConnectionStatus = state === "connected" ? "connected" : ["new", "checking"].includes(state) ? "connecting" : ["closed", "failed", "disconnected"].includes(state) ? "disconnected" : "connecting";
      setConnectionStates(current => ({ ...current, [id]: status }));
      if (state === "closed") setRemote(rows => rows.filter(row => row.id !== id));
      if (state === "failed") restartPeer(id, pc!).catch(() => undefined);
    };
    peers.current.set(id, pc);
    return pc;
  }

  async function handle(item: Signal) {
    if (item.type === "end") {
      peers.current.forEach(pc => pc.close());
      localStream.current?.getTracks().forEach(track => track.stop());
      window.location.replace("/?view=meet&ended=host");
      return;
    }
    if (item.type === "stage") {
      if (item.payload.action === "mute" && !muted) await toggle("audio");
      await loadPodcast();
      return;
    }
    upsertRemote(item.senderId, { person: item.sender, cameraOn: typeof item.payload.cameraOn === "boolean" ? item.payload.cameraOn : undefined, audioOn: typeof item.payload.audioOn === "boolean" ? item.payload.audioOn : undefined });
    setConnectionStates(current => ({ ...current, [item.senderId]: item.type === "leave" ? "disconnected" : item.type === "join" ? "connecting" : "connected" }));
    if (item.type === "media" || item.type === "heartbeat") return;
    if (item.type === "leave") { const existing = peers.current.get(item.senderId); existing?.close(); peers.current.delete(item.senderId); pendingIce.current.delete(item.senderId); setRemote(rows => rows.filter(row => row.id !== item.senderId)); return; }
    const pc = peer(item.senderId, item.sender);
    const flushIce = async () => {
      const queued = pendingIce.current.get(item.senderId) ?? [];
      pendingIce.current.delete(item.senderId);
      for (const candidate of queued) await pc.addIceCandidate(candidate);
    };
    if (item.type === "join") { const offer = await pc.createOffer(); await pc.setLocalDescription(offer); await signal("offer", { sdp: offer, ...mediaState.current }, item.senderId); }
    if (item.type === "offer") {
      const offerCollision = pc.signalingState !== "stable";
      const politePeer = localParticipantId.localeCompare(item.senderId) > 0;
      if (offerCollision && !politePeer) return;
      if (offerCollision) await pc.setLocalDescription({ type: "rollback" });
      await pc.setRemoteDescription(item.payload.sdp as RTCSessionDescriptionInit); await flushIce();
      const answer = await pc.createAnswer(); await pc.setLocalDescription(answer);
      await signal("answer", { sdp: answer, ...mediaState.current }, item.senderId);
    }
    if (item.type === "answer") { await pc.setRemoteDescription(item.payload.sdp as RTCSessionDescriptionInit); await flushIce(); }
    if (item.type === "ice" && item.payload.candidate) {
      const candidate = item.payload.candidate as RTCIceCandidateInit;
      if (pc.remoteDescription) await pc.addIceCandidate(candidate);
      else pendingIce.current.set(item.senderId, [...(pendingIce.current.get(item.senderId) ?? []), candidate]);
    }
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
    let active = true;
    async function loadMeeting() {
      try {
        const meetingResponse = await fetch(`/api/meetings/${meetingId}`);
        if (!meetingResponse.ok) { const problem = await meetingResponse.json().catch(() => ({})); throw new Error(problem.error ?? "Meet not found"); }
        const data = await meetingResponse.json();
        const currentMeeting = data.meeting as Meeting;
        if (currentMeeting.mode === "in_person") throw new Error("This is an in-person meet. Open its details for the location.");
        if (currentMeeting.endedAt) throw new Error("This meet has ended because the host left.");
        if (!active) return;
        const role = (data.currentRole ?? "listener") as PodcastRole;
        const participants = (data.participants ?? []) as Person[];
        const creator = data.creator as Person | undefined;
        const people = creator && !participants.some(person => person.id === creator.id)
          ? [{ ...creator, role: "host" as PodcastRole }, ...participants]
          : participants.map(person => person.id === creator?.id ? { ...person, role: "host" as PodcastRole } : person);
        roomModeRef.current = currentMeeting.mode;
        isHost.current = role === "host";
        setMeeting(currentMeeting); setMe(data.currentMember as Person); setCurrentRole(role); setInvitedPeople(people);
        if (currentMeeting.mode === "audio") { await loadPodcast(); setJoinAttempt(value => value + 1); }
      } catch (cause) {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : "This room is unavailable");
        setErrorKind("room");
      } finally {
        if (active) setMeetingLoading(false);
      }
    }
    loadMeeting();
    return () => { active = false; };
  }, [loadPodcast, meetingId]);

  useEffect(() => {
    if (!meeting || !me || !joinAttempt) return;
    const activePeers = peers.current;
    let active = true;
    let joinedThisRun = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    let heartbeat: ReturnType<typeof setInterval> | undefined;
    let podcastTimer: ReturnType<typeof setInterval> | undefined;
    let chatTimer: ReturnType<typeof setInterval> | undefined;
    async function start() {
      setJoining(true); setError(""); setErrorKind(null); setMediaWarning("");
      let mediaPrepared = false;
      try {
        const wantsVideo = meeting!.mode === "video" && !joinWithoutDevices;
        const wantsAudio = (meeting!.mode === "video" || STAGE_ROLES.includes(currentRole)) && !joinWithoutDevices;
        let stream: MediaStream | null = null;
        if ((wantsAudio || wantsVideo) && !navigator.mediaDevices?.getUserMedia) throw new DOMException("Media devices are unavailable", "NotSupportedError");
        if (wantsVideo && wantsAudio) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" } });
          } catch (combinedFailure) {
            const fallback = new MediaStream();
            try { (await navigator.mediaDevices.getUserMedia({ audio: true, video: false })).getTracks().forEach(track => fallback.addTrack(track)); } catch {}
            try { (await navigator.mediaDevices.getUserMedia({ audio: false, video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" } })).getTracks().forEach(track => fallback.addTrack(track)); } catch {}
            if (!fallback.getTracks().length) throw combinedFailure;
            stream = fallback;
            setMediaWarning(fallback.getVideoTracks().length ? "Joined without microphone access." : "Joined without camera access.");
          }
        } else if (wantsAudio) {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        }
        if (!active) { stream?.getTracks().forEach(track => track.stop()); return; }
        localStream.current = stream; setLocalMedia(stream ?? undefined);
        if (localVideo.current && stream) localVideo.current.srcObject = stream;
        if (stream) await listDevices().catch(() => undefined);
        const cameraOn = Boolean(stream?.getVideoTracks().length);
        const audioOn = Boolean(stream?.getAudioTracks().length);
        setCameraOff(!cameraOn); setMuted(!audioOn);
        mediaState.current = { cameraOn, audioOn };
        mediaPrepared = true;
        lastPoll.current = Date.now() - 5000;
        await signal("join", { cameraOn, audioOn, mode: meeting!.mode });
        if (!active) return;
        joinedThisRun = true; joinedRef.current = true; setReady(true); setJoining(false);
        heartbeat = setInterval(() => signal("heartbeat", mediaState.current).catch(() => undefined), 15000);
        timer = setInterval(async () => {
          const response = await fetch(`/api/meetings/${meetingId}/signals?since=${lastPoll.current}`); if (!response.ok) return;
          const batch = await response.json(); lastPoll.current = batch.serverTime;
          for (const item of batch.signals as Signal[]) try { await handle(item); } catch {}
        }, 1300);
        if (meeting!.mode === "audio") {
          podcastTimer = setInterval(loadPodcast, 2500);
          const loadChat = async () => { const response = await fetch(`/api/meetings/${meetingId}/chat`); if (response.ok) applyMessages((await response.json()).messages ?? []); };
          await loadChat(); chatTimer = setInterval(loadChat, 1800);
        }
      } catch (cause) {
        if (!active) return;
        setJoining(false);
        setError(mediaPrepared && cause instanceof Error ? cause.message : describeMediaError(cause));
        setErrorKind(mediaPrepared ? "connection" : "media");
      }
    }
    start();
    return () => {
      active = false;
      if (timer) clearInterval(timer); if (heartbeat) clearInterval(heartbeat); if (podcastTimer) clearInterval(podcastTimer); if (chatTimer) clearInterval(chatTimer);
      if (joinedThisRun && !departureSent.current) signal(isHost.current ? "end" : "leave", {}).catch(() => undefined);
      activePeers.forEach(pc => pc.close()); activePeers.clear();
      localStream.current?.getTracks().forEach(track => track.stop()); localStream.current = null;
    };
  // The join attempt is deliberately the single restart trigger; live callbacks use refs for media state.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinAttempt]);

  useEffect(() => {
    if (!ready) return;
    const recover = () => {
      if (document.visibilityState === "hidden") return;
      for (const [id, pc] of peers.current) if (["disconnected", "failed"].includes(pc.connectionState)) restartPeer(id, pc).catch(() => undefined);
      document.querySelectorAll<HTMLMediaElement>(".video-room video, .podcast-room audio").forEach(media => media.play().catch(() => undefined));
    };
    document.addEventListener("visibilitychange", recover);
    window.addEventListener("online", recover);
    window.addEventListener("pageshow", recover);
    return () => { document.removeEventListener("visibilitychange", recover); window.removeEventListener("online", recover); window.removeEventListener("pageshow", recover); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

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

  useEffect(() => {
    if (!ready || isPodcast) return;
    const startedAt = Date.now();
    const timer = window.setInterval(() => setCallDuration(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [isPodcast, ready]);

  useEffect(() => {
    const update = () => setIsFullscreen(document.fullscreenElement === roomRef.current);
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);

  const revealControls = useCallback(() => {
    setControlsVisible(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => setControlsVisible(false), 2600);
  }, []);

  useEffect(() => {
    const activity = () => revealControls();
    document.addEventListener("pointermove", activity);
    document.addEventListener("pointerdown", activity);
    document.addEventListener("keydown", activity);
    controlsTimerRef.current = setTimeout(() => setControlsVisible(false), 2600);
    return () => {
      document.removeEventListener("pointermove", activity);
      document.removeEventListener("pointerdown", activity);
      document.removeEventListener("keydown", activity);
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    };
  }, [revealControls]);

  async function toggle(kind: "audio" | "video") {
    let track = localStream.current?.getTracks().find(item => item.kind === kind);
    const currentlyOff = kind === "audio" ? muted : cameraOff;
    if (!track && currentlyOff) {
      try {
        const next = await navigator.mediaDevices.getUserMedia(kind === "audio" ? { audio: true, video: false } : { audio: false, video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" } });
        track = kind === "audio" ? next.getAudioTracks()[0] : next.getVideoTracks()[0];
        if (!track) throw new DOMException(`${kind} is unavailable`, "NotFoundError");
        if (!localStream.current) localStream.current = new MediaStream();
        localStream.current.addTrack(track);
        setLocalMedia(localStream.current);
        if (localVideo.current) localVideo.current.srcObject = localStream.current;
        for (const [id, pc] of peers.current) {
          pc.addTrack(track, localStream.current);
          const offer = await pc.createOffer(); await pc.setLocalDescription(offer); await signal("offer", { sdp: offer, cameraOn: kind === "video" ? true : !cameraOff, audioOn: kind === "audio" ? true : !muted }, id);
        }
        if (kind === "audio") setMuted(false); else setCameraOff(false);
        mediaState.current = { cameraOn: kind === "video" ? true : !cameraOff, audioOn: kind === "audio" ? true : !muted };
        setMediaWarning("");
        await signal("media", mediaState.current).catch(() => undefined);
        await listDevices().catch(() => undefined);
      } catch (cause) { setMediaWarning(describeMediaError(cause)); }
      return;
    }
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
    if (kind === "audio") { setMicrophoneId(deviceId); setMuted(false); mediaState.current.audioOn = true; } else { setCameraId(deviceId); setCameraOff(false); mediaState.current.cameraOn = true; }
    await signal("media", mediaState.current).catch(() => undefined);
  }

  async function stageAction(action: "request_speak" | "cancel_request" | "approve" | "dismiss" | "mute", userId?: string) {
    const response = await fetch(`/api/meetings/${meetingId}/podcast`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, userId }) });
    if (response.ok) await loadPodcast();
  }

  async function sendChat(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const field = form.elements.namedItem("message") as HTMLInputElement; const body = field.value.trim(); if (!body) return;
    const kind = ((form.elements.namedItem("kind") as HTMLInputElement | null)?.value === "question" ? "question" : "message") as "question" | "message";
    const response = await fetch(`/api/meetings/${meetingId}/chat`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ body, kind }) });
    if (response.ok) { field.value = ""; const chat = await fetch(`/api/meetings/${meetingId}/chat`); if (chat.ok) applyMessages((await chat.json()).messages ?? []); }
  }

  function beginJoin(withoutDevices: boolean) {
    setJoinWithoutDevices(withoutDevices);
    setError(""); setErrorKind(null); setReady(false);
    setJoinAttempt(value => value + 1);
  }

  async function leave() {
    departureSent.current = true;
    if (joinedRef.current) await signal(isHost.current ? "end" : "leave", {}).catch(() => undefined);
    window.location.href = "/?view=meet";
  }
  async function toggleFullscreen() {
    if (!roomRef.current) return;
    if (document.fullscreenElement) await document.exitFullscreen();
    else await roomRef.current.requestFullscreen();
  }
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remaining = seconds % 60;
    return hours ? `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${remaining.toString().padStart(2, "0")}` : `${minutes.toString().padStart(2, "0")}:${remaining.toString().padStart(2, "0")}`;
  };
  const VisibilityIcon = meeting?.visibility === "public" ? Globe2 : meeting?.visibility === "project" ? Users : Lock;

  if (isPodcast) return <>
    <PodcastRoom meeting={meeting} me={me} localMedia={localMedia} remote={remote} people={roomPeople} currentRole={currentRole} canModerate={canModerate} muted={muted} participantCount={participantCount} messages={messages} chatOpen={chatOpen} unreadChat={unreadChat} connectionStates={connectionStates} activeSpeaker={activeSpeaker} controlsVisible={controlsVisible} outputDeviceId={speakerId} setActiveSpeaker={setActiveSpeaker} setChatOpen={open => { setChatOpen(open); if (open) setUnreadChat(0); }} toggleMute={() => toggle("audio")} stageAction={stageAction} sendChat={sendChat} leave={leave} openSettings={() => setShowSettings(true)} onProfile={setProfilePreview} error={error}/>
    {showSettings && <DeviceSettings devices={devices} microphoneId={microphoneId} cameraId={cameraId} speakerId={speakerId} video={false} onClose={() => setShowSettings(false)} onInput={switchInput} onSpeaker={setSpeakerId}/>}
    {profilePreview && <MeetProfilePreview person={profilePreview} onClose={() => setProfilePreview(null)}/>}</>;

  return <main className={`video-room ${controlsVisible ? "controls-visible" : ""}`} ref={roomRef}>
    <header className="room-header"><a href="/" className="room-brand"><span>n2</span><b>nice 2 network</b></a><div className="room-heading"><strong>{meeting?.title ?? "n2 meet"}</strong><small><VisibilityIcon size={13}/>Video meet <i aria-hidden="true"/> <time>{formatDuration(callDuration)}</time></small></div><button className="room-count room-count-button" aria-label={`Show ${participantCount} of ${meeting?.maxParticipants ?? 8} participants`} onClick={() => setParticipantPanelOpen(true)}><Users size={18}/><strong>{participantCount}</strong><span>/ {meeting?.maxParticipants ?? 8}</span></button></header>
    {error ? <section className="video-room-error"><VideoOff size={28}/><h1>Could not join this room</h1><p>{error}</p><div>{(errorKind === "media" || errorKind === "connection") && <button onClick={() => beginJoin(false)}>{errorKind === "media" ? "Try camera & microphone again" : "Try connecting again"}</button>}{errorKind === "media" && <button className="secondary" onClick={() => beginJoin(true)}>Join with devices off</button>}<button className={errorKind !== "room" ? "text-action" : ""} onClick={() => history.back()}>Go back</button></div>{errorKind === "media" && <small>On mobile, open this site’s controls or browser settings and allow Camera and Microphone. On iPhone and iPad, these controls are also available under Settings → Safari → Camera / Microphone.</small>}</section> : !ready ? <section className="video-prejoin"><div className="prejoin-preview"><div className="profile-standin"><PersonImage src={me?.image}/><strong>{me?.name ?? "You"}</strong><small>Camera and microphone are checked only after you tap Join</small></div></div><div className="prejoin-copy"><span>READY TO JOIN?</span><h1>{meetingLoading ? "Checking the room…" : meeting?.title ?? "n2 meet"}</h1><p>Your browser may ask for camera and microphone access. You can still enter the room if either device is unavailable.</p><button disabled={meetingLoading || joining} onClick={() => beginJoin(false)}><Video/>{joining ? "Connecting…" : "Join call"}</button><button className="secondary" disabled={meetingLoading || joining} onClick={() => beginJoin(true)}>Join with camera & microphone off</button></div></section> : <section className="video-stage-shell">
      <div className="video-stage">
        {focusedParticipant && <ParticipantTile
          person={focusedParticipant.person} stream={focusedParticipant.stream} cameraOn={focusedParticipant.cameraOn}
          muted={!focusedParticipant.audioOn} local={focusedParticipant.local} videoRef={focusedParticipant.local ? localVideo : undefined}
          outputDeviceId={speakerId} active={activeSpeaker === focusedParticipant.id}
          onSpeaking={speaking => setActiveSpeaker(current => speaking ? focusedParticipant.id : current === focusedParticipant.id ? null : current)}
        />}
        {ready && participantCount === 1 && <div className="waiting-notice"><Users size={18}/><span>Waiting for people to join…</span></div>}
        {mediaWarning && <div className="media-warning">{mediaWarning}</div>}
      </div>
      {thumbnailParticipants.length > 0 && <div className="participant-filmstrip" aria-label="Other participants">{thumbnailParticipants.map(person => <ParticipantTile key={person.id} person={person.person} stream={person.stream} cameraOn={person.cameraOn} muted={!person.audioOn} local={person.local} videoRef={person.local ? localVideo : undefined} outputDeviceId={speakerId} compact active={activeSpeaker === person.id} onClick={() => setManualFocusId(person.id)} onSpeaking={speaking => setActiveSpeaker(current => speaking ? person.id : current === person.id ? null : current)}/>)}</div>}
      {participantCount <= 4 && <div className="hd-marker">HD</div>}
      <footer className="room-controls" aria-label="Call controls"><button aria-label={muted ? "Unmute microphone" : "Mute microphone"} className={muted ? "off" : ""} onClick={() => toggle("audio")}>{muted ? <MicOff/> : <Mic/>}</button><button aria-label={cameraOff ? "Turn camera on" : "Turn camera off"} className={cameraOff ? "off" : ""} onClick={() => toggle("video")}>{cameraOff ? <VideoOff/> : <Video/>}</button><button aria-label="Device settings" onClick={() => setShowSettings(true)}><Settings2/></button><button aria-label={isFullscreen ? "Exit full screen" : "Enter full screen"} onClick={toggleFullscreen}>{isFullscreen ? <Minimize2/> : <Maximize2/>}</button><button aria-label="Leave call" className="hangup" onClick={leave}><PhoneOff/></button></footer>
    </section>}
    {showSettings && <DeviceSettings devices={devices} microphoneId={microphoneId} cameraId={cameraId} speakerId={speakerId} video onClose={() => setShowSettings(false)} onInput={switchInput} onSpeaker={setSpeakerId}/>}
    {participantPanelOpen && <ParticipantPanel people={roomPeople} currentUserId={me?.id} connectedIds={new Set(remote.map(person => person.id).concat(me?.id ? [me.id] : []))} connectionStates={connectionStates} onClose={() => setParticipantPanelOpen(false)} onProfile={person => { setParticipantPanelOpen(false); setProfilePreview(person); }}/>}
    {profilePreview && <MeetProfilePreview person={profilePreview} onClose={() => setProfilePreview(null)}/>}
  </main>;
}

function PodcastRoom({ meeting, me, localMedia, remote, people, currentRole, canModerate, muted, participantCount, messages, chatOpen, unreadChat, connectionStates, activeSpeaker, controlsVisible, outputDeviceId, setActiveSpeaker, setChatOpen, toggleMute, stageAction, sendChat, leave, openSettings, onProfile, error }: {
  meeting: Meeting | null; me: Person | null; localMedia?: MediaStream; remote: RemoteParticipant[]; people: Person[]; currentRole: PodcastRole; canModerate: boolean; muted: boolean; participantCount: number; messages: ChatMessage[]; chatOpen: boolean; unreadChat: number; connectionStates: Record<string, ConnectionStatus>; activeSpeaker: string | null; controlsVisible: boolean; outputDeviceId: string; setActiveSpeaker: (id: string | null) => void; setChatOpen: (open: boolean) => void; toggleMute: () => void; stageAction: (action: "request_speak" | "cancel_request" | "approve" | "dismiss" | "mute", userId?: string) => void; sendChat: (event: FormEvent<HTMLFormElement>) => void; leave: () => void; openSettings: () => void; onProfile: (person: Person) => void; error: string;
}) {
  const [participantPanelOpen, setParticipantPanelOpen] = useState(false);
  const remoteById = new Map(remote.map(person => [person.id, person]));
  const hosts = people.filter(person => person.role === "host");
  const cohosts = people.filter(person => person.role === "cohost");
  const guests = people.filter(person => person.role === "speaker");
  const audienceSpeakers = people.filter(person => person.role === "audience_speaker");
  const stage = [...hosts, ...cohosts, ...guests, ...audienceSpeakers];
  const requests = people.filter(person => person.speakerStatus === "requested");
  const self = people.find(person => person.id === me?.id) ?? (me ? { ...me, role: currentRole } : null);
  const isListener = currentRole === "listener";
  const requested = self?.speakerStatus === "requested";
  const connectedIds = new Set(remote.map(person => person.id).concat(me?.id ? [me.id] : []));
  const connectionStatus = (person: Person): ConnectionStatus => {
    if (person.id === me?.id) return "connected";
    if (connectionStates[person.id]) return connectionStates[person.id];
    if (remoteById.has(person.id)) return "connected";
    return person.status === "left" ? "disconnected" : "awaiting";
  };
  const card = (person: Person) => {
    const connection = person.id === me?.id ? { stream: localMedia, audioOn: !muted } : remoteById.get(person.id);
    return <PodcastCard key={person.id} person={person} stream={connection?.stream} outputDeviceId={outputDeviceId} local={person.id === me?.id} status={connectionStatus(person)} muted={person.id === me?.id ? muted : !connection?.audioOn} active={activeSpeaker === person.id} onSpeaking={speaking => setActiveSpeaker(speaking ? person.id : activeSpeaker === person.id ? null : activeSpeaker)} canModerate={canModerate && person.id !== me?.id && person.role !== "host"} onDismiss={() => stageAction("dismiss", person.id)} onMute={() => stageAction("mute", person.id)} onProfile={() => onProfile(person)}/>;
  };
  return <main className={`podcast-room ${chatOpen ? "chat-open" : ""} ${controlsVisible ? "controls-visible" : ""} ${canModerate ? "moderator-view" : "audience-view"}`}>
    <header className="podcast-header">
      <a href="/" className="room-brand"><span>n2</span><b>nice 2 network</b></a>
      <div className="podcast-header-mark" aria-label={`${meeting?.visibility ?? "private"} podcast`}><Podcast size={20}/><span>{meeting?.visibility} podcast</span></div>
      <button className="room-count room-count-button" aria-label="Show everyone in this podcast" onClick={() => setParticipantPanelOpen(true)}><Headphones size={17}/><strong>{participantCount}</strong><span>/{meeting?.maxParticipants ?? 16}</span></button>
    </header>
    <div className="podcast-layout">
      <section className="podcast-main">
        {error && <p className="podcast-error">{error}</p>}
        <div className="podcast-canopy" aria-label={meeting?.title}><span>LIVE PODCAST</span><h1>{meeting?.title ?? "n2 podcast"}</h1><i/><i/><i/><Podcast/></div>
        <section className={`podcast-table-stage ${stage.length === 1 ? "single-host-stage" : ""}`} aria-label="Podcast stage">
          <div className="podcast-host-row">{hosts.map(card)}</div>
          <div className="podcast-table-middle"><div className="podcast-cohost-side left">{cohosts.filter((_, index) => index % 2 === 0).map(card)}</div><div className="podcast-table-surface"><span className="n2-table-mark">n2</span><small>{isListener ? "Listening" : currentRole === "host" ? "Hosting" : "On stage"}</small></div><div className="podcast-cohost-side right">{cohosts.filter((_, index) => index % 2 === 1).map(card)}</div></div>
          <div className="podcast-guest-row">{guests.map(card)}</div>
        </section>
        {audienceSpeakers.length > 0 && <section className="audience-speakers"><header><span>AUDIENCE CONTRIBUTORS</span><small>Temporarily on stage</small></header><div>{audienceSpeakers.map(card)}</div></section>}
        {canModerate && requests.length > 0 && <section className="speaker-requests"><header><span>QUESTIONS & REQUESTS TO SPEAK</span><strong>{requests.length}</strong></header>{requests.map(person => <div key={person.id}><PersonImage src={person.image}/><span><b>{person.name}</b><small>{person.profession || "n2 member"}</small></span><button onClick={() => stageAction("dismiss", person.id)}><X size={15}/></button><button className="approve" onClick={() => stageAction("approve", person.id)}><UserRoundCheck size={15}/>Bring up</button></div>)}</section>}
      </section>
      <PodcastChat messages={messages} me={me} canModerate={canModerate} onSubmit={sendChat} onClose={() => setChatOpen(false)}/>
    </div>
    <footer className="podcast-controls">
      {!isListener && <button className={muted ? "off" : ""} onClick={toggleMute}>{muted ? <MicOff/> : <Mic/>}<span>{muted ? "Unmute" : "Mute"}</span></button>}
      {isListener && <button className={`request-mic ${requested ? "requested" : ""}`} onClick={() => stageAction(requested ? "cancel_request" : "request_speak")}>{requested ? <X/> : <Podcast/>}<span>{requested ? "Cancel request" : "Request to speak"}</span></button>}
      {!isListener && <button onClick={openSettings}><Settings2/><span>Devices</span></button>}
      <button className="chat-toggle" onClick={() => setChatOpen(!chatOpen)}><MessageCircle/><span>{canModerate ? "Host console" : "Chat & questions"}</span>{!chatOpen && unreadChat > 0 && <b>{unreadChat > 99 ? "99+" : unreadChat}</b>}</button>
      <button className="hangup" onClick={leave}><PhoneOff/><span>Leave</span></button>
    </footer>
    {participantPanelOpen && <ParticipantPanel people={people} currentUserId={me?.id} connectedIds={connectedIds} connectionStates={connectionStates} onClose={() => setParticipantPanelOpen(false)} onProfile={person => { setParticipantPanelOpen(false); onProfile(person); }}/>}
  </main>;
}

function PodcastCard({ person, stream, outputDeviceId, local, status, muted, active, onSpeaking, canModerate, onDismiss, onMute, onProfile }: { person: Person; stream?: MediaStream; outputDeviceId: string; local: boolean; status: ConnectionStatus; muted: boolean; active: boolean; onSpeaking: (speaking: boolean) => void; canModerate: boolean; onDismiss: () => void; onMute: () => void; onProfile: () => void }) {
  useSpeaking(stream, status === "connected" && !muted, onSpeaking);
  const label = person.role === "host" ? "HOST" : person.role === "cohost" ? "CO-HOST" : person.role === "audience_speaker" ? "AUDIENCE SPEAKER" : "GUEST SPEAKER";
  const statusLabel = status === "awaiting" ? "Awaiting to join" : status === "connecting" ? "Connecting" : status === "disconnected" ? "Disconnected" : "";
  return <article className={`podcast-card role-${person.role} status-${status} ${active ? "speaking" : ""}`}>
    {!local && stream && <RemoteAudio stream={stream} outputDeviceId={outputDeviceId}/>}
    <button className="podcast-avatar-wrap" onClick={onProfile} aria-label={`View ${person.name ?? "member"} profile`}>{status === "connected" ? <PersonImage src={person.image}/> : <span>{statusLabel}</span>}</button>
    <button className="podcast-identity" onClick={onProfile}><span><b>{person.name ?? "n2 member"}</b><small>{person.profession || person.professionalHeadline || "n2 member"}</small></span><em>{label}</em><div className={`podcast-mic ${muted ? "muted" : ""}`}>{muted ? <MicOff/> : <Podcast/>}</div></button>
    {canModerate && status === "connected" && <div className="podcast-member-actions"><button onClick={onMute}><MicOff size={14}/>Mute</button><button onClick={onDismiss}><UserMinus size={14}/>Dismiss</button></div>}
  </article>;
}

function PodcastChat({ messages, me, canModerate, onSubmit, onClose }: { messages: ChatMessage[]; me: Person | null; canModerate: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onClose: () => void }) {
  const [draft, setDraft] = useState("");
  const [activeTab, setActiveTab] = useState<"chat" | "questions">("chat");
  const visibleMessages = messages.filter(message => activeTab === "questions" ? message.kind === "question" : message.kind !== "question");
  return <aside className="podcast-chat"><header><div><span>{canModerate ? "HOST CONSOLE" : "LISTENER VIEW"}</span><b>{canModerate ? "Moderate the live room" : "Join the conversation"}</b></div><button onClick={onClose}><X/></button></header><nav className="podcast-chat-tabs" aria-label="Podcast conversation"><button className={activeTab === "chat" ? "active" : ""} onClick={() => setActiveTab("chat")}><MessageCircle/>Chat</button><button className={activeTab === "questions" ? "active" : ""} onClick={() => setActiveTab("questions")}><span>?</span>Questions{canModerate && messages.some(message => message.kind === "question") && <b>{messages.filter(message => message.kind === "question").length}</b>}</button></nav><div className="podcast-chat-feed">{visibleMessages.length ? visibleMessages.map(message => <article className={`${message.author.id === me?.id ? "mine" : ""} ${message.kind === "question" ? "question" : ""}`} key={message.id}><PersonImage src={message.author.image}/><div><strong>{message.author.name ?? "n2 member"}{message.kind === "question" && <em>Question</em>}</strong><p>{message.body}</p><time>{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time></div></article>) : <div className="chat-empty">{activeTab === "questions" ? <b>?</b> : <MessageCircle/>}<b>{activeTab === "questions" ? (canModerate ? "No listener questions yet" : "Ask the hosts a question") : "Start the room chat"}</b><span>{activeTab === "questions" ? (canModerate ? "Questions submitted by listeners appear here for hosts and co-hosts only." : "Your questions are private to the host team.") : "Everyone in the room can take part."}</span></div>}</div><form onSubmit={event => { onSubmit(event); setDraft(""); }}><input name="message" value={draft} onChange={event => setDraft(event.target.value)} maxLength={1200} placeholder={activeTab === "questions" ? "Ask the hosts…" : "Say something useful…"}/><input type="hidden" name="kind" value={activeTab === "questions" ? "question" : "message"}/><button className={activeTab === "questions" ? "question-send" : ""} aria-label={activeTab === "questions" ? "Send question to the hosts" : "Send to room"}>{activeTab === "questions" ? <b>?</b> : <Send/>}</button></form></aside>;
}

function RemoteAudio({ stream, outputDeviceId }: { stream: MediaStream; outputDeviceId: string }) {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.srcObject = stream;
    const media = ref.current as HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> };
    if (outputDeviceId && media.setSinkId) media.setSinkId(outputDeviceId).catch(() => undefined);
    const play = () => ref.current?.play().then(() => {
      document.removeEventListener("pointerdown", play);
      document.removeEventListener("keydown", play);
    }).catch(() => undefined);
    play();
    document.addEventListener("pointerdown", play);
    document.addEventListener("keydown", play);
    return () => {
      document.removeEventListener("pointerdown", play);
      document.removeEventListener("keydown", play);
    };
  }, [stream, outputDeviceId]);
  return <audio ref={ref} autoPlay/>;
}

function ParticipantPanel({ people, currentUserId, connectedIds, connectionStates, onClose, onProfile }: { people: Person[]; currentUserId?: string; connectedIds: Set<string>; connectionStates: Record<string, ConnectionStatus>; onClose: () => void; onProfile: (person: Person) => void }) {
  const unique = [...new Map(people.map(person => [person.id, person])).values()];
  const statusFor = (person: Person): ConnectionStatus => person.id === currentUserId || connectedIds.has(person.id) ? (connectionStates[person.id] ?? "connected") : connectionStates[person.id] ?? (person.status === "left" ? "disconnected" : "awaiting");
  return <div className="meet-panel-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}><aside className="meeting-participant-panel"><header><div><span>IN THIS ROOM</span><h2>{unique.length} people</h2></div><button onClick={onClose}><X/></button></header><div>{unique.map(person => { const status = statusFor(person); return <button key={person.id} onClick={() => onProfile(person)}><span className={`panel-avatar status-${status}`}>{status === "connected" ? <PersonImage src={person.image}/> : <small>{status === "awaiting" ? "Awaiting to join" : status === "connecting" ? "Connecting" : "Disconnected"}</small>}</span><span><strong>{person.name ?? "n2 member"}{person.id === currentUserId ? " (you)" : ""}</strong><small>{person.role ? person.role.replace("_", " ") : person.profession || "participant"}</small></span><em className={`status-dot ${status}`}>{status === "connected" ? "Connected" : status === "awaiting" ? "Awaiting" : status}</em></button>; })}</div></aside></div>;
}

function MeetProfilePreview({ person, onClose }: { person: Person; onClose: () => void }) {
  return <div className="meet-profile-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}><section className="meet-profile-preview"><button className="meet-profile-close" onClick={onClose}><X/></button><div className="meet-profile-cover"><span>n2</span></div><PersonImage src={person.image}/><span>n2 PROFILE</span><h2>{person.name ?? "n2 member"}</h2><p>{person.professionalHeadline || person.profession || "n2 member"}</p>{person.city && <small>{person.city}</small>}<a href={`/profile/${person.id}`}>View full profile</a></section></div>;
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
  return <div className="room-settings-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}><section className="room-settings"><header><div><span>YOUR DEVICES</span><h2>Audio & video settings</h2></div><button onClick={onClose}><X/></button></header><label><Mic/>Microphone<select value={microphoneId} onChange={event => onInput("audio", event.target.value)}>{devices.microphones.map(device => <option key={device.deviceId} value={device.deviceId}>{device.label}</option>)}</select></label>{video && <label><Camera/>Camera<select value={cameraId} onChange={event => onInput("video", event.target.value)}>{devices.cameras.map(device => <option key={device.deviceId} value={device.deviceId}>{device.label}</option>)}</select></label>}<label><Volume2/>Speakers<select value={speakerId} onChange={event => onSpeaker(event.target.value)} disabled={!devices.speakers.length}>{devices.speakers.length ? devices.speakers.map(device => <option key={device.deviceId} value={device.deviceId}>{device.label}</option>) : <option>System default</option>}</select></label><button className="primary-action" onClick={onClose}><Check/>Done</button></section></div>;
}

function ParticipantTile({ person, stream, cameraOn, muted, local = false, compact = false, active = false, videoRef, outputDeviceId, onClick, onSpeaking }: { person: Person; stream?: MediaStream; cameraOn: boolean; muted: boolean; local?: boolean; compact?: boolean; active?: boolean; videoRef?: RefObject<HTMLVideoElement | null>; outputDeviceId: string; onClick?: () => void; onSpeaking?: (speaking: boolean) => void }) {
  const ownRef = useRef<HTMLVideoElement>(null); const ref = videoRef ?? ownRef;
  useEffect(() => {
    if (!ref.current || !stream) return;
    ref.current.srcObject = stream;
    const media = ref.current as HTMLVideoElement & { setSinkId?: (id: string) => Promise<void> };
    if (outputDeviceId && media.setSinkId) media.setSinkId(outputDeviceId).catch(() => undefined);
    const play = () => media.play().then(() => { document.removeEventListener("pointerdown", play); document.removeEventListener("keydown", play); }).catch(() => undefined);
    play(); document.addEventListener("pointerdown", play); document.addEventListener("keydown", play);
    return () => { document.removeEventListener("pointerdown", play); document.removeEventListener("keydown", play); };
  }, [stream, outputDeviceId, ref]);
  useSpeaking(stream, !muted, onSpeaking ?? (() => undefined));
  const name = local ? "You" : person.name ?? "n2 member";
  const hasVideo = cameraOn && Boolean(stream?.getVideoTracks().length);
  const activate = (event: KeyboardEvent<HTMLElement>) => { if (onClick && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); onClick(); } };
  // Interaction props are only present for actionable tiles and always include keyboard support.
  // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
  return <article className={`participant-tile ${compact ? "compact" : "stage-participant"} ${hasVideo ? "camera-on" : "camera-off"} ${active ? "active-speaker" : ""}`} onClick={onClick} onKeyDown={activate} role={onClick ? "button" : undefined} tabIndex={onClick ? 0 : undefined} aria-label={onClick ? `Make ${name} the main view` : undefined}><video ref={ref} autoPlay playsInline muted={local}/>{!hasVideo && <div className="profile-standin"><PersonImage src={person.image}/><strong>{name}</strong><small>{person.profession || "n2 member"}</small></div>}<div className="participant-label"><span>{name}</span>{muted && <MicOff size={compact ? 12 : 14}/>}</div>{!local && !compact && <div className="participant-quick-card"><PersonImage src={person.image}/><div><strong>{person.name ?? "n2 member"}</strong><span>{person.professionalHeadline || person.profession || "n2 member"}</span>{person.city && <small>{person.city}</small>}</div></div>}</article>;
}
