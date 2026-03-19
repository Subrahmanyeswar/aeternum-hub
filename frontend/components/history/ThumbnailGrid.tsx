import React from 'react';
import { Play, Calendar } from 'lucide-react';

interface VideoFile {
  filename: string;
  size_mb: number;
  created: number;
  url: string;
}

interface ThumbnailGridProps {
  files: VideoFile[];
  onPlay: (url: string) => void;
}

export default function ThumbnailGrid({ files, onPlay }: ThumbnailGridProps) {
  // Empty State
  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20">
        <img 
          src="/icons/empty-state-vault.png" 
          alt="Empty Vault" 
          className="w-48 h-48 opacity-30 mb-6"
        />
        <h3 className="text-xl font-semibold text-slate-400 mb-2">
          No Events Found
        </h3>
        <p className="text-sm text-slate-600">
          Recordings will appear here when intruders are detected
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 p-4">
      {files.map((file, index) => (
        <div
          key={index}
          onClick={() => onPlay(file.url)}
          className="
            group
            relative
            aspect-[4/3]
            rounded-xl
            overflow-hidden
            bg-gradient-to-br from-slate-800 to-slate-900
            border border-slate-700/50
            cursor-pointer
            transition-all duration-300
            hover:scale-105
            hover:border-cyan-500/50
            hover:shadow-lg hover:shadow-cyan-500/20
          "
        >
          {/* Thumbnail Placeholder (You can replace with actual video thumbnail) */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-800" />
          
          {/* Play Icon Overlay */}
          <div className="
            absolute inset-0 
            flex items-center justify-center
            bg-black/40
            opacity-0 group-hover:opacity-100
            transition-opacity duration-300
          ">
            <div className="
              w-16 h-16 
              rounded-full 
              bg-cyan-500/20 
              backdrop-blur-sm
              border-2 border-cyan-400
              flex items-center justify-center
              glow-cyan
            ">
              <Play className="w-8 h-8 text-cyan-400 ml-1" strokeWidth={2} fill="currentColor" />
            </div>
          </div>

          {/* Bottom Info Gradient */}
          <div className="
            absolute bottom-0 left-0 right-0
            bg-gradient-to-t from-black/80 to-transparent
            p-3
          ">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <Calendar className="w-3 h-3" strokeWidth={1.5} />
              <span className="font-mono">
                {new Date(file.created * 1000).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
            <div className="text-xs text-slate-500 font-mono mt-1">
              {file.size_mb.toFixed(1)} MB
            </div>
          </div>

          {/* Red "Recording" Badge */}
          <div className="absolute top-2 right-2">
            <div className="
              px-2 py-1 
              rounded-md 
              bg-red-500/20 
              border border-red-500/50
              backdrop-blur-sm
            ">
              <span className="text-xs font-bold text-red-400 tracking-wide">
                REC
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}