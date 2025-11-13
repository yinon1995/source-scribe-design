import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { createConnection } from "node:net";
import "dotenv/config";

function canReach(port: number, host = "127.0.0.1", timeoutMs = 400): Promise<boolean> {
	return new Promise<boolean>((resolve) => {
		const socket = createConnection({ port, host });
		const done = (value: boolean) => {
			try {
				socket.destroy();
			} catch {
				// ignore
			}
			resolve(value);
		};
		socket.on("connect", () => done(true));
		socket.on("error", () => done(false));
		setTimeout(() => done(false), timeoutMs);
	});
}

function devApiPlugin(enabled: boolean): Plugin {
	return {
		name: "dev-api-subscribe",
		configureServer(server) {
			if (!enabled) return;
			// Subscribe stub
			server.middlewares.use("/api/subscribe", (req, res) => {
				res.setHeader("Access-Control-Allow-Origin", "*");
				res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
				res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
				res.setHeader("X-Debug", "vite-dev-stub:/api/subscribe");
				if (req.method === "OPTIONS") {
					res.statusCode = 204;
					res.end();
					return;
				}
				if (req.method !== "POST") {
					res.statusCode = 405;
					res.setHeader("Content-Type", "application/json");
					res.end(JSON.stringify({ error: "Method not allowed" }));
					return;
				}
				res.setHeader("Content-Type", "application/json");
				res.end(JSON.stringify({ ok: true, dev: true }));
			});
			// Contact stub
			server.middlewares.use("/api/contact", (req, res) => {
				res.setHeader("Access-Control-Allow-Origin", "*");
				res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
				res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
				res.setHeader("X-Debug", "vite-dev-stub:/api/contact");
				if (req.method === "OPTIONS") {
					res.statusCode = 204;
					res.end();
					return;
				}
				if (req.method !== "POST") {
					res.statusCode = 405;
					res.setHeader("Content-Type", "application/json");
					res.end(JSON.stringify({ error: "Method not allowed" }));
					return;
				}
				res.setHeader("Content-Type", "application/json");
				res.end(JSON.stringify({ ok: true, dev: true }));
			});
		},
	};
}

// https://vitejs.dev/config/
export default defineConfig(async ({ mode }) => {
	const isDev = mode === "development";
	const useProxyTarget = "http://localhost:3000";
	const reachable = isDev && (await canReach(3000));
	return {
		server: {
			host: "::",
			port: 8080,
			proxy: { "/api": { target: useProxyTarget, changeOrigin: true } },
		},
		plugins: [react(), isDev && componentTagger(), devApiPlugin(isDev && !reachable)].filter(Boolean),
		resolve: {
			alias: {
				"@": path.resolve(__dirname, "./src"),
			},
		},
	};
});
