import { Headers, HttpApiBuilder, HttpServerResponse } from "@effect/platform";
import { Effect, Mailbox, RcMap, Stream } from "effect";
import { DemoApi, DemoError } from "./demo.api.ts";

export class JobRunner extends Effect.Service<JobRunner>()("JobRunner", {
	accessors: true,
	scoped: Effect.gen(function* () {
		const scope = yield* Effect.scope;
		const map = yield* RcMap.make({
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
					const mailbox = yield* RcMap.get(map, userId);
					yield* Effect.log(`create start: ${userId}`);
					yield* mailbox.offer("starting");

					yield* Stream.range(1, 5).pipe(
						Stream.debounce("1 second"),
						Stream.map(String),
						Stream.runForEach((current) => {
							return Effect.gen(function* () {
								yield* Effect.log(`job ${userId} emitting ${current}`);
								return yield* mailbox.offer(current);
							});
						}),
						Effect.forkIn(scope),
					);

					return `/sse/${userId}`;
				}),
			streamUpdates: (key: string) =>
				Effect.gen(function* () {
					const currentKeys = yield* RcMap.keys(map);
					const mailbox = yield* RcMap.get(map, key);
					console.log({ currentKeys, mailbox });
					if (!currentKeys.includes(key)) {
						return yield* Effect.fail(
							new DemoError({
								cause: `key not found: ${key}, current keys: ${currentKeys}`,
							}),
						);
					}

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
					stream.pipe(Stream.map((_) => encoder.encode(`${_}\n\n`))),
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
