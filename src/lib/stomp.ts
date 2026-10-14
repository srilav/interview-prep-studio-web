import { Client, type StompSubscription } from "@stomp/stompjs";
import { useEffect, useRef, useState } from "react";
import { WS_URL } from "./transport";

type Subscription = { destination: string; handler: (body: unknown) => void; stomp?: StompSubscription };

const subscriptions = new Set<Subscription>();
const statusListeners = new Set<(connected: boolean) => void>();
let client: Client | null = null;

function setConnected(connected: boolean) {
  statusListeners.forEach((l) => l(connected));
}

function attach(sub: Subscription) {
  if (!client?.connected) return;
  sub.stomp = client.subscribe(sub.destination, (frame) => {
    try {
      sub.handler(JSON.parse(frame.body));
    } catch (e) {
      console.warn("Ignoring malformed discussion frame", e);
    }
  });
}

function ensureClient(): Client {
  if (client) return client;
  client = new Client({
    brokerURL: WS_URL,
    reconnectDelay: 3000,
    onConnect: () => {
      setConnected(true);
      subscriptions.forEach(attach);
    },
    onWebSocketClose: () => setConnected(false),
    onStompError: (frame) => console.warn("STOMP error", frame.headers["message"]),
  });
  client.activate();
  return client;
}

export function subscribe(destination: string, handler: (body: unknown) => void): () => void {
  ensureClient();
  const sub: Subscription = { destination, handler };
  subscriptions.add(sub);
  attach(sub);
  return () => {
    subscriptions.delete(sub);
    try {
      sub.stomp?.unsubscribe();
    } catch {
      // Connection already closed.
    }
  };
}

export function publish(destination: string, body: unknown): void {
  const c = ensureClient();
  if (!c.connected) throw new Error("Not connected to the discussion server yet. It reconnects automatically; try again in a moment.");
  c.publish({ destination, body: JSON.stringify(body) });
}

/** Subscribes to a destination for the lifetime of the component. Pass null to skip. */
export function useStompTopic(destination: string | null, handler: (body: unknown) => void): void {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (!destination) return;
    return subscribe(destination, (body) => ref.current(body));
  }, [destination]);
}

export function useStompConnected(): boolean {
  const [connected, setState] = useState(() => client?.connected ?? false);
  useEffect(() => {
    ensureClient();
    setState(client?.connected ?? false);
    statusListeners.add(setState);
    return () => {
      statusListeners.delete(setState);
    };
  }, []);
  return connected;
}
