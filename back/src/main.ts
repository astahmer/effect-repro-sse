import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { EventsService } from "./events.service.ts";
import { HttpLive } from "./http/http.live.ts";

const ProgramLive = HttpLive.pipe(Layer.provide(EventsService.Default));

NodeRuntime.runMain(
	Layer.launch(ProgramLive).pipe(
		Effect.scoped,
		Effect.provide(NodeContext.layer),
	),
);
