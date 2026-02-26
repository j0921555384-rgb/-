import React, { useState, useEffect, useCallback } from 'react';
import { Bomb, Flag, RotateCcw, Timer, Trophy, XCircle, Zap, Shield, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---

type Difficulty = 'easy' | 'medium' | 'hard';

interface GameConfig {
  rows: number;
  cols: number;
  mines: number;
  label: string;
  icon: React.ReactNode;
}

const CONFIGS: Record<Difficulty, GameConfig> = {
  easy: { rows: 9, cols: 9, mines: 10, label: 'RECRUIT', icon: <Shield className="w-4 h-4" /> },
  medium: { rows: 16, cols: 16, mines: 40, label: 'ELITE', icon: <Target className="w-4 h-4" /> },
  hard: { rows: 16, cols: 30, mines: 99, label: 'LEGEND', icon: <Zap className="w-4 h-4" /> },
};

interface Cell {
  row: number;
  col: number;
  isMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  neighborMines: number;
}

type GameStatus = 'idle' | 'playing' | 'won' | 'lost';

// --- Utils ---

const createBoard = (config: GameConfig): Cell[][] => {
  const board: Cell[][] = [];
  for (let r = 0; r < config.rows; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < config.cols; c++) {
      row.push({
        row: r,
        col: c,
        isMine: false,
        isRevealed: false,
        isFlagged: false,
        neighborMines: 0,
      });
    }
    board.push(row);
  }
  return board;
};

const placeMines = (board: Cell[][], config: GameConfig, firstClick: { r: number; c: number }): Cell[][] => {
  const newBoard = board.map(row => row.map(cell => ({ ...cell })));
  let minesPlaced = 0;
  while (minesPlaced < config.mines) {
    const r = Math.floor(Math.random() * config.rows);
    const c = Math.floor(Math.random() * config.cols);

    // Don't place mine on first click or already mined cell
    if (!newBoard[r][c].isMine && (Math.abs(r - firstClick.r) > 1 || Math.abs(c - firstClick.c) > 1)) {
      newBoard[r][c].isMine = true;
      minesPlaced++;
    }
  }

  // Calculate neighbor counts
  for (let r = 0; r < config.rows; r++) {
    for (let c = 0; c < config.cols; c++) {
      if (!newBoard[r][c].isMine) {
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < config.rows && nc >= 0 && nc < config.cols && newBoard[nr][nc].isMine) {
              count++;
            }
          }
        }
        newBoard[r][c].neighborMines = count;
      }
    }
  }
  return newBoard;
};

// --- Components ---

