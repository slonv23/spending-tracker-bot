import type {
  BotContextConstructor,
  BotContextI,
  BotSession,
} from './BotContextI.js';
import { Context, type Scenes } from 'telegraf';
import type {
  UserSettingsI,
  UserSettingsRepositoryI,
} from '../persistence/UserSettingsRepositoryI.js';
import type { AppContainer } from '../appContainer/AppContainer.js';
import { createMainMenu } from './mainMenu/index.js';

// Context
export abstract class BotContextBase extends Context implements BotContextI {
  public appContainer: AppContainer;

  public userSettings: UserSettingsI | null = null;
  public userSettingsRepository: UserSettingsRepositoryI;

  public session: BotSession;
  // `scene` and `wizard` will be injected by the Stage middleware
  public scene!: Scenes.SceneContextScene<
    BotContextI,
    Scenes.WizardSessionData
  > & {
    state: Record<string, unknown>;
  };
  public wizard!: Scenes.WizardContextWizard<BotContextI> & {
    state: Record<string, unknown>;
  };

  constructor(
    appContainer: AppContainer,
    ...args: ConstructorParameters<typeof Context>
  ) {
    super(...args);
    this.appContainer = appContainer;
    this.userSettingsRepository = this.appContainer.userRepository();
    this.session = {};
  }

  public async leaveSceneAndReply(text: string): Promise<void> {
    await this.reply(text, createMainMenu(this));
    return this.scene.leave();
  }

  public async leaveSceneAndReplyWithHtml(text: string): Promise<void> {
    await this.replyWithHTML(text, createMainMenu(this));
    return this.scene.leave();
  }

  public async loadSession(): Promise<void> {
    const userSettings = await this.getOrCreateUserSettings();
    this.session = userSettings.session;
  }

  public async saveSession(): Promise<void> {
    if (!this.userSettings) {
      throw new Error('User settings were not loaded');
    }
    this.userSettings = { ...this.userSettings, session: this.session };

    await this.userSettingsRepository.saveUserSettings(this.userSettings);
  }

  public async getOrCreateUserSettings(): Promise<UserSettingsI> {
    const { userId, username } = this.getUserIdAndUsername();
    if (!this.userSettings) {
      let userSettings =
        await this.userSettingsRepository.getUserSettings(userId);
      if (!userSettings) {
        userSettings = await this.userSettingsRepository.saveUserSettings({
          user_id: userId,
          username,
          session: {},
        });
      }
      this.userSettings = userSettings;
    }

    return this.userSettings;
  }

  public getUserSettingsOrThrow(): UserSettingsI {
    if (!this.userSettings) {
      throw new Error('User settings are missing');
    }

    return this.userSettings;
  }

  public getUserId(): number {
    const userId = this.from?.id;
    if (userId === undefined) {
      throw new Error('Failed to retrieve user id');
    }

    return userId;
  }

  public getUserIdAndUsername(): { userId: number; username: string } {
    if (!this.from) {
      throw new Error('Failed to retrieve user data');
    }
    const userId = this.from.id;
    const username = this.from.username ?? this.from.first_name;
    if (userId === undefined || username === undefined) {
      throw new Error(
        'User should have an id and a username or a first name to use this bot',
      );
    }

    return { userId, username };
  }

  public userHasUsernameOrFirstName(): boolean {
    return (
      this.from?.username !== undefined || this.from?.first_name !== undefined
    );
  }
}

export function createBotContextClass(
  appContainer: AppContainer,
): BotContextConstructor {
  return class extends BotContextBase {
    constructor(...args: ConstructorParameters<typeof Context>) {
      super(appContainer, ...args);
    }
  };
}
