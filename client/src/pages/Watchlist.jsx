import React from "react";
import { Hammer } from "lucide-react";

const WatchlistPage = () => {
  return (
    <div className="min-h-[calc(100vh-65px)] flex items-center justify-center px-4 bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900">
      <div className="max-w-lg w-full">
    
        {/* Development Notice Card */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-10 shadow-xl text-center">
          <div className="flex flex-col items-center space-y-4">
            <Hammer className="w-12 h-12 text-orange-500" />
            <h2 className="text-2xl font-semibold text-white">
              This page is under development
            </h2>
            <p className="text-gray-400">
              We’re working hard to bring you a price watchlist. Check back later!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WatchlistPage;
