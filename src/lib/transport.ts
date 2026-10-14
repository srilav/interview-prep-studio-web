import { createGrpcWebTransport } from "@connectrpc/connect-web";

export const GRPC_WEB_URL = import.meta.env.VITE_GRPC_WEB_URL ?? "http://localhost:8081";
export const WS_URL = import.meta.env.VITE_WS_URL ?? "ws://localhost:8080/ws";

export const transport = createGrpcWebTransport({ baseUrl: GRPC_WEB_URL });
