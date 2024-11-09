import { HttpApiBuilder } from "@effect/platform";
import { Effect } from "effect";
import { DemoEvent } from "../events.schema.ts";
import { EventsService } from "../events.service.ts";
import { nanoid } from "../lib/nanoid.ts";
import { DemoApi } from "./demo.api.ts";
import { makeSSE } from "./sse.ts";

export const DemoLive = HttpApiBuilder.group(DemoApi, "demo", (handlers) =>
	handlers.handle("hello", (_input) =>
		Effect.gen(function* () {
			const events = yield* EventsService;
			yield* events.publish(new DemoEvent({ at: new Date(), id: nanoid() }));

			return yield* Effect.succeed("Hello");
		}),
	).handleRaw("sse", (_) => makeSSE),
);
