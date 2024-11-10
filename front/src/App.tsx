import { useState } from "react";
import "./App.css";
import { useSSE } from "./use-sse";

function App() {
	const [sseEndoint, setSseEndpoint] = useState<string>();
	useSSE(sseEndoint ? `http://localhost:3000${sseEndoint}` : undefined);

	return (
		<>
			<h1>Effect SSE repro</h1>
			<div className="card">
				<button
					type="button"
					onClick={async () => {
						const res = await fetch("http://localhost:3000/users/123").then(
							(res) => res.json(),
						);
						console.log(res);
						setSseEndpoint(res.endpoint);
					}}
				>
					Send request -{" (FE --> /users/123 BE)"}
				</button>
			</div>
		</>
	);
}

export default App;
