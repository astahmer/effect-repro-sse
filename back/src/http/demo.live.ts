import { Headers, HttpApiBuilder, HttpServerResponse } from "@effect/platform";
import { Cache, Effect, Mailbox, Schedule, Stream } from "effect";
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
		const map = yield* Cache.make({
			capacity: 128,
			timeToLive: "10 minutes",
			lookup: () => Mailbox.make<string>(),
		});

		return {
			create: (userId: string) =>
				map.get(userId).pipe(
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
				map.getOption(key).pipe(
					Effect.flatten,
					Effect.map((_) =>
						Mailbox.toStream(_).pipe(
							Stream.map((data) => `data:${data}\n\n`),
							Stream.concat(
								Stream.make("event:done\ndata:finished\n\n").pipe(
									Stream.tap(() => map.invalidate(key)),
								),
							),
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
				}),
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
