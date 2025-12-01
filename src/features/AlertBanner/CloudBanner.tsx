'use client';

import { Button, Icon, Markdown, Modal } from '@lobehub/ui';
import { useSize } from 'ahooks';
import { createStyles } from 'antd-style';
import { ArrowRightIcon } from 'lucide-react';
import Link from 'next/link';
import { memo, useEffect, useRef, useState } from 'react';
import Marquee from 'react-fast-marquee';
import { useTranslation } from 'react-i18next';
import { Center, Flexbox } from 'react-layout-kit';

import { LOBE_CHAT_CLOUD } from '@/const/branding';
import { OFFICIAL_URL, UTM_SOURCE } from '@/const/url';
import type { ActiveAnnouncement } from '@/store/serverConfig/store';
import { isOnServerSide } from '@/utils/env';

export const BANNER_HEIGHT = 40;

const useStyles = createStyles(({ css, token, stylish, cx, isDarkMode }) => ({
  background: cx(
    stylish.gradientAnimation,
    css`
      position: absolute;

      width: max(64%, 1280px);
      height: 100%;

      opacity: 0.8;
      filter: blur(60px);
    `,
  ),
  container: css`
    position: relative;
    overflow: hidden;
    background-color: ${isDarkMode ? token.colorFill : token.colorFillSecondary};
  `,
  modalContent: css`
    overflow-y: auto;
    max-height: 60vh;
    padding: ${token.padding}px;
  `,
  modalContentMobile: css`
    overflow-y: auto;
    max-height: calc(95vh - 100px);
    padding: ${token.padding}px;
  `,
  wrapper: css`
    z-index: 1;
    overflow: hidden;
    max-width: 100%;
  `,
}));

interface CloudBannerProps {
  announcement?: ActiveAnnouncement | null;
  mobile?: boolean;
}

const CloudBanner = memo<CloudBannerProps>(({ announcement, mobile }) => {
  const ref = useRef(null);
  const contentRef = useRef(null);
  const size = useSize(ref);
  const contentSize = useSize(contentRef);
  const { styles } = useStyles();
  const { t } = useTranslation('common');
  const [isTruncated, setIsTruncated] = useState(mobile);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (mobile || isOnServerSide || !size || !contentSize) return;
    setIsTruncated(contentSize.width > size.width - 120);
  }, [size, contentSize, mobile]);

  // 判断是否显示公告内容
  const hasAnnouncementTitle = !!announcement?.title;
  const hasAnnouncementContent = !!announcement?.content;

  // 根据公告是否存在决定显示的内容
  const content = (
    <Flexbox align={'center'} flex={'none'} gap={8} horizontal ref={contentRef}>
      <b>{t('alert.cloud.title', { name: LOBE_CHAT_CLOUD })}:</b>
      <span>
        {t(mobile ? 'alert.cloud.descOnMobile' : 'alert.cloud.desc', {
          credit: new Intl.NumberFormat('en-US').format(500_000),
          name: LOBE_CHAT_CLOUD,
        })}
      </span>
    </Flexbox>
  );

  // 根据公告内容决定按钮显示
  const renderButton = () => {
    // 如果存在 content，显示"查看详情"按钮
    if (hasAnnouncementContent) {
      return (
        <Button onClick={() => setModalOpen(true)} size={'small'} type="link">
          {t('showDetail')}
        </Button>
      );
    }
    return null;
  };

  return (
    <>
      <Center
        className={styles.container}
        flex={'none'}
        height={BANNER_HEIGHT}
        paddingInline={16}
        ref={ref}
        width={'100%'}
      >
        <div className={styles.background} />
        {hasAnnouncementTitle ? (
          <Flexbox
            align={'center'}
            className={styles.wrapper}
            flex={'none'}
            gap={8}
            horizontal
            justify={'space-between'}
          >
            {isTruncated ? (
              <Marquee pauseOnHover>
                <span ref={contentRef}>{announcement.title}</span>
              </Marquee>
            ) : (
              announcement.title
            )}
            {renderButton()}
          </Flexbox>
        ) : (
          <Center className={styles.wrapper} gap={16} horizontal width={'100%'}>
            {isTruncated ? <Marquee pauseOnHover>{content}</Marquee> : content}
            <Link
              href={`${OFFICIAL_URL}?utm_source=${UTM_SOURCE}&utm_medium=banner`}
              target={'_blank'}
            >
              <Button size={'small'} type="primary">
                {t('alert.cloud.action')} <Icon icon={ArrowRightIcon} />
              </Button>
            </Link>
          </Center>
        )}
      </Center>
      {hasAnnouncementContent && (
        <Modal
          allowFullscreen={mobile}
          footer={null}
          height={mobile ? '95%' : undefined}
          onCancel={() => setModalOpen(false)}
          open={modalOpen}
          title={announcement.title}
        >
          <div className={mobile ? styles.modalContentMobile : styles.modalContent}>
            <Markdown allowHtml>{announcement.content}</Markdown>
          </div>
        </Modal>
      )}
    </>
  );
});

export default CloudBanner;
