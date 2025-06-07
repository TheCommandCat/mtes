import { NextPage, GetServerSideProps } from 'next';
import { apiFetch } from '../../lib/utils/fetch';

export const Page: NextPage = () => {
  return <></>;
};

export const getServerSideProps: GetServerSideProps = async ctx => {
  const user = await apiFetch(`/api/me`, undefined, ctx).then(res =>
    res.ok ? res.json() : undefined
  );

  if (!user) {
    return {
      redirect: {
        destination: '/login',
        permanent: false
      }
    };
  }
  // Handle different user roles and redirect appropriately
  let destination = '/login'; // Default fallback

  if (user.isAdmin) {
    destination = '/admin';
  } else {
    destination = `/mtes/${user.role || ''}`;
  }

  return {
    redirect: {
      destination,
      permanent: false
    }
  };
};

export default Page;
