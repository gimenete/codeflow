import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ImageAttachment {
  id: string;
  file: File;
  dataUrl: string;
  base64: string;
  mimeType: string;
}

interface AttachmentPreviewProps {
  attachments: ImageAttachment[];
  onRemove: (id: string) => void;
}

export function AttachmentPreview({
  attachments,
  onRemove,
}: AttachmentPreviewProps) {
  if (attachments.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 p-2 pt-3 border-b">
      {attachments.map((attachment) => (
        <div key={attachment.id} className="relative group">
          <div className="rounded-md overflow-hidden border bg-muted/50">
            <img
              src={attachment.dataUrl}
              alt={attachment.file.name}
              className="h-16 w-16 object-cover"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-1 py-0.5 truncate">
              {attachment.file.name}
            </div>
          </div>
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute -top-1.5 -right-1.5 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => onRemove(attachment.id)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ))}
    </div>
  );
}
