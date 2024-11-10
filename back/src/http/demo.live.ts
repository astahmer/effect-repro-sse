import { Headers, HttpApiBuilder, HttpServerResponse } from "@effect/platform";
import { Cache, Duration, Effect, Exit, Mailbox, RcMap, Stream } from "effect";
import { DemoApi, DemoError } from "./demo.api.ts";

export class JobRunner extends Effect.Service<JobRunner>()("JobRunner", {
	accessors: true,
	scoped: Effect.gen(function* () {
		const scope = yield* Effect.scope;
		const map = yield* Cache.make({
			capacity: 100,
			timeToLive: Duration.minutes(10),
			lookup: (key: string) =>
				Effect.gen(function* () {
					console.log(`looking up ${key}`);
					const mailbox = yield* Mailbox.make<string>();
					return mailbox;
				}),
		});

		return {
			create: (userId: string) =>
				Effect.gen(function* () {
					// TODO start async job
					const mailbox = yield* map.get(userId);
					yield* Effect.log(`create start: ${userId}`);
					yield* mailbox.offer("starting");

					yield* Effect.gen(function* () {
						yield* mailbox.offer("1").pipe(Effect.delay(1000));
						yield* Effect.log(1);
						yield* mailbox.offer("2").pipe(Effect.delay(1000));
						yield* Effect.log(2);
						yield* mailbox.offer("3").pipe(Effect.delay(1000));
						yield* Effect.log(3);
						yield* mailbox.offer("4").pipe(Effect.delay(1000));
						yield* Effect.log(4);
						yield* mailbox.offer("5").pipe(Effect.delay(1000));
						yield* Effect.log(5);
						yield* mailbox.offer("done");
						yield* mailbox.end;
					}).pipe(Effect.forkIn(scope));

					return `/sse/${userId}`;
				}),
			streamUpdates: (key: string) =>
				Effect.gen(function* () {
					if (!map.contains(key)) {
						return yield* Effect.fail(
							new DemoError({
								cause: `key not found: ${key}`,
							}),
						);
					}

					const mailbox = yield* map.get(key);
					console.log("stream", mailbox.toJSON());
					const stream = Mailbox.toStream(mailbox);
					return stream;
				}),
		};
	}),
}) {}

export const DemoLive = HttpApiBuilder.group(DemoApi, "demo", (handlers) =>
	handlers
		.handle("user.$userId", (input) =>
			Effect.gen(function* () {
				const userId = input.path.userId;

				const jobRunner = yield* JobRunner;
				const endpoint = yield* jobRunner.create(userId);
				yield* Effect.log(`create done: ${userId}`);

				return yield* Effect.succeed({ userId, endpoint: endpoint });
			}),
		)
		.handleRaw("sse.$userid", (input) =>
			Effect.gen(function* () {
				const userId = input.path.userId;
				yield* Effect.log(`streaming job updates for user ${userId}`);

				const jobRunner = yield* JobRunner;
				const stream = yield* jobRunner.streamUpdates(userId);

				const encoder = new TextEncoder();

				const res = HttpServerResponse.stream(
					stream.pipe(
						Stream.map((evt) =>
							encoder.encode(`data: ${JSON.stringify(evt)}\n\n`),
						),
					),
					{
						contentType: "text/event-stream",
						headers: Headers.fromInput({
							"content-type": "text/event-stream",
							"cache-control": "no-cache",
							"x-accel-buffering": "no",
							connection: "keep-alive", // if (req.httpVersion !== "2.0")
						}),
					},
				);

				return res;
			}),
		),
);
