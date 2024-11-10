import { useRef, useState } from "react";

export function useSubscription() {
	const [state, setState] = useState<
		"idle" | "open" | "done" | "error" | "closed"
	>("idle");
	const [messages, setMessages] = useState<string[]>([]);

	const ref = useRef<EventSource | null>(null);
	const close = () => {
		if (!ref.current) return;

		const source = ref.current;
		console.log("Closing source");
		setState("closed");
		setMessages((messages) => [...messages, "<<closed>>"]);
		source.close();
		ref.current = null;
	};

	return {
		state,
		messages,
		close,
		sub: (url: string) => {
			const source = new EventSource(url);
			ref.current = source;

			source.addEventListener("open", () => {
				console.log("Connection to server opened.");
				setState("open");
				setMessages((messages) => [...messages, "<<open>>"]);
			});

			source.addEventListener("message", (e) => {
				console.log(e.data);
				setMessages((messages) => [...messages, e.data]);
			});

			source.addEventListener("done", () => {
				console.log("Stream is done.");
				setState("done");
				setMessages((messages) => [...messages, "<<done>>"]);
				source.close();
			});

			source.addEventListener("error", () => {
				setState("error");
				setMessages((messages) => [...messages, "<<error>>"]);
				console.error("Connection Error!");
			});

			return close;
		},
	};
}
