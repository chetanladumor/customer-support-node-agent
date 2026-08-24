import { type Message } from "@ai-sdk/react";
type TI = NonNullable<Message["toolInvocations"]>[0];

console.log("TI type checked");
