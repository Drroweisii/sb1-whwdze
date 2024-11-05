import { useState, useEffect, useCallback, useRef } from 'react';
import { Mission, Player, MissionResult } from '../types/game';
import { missions } from '../data/missions';
import { getPlayerLevel } from '../utils/playerLevel';
import { getMissionSuccessProbability } from '../utils/missionProbability';
import { saveGameData, loadGameData } from '../services/api';
import { gameLogger } from '../utils/logger';

const COOLDOWN_DURATION = 180000; // 3 minutes
const PRISON_DURATION = 300000; // 5 minutes
const COOLDOWN_CHECK_INTERVAL = 100;
const AUTOSAVE_INTERVAL = 30000; // 30 seconds

export function useGame() {
  const [player, setPlayer] = useState<Player>(() => {
    const saved = localStorage.getItem('player');
    return saved ? JSON.parse(saved) : {
      balance: 0,
      completedMissions: [],
      prisonTime: undefined,
    };
  });

  const cooldownsRef = useRef<Record<string, number>>({});
  const [cooldowns, setCooldowns] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('cooldowns');
    const parsedCooldowns = saved ? JSON.parse(saved) : {};
    
    const now = Date.now();
    const validCooldowns: Record<string, number> = {};
    
    Object.entries(parsedCooldowns).forEach(([id, endTime]) => {
      if (typeof endTime === 'number' && endTime > now) {
        validCooldowns[id] = endTime;
      }
    });
    
    cooldownsRef.current = validCooldowns;
    return validCooldowns;
  });

  // Load game data from server
  useEffect(() => {
    const loadGame = async () => {
      try {
        const data = await loadGameData();
        if (data) {
          setPlayer(data);
        }
      } catch (error) {
        console.error('Failed to load game data:', error);
      }
    };
    loadGame();
  }, []);

  // Autosave game data
  useEffect(() => {
    const saveInterval = setInterval(async () => {
      try {
        await saveGameData({
          balance: player.balance,
          completedMissions: player.completedMissions,
          prisonTime: player.prisonTime,
        });
      } catch (error) {
        console.error('Failed to save game data:', error);
      }
    }, AUTOSAVE_INTERVAL);

    return () => clearInterval(saveInterval);
  }, [player]);

  useEffect(() => {
    localStorage.setItem('player', JSON.stringify(player));
  }, [player]);

  useEffect(() => {
    localStorage.setItem('cooldowns', JSON.stringify(cooldowns));
    cooldownsRef.current = cooldowns;
  }, [cooldowns]);

  const clearExpiredCooldowns = useCallback(() => {
    const now = Date.now();
    let hasChanges = false;

    const newCooldowns = { ...cooldownsRef.current };
    Object.entries(newCooldowns).forEach(([id, endTime]) => {
      if (endTime <= now) {
        delete newCooldowns[id];
        hasChanges = true;
      }
    });

    if (hasChanges) {
      setCooldowns(newCooldowns);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(clearExpiredCooldowns, COOLDOWN_CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, [clearExpiredCooldowns]);

  const getRemainingCooldown = useCallback((missionId: string): number => {
    const endTime = cooldownsRef.current[missionId];
    if (!endTime) return 0;
    
    const now = Date.now();
    return Math.max(0, endTime - now);
  }, []);

  const executeMission = useCallback((missionId: string): MissionResult => {
    const mission = missions.find(m => m.id === missionId);
    if (!mission) {
      throw new Error(`Mission not found: ${missionId}`);
    }

    if (player.prisonTime && player.prisonTime > Date.now()) {
      throw new Error('You are currently in prison!');
    }

    const cooldown = getRemainingCooldown(missionId);
    if (cooldown > 0) {
      throw new Error(`Mission is still on cooldown for ${Math.ceil(cooldown / 1000)} seconds`);
    }

    const playerLevel = getPlayerLevel(player.balance);
    const successProbability = getMissionSuccessProbability(mission, playerLevel);
    const success = Math.random() <= successProbability;
    const reward = success ? mission.reward : 0;

    // Higher class missions have higher arrest chances
    const arrestChance = success ? 0 : {
      'C': 0.1, // 10% chance if failed
      'B': 0.2, // 20% chance if failed
      'A': 0.3, // 30% chance if failed
      'S': 0.4, // 40% chance if failed
    }[mission.class];

    const arrested = Math.random() < (arrestChance || 0);

    const now = Date.now();
    const newCooldownEnd = now + COOLDOWN_DURATION;
    
    const newCooldowns = {
      ...cooldownsRef.current,
      [missionId]: newCooldownEnd
    };
    
    setCooldowns(newCooldowns);
    cooldownsRef.current = newCooldowns;

    setPlayer(prev => ({
      ...prev,
      balance: prev.balance + reward,
      completedMissions: success ? [...prev.completedMissions, missionId] : prev.completedMissions,
      prisonTime: arrested ? now + PRISON_DURATION : undefined
    }));

    gameLogger.log(
      'mission_result',
      `Mission ${success ? 'succeeded' : 'failed'}${arrested ? ' and got arrested' : ''}`,
      { missionId, success, reward, arrested },
    );

    return {
      success,
      reward,
      message: arrested 
        ? 'You got caught and sent to prison!'
        : success 
          ? `Success! Earned $${reward.toLocaleString()} (${(successProbability * 100).toFixed(1)}% chance)`
          : `Mission failed! (${(successProbability * 100).toFixed(1)}% chance)`,
      imprisoned: arrested
    };
  }, [player, getRemainingCooldown]);

  const [, forceUpdate] = useState({});
  useEffect(() => {
    const interval = setInterval(() => forceUpdate({}), COOLDOWN_CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  const availableMissions = missions.map(mission => ({
    ...mission,
    cooldown: getRemainingCooldown(mission.id)
  }));

  return {
    player,
    availableMissions,
    executeMission,
    inPrison: Boolean(player.prisonTime && player.prisonTime > Date.now())
  };
}