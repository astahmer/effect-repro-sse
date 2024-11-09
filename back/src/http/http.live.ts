import { DevTools } from "@effect/experimental";
import { HttpApiBuilder, HttpApiSwagger, HttpMiddleware, HttpServer } from "@effect/platform";
import { NodeHttpServer, NodeSocket } from "@effect/platform-node";
import { Config, Layer, pipe } from "effect";
import { createServer } from "node:http";
import { DemoLive } from "./demo.live.ts";
import { Api } from "./http.api.ts";

const ApiLive = HttpApiBuilder.api(Api).pipe(
	Layer.provide(DemoLive),
);

const ServerLive = pipe(
	Config.number("PORT").pipe(Config.withDefault(3000)),
	Config.map((port) => NodeHttpServer.layer(createServer, { port })),
	Layer.unwrapEffect,
);

const DevToolsLive = DevTools.layerWebSocket().pipe(
	Layer.provide(NodeSocket.layerWebSocketConstructor),
);
export const HttpLive = HttpApiBuilder.serve(HttpMiddleware.logger).pipe(
	Layer.provide(HttpApiSwagger.layer({ path: "/docs" })),
	Layer.provide(HttpApiBuilder.middlewareOpenApi()),
	// Log the address the server is listening on
	HttpServer.withLogAddress,
	Layer.provide(ApiLive),
	Layer.provide(HttpApiBuilder.middlewareCors()),
	Layer.provide(ServerLive),
	Layer.provide(DevToolsLive),
);
