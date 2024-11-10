import { NodeRuntime } from "@effect/platform-node";
import { Layer } from "effect";
import { EventsService } from "./events.service.ts";
import { HttpLive } from "./http/http.live.ts";
import { JobRunner } from "./http/demo.live.ts";

const ProgramLive = HttpLive.pipe(
	Layer.provide(EventsService.Default),
	Layer.provide(JobRunner.Default),
);

Layer.launch(ProgramLive).pipe(NodeRuntime.runMain);
