import "./App.css";
import { useSubscription } from "./use-sse";

function App() {
	const sub = useSubscription();

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
						sub(`http://localhost:3000${res.endpoint}`);
					}}
				>
					Send request -{" (FE --> /users/123 BE)"}
				</button>
			</div>
		</>
	);
}

export default App;
