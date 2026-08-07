import { useState, useEffect } from "react";

interface AsyncQueryResult<T> {
    data: T;
    loading: boolean;
    error: string | null;
}

export function useAsyncQuery<T>(
    initial: T,
    fetcher: (() => Promise<T>) | null
): AsyncQueryResult<T> {
    const [data, setData] = useState<T>(initial);
    const [loading, setLoading] = useState(fetcher !== null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (fetcher === null) return;

        let cancelled = false;
        setData(initial);
        setLoading(true);
        setError(null);

        fetcher()
            .then((result) => {
                if (!cancelled) setData(result);
            })
            .catch((err: unknown) => {
                if (!cancelled) setError(err instanceof Error ? err.message : "Unknown error");
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetcher]);

    return { data, loading, error };
}
