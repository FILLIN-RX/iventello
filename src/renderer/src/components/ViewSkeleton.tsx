import React from 'react'

export function ViewSkeleton() {
  return (
    <div className="space-y-6 animate-pulse p-2">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-muted rounded-md" />
          <div className="h-4 w-72 bg-muted/60 rounded-md" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-28 bg-muted rounded-md" />
          <div className="h-10 w-32 bg-muted rounded-md" />
        </div>
      </div>

      {/* Stats cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-xl border bg-card/50 p-4 space-y-3">
            <div className="flex justify-between items-center">
              <div className="h-4 w-24 bg-muted rounded" />
              <div className="h-8 w-8 rounded-full bg-muted" />
            </div>
            <div className="h-6 w-32 bg-muted rounded" />
          </div>
        ))}
      </div>

      {/* Main content / table skeleton */}
      <div className="rounded-xl border bg-card/50 p-6 space-y-4">
        <div className="flex justify-between items-center mb-4">
          <div className="h-10 w-64 bg-muted rounded-md" />
          <div className="h-10 w-40 bg-muted rounded-md" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-12 w-full bg-muted/40 rounded-lg flex items-center px-4 justify-between">
              <div className="h-4 w-1/4 bg-muted rounded" />
              <div className="h-4 w-1/6 bg-muted rounded" />
              <div className="h-4 w-1/6 bg-muted rounded" />
              <div className="h-4 w-1/12 bg-muted rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
