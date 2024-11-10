import "./App.css";
import { useSubscription } from "./use-sse";

function App() {
	const sse = useSubscription();

	return (
		<>
			<h1>Effect SSE repro</h1>
			<div
				className="card"
				style={{ display: "flex", flexDirection: "column", gap: "8px" }}
			>
				<button
					type="button"
					style={{ backgroundColor: "green" }}
					onClick={async () => {
						const res = await fetch("http://localhost:3000/users/123").then(
							(res) => res.json(),
						);
						console.log(res);

						if (res.endpoint) {
							sse.sub(`http://localhost:3000${res.endpoint}`);
						}
					}}
				>
					Send request -{" (FE --> /users/123 BE)"}
				</button>
				{sse.state === "open" && (
					<button
						type="button"
						style={{ backgroundColor: "red" }}
						onClick={() => {
							sse.close();
						}}
					>
						Close
					</button>
				)}
			</div>
			<p style={{ backgroundColor: "teal", color: "white" }}>
				State: {sse.state}
			</p>
			{sse.messages.length ? (
				<pre style={{ border: "1px solid", width: "400px" }}>
					{sse.messages.join("\n")}
				</pre>
			) : null}
		</>
	);
}

export default App;
