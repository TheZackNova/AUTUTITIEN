
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { GoogleGenAI, GenerateContentParameters, GenerateContentResponse } from "@google/genai";
import { AIContext } from './context/AIContext';
import type { AIContextType, ApiService } from './context/AIContext';
import type { SaveData, FormData, Entity, CustomRule, KnownEntities } from './types';
import { DEFAULT_SYSTEM_INSTRUCTION } from './constants';
import MainMenu from './components/views/MainMenu';
import CreateWorld from './components/views/CreateWorld';
import GameScreen from './components/views/GameScreen';
import ApiSettingsModal from './components/modals/ApiSettingsModal';
import UpdatesModal from './components/modals/UpdatesModal';
import { deepClone } from './utils/helpers';

export default function App() {
  const [view, setView] = useState<'menu' | 'create-world' | 'game'>('menu');
  const [gameState, setGameState] = useState<SaveData | null>(null);
  const [isApiSettingsModalOpen, setIsApiSettingsModalOpen] = useState(false);
  const [isNewGame, setIsNewGame] = useState(false);
  const [isUpdatesModalOpen, setIsUpdatesModalOpen] = useState(false);
  
  const [autoSavedGame, setAutoSavedGame] = useState<SaveData | null>(null);
  const [webSavedGame, setWebSavedGame] = useState<SaveData | null>(null);

  const [userApiKeys, setUserApiKeys] = useState<string[]>(() => {
    const saved = localStorage.getItem('userApiKeys');
    try {
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) return parsed.filter(k => typeof k === 'string' && k.trim() !== '');
        }
    } catch (e) { console.error("Failed to parse API keys from localStorage", e); }
    return [];
  });
  
  const isUsingDefaultKey = userApiKeys.length === 0;
  
  useEffect(() => {
    try {
        const autoSaveData = localStorage.getItem('savedGameState');
        if (autoSaveData) {
            const parsedData = JSON.parse(autoSaveData);
            if (parsedData.worldData && parsedData.gameHistory) {
                setAutoSavedGame(parsedData);
            }
        }

        const webSaveData = localStorage.getItem('webSaveGameState');
        if (webSaveData) {
            const parsedData = JSON.parse(webSaveData);
            if (parsedData.worldData && parsedData.gameHistory) {
                setWebSavedGame(parsedData);
            }
        }
    } catch (error) {
        console.error("Failed to load game from localStorage:", error);
        localStorage.removeItem('savedGameState');
        localStorage.removeItem('webSaveGameState');
    }
  }, []);

  const apiService = useMemo<ApiService | null>(() => {
    let currentKeyIndex = 0;
    const keys = userApiKeys.length > 0 ? userApiKeys : (process.env.API_KEY ? [process.env.API_KEY] : []);

    if (keys.length === 0) {
        console.warn("No API keys configured.");
        return null;
    }

    const generateContent = async (params: GenerateContentParameters): Promise<GenerateContentResponse> => {
        let retries = keys.length;
        while (retries > 0) {
            const apiKey = keys[currentKeyIndex];
            try {
                const ai = new GoogleGenAI({ apiKey });
                const result = await ai.models.generateContent(params);
                return result; // Success
            } catch (error) {
                console.error(`API call with key index ${currentKeyIndex} failed.`, error);
                retries--;
                currentKeyIndex = (currentKeyIndex + 1) % keys.length; // Move to the next key
                if (retries === 0) {
                    throw new Error("All configured API keys failed. Please check your keys and quota.");
                }
                console.log(`Retrying with key index ${currentKeyIndex}...`);
            }
        }
        throw new Error("Ran out of API keys to try.");
    };

    const generateContentStream = async (params: GenerateContentParameters) => {
        let retries = keys.length;
        while (retries > 0) {
            const apiKey = keys[currentKeyIndex];
            try {
                const ai = new GoogleGenAI({ apiKey });
                const result = await ai.models.generateContentStream(params);
                return result; // Success
            } catch (error) {
                console.error(`API stream call with key index ${currentKeyIndex} failed.`, error);
                retries--;
                currentKeyIndex = (currentKeyIndex + 1) % keys.length; // Move to the next key
                if (retries === 0) {
                    throw new Error("All configured API keys failed for streaming. Please check your keys and quota.");
                }
                console.log(`Retrying stream with key index ${currentKeyIndex}...`);
            }
        }
        throw new Error("Ran out of API keys to try for streaming.");
    };

    return { generateContent, generateContentStream };
  }, [userApiKeys]);


  const contextValue = useMemo<AIContextType>(() => ({
    apiService,
    isAiReady: !!apiService,
    apiKeyError: apiService ? null : "API Key chưa được thiết lập hoặc không hợp lệ. Vui lòng vào phần Thiết Lập API Key."
  }), [apiService]);

  const handleSaveApiKeys = useCallback((newKeys: string[]) => {
      localStorage.setItem('userApiKeys', JSON.stringify(newKeys.filter(Boolean)));
      setUserApiKeys(newKeys.filter(Boolean));
  }, []);
  
  const handleUseDefaultKey = useCallback(() => {
      localStorage.removeItem('userApiKeys');
      setUserApiKeys([]);
  }, []);

  const navigateToCreateWorld = useCallback(() => setView('create-world'), []);
  
  const navigateToMenu = useCallback(() => {
      setGameState(null);
      setView('menu');
  }, []);
  
  const handleRestart = useCallback(() => {
      localStorage.removeItem('savedGameState');
      localStorage.removeItem('webSaveGameState');
      setAutoSavedGame(null);
      setWebSavedGame(null);
      navigateToMenu();
  }, [navigateToMenu]);
  
  const continueAutoGame = useCallback(() => {
      if (autoSavedGame) {
          setGameState(autoSavedGame);
          setIsNewGame(false);
          setView('game');
      }
  }, [autoSavedGame]);

  const handleLoadFromWebSave = useCallback(() => {
    if (webSavedGame) {
        localStorage.removeItem('savedGameState');
        setAutoSavedGame(null);
        setGameState(webSavedGame);
        setIsNewGame(false);
        setView('game');
    }
  }, [webSavedGame]);

  const handleSaveToBrowser = useCallback((gameStateToSave: SaveData) => {
    localStorage.setItem('webSaveGameState', JSON.stringify(gameStateToSave));
    setWebSavedGame(gameStateToSave);
  }, []);

  const startNewGame = useCallback((data: FormData) => {
      localStorage.removeItem('savedGameState');
      localStorage.removeItem('webSaveGameState');
      setAutoSavedGame(null);
      setIsNewGame(true);
      setWebSavedGame(null);

      const pcEntity: Entity = {
          name: data.characterName || 'Vô Danh',
          type: 'pc',
          description: data.bio,
          gender: data.gender,
          personality: data.customPersonality || data.personalityFromList,
          race: data.race || 'Nhân tộc',
          comprehension: 'Chưa rõ',
          spiritRoot: 'Chưa rõ',
          skills: [],
          techniques: [],
          lifeSkills: [],
          professions: [],
          learnedRecipes: [],
          realmProgress: 0,
      };

      const initialKnownEntities: KnownEntities = {
          [pcEntity.name]: pcEntity
      };
      
      const initialRules: CustomRule[] = [];
      if (data.addGoal) {
          initialRules.push({
              id: 'initial-goal',
              content: `Mục tiêu khởi đầu: ${data.bio}`,
              isActive: true,
              known: data.characterKnowledgeEnabled,
          });
      }

      data.currencies?.forEach(currency => {
        if (currency.isActive && currency.name) {
          let ruleContent = `LUẬT TIỀN TỆ: Tồn tại một loại tiền tệ tên là "${currency.name}".`;
          if (currency.description) {
            ruleContent += ` Công dụng: ${currency.description}.`;
          }
          if (currency.exchangeRate > 0) {
            ruleContent += ` Tỷ giá đề xuất: ${currency.exchangeRate} "${currency.name}" tương đương 1 "Linh Thạch Hạ Phẩm".`;
          }
          if (currency.allowCultivation) {
            ruleContent += ` Nó chứa linh khí và có thể được tiêu hao để tu luyện.`;
          }
          initialRules.push({
            id: `currency-${currency.id}`,
            content: ruleContent,
            isActive: true,
            known: data.characterKnowledgeEnabled,
          });
        }
      });

      if (data.enableCultivation && data.cultivationSystem && data.cultivationSystem.races.length > 0) {
        let cultivationContent = 'HỆ THỐNG TU LUYỆN CỦA THẾ GIỚI (Luật lệ Cốt lõi):\n\n';
        data.cultivationSystem.races.forEach(race => {
            cultivationContent += `CHỦNG TỘC: ${race.name}\n`;
            race.realms.forEach(realm => {
                cultivationContent += `  - Cảnh giới: ${realm.name}\n`;
                if(realm.characteristics) cultivationContent += `    + Đặc điểm: ${realm.characteristics}\n`;
                if(realm.cultivationMechanism) cultivationContent += `    + Cơ chế tu luyện: ${realm.cultivationMechanism}\n`;
                if(realm.breakthroughConditions) cultivationContent += `    + Điều kiện đột phá: ${realm.breakthroughConditions}\n`;
                if(realm.specialAbilities) cultivationContent += `    + Năng lực đặc biệt: ${realm.specialAbilities}\n`;
            });
            cultivationContent += '\n';
        });

        const cultivationConcept: Entity = {
            name: "quy tắc tu luyện",
            type: 'concept',
            description: cultivationContent.trim(),
            known: data.characterKnowledgeEnabled,
        };
        initialKnownEntities[cultivationConcept.name] = cultivationConcept;
      }

      setGameState({
        worldData: data,
        storyLog: [],
        choices: [],
        knownEntities: initialKnownEntities,
        statuses: [],
        quests: [],
        gameHistory: [],
        memories: [],
        party: [pcEntity],
        customRules: initialRules,
        systemInstruction: DEFAULT_SYSTEM_INSTRUCTION,
        turnCount: 0,
        time: "08:00, Ngày 1, Tháng 1, Năm 1 (Thời tiết: Trời quang)",
        nsfwRules: data.nsfwRules || { enabled: false, rules: [] },
        totalTokensUsed: 0,
        lastTurnTokensUsed: 0,
        tokenHistory: [],
        worldKnowledgeEnabled: data.worldKnowledgeEnabled,
        characterKnowledgeEnabled: data.characterKnowledgeEnabled,
        currentLocationName: '',
      });
      setView('game');
  }, []);

  const handleLoadGameFromFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const text = e.target?.result;
            if (typeof text === 'string') {
                localStorage.removeItem('savedGameState');
                localStorage.removeItem('webSaveGameState');
                setAutoSavedGame(null);
                setWebSavedGame(null);

                const loadedJson = JSON.parse(text);
                
                // Basic validation
                if (loadedJson.worldData && loadedJson.gameHistory && loadedJson.knownEntities) {
                    setIsNewGame(false);
                    setGameState(loadedJson as SaveData);
                    setView('game');
                } else {
                    alert('Tệp lưu không hợp lệ. Thiếu dữ liệu cần thiết.');
                }
            }
        } catch (error) {
            console.error('Lỗi khi tải tệp:', error);
            alert('Không thể đọc tệp lưu. Tệp có thể bị hỏng hoặc không đúng định dạng.');
        }
    };
    reader.readAsText(file);
  }, []);

  const openApiSettings = useCallback(() => setIsApiSettingsModalOpen(true), []);
  const openUpdatesModal = useCallback(() => setIsUpdatesModalOpen(true), []);

  const renderContent = () => {
      switch(view) {
          case 'create-world':
              return <CreateWorld onBack={navigateToMenu} onStartGame={startNewGame} />;
          case 'game':
              return gameState ? <GameScreen 
                initialGameState={gameState} 
                isNewGame={isNewGame}
                onBackToMenu={navigateToMenu} 
                onSaveToBrowser={handleSaveToBrowser}
              /> : <MainMenu onStartNewAdventure={navigateToCreateWorld} onOpenApiSettings={openApiSettings} onLoadGameFromFile={handleLoadGameFromFile} isUsingDefaultKey={isUsingDefaultKey} savedGame={autoSavedGame} onContinueGame={continueAutoGame} webSavedGame={webSavedGame} onLoadFromWebSave={handleLoadFromWebSave} onOpenUpdatesModal={openUpdatesModal} />;
          case 'menu':
          default:
              return <MainMenu onStartNewAdventure={navigateToCreateWorld} onOpenApiSettings={openApiSettings} onLoadGameFromFile={handleLoadGameFromFile} isUsingDefaultKey={isUsingDefaultKey} savedGame={autoSavedGame} onContinueGame={continueAutoGame} webSavedGame={webSavedGame} onLoadFromWebSave={handleLoadFromWebSave} onOpenUpdatesModal={openUpdatesModal} />;
      }
  }

  return (
    <AIContext.Provider value={contextValue}>
      <style>{`
        .am-kim {
            background: linear-gradient(135deg, #ca8a04, #eab308, #fde047);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            font-weight: bold;
            animation: am-kim-shine 3s linear infinite;
            background-size: 200% 200%;
        }

        .dark .am-kim {
             background: linear-gradient(135deg, #fde047, #a2830e, #fde047);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        @keyframes am-kim-shine {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }
      `}</style>
      <div className={`min-h-screen w-full flex flex-col items-center ${view === 'game' ? '' : 'justify-center p-2 sm:p-4'} font-sans text-slate-900 dark:text-white antialiased bg-slate-100 dark:bg-slate-900 transition-colors duration-500`}>
        {renderContent()}
        <ApiSettingsModal 
          isOpen={isApiSettingsModalOpen} 
          onClose={() => setIsApiSettingsModalOpen(false)}
          currentUserApiKeys={userApiKeys}
          isUsingDefault={isUsingDefaultKey}
          onSave={handleSaveApiKeys}
          onUseDefault={handleUseDefaultKey}
        />
        <UpdatesModal
            isOpen={isUpdatesModalOpen}
            onClose={() => setIsUpdatesModalOpen(false)}
        />
      </div>
    </AIContext.Provider>
  );
}
