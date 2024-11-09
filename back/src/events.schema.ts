import { Schema } from "effect";

export class DemoEvent extends Schema.Class<DemoEvent>("DemoEvent")({
	id: Schema.String,
	at: Schema.DateFromString,
}) {}

export const EventsSchema = Schema.Union(DemoEvent);
export type EventsSchema = Schema.Schema.Type<typeof EventsSchema>;
