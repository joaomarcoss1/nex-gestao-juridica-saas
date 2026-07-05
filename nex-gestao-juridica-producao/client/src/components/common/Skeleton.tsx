export function Skeleton({ lines = 3 }: { lines?: number }) { return <div className="skeleton-box">{Array.from({ length: lines }).map((_, i) => <span key={i}/>)}</div>; }
