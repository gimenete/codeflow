import { parseDiff } from "@/lib/diff";

self.onmessage = (e: MessageEvent<string>) => {
  const result = parseDiff(e.data);
  self.postMessage(result);
};
