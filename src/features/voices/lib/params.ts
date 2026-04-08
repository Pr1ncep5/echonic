import { createSearchParamsCache, parseAsString } from "nuqs/server";

export const voicesSearchParams = {
    query: parseAsString.withDefault(""),
};

export const voicesSearchParamsCache = createSearchParamsCache(voicesSearchParams);