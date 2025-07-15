import { SafeUser } from '@mtes/types';
import { GetServerSidePropsContext } from 'next';

export const getApiBase = (isServerSide: boolean = false): string => {
  const publicApiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333';
  const internalApiUrl = process.env.INTERNAL_API_URL ?? 'http://backend:3333';

  // Use internal API URL for server-side rendering, public API URL for client-side
  return isServerSide ? internalApiUrl : publicApiUrl;
};

export const apiFetch = (
  path: string,
  init?: RequestInit | undefined,
  ctx?: GetServerSidePropsContext
): Promise<Response> => {
  let headers = { ...init?.headers };
  if (ctx) {
    let token: string | undefined = undefined;
    const authHeader = ctx.req.headers.authorization as string;
    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      token = authHeader.split('Bearer ')[1];
    } else {
      token = ctx.req.cookies?.['auth-token'];
    }
    headers = { Authorization: `Bearer ${token}`, ...init?.headers };
  }
  // Use server-side URL when we have server context (SSR), client-side URL otherwise
  const apiBase = getApiBase(!!ctx);
  const fullUrl = apiBase + path;

  console.log(`🌐 Fetching from path: ${path} with headers:`, headers);
  console.log(`🌐 Full URL: ${fullUrl}`);

  return fetch(fullUrl, {
    credentials: 'include',
    headers,
    ...init
  }).then(response => {
    return response;
  });
};

export const getUserAndDivision = async (ctx: GetServerSidePropsContext) => {
  const user: SafeUser = await apiFetch(`/api/me`, undefined, ctx).then(res => res?.json());
  const eventId = user.eventId
  return { user, eventId };
};

export const serverSideGetRequests = async (
  toFetch: { [key: string]: string },
  ctx: GetServerSidePropsContext
) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: { [key: string]: any } = {};

  await Promise.all(
    Object.entries(toFetch).map(async ([key, urlPath]) => {
      const data = await apiFetch(urlPath, undefined, ctx).then(res => res?.json());
      result[key] = data;
    })
  );

  return result;
};
