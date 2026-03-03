import {
  INSERT_HEADING_COMMAND,
  INSERT_HORIZONTAL_RULE_COMMAND,
  INSERT_MATH_COMMAND,
  INSERT_TABLE_COMMAND,
  SlashOptions,
} from '@lobehub/editor';
import type { IEditor } from '@lobehub/editor';
import { Text } from '@lobehub/ui';
import {
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  MinusIcon,
  SigmaIcon,
  Table2Icon,
} from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

type SlashItems = Extract<SlashOptions['items'], unknown[]>;
type SlashItem = SlashItems[number];

interface SlashMenuItem {
  extra?: React.ReactNode;
  icon?: React.FC<any>;
  key: string;
  label?: React.ReactNode;
  onSelect?: (editor: IEditor, matchingString: string) => void;
}

export const useSlashItems = (): SlashItems => {
  const { t } = useTranslation('editor');
  return useMemo(
    () =>
      [
        {
          icon: Heading1Icon,
          key: 'h1',
          label: t('slash.h1'),
          onSelect: (editor: IEditor) => {
            editor.dispatchCommand(INSERT_HEADING_COMMAND, { tag: 'h1' });
          },
        },
        {
          icon: Heading2Icon,
          key: 'h2',
          label: t('slash.h2'),
          onSelect: (editor: IEditor) => {
            editor.dispatchCommand(INSERT_HEADING_COMMAND, { tag: 'h2' });
          },
        },
        {
          icon: Heading3Icon,
          key: 'h3',
          label: t('slash.h3'),
          onSelect: (editor: IEditor) => {
            editor.dispatchCommand(INSERT_HEADING_COMMAND, { tag: 'h3' });
          },
        },

        { type: 'divider' },
        {
          icon: MinusIcon,
          key: 'hr',
          label: t('slash.hr'),
          onSelect: (editor: IEditor) => {
            editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, {});
          },
        },
        {
          icon: Table2Icon,
          key: 'table',
          label: t('slash.table'),
          onSelect: (editor: IEditor) => {
            editor.dispatchCommand(INSERT_TABLE_COMMAND, { columns: '3', rows: '3' });
          },
        },
        {
          icon: SigmaIcon,
          key: 'tex',
          label: t('slash.tex'),
          onSelect: (editor: IEditor) => {
            editor.dispatchCommand(INSERT_MATH_COMMAND, { code: 'x^2 + y^2 = z^2' });
            queueMicrotask(() => {
              editor.focus();
            });
          },
        },
      ].map((item) => {
        if ('type' in item && item.type === 'divider') return item as SlashItem;
        const menuItem = item as SlashMenuItem;
        return {
          ...menuItem,
          extra: (
            <Text code fontSize={12} type={'secondary'}>
              {menuItem.key}
            </Text>
          ),
        } as SlashItem;
      }) as SlashItems,
    [t],
  );
};
