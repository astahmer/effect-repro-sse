function makeSource(url: string) {
	const source = new EventSource(url);
	source.addEventListener("message", (e) => {
		const parsed = JSON.parse(e.data);
		if (parsed === "done") {
			source.close();
		}
	});
	return source;
}

export function useSubscription() {
	return (url: string | undefined) => {
		if (!url) return;
		const source = makeSource(url);

		return () => {
			console.log("$closing source");
			source.close();
		};
	};
}
