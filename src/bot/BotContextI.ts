import type { Scenes } from 'telegraf';
import { type Context } from 'telegraf';
import type {
  UserSettingsI,
  UserSettingsRepositoryI,
} from '../persistence/UserSettingsRepositoryI.js';
import type { AppContainer } from '../appContainer/AppContainer.js';

export type BotSession = Scenes.SceneSession & Scenes.WizardSession;

export interface BotContextI extends Context {
  appContainer: AppContainer;

  userSettings: UserSettingsI | null;
  userSettingsRepository: UserSettingsRepositoryI;

  session: BotSession;
  scene: Scenes.SceneContextScene<BotContextI, Scenes.WizardSessionData> & {
    state: Record<string, unknown>;
  };
  wizard: Scenes.WizardContextWizard<BotContextI> & {
    state: Record<string, unknown>;
  };

  leaveSceneAndReply(text: string): Promise<void>;
  leaveSceneAndReplyWithHtml(text: string): Promise<void>;

  userHasUsernameOrFirstName(): boolean;
  getOrCreateUserSettings(): Promise<UserSettingsI>;
  getUserSettingsOrThrow(): UserSettingsI;
  getUserId(): number;
  loadSession(): Promise<void>;
  saveSession(): Promise<void>;
}

export type BotContextConstructor = {
  new (...args: ConstructorParameters<typeof Context>): BotContextI;
};
