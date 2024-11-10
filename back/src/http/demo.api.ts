import { HttpApi, HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Schema } from "effect";

export class DemoError extends Schema.TaggedError<DemoError>()("DemoError", {
	cause: Schema.Any,
}) {}

export const DemoApi = HttpApi.empty.add(
	HttpApiGroup.make("demo")
		.add(
			HttpApiEndpoint.get("user.$userId", "/users/:userId")
				.setPath(
					Schema.Struct({
						userId: Schema.NonEmptyString,
					}),
				)
				.addSuccess(
					Schema.Struct({
						userId: Schema.NonEmptyString,
						endpoint: Schema.NonEmptyString,
					}),
				)
				.addError(DemoError),
		)
		.add(
			HttpApiEndpoint.get("sse.$userid", "/sse/:userId")
				.setPath(
					Schema.Struct({
						userId: Schema.NonEmptyString,
					}),
				)
				.addError(DemoError)
				.addSuccess(Schema.Any),
		),
);
