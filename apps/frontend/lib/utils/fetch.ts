export const apiFetch = (
  url: string,
  options?: RequestInit
): Promise<Response> => {
  let headers = { ...options?.headers };

  return fetch('http://localhost:3333' + url, {
    headers,
    ...options,
  }).then((res) => {
    return res;
  });
};