export default function App() {
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [board, setBoard] = useState<Cell[][]>([]);
  const [status, setStatus] = useState<GameStatus>('idle');
  const [time, setTime] = useState(0);
  const [flagsUsed, setFlagsUsed] = useState(0);

  const config = CONFIGS[difficulty];

  const initGame = useCallback(() => {
    setBoard(createBoard(config));
    setStatus('idle');
    setTime(0);
    setFlagsUsed(0);
  }, [config]);

  useEffect(() => {
    initGame();
  }, [initGame]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (status === 'playing') {
      interval = setInterval(() => {
        setTime(t => t + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [status]);

  const revealCell = (r: number, c: number) => {
    if (status === 'won' || status === 'lost' || board[r][c].isRevealed || board[r][c].isFlagged) return;

    let newBoard = [...board.map(row => [...row])];
    let currentStatus = status;

    if (status === 'idle') {
      newBoard = placeMines(newBoard, config, { r, c });
      currentStatus = 'playing';
      setStatus('playing');
    }

    if (newBoard[r][c].isMine) {
      newBoard[r][c].isRevealed = true;
      newBoard.forEach(row => row.forEach(cell => {
        if (cell.isMine) cell.isRevealed = true;
      }));
      setBoard(newBoard);
      setStatus('lost');
      return;
    }

    const floodFill = (row: number, col: number) => {
      if (row < 0 || row >= config.rows || col < 0 || col >= config.cols || newBoard[row][col].isRevealed || newBoard[row][col].isFlagged) return;
      
      newBoard[row][col].isRevealed = true;
      
      if (newBoard[row][col].neighborMines === 0) {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            floodFill(row + dr, col + dc);
          }
        }
      }
    };

    floodFill(r, c);

    let unrevealedNonMines = 0;
    newBoard.forEach(row => row.forEach(cell => {
      if (!cell.isMine && !cell.isRevealed) unrevealedNonMines++;
    }));

    setBoard(newBoard);
    if (unrevealedNonMines === 0) {
      setStatus('won');
    }
  };

  const toggleFlag = (e: React.MouseEvent, r: number, c: number) => {
    e.preventDefault();
    if (status === 'won' || status === 'lost' || board[r][c].isRevealed) return;

    const newBoard = [...board.map(row => [...row])];
    const isFlagged = !newBoard[r][c].isFlagged;
    newBoard[r][c].isFlagged = isFlagged;
    setBoard(newBoard);
    setFlagsUsed(prev => isFlagged ? prev + 1 : prev - 1);
  };

  const getNumberColor = (num: number) => {
    const colors = [
      '', 'text-red-400', 'text-red-500', 'text-red-600', 
      'text-red-700', 'text-red-800', 'text-red-900', 
      'text-white', 'text-gray-500'
    ];
    return colors[num] || 'text-gray-500';
  };

  return (
    <div className="min-h-screen bg-[#0B0B0B] text-white font-mono p-4 md:p-8 flex flex-col items-center selection:bg-red-600 selection:text-white">
      {/* ROG Decorative Elements */}
      <div className="fixed top-0 left-0 w-full h-1 bg-red-600 shadow-[0_0_15px_rgba(255,0,50,0.8)] z-50" />
      <div className="fixed bottom-0 left-0 w-full h-1 bg-red-600 shadow-[0_0_15px_rgba(255,0,50,0.8)] z-50" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-5xl bg-[#1A1A1A] border-x-2 border-red-600/30 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden"
      >
        {/* Header Section */}
        <div className="relative p-6 border-b border-red-600/20 bg-gradient-to-r from-red-950/20 to-transparent">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-8 h-8 bg-red-600 flex items-center justify-center transform skew-x-[-12deg]">
                  <Bomb className="w-5 h-5 text-white transform skew-x-[12deg]" />
                </div>
                <h1 className="text-3xl font-black tracking-tighter italic">ROG MINESWEEPER</h1>
              </div>
              <p className="text-red-500/60 text-[10px] tracking-[0.2em] uppercase font-bold">Republic of Gamers // Tactical Interface</p>
            </div>

            <div className="flex items-center gap-1 bg-black/40 p-1 border border-red-600/20">
              {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`px-4 py-2 text-[10px] font-black tracking-widest transition-all flex items-center gap-2 ${
                    difficulty === d 
                      ? 'bg-red-600 text-white shadow-[0_0_10px_rgba(255,0,50,0.5)]' 
                      : 'text-red-600/40 hover:text-red-600/80 hover:bg-red-600/5'
                  }`}
                >
                  {CONFIGS[d].icon}
                  {CONFIGS[d].label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* HUD Stats */}
        <div className="grid grid-cols-3 divide-x divide-red-600/20 bg-black/20 border-b border-red-600/20">
          <div className="p-4 flex flex-col items-center justify-center gap-1 group">
            <span className="text-[10px] text-red-600/40 font-bold tracking-widest uppercase">Mines Detected</span>
            <div className="flex items-center gap-3">
              <Bomb className="w-4 h-4 text-red-600 group-hover:animate-pulse" />
              <span className="text-2xl font-black text-red-500 tabular-nums">
                {Math.max(0, config.mines - flagsUsed).toString().padStart(2, '0')}
              </span>
            </div>
          </div>
          
          <div className="p-4 flex flex-col items-center justify-center gap-1">
            <span className="text-[10px] text-red-600/40 font-bold tracking-widest uppercase">Mission Time</span>
            <div className="flex items-center gap-3">
              <Timer className="w-4 h-4 text-red-600" />
              <span className="text-2xl font-black text-red-500 tabular-nums">
                {time.toString().padStart(3, '0')}
              </span>
            </div>
          </div>

          <button 
            onClick={initGame}
            className="group relative overflow-hidden flex flex-col items-center justify-center gap-1 hover:bg-red-600/10 transition-colors"
          >
            <div className="absolute inset-0 bg-red-600/5 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            <span className="text-[10px] text-red-600/40 font-bold tracking-widest uppercase relative z-10">Reset System</span>
            <RotateCcw className="w-6 h-6 text-red-600 group-hover:rotate-180 transition-transform duration-500 relative z-10" />
          </button>
        </div>

        {/* Battlefield */}
        <div className="p-8 flex justify-center overflow-auto bg-[radial-gradient(circle_at_center,_#1a1a1a_0%,_#0b0b0b_100%)]">
          <div 
            className="grid gap-1 bg-red-600/10 p-2 border border-red-600/20"
            style={{ 
              gridTemplateColumns: `repeat(${config.cols}, minmax(0, 1fr))`,
              width: 'fit-content'
            }}
          >
            {board.map((row, r) => (
              row.map((cell, c) => (
                <button
                  key={`${r}-${c}`}
                  onClick={() => revealCell(r, c)}
                  onContextMenu={(e) => toggleFlag(e, r, c)}
                  className={`
                    w-8 h-8 md:w-9 md:h-9 flex items-center justify-center text-sm font-black transition-all relative group/cell
                    ${cell.isRevealed 
                      ? 'bg-black/60 border border-red-600/10 cursor-default' 
                      : 'bg-[#2A2A2A] border border-red-600/20 hover:bg-[#3A3A3A] hover:border-red-600/60 active:scale-95'}
                  `}
                >
                  {!cell.isRevealed && !cell.isFlagged && (
                    <div className="absolute inset-0 opacity-0 group-hover/cell:opacity-10 bg-[linear-gradient(45deg,transparent_25%,red_50%,transparent_75%)] bg-[length:250%_250%] animate-[shimmer_2s_infinite]" />
                  )}
                  
                  {cell.isRevealed ? (
                    cell.isMine ? (
                      <div className="relative">
                        <div className="absolute inset-0 blur-md bg-red-600/50 rounded-full" />
                        <Bomb className="w-5 h-5 text-red-500 relative z-10" />
                      </div>
                    ) : (
                      cell.neighborMines > 0 && (
                        <span className={`${getNumberColor(cell.neighborMines)} drop-shadow-[0_0_5px_rgba(255,0,0,0.3)]`}>
                          {cell.neighborMines}
                        </span>
                      )
                    )
                  ) : (
                    cell.isFlagged && (
                      <div className="relative">
                        <div className="absolute inset-0 blur-sm bg-red-600/30" />
                        <Flag className="w-4 h-4 text-red-500 fill-red-500 relative z-10" />
                      </div>
                    )
                  )}
                </button>
              ))
            ))}
          </div>
        </div>

        {/* Win/Loss Overlays */}
        <AnimatePresence>
          {(status === 'won' || status === 'lost') && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-black/90 backdrop-blur-md z-40"
            >
              <motion.div 
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="max-w-md w-full p-1 bg-red-600 shadow-[0_0_50px_rgba(255,0,50,0.3)] transform skew-x-[-4deg]"
              >
                <div className="bg-[#0B0B0B] p-8 transform skew-x-[4deg] flex flex-col items-center gap-6 border border-red-600/50">
                  {status === 'won' ? (
                    <>
                      <div className="w-20 h-20 bg-red-600/10 border-2 border-red-600 flex items-center justify-center transform rotate-45">
                        <Trophy className="w-10 h-10 text-red-600 transform -rotate-45" />
                      </div>
                      <div className="text-center">
                        <h2 className="text-4xl font-black italic tracking-tighter text-red-600 mb-2">VICTORY ACHIEVED</h2>
                        <p className="text-red-500/60 text-xs tracking-widest uppercase">System Cleared in {time}s</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-20 h-20 bg-red-600/10 border-2 border-red-600 flex items-center justify-center transform rotate-45">
                        <XCircle className="w-10 h-10 text-red-600 transform -rotate-45" />
                      </div>
                      <div className="text-center">
                        <h2 className="text-4xl font-black italic tracking-tighter text-red-600 mb-2">MISSION FAILED</h2>
                        <p className="text-red-500/60 text-xs tracking-widest uppercase">Critical System Breach Detected</p>
                      </div>
                    </>
                  )}
                  
                  <button 
                    onClick={initGame}
                    className="w-full py-4 bg-red-600 text-white font-black tracking-[0.3em] uppercase hover:bg-red-700 transition-all shadow-[0_0_20px_rgba(255,0,50,0.4)] active:scale-95"
                  >
                    Reboot System
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer Info */}
        <div className="p-4 bg-black/40 border-t border-red-600/20 flex justify-between items-center text-[9px] text-red-600/40 font-bold tracking-widest uppercase">
          <div className="flex gap-4">
            <span>Grid: {config.cols}x{config.rows}</span>
            <span>Mines: {config.mines}</span>
          </div>
          <div className="flex gap-4">
            <span className="flex items-center gap-1"><div className="w-1 h-1 bg-red-600" /> Left: Reveal</span>
            <span className="flex items-center gap-1"><div className="w-1 h-1 bg-red-600" /> Right: Flag</span>
          </div>
        </div>
      </motion.div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}} />
    </div>
  );
}
