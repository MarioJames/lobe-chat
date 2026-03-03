import { ComponentProps } from 'react';

import ServerLayout from '@/components/server/ServerLayout';

import Desktop from './_layout/Desktop';
import Mobile from './_layout/Mobile';

const Layout = ServerLayout({ Desktop, Mobile });

type MainLayoutProps = ComponentProps<typeof Layout>;

const MainLayout = (props: MainLayoutProps) => <Layout {...props} />;

MainLayout.displayName = 'MainLayout';

export default MainLayout;
