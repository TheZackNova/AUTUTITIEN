

export interface Profession {
    name: string;
    level: number;
    xp: number;
}

export type EntityType = 'pc' | 'npc' | 'location' | 'faction' | 'item' | 'kĩ năng' | 'công pháp' | 'status_effect' | 'companion' | 'concept' | 'clan' | 'kĩ năng sinh hoạt';

export interface RealmDetail {
  id: string;
  name: string;
  cultivationMechanism: string;
  breakthroughConditions: string;
  characteristics: string;
  specialAbilities: string;
}

export interface RaceDefinition {
  id:string;
  name: string;
  realms: RealmDetail[];
}

export interface CultivationSystem {
  races: RaceDefinition[];
}

export interface Entity {
  name:string;
  type:EntityType;
  description: string;
  gender?:string;
  age?:string;
  personality?:string;
  relationship?:string;
  emotion?: string;
  realm?:string;
  realmProgress?: number;
  owner?:string; // Also used for slave owner
  skills?:string[];
  techniques?:string[];
  lifeSkills?:string[];
  isEquipped?:boolean;
  race?:string;
  comprehension?:string;
  spiritRoot?:string;
  known?:boolean;
  grade?:string;
  slot?: 'vũ_khí' | 'tay_phụ' | 'y_bào' | 'mũ' | 'giày' | 'đai' | 'nhẫn' | 'phù' | 'pháp_bảo' | 'trâm' | 'tràng_hạt' | 'hộ_tâm';
  mastery?:string;
  masteryPercentage?: number;
  effects?: string[];


  // == NEW DETAILED ITEM FIELDS ==
  itemCategory?: 'trang_bi' | 'tieu_hao' | 'dac_biet' | 'cong_phap' | 'su_kien' | 'phu_tro' | 'ki_nang' | 'cong_thuc' | 'nguyen_lieu';
  condition?: 'binh_thuong' | 'hao_mon' | 'tan_khuyet' | 'vo_hieu';
  usageCondition?: string;

  // Shared
  keywords?: string[];
  triggersScript?: string;
  notes?: string;

  // For TRANG_BI
  durability?: number;

  // For TIEU_HAO
  quantity?: number;
  isSingleUse?: boolean;
  
  // For PHU_TRO
  charges?: number;
  maxCharges?: number;
  destroyOnEmpty?: boolean;
  chargeLogic?: string;
  
  // For SU_KIEN
  requiredQuantity?: number;
  isFragment?: boolean;
  hasIncompleteDescription?: boolean;
  
  // For AI hints, not used in client logic but good for prompting
  learnable?: boolean;
  equippable?: boolean;
  consumable?: boolean;
  usable?: boolean;

  // === SOCIAL & RELATIONSHIP SYSTEM ===
  // Personal
  socialStatus?: 'spouse' | 'slave' | 'prisoner' | 'mentor' | 'disciple' | 'rival' | 'friend' | 'family' | 'đạo lữ' | 'lô đỉnh' | 'đồ chơi';
  favorability?: number; // Point value from -100 to 100.
  loyalty?: number; // 0 to 100
  relationshipEvents?: string[]; // History of major events.
  
  // Player specific, but can be on any entity
  reputation?: { [factionOrClanName: string]: number };

  // Clan related
  clanLeader?: string;
  clanMembers?: string[]; // list of member names
  relations?: { [clanName: string]: 'ally' | 'enemy' | 'neutral' }; // Inter-clan relations
  
  // Member specific
  clanRole?: string; // Role within the clan (e.g., Elder, Disciple)
  factionName?: string; // Faction name for NPCs

  // Death info
  deathInfo?: {
      cause: string;
      killerName: string;
      realmAtDeath: string;
  };

  // Profession System
  professions?: Profession[];

  // Recipe System
  recipeFor?: string;
  requiredMaterials?: { name: string; quantity: number }[];
  requiredProfession?: { name: string; level: number };
  learnedRecipes?: string[];

  // Map System
  x?: number;
  y?: number;


  [key: string]: any; 
}

export interface KnownEntities {
    [name: string]: Entity;
}

export interface NsfwRuleSet {
  enabled: boolean;
  rules: CustomRule[];
}

export type Difficulty = 'easy' | 'normal' | 'hard' | 'nightmare';

export interface CurrencyDefinition {
  id: string;
  name: string;
  exchangeRate: number;
  description: string;
  isActive: boolean;
  allowCultivation: boolean;
}

export interface FormData {
    genre: string;
    worldDetail: string;
    writingStyle: string;
    difficulty: Difficulty;
    allowNsfw: boolean;
    characterName: string;
    customPersonality: string;
    personalityFromList: string;
    gender: string;
    bio: string;
    initialEntities: Entity[];
    addGoal: boolean;
    race: string;
    cultivationSystem: CultivationSystem;
    enableCultivation: boolean;
    currencies: CurrencyDefinition[];
    nsfwRules: NsfwRuleSet;
    worldKnowledgeEnabled: boolean;
    characterKnowledgeEnabled: boolean;
}

export interface Status {
    name:string;
    description: string;
    type: 'buff' | 'debuff' | 'neutral' | 'injury' | 'emotion';
    source: string;
    duration?: string;
    effects?: string;
    cureConditions?: string;
    owner: string;
}

export interface Memory {
    text: string;
    pinned: boolean;
}

export interface QuestObjective {
    description: string;
    completed: boolean;
}

export interface Quest {
    title: string;
    description: string;
    objectives: QuestObjective[];
    giver?: string;
    reward?: string;
    isMainQuest: boolean;
    status: 'active' | 'completed' | 'failed';
    deadline?: string;
}

export interface Choice {
    action: string;
    successRate: string;
    time: string;
    failureConsequence: string;
}

export interface GameHistoryEntry {
    role: 'user' | 'model';
    parts: { text: string }[];
}

export interface CustomRule {
  id: string;
  content: string;
  isActive: boolean;
  known?: boolean;
}

export interface SaveData {
    worldData: FormData;
    storyLog: string[];
    choices: (string | Choice)[];
    knownEntities: KnownEntities;
    statuses: Status[];
    quests: Quest[];
    gameHistory: GameHistoryEntry[];
    memories: Memory[];
    party: Entity[];
    customRules: CustomRule[];
    systemInstruction: string;
    turnCount: number;
    time: string;
    nsfwRules: NsfwRuleSet;
    totalTokensUsed?: number;
    lastTurnTokensUsed?: number;
    tokenHistory?: number[];
    worldKnowledgeEnabled: boolean;
    characterKnowledgeEnabled: boolean;
    currentLocationName?: string;
}

export interface Badge {
    text: string;
    className: string;
}

export interface StatChangeNotification {
    id: number;
    message: string;
    type: 'gain' | 'loss' | 'info';
}