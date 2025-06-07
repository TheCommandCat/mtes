import { Division, SafeUser } from '@mtes/types';
import { WithId } from 'mongodb';
import { GetServerSidePropsContext } from 'next';

export const getApiBase = (isServerSide: boolean = false) => {
  if (isServerSide) {
    // Server-side requests (SSR) - use Docker service name
    return (
      process.env.NEXT_INTERNAL_API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      'http://localhost:3333'
    );
  } else {
    // Client-side requests - use localhost for browser
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';
  }
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
  } // Use server-side URL when we have server context (SSR), client-side URL otherwise
  const apiBase = getApiBase(!!ctx);
  console.log(`Making API call to: ${apiBase + path}`);
  return fetch(apiBase + path, {
    credentials: 'include',
    headers,
    ...init
  })
    .then(response => {
      console.log(`API response: ${response.status} ${response.statusText}`);
      return response;
    })
    .catch(error => {
      console.error(`API fetch error for ${apiBase + path}:`, error);
      throw error;
    });
};

export const getUserAndDivision = async (ctx: GetServerSidePropsContext) => {
  const user: SafeUser = await apiFetch(`/api/me`, undefined, ctx).then(res => res?.json());
  return { user };
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
