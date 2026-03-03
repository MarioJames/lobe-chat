'use client';

import { Popover } from 'antd';
import { createStyles } from 'antd-style';
import { PropsWithChildren, memo, useCallback, useState } from 'react';

import { isDesktop } from '@/const/version';

import PanelContent from './PanelContent';

const useStyles = createStyles(({ css }) => {
  return {
    popover: css`
      inset-block-start: ${isDesktop ? 32 : 8}px !important;
      inset-inline-start: 8px !important;
    `,
  };
});

const UserPanel = memo<PropsWithChildren>(({ children }) => {
  const [open, setOpen] = useState(false);
  const { styles } = useStyles();

  const closePopover = useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <Popover
      arrow={false}
      content={<PanelContent closePopover={closePopover} />}
      onOpenChange={setOpen}
      open={open}
      placement={'topRight'}
      rootClassName={styles.popover}
      styles={{
        body: { padding: 0 },
      }}
      trigger={['click']}
    >
      {children}
    </Popover>
  );
});

UserPanel.displayName = 'UserPanel';

export default UserPanel;
