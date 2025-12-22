import { ComponentProps } from 'react';

import ServerLayout from '@/components/server/ServerLayout';
import RoleGuard from '@/features/Rbac/RoleGuard';

import Desktop from './_layout/Desktop';
import Mobile from './_layout/Mobile';

const Layout = ServerLayout({ Desktop, Mobile });

type MainLayoutProps = ComponentProps<typeof Layout>;

const MainLayout = (props: MainLayoutProps) => (
  <RoleGuard>
    <Layout {...props} />
  </RoleGuard>
);

MainLayout.displayName = 'MainLayout';

export default MainLayout;
