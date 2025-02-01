import { Division, SafeUser } from '@mtes/types';
import { WithId } from 'mongodb';
import { GetServerSidePropsContext } from 'next';

export const getApiBase = (forceClient = false) => {
  return 'http://localhost:3333';
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

  return fetch('http://localhost:3333' + path, {
    credentials: 'include',
    headers,
    ...init
  }).then(response => {
    return response;
  });
};

export const getUserAndDivision = async (ctx: GetServerSidePropsContext) => {
  const user: SafeUser = await apiFetch(`/api/me`, undefined, ctx).then(res => res?.json());
  const divisions: Array<WithId<Division>> = await apiFetch(`/public/divisions`).then(res =>
    res?.json()
  );

  let divisionId = user.divisionId?.toString();
  if (divisionId) return { user, divisionId };

  const isEventUser = user.eventId || user.isAdmin;
  if (!isEventUser) return { user, divisionId };

  const idFromQuery = (ctx.query.divisionId as string) || undefined;
  if (user.isAdmin && !idFromQuery) return { user, divisionId }; //Don't know what division admin wants

  if (user.isAdmin) divisionId = idFromQuery;
  return { user, divisionId };
};

export const serverSideGetRequests = async (
  toFetch: { [key: string]: string },
  ctx: GetServerSidePropsContext
) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: { [key: string]: any } = {};

  await Promise.all(
    Object.entries(toFetch).map(async ([key, urlPath]) => {
      const data = await apiFetch(urlPath, undefined).then(res => res?.json());
      result[key] = data;
    })
  );

  return result;
};
