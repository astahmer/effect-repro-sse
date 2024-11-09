import { Headers, HttpServerResponse } from "@effect/platform";
import {
	Duration,
	Effect,
	pipe,
	Schedule,
	Schema,
	Stream
} from "effect";
import { EventsSchema } from "../events.schema.ts";
import { EventsService } from "../events.service.ts";

// https://github.com/effect-app/libs/blob/109fe42ef3ac939e0b879c87105db1a18303067b/packages/infra/src/api/internal/events.ts#L10

const keepAlive = Stream.schedule(
	Effect.succeed(":keep-alive"),
	Schedule.fixed(Duration.seconds(1)),
);

export const makeSSE =
	Effect.gen(function* () {
		const eventsService = yield* EventsService;
		const events = eventsService.stream;
		yield* Effect.log("$ start listening to events");

		const encoder = new TextEncoder();
		const schemaEnc = Schema.encode(EventsSchema);
		const eventStream = Stream.flatMap(events, (_) =>
			schemaEnc(_.evt).pipe(
				Effect.andThen(
					(evt) => `id: ${_.evt.id}\ndata: ${JSON.stringify(evt)}`,
				),
			),
		);

		const stream = pipe(
			Stream.succeed("retry: 10000"),
			Stream.merge(keepAlive),
			Stream.merge(eventStream),
			Stream.map((_) => encoder.encode(`${_}\n\n`)),
		);

		const res = HttpServerResponse.stream(stream.pipe(), {
			contentType: "text/event-stream",
			headers: Headers.fromInput({
				"content-type": "text/event-stream",
				"cache-control": "no-cache",
				"x-accel-buffering": "no",
				connection: "keep-alive", // if (req.httpVersion !== "2.0")
			}),
		});

		return res;
	}
);
