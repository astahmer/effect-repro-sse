import { EventsSchema } from "@monorepo/backend/schema";
import { Schema } from "effect";
import { useEffect } from "react";

const parseEvent = Schema.decodeUnknownSync(EventsSchema);

function listener(message: MessageEvent<string>) {
	const evt = parseEvent(JSON.parse(message.data));
	console.log({ message, evt });
}

function makeSource(url: string) {
	const src = new EventSource(url);
	src.addEventListener("message", listener);
	return src;
}

export function useSSE(url: string | undefined) {
	useEffect(() => {
		if (!url) return;
		const source = makeSource(url);

		return () => {
			console.log("$closing source");
			source.removeEventListener("message", listener);
			source.close();
		};
	}, [url]);
}
