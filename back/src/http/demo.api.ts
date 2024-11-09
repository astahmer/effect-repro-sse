import { HttpApi, HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Schema } from "effect";

export class DemoError extends Schema.TaggedError<DemoError>()(
	"DemoError",
	{},
) {}

export const DemoApi = HttpApi.empty.add(
	HttpApiGroup.make("demo")
		.add(
			HttpApiEndpoint.get("hello", "/hello")
				.addSuccess(Schema.String)
				.addError(DemoError),
		)
		.add(HttpApiEndpoint.get("sse", "/sse").addSuccess(Schema.Any)),
);
