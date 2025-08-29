import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function ImagePreviewSkeleton() {
  return (
    <Card className="bg-card border border-border rounded-xl w-full overflow-hidden">
      <CardContent className="p-0">
        {/* Image Preview Skeleton */}
        <div className="relative">
          <Skeleton className="w-full aspect-video" />
          {/* Format Badge Skeleton */}
          <div className="absolute bottom-3 right-3">
            <Skeleton className="h-6 w-12 rounded-full" />
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="p-6 space-y-6">
          {/* File Info Skeleton */}
          <div className="space-y-3">
            <Skeleton className="h-5 w-3/4" />
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-12" />
            </div>
          </div>

          {/* Filename Editing Skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-10 w-full rounded-md" />
          </div>

          {/* Download Button Skeleton */}
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      </CardContent>
    </Card>
  );
}

interface ImagePreviewSkeletonsProps {
  count?: number;
}

export function ImagePreviewSkeletons({ count = 3 }: ImagePreviewSkeletonsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-6">
      {Array.from({ length: count }, (_, index) => (
        <ImagePreviewSkeleton key={index} />
      ))}
    </div>
  );
}
