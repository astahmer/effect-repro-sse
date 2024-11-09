import { Effect, FiberRef, PubSub, Stream } from "effect";
import type { NonEmptyReadonlyArray } from "effect/Array";
import type { EventsSchema } from "./events.schema.ts";

const storeId = FiberRef.unsafeMake("events");

export class EventsService extends Effect.Service<EventsService>()(
	"EventsService",
	{
		accessors: true,
		effect: Effect.gen(function* () {
			const pubsub = yield* PubSub.unbounded<{
				evt: ClientEvents;
				namespace: string;
			}>();

			const service = {
				publish: (...evts: NonEmptyReadonlyArray<ClientEvents>) => {
					return Effect.gen(function* () {
						const namespace = yield* FiberRef.get(storeId);
						return pubsub.offerAll(evts.map((evt) => ({ evt, namespace })));
					});
				},
				subscribe: pubsub.subscribe,
				shutdown: pubsub.awaitShutdown,
				stream: Stream.fromPubSub(pubsub),
			};

			return service;
		}),
	},
) {}
