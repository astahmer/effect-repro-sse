import { Headers, HttpApiBuilder, HttpServerResponse } from "@effect/platform";
import { Effect, Mailbox, RcMap, Schedule, Stream } from "effect";
import { DemoApi, DemoError } from "./demo.api.ts";

const oneToFive = Stream.range(1, 5).pipe(
	Stream.map(String),
	Stream.forever,
	Stream.take(5),
);

const keepAlive = Stream.fromSchedule(Schedule.spaced("1 second")).pipe(
	Stream.as("event:ping\n\n"),
);

export class JobRunner extends Effect.Service<JobRunner>()("JobRunner", {
	accessors: true,
	scoped: Effect.gen(function* () {
		const scope = yield* Effect.scope;
		const map = yield* RcMap.make({
			capacity: 128,
			idleTimeToLive: "1 second",
			lookup: () => Mailbox.make<string>(),
		});

		return {
			create: (userId: string) =>
				RcMap.get(map, userId).pipe(
					Effect.tap((m) =>
						oneToFive.pipe(
							Stream.runForEach((_) => Effect.delay(m.offer(_), "1 second")),
							Effect.zipRight(m.end),
							Effect.forkIn(scope),
						),
					),
					Effect.as(`/sse/${userId}`),
				),
			streamUpdates: (key: string) =>
				RcMap.get(map, key).pipe(
					Effect.map((_) =>
						Mailbox.toStream(_).pipe(
							Stream.map((data) => `data:${data}\n\n`),
							Stream.concat(Stream.make("event:done\ndata:finished\n\n")),
							Stream.merge(keepAlive),
							Stream.encodeText,
							Stream.onStart(Effect.logInfo("streaming..")),
						),
					),
				),
		};
	}),
}) {}

export const DemoLive = HttpApiBuilder.group(DemoApi, "demo", (handlers) => {
	return Effect.gen(function* () {
		const jobRunner = yield* JobRunner;
		return handlers
			.handle("user.$userId", (input) =>
				Effect.gen(function* () {
					const userId = input.path.userId;

					const endpoint = yield* jobRunner.create(userId);
					yield* Effect.log(`create done: ${userId}`);

					return yield* Effect.succeed({ userId, endpoint: endpoint });
				}).pipe(Effect.mapError((_) => new DemoError({ cause: _.message }))),
			)
			.handleRaw("sse.$userid", (input) =>
				Effect.gen(function* () {
					const userId = input.path.userId;
					return yield* jobRunner.streamUpdates(userId).pipe(
						Effect.map((_) =>
							HttpServerResponse.stream(_, {
								headers: Headers.fromInput({
									"content-type": "text/event-stream",
								}),
							}),
						),
					);
				}).pipe(Effect.mapError((_) => new DemoError({ cause: _.message }))),
			);
	});
});
