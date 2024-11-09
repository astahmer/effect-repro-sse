import { HttpApi } from "@effect/platform";
import { DemoApi } from "./demo.api.ts";

export class Api extends HttpApi.empty
	.addHttpApi(DemoApi) {
}
