import { useChat } from "@ai-sdk/react";
type Ret = ReturnType<typeof useChat>;
let x: keyof Ret;
