// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { announcements, customization, users } from '../../schemas';
import { LobeChatDatabase } from '../../type';
import { CustomizationModel } from '../customization';
import { getTestDB } from './_util';

const serverDB: LobeChatDatabase = await getTestDB();

const userId = 'customization-model-test-user-id';
const customizationModel = new CustomizationModel(serverDB);

beforeEach(async () => {
  await serverDB.delete(users);
  await serverDB.insert(users).values([{ id: userId }]);
});

afterEach(async () => {
  await serverDB.delete(users);
  await serverDB.delete(customization);
  await serverDB.delete(announcements);
});

describe('CustomizationModel', () => {
  describe('getConfig', () => {
    it('should return null when no config exists', async () => {
      const result = await customizationModel.getConfig();
      expect(result).toBeNull();
    });

    it('should get customization config', async () => {
      // Insert test config directly
      const config = {
        base: {
          brandName: 'Test Brand',
          logo: { light: 'light-logo.png', dark: 'dark-logo.png' },
        },
        welcome: {
          config: {
            defaultQuestions: [],
            newUserQuestions: [],
            recommendedAgentIds: [],
            welcomeContent: 'Welcome!',
          },
          type: 'recommended' as const,
        },
      };

      await serverDB.insert(customization).values({
        base: config.base,
        id: 1,
        updatedBy: userId,
        welcome: config.welcome,
      });

      const result = await customizationModel.getConfig();
      expect(result).toMatchObject({
        base: config.base,
        id: 1,
        welcome: config.welcome,
      });
    });
  });

  describe('getActiveAnnouncement', () => {
    it('should get currently active announcement', async () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 86400000); // -1 day
      const futureDate = new Date(now.getTime() + 86400000); // +1 day

      await serverDB.insert(announcements).values({
        content: 'Active Announcement',
        createdBy: userId,
        effectiveEndAt: futureDate,
        effectiveStartAt: pastDate,
        title: 'Active Title',
        updatedBy: userId,
      });

      const result = await customizationModel.getActiveAnnouncement();

      expect(result).toMatchObject({
        content: 'Active Announcement',
        title: 'Active Title',
      });
    });

    it('should return null when no active announcement', async () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 86400000);
      const veryPastDate = new Date(now.getTime() - 172800000); // -2 days

      // Create expired announcement
      await serverDB.insert(announcements).values({
        content: 'Expired Announcement',
        createdBy: userId,
        effectiveEndAt: pastDate,
        effectiveStartAt: veryPastDate,
        title: 'Expired Title',
        updatedBy: userId,
      });

      const result = await customizationModel.getActiveAnnouncement();
      expect(result).toBeNull();
    });
  });
});
