import { useMemo, useState } from "react";
export function usePagination<T>(items: T[], pageSize = 20) { const [page, setPage] = useState(1); const totalPages = Math.max(1, Math.ceil(items.length / pageSize)); const data = useMemo(() => items.slice((page - 1) * pageSize, page * pageSize), [items, page, pageSize]); return { page, setPage, totalPages, data, pageSize }; }
