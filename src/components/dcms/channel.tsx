import { MessageSquare, Smartphone } from "lucide-react";
import type { Channel } from "@/data/mock";
import { cn } from "@/lib/utils";

export function ChannelIcon({ channel, className }: { channel: Channel; className?: string }) {
  const Icon = channel === "sms" ? MessageSquare : Smartphone;
  return <Icon aria-label={channel === "sms" ? "SMS" : "App"} className={cn("size-4 shrink-0 text-ink-muted", className)} />;
}

export function ChannelLabel({ channel }: { channel: Channel }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <ChannelIcon channel={channel} />
      {channel === "sms" ? "SMS" : "App"}
    </span>
  );
}
