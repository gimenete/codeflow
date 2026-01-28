import { Skeleton } from "@/components/ui/skeleton";

export function SearchResultItemSkeleton() {
  return (
    <div className="px-4 py-2">
      <div className="flex flex-wrap lg:flex-nowrap items-center gap-x-3 gap-y-0.5">
        {/* Icon */}
        <Skeleton className="h-4 w-4 shrink-0 rounded-full" />
        {/* Title */}
        <Skeleton className="h-5 flex-1 min-w-0" />
        {/* Timestamp */}
        <Skeleton className="h-4 lg:h-5 w-16 shrink-0 lg:order-last lg:w-24" />

        {/* Line break for small screens */}
        <div className="basis-full h-0 lg:hidden" />

        {/* Repository */}
        <Skeleton className="h-4 lg:h-5 w-32 ml-6 lg:ml-0 lg:order-4 lg:w-48" />

        {/* Line break for small screens */}
        <div className="basis-full h-0 lg:hidden" />

        {/* Author */}
        <div className="flex items-center gap-1 ml-6 lg:ml-0 lg:order-2 flex-1 lg:flex-none lg:w-32">
          <Skeleton className="h-4 w-4 lg:h-5 lg:w-5 shrink-0 rounded-full" />
          <Skeleton className="h-4 lg:h-5 w-16" />
        </div>

        {/* CI + Approval */}
        <Skeleton className="h-4 lg:h-5 w-8 shrink-0 lg:order-3 lg:w-12" />
      </div>
      <div className="flex items-center gap-1 mt-1 ml-6">
        <Skeleton className="h-5 w-14 shrink-0" />
        <Skeleton className="h-5 w-16 shrink-0" />
      </div>
    </div>
  );
}
