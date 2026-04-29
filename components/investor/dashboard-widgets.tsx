"use client";

import dynamic from "next/dynamic";

function ChartSkeleton() {
  return <div className="rounded-lg border bg-card h-[320px] animate-pulse" aria-hidden />;
}
function MapSkeleton() {
  return <div className="rounded-lg border bg-card h-[296px] animate-pulse" aria-hidden />;
}

export const FundAllocationChart = dynamic(
  () => import("./fund-allocation-chart").then((m) => m.FundAllocationChart),
  { ssr: false, loading: () => <ChartSkeleton /> },
);

export const ProjectMap = dynamic(
  () => import("./project-map").then((m) => m.ProjectMap),
  { ssr: false, loading: () => <MapSkeleton /> },
);
